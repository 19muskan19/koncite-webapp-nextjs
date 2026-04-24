import { NextResponse } from 'next/server';
import {
  generateSessionMeta,
  SESSION_META_MESSAGE_WINDOW,
  type SessionMetaChatMessage,
} from '@/lib/azureSessionMeta';

export const runtime = 'nodejs';

type Body = {
  messages?: unknown;
};

function isChatMessage(x: unknown): x is SessionMetaChatMessage {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const o = x as { role?: unknown; content?: unknown };
  const role = o.role;
  const content = o.content;
  if (role !== 'user' && role !== 'assistant' && role !== 'system') return false;
  return typeof content === 'string';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const raw = body.messages;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 });
    }
    const messages = raw.filter(isChatMessage);
    if (messages.length === 0) {
      return NextResponse.json({ error: 'no valid messages' }, { status: 400 });
    }

    const meta = await generateSessionMeta(messages.slice(-SESSION_META_MESSAGE_WINDOW));
    return NextResponse.json(meta);
  } catch (e) {
    console.error('[api/chat/session-meta]', e);
    return NextResponse.json(
      { title: '', summary: '', error: 'session_meta_failed' },
      { status: 200 }
    );
  }
}
