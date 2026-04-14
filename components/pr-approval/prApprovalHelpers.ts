import type { PrDetailPayload, PrListRow } from './prApprovalTypes';

export function normalizePrListPayload(data: unknown): PrListRow[] {
  if (Array.isArray(data)) return data as PrListRow[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: PrListRow[] }).data;
  }
  return [];
}

export function rowUuid(row: PrListRow): string | null {
  const u = row.uuid;
  if (typeof u === 'string' && u.trim()) return u.trim();
  return null;
}

export function rowRequestNo(row: PrListRow): string {
  const v = row.request_id ?? row.request_no ?? row.indent_no;
  if (v == null || v === '') return '—';
  return String(v);
}

export function rowStatusLabel(row: PrListRow): string {
  const sl = row.status_label;
  if (typeof sl === 'string' && sl.trim()) return sl;
  const s = row.status;
  if (s == null || s === '') return '—';
  return String(s);
}

/** True when the row still needs approve/reject (Pending or numeric status 0). */
export function isPrListRowPending(row: PrListRow): boolean {
  const sl = row.status_label;
  if (typeof sl === 'string' && sl.trim()) {
    const t = sl.trim().toLowerCase();
    if (t === 'pending') return true;
    if (t === 'approved' || t === 'rejected') return false;
  }
  const s = row.status;
  if (s === 0 || s === '0') return true;
  return false;
}

export function rowProjectLabel(row: PrListRow): string {
  const proj = row.project;
  const projs = row.projects;
  const fromProj =
    proj && typeof proj === 'object'
      ? (proj as Record<string, unknown>).project_name ?? (proj as Record<string, unknown>).name
      : undefined;
  const fromProjs =
    projs && typeof projs === 'object'
      ? (projs as Record<string, unknown>).project_name ?? (projs as Record<string, unknown>).name
      : undefined;
  const direct =
    row.project_name ?? row.project_title ?? row.projects_project_name ?? fromProj ?? fromProjs;
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (direct != null && String(direct).trim()) return String(direct);
  return '—';
}

export function rowDateHint(row: PrListRow): string {
  const candidates = [
    row.created_at,
    row.request_date,
    row.date,
    row.updated_at,
    row.indent_date,
  ];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    const s = String(c);
    if (s.trim()) return s.length > 16 ? s.slice(0, 16) : s;
  }
  return '—';
}

/** Filter PR list rows by request no, status, project, date. */
export function listRowMatchesSearch(row: PrListRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const blob = [
    rowRequestNo(row),
    rowStatusLabel(row),
    rowProjectLabel(row),
    rowDateHint(row),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(needle);
}

export function detailLines(detail: PrDetailPayload | null): Record<string, unknown>[] {
  if (!detail) return [];
  const raw = detail.material_request_details;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
}

export function lineMaterial(line: Record<string, unknown>): string {
  const mats = line.materials;
  const matName =
    mats && typeof mats === 'object' && mats !== null && 'name' in mats
      ? (mats as { name?: unknown }).name
      : undefined;
  const v =
    line.material_name ?? line.name ?? line.material ?? matName ?? line.materials_id;
  return v != null && String(v).trim() ? String(v) : '—';
}

export function lineActivity(line: Record<string, unknown>): string {
  const acts = line.activities;
  const actName =
    acts && typeof acts === 'object' && acts !== null && 'name' in acts
      ? (acts as { name?: unknown }).name
      : undefined;
  const v =
    line.activities_name ??
    line.activity_name ??
    line.activity ??
    actName ??
    line.activity_id;
  const s = v != null && String(v).trim() ? String(v).trim() : '';
  return s === '' || s === '---' ? '—' : s;
}

export function lineQty(line: Record<string, unknown>): string {
  const v = line.qty ?? line.quantity ?? line.required_qty ?? line.total_qty;
  if (v == null || v === '') return '—';
  return String(v);
}

export function lineDate(line: Record<string, unknown>): string {
  const v = line.date ?? line.required_date ?? line.delivery_date;
  return v != null && String(v).trim() ? String(v) : '—';
}

export function lineRemarks(line: Record<string, unknown>): string {
  const v = line.remarks ?? line.remark ?? line.note;
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

/** Search across line fields (material, activity, qty, date, remarks). */
export function lineMatchesSearch(line: Record<string, unknown>, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const rawAct = line.activities_name ?? line.activity_name ?? line.activity ?? '';
  const blob = [
    lineMaterial(line),
    String(rawAct),
    lineQty(line),
    lineDate(line),
    lineRemarks(line),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(needle);
}
