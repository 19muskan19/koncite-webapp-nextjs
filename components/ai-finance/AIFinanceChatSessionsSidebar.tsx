'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw, Pencil, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FinanceSessionListItem {
  id: string;
  name: string;
  created_at?: string;
}

interface AIFinanceChatSessionsSidebarProps {
  isDark: boolean;
  sessions: FinanceSessionListItem[];
  activeSessionId: string | null;
  loading: boolean;
  creating: boolean;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
  onCreate: (name: string) => void;
  onRename: (sessionId: string, name: string) => void;
}

export default function AIFinanceChatSessionsSidebar({
  isDark,
  sessions,
  activeSessionId,
  loading,
  creating,
  onSelect,
  onRefresh,
  onCreate,
  onRename,
}: AIFinanceChatSessionsSidebarProps) {
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const border = isDark ? 'border-[#2d2d2d]' : 'border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgHeader = isDark ? 'bg-[#141414]' : 'bg-slate-100/90';
  const inputClass = cn(
    'w-full px-2 py-1.5 rounded-md border text-xs font-bold outline-none focus:ring-2 focus:ring-[#C2D642]/40',
    isDark ? 'bg-[#1e1e1e] border-[#404040] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  );

  const submitNew = () => {
    const name = newName.trim() || `Finance — ${new Date().toLocaleString()}`;
    onCreate(name);
    setNewName('');
    setShowNewForm(false);
  };

  const startRename = (item: FinanceSessionListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenameValue(item.name);
  };

  const commitRename = (sessionId: string) => {
    const name = renameValue.trim();
    if (name) onRename(sessionId, name);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full max-w-[200px] sm:max-w-[220px] flex-shrink-0 border-r',
        border,
        isDark ? 'bg-[#0f0f0f]' : 'bg-slate-50'
      )}
    >
      <div className={cn('px-2 py-2 border-b flex items-center justify-between gap-1', border, bgHeader)}>
        <span className={cn('text-[10px] font-black uppercase tracking-wider truncate', textPrimary)}>Sessions</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-[#2a2a2a]' : 'hover:bg-slate-200')}
            aria-label="Refresh sessions"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', textSecondary, loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-[#C2D642]/20' : 'hover:bg-[#C2D642]/25')}
            aria-label="New session"
          >
            <Plus className="w-3.5 h-3.5 text-[#C2D642]" />
          </button>
        </div>
      </div>

      {showNewForm && (
        <div className={cn('p-2 border-b space-y-1.5', border)}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name (optional)"
            className={inputClass}
            onKeyDown={(e) => e.key === 'Enter' && submitNew()}
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={submitNew}
              disabled={creating}
              className="flex-1 py-1.5 rounded-md bg-[#C2D642] text-slate-900 text-[10px] font-black uppercase"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewName(''); }}
              className={cn('px-2 py-1.5 rounded-md text-[10px] font-bold', isDark ? 'bg-[#2a2a2a]' : 'bg-slate-200')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className={cn('w-6 h-6 animate-spin', textSecondary)} />
          </div>
        ) : sessions.length === 0 ? (
          <p className={cn('text-[10px] font-semibold px-1 py-4 text-center', textSecondary)}>
            No sessions yet. Tap + to create one via POST /ai-agent/sessions.
          </p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group rounded-lg border text-left transition-colors',
                activeSessionId === s.id
                  ? 'border-[#C2D642] bg-[#C2D642]/15'
                  : isDark
                    ? 'border-transparent hover:bg-[#1e1e1e]'
                    : 'border-transparent hover:bg-white hover:border-slate-200'
              )}
            >
              {renamingId === s.id ? (
                <div className="p-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className={inputClass}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(s.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                  <button type="button" onClick={() => commitRename(s.id)} className="p-1 text-emerald-500">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)} className="p-1 text-slate-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
                  className="w-full px-2 py-2 flex items-start gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C2D642]/50 rounded-lg"
                >
                  <span className={cn('text-[11px] font-bold leading-tight line-clamp-2 flex-1 text-left', textPrimary)}>{s.name || 'Untitled'}</span>
                  <button
                    type="button"
                    onClick={(e) => startRename(s, e)}
                    className={cn(
                      'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                      isDark ? 'hover:bg-[#2a2a2a]' : 'hover:bg-slate-200'
                    )}
                    aria-label="Rename session"
                  >
                    <Pencil className={cn('w-3 h-3', textSecondary)} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
