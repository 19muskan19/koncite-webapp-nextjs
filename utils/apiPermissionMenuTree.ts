import type { CrudFlags } from '@/constants/sidebarPermissionTree';

export type ApiPermissionMenuNode = {
  id: number;
  name: string;
  children?: ApiPermissionMenuNode[];
};

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
  const nameRaw = o.name ?? o.label ?? o.title;
  const name =
    (typeof nameRaw === 'string' && nameRaw.trim()) ||
    (nameRaw != null ? String(nameRaw).trim() : '') ||
    `Item ${id}`;
  const rawChildren = o.children;
  if (!Array.isArray(rawChildren) || rawChildren.length === 0) {
    return { id, name };
  }
  const children = rawChildren.map(normalizeMenuNode).filter(Boolean) as ApiPermissionMenuNode[];
  if (children.length === 0) return { id, name };
  return { id, name, children };
}

export function parseMenusTreeFromApi(raw: unknown): ApiPermissionMenuNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMenuNode).filter(Boolean) as ApiPermissionMenuNode[];
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

/** Matrix rows from API menu tree + permission id → actions (for modal and POST response sync). */
export function buildCrudMatrixFromMenusTreeAndPermissionMap(
  menusTree: unknown,
  permissionsByMenu: Record<string, string[]>
): Record<string, CrudFlags> {
  const roots = parseMenusTreeFromApi(menusTree);
  const rowList = flattenApiPermissionMenu(roots);
  const next: Record<string, CrudFlags> = {};
  for (const r of rowList) {
    next[r.key] = emptyCrudFlags();
  }
  for (const [permId, actions] of Object.entries(permissionsByMenu)) {
    const key = String(permId);
    if (next[key] !== undefined) {
      next[key] = actionsToCrud(actions);
    }
  }
  return next;
}
