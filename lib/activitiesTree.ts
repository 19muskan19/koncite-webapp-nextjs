/**
 * Heading / activity hierarchy: SL No as 1, 2 for headings; 1.1, 1.2, 2.1 for nested activities
 * (matches Activities grid and Excel bulk export).
 */

export interface ActivityHierarchyBase {
  id: string;
  uuid?: string;
  numericId?: number;
  type?: string;
  parent_id?: number | string | null;
  heading?: number | string | null;
}

export type ActivityTreeRowNode<T> = {
  type: 'row';
  item: T;
  depth: number;
  srNo: string;
  groupIndex: number;
  isNewGroup: boolean;
  childIds?: string[];
};

export type ActivityTreeAddNode<T> = { type: 'add'; parentHeading: T; groupIndex: number };

export type ActivityTreeNode<T> = ActivityTreeRowNode<T> | ActivityTreeAddNode<T>;

/**
 * Build tree for UI + export: headings get 1,2,3…; children get 1.1, 1.2, 2.1… (recursive under activities).
 * Orphan non-headings (no matching parent) are listed at the end with the next top-level number.
 */
export function buildActivityTreeNodes<T extends ActivityHierarchyBase>(activities: T[]): ActivityTreeNode<T>[] {
  const isHeading = (a: T) => (a.type || '').toLowerCase() === 'heading';
  const headings = activities.filter(isHeading);
  const allActivities = activities.filter((a) => !isHeading(a));
  const getParentId = (a: T) => a.parent_id ?? a.heading;
  const getNodeId = (a: T) => a.numericId ?? (typeof a.id === 'string' && !Number.isNaN(Number(a.id)) ? Number(a.id) : null);
  const matchesParent = (child: T, parent: T) => {
    const pid = getParentId(child);
    if (pid == null) return false;
    const parentNodeId = getNodeId(parent);
    if (parentNodeId == null) return false;
    return pid === parentNodeId || String(pid) === String(parent.id) || String(pid) === String(parent.uuid);
  };

  const result: ActivityTreeNode<T>[] = [];
  let headingNo = 0;
  let groupIdx = 0;
  const allPlacedIds = new Set<string>();

  const addChildrenRecursive = (
    parent: T,
    parentSrNo: string,
    depth: number,
    groupIdxVal: number
  ): { ids: string[]; nodes: ActivityTreeRowNode<T>[] } => {
    const kids = allActivities.filter((c) => matchesParent(c, parent));
    const allDescendantIds: string[] = [];
    const nodes: ActivityTreeRowNode<T>[] = [];
    kids.forEach((k, idx) => {
      allPlacedIds.add(k.id);
      allDescendantIds.push(k.id);
      const srNo = `${parentSrNo}.${idx + 1}`;
      const nested = addChildrenRecursive(k, srNo, depth + 1, groupIdxVal);
      allDescendantIds.push(...nested.ids);
      nodes.push({
        type: 'row',
        item: k,
        depth,
        srNo,
        groupIndex: groupIdxVal,
        isNewGroup: false,
        childIds: nested.ids.length ? nested.ids : undefined,
      });
      nodes.push(...nested.nodes);
    });
    return { ids: allDescendantIds, nodes };
  };

  for (const h of headings) {
    headingNo++;
    const { ids: allChildIds, nodes: childRows } = addChildrenRecursive(h, String(headingNo), 1, groupIdx);
    result.push({
      type: 'row',
      item: h,
      depth: 0,
      srNo: String(headingNo),
      groupIndex: groupIdx,
      isNewGroup: true,
      childIds: allChildIds.length ? allChildIds : undefined,
    });
    result.push({ type: 'add', parentHeading: h, groupIndex: groupIdx });
    result.push(...childRows);
    groupIdx++;
  }
  const orphans = allActivities.filter((c) => !allPlacedIds.has(c.id));
  orphans.forEach((o) => {
    headingNo++;
    result.push({
      type: 'row',
      item: o,
      depth: 1,
      srNo: String(headingNo),
      groupIndex: groupIdx,
      isNewGroup: true,
    });
    groupIdx++;
  });
  return result;
}

/** Flattened export order with hierarchical SL No (no UI “add” rows). */
export function buildActivityExportRowsWithSrNo<T extends ActivityHierarchyBase>(
  activities: T[]
): Array<{ item: T; srNo: string }> {
  return buildActivityTreeNodes(activities)
    .filter((n): n is ActivityTreeRowNode<T> => n.type === 'row')
    .map(({ item, srNo }) => ({ item, srNo }));
}
