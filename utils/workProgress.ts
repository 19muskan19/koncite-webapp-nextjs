/**
 * Parse API numeric values that may be numbers or pre-formatted strings
 * (e.g. en-IN `"5,66,200.00"`, irregular grouping `"56,6200.00"` → 566200).
 * Strips thousands separators, unicode spaces, trailing %, and light currency prefix junk.
 */
export function parseLocaleNumericInput(value: unknown): number {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  let s = String(value)
    .trim()
    .replace(/[\u00A0\u202F\u2009\u2007\u2008]/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/%$/i, '');

  if (!s) return NaN;
  s = s.replace(/^[^\d-]+/, '');
  if (!s) return NaN;

  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    const last = s.lastIndexOf('.');
    s = `${s.slice(0, last).replace(/\./g, '')}.${s.slice(last + 1)}`;
  }

  let n = Number(s);
  if (Number.isFinite(n)) return n;

  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (m && m[0] !== '' && m[0] !== '-') {
    n = Number(m[0]);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

/** Parsed number for API/qty fields; non-finite input becomes `fallback` (default 0). */
export function parseLocaleNumber(value: unknown, fallback = 0): number {
  const x = parseLocaleNumericInput(value);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * Work progress balance qty:
 * - If estimate qty is 0 → balance is 0 (no work was estimated, so nothing remains “in balance”).
 * - Otherwise → estimate qty minus completed qty till date.
 */
export function computeWorkProgressBalanceQty(estimateQty: number, completedQty: number): number {
  const est = Number.isFinite(estimateQty) ? estimateQty : 0;
  const done = Number.isFinite(completedQty) ? completedQty : 0;
  if (est === 0) return 0;
  return est - done;
}
