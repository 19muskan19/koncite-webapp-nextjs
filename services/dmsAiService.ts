/**
 * AI Agent Service (Next.js)
 *
 * DPR (agent = dpr_inventory):
 * - createSession: POST /api/sessions { agent, name, user_id }
 * - sendMessage: POST /api/chat { message, agent, session_id, user_id, project_id, files, file_names }
 *
 * Inventory (agent = inventory_agent):
 * - createSession: POST /api/sessions { agent, name, user_id }
 * - sendMessage: POST /api/chat { message, agent, session_id, user_id, project_id, files }
 *
 * Document Mgmt (agent = doc_mgmt):
 * - createSession: POST /api/sessions { agent, name, user_id }
 * - sendMessage: POST /api/chat { message, agent, session_id, user_id, project_id, files, file_names }
 * - Requires context JWT with Koncite document scope; file-only requests supported (message optional)
 *
 * Documents AI helpers (same Bearer): GET /documents/ai/context; POST /documents/ai/upload;
 * POST /documents/ai/search — implemented below where the route group exists on the API.
 *
 * user_id from JWT (Bearer token). Chat/session paths use /ai-agent/* (Laravel forwards to Python).
 */

import apiClient from './apiClient';

export const AGENT_DPR_INVENTORY = 'dpr_inventory' as const;
export const AGENT_DOC_MGMT = 'doc_mgmt' as const;
/** Laravel / Python finance assistant (`ai-finance` accepted server-side; we send `ai_finance`). */
export const AGENT_AI_FINANCE = 'ai_finance' as const;

/**
 * Inventory agent: Not yet implemented.
 * AI Hub shows "Coming Soon" when Inventory is selected.
 * Future: stock status, material tracking, and related inventory features.
 */

// --- Response types (match Laravel/Python) ---

export interface GetChatContextResponse {
  success: boolean;
  message: string;
}

export interface AiSession {
  id?: string;
  session_id?: string;
  name?: string;
  agent?: string;
  created_at?: string;
  messages?: Array<{ role?: string; content?: string }>;
  chat_history?: Array<{ role?: string; content?: string }>;
  [key: string]: unknown;
}

export interface CreateSessionResponse extends AiSession {}

/** One row after normalizing GET /ai-agent/sessions/{id} history arrays. */
export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Unwrap Laravel `{ status, data: { ... } }` and chained `data` objects (and JSON strings).
 */
export function normalizeAgentSessionDetail(raw: unknown): AiSession {
  let cur: unknown = raw;
  for (let depth = 0; depth < 10; depth++) {
    if (cur == null) break;
    if (typeof cur === 'string') {
      const t = cur.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try {
          cur = JSON.parse(cur) as unknown;
          continue;
        } catch {
          break;
        }
      }
      break;
    }
    if (typeof cur !== 'object' || Array.isArray(cur)) break;
    const o = cur as Record<string, unknown>;
    if ('data' in o && o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
      cur = o.data;
      continue;
    }
    break;
  }
  return (typeof cur === 'object' && cur !== null && !Array.isArray(cur) ? cur : {}) as AiSession;
}

function isLikelyChatEntry(x: unknown): boolean {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return ['content', 'message', 'text', 'body', 'role', 'sender'].some((k) => k in o);
}

function collectMessageArrays(obj: Record<string, unknown>, depth = 0): unknown[][] {
  if (depth > 8) return [];
  const out: unknown[][] = [];
  for (const v of Object.values(obj)) {
    if (Array.isArray(v) && v.length > 0 && isLikelyChatEntry(v[0])) {
      out.push(v);
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...collectMessageArrays(v as Record<string, unknown>, depth + 1));
    }
  }
  return out;
}

function extractHistoryArray(session: Record<string, unknown>): unknown[] {
  const directKeys = ['messages', 'chat_history', 'chatHistory', 'history', 'conversation', 'turns', 'dialog', 'chat'];
  for (const k of directKeys) {
    const v = session[k];
    if (Array.isArray(v)) return v;
  }
  const nested = collectMessageArrays(session);
  if (!nested.length) return [];
  nested.sort((a, b) => b.length - a.length);
  return nested[0] ?? [];
}

function mapTurnToChat(m: unknown): AiChatTurn | null {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const o = m as Record<string, unknown>;
  const roleRaw = String(o.role ?? o.sender ?? o.type ?? '').toLowerCase();
  const role: 'user' | 'assistant' = ['user', 'human', 'client'].includes(roleRaw) ? 'user' : 'assistant';
  const candidates = [o.content, o.message, o.text, o.body];
  let content = '';
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      content = c.trim();
      break;
    }
  }
  if (!content) return null;
  return { role, content };
}

/**
 * Read chat turns from a session detail object (after {@link normalizeAgentSessionDetail}).
 */
export function extractChatTurnsFromSession(session: AiSession | Record<string, unknown>): AiChatTurn[] {
  const obj =
    typeof session === 'object' && session !== null && !Array.isArray(session)
      ? (session as Record<string, unknown>)
      : {};
  const rawArr = extractHistoryArray(obj);
  const out: AiChatTurn[] = [];
  for (let i = 0; i < rawArr.length; i++) {
    const t = mapTurnToChat(rawArr[i]);
    if (t) out.push(t);
  }
  return out;
}

export interface ChatResponse {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
  text?: string;
  output?: string;
  data?: { reply?: string; response?: string; message?: string; content?: string } | string;
  [key: string]: unknown;
}

/**
 * Extract AI reply from Python/Laravel response. Python may return reply, response, message, content, etc.
 */
export function extractReplyFromResponse(response: ChatResponse | unknown): string {
  if (!response || typeof response !== 'object') return '';
  const r = response as Record<string, unknown>;
  const check = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : '';
  for (const k of ['reply', 'response', 'message', 'content', 'text', 'output']) {
    const v = check(r[k]);
    if (v) return v;
  }
  const nested = r.data;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  if (nested && typeof nested === 'object') {
    for (const k of ['reply', 'response', 'message', 'content']) {
      const v = check((nested as Record<string, unknown>)[k]);
      if (v) return v;
    }
  }
  return '';
}

export interface BlobStructureResponse {
  [key: string]: unknown;
}

// --- API functions ---

/**
 * Step 1: Load chat context (optional).
 * MVC: GET /company/api/documents/ai/context?project_id=...
 * Next.js: GET /api/documents/ai/context?project_id=...
 */
export async function getChatContext(projectId?: string | number): Promise<GetChatContextResponse> {
  const params = projectId != null ? { project_id: String(projectId) } : {};
  const { data } = await apiClient.get<GetChatContextResponse>('/documents/ai/context', { params });
  return data;
}

/**
 * POST /api/documents/ai/upload — ingest files for AI / RAG (payload matches Laravel validation).
 */
export async function uploadDocumentForAi(formData: FormData): Promise<unknown> {
  const { data } = await apiClient.post<unknown>('/documents/ai/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * POST /api/documents/ai/search — semantic or keyword search over allowed documents.
 */
export async function searchDocumentsAi(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await apiClient.post<unknown>('/documents/ai/search', body);
  return data;
}

/**
 * Create a chat session. Laravel adds user_id from auth, forwards to Python.
 * POST /api/ai-agent/sessions
 * Payload: { agent, name } — name is optional; backend assigns when omitted or empty.
 */
export async function createSession(
  name?: string,
  agent: string = AGENT_DOC_MGMT
): Promise<CreateSessionResponse> {
  const trimmed = (name ?? '').trim();
  /** Omit `name` when empty so Laravel/Python can assign default; some stacks reject `name: ""`. */
  const nameFields = trimmed ? { name: trimmed } : {};
  const payload =
    agent === 'inventory_agent'
      ? { agent: 'inventory_agent', ...nameFields }
      : agent === 'dpr_inventory'
        ? { agent: 'dpr_inventory', ...nameFields }
        : agent === 'doc_mgmt'
          ? { agent: 'doc_mgmt', ...nameFields }
          : agent === AGENT_AI_FINANCE || agent === 'ai-finance'
            ? { agent: AGENT_AI_FINANCE, ...nameFields }
            : {
                agent,
                ...nameFields,
              };
  const { data } = await apiClient.post<CreateSessionResponse>('/ai-agent/sessions', payload);
  return data;
}

/**
 * Step 2b: List sessions.
 * GET /api/ai-agent/sessions
 */
export async function listSessions(): Promise<AiSession[]> {
  const { data } = await apiClient.get<AiSession[] | { data?: AiSession[]; sessions?: AiSession[] }>('/ai-agent/sessions');
  if (Array.isArray(data)) return data;
  const wrapped = data as { data?: AiSession[]; sessions?: AiSession[] };
  const list = wrapped?.data ?? wrapped?.sessions ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Step 2c: Get one session.
 * GET /api/ai-agent/sessions/{sessionId}
 */
export async function getSession(sessionId: string): Promise<AiSession> {
  const { data } = await apiClient.get<unknown>(`/ai-agent/sessions/${encodeURIComponent(sessionId)}`);
  return normalizeAgentSessionDetail(data);
}

/**
 * Step 2d: Rename session.
 * PUT /api/ai-agent/sessions/{sessionId}/rename
 */
export async function renameSession(sessionId: string, name: string): Promise<AiSession> {
  const { data } = await apiClient.put<AiSession>(
    `/ai-agent/sessions/${encodeURIComponent(sessionId)}/rename`,
    { name }
  );
  return data;
}

/**
 * Send message (and optionally files).
 * POST /api/ai-agent/chat
 *
 * Laravel AiAgentController expects: session_id (required), message (nullable if files), agent, project_id (optional), files[] (optional).
 * Laravel converts files to base64 and forwards to Python: { session_id, message, agent, project_id, user_id, files[], file_names[] }
 *
 * For dpr_inventory: Bearer token is passed so Python can call Laravel APIs (project-list etc.)
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  options?: { agent?: string; projectId?: string | number; files?: File[] }
): Promise<ChatResponse> {
  const agent = options?.agent ?? AGENT_DOC_MGMT;
  const hasFiles = options?.files && options.files.length > 0;

  if (hasFiles) {
    const formData = new FormData();
    formData.append('message', message || 'Files attached.');
    formData.append('agent', agent);
    formData.append('session_id', sessionId);
    if (options?.projectId != null) {
      formData.append('project_id', String(options.projectId));
    }
    for (const file of options!.files!) {
      formData.append('files[]', file);
      formData.append('file_names[]', file.name);
    }
    const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  }

  const payload =
    agent === 'inventory_agent'
      ? {
          message: message || '',
          agent: 'inventory_agent',
          session_id: sessionId,
          project_id: options?.projectId != null ? String(options.projectId) : null,
        }
      : agent === 'dpr_inventory'
        ? {
            message: message || '',
            agent: 'dpr_inventory',
            session_id: sessionId,
            project_id: options?.projectId != null ? String(options.projectId) : null,
          }
        : agent === 'doc_mgmt'
          ? {
              message: message || '',
              agent: 'doc_mgmt',
              session_id: sessionId,
              project_id: options?.projectId != null ? String(options.projectId) : null,
            }
          : agent === AGENT_AI_FINANCE || agent === 'ai-finance'
            ? {
                message: message || '',
                agent: AGENT_AI_FINANCE,
                session_id: sessionId,
                project_id: options?.projectId != null ? String(options.projectId) : null,
              }
            : {
                session_id: sessionId,
                message: message || '',
                agent,
                project_id: options?.projectId != null ? String(options.projectId) : null,
              };

  const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', payload, {
    timeout: 60000,
  });
  return data;
}

/**
 * Get blob structure (DMS agent).
 * GET /api/ai-agent/blob-structure
 */
export async function getBlobStructure(): Promise<BlobStructureResponse> {
  const { data } = await apiClient.get<BlobStructureResponse>('/ai-agent/blob-structure');
  return data;
}

/**
 * Resolve session ID from create/list/detail response.
 * Unwraps Laravel `{ data: ... }` chains and optional `{ session: { id } }` shapes.
 */
export function getSessionIdFromResponse(response: CreateSessionResponse | unknown): string {
  const normalized = normalizeAgentSessionDetail(response) as Record<string, unknown>;
  const fromSessionObj =
    normalized.session != null && typeof normalized.session === 'object' && !Array.isArray(normalized.session)
      ? (normalized.session as Record<string, unknown>).session_id ??
        (normalized.session as Record<string, unknown>).id
      : undefined;
  const id = normalized.session_id ?? normalized.id ?? fromSessionObj;
  if (id != null && String(id).trim()) return String(id);
  return '';
}