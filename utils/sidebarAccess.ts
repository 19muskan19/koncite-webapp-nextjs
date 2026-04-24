import type { AccessibleMenusData } from '@/contexts/UserContext';
import { normalizeAccessibleMenusPayload } from '@/utils/normalizeAccessibleMenusPayload';

/** Sync permission-tree keys with Laravel `company_permissions.slug` variants seen in APIs. */
const SLUG_SYNONYMS: string[][] = [
  ['operations-daily-work-progress', 'daily-work-progress'],
  ['operations-workforce', 'workforce-management'],
  ['settings', 'settings-root'],
  ['settings-subscription', 'settings-subscriptions-billing'],
];

/**
 * `GET /my-accessible-menus` uses Laravel menu slugs (e.g. `document-hub`, `inventory-hub`).
 * `components/Sidebar.tsx` uses `menuSlug` keys that predate those names — without mapping,
 * RBAC filters every item out even when `menus_flat` includes the access.
 * Keys: API / `menus_flat[].slug` → values: one or more `menuSlug` strings from `BASE_SIDEBAR_NAV_ITEMS`.
 */
const API_SLUG_TO_SIDEBAR_SLUG: Record<string, string[]> = {
  'document-hub': ['document'],
  'document': ['document'],
  'inventory-hub': ['inventory'],
  'inventory': ['inventory'],
  'admin-root': ['admin'],
  'admin': ['admin'],
  'reports-root': ['reports'],
  'reports': ['reports'],
  'masters-group': ['admin-masters'],
  /** User Management (Laravel may spell "management" as `managment`) */
  'user-managment': ['admin-user-management'],
  'user-management': ['admin-user-management'],
  'manage-teams': ['admin-user-teams'],
  'role-permission': ['admin-user-roles'],
  'project-permissions': ['admin-user-project-perms'],
  'workflow-settings-group': ['admin-workflow'],
  'workflow-pr-approval-manage': ['admin-workflow-pr-approval'],
  'workflow-pr': ['admin-workflow-pr'],
  'ai-finance': ['ai-finance'],
  'ai-hub': ['ai-hub'],
  'pre-construction': ['pre-construction'],
  'settings-subscriptions-billing': ['settings-subscription'],

  'pr': ['inventory-pr'],
  'pr-approval': ['inventory-pr-approvals'],
  'rfq': ['inventory-rfq'],
  'purchase-order': ['inventory-po'],
  'purchase-order-approvals': ['inventory-po-approvals'],
  'grn-mrn-slip': ['inventory-grn-mrn'],
  'grn-mrn-details': ['inventory-grn-mrn'],
  'goods-issue': ['inventory-goods-issue'],
  'goods-returns': ['inventory-goods-returns'],

  'companies': ['admin-masters-companies'],
  'project': ['admin-masters-projects'],
  'sub-project': ['admin-masters-subprojects'],
  'units': ['admin-masters-units'],
  'warehouses': ['admin-masters-warehouses'],
  'labours': ['admin-masters-labours'],
  'assets-equipments': ['admin-masters-assets'],
  'vendors': ['admin-masters-vendors'],
  'activities': ['admin-masters-activities'],
  'materials': ['admin-masters-materials'],

  'work-progress-reports': ['reports-work-progress'],
  'work-progress-details': ['reports-work-progress-details'],
  'dpr': ['reports-dpr'],
  'daily-work-progress': ['daily-work-progress'],
  'resources-usage-from-dpr': ['reports-resources-dpr'],
  'material-used-vs-store-issue': ['reports-material-used'],
  'inventory-reports': ['reports-inventory'],
  'pr-report': ['reports-inv-pr'],
  'rfq-report': ['reports-inv-rfq'],
  'grn-mrn-slip-report': ['reports-inv-grn-slip'],
  'grn-mrn-details-report': ['reports-inv-grn-details'],
  'issue-slip': ['reports-inv-issue-slip'],
  'issue-outward-details': ['reports-inv-issue-outward'],
  'issue-return': ['reports-inv-issue-return'],
  'global-stock-details': ['reports-inv-global-stock'],
  'project-stock-statement': ['reports-inv-project-stock'],

  'pre-construction-ai-tendering': ['pre-construction-ai-tendering'],
};

function expandApiSlugsToSidebarMenuSlugs(allowed: Set<string>): void {
  for (const apiSlug of Array.from(allowed)) {
    const navSlugs = API_SLUG_TO_SIDEBAR_SLUG[apiSlug];
    if (navSlugs?.length) {
      for (const n of navSlugs) {
        if (n) allowed.add(n);
      }
    }
  }
}

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

/** Recursively collect `.slug` from nested `GET /my-accessible-menus` `menus` tree. */
function collectSlugsFromMenusTree(nodes: unknown, set: Set<string>): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const n = node as { slug?: unknown; children?: unknown };
    if (typeof n.slug === 'string' && n.slug.trim()) {
      set.add(n.slug.trim());
    }
    if (Array.isArray(n.children)) {
      collectSlugsFromMenusTree(n.children, set);
    }
  }
}

function addSlugsForGrantedPermissions(
  perms: Record<string, string[] | undefined> | null | undefined,
  set: Set<string>
): void {
  if (!perms || typeof perms !== 'object') return;
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

/**
 * @returns `null` = show full sidebar (super-admin, wildcard, or no payload yet).
 * Empty set = hide navigable items (except entries handled specially e.g. Logout).
 */
export function buildAllowedMenuSlugSet(data: AccessibleMenusData | null): Set<string> | null {
  if (!data) return null;
  const normalized = normalizeAccessibleMenusPayload(data as unknown) ?? data;
  if (normalized.is_super_admin === true) return null;
  const perms = normalized.permissions_by_slug;
  if (perms && typeof perms === 'object') {
    const star = perms['*'];
    if (Array.isArray(star) && star.length > 0) return null;
  }

  const set = new Set<string>();
  if (Array.isArray(normalized.menus_flat)) {
    for (const m of normalized.menus_flat) {
      if (m && typeof m.slug === 'string' && m.slug.trim()) {
        set.add(m.slug.trim());
      }
    }
  }

  const d = normalized as AccessibleMenusData & {
    menus?: unknown;
    menusFlat?: { slug?: string }[];
    menu_tree?: unknown;
    menuTree?: unknown;
  };
  if (Array.isArray(d.menus)) {
    collectSlugsFromMenusTree(d.menus, set);
  }
  if (Array.isArray(d.menu_tree)) {
    collectSlugsFromMenusTree(d.menu_tree, set);
  }
  if (Array.isArray(d.menuTree)) {
    collectSlugsFromMenusTree(d.menuTree, set);
  }
  if (Array.isArray(d.menusFlat)) {
    for (const m of d.menusFlat) {
      if (m && typeof m.slug === 'string' && m.slug.trim()) {
        set.add(m.slug.trim());
      }
    }
  }

  /**
   * Always merge `permissions_by_slug` with `menus_flat` (not only when flat is empty).
   * A partial or cached `menus_flat` can list `admin-root` but omit child slugs; mapping then
   * adds `admin` with no `admin-masters-*` leaves, so the whole Admin group disappears.
   */
  addSlugsForGrantedPermissions(perms as Record<string, string[] | undefined> | undefined, set);

  /** Laravel `menus_flat` slugs → Sidebar `menuSlug` keys (see `BASE_SIDEBAR_NAV_ITEMS`). */
  for (let i = 0; i < 3; i += 1) {
    expandApiSlugsToSidebarMenuSlugs(set);
  }

  return expandSynonyms(set);
}

export function isMenuSlugAllowed(allowed: Set<string>, slug: string | undefined): boolean {
  if (!slug) return false;
  return allowed.has(slug);
}
