/**
 * Shared helpers for API activity rows + Masters units (bulk export, grid, modals).
 * Backend may return `unit_id` as a number, string, or nested `{ id, unit, name }`.
 */

export type UnitListEntry = { id: number; unit: string };

export function buildUnitsListFromMasters(masters: unknown[] | null | undefined): UnitListEntry[] {
  return (masters || [])
    .map((raw) => {
      const r = raw as { id?: unknown; unit?: unknown; name?: unknown };
      const id = typeof r.id === 'number' ? r.id : Number(r.id);
      const unit = (r.unit || r.name || '').toString().trim();
      return { id, unit } as UnitListEntry;
    })
    .filter((u) => u.unit !== '' && Number.isFinite(u.id));
}

/** API may return `unit_id` as nested object `{ id, unit }` or a scalar id; resolve display label. */
export function resolveActivityUnitName(activity: any, unitsList: UnitListEntry[]): string {
  const raw = activity?.unit_id;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const direct = (raw.unit || raw.name || '').toString().trim();
    if (direct) return direct;
  }
  const fromApi =
    activity?.units?.unit ||
    activity?.units?.name ||
    activity?.unit?.unit ||
    activity?.unit?.name ||
    (typeof activity?.unit === 'string' ? activity.unit : '');
  if (fromApi) return String(fromApi).trim();
  const uid =
    typeof raw === 'number' || typeof raw === 'string'
      ? raw
      : raw?.id ?? activity?.unit?.id ?? activity?.units?.id;
  if (uid != null && uid !== '') {
    const u = unitsList.find((x) => x.id === Number(uid) || String(x.id) === String(uid));
    return (u?.unit || '').trim();
  }
  return '';
}

export function resolveActivityUnitId(activity: any): number | undefined {
  const raw = activity?.unit_id;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.id != null) {
    return Number(raw.id);
  }
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  const n = activity?.unit?.id ?? activity?.units?.id;
  return n != null ? Number(n) : undefined;
}
