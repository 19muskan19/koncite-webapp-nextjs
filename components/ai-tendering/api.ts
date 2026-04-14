import type { OutputFilesResponse, TenderAnalysisResponse } from './types';

export function getTenderApiBase(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AI_TENDER_API) {
    return process.env.NEXT_PUBLIC_AI_TENDER_API.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8000';
}

export async function postProcessTender(fd: FormData): Promise<TenderAnalysisResponse> {
  const base = getTenderApiBase();
  const resp = await fetch(`${base}/api/process`, { method: 'POST', body: fd });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    const detail = (err as { detail?: string }).detail ?? resp.statusText;
    throw new Error(typeof detail === 'string' ? detail : resp.statusText);
  }
  return resp.json() as Promise<TenderAnalysisResponse>;
}

export async function fetchOutputFiles(): Promise<OutputFilesResponse> {
  const base = getTenderApiBase();
  const resp = await fetch(`${base}/api/output-files`);
  if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  return resp.json() as Promise<OutputFilesResponse>;
}

export function serveOutputUrl(filename: string): string {
  return `${getTenderApiBase()}/api/serve-output/${encodeURIComponent(filename)}`;
}

export function downloadOutputUrl(filename: string): string {
  return `${getTenderApiBase()}/api/download/${encodeURIComponent(filename)}`;
}
