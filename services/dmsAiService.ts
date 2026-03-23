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
 * user_id from JWT (Bearer token). Paths may be /ai-agent/sessions, /ai-agent/chat (Laravel routes).
 */

import apiClient from './apiClient';

export const AGENT_DPR_INVENTORY = 'dpr_inventory' as const;
export const AGENT_DOC_MGMT = 'doc_mgmt' as const;

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
 * Create a chat session. Laravel adds user_id from auth, forwards to Python.
 * POST /api/ai-agent/sessions
 * Payload: { agent, name } — matches Laravel controller validation
 */
/** Default session name for DPR: DPR-YYYY-MM-DD */
export function getDefaultDprSessionName(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `DPR-${y}-${m}-${d}`;
}

export async function createSession(
  name?: string,
  agent: string = AGENT_DOC_MGMT
): Promise<CreateSessionResponse> {
  const payload =
    agent === 'inventory_agent'
      ? { agent: 'inventory_agent', name: name ?? 'Inventory Chat' }
      : agent === 'dpr_inventory'
        ? { agent: 'dpr_inventory', name: name ?? getDefaultDprSessionName() }
        : agent === 'doc_mgmt'
          ? { agent: 'doc_mgmt', name: name ?? 'Document Chat' }
          : {
              agent,
              name: name ?? `DMS Chat - ${new Date().toLocaleDateString()}`,
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
  const { data } = await apiClient.get<AiSession>(`/ai-agent/sessions/${encodeURIComponent(sessionId)}`);
  return data;
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
 * Resolve session ID from create response. Python/Laravel may return id, session_id, or nested data.
 */
export function getSessionIdFromResponse(response: CreateSessionResponse | unknown): string {
  if (!response || typeof response !== 'object') return '';
  const r = response as Record<string, unknown>;
  const direct = r.session_id ?? r.id;
  if (direct != null) return String(direct);
  const nested = r.data as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    const n = nested.session_id ?? nested.id;
    if (n != null) return String(n);
  }
  return '';
}