/**
 * Server-only: Azure OpenAI chat completions for session title + summary.
 *
 * Aligns with Azure Python SDK:
 *   AzureOpenAI(api_version=..., azure_endpoint=..., api_key=...)
 *   client.chat.completions.create(model=deployment, temperature=1.0, top_p=1.0, ...)
 *
 * Env (copy from .env.example; use .env.local for secrets — never commit keys):
 *   AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION
 *   AZURE_OPENAI_TEMPERATURE, AZURE_OPENAI_TOP_P, AZURE_OPENAI_FREQUENCY_PENALTY,
 *   AZURE_OPENAI_PRESENCE_PENALTY, AZURE_OPENAI_MAX_COMPLETION_TOKENS
 */
import 'server-only';

import { AzureOpenAI } from 'openai';

export type SessionMetaChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SessionMetaResult = {
  title: string;
  summary: string;
};

export const SESSION_META_MESSAGE_WINDOW = 18;

/** Defaults match Python sample: temperature/top_p 1, penalties 0, max_completion_tokens 13107 */
const DEFAULT_API_VERSION = '2024-12-01-preview';
const DEFAULT_DEPLOYMENT = 'gpt-4.1';
const DEFAULT_TEMPERATURE = 1;
const DEFAULT_TOP_P = 1;
const DEFAULT_FREQUENCY_PENALTY = 0;
const DEFAULT_PRESENCE_PENALTY = 0;
const DEFAULT_MAX_COMPLETION_TOKENS = 13107;

function parseNumEnv(key: string, fallback: number): number {
  const v = process.env[key]?.trim();
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getSessionMetaCompletionParams(): {
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_completion_tokens: number;
} {
  return {
    temperature: parseNumEnv('AZURE_OPENAI_TEMPERATURE', DEFAULT_TEMPERATURE),
    top_p: parseNumEnv('AZURE_OPENAI_TOP_P', DEFAULT_TOP_P),
    frequency_penalty: parseNumEnv('AZURE_OPENAI_FREQUENCY_PENALTY', DEFAULT_FREQUENCY_PENALTY),
    presence_penalty: parseNumEnv('AZURE_OPENAI_PRESENCE_PENALTY', DEFAULT_PRESENCE_PENALTY),
    max_completion_tokens: Math.floor(parseNumEnv('AZURE_OPENAI_MAX_COMPLETION_TOKENS', DEFAULT_MAX_COMPLETION_TOKENS)),
  };
}

const GENERIC_TITLE_RE =
  /^(chat|conversation|new chat|assistant chat|ai chat|help|discussion|session|untitled|general)$/i;

/** Single-word greetings / fillers — never use as session titles. */
const TRIVIAL_TITLE_RE =
  /^(hi|hello|hey|ok|okay|yes|no|thanks?|thank you|yo|sup|please|here|sir|madam)\.?$/i;

function isBadTitleCandidate(t: string): boolean {
  const s = t.trim();
  if (s.length < 3) return true;
  if (GENERIC_TITLE_RE.test(s)) return true;
  if (TRIVIAL_TITLE_RE.test(s)) return true;
  if (!/[a-zA-Z\u00C0-\u024F]{2,}/.test(s)) return true;
  return false;
}

function cleanSnippet(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Derive a title from assistant replies (DPR / agents often restate intent: "You want to add Activity - RCC 3").
 * Prefer this over echoing the user's last short message.
 */
function extractTitleFromAssistantThread(messages: SessionMetaChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant' || !m.content) continue;
    const c = m.content.replace(/\s+/g, ' ');

    const patterns: RegExp[] = [
      /you want to add\s+([^.\n!]+?)(?=\.|Here|Below|Here are|\n|$)/i,
      /(?:Got it|Understood)[^.]*?add\s+([^.!\n]{3,120})/i,
      /working on\s*\*\*([^*]+)\*\*/i,
      /Great\s+[^.]*?\*\*([^*]+)\*\*/i,
      /(?:selected|you chose)\s+\*\*([^*]+)\*\*/i,
    ];
    for (const re of patterns) {
      const x = re.exec(c);
      if (x?.[1]) {
        const t = cleanSnippet(x[1]);
        if (t.length >= 3 && !/^(which|here|below|select)/i.test(t)) {
          return t;
        }
      }
    }

    const activityLine = /(Activity\s*[-–—]\s*[^.\n!]+)/i.exec(c);
    if (activityLine?.[1]) {
      const t = cleanSnippet(activityLine[1]);
      if (t.length >= 5) return t;
    }
  }
  return null;
}

function isSubstantiveUserLine(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 2) return false;
  if (TRIVIAL_TITLE_RE.test(t)) return false;
  if (/^(y|n|ok|k|👍|✅)$/i.test(t)) return false;
  return true;
}

/** Prefer longest substantive user line (usually more specific than a one-word last reply). */
function bestUserLineForTitle(messages: SessionMetaChatMessage[]): string | null {
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content.replace(/\s+/g, ' ').trim());
  const sub = users.filter(isSubstantiveUserLine);
  if (sub.length === 0) return null;
  const sorted = [...sub].sort((a, b) => b.length - a.length);
  return sorted[0];
}

function bestTitleFromMessages(messages: SessionMetaChatMessage[]): string {
  const fromAssistant = extractTitleFromAssistantThread(messages);
  if (fromAssistant) {
    return clampTitleWords(fromAssistant);
  }
  const fromUser = bestUserLineForTitle(messages);
  if (fromUser) {
    return clampTitleWords(fromUser);
  }
  return '';
}

/** Model or user echoed only the latest user line — replace with thread-based title. */
function titleEchoesLastUserOnly(title: string, messages: SessionMetaChatMessage[]): boolean {
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content.replace(/\s+/g, ' ').trim());
  if (users.length < 2) return false;
  const last = users[users.length - 1];
  if (!last || last.length < 2) return false;
  return title.trim().toLowerCase() === last.toLowerCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let loggedMissingAzureEnv = false;

/** Strip `/openai/...` so both resource URLs and old full deployment URLs work. */
function normalizeResourceEndpoint(raw: string): string {
  const t = raw.trim().replace(/\/+$/, '');
  const idx = t.toLowerCase().indexOf('/openai');
  if (idx > 0) return t.slice(0, idx);
  return t;
}

function getAzureClient(): AzureOpenAI | null {
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!apiKey || !rawEndpoint) {
    if (!loggedMissingAzureEnv) {
      loggedMissingAzureEnv = true;
      console.warn(
        '[sessionMeta] Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT (resource URL, e.g. https://….cognitiveservices.azure.com) in .env.local, then restart `next dev`. ' +
          'Until then, titles use fallbacks.'
      );
    }
    return null;
  }
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || DEFAULT_API_VERSION;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || DEFAULT_DEPLOYMENT;
  const endpoint = normalizeResourceEndpoint(rawEndpoint);
  try {
    return new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment,
    });
  } catch (e) {
    console.error('[sessionMeta] AzureOpenAI client init failed:', e);
    return null;
  }
}

function sliceMessagesForModel(messages: SessionMetaChatMessage[]): SessionMetaChatMessage[] {
  const usable = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 12000),
    }));
  return usable.slice(-SESSION_META_MESSAGE_WINDOW);
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m;
  const fenced = t.match(fence);
  const jsonStr = fenced ? fenced[1].trim() : t;
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* substring parse below */
  }
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const parsed = JSON.parse(jsonStr.slice(start, end + 1)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  }
  throw new Error('No JSON object in model output');
}

function clampTitleWords(title: string, maxWords = 6): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function normalizeTitle(raw: string, messages: SessionMetaChatMessage[]): string {
  let t = clampTitleWords(String(raw || '').trim());
  if (isBadTitleCandidate(t)) {
    t = bestTitleFromMessages(messages);
  } else if (titleEchoesLastUserOnly(t, messages)) {
    const alt = bestTitleFromMessages(messages);
    if (!isBadTitleCandidate(alt) && alt.toLowerCase() !== t.toLowerCase()) {
      t = alt;
    }
  }
  if (isBadTitleCandidate(t)) {
    t = '';
  }
  return t.slice(0, 120);
}

function normalizeSummary(raw: string): string {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return '';
  const lines = s
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(0, 2).join(' ').slice(0, 500);
}

function parseModelJson(content: string, messages: SessionMetaChatMessage[]): SessionMetaResult {
  const obj = extractJsonObject(content);
  const titleRaw = typeof obj.title === 'string' ? obj.title : '';
  const summaryRaw = typeof obj.summary === 'string' ? obj.summary : '';
  return {
    title: normalizeTitle(titleRaw, messages),
    summary: normalizeSummary(summaryRaw),
  };
}

const SYSTEM_PROMPT = `You generate short metadata for an ongoing chat session.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{"title":"string","summary":"string"}

Rules:
- "title": at most 6 words. Summarize the overall task from the WHOLE thread (project, DPR, activity, inventory topic).
- NEVER set "title" to the user's last message alone or a raw echo of their latest line. Synthesize a short label (e.g. "Lakeshire DPR", "RCC Activity Setup").
- Never use bare greetings ("Hi", "Hello", "OK") or generic labels ("Chat", "Assistant", "New Chat").
- Use assistant-stated facts when present (e.g. if the assistant confirmed "Activity - RCC 3", the title can reflect that task in concise form).
- "summary": 1-2 lines describing progress and intent across the conversation, not only the last turn.
- Base both fields on the entire message list.`;

async function callChatOnce(
  client: AzureOpenAI,
  deploymentModel: string,
  apiMessages: SessionMetaChatMessage[]
): Promise<string> {
  const p = getSessionMetaCompletionParams();
  const response = await client.chat.completions.create({
    model: deploymentModel,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...apiMessages],
    temperature: p.temperature,
    top_p: p.top_p,
    frequency_penalty: p.frequency_penalty,
    presence_penalty: p.presence_penalty,
    max_completion_tokens: p.max_completion_tokens,
  });
  return response.choices[0]?.message?.content ?? '';
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  return false;
}

export async function generateSessionMeta(messages: SessionMetaChatMessage[]): Promise<SessionMetaResult> {
  const sliced = sliceMessagesForModel(messages);
  if (sliced.length === 0) {
    return { title: '', summary: '' };
  }

  const client = getAzureClient();
  if (!client) {
    return { title: bestTitleFromMessages(sliced), summary: '' };
  }

  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || DEFAULT_DEPLOYMENT;
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = await callChatOnce(client, deploymentName, sliced);
      if (!content?.trim()) {
        throw new Error('Empty completion');
      }
      try {
        return parseModelJson(content, sliced);
      } catch (parseErr) {
        console.warn('[sessionMeta] JSON parse failed, using fallback:', parseErr);
        return {
          title: normalizeTitle('', sliced),
          summary: normalizeSummary(content),
        };
      }
    } catch (err) {
      lastError = err;
      console.error('[sessionMeta] Attempt ' + attempt + '/' + maxAttempts + ' failed:', err);
      if (attempt < maxAttempts && isRetryable(err)) {
        await sleep(400 * attempt * attempt);
        continue;
      }
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
    }
  }

  console.error('[sessionMeta] All attempts failed:', lastError);
  return {
    title: normalizeTitle('', sliced),
    summary: '',
  };
}
