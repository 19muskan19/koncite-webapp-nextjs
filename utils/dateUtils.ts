/**
 * Calendar date in the user's local timezone as YYYY-MM-DD.
 * Prefer this over `toISOString().slice(0, 10)` (UTC) and over relying on
 * `toLocaleDateString('en-CA')` (can vary by runtime/ICU).
 */
export function getTodayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
