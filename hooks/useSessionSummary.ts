'use client';

import { useEffect, useState } from 'react';
import {
  getStoredSessionSummary,
  SESSION_SUMMARY_UPDATED_EVENT,
  type SessionSummaryKind,
} from '@/lib/chat/sessionSummaryStorage';

/**
 * Live text for the current session’s stored summary (same-tab updates via custom event).
 */
export function useSessionSummary(sessionId: string | null | undefined, kind: SessionSummaryKind): string {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(getStoredSessionSummary(sessionId, kind));

    const onUpdate = (ev: Event) => {
      const e = ev as CustomEvent<{ sessionId?: string; kind?: SessionSummaryKind }>;
      const d = e.detail;
      if (d?.sessionId === sessionId && d?.kind === kind) {
        setText(getStoredSessionSummary(sessionId, kind));
      }
    };

    window.addEventListener(SESSION_SUMMARY_UPDATED_EVENT, onUpdate as EventListener);
    return () => window.removeEventListener(SESSION_SUMMARY_UPDATED_EVENT, onUpdate as EventListener);
  }, [sessionId, kind]);

  return text;
}
