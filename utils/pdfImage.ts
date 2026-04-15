import { getSameOriginAssetPathForPdf } from './imageUtils';

export type PdfImagePayload = {
  dataUrl: string;
  format: 'JPEG' | 'PNG';
  widthPx: number;
  heightPx: number;
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(blob);
  });
}

function measureImage(dataUrl: string): Promise<{ widthPx: number; heightPx: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        widthPx: img.naturalWidth,
        heightPx: img.naturalHeight,
      });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function rasterToJpegPayloadFromDataUrl(dataUrl: string): Promise<PdfImagePayload | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxPx = 360;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih) {
          resolve(null);
          return;
        }
        const scale = Math.min(1, maxPx / Math.max(iw, ih));
        const w = Math.max(1, Math.round(iw * scale));
        const h = Math.max(1, Math.round(ih * scale));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          dataUrl: c.toDataURL('image/jpeg', 0.88),
          format: 'JPEG',
          widthPx: w,
          heightPx: h,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function rasterizeAbsoluteUrlToJpeg(absUrl: string): Promise<PdfImagePayload | null> {
  return rasterToJpegPayloadFromDataUrl(absUrl);
}

/** Prefer fetching via Next `/logo/*` rewrite (same origin) so bytes are readable for jsPDF. */
function toSameOriginFetchUrl(pathOrUrl: string): string {
  if (typeof window === 'undefined') return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${window.location.origin}${pathOrUrl}`;
  try {
    const u = new URL(pathOrUrl);
    if (u.pathname.startsWith('/logo/') || u.pathname.startsWith('/storage/')) {
      return `${window.location.origin}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* ignore */
  }
  return pathOrUrl;
}

/**
 * Load company logo bytes into a format jsPDF can embed. Uses same-origin `/logo/...` + `fetch`
 * so images are not blocked by canvas CORS (tainted canvas).
 */
export async function loadCompanyLogoRasterForPdf(
  logo: string | Record<string, unknown> | null | undefined
): Promise<PdfImagePayload | null> {
  const pathOrUrl = getSameOriginAssetPathForPdf(logo);
  if (!pathOrUrl || typeof window === 'undefined') return null;

  const fetchUrl = toSameOriginFetchUrl(pathOrUrl);

  const tryFetchAsPayload = async (url: string): Promise<PdfImagePayload | null> => {
    try {
      const res = await fetch(url, { credentials: 'include', mode: 'cors', cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = (blob.type || '').toLowerCase();
      const dataUrl = await blobToDataUrl(blob);
      const dims = await measureImage(dataUrl);
      if (!dims) return null;
      if (type.includes('png')) {
        return { dataUrl, format: 'PNG', widthPx: dims.widthPx, heightPx: dims.heightPx };
      }
      if (type.includes('jpeg') || type.includes('jpg')) {
        return { dataUrl, format: 'JPEG', widthPx: dims.widthPx, heightPx: dims.heightPx };
      }
      if (type.includes('webp') || type.includes('gif') || !type) {
        return rasterToJpegPayloadFromDataUrl(dataUrl);
      }
      return rasterToJpegPayloadFromDataUrl(dataUrl);
    } catch {
      return null;
    }
  };

  let out = await tryFetchAsPayload(fetchUrl);
  if (out) return out;

  if (pathOrUrl.startsWith('/')) {
    out = await tryFetchAsPayload(`${window.location.origin}${pathOrUrl}`);
    if (out) return out;
    return rasterizeAbsoluteUrlToJpeg(`${window.location.origin}${pathOrUrl}`);
  }

  return null;
}
