import type { InventoryReportMeta, InventoryReportResult } from '@/types/inventoryReportMeta';

const ROW_KEYS = ['material', 'materials', 'assets', 'Material', 'MATERIALS', 'Assets'] as const;

/**
 * `meta` may sit on the same object as a nested `data: { material: [...] }` (common Laravel shape).
 * After we unwrap `response.data` to only the inner object, we lose that `meta` unless we read the root.
 */
function resolveMeta(axiosResponseBody: unknown, B: Record<string, unknown>): InventoryReportMeta | null {
  if (B.meta != null && typeof B.meta === 'object') {
    return B.meta as InventoryReportMeta;
  }
  if (axiosResponseBody != null && typeof axiosResponseBody === 'object' && 'meta' in (axiosResponseBody as object)) {
    const m = (axiosResponseBody as { meta?: unknown }).meta;
    if (m != null && typeof m === 'object') {
      return m as InventoryReportMeta;
    }
  }
  return null;
}

/**
 * If `data.material` is nested under `report`, `result`, or `data` twice, a shallow scan misses it.
 */
function deepFindRowArray(x: unknown, depth = 0): any[] {
  if (depth > 10 || x == null) {
    return [];
  }
  if (Array.isArray(x)) {
    if (x.length === 0) {
      return [];
    }
    const el = x[0];
    if (el != null && typeof el === 'object' && !Array.isArray(el)) {
      // Typical PR line: code/name, sl_no, or camelCase totals
      if (
        'code' in el ||
        'name' in el ||
        'sl_no' in el ||
        'totalRequiredQty' in el ||
        'material' in (el as object)
      ) {
        return x;
      }
    }
    return [];
  }
  if (typeof x !== 'object') {
    return [];
  }
  const o = x as Record<string, unknown>;
  for (const k of ROW_KEYS) {
    const v = o[k];
    if (
      Array.isArray(v) &&
      (v.length === 0 || (typeof v[0] === 'object' && v[0] !== null && !Array.isArray(v[0])))
    ) {
      return v;
    }
  }
  for (const k of Object.keys(o)) {
    if (k === 'meta' || k === 'message' || k === 'name' || k === 'status' || k === 'success') {
      continue;
    }
    const v = o[k];
    if (v != null && typeof v === 'object') {
      const sub = deepFindRowArray(v, depth + 1);
      if (sub.length > 0) {
        return sub;
      }
    }
  }
  return [];
}

/**
 * Parse Laravel `/inventory/inventory-report` JSON: supports `meta` plus nested `data.material` |
 * `data.assets`, or flat `assets` / `material` arrays.
 */
export function parseInventoryReportResponse(axiosResponseBody: unknown): InventoryReportResult {
  const unwrappedOnDataKey =
    axiosResponseBody && typeof axiosResponseBody === 'object' && 'data' in (axiosResponseBody as object)
      ? (axiosResponseBody as { data: unknown }).data
      : null;

  const body = unwrappedOnDataKey != null ? unwrappedOnDataKey : axiosResponseBody;

  if (body == null || typeof body !== 'object') {
    return { rows: [], meta: resolveMeta(axiosResponseBody, {}) };
  }

  const B = body as Record<string, unknown>;
  const meta = resolveMeta(axiosResponseBody, B);

  const nested =
    B.data != null && typeof B.data === 'object' && !Array.isArray(B.data)
      ? (B.data as Record<string, unknown>)
      : B;

  let rows: any[] = [];
  for (const k of ROW_KEYS) {
    const v = (nested as Record<string, unknown>)[k];
    if (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'object')) {
      rows = v;
      break;
    }
  }
  if (rows.length === 0) {
    for (const k of ROW_KEYS) {
      const v = B[k];
      if (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'object')) {
        rows = v;
        break;
      }
    }
  }
  if (rows.length === 0 && Array.isArray(nested)) {
    rows = nested as any[];
  }
  if (rows.length === 0) {
    rows = deepFindRowArray(nested, 0);
  }
  if (rows.length === 0) {
    rows = deepFindRowArray(B, 0);
  }
  if (rows.length === 0) {
    rows = deepFindRowArray(axiosResponseBody, 0);
  }

  const fetchHeadData =
    (nested as Record<string, unknown>).fetchHeadData ??
    (nested as Record<string, unknown>).fetch_head_data ??
    B.fetchHeadData ??
    B.fetch_head_data;

  return {
    rows,
    meta,
    ...(fetchHeadData != null ? { fetchHeadData } : {}),
  };
}
