'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { getProfileImageUrl } from '@/utils/imageUtils';
import { cn } from '@/utils/cn';

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
  parsedTransaction?: {
    type: 'income' | 'expense';
    total: number;
    paid?: number;
    received?: number;
    category?: string;
    balance?: number;
    item?: string;
    project?: string;
  };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, parsedTransaction?: ChatMessage['parsedTransaction']) => {
    setMessages((m) => [...m, { id: String(Date.now()), role, content, parsedTransaction }]);
  };

  const handleConfirmSave = async (msg: ChatMessage) => {
    if (processing || !msg.parsedTransaction) return;
    setProcessing(true);
    try {
      const { financeAPI } = await import('@/services/financeApi');
      await financeAPI.createTransaction({
        type: msg.parsedTransaction.type,
        total: msg.parsedTransaction.total,
        paid: msg.parsedTransaction.paid,
        received: msg.parsedTransaction.received,
        balance: msg.parsedTransaction.balance,
        category: msg.parsedTransaction.category,
        item: msg.parsedTransaction.item,
        project: msg.parsedTransaction.project,
        remarks: remarks || undefined,
        date: new Date().toISOString().slice(0, 10),
        party: 'AI Entry',
        status: 'pending',
      });
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

    addMessage('user', text);
    setInput('');
    setProcessing(true);

    try {
      await new Promise((r) => setTimeout(r, 800));
      const mockReply = `I've parsed your transaction: "${text}". This would create a ${text.toLowerCase().includes('paid') ? 'expense' : 'income'} entry. The AI finance backend (parseFinancialChat / parseInvoice) can be integrated to process natural language and invoice uploads.`;
      addMessage('assistant', mockReply, text.toLowerCase().includes('paid') || text.toLowerCase().includes('expense') ? { type: 'expense', total: 5000, paid: 0, balance: 5000, category: 'Materials', item: 'Cement', project: 'Skyline Tower' } : undefined);
    } catch (e) {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addMessage('user', `[Invoice uploaded: ${file.name}]`);
    setProcessing(true);
    setTimeout(() => {
      addMessage('assistant', `Invoice "${file.name}" received. Invoice parsing (Gemini parseInvoice) can be integrated to extract vendor, amount, items, and category.`, { type: 'expense', total: 15000, paid: 0, balance: 15000, category: 'Materials', item: 'Steel rods', project: 'Residency Complex' });
      setProcessing(false);
    }, 1000);
    e.target.value = '';
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
        <div className={cn('absolute right-0 top-0 h-full w-full max-w-md shadow-xl transition-transform duration-300', bgSecondary, isOpen ? 'translate-x-0' : 'translate-x-full')}>
          <div className="flex flex-col h-full">
            <div className={cn('flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0', isDark ? 'border-[#404040]' : 'border-slate-200')}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-[#C2D642] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-slate-900" />
                </div>
                <div className="min-w-0">
                  <h2 className={cn('text-xs sm:text-sm font-black truncate', textPrimary)}>Koncite AI</h2>
                  <p className={cn('text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate', textSecondary)}>Financial Assistant</p>
                </div>
              </div>
              <button onClick={onClose} className={cn('p-2 rounded-lg transition-colors flex-shrink-0', isDark ? 'hover:bg-[#404040]' : 'hover:bg-slate-100')}>
                <X className={cn('w-5 h-5', textSecondary)} />
              </button>
            </div>
            <div className={cn('flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-1.5 sm:space-y-2 custom-scrollbar', isDark ? 'bg-[#1e1e1e]' : 'bg-slate-50')}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] text-center px-3 sm:px-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#C2D642] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-slate-900" />
                  </div>
                  <p className={cn('text-base sm:text-lg font-bold max-w-[280px] sm:max-w-md', isDark ? 'text-[#C2D642]' : 'text-[#7c8a2e]')}>
                    Financial Assistant
                  </p>
                  <p className={cn('text-[11px] sm:text-sm font-normal mt-1.5 sm:mt-2 max-w-[280px] sm:max-w-md', textSecondary)}>
                    Type your transaction or upload an invoice. E.g. &quot;Paid 5000 for cement to Global Steel for Skyline Tower&quot;
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
                  <div className={cn('max-w-[85%] sm:max-w-[70%]', m.role === 'user' ? 'order-2' : '')}>
                    {m.role === 'user' && (
                      <p className={cn('text-[9px] sm:text-[10px] font-bold mb-0.5 text-right', textSecondary)}>{user?.name || user?.email || 'You'}</p>
                    )}
                    <div className={cn('rounded-lg sm:rounded-xl p-2 sm:p-2.5 text-xs sm:text-sm font-normal break-words leading-relaxed', m.role === 'user' ? `${bubbleUser} ${textPrimary}` : `${bubbleAssistant} ${textPrimary}`)}>
                      {m.content}
                    </div>
                    {m.parsedTransaction && (
                      <div className={cn('mt-2 rounded-lg sm:rounded-xl border p-3 text-sm space-y-2', isDark ? 'border-[#404040]' : 'border-slate-200')}>
                        <div className="flex gap-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', m.parsedTransaction.type === 'income' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600')}>{m.parsedTransaction.type}</span>
                          <span className="font-mono font-bold">{m.parsedTransaction.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                        </div>
                        {m.parsedTransaction.category && <p><span className={cn(textSecondary)}>Category:</span> <span className={cn(textPrimary)}>{m.parsedTransaction.category}</span></p>}
                        {m.parsedTransaction.item && <p><span className={cn(textSecondary)}>Item:</span> <span className={cn(textPrimary)}>{m.parsedTransaction.item}</span></p>}
                        {m.parsedTransaction.project && <p><span className={cn(textSecondary)}>Project:</span> <span className={cn(textPrimary)}>{m.parsedTransaction.project}</span></p>}
                        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" className={cn('w-full px-3 py-2 rounded-lg border text-sm font-bold', isDark ? 'bg-[#2d2d2d] border-[#404040]' : 'bg-white border-slate-200')} rows={2} />
                        <button onClick={() => handleConfirmSave(m)} disabled={processing} className="w-full py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm hover:bg-[#A8B838] disabled:opacity-50 transition-all">Confirm & Save</button>
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2', isDark ? 'bg-slate-600 border-slate-500' : 'bg-slate-500 border-slate-400')}>
                      {!avatarImgFailed ? (
                        <img
                          src={profileUrl}
                          alt={user?.name || 'User'}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarImgFailed(true)}
                        />
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
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 animate-spin" />
                  </div>
                  <div className={cn('rounded-lg sm:rounded-xl px-3 py-2.5 border', bubbleAssistant)}>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className={cn('p-3 sm:p-4 border-t flex-shrink-0', isDark ? 'border-[#404040]' : 'border-slate-200', bgSecondary)}>
              <div className={cn('flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border-2', isDark ? 'bg-[#2d2d2d] border-[#C2D642]/30' : 'bg-white border-[#C2D642]/30')}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className={cn('p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center', isDark ? 'hover:bg-[#404040]' : 'hover:bg-slate-100')}>
                  <Paperclip className={cn('w-4 h-4', textSecondary)} />
                </button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="Type your transaction..." className={cn('flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm font-bold', textPrimary, isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400')} />
                <button onClick={handleSend} disabled={!input.trim() || processing} className={cn('p-2 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center', (input.trim() && !processing) ? 'bg-[#C2D642] hover:bg-[#A8B838] text-slate-900' : isDark ? 'bg-[#2d2d2d] text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
