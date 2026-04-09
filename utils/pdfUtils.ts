/**
 * PDF View and Share utilities for success screens.
 * Matches spec: View opens URL in default handler; Share fetches PDF, converts to file, shares via native sheet.
 */

export function getFullPdfUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
  const base = apiBase.replace(/\/api\/?$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

export function openPdfInNewTab(url: string): void {
  const fullUrl = getFullPdfUrl(url) || url;
  if (fullUrl) window.open(fullUrl, '_blank', 'noopener,noreferrer');
}

/** Copy PDF URL to clipboard. User can paste in browser to open the PDF. */
export async function copyPdfUrl(url: string): Promise<boolean> {
  const fullUrl = getFullPdfUrl(url) || url;
  if (!fullUrl) return false;
  try {
    await navigator.clipboard.writeText(fullUrl);
    return true;
  } catch {
    return false;
  }
}

export interface SharePdfOptions {
  url: string;
  name?: string;
  reportTitle?: string;
  getAuthToken?: () => string | null;
  onSuccess?: () => void;
  onCopyFallback?: () => void;
  onError?: (message: string) => void;
}

export async function sharePdfAsFile(options: SharePdfOptions): Promise<void> {
  const {
    url,
    name = 'Report.pdf',
    reportTitle = 'Report',
    getAuthToken,
    onSuccess,
    onCopyFallback,
    onError,
  } = options;

  const fullUrl = getFullPdfUrl(url) || url;
  if (!fullUrl) {
    onError?.('No PDF URL available.');
    return;
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    const token = getAuthToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(fullUrl, { credentials: 'include', headers });
    if (!res.ok) throw new Error('Failed to fetch PDF');
    const blob = await res.blob();
    const file = new File([blob], name, { type: 'application/pdf' });

    const canShareFiles =
      'share' in navigator &&
      ('canShare' in navigator ? navigator.canShare({ files: [file] }) : true);

    if (canShareFiles) {
      await navigator.share({
        files: [file],
        title: name,
        text: reportTitle,
      });
      onSuccess?.();
    } else {
      await navigator.clipboard.writeText(fullUrl);
      onCopyFallback?.();
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      onCopyFallback?.();
    } catch {
      onError?.('Could not share. Open PDF in new tab and use browser Share.');
    }
  }
}
