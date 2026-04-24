/**
 * AI Agent Service for AI Hub (DPR, Inventory)
 *
 * Uses /api/ai-agent/* endpoints with agent parameter.
 * Agent sent in request payload based on dropdown selection:
 * - DPR -> agent: 'dpr_inventory'
 * - Inventory -> agent: 'inventory_agent'
 *
 * Override via env: NEXT_PUBLIC_AI_AGENT_DPR, NEXT_PUBLIC_AI_AGENT_INVENTORY
 */

import apiClient from './apiClient';

export type AiAgentType = string;

const WORKSPACE_TO_AGENT: Record<string, AiAgentType> = {
  DPR: process.env.NEXT_PUBLIC_AI_AGENT_DPR ?? 'dpr_inventory',
  Inventory: process.env.NEXT_PUBLIC_AI_AGENT_INVENTORY ?? 'inventory_agent',
};

export function getAgentForWorkspace(workspace: string): AiAgentType {
  return WORKSPACE_TO_AGENT[workspace] ?? WORKSPACE_TO_AGENT['DPR'] ?? 'dpr_inventory';
}

export interface AiSession {
  id: string;
  session_id?: string;
  name?: string;
  agent?: string;
  created_at?: string;
  messages?: Array<{ role: string; content: string }>;
  [key: string]: unknown;
}

export interface ChatResponse {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
  text?: string;
  output?: string;
  data?: { reply?: string; response?: string; message?: string; content?: string };
  [key: string]: unknown;
}

/**
 * Extract AI reply text from various backend response shapes.
 * Handles: reply, response, message, content, text, output, answer, result, and nested data.*
 */
export function extractReplyFromResponse(response: ChatResponse | unknown): string {
  if (!response || typeof response !== 'object') return '';
  const r = response as Record<string, unknown>;

  const check = (v: unknown): string => {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).reply === 'string') {
      return ((v as Record<string, unknown>).reply as string).trim();
    }
    return '';
  };

  const candidates = [
    r.reply,
    r.response,
    r.message,
    r.content,
    r.text,
    r.output,
    r.answer,
    r.result,
  ];

  for (const c of candidates) {
    const out = check(c);
    if (out) return out;
  }

  const nested = r.data as Record<string, unknown> | string | undefined;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  if (nested && typeof nested === 'object') {
    for (const k of ['reply', 'response', 'message', 'content', 'text', 'output']) {
      const out = check((nested as Record<string, unknown>)[k]);
      if (out) return out;
    }
  }

  return '';
}

export { getSessionIdFromResponse } from './dmsAiService';

export async function createAgentSession(
  agent: AiAgentType,
  name?: string
): Promise<AiSession> {
  const trimmed = (name ?? '').trim();
  const nameFields = trimmed ? { name: trimmed } : {};
  const payload =
    agent === 'inventory_agent'
      ? { agent: 'inventory_agent', ...nameFields }
      : { agent, ...nameFields };
  const { data } = await apiClient.post<AiSession>('/ai-agent/sessions', payload);
  return data;
}

export async function listAgentSessions(agent?: AiAgentType): Promise<AiSession[]> {
  const params = agent ? { agent } : {};
  const { data } = await apiClient.get<AiSession[] | { data?: AiSession[]; sessions?: AiSession[] }>(
    '/ai-agent/sessions',
    { params }
  );
  if (Array.isArray(data)) return data;
  const wrapped = data as { data?: AiSession[]; sessions?: AiSession[] };
  const list = wrapped?.data ?? wrapped?.sessions ?? [];
  return Array.isArray(list) ? list : [];
}

export async function getAgentSession(sessionId: string): Promise<AiSession> {
  const { data } = await apiClient.get<AiSession>(
    `/ai-agent/sessions/${encodeURIComponent(sessionId)}`
  );
  return data;
}

export async function sendAgentMessage(
  sessionId: string,
  message: string,
  agent: AiAgentType,
  options?: { files?: File[] }
): Promise<ChatResponse> {
  const hasFiles = options?.files && options.files.length > 0;
  const timeout = 60000; // 60s for AI responses

  if (hasFiles) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('message', message || 'Files attached.');
    formData.append('agent', agent);
    for (const file of options!.files!) {
      formData.append('files[]', file);
    }
    const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout,
    });
    if (process.env.NODE_ENV === 'development' && !extractReplyFromResponse(data)) {
      console.warn('[aiAgentService] Empty reply from API. Raw response:', data);
    }
    return data;
  }

  const { data } = await apiClient.post<ChatResponse>('/ai-agent/chat', {
    session_id: sessionId,
    message: message || 'Files attached.',
    agent,
    project_id: null,
  }, { timeout });
  if (process.env.NODE_ENV === 'development' && !extractReplyFromResponse(data)) {
    console.warn('[aiAgentService] Empty reply from API. Raw response:', data);
  }
  return data;
}
