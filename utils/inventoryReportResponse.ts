import type { InventoryReportMeta, InventoryReportResult } from '@/types/inventoryReportMeta';

/**
 * Parse Laravel `/inventory/inventory-report` JSON: supports `meta` plus nested `data.material` |
 * `data.assets`, or flat `assets` / `material` arrays.
 */
export function parseInventoryReportResponse(axiosResponseBody: unknown): InventoryReportResult {
  const body = axiosResponseBody && typeof axiosResponseBody === 'object' && 'data' in (axiosResponseBody as object)
    ? (axiosResponseBody as { data: unknown }).data
    : axiosResponseBody;

  if (body == null || typeof body !== 'object') {
    return { rows: [], meta: null };
  }

  const B = body as Record<string, unknown>;
  const meta =
    B.meta != null && typeof B.meta === 'object'
      ? (B.meta as InventoryReportMeta)
      : null;

  const nested =
    B.data != null && typeof B.data === 'object' && !Array.isArray(B.data)
      ? (B.data as Record<string, unknown>)
      : B;

  let rows: any[] = [];
  for (const k of ['assets', 'material', 'materials'] as const) {
    const v = nested[k];
    if (Array.isArray(v)) {
      rows = v;
      break;
    }
  }
  if (rows.length === 0) {
    for (const k of ['assets', 'material', 'materials'] as const) {
      const v = B[k];
      if (Array.isArray(v)) {
        rows = v;
        break;
      }
    }
  }
  if (rows.length === 0 && Array.isArray(nested)) {
    rows = nested as any[];
  }

  const fetchHeadData =
    nested.fetchHeadData ??
    nested.fetch_head_data ??
    B.fetchHeadData ??
    B.fetch_head_data;

  return {
    rows,
    meta,
    ...(fetchHeadData != null ? { fetchHeadData } : {}),
  };
}
