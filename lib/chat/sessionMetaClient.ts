/**
 * Client-side helpers: when to refresh session metadata and calling the Next.js route.
 */

export type MetaMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/** Run after 3rd user message, then every 6th user message after that (3, 9, 15, …). */
export function shouldTriggerSessionMeta(userMessageCount: number): boolean {
  if (userMessageCount < 3) return false;
  return (userMessageCount - 3) % 6 === 0;
}

export function toMetaMessages(
  rows: Array<{ role: string; content: string }>,
  options?: { max?: number }
): MetaMessage[] {
  const max = options?.max ?? 20;
  const out: MetaMessage[] = [];
  for (const r of rows) {
    const role = r.role === 'user' ? 'user' : r.role === 'system' ? 'system' : 'assistant';
    const content = String(r.content ?? '').trim();
    if (!content || content === '…') continue;
    out.push({ role, content });
  }
  return out.slice(-max);
}

export async function fetchSessionMeta(messages: MetaMessage[]): Promise<{ title: string; summary: string }> {
  try {
    const res = await fetch('/api/chat/session-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    let data: { title?: string; summary?: string } = {};
    try {
      data = (await res.json()) as { title?: string; summary?: string };
    } catch {
      /* non-JSON or empty body */
    }
    const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '';
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    return { title, summary };
  } catch {
    return { title: '', summary: '' };
  }
}

/** Skip low-value generated titles in the UI (client-side labels only; no backend rename). */
export function shouldApplySessionRenameTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 3) return false;
  if (/^(hi|hello|hey|ok|okay|yes|no|yo|sup)$/i.test(t)) return false;
  if (/^new chat$/i.test(t)) return false;
  return true;
}

/**
 * Fire-and-forget: loads meta from the API and invokes onSuccess. Swallows errors after logging.
 */
export function scheduleSessionMetaUpdate(
  messages: MetaMessage[],
  onSuccess: (meta: { title: string; summary: string }) => void | Promise<void>
): void {
  void (async () => {
    try {
      const meta = await fetchSessionMeta(messages);
      await onSuccess(meta);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[sessionMetaClient] update failed:', e);
      }
    }
  })();
}

const sessionMetaInflight = new Set<string>();

/**
 * Throttles via shouldTriggerSessionMeta and dedupes by session + user message count (Strict Mode safe).
 */
export function runSessionMetaIfNeeded(options: {
  sessionId: string;
  userMessageCount: number;
  messages: MetaMessage[];
  apply: (meta: { title: string; summary: string }) => void | Promise<void>;
}): void {
  const { sessionId, userMessageCount, messages, apply } = options;
  if (!shouldTriggerSessionMeta(userMessageCount)) return;
  const key = `${sessionId}:${userMessageCount}`;
  if (sessionMetaInflight.has(key)) return;
  sessionMetaInflight.add(key);
  void (async () => {
    try {
      const meta = await fetchSessionMeta(messages);
      await apply(meta);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[sessionMetaClient] update failed:', e);
      }
    } finally {
      sessionMetaInflight.delete(key);
    }
  })();
}
