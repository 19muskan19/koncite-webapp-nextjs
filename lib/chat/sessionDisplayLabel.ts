/**
 * Session list label: prefer backend or meta title; if missing, show a short session id (no placeholder copy).
 */
export function sessionSidebarLabel(name: string | undefined | null, sessionId: string): string {
  const n = String(name ?? '').trim();
  if (n) return n;
  const id = String(sessionId ?? '').trim();
  if (!id) return '';
  return id.length <= 14 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}
