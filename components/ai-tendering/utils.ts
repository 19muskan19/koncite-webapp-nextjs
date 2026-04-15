import type { BoqItemRow, Financials, TenderAnalysisResponse } from './types';

export function fmt(n: number | undefined, dec = 0): string {
  return Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: dec });
}

/** Display crores/lakh style: value in ₹ → "X.XX L" */
export function fmtL(n: number | undefined): string {
  return `${((n ?? 0) / 100_000).toFixed(2)} L`;
}

export function toL(n: number | undefined): number {
  return +((n ?? 0) / 100_000).toFixed(2);
}

export function trunc(s: string, n: number): string {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function countConf(items: BoqItemRow[]): { HIGH: number; MEDIUM: number; LOW: number } {
  const c = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const i of items) {
    const k = i.confidence || 'MEDIUM';
    if (k === 'HIGH' || k === 'MEDIUM' || k === 'LOW') c[k] += 1;
    else c.MEDIUM += 1;
  }
  return c;
}

/** Sums current_amount by category — values in ₹ */
export function buildCategoryBreakdownFromItems(items: BoqItemRow[]): Record<string, number> {
  const cats: Record<string, number> = {};
  for (const i of items) {
    const k = i.category || 'general';
    cats[k] = (cats[k] ?? 0) + (i.current_amount ?? 0);
  }
  return cats;
}

/** Maps API / spreadsheet variants to HIGH | MEDIUM | LOW (matches filters + charts). */
export function parseConfidence(raw: unknown): BoqItemRow['confidence'] {
  if (raw == null || raw === '') return 'MEDIUM';
  let s = String(raw).trim();
  if (!s || s === 'undefined' || s === 'null') return 'MEDIUM';
  s = s.toUpperCase();
  if (s.length === 1) {
    if (s === 'H') return 'HIGH';
    if (s === 'L') return 'LOW';
    if (s === 'M') return 'MEDIUM';
  }
  if (s === 'HIGH' || s.startsWith('HIGH ')) return 'HIGH';
  if (s === 'LOW' || s.startsWith('LOW ')) return 'LOW';
  if (s === 'MEDIUM' || s === 'MED' || s === 'MID' || s.startsWith('MED')) return 'MEDIUM';
  if (s.includes('HIGH')) return 'HIGH';
  if (s.includes('LOW')) return 'LOW';
  return 'MEDIUM';
}

export function normalizeBoqItem(raw: Record<string, unknown>): BoqItemRow {
  const n = raw.n;
  const d = raw.d;
  const u = raw.u;
  const q = raw.q;
  const br = raw.br;
  const ba = raw.ba;
  const cr = raw.cr;
  const ca = raw.ca;
  const confRaw = raw.conf ?? raw.confidence ?? raw.Confidence ?? raw.confidence_level;
  const cat = raw.cat ?? raw.category;

  const confidence = parseConfidence(confRaw);

  return {
    item_no: String(raw.item_no ?? n ?? ''),
    description: String(raw.description ?? d ?? ''),
    unit: String(raw.unit ?? u ?? ''),
    quantity: Number(raw.quantity ?? q ?? 0),
    base_rate: Number(raw.base_rate ?? br ?? 0),
    current_amount: Number(raw.current_amount ?? ba ?? 0),
    competitive_rate: Number(raw.competitive_rate ?? cr ?? 0),
    optimized_amount: Number(raw.optimized_amount ?? ca ?? 0),
    saving: Number(
      raw.saving ??
        Number(raw.current_amount ?? ba ?? 0) - Number(raw.optimized_amount ?? ca ?? 0)
    ),
    confidence,
    category: String(cat ?? 'general'),
  };
}

export function normalizeItems(data: TenderAnalysisResponse): BoqItemRow[] {
  const raw = data.items ?? data.boq_items ?? [];
  return raw.map((r) => normalizeBoqItem(r as unknown as Record<string, unknown>));
}

export function itemSaving(r: BoqItemRow): number {
  if (r.saving != null && r.saving > 0) return r.saving;
  return (r.current_amount ?? 0) - (r.optimized_amount ?? 0);
}

export function getFinancials(d: TenderAnalysisResponse, items: BoqItemRow[]): Financials {
  const f = d.financials ?? {};
  const totalCurrent = f.total_current ?? f.calculated_value ?? items.reduce((s, i) => s + i.current_amount, 0);
  const totalOpt = f.total_optimized ?? f.optimized_value ?? items.reduce((s, i) => s + i.optimized_amount, 0);
  const saving = f.total_saving ?? f.saving ?? Math.max(0, totalCurrent - totalOpt);
  const savingPct =
    f.saving_pct ??
    (totalCurrent > 0 ? +((saving / totalCurrent) * 100).toFixed(2) : 0);
  return {
    ...f,
    total_items: f.total_items ?? items.length,
    total_current: totalCurrent,
    total_optimized: totalOpt,
    total_saving: saving,
    saving_pct: savingPct,
  };
}

export function downloadCsv(rows: (string | number)[][], filename: string): void {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
