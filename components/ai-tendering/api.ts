import type {
  DsrRatesResponse,
  OutputFilesResponse,
  TenderAnalysisResponse,
  TenderCategoriesResponse,
  TenderChatRequest,
  TenderChatResponse,
  TenderOutputsListResponse,
  TenderStatusResponse,
} from './types';

/**
 * AI Tendering routes live under `{base}/ai-tendering/...` where base ends at `/api`
 * (e.g. `http://staging.koncite.com/api/ai-tendering/status`).
 */
const TENDER_PREFIX = '/ai-tendering';

/** Integrated default; override with `NEXT_PUBLIC_AI_TENDER_API` in `.env.local` if needed. */
const DEFAULT_TENDER_API_BASE = 'http://staging.koncite.com/api';

export function getTenderApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_AI_TENDER_API?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return DEFAULT_TENDER_API_BASE;
}

function tenderUrl(path: string): string {
  const base = getTenderApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${TENDER_PREFIX}${p}`;
}

/** Turn a path or absolute URL from the engine into a fetchable URL for this client. */
export function resolveTenderAssetUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = getTenderApiBase();
  let path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (path.startsWith('/api/ai-tendering')) {
    path = path.slice('/api'.length);
  } else if (path.startsWith('/api/tender')) {
    path = '/ai-tendering' + path.slice('/api/tender'.length);
  }
  return `${base}${path}`;
}

async function parseBodyError(resp: Response): Promise<string> {
  const err = await resp.json().catch(() => ({ detail: resp.statusText }));
  const d = err as { detail?: unknown };
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail)) {
    const msg = (d.detail as Array<{ msg?: string }>).map((e) => e.msg).filter(Boolean);
    if (msg.length) return msg.join('; ');
  }
  return resp.statusText;
}

/** GET `{base}/ai-tendering/status` — engine, DSR, Azure readiness */
export async function fetchTenderStatus(): Promise<TenderStatusResponse> {
  const resp = await fetch(tenderUrl('/status'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderStatusResponse>;
}

/** POST `{base}/ai-tendering/process` — main pipeline */
export async function postProcessTender(fd: FormData): Promise<TenderAnalysisResponse> {
  const resp = await fetch(tenderUrl('/process'), { method: 'POST', body: fd });
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderAnalysisResponse>;
}

/** GET `{base}/ai-tendering/download/{filename}` */
export function downloadOutputUrl(filename: string): string {
  return tenderUrl(`/download/${encodeURIComponent(filename)}`);
}

/** GET `{base}/ai-tendering/serve-output/{filename}` */
export function serveOutputUrl(filename: string): string {
  return tenderUrl(`/serve-output/${encodeURIComponent(filename)}`);
}

/** GET `{base}/ai-tendering/outputs` — recent output files (~20) */
export async function fetchTenderOutputs(): Promise<TenderOutputsListResponse> {
  const resp = await fetch(tenderUrl('/outputs'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<TenderOutputsListResponse>;
}

/** GET `{base}/ai-tendering/output-files` — detailed listing (~30) */
export async function fetchOutputFiles(): Promise<OutputFilesResponse> {
  const resp = await fetch(tenderUrl('/output-files'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<OutputFilesResponse>;
}

/** POST `{base}/ai-tendering/chat` */
export async function postTenderChat(body: TenderChatRequest): Promise<TenderChatResponse> {
  const resp = await fetch(tenderUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderChatResponse>;
}

/** GET `{base}/ai-tendering/dsr-rates` */
export async function fetchDsrRates(query: string, topK = 10): Promise<DsrRatesResponse> {
  const q = new URLSearchParams();
  if (query.trim()) q.set('query', query.trim());
  q.set('top_k', String(Math.min(200, Math.max(1, topK))));
  const resp = await fetch(`${tenderUrl('/dsr-rates')}?${q}`);
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<DsrRatesResponse>;
}

/** GET `{base}/ai-tendering/categories` */
export async function fetchTenderCategories(): Promise<TenderCategoriesResponse> {
  const resp = await fetch(tenderUrl('/categories'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderCategoriesResponse>;
}
