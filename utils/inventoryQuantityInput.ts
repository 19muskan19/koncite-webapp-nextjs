/**
 * True when a quantity value should be cleared on focus so the user can type
 * a new amount (inventory: GRN, issue, return, PR materials, quotes, etc.).
 */
export function isInventoryQuantityZeroish(value: unknown): boolean {
  if (value === '' || value == null) return false;
  if (value === 0 || value === '0') return true;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return false;
    const n = Number(t);
    return !Number.isNaN(n) && n === 0;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value) && value === 0;
  }
  return false;
}
