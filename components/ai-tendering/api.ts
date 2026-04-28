import type {
  DsrRatesResponse,
  OutputFilesResponse,
  TenderAnalysisResponse,
  TenderCategoriesResponse,
  TenderOutputsListResponse,
  TenderStatusResponse,
} from './types';

/**
 * Python FastAPI: `APIRouter(prefix="/api/tender")`.
 * Canonical examples (single `/` between `api` and `tender`; never `api//tender`):
 *   `{base}/tender/process` → https://staging.koncite.com/api/tender/process
 * Browser uses `/api-proxy/tender/...`; `next.config.js` rewrites to the same `{base}` as below.
 * Intentionally no `/chat` client (`POST /api/tender/chat` unused).
 */
const TENDER_PREFIX = '/tender';

const NEXT_PUBLIC_API_PROXY = '/api-proxy';

/** Same default as `next.config.js` rewrites — staging API root (includes `/api`, no trailing slash). */
const DEFAULT_STAGING_API_ROOT = 'https://staging.koncite.com/api';

/** Join absolute root + pathname without duplicate slashes (`.../api/` + `/tender/...`). */
function joinApiRoot(apiRootTrimmed: string, pathnameStartsWithSlash: string): string {
  const root = apiRootTrimmed.replace(/\/+$/, '');
  const path = pathnameStartsWithSlash.startsWith('/')
    ? pathnameStartsWithSlash
    : `/${pathnameStartsWithSlash}`;
  return `${root}${path}`;
}

/** Must match proxy destination; prefer `NEXT_PUBLIC_API_URL` so SSR and rewrites agree. */
function getRemoteApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_AI_TENDER_API
  )?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return DEFAULT_STAGING_API_ROOT;
}

export function getTenderApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${NEXT_PUBLIC_API_PROXY}`;
  }
  return getRemoteApiBase();
}

function tenderFetchUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const pathFromApiRoot = `${TENDER_PREFIX}${p}`;
  if (typeof window !== 'undefined') {
    return `${NEXT_PUBLIC_API_PROXY}${pathFromApiRoot}`;
  }
  return joinApiRoot(getRemoteApiBase(), pathFromApiRoot);
}

/** Resolve relative paths from process/download responses to proxied URLs. */
export function resolveTenderAssetUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  let path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (path.startsWith('/api/tender')) {
    path = path.slice('/api'.length);
  } else if (path.startsWith('/api/ai-tendering')) {
    path = `${TENDER_PREFIX}${path.slice('/api/ai-tendering'.length)}`;
  }
  if (!path.startsWith(`${TENDER_PREFIX}/`) && path !== TENDER_PREFIX) {
    path = `${TENDER_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  }
  if (typeof window !== 'undefined') {
    return `${NEXT_PUBLIC_API_PROXY}${path}`;
  }
  return joinApiRoot(getRemoteApiBase(), path);
}

async function parseBodyError(resp: Response): Promise<string> {
  const err = await resp.json().catch(() => ({ detail: resp.statusText }));
  const d = err as { detail?: unknown };
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail)) {
    const msgs = (
      d.detail as Array<{ msg?: string } | { loc?: unknown; msg?: string; type?: string }>
    )
      .map((e) => {
        if (e && typeof (e as { msg?: unknown }).msg === 'string') return (e as { msg: string }).msg;
        try {
          return JSON.stringify(e);
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join('; ');
  }
  return resp.statusText;
}

/** GET `/api/tender/status` */
export async function fetchTenderStatus(): Promise<TenderStatusResponse> {
  const resp = await fetch(tenderFetchUrl('/status'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderStatusResponse>;
}

/** POST `/api/tender/process` */
export async function postProcessTender(fd: FormData): Promise<TenderAnalysisResponse> {
  const resp = await fetch(tenderFetchUrl('/process'), { method: 'POST', body: fd });
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderAnalysisResponse>;
}

/** GET `/api/tender/download/{filename}` */
export function downloadOutputUrl(filename: string): string {
  return tenderFetchUrl(`/download/${encodeURIComponent(filename)}`);
}

/** GET `/api/tender/serve-output/{filename}` */
export function serveOutputUrl(filename: string): string {
  return tenderFetchUrl(`/serve-output/${encodeURIComponent(filename)}`);
}

/** GET `/api/tender/outputs` */
export async function fetchTenderOutputs(): Promise<TenderOutputsListResponse> {
  const resp = await fetch(tenderFetchUrl('/outputs'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<TenderOutputsListResponse>;
}

/** GET `/api/tender/output-files` */
export async function fetchOutputFiles(): Promise<OutputFilesResponse> {
  const resp = await fetch(tenderFetchUrl('/output-files'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<OutputFilesResponse>;
}

/** GET `/api/tender/dsr-rates` */
export async function fetchDsrRates(query: string, topK = 10): Promise<DsrRatesResponse> {
  const q = new URLSearchParams();
  if (query.trim()) q.set('query', query.trim());
  q.set('top_k', String(Math.min(200, Math.max(1, topK))));
  const resp = await fetch(`${tenderFetchUrl('/dsr-rates')}?${q}`);
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<DsrRatesResponse>;
}

/** GET `/api/tender/categories` */
export async function fetchTenderCategories(): Promise<TenderCategoriesResponse> {
  const resp = await fetch(tenderFetchUrl('/categories'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderCategoriesResponse>;
}
