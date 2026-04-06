/**
 * Image URL utilities - reduce failed requests and improve performance
 */

/**
 * Returns true if the URL looks valid for loading an image.
 * Skips empty, relative paths like "/logo", or obviously invalid values.
 * Note: Never use '' in patterns — String.prototype.endsWith('') is always true.
 * Avoid rejecting URLs that merely contain or end with the substring "logo" (e.g. …/brand/logo.png).
 */
export function isValidLogoUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  // Reject bare "/logo" path with no file — these 404
  if (lower.endsWith('/logo') || lower === 'https://koncite.com/logo' || lower === 'http://koncite.com/logo') return false;
  if (lower === 'logo' || lower === '/logo' || lower === '/logo/' || lower === 'logo/') return false;
  // Must look like an image URL (http(s) or data URL or path to image file)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return true;
  // Relative path to storage/file
  if (trimmed.startsWith('/storage/') || trimmed.startsWith('/logo/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(trimmed)) return true;
  return false;
}

/**
 * Resolves relative logo paths to full URLs.
 * Handles: logo/xxx.jpg, storage/logo/xxx.jpg, bare filenames (xxx.jpg), protocol-relative (//...).
 */
function resolveLogoPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backoffice.koncite.com/api';
  const base = String(apiBase).replace(/\/api\/?$/, '');
  // Bare filename (e.g. 177433419227.jpg) -> assume logo folder per getImgUpload($file, 'logo')
  let pathPart = trimmed.startsWith('/') ? trimmed : trimmed.includes('/') ? `/${trimmed}` : `/logo/${trimmed}`;
  return `${base}${pathPart}`;
}

/**
 * Convert backend logo URL for display.
 * Prefer full backend URL (img loads cross-origin fine with referrerPolicy="no-referrer").
 * Same-origin path /logo/xxx can be used when Next.js rewrite works.
 */
function toSameOriginLogoUrl(url: string): string {
  try {
    // Return full URL directly - img cross-origin works with referrerPolicy="no-referrer"
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backoffice.koncite.com/api';
    const origin = String(apiBase).replace(/\/api\/?$/, '');
    // If URL is from our backend origin, use same-origin path (proxied via rewrites)
    if (url.startsWith(origin)) {
      const path = url.slice(origin.length);
      return path.startsWith('/') ? path : `/${path}`;
    }
    // Fallback: extract /logo/ or /storage/ path from any backend URL
    const logoMatch = url.match(/\/(logo\/[^\s?#]+)/i);
    if (logoMatch) return logoMatch[1].startsWith('/') ? logoMatch[1] : `/${logoMatch[1]}`;
    const storageMatch = url.match(/\/(storage\/[^\s?#]+)/i);
    if (storageMatch) return storageMatch[1].startsWith('/') ? storageMatch[1] : `/${storageMatch[1]}`;
  } catch (_) { /* ignore */ }
  return url;
}

/**
 * Returns the logo URL to use, or the ui-avatars fallback if invalid.
 * Handles: full URLs, relative paths (logo/xxx.jpg), and non-string values (objects) from API.
 * Prefers same-origin /logo/ path when URL is from backend to avoid CORS.
 */
export function getLogoUrl(
  logo: string | null | undefined,
  displayName: string,
  backgroundColor: string = '6366f1'
): string {
  // API may return logo as object (e.g. {}), ensure we have a string
  const logoStr = logo != null && typeof logo === 'string' ? logo.trim() : '';
  if (!logoStr) {
    const name = (displayName || 'U').trim() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${backgroundColor}&color=fff&size=128`;
  }
  // Use full logo URL directly when API returns it (e.g. https://koncite.com/logo/177433419227.jpg)
  if (logoStr.startsWith('https://') || logoStr.startsWith('http://')) {
    if (isValidLogoUrl(logoStr)) return logoStr;
  }
  // Resolve relative paths and bare filenames to full URL
  const resolved = resolveLogoPath(logoStr);
  if (!isValidLogoUrl(resolved)) {
    const name = (displayName || 'U').trim() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${backgroundColor}&color=fff&size=128`;
  }
  return toSameOriginLogoUrl(resolved);
}

/** Synthetic “initials as image” URLs — not an uploaded company logo. */
function isSyntheticAvatarLogoUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return lower.includes('ui-avatars.com/') || lower.includes('dicebear.com/');
}

/**
 * Extract logo URL string from companies-list / company API objects.
 * (Declared before `getCompanyLogoImageSrc` so it can coerce API objects.)
 */
export function extractCompanyLogoFromApi(company: Record<string, unknown> | null | undefined): string {
  if (!company || typeof company !== 'object') return '';
  const asStr = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    return null;
  };
  for (const key of ['logo', 'logo_url', 'company_logo', 'image', 'profile_images'] as const) {
    const s = asStr(company[key]);
    if (s) return s;
  }
  const lo = company.logo;
  if (lo && typeof lo === 'object' && lo !== null && 'url' in lo) {
    const u = (lo as { url?: unknown }).url;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return '';
}

/**
 * URL for `<img src>` when the company has a real logo file/URL.
 * Returns `null` when the UI should show text initials instead (no logo, invalid path, or placeholder avatar URL).
 */
export function getCompanyLogoImageSrc(logo: string | Record<string, unknown> | null | undefined): string | null {
  const logoStr =
    typeof logo === 'string'
      ? logo.trim()
      : logo && typeof logo === 'object'
        ? extractCompanyLogoFromApi(logo)
        : '';
  if (!logoStr) return null;
  if (isSyntheticAvatarLogoUrl(logoStr)) return null;

  if (logoStr.startsWith('https://') || logoStr.startsWith('http://')) {
    if (isValidLogoUrl(logoStr)) return logoStr;
    return null;
  }
  const resolved = resolveLogoPath(logoStr);
  if (!isValidLogoUrl(resolved)) return null;
  return toSameOriginLogoUrl(resolved);
}

/**
 * Convert storage URL to same-origin path when possible.
 * Uses Next.js rewrite /storage/:path* so images load from same origin (avoids CORS).
 */
function toSameOriginStorageUrl(url: string): string {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backoffice.koncite.com/api';
    const origin = String(apiBase).replace(/\/api\/?$/, '');
    if (url.startsWith(origin + '/storage/') || url.startsWith(origin + '/storage')) {
      const path = url.slice(origin.length);
      return path.startsWith('/') ? path : `/${path}`;
    }
  } catch (_) { /* ignore */ }
  return url;
}

/**
 * Resolve user profile image URL. Backend may return filename (e.g. 177307577119.jpg) or full URL.
 * Returns full storage URL or ui-avatars fallback. Prefers same-origin path to avoid CORS.
 */
export function getProfileImageUrl(value: string | null | undefined, fallbackName: string): string {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || '')}&background=C2D642&color=fff&size=128`;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return toSameOriginStorageUrl(trimmed);
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backoffice.koncite.com/api';
  const storageBase = String(apiBase).replace(/\/api\/?$/, '');
  const path = trimmed.startsWith('storage/') ? trimmed : trimmed.includes('/') ? `storage/${trimmed}` : `storage/profile_image/${trimmed}`;
  const fullUrl = path.startsWith('/') ? `${storageBase}${path}` : `${storageBase}/${path}`;
  return toSameOriginStorageUrl(fullUrl);
}

/**
 * Uploaded profile photo URL for `<img src>`, or `null` if none (no ui-avatars fallback).
 * Use in the sidebar after company logo: shows signup/profile image when company has no logo file.
 */
export function getProfilePhotoImageSrc(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (isSyntheticAvatarLogoUrl(trimmed)) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (!isValidLogoUrl(trimmed)) return null;
    return toSameOriginStorageUrl(trimmed);
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backoffice.koncite.com/api';
  const storageBase = String(apiBase).replace(/\/api\/?$/, '');
  const path = trimmed.startsWith('storage/')
    ? trimmed
    : trimmed.includes('/')
      ? `storage/${trimmed}`
      : `storage/profile_image/${trimmed}`;
  const fullUrl = path.startsWith('/') ? `${storageBase}${path}` : `${storageBase}/${path}`;
  return toSameOriginStorageUrl(fullUrl);
}

/**
 * ui-avatars URL for initials when company has no logo (or logo failed to load).
 */
export function getInitialsAvatarUrl(displayName: string, backgroundColor: string = '6366f1'): string {
  const name = (displayName || 'U').trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${backgroundColor}&color=fff&size=128`;
}

/**
 * Extract project logo URL from project-list / project API objects (same shape as companies: logo, logo_url, …).
 */
export function extractProjectLogoFromApi(project: Record<string, unknown> | null | undefined): string {
  if (!project || typeof project !== 'object') return '';
  const asStr = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    return null;
  };
  for (const key of ['logo', 'logo_url', 'project_logo', 'image'] as const) {
    const s = asStr(project[key]);
    if (s) return s;
  }
  const lo = project.logo;
  if (lo && typeof lo === 'object' && lo !== null && 'url' in lo) {
    const u = (lo as { url?: unknown }).url;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return '';
}
