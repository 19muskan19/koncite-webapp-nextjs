import type { CrudFlags } from '@/constants/sidebarPermissionTree';
import { coercePermissionActions } from '@/utils/unwrapPermissionMatrixPayload';

export type ApiPermissionMenuNode = {
  id: number;
  name: string;
  /** Laravel `menus[].slug` when present; used to drop UI-removed items from the matrix. */
  slug?: string;
  children?: ApiPermissionMenuNode[];
};

/** API menu slugs that should not appear in the team/role permissions matrix. */
const EXCLUDED_PERMISSION_MATRIX_MENU_SLUGS = new Set(['pr-management']);

function isExcludedMenuSlug(slug: string | undefined): boolean {
  return !!slug && EXCLUDED_PERMISSION_MATRIX_MENU_SLUGS.has(slug);
}

export type PermissionMatrixRow = { key: string; label: string; depth: number };

function emptyCrudFlags(): CrudFlags {
  return { view: false, create: false, edit: false, delete: false };
}

function normalizeMenuNode(node: unknown): ApiPermissionMenuNode | null {
  if (!node || typeof node !== 'object') return null;
  const o = node as Record<string, unknown>;
  const rawId = o.id ?? o.permission_id ?? o.company_permission_id ?? o.companyPermissionId;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;
  const nameRaw = o.name ?? o.label ?? o.title ?? o.permission_name ?? o.menu_name ?? o.slug;
  const name =
    (typeof nameRaw === 'string' && nameRaw.trim()) ||
    (nameRaw != null ? String(nameRaw).trim() : '') ||
    `Item ${id}`;
  const slugRaw = o.slug ?? o.menu_slug;
  const slug = typeof slugRaw === 'string' && slugRaw.trim() ? slugRaw.trim() : undefined;
  if (isExcludedMenuSlug(slug)) return null;

  const rawChildren = o.children;
  if (!Array.isArray(rawChildren) || rawChildren.length === 0) {
    return { id, name, ...(slug ? { slug } : {}) };
  }
  const children = rawChildren
    .map(normalizeMenuNode)
    .filter((c): c is ApiPermissionMenuNode => c != null);
  if (children.length === 0) return { id, name, ...(slug ? { slug } : {}) };
  return { id, name, ...(slug ? { slug } : {}), children };
}

export function parseMenusTreeFromApi(raw: unknown): ApiPermissionMenuNode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMenuNode)
    .filter((n): n is ApiPermissionMenuNode => n != null);
}

export function flattenApiPermissionMenu(nodes: ApiPermissionMenuNode[], depth = 0): PermissionMatrixRow[] {
  const rows: PermissionMatrixRow[] = [];
  for (const n of nodes) {
    rows.push({ key: String(n.id), label: n.name, depth });
    if (n.children?.length) {
      rows.push(...flattenApiPermissionMenu(n.children, depth + 1));
    }
  }
  return rows;
}

export function buildApiSubtreeIndex(nodes: ApiPermissionMenuNode[]): Record<string, string[]> {
  const subtree: Record<string, string[]> = {};

  function visit(node: ApiPermissionMenuNode): string[] {
    if (!node.children?.length) {
      subtree[String(node.id)] = [String(node.id)];
      return [String(node.id)];
    }
    const keys = [String(node.id)];
    for (const c of node.children) {
      keys.push(...visit(c));
    }
    subtree[String(node.id)] = keys;
    return keys;
  }

  for (const n of nodes) {
    visit(n);
  }
  return subtree;
}

export function actionsToCrud(actions: unknown): CrudFlags {
  if (!Array.isArray(actions)) {
    return { view: false, create: false, edit: false, delete: false };
  }
  const set = new Set(actions.map((a) => String(a).toLowerCase().trim()));
  return {
    view: set.has('view') || set.has('read') || set.has('show'),
    create: set.has('create') || set.has('add') || set.has('store'),
    edit: set.has('edit') || set.has('update') || set.has('patch'),
    delete: set.has('delete') || set.has('destroy') || set.has('remove'),
  };
}

/** Laravel `company_*_permission` actions use `add`, not `create`. */
export function crudToActions(f: CrudFlags): string[] {
  const out: string[] = [];
  if (f.view) out.push('view');
  if (f.create) out.push('add');
  if (f.edit) out.push('edit');
  if (f.delete) out.push('delete');
  return out;
}

function mergeCrudOr(a: CrudFlags, b: CrudFlags): CrudFlags {
  return {
    view: a.view || b.view,
    create: a.create || b.create,
    edit: a.edit || b.edit,
    delete: a.delete || b.delete,
  };
}

/** Matrix rows from API menu tree + permission id → actions (for modal and POST response sync). */
export function buildCrudMatrixFromMenusTreeAndPermissionMap(
  menusTree: unknown,
  permissionsByMenu: Record<string, string[] | unknown>
): Record<string, CrudFlags> {
  const roots = parseMenusTreeFromApi(menusTree);
  const rowList = flattenApiPermissionMenu(roots);
  const subs = buildApiSubtreeIndex(roots);
  const next: Record<string, CrudFlags> = {};
  for (const r of rowList) {
    next[r.key] = emptyCrudFlags();
  }
  /**
   * Apply each menu's actions to that row and all descendants.
   * Backends often attach permissions to a parent (e.g. Operations id 39) and expect
   * children to inherit; multiple entries merge with OR.
   */
  for (const [permId, raw] of Object.entries(permissionsByMenu)) {
    const key = String(permId);
    const crud = actionsToCrud(coercePermissionActions(raw));
    const hasAny = crud.view || crud.create || crud.edit || crud.delete;
    if (!hasAny) continue;
    const targetKeys = subs[key] ?? [key];
    for (const t of targetKeys) {
      if (next[t] !== undefined) {
        next[t] = mergeCrudOr(next[t], crud);
      }
    }
  }
  return next;
}
