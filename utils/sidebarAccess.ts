import type { AccessibleMenusData } from '@/contexts/UserContext';

/** Sync permission-tree keys with Laravel `company_permissions.slug` variants seen in APIs. */
const SLUG_SYNONYMS: string[][] = [
  ['operations-daily-work-progress', 'daily-work-progress'],
  ['operations-workforce', 'workforce-management'],
  ['settings', 'settings-root'],
];

function expandSynonyms(set: Set<string>): Set<string> {
  const out = new Set(set);
  for (const pair of SLUG_SYNONYMS) {
    for (const s of pair) {
      if (set.has(s)) {
        pair.forEach((p) => out.add(p));
      }
    }
  }
  return out;
}

/**
 * @returns `null` = show full sidebar (super-admin, wildcard, or no payload yet).
 * Empty set = hide navigable items (except entries handled specially e.g. Logout).
 */
export function buildAllowedMenuSlugSet(data: AccessibleMenusData | null): Set<string> | null {
  if (!data) return null;
  if (data.is_super_admin === true) return null;
  const perms = data.permissions_by_slug;
  if (perms && typeof perms === 'object') {
    const star = perms['*'];
    if (Array.isArray(star) && star.length > 0) return null;
  }

  const set = new Set<string>();
  if (Array.isArray(data.menus_flat)) {
    for (const m of data.menus_flat) {
      if (m && typeof m.slug === 'string' && m.slug.trim()) {
        set.add(m.slug.trim());
      }
    }
  }

  if (set.size === 0 && perms && typeof perms === 'object') {
    for (const [slug, actions] of Object.entries(perms)) {
      if (slug === '*') continue;
      const a = (actions || []).map((x) => String(x).toLowerCase());
      if (
        a.includes('view') ||
        a.includes('read') ||
        a.includes('show') ||
        (a.length > 0 && !a.every((x) => x === ''))
      ) {
        set.add(slug);
      }
    }
  }

  return expandSynonyms(set);
}

export function isMenuSlugAllowed(allowed: Set<string>, slug: string | undefined): boolean {
  if (!slug) return false;
  return allowed.has(slug);
}
