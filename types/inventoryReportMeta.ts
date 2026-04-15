/**
 * Shared `meta` shape from POST `/inventory/inventory-report` (all report types).
 * Backend may attach company / project / subproject branding and optional date scope.
 */
export type InventoryReportMeta = {
  company?: { name?: string | null; logo?: string | null };
  project?: { id?: number | null; name?: string | null; logo?: string | null };
  subProject?: { id?: number | null; name?: string | null; logo?: string | null };
  selectedDate?: { date?: string | null; from?: string | null; to?: string | null };
};

export type InventoryReportResult = {
  rows: any[];
  meta: InventoryReportMeta | null;
  /** Present for GRN slip when backend sends header block separately */
  fetchHeadData?: unknown;
};
