/**
 * Koncite Copilot (Ask me) — relative to Laravel `/api` base.
 *
 * Uses the same routes as `aiAgentService` (staging has no bare `/api/sessions` or `/api/chat`):
 *
 * - **POST /ai-agent/sessions** — create session (`agent: copilot`); response includes `session_id` (UUID).
 * - **GET /ai-agent/sessions** — list (optional `user_id`, `agent`).
 * - **GET /ai-agent/sessions/{id}** — session detail / history.
 * - **POST /ai-agent/chat** — JSON or multipart when uploading files.
 *   Fields: `session_id`, `message`, `agent` (`copilot`), optional `project_id`.
 *
 * Override paths with `NEXT_PUBLIC_COPILOT_SESSIONS_PATH` / `NEXT_PUBLIC_COPILOT_CHAT_PATH` (no leading slash).
 */

import apiClient, { getAuthToken } from './apiClient';
import { extractReplyFromResponse, type ChatResponse } from './aiAgentService';

export const COPILOT_AGENT = 'copilot' as const;

function pathWithLeadingSlash(envKey: 'NEXT_PUBLIC_COPILOT_SESSIONS_PATH' | 'NEXT_PUBLIC_COPILOT_CHAT_PATH', fallback: string): string {
  const raw = process.env[envKey]?.replace(/^\/+/, '').trim();
  const segment = raw || fallback;
  return `/${segment}`;
}

/** `POST|GET .../ai-agent/sessions` — must match Laravel `routes/api.php`. */
export const COPILOT_SESSIONS_PATH = pathWithLeadingSlash('NEXT_PUBLIC_COPILOT_SESSIONS_PATH', 'ai-agent/sessions');

/** `POST .../ai-agent/chat` */
export const COPILOT_CHAT_PATH = pathWithLeadingSlash('NEXT_PUBLIC_COPILOT_CHAT_PATH', 'ai-agent/chat');

export interface CopilotSessionResponse {
  id?: string;
  session_id?: string;
  agent?: string;
  name?: string;
  user_id?: number;
  [key: string]: unknown;
}

export function getCopilotSessionId(res: CopilotSessionResponse | unknown): string {
  if (!res || typeof res !== 'object') return '';
  const r = res as Record<string, unknown>;
  const id = r.session_id ?? r.id;
  return id != null ? String(id) : '';
}

/** @deprecated Use `COPILOT_SESSIONS_PATH` — same value; kept for imports. */
export const COPILOT_SESSION_CREATE_PATH = COPILOT_SESSIONS_PATH;

export interface CopilotSessionListItem {
  id: string;
  name: string;
  created_at?: string;
  agent?: string;
}

export interface CopilotChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

function unwrapEnvelope<T extends object>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data: unknown }).data != null) {
    const inner = (raw as { data: unknown }).data;
    if (typeof inner === 'object') return inner as T;
  }
  return raw as T;
}

export async function createCopilotSession(params: {
  userId?: number;
  name?: string;
}): Promise<CopilotSessionResponse> {
  const body: Record<string, unknown> = {
    agent: COPILOT_AGENT,
    ...(params.name ? { name: params.name } : {}),
    ...(params.userId != null && params.userId > 0 ? { user_id: params.userId } : {}),
  };
  const { data } = await apiClient.post<unknown>(COPILOT_SESSIONS_PATH, body);
  return unwrapEnvelope<CopilotSessionResponse>(data);
}

/** Normalize GET /ai-agent/sessions (list) payloads into rows for the sidebar. */
export function parseCopilotSessionList(raw: unknown): CopilotSessionListItem[] {
  let payload: unknown = raw;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const d = (payload as { data: unknown }).data;
    if (Array.isArray(d)) payload = d;
    else if (d && typeof d === 'object' && 'data' in (d as object)) {
      const inner = (d as { data?: unknown }).data;
      if (Array.isArray(inner)) payload = inner;
    }
  }
  if (payload && typeof payload === 'object' && 'sessions' in payload && Array.isArray((payload as { sessions: unknown }).sessions)) {
    payload = (payload as { sessions: unknown[] }).sessions;
  }
  const list = Array.isArray(payload) ? payload : [];

  const rows: CopilotSessionListItem[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = o.session_id ?? o.id;
    if (id == null || String(id).trim() === '') continue;
    const agent = typeof o.agent === 'string' ? o.agent.toLowerCase() : '';
    if (agent && !agent.includes('copilot')) {
      continue;
    }
    rows.push({
      id: String(id),
      name: String(o.name ?? o.title ?? `Chat ${i + 1}`).trim() || `Chat ${i + 1}`,
      ...(typeof o.created_at === 'string' ? { created_at: o.created_at } : {}),
      ...(typeof o.agent === 'string' ? { agent: o.agent } : {}),
    });
  }
  return rows;
}

/** Map GET /ai-agent/sessions/:id (detail) into chat turns for the transcript. */
export function extractCopilotChatTurns(raw: unknown): CopilotChatTurn[] {
  if (raw == null || typeof raw !== 'object') return [];
  const unwrapped = unwrapEnvelope<Record<string, unknown>>(raw as object);
  const candidates: unknown[] = [
    unwrapped.messages,
    unwrapped.chat_history,
    (unwrapped as { chatHistory?: unknown }).chatHistory,
    unwrapped.conversation,
    unwrapped.history,
  ];
  if (unwrapped.data && typeof unwrapped.data === 'object') {
    const d = unwrapped.data as Record<string, unknown>;
    candidates.push(d.messages, d.chat_history, d.conversation);
  }

  const out: CopilotChatTurn[] = [];
  for (const arr of candidates) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const roleRaw = String(o.role ?? o.sender ?? o.from ?? '').toLowerCase();
      const content = String(o.content ?? o.message ?? o.text ?? o.body ?? '').trim();
      if (!content) continue;
      let role: 'user' | 'assistant' | null = null;
      if (roleRaw === 'user' || roleRaw === 'human') role = 'user';
      else if (roleRaw === 'assistant' || roleRaw === 'ai' || roleRaw === 'bot' || roleRaw === 'model') role = 'assistant';
      if (!role) continue;
      out.push({ role, content });
    }
    if (out.length) break;
  }
  return out;
}

export async function listCopilotAgents(): Promise<unknown> {
  const { data } = await apiClient.get('/agents');
  return data;
}

export async function listCopilotSessions(userId: number): Promise<unknown> {
  const { data } = await apiClient.get(COPILOT_SESSIONS_PATH, {
    params: { user_id: userId, agent: COPILOT_AGENT },
  });
  return data;
}

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'response' in err) {
    const s = (err as { response?: { status?: number } }).response?.status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

/** GET /ai-agent/sessions?user_id=&agent= — parsed rows for the Ask me sidebar. */
export async function fetchCopilotSessions(userId: number): Promise<CopilotSessionListItem[]> {
  try {
    const { data } = await apiClient.get<unknown>(COPILOT_SESSIONS_PATH, {
      params: { user_id: userId, agent: COPILOT_AGENT },
    });
    return parseCopilotSessionList(data);
  } catch (e: unknown) {
    const status = getHttpStatus(e);
    // Missing / not implemented route — avoid treating as fatal for the whole Ask me page.
    if (status === 404 || status === 405) {
      return [];
    }
    throw e;
  }
}

export async function getCopilotSession(sessionId: string, userId: number): Promise<unknown> {
  const { data } = await apiClient.get(
    `${COPILOT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}`,
    {
      params: { user_id: userId },
    }
  );
  return data;
}

/** GET /ai-agent/sessions/:id?user_id= — chat turns only. */
export async function fetchCopilotSessionMessages(sessionId: string, userId: number): Promise<CopilotChatTurn[]> {
  const { data } = await apiClient.get<unknown>(
    `${COPILOT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}`,
    {
      params: { user_id: userId },
    }
  );
  return extractCopilotChatTurns(data);
}

export async function renameCopilotSession(
  sessionId: string,
  name: string,
  userId: number
): Promise<unknown> {
  const { data } = await apiClient.put(
    `${COPILOT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}/rename`,
    { name },
    { params: { user_id: userId } }
  );
  return data;
}

function shouldIncludeUserIdInBody(): boolean {
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  return !token;
}

function appendUserIdIfNeeded(target: Record<string, unknown> | FormData, userId?: number): void {
  if (!shouldIncludeUserIdInBody()) return;
  if (userId == null || userId <= 0) return;
  if (target instanceof FormData) {
    target.append('user_id', String(userId));
  } else {
    target.user_id = userId;
  }
}

/**
 * POST /ai-agent/chat — `Content-Type: application/json` or multipart when `files` are present.
 * Requires a non-empty `message` unless at least one file is uploaded (otherwise API returns 400).
 */
export async function postCopilotChat(params: {
  sessionId: string;
  message: string;
  userId?: number;
  agent?: string;
  projectId?: string | null;
  files?: File[];
}): Promise<ChatResponse> {
  const timeout = 120_000;
  const agent = params.agent ?? COPILOT_AGENT;
  const hasFiles = Boolean(params.files?.length);
  const messageTrim = params.message.trim();
  if (!messageTrim && !hasFiles) {
    throw new Error('Copilot requires a non-empty message or at least one file.');
  }

  if (hasFiles) {
    const formData = new FormData();
    formData.append('session_id', params.sessionId);
    formData.append('message', messageTrim || 'Files attached.');
    formData.append('agent', agent);
    appendUserIdIfNeeded(formData, params.userId);
    if (params.projectId) {
      formData.append('project_id', params.projectId);
    }
    for (const file of params.files!) {
      formData.append('files[]', file);
      formData.append('file_names[]', file.name);
    }
    const { data } = await apiClient.post<unknown>(COPILOT_CHAT_PATH, formData, {
      timeout,
    });
    return unwrapEnvelope<ChatResponse>(data);
  }

  const body: Record<string, unknown> = {
    session_id: params.sessionId,
    message: messageTrim,
    agent,
  };
  appendUserIdIfNeeded(body, params.userId);
  if (params.projectId) {
    body.project_id = params.projectId;
  }

  const { data } = await apiClient.post<unknown>(COPILOT_CHAT_PATH, body, {
    timeout,
    headers: { 'Content-Type': 'application/json' },
  });
  return unwrapEnvelope<ChatResponse>(data);
}

/** @deprecated Use `postCopilotChat` — same implementation. */
export const sendCopilotMessage = postCopilotChat;

export function extractCopilotReply(res: unknown): string {
  return extractReplyFromResponse(res);
}

/** Optional `session_id` returned on chat responses — sync client if the server rotates or confirms id. */
export function getSessionIdFromCopilotChatResponse(res: unknown): string | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;
  const top = r.session_id ?? r.sessionId;
  if (top != null && String(top).trim() !== '') return String(top);
  const nested = r.data;
  if (nested && typeof nested === 'object') {
    const d = nested as Record<string, unknown>;
    const sid = d.session_id ?? d.sessionId;
    if (sid != null && String(sid).trim() !== '') return String(sid);
  }
  return null;
}
