'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Bot, Paperclip, Send, X, Loader2, Plus } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import {
  COPILOT_AGENT,
  createCopilotSession,
  getCopilotSessionId,
  postCopilotChat,
  COPILOT_CHAT_PATH,
  extractCopilotReply,
  getSessionIdFromCopilotChatResponse,
  fetchCopilotSessions,
  fetchCopilotSessionMessages,
  type CopilotSessionListItem,
} from '@/services/copilotService';
import { sessionSidebarLabel } from '@/lib/chat/sessionDisplayLabel';
import { runSessionMetaIfNeeded, toMetaMessages, shouldApplySessionRenameTitle } from '@/lib/chat/sessionMetaClient';
import SessionSummaryBanner from '@/components/chat/SessionSummaryBanner';
import { getStoredSessionMetaTitle, setStoredSessionMetaTitle, setStoredSessionSummary } from '@/lib/chat/sessionSummaryStorage';
import CopilotChatMarkdown from '@/components/ask-me/CopilotChatMarkdown';

type ChatRole = 'user' | 'assistant';

interface ChatLine {
  id: string;
  role: ChatRole;
  content: string;
}

interface PendingFile {
  id: string;
  file: File;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as AxiosError<{ message?: string; error?: string }>;
    const d = ax.response?.data;
    if (d && typeof d === 'object') {
      const m = (d as { message?: string }).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

export default function AskMeChat() {
  const { isDark } = useTheme();
  const { user } = useUser();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [sessions, setSessions] = useState<CopilotSessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatLine[]>(messages);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const userId = typeof user?.id === 'number' && user.id > 0 ? user.id : undefined;

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const surface = isDark ? 'bg-[#0f1419] border-slate-700/80' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-900/80 border-slate-600' : 'bg-slate-50 border-slate-200';
  const sidebarBg = isDark ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200';

  /**
   * Load session list. Keep deps **only `[userId]`** — do not depend on `toast` or the callback
   * identity will change every render and retrigger `useEffect` → infinite GET /sessions + toasts.
   * After new session use `{ silent: true, background: true }` to update the list without a loading spinner.
   * Do not call this after every chat message — the active thread is already in UI state.
   */
  const loadSessions = useCallback(async (options?: { silent?: boolean; background?: boolean }) => {
    if (!userId) {
      setSessions([]);
      return;
    }
    const showLoading = !options?.background;
    if (showLoading) {
      setLoadingSessions(true);
    }
    try {
      const rows = await fetchCopilotSessions(userId);
      rows.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
      const merged = rows.map((r) => {
        const t = getStoredSessionMetaTitle(r.id, 'copilot');
        return t ? { ...r, name: t } : r;
      });
      setSessions(merged);
    } catch (e) {
      if (!options?.silent) {
        toastRef.current.showError('Could not load chat history.');
        setSessions([]);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Ask me] Session list refresh failed (silent):', e);
      }
    } finally {
      if (showLoading) {
        setLoadingSessions(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      return;
    }
    void loadSessions();
  }, [userId, loadSessions]);

  /** Creates a server session when none exists (e.g. first message without clicking New chat). */
  const ensureCopilotSession = async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (!userId) return null;
    setSessionBusy(true);
    try {
      const created = await createCopilotSession({ userId });
      const sid = getCopilotSessionId(created);
      if (!sid) throw new Error('No session id returned from server.');
      sessionIdRef.current = sid;
      setSessionId(sid);
      await loadSessions({ silent: true, background: true });
      return sid;
    } catch (e: unknown) {
      toast.showError(getErrorMessage(e));
      return null;
    } finally {
      setSessionBusy(false);
    }
  };

  const startNewChat = async () => {
    if (!userId) {
      toast.showWarning('Sign in to start a new chat.');
      return;
    }
    setSessionBusy(true);
    try {
      const created = await createCopilotSession({ userId });
      const sid = getCopilotSessionId(created);
      if (!sid) throw new Error('No session id returned from server.');
      sessionIdRef.current = sid;
      setSessionId(sid);
      setMessages([]);
      setInput('');
      setPendingFiles([]);
      await loadSessions({ silent: true, background: true });
    } catch (e: unknown) {
      toast.showError(getErrorMessage(e));
    } finally {
      setSessionBusy(false);
    }
  };

  const openSession = async (id: string) => {
    if (!userId || sessionBusy || sending) return;
    if (id === sessionId) return;
    setSessionBusy(true);
    try {
      const turns = await fetchCopilotSessionMessages(id, userId);
      sessionIdRef.current = id;
      setSessionId(id);
      setMessages(
        turns.map((t, i) => ({
          id: `h-${id}-${i}`,
          role: t.role,
          content: t.content,
        }))
      );
      setInput('');
      setPendingFiles([]);
    } catch (e: unknown) {
      toast.showError(getErrorMessage(e));
    } finally {
      setSessionBusy(false);
    }
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: PendingFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      next.push({ id: `${Date.now()}-${i}-${file.name}`, file });
    }
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    if (!userId) {
      toast.showWarning('Sign in to send a message.');
      return;
    }

    let sid = sessionIdRef.current;
    if (!sid) {
      const createdId = await ensureCopilotSession();
      if (!createdId) return;
      sid = createdId;
    }

    const files = pendingFiles.map((p) => p.file);
    const userParts: string[] = [];
    if (trimmed) userParts.push(trimmed);
    if (pendingFiles.length) {
      userParts.push(`[Attached: ${pendingFiles.map((p) => p.file.name).join(', ')}]`);
    }
    const userContent = userParts.join('\n\n');

    const userMsg: ChatLine = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userContent,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingFiles([]);

    setSending(true);
    try {
      const messageText = trimmed || (files.length ? 'Files attached.' : '');
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Ask me] POST', COPILOT_CHAT_PATH, { session_id: sid, hasFiles: files.length > 0 });
      }
      const res = await postCopilotChat({
        sessionId: sid,
        message: messageText,
        userId,
        agent: COPILOT_AGENT,
        files: files.length ? files : undefined,
      });

      const nextSid = getSessionIdFromCopilotChatResponse(res);
      if (nextSid) {
        sessionIdRef.current = nextSid;
        setSessionId(nextSid);
      }

      const reply = extractCopilotReply(res).trim();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply || 'No reply text was returned.',
        },
      ]);

      const sidMeta = sessionIdRef.current;
      setTimeout(() => {
        if (!sidMeta || !userId) return;
        const lines = messagesRef.current.filter((m) => m.role === 'user' || m.role === 'assistant');
        const uCount = lines.filter((m) => m.role === 'user').length;
        runSessionMetaIfNeeded({
          sessionId: sidMeta,
          userMessageCount: uCount,
          messages: toMetaMessages(lines.map((m) => ({ role: m.role, content: m.content }))),
          apply: async (meta) => {
            if (shouldApplySessionRenameTitle(meta.title)) {
              setSessions((prev) => prev.map((s) => (s.id === sidMeta ? { ...s, name: meta.title } : s)));
              setStoredSessionMetaTitle(sidMeta, meta.title, 'copilot');
            }
            if (meta.summary) {
              setStoredSessionSummary(sidMeta, meta.summary, 'copilot');
            }
          },
        });
      }, 0);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      toast.showError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Could not get a response: ${msg}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const disabledComposer = sending || sessionBusy || !userId;
  /** First send creates a session automatically if needed (no need to click New chat first). */
  const canSend = !!userId && (input.trim().length > 0 || pendingFiles.length > 0);

  return (
    <div
      className={`flex flex-col sm:flex-row rounded-2xl border shadow-xl overflow-hidden h-[min(720px,calc(100vh-5rem))] ${surface}`}
    >
      {/* Session history + new chat */}
      <aside
        className={`flex flex-col shrink-0 border-b sm:border-b-0 sm:border-r sm:w-56 max-h-[40vh] sm:max-h-none sm:min-h-0 ${sidebarBg}`}
      >
        <div className="p-2 border-b border-inherit shrink-0">
          <button
            type="button"
            onClick={() => void startNewChat()}
            disabled={sessionBusy || !userId}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all bg-[#C2D642] text-slate-900 hover:bg-[#b8cc3a] disabled:opacity-50"
          >
            {sessionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
            New chat
          </button>
        </div>
        <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-center sm:text-left text-slate-500">
          History
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-1 min-h-0">
          {!userId && (
            <p className={`text-xs px-2 py-2 ${textSecondary}`}>Sign in to see sessions.</p>
          )}
          {userId && loadingSessions && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#C2D642] opacity-70" />
            </div>
          )}
          {userId && !loadingSessions && sessions.length === 0 && (
            <p className={`text-xs px-2 py-2 ${textSecondary}`}>No past chats yet.</p>
          )}
          {sessions.map((s) => {
            const active = sessionId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => void openSession(s.id)}
                disabled={sessionBusy || sending}
                className={`w-full text-left rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors truncate ${
                  active
                    ? isDark
                      ? 'bg-slate-700/80 text-slate-100 ring-1 ring-[#C2D642]/40'
                      : 'bg-white text-slate-900 ring-1 ring-[#C2D642]/40 shadow-sm'
                    : `${textSecondary} hover:bg-black/10 dark:hover:bg-white/10 hover:text-[#C2D642]`
                }`}
                title={sessionSidebarLabel(s.name, s.id)}
              >
                {sessionSidebarLabel(s.name, s.id)}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <header
          className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${
            isDark ? 'border-slate-700/80 bg-slate-900/50' : 'border-slate-200 bg-slate-50/90'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#C2D642]/20 border border-[#C2D642]/35 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#C2D642]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className={`text-base font-black ${textPrimary} tracking-tight`}>Ask me</h1>
            <p className={`text-xs ${textSecondary}`}>
              {!userId
                ? 'Sign in to chat.'
                : 'Type a message or attach a file — your first send starts the chat.'}
            </p>
          </div>
        </header>

        <SessionSummaryBanner
          sessionId={sessionId}
          kind="copilot"
          isDark={isDark}
          className="mx-4 mt-2 shrink-0"
        />

        <div className={`flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4 min-h-0 ${isDark ? 'bg-[#0a0d10]' : 'bg-slate-50/50'}`}>
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-2xl text-sm leading-relaxed min-w-0 ${
                  m.role === 'user'
                    ? 'max-w-[min(100%,520px)] px-4 py-2.5 whitespace-pre-wrap bg-[#C2D642] text-slate-900 font-medium'
                    : `w-full max-w-[min(100%,min(92vw,800px))] px-3 sm:px-4 py-3 ${
                        isDark
                          ? 'bg-slate-800 text-slate-100 border border-slate-700/80'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                      }`
                }`}
              >
                {m.role === 'assistant' ? (
                  <CopilotChatMarkdown content={m.content} isDark={isDark} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm ${
                  isDark ? 'bg-slate-800 border border-slate-700/80 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div
          className={`border-t p-3 sm:p-4 shrink-0 space-y-2 ${
            isDark ? 'border-slate-700/80 bg-slate-900/40' : 'border-slate-200 bg-white'
          }`}
        >
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((p) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs font-semibold max-w-full ${
                    isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="truncate max-w-[200px]">{p.file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(p.id)}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label={`Remove ${p.file.name}`}
                  >
                    <X className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFiles} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabledComposer}
              className={`shrink-0 p-2.5 rounded-xl border transition-colors disabled:opacity-40 ${
                isDark
                  ? 'border-slate-600 text-[#C2D642] hover:bg-slate-800'
                  : 'border-slate-300 text-[#C2D642] hover:bg-slate-100'
              }`}
              aria-label="Attach file"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" strokeWidth={2.25} />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Message…"
              rows={1}
              disabled={disabledComposer}
              className={`flex-1 min-h-[44px] max-h-32 resize-y rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-[#C2D642]/40 disabled:opacity-50 ${inputBg} ${textPrimary} placeholder:text-slate-500`}
            />

            <button
              type="button"
              disabled={disabledComposer || !canSend}
              onClick={() => void send()}
              className="shrink-0 p-2.5 rounded-xl bg-[#C2D642] text-white hover:bg-[#b8cc3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-[#C2D642]/20"
              aria-label="Send"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" strokeWidth={2.25} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
