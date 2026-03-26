/**
 * Status "Update" flow stores optional remarks inside task description using blocks:
 *   [Status update · <locale date/time>]
 *   <remark text>
 * Multiple blocks are separated by a blank line before the next "[Status update ·".
 */

const MARKER = '\n\n[Status update ·';

export function appendStatusUpdateComment(
  baseDescription: string | undefined,
  remark: string | undefined,
): string | undefined {
  const r = (remark || '').trim();
  if (!r) return undefined;
  const base = (baseDescription || '').trimEnd();
  const stamp = new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  const block = `[Status update · ${stamp}]\n${r}`;
  return base ? `${base}\n\n${block}` : block;
}

export type StatusUpdateComment = { label: string; text: string };

export function splitDescriptionAndStatusComments(description: string | undefined): {
  body: string;
  comments: StatusUpdateComment[];
} {
  const raw = (description || '').trim();
  if (!raw) return { body: '', comments: [] };

  const idx = raw.indexOf(MARKER);

  if (idx === -1) {
    if (/^\[Status update ·/.test(raw)) {
      const m = raw.match(/^\[Status update · (.+)\]\n([\s\S]*)$/);
      if (m) return { body: '', comments: [{ label: m[1].trim(), text: m[2].trim() }] };
    }
    return { body: raw, comments: [] };
  }

  const body = raw.slice(0, idx).trim();
  const rest = raw.slice(idx + 2).trim();
  const comments: StatusUpdateComment[] = [];
  for (const block of rest.split(/\n\n(?=\[Status update ·)/)) {
    const m = block.match(/^\[Status update · (.+)\]\n([\s\S]*)$/);
    if (m) comments.push({ label: m[1].trim(), text: m[2].trim() });
  }
  return { body, comments };
}
