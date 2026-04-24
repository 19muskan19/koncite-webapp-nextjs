import type { AccessibleMenusData } from '@/contexts/UserContext';

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** True when this object carries menu tree, flat list, or menu_tree (possibly nested under more `data`). */
function payloadHasMenuData(o: Record<string, unknown>): boolean {
  const menus = o.menus;
  const flat = o.menus_flat ?? o.menusFlat;
  const mt = o.menu_tree ?? o.menuTree;
  return (
    (Array.isArray(menus) && menus.length > 0) ||
    (Array.isArray(flat) && flat.length > 0) ||
    (Array.isArray(mt) && mt.length > 0)
  );
}

/**
 * Unwraps nested `{ data: { data: { … } } }` until `menus`, `menus_flat`, or `menu_tree` is present.
 * A single-level unwrap loses the real payload when Laravel (or a proxy) nests `data` twice.
 */
function peelToMenuPayload(o: Record<string, unknown>): Record<string, unknown> {
  let cur: Record<string, unknown> = o;
  for (let depth = 0; depth < 8; depth++) {
    if (payloadHasMenuData(cur)) break;
    if (isRecord(cur.data)) {
      cur = cur.data;
      continue;
    }
    break;
  }
  return cur;
}

/**
 * Unwraps nested API envelopes and maps `menu_tree` / camelCase
 * to the fields `buildAllowedMenuSlugSet` and the sidebar expect.
 */
export function normalizeAccessibleMenusPayload(input: unknown): AccessibleMenusData | null {
  if (!isRecord(input)) return null;
  let o = peelToMenuPayload(input);

  const mFrom = o.menus;
  const mTree = o.menu_tree ?? o.menuTree;
  const pickedMenus =
    Array.isArray(mFrom) && mFrom.length > 0
      ? mFrom
      : Array.isArray(mTree) && mTree.length > 0
        ? mTree
        : Array.isArray(mFrom)
          ? mFrom
          : Array.isArray(mTree)
            ? mTree
            : undefined;

  const mFlat = o.menus_flat ?? o.menusFlat;
  const perms = o.permissions_by_slug ?? o.permissionsBySlug;

  return {
    ...o,
    user: o.user,
    role: o.role,
    is_super_admin: o.is_super_admin,
    menus: (pickedMenus !== undefined ? pickedMenus : o.menus) as AccessibleMenusData['menus'],
    menus_flat: Array.isArray(mFlat) ? (mFlat as AccessibleMenusData['menus_flat']) : o.menus_flat,
    permissions_by_slug: (perms as AccessibleMenusData['permissions_by_slug']) ?? o.permissions_by_slug,
  } as AccessibleMenusData;
}
