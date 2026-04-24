'use client';

import { cn } from '@/utils/cn';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import type { SessionSummaryKind } from '@/lib/chat/sessionSummaryStorage';

interface SessionSummaryBannerProps {
  sessionId: string | null | undefined;
  kind: SessionSummaryKind;
  isDark?: boolean;
  className?: string;
}

/**
 * Shows the AI-generated session summary when present (stored after session-meta runs).
 */
export default function SessionSummaryBanner({ sessionId, kind, isDark, className }: SessionSummaryBannerProps) {
  const summary = useSessionSummary(sessionId, kind);
  if (!summary) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-left shrink-0',
        isDark
          ? 'border-[#C2D642]/25 bg-[#1a1a1a] text-slate-200'
          : 'border-slate-200 bg-white text-slate-800 shadow-sm',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          'text-[10px] font-black uppercase tracking-wider mb-1',
          isDark ? 'text-[#C2D642]/90' : 'text-[#5c6b1f]'
        )}
      >
        Session summary
      </p>
      <p className={cn('text-xs sm:text-sm leading-snug font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>
        {summary}
      </p>
    </div>
  );
}
