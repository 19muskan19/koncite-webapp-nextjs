/**
 * Plain tree mirroring `components/Sidebar.tsx` labels/hierarchy for RBAC-style matrices.
 * Keys are stable IDs for per-row permission state (not route paths).
 */
export type CrudFlags = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type SidebarPermissionNode = {
  key: string;
  label: string;
  children?: SidebarPermissionNode[];
};

export const SIDEBAR_PERMISSION_TREE: SidebarPermissionNode[] = [
  { key: 'dashboard', label: 'Dashboard' },
  {
    key: 'operations',
    label: 'Operations',
    children: [
      { key: 'operations-daily-work-progress', label: 'Daily work progress' },
      { key: 'operations-workforce', label: 'Workforce management' },
      { key: 'operations-task', label: 'Task' },
    ],
  },
  { key: 'document', label: 'Document' },
  {
    key: 'inventory',
    label: 'Inventory',
    children: [
      { key: 'inventory-pr', label: 'Purchase Requests (PR)' },
      { key: 'inventory-pr-approvals', label: 'PR Approvals' },
      { key: 'inventory-rfq', label: 'RFQ' },
      { key: 'inventory-po', label: 'Purchase Order (PO)' },
      { key: 'inventory-po-approvals', label: 'PO Approvals' },
      { key: 'inventory-grn-mrn', label: 'Goods Receipt (GRN/MRN)' },
      { key: 'inventory-goods-issue', label: 'Goods Issue' },
      { key: 'inventory-goods-returns', label: 'Goods Returns' },
    ],
  },
  { key: 'ai-finance', label: 'AI Finance' },
  { key: 'ai-hub', label: 'AI Hub' },
  {
    key: 'reports',
    label: 'Reports',
    children: [
      {
        key: 'reports-work-progress',
        label: 'Work Progress Reports',
        children: [
          { key: 'reports-work-progress-details', label: 'Work Progress Details' },
          { key: 'reports-dpr', label: 'DPR' },
          { key: 'reports-resources-dpr', label: 'Resources Usage from DPR' },
          { key: 'reports-material-used', label: 'Material Used vs Store Issue' },
        ],
      },
      {
        key: 'reports-inventory',
        label: 'Inventory Reports',
        children: [
          { key: 'reports-inv-pr', label: 'PR' },
          { key: 'reports-inv-rfq', label: 'RFQ' },
          { key: 'reports-inv-grn-slip', label: 'GRN(MRN) Slip' },
          { key: 'reports-inv-grn-details', label: 'GRN(MRN) Details' },
          { key: 'reports-inv-issue-slip', label: 'Issue Slip' },
          { key: 'reports-inv-issue-outward', label: 'Issue(Outward) Details' },
          { key: 'reports-inv-issue-return', label: 'Issue Return' },
          { key: 'reports-inv-global-stock', label: 'Global Stock Details' },
          { key: 'reports-inv-project-stock', label: 'Project Stock Statement' },
        ],
      },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    children: [
      {
        key: 'admin-masters',
        label: 'Masters',
        children: [
          { key: 'admin-masters-companies', label: 'Companies' },
          { key: 'admin-masters-projects', label: 'Projects' },
          { key: 'admin-masters-subprojects', label: 'Subprojects' },
          { key: 'admin-masters-units', label: 'Units' },
          { key: 'admin-masters-warehouses', label: 'Warehouses' },
          { key: 'admin-masters-labours', label: 'Labours' },
          { key: 'admin-masters-assets', label: 'Assets Equipments' },
          { key: 'admin-masters-vendors', label: 'Vendors' },
          { key: 'admin-masters-activities', label: 'Activities' },
          { key: 'admin-masters-materials', label: 'Materials' },
        ],
      },
      {
        key: 'admin-user-management',
        label: 'User Management',
        children: [
          { key: 'admin-user-teams', label: 'Teams' },
          { key: 'admin-user-roles', label: 'Roles & Permissions' },
          { key: 'admin-user-project-perms', label: 'Project Permissions' },
        ],
      },
      {
        key: 'admin-workflow',
        label: 'Workflow Settings',
        children: [
          { key: 'admin-workflow-pr-approval', label: 'PR Approval Manage' },
          { key: 'admin-workflow-pr', label: 'PR' },
        ],
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    children: [
      { key: 'settings-profile', label: 'Profile' },
      { key: 'settings-subscription', label: 'Subscriptions and Billing' },
      { key: 'settings-logout', label: 'Logout' },
    ],
  },
];

export type SidebarPermissionRow = { key: string; label: string; depth: number };

export function flattenSidebarPermissionTree(
  nodes: SidebarPermissionNode[],
  depth = 0
): SidebarPermissionRow[] {
  const rows: SidebarPermissionRow[] = [];
  for (const n of nodes) {
    rows.push({ key: n.key, label: n.label, depth });
    if (n.children?.length) {
      rows.push(...flattenSidebarPermissionTree(n.children, depth + 1));
    }
  }
  return rows;
}

/** Each key maps to [node, ...descendants] for cascade rules (leaves map to a single-element array). */
export function buildSubtreeIndex(nodes: SidebarPermissionNode[]): Record<string, string[]> {
  const subtree: Record<string, string[]> = {};

  function visit(node: SidebarPermissionNode): string[] {
    if (!node.children?.length) {
      subtree[node.key] = [node.key];
      return [node.key];
    }
    const keys = [node.key];
    for (const c of node.children) {
      keys.push(...visit(c));
    }
    subtree[node.key] = keys;
    return keys;
  }

  for (const n of nodes) {
    visit(n);
  }
  return subtree;
}
