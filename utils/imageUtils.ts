/**
 * Image URL utilities - reduce failed requests and improve performance
 */

/** Invalid logo values that cause 301/404/aborted requests (e.g. staging.koncite.com/logo) */
const INVALID_LOGO_PATTERNS = ['', 'logo', '/logo', '/logo/', 'logo/'];

/**
 * Returns true if the URL looks valid for loading an image.
 * Skips empty, relative paths like "/logo", or obviously invalid values.
 */
export function isValidLogoUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (INVALID_LOGO_PATTERNS.some((p) => lower === p || lower.endsWith(p))) return false;
  // Must look like an image URL (http(s) or data URL or path to image file)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return true;
  // Relative path to storage/file
  if (trimmed.startsWith('/storage/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(trimmed)) return true;
  return false;
}

/**
 * Returns the logo URL to use, or the ui-avatars fallback if invalid.
 * Avoids loading invalid URLs that cause 301/404/aborted requests.
 */
export function getLogoUrl(
  logo: string | null | undefined,
  displayName: string,
  backgroundColor: string = '6366f1'
): string {
  if (isValidLogoUrl(logo)) return logo!;
  const name = (displayName || 'U').trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${backgroundColor}&color=fff&size=128`;
}
