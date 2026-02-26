/**
 * DMS AI Assistant API Service (Next.js)
 *
 * Mirrors MVC Laravel DMS AI flow:
 * 1. Context: GET /api/documents/ai/context (optional, when opening chat)
 * 2. Session: POST /api/ai-agent/sessions (create), GET list, GET one, PUT rename
 * 3. Chat: POST /api/ai-agent/chat (message only = JSON; message + files/recording = FormData)
 *
 * All requests use Bearer token via apiClient. Agent for DMS is always `doc_mgmt`.
 */

import apiClient from './apiClient';

const DMS_AGENT = 'doc_mgmt' as const;

// --- Response types (match Laravel / Python) ---

export interface GetChatContextResponse {
  success: boolean;
  message: string;
}

export interface AiSession {
  id: string;
  session_id?: string;
  name?: string;
  agent?: string;
  [key: string]: unknown;
}

export interface CreateSessionResponse extends AiSession {}

export interface ChatResponse {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
  [key: string]: unknown;
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
 * Step 2a: Create a DMS chat session.
 * MVC: POST /company/ai-agent/api/sessions { agent: 'doc_mgmt', name }
 * Next.js: POST /api/ai-agent/sessions
 */
export async function createSession(name?: string): Promise<CreateSessionResponse> {
  const { data } = await apiClient.post<CreateSessionResponse>('/ai-agent/sessions', {
    agent: DMS_AGENT,
    name: name ?? `DMS Chat - ${new Date().toLocaleDateString()}`,
  });
  return data;
}

/**
 * Step 2b: List sessions.
 * GET /api/ai-agent/sessions
 */
export async function listSessions(): Promise<AiSession[]> {
  const { data } = await apiClient.get<AiSession[]>('/ai-agent/sessions');
  return Array.isArray(data) ? data : [];
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
 * Step 3: Send message (and optionally files / voice recording).
 * - Message only: JSON body (session_id, message, agent, project_id).
 * - Message + files: FormData with session_id, message, agent, project_id, files[].
 * MVC: POST /company/ai-agent/api/chat (same)
 * Next.js: POST /api/ai-agent/chat
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  options?: { projectId?: string | number; files?: File[] }
): Promise<ChatResponse> {
  const hasFiles = options?.files && options.files.length > 0;

  if (hasFiles) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('message', message);
    formData.append('agent', DMS_AGENT);
    if (options?.projectId != null) {
      formData.append('project_id', String(options.projectId));
    }
    for (const file of options!.files!) {
      formData.append('files[]', file);
    }
    const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', {
    session_id: sessionId,
    message,
    agent: DMS_AGENT,
    project_id: options?.projectId != null ? String(options.projectId) : null,
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
 * Helper: resolve session id from create response (Laravel/Python can return id or session_id).
 */
export function getSessionIdFromResponse(response: CreateSessionResponse): string {
  return (response.session_id ?? response.id ?? '') as string;
}