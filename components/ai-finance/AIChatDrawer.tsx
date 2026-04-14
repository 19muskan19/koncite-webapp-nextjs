'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { getProfileImageUrl } from '@/utils/imageUtils';
import { cn } from '@/utils/cn';
import {
  AI_FINANCE_APP_LABEL,
  AI_FINANCE_ASSISTANT_BRAND_LABEL,
  AI_FINANCE_ASSISTANT_PARTY_FALLBACK,
  AI_FINANCE_ASSISTANT_UNAVAILABLE,
  AI_FINANCE_EMPTY_STATE_HINT,
  AI_FINANCE_INVOICE_UNAVAILABLE,
  dispatchFinanceDataChanged,
} from '@/constants/aiFinance';
import {
  createSession,
  sendMessage,
  getSession,
  getSessionIdFromResponse,
  renameSession,
  AGENT_AI_FINANCE,
  extractReplyFromResponse,
  extractChatTurnsFromSession,
  type AiChatTurn,
} from '@/services/dmsAiService';
import { listAgentSessions, type AiSession } from '@/services/aiAgentService';
import {
  extractFinanceTransactionFromAgentResponse,
  extractTransactionFromAssistText,
  unwrapAgentPayload,
  type ParsedAgentTransaction,
} from '@/services/financeAgentParse';
import FinanceChatMarkdown from './FinanceChatMarkdown';
import AIFinanceChatSessionsSidebar, { type FinanceSessionListItem } from './AIFinanceChatSessionsSidebar';

function getUserInitial(user: { name?: string; email?: string } | null): string {
  if (!user) return 'U';
  const name = (user.name || '').trim();
  if (name.length > 0) return name.charAt(0).toUpperCase();
  const email = (user.email || '').trim();
  if (email.length > 0) return email.charAt(0).toUpperCase();
  return 'U';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsedTransaction?: ParsedAgentTransaction;
}

function turnsToChatMessages(turns: AiChatTurn[]): ChatMessage[] {
  return turns.map((t, i) => ({
    id: `hist-${i}-${t.content.slice(0, 8)}`,
    role: t.role,
    content: t.content,
  }));
}

/** True when the user is confirming a draft the assistant showed (not only the lime button). */
function isUserConfirmPhrase(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '');
  if (!t) return false;
  const exact = new Set([
    'confirm',
    'confirmed',
    'yes',
    'yep',
    'yeah',
    'ok',
    'okay',
    'sure',
    'proceed',
    'go ahead',
    'book it',
    'save it',
    'save',
    'approve',
    'approved',
    'do it',
    'y',
  ]);
  if (exact.has(t)) return true;
  if (t.startsWith('yes ') || t.startsWith('confirm ')) return true;
  return false;
}

function findLastUnbookedProposal(messages: ChatMessage[], consumed: ReadonlySet<string>): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant' || !m.parsedTransaction) continue;
    if (consumed.has(m.id)) continue;
    return m;
  }
  return undefined;
}

function isFinanceAgentSession(s: AiSession): boolean {
  const ag = String(s.agent ?? '').toLowerCase();
  if (ag === 'ai_finance' || ag === 'ai-finance') return true;
  if (ag) return false;
  const nm = String(s.name ?? '').toLowerCase();
  return nm.includes('finance');
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export default function AIChatDrawer({ isOpen, onClose, isDark }: AIChatDrawerProps) {
  const toast = useToast();
  const { user } = useUser();
  const userInitial = getUserInitial(user);
  const profileUrl = getProfileImageUrl((user as any)?.profile_image ?? (user as any)?.profile_images, user?.name || 'User');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [sessions, setSessions] = useState<FinanceSessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** Proposal cards already persisted via Book or chat "confirm", to avoid double posts. */
  const consumedProposalIdsRef = useRef<Set<string>>(new Set());

  const loadFinanceSessions = useCallback(async (opts?: { selectId?: string | null }) => {
    setLoadingSessions(true);
    try {
      const rawList = await listAgentSessions(AGENT_AI_FINANCE);
      const filtered = (Array.isArray(rawList) ? rawList : []).filter((s) => isFinanceAgentSession(s));
      const mapped: FinanceSessionListItem[] = [];
      for (const s of filtered) {
        const id = getSessionIdFromResponse(s);
        if (!id) continue;
        mapped.push({
          id,
          name: String(s.name ?? 'Session'),
          ...(typeof s.created_at === 'string' ? { created_at: s.created_at } : {}),
        });
      }

      setSessions(mapped);
      setActiveSessionId((prev) => {
        const want = opts?.selectId;
        if (want != null && want !== '') {
          if (mapped.some((m) => m.id === want)) return want;
          return want;
        }
        if (prev && mapped.some((m) => m.id === prev)) return prev;
        return mapped[0]?.id ?? null;
      });
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load sessions';
      toast.showError(msg);
      setSessions([]);
      setActiveSessionId(null);
    } finally {
      setLoadingSessions(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isOpen) {
      consumedProposalIdsRef.current.clear();
      setActiveSessionId(null);
      setSessions([]);
      setMessages([]);
      return;
    }
    void loadFinanceSessions();
  }, [isOpen, loadFinanceSessions]);

  useEffect(() => {
    consumedProposalIdsRef.current.clear();
  }, [activeSessionId]);

  useEffect(() => {
    if (!isOpen || !activeSessionId) {
      if (!activeSessionId) setMessages([]);
      return;
    }

    const sessionId = activeSessionId;
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession(sessionId);
        const next = turnsToChatMessages(extractChatTurnsFromSession(s));
        if (!cancelled) {
          setMessages((prev) => {
            const pending = prev.filter((m) => !m.id.startsWith('hist-'));
            return [...next, ...pending];
          });
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, parsedTransaction?: ChatMessage['parsedTransaction']) => {
    setMessages((m) => [...m, { id: String(Date.now()), role, content, parsedTransaction }]);
  };

  const handleCreateSession = async (name: string) => {
    setMessages([]);
    setCreatingSession(true);
    try {
      const res = await createSession(name, AGENT_AI_FINANCE);
      const id = getSessionIdFromResponse(res);
      if (!id) throw new Error('No session id returned from POST /ai-agent/sessions');
      await loadFinanceSessions({ selectId: id });
      toast.showSuccess('Session created');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to create session';
      toast.showError(msg);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setMessages([]);
    setActiveSessionId(sessionId);
  };

  const handleRenameSession = async (sessionId: string, name: string) => {
    try {
      await renameSession(sessionId, name);
      await loadFinanceSessions();
      toast.showSuccess('Session renamed');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Rename failed';
      toast.showError(msg);
    }
  };

  const persistParsedProposal = async (msg: ChatMessage, remarksOverride: string | undefined) => {
    const { financeAPI } = await import('@/services/financeApi');
    const pt = msg.parsedTransaction!;
    let paidOrRecv = pt.type === 'expense' ? pt.paid : pt.received;
    if (paidOrRecv == null && pt.balance != null && Number.isFinite(pt.total)) {
      paidOrRecv = Math.max(0, pt.total - pt.balance);
    }
    paidOrRecv = paidOrRecv ?? 0;
    await financeAPI.createTransaction({
      type: pt.type,
      total: pt.total,
      paid: pt.type === 'expense' ? paidOrRecv : undefined,
      received: pt.type === 'income' ? paidOrRecv : undefined,
      category: pt.category,
      item: pt.item,
      project: pt.project,
      remarks: remarksOverride?.trim() ? remarksOverride : undefined,
      date: new Date().toISOString().slice(0, 10),
      party: pt.party?.trim() ? pt.party : AI_FINANCE_ASSISTANT_PARTY_FALLBACK,
    });
    consumedProposalIdsRef.current.add(msg.id);
    dispatchFinanceDataChanged();
  };

  const handleConfirmSave = async (msg: ChatMessage) => {
    if (processing || !msg.parsedTransaction) return;
    setProcessing(true);
    try {
      await persistParsedProposal(msg, remarks || undefined);
      addMessage('assistant', 'Transaction saved successfully.');
      setRemarks('');
      toast.showSuccess('Transaction saved');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to save');
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    if (processing) return;
    if (!activeSessionId) {
      toast.showWarning('Create or select a chat session first');
      return;
    }

    const proposal = findLastUnbookedProposal(messages, consumedProposalIdsRef.current);
    if (proposal && isUserConfirmPhrase(text)) {
      addMessage('user', text);
      setInput('');
      setProcessing(true);
      try {
        await persistParsedProposal(proposal, remarks || undefined);
        addMessage(
          'assistant',
          'Saved to your finance ledger. It will show on the dashboard and under Transactions.'
        );
        setRemarks('');
        toast.showSuccess('Transaction saved');
      } catch (e: any) {
        toast.showError(e?.message || 'Failed to save');
      } finally {
        setProcessing(false);
      }
      return;
    }

    addMessage('user', text);
    setInput('');
    setProcessing(true);

    try {
      const raw = await sendMessage(activeSessionId, text, { agent: AGENT_AI_FINANCE });
      const inner = unwrapAgentPayload(raw);
      const reply =
        extractReplyFromResponse(inner) ||
        (typeof raw === 'object' && raw !== null ? extractReplyFromResponse(raw) : '');
      const replyTrim = reply.trim() || '—';
      const fromApi =
        extractFinanceTransactionFromAgentResponse(raw) ?? extractFinanceTransactionFromAgentResponse(inner);
      const fromText = fromApi ? undefined : extractTransactionFromAssistText(replyTrim);
      addMessage('assistant', replyTrim, fromApi ?? fromText ?? undefined);
    } catch (e: unknown) {
      const errMsg = e && typeof e === 'object' && 'message' in e && typeof (e as Error).message === 'string' ? (e as Error).message.trim() : '';
      addMessage('assistant', errMsg || AI_FINANCE_ASSISTANT_UNAVAILABLE);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeSessionId) {
      toast.showWarning('Create or select a chat session first');
      e.target.value = '';
      return;
    }
    addMessage('user', `[Invoice uploaded: ${file.name}]`);
    setProcessing(true);
    try {
      const raw = await sendMessage(activeSessionId, 'Invoice attached.', { agent: AGENT_AI_FINANCE, files: [file] });
      const inner = unwrapAgentPayload(raw);
      const reply =
        extractReplyFromResponse(inner) ||
        (typeof raw === 'object' && raw !== null ? extractReplyFromResponse(raw) : '');
      const replyTrim = reply.trim() || '—';
      const fromApi =
        extractFinanceTransactionFromAgentResponse(raw) ?? extractFinanceTransactionFromAgentResponse(inner);
      const fromText = fromApi ? undefined : extractTransactionFromAssistText(replyTrim);
      addMessage('assistant', replyTrim, fromApi ?? fromText ?? undefined);
    } catch (err: unknown) {
      const errMsg = err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string' ? (err as Error).message.trim() : '';
      addMessage('assistant', errMsg || AI_FINANCE_INVOICE_UNAVAILABLE);
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgSecondary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bubbleUser = isDark ? 'bg-slate-700/50 border border-slate-600/50' : 'bg-slate-100 border border-slate-200';
  const bubbleAssistant = isDark ? 'bg-[#2d2d2d] border border-slate-600/50' : 'bg-white border border-slate-200 shadow-sm';

  return (
    <>
      <div className={cn('fixed inset-0 z-50 transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div
          className={cn(
            'absolute right-0 top-0 h-full w-full max-w-[min(100vw,56rem)] shadow-xl transition-transform duration-300 flex',
            bgSecondary,
            isOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <AIFinanceChatSessionsSidebar
            isDark={isDark}
            sessions={sessions}
            activeSessionId={activeSessionId}
            loading={loadingSessions}
            creating={creatingSession}
            onSelect={handleSelectSession}
            onRefresh={() => void loadFinanceSessions()}
            onCreate={handleCreateSession}
            onRename={handleRenameSession}
          />
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <div className={cn('flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0', isDark ? 'border-[#404040]' : 'border-slate-200')}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-slate-900" />
                </div>
                <div className="min-w-0">
                  <h2 className={cn('text-xs sm:text-sm font-black truncate', textPrimary)}>{AI_FINANCE_APP_LABEL}</h2>
                  <p className={cn('text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate', textSecondary)}>{AI_FINANCE_ASSISTANT_BRAND_LABEL}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className={cn('p-2 rounded-lg transition-colors flex-shrink-0', isDark ? 'hover:bg-[#404040]' : 'hover:bg-slate-100')}>
                <X className={cn('w-5 h-5', textSecondary)} />
              </button>
            </div>
            <div className={cn('flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-1.5 sm:space-y-2 custom-scrollbar', isDark ? 'bg-[#1e1e1e]' : 'bg-slate-50')}>
              {!activeSessionId && !loadingSessions && (
                <div className={cn('rounded-lg border px-3 py-2 text-center text-xs font-semibold mb-2', isDark ? 'border-amber-500/40 text-amber-200' : 'border-amber-300 text-amber-900')}>
                  Select an existing session or create a new one (POST /ai-agent/sessions) to start chatting.
                </div>
              )}
              {messages.length === 0 && activeSessionId && (
                <div className="flex flex-col items-center justify-center min-h-[120px] sm:min-h-[160px] text-center px-3 sm:px-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#C2D642] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-slate-900" />
                  </div>
                  <p className={cn('text-base sm:text-lg font-bold max-w-[280px] sm:max-w-md', isDark ? 'text-[#C2D642]' : 'text-[#7c8a2e]')}>
                    {AI_FINANCE_ASSISTANT_BRAND_LABEL}
                  </p>
                  <p className={cn('text-[11px] sm:text-sm font-normal mt-1.5 sm:mt-2 max-w-[280px] sm:max-w-md', textSecondary)}>
                    {AI_FINANCE_EMPTY_STATE_HINT}
                  </p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2 sm:gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900" />
                    </div>
                  )}
                  <div className={cn('max-w-[90%] sm:max-w-[75%]', m.role === 'user' ? 'order-2' : '')}>
                    {m.role === 'user' && (
                      <p className={cn('text-[9px] sm:text-[10px] font-bold mb-0.5 text-right', textSecondary)}>{user?.name || user?.email || 'You'}</p>
                    )}
                    {m.role === 'user' ? (
                      <div className={cn('rounded-lg sm:rounded-xl p-2 sm:p-2.5 text-xs sm:text-sm font-normal break-words leading-relaxed', bubbleUser, textPrimary)}>
                        {m.content}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3.5 break-words shadow-sm border',
                            isDark ? 'bg-[#2d2d2d] border-white/[0.06]' : 'bg-white border-slate-200/90'
                          )}
                        >
                          <FinanceChatMarkdown content={m.content} isDark={isDark} />
                        </div>
                        {m.parsedTransaction && (
                          <div
                            className={cn(
                              'rounded-2xl p-4 sm:p-5 border shadow-lg',
                              isDark ? 'bg-[#252525] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-slate-200/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <span
                                className={cn(
                                  'shrink-0 rounded-md px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide',
                                  m.parsedTransaction.type === 'income'
                                    ? 'bg-emerald-950/90 text-emerald-100'
                                    : 'bg-[#4a1518] text-rose-100'
                                )}
                              >
                                {m.parsedTransaction.type}
                              </span>
                              <span
                                className={cn(
                                  'text-right text-base sm:text-lg font-bold tabular-nums tracking-tight',
                                  isDark ? 'text-white' : 'text-slate-900'
                                )}
                              >
                                {m.parsedTransaction.total.toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <dl className="space-y-3 mb-4">
                              {m.parsedTransaction.party && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Party / Vendor</dt>
                                  <dd className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.party}</dd>
                                </div>
                              )}
                              {m.parsedTransaction.category && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Category</dt>
                                  <dd className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.category}</dd>
                                </div>
                              )}
                              {m.parsedTransaction.item && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Item</dt>
                                  <dd className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.item}</dd>
                                </div>
                              )}
                              {m.parsedTransaction.project && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Project</dt>
                                  <dd className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.project}</dd>
                                </div>
                              )}
                              {m.parsedTransaction.invoiceDate && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Invoice date</dt>
                                  <dd className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.invoiceDate}</dd>
                                </div>
                              )}
                              {m.parsedTransaction.invoiceRef && (
                                <div>
                                  <dt className={cn('text-xs font-medium mb-0.5', isDark ? 'text-white/55' : 'text-slate-500')}>Invoice / receipt</dt>
                                  <dd className={cn('text-sm font-semibold break-all', isDark ? 'text-white' : 'text-slate-900')}>{m.parsedTransaction.invoiceRef}</dd>
                                </div>
                              )}
                            </dl>
                            <textarea
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              placeholder="Remarks (optional)"
                              rows={3}
                              className={cn(
                                'w-full min-h-[72px] resize-y rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition-shadow focus:ring-2 focus:ring-[#C2D642]/35',
                                isDark
                                  ? 'border-white/[0.08] bg-[#1a1a1a] text-white placeholder:text-white/40'
                                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmSave(m)}
                              disabled={processing}
                              className="mt-4 w-full rounded-2xl bg-[#C2D642] py-3 text-center text-sm font-black text-slate-900 shadow-md shadow-[#C2D642]/20 transition-colors hover:bg-[#b8cc3c] disabled:opacity-50"
                            >
                              Confirm & Save
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div
                      className={cn(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2',
                        isDark ? 'bg-slate-600 border-slate-500' : 'bg-slate-500 border-slate-400'
                      )}
                    >
                      {!avatarImgFailed ? (
                        <img src={profileUrl} alt={user?.name || 'User'} className="w-full h-full object-cover" onError={() => setAvatarImgFailed(true)} />
                      ) : (
                        <span className="text-white text-[10px] sm:text-xs font-bold">{userInitial}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {processing && (
                <div className={cn('flex gap-2 sm:gap-3 justify-start')}>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900" />
                  </div>
                  <div className={cn('rounded-lg sm:rounded-xl px-3 py-2.5 border flex items-center', bubbleAssistant)}>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" aria-hidden />
                    <span className="sr-only">Processing</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className={cn('p-3 sm:p-4 border-t flex-shrink-0', isDark ? 'border-[#404040]' : 'border-slate-200', bgSecondary)}>
              <div
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border-2',
                  isDark ? 'bg-[#2d2d2d] border-[#C2D642]/30' : 'bg-white border-[#C2D642]/30',
                  !activeSessionId && 'opacity-60'
                )}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeSessionId || processing}
                  className={cn(
                    'p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center',
                    isDark ? 'hover:bg-[#404040]' : 'hover:bg-slate-100'
                  )}
                >
                  <Paperclip className={cn('w-4 h-4', textSecondary)} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={activeSessionId ? 'Type your transaction...' : 'Pick a session first…'}
                  disabled={!activeSessionId}
                  className={cn(
                    'flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm font-bold',
                    textPrimary,
                    isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'
                  )}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!activeSessionId || !input.trim() || processing}
                  className={cn(
                    'p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center',
                    activeSessionId && input.trim() && !processing ? 'bg-[#C2D642] hover:bg-[#A8B838] text-slate-900' : isDark ? 'bg-[#2d2d2d] text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                  aria-busy={processing}
                >
                  <Send className={cn('w-4 h-4', processing && 'opacity-50')} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
