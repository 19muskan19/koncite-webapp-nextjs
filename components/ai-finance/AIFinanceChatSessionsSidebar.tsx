'use client';

import React from 'react';
import { Plus, RefreshCw, Loader2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { sessionSidebarLabel } from '@/lib/chat/sessionDisplayLabel';

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
  onCreate: () => void;
  /** Mobile slide-over only: close the sessions panel (show chat again). */
  onClosePanel?: () => void;
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
  onClosePanel,
}: AIFinanceChatSessionsSidebarProps) {
  const border = isDark ? 'border-[#2d2d2d]' : 'border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgHeader = isDark ? 'bg-[#141414]' : 'bg-slate-100/90';

  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-0 w-full flex-shrink-0',
        isDark ? 'bg-[#0f0f0f]' : 'bg-slate-50'
      )}
    >
      <div className={cn('px-2 py-2 border-b flex items-center justify-between gap-1.5', border, bgHeader)}>
        <span className={cn('text-[10px] font-black uppercase tracking-wider truncate min-w-0', textPrimary)}>Sessions</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-[#2a2a2a]' : 'hover:bg-slate-200')}
            aria-label="Refresh sessions"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', textSecondary)} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!creating && !loading) onCreate();
            }}
            disabled={creating || loading}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              creating || loading ? 'opacity-50 cursor-not-allowed' : '',
              isDark ? 'hover:bg-[#C2D642]/20' : 'hover:bg-[#C2D642]/25'
            )}
            aria-label="New session"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C2D642]" /> : <Plus className="w-3.5 h-3.5 text-[#C2D642]" />}
          </button>
          {onClosePanel && (
            <button
              type="button"
              onClick={onClosePanel}
              className={cn(
                'md:hidden p-2 -mr-0.5 rounded-md min-w-[40px] min-h-[40px] flex items-center justify-center',
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              )}
              aria-label="Close sessions list"
            >
              <X className={cn('w-4 h-4', textPrimary)} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className={cn('w-6 h-6 animate-spin', textSecondary)} />
          </div>
        ) : sessions.length === 0 ? (
          <p className={cn('text-[10px] font-semibold px-1 py-4 text-center', textSecondary)}>
            No sessions yet. Tap + to start a chat; the session title updates after you send messages.
          </p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                'rounded-lg border text-left transition-colors',
                activeSessionId === s.id
                  ? 'border-[#C2D642] bg-[#C2D642]/15'
                  : isDark
                    ? 'border-transparent hover:bg-[#1e1e1e]'
                    : 'border-transparent hover:bg-white hover:border-slate-200'
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
                className="w-full px-2 py-2 flex items-start gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C2D642]/50 rounded-lg"
              >
                <span className={cn('text-[11px] font-bold leading-tight line-clamp-2 flex-1 text-left', textPrimary)}>
                  {sessionSidebarLabel(s.name, s.id)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
