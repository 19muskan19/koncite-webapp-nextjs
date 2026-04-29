import type {
  DsrRatesResponse,
  OutputFilesResponse,
  TenderAnalysisResponse,
  TenderCategoriesResponse,
  TenderOutputsListResponse,
  TenderStatusResponse,
} from './types';

const TENDER_PREFIX = '/tender';
const NEXT_PUBLIC_API_PROXY = '/api-proxy';
const DEFAULT_STAGING_API_ROOT = 'https://staging.koncite.com/api';

function joinApiRoot(apiRootTrimmed: string, pathnameStartsWithSlash: string): string {
  const root = apiRootTrimmed.replace(/\/+$/, '');
  const path = pathnameStartsWithSlash.startsWith('/')
    ? pathnameStartsWithSlash
    : `/${pathnameStartsWithSlash}`;
  return `${root}${path}`;
}

function getRemoteApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_AI_TENDER_API
  )?.trim();
  if (!raw) return DEFAULT_STAGING_API_ROOT;
  let b = raw.replace(/\/+$/, '');
  if (!/\/api$/i.test(b)) b = `${b}/api`;
  return b;
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

function directApiProxyPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    return `${NEXT_PUBLIC_API_PROXY}${p}`;
  }
  return joinApiRoot(getRemoteApiBase(), p);
}

/**
 * FastAPI tender router is mounted at `/api/tender/*`. Proxied URLs must include `/tender`
 * (e.g. `/api-proxy/tender/process` → `{api}/tender/process`).
 * Opt out for legacy flat routes (`/api/process`): set NEXT_PUBLIC_TENDER_AUX_PREFIX=flat
 */
function tenderAuxPrefixes(): boolean {
  const raw = String(process.env.NEXT_PUBLIC_TENDER_AUX_PREFIX ?? '').trim().toLowerCase();
  if (raw === 'flat' || raw === '0' || raw === 'false' || raw === 'legacy') return false;
  return true;
}

function statusOrProcessUrl(suffix: string): string {
  return tenderAuxPrefixes() ? tenderFetchUrl(suffix) : directApiProxyPath(suffix);
}

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
  const d = err as { detail?: unknown; error?: unknown; message?: unknown };
  if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
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

export async function fetchTenderStatus(): Promise<TenderStatusResponse> {
  const resp = await fetch(statusOrProcessUrl('/status'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderStatusResponse>;
}

export async function postProcessTender(fd: FormData): Promise<TenderAnalysisResponse> {
  const resp = await fetch(statusOrProcessUrl('/process'), { method: 'POST', body: fd });
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderAnalysisResponse>;
}

export function downloadOutputUrl(filename: string): string {
  const q = `/download/${encodeURIComponent(filename)}`;
  return tenderAuxPrefixes() ? tenderFetchUrl(q) : directApiProxyPath(q);
}

export function serveOutputUrl(filename: string): string {
  return tenderFetchUrl(`/serve-output/${encodeURIComponent(filename)}`);
}

export async function fetchTenderOutputs(): Promise<TenderOutputsListResponse> {
  const resp = await fetch(tenderFetchUrl('/outputs'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<TenderOutputsListResponse>;
}

export async function fetchOutputFiles(): Promise<OutputFilesResponse> {
  const resp = await fetch(tenderFetchUrl('/output-files'));
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<OutputFilesResponse>;
}

export async function fetchDsrRates(query: string, topK = 10): Promise<DsrRatesResponse> {
  const q = new URLSearchParams();
  if (query.trim()) q.set('query', query.trim());
  q.set('top_k', String(Math.min(200, Math.max(1, topK))));
  const resp = await fetch(`${tenderFetchUrl('/dsr-rates')}?${q}`);
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<DsrRatesResponse>;
}

export async function fetchTenderCategories(): Promise<TenderCategoriesResponse> {
  const resp = await fetch(tenderFetchUrl('/categories'));
  if (!resp.ok) throw new Error(await parseBodyError(resp));
  return resp.json() as Promise<TenderCategoriesResponse>;
}
