/**
 * Browser sessionStorage for session-meta summaries and titles (no Laravel rename required).
 * Used by session-meta apply callbacks and `useSessionSummary` / `SessionSummaryBanner`.
 */

export type SessionSummaryKind = 'ai' | 'copilot';

const PREFIX_AI = 'ai-session-summary:';
const PREFIX_COPILOT = 'copilot-session-summary:';
const PREFIX_AI_TITLE = 'ai-session-meta-title:';
const PREFIX_COPILOT_TITLE = 'copilot-session-meta-title:';

/** Dispatched after `setStoredSessionSummary` so React views update in the same tab. */
export const SESSION_SUMMARY_UPDATED_EVENT = 'koncite:session-summary-updated';

/** Dispatched after `setStoredSessionMetaTitle` so sidebars can refresh labels. */
export const SESSION_META_TITLE_UPDATED_EVENT = 'koncite:session-meta-title-updated';

export function storageKeyForSessionSummary(sessionId: string, kind: SessionSummaryKind): string {
  return kind === 'copilot' ? `${PREFIX_COPILOT}${sessionId}` : `${PREFIX_AI}${sessionId}`;
}

export function getStoredSessionSummary(sessionId: string | null | undefined, kind: SessionSummaryKind): string {
  if (sessionId == null || sessionId === '' || typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(storageKeyForSessionSummary(sessionId, kind))?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setStoredSessionSummary(
  sessionId: string,
  summary: string,
  kind: SessionSummaryKind
): void {
  if (typeof window === 'undefined' || !sessionId || !summary.trim()) return;
  try {
    sessionStorage.setItem(storageKeyForSessionSummary(sessionId, kind), summary.trim());
    window.dispatchEvent(
      new CustomEvent(SESSION_SUMMARY_UPDATED_EVENT, { detail: { sessionId, kind } })
    );
  } catch {
    /* quota / private mode */
  }
}

export function storageKeyForSessionMetaTitle(sessionId: string, kind: SessionSummaryKind): string {
  return kind === 'copilot' ? `${PREFIX_COPILOT_TITLE}${sessionId}` : `${PREFIX_AI_TITLE}${sessionId}`;
}

export function getStoredSessionMetaTitle(sessionId: string | null | undefined, kind: SessionSummaryKind): string {
  if (sessionId == null || sessionId === '' || typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(storageKeyForSessionMetaTitle(sessionId, kind))?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setStoredSessionMetaTitle(sessionId: string, title: string, kind: SessionSummaryKind): void {
  if (typeof window === 'undefined' || !sessionId || !title.trim()) return;
  try {
    sessionStorage.setItem(storageKeyForSessionMetaTitle(sessionId, kind), title.trim());
    window.dispatchEvent(
      new CustomEvent(SESSION_META_TITLE_UPDATED_EVENT, { detail: { sessionId, kind } })
    );
  } catch {
    /* quota / private mode */
  }
}
