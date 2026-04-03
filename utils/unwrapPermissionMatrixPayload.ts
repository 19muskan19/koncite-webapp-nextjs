/**
 * Laravel permission UIs return menus + permission maps under nested `data`.
 * GET user-permission/{uuid} uses `user_permissions`; roles may use `permissions_by_menu`;
 * POST save responses use `normalized_permissions`.
 */

export function coercePermissionActions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter((s) => s.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value)
      .map((x) => String(x).trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function mergePermissionMaps(...sources: unknown[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const src of sources) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      const actions = coercePermissionActions(v);
      if (actions.length > 0) {
        out[String(k)] = actions;
      }
    }
  }
  return out;
}

/** Walk `data` wrappers until we find menus and/or permission maps. */
export function unwrapPermissionMatrixPayload(data: unknown): {
  menusTree: unknown;
  permissionsByMenu: Record<string, string[]>;
} | null {
  if (!data || typeof data !== 'object') return null;
  let cur: unknown = data;
  for (let depth = 0; depth < 8; depth++) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return null;
    const d = cur as Record<string, unknown>;
    /** Laravel `companyUserpermission` returns `menus` (Company_permission[]); team UIs may use `menus_tree`. */
    const hasMenus =
      d.menus_tree != null || d.menusTree != null || Array.isArray(d.menus);
    const hasPermPayload =
      d.permissions_by_menu != null ||
      d.permissionsByMenu != null ||
      d.user_permissions != null ||
      d.userPermissions != null ||
      d.normalized_permissions != null ||
      d.normalizedPermissions != null;

    if (hasMenus || hasPermPayload) {
      const menusTree = d.menus_tree ?? d.menusTree ?? (Array.isArray(d.menus) ? d.menus : []);
      const permissionsByMenu = mergePermissionMaps(
        d.permissions_by_menu,
        d.permissionsByMenu,
        d.user_permissions,
        d.userPermissions,
        d.normalized_permissions,
        d.normalizedPermissions
      );
      return { menusTree, permissionsByMenu };
    }
    const next = d.data;
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      cur = next;
      continue;
    }
    return null;
  }
  return null;
}

/** Parse add-user-permission / add-permission JSON body for `normalized_permissions`. */
export function normalizedPermissionsFromSaveResponse(res: unknown): Record<string, string[]> | null {
  if (!res || typeof res !== 'object') return null;
  const top = res as Record<string, unknown>;
  const payload =
    top.data != null && typeof top.data === 'object' && !Array.isArray(top.data)
      ? (top.data as Record<string, unknown>)
      : top;
  const merged = mergePermissionMaps(
    payload.normalized_permissions,
    payload.normalizedPermissions,
    payload.permissions_by_menu,
    payload.permissionsByMenu,
    payload.user_permissions,
    payload.userPermissions
  );
  return Object.keys(merged).length > 0 ? merged : null;
}
