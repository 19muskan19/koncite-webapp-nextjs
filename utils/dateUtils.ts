/**
 * Returns today's date in YYYY-MM-DD format using the user's local timezone.
 * Use this instead of new Date().toISOString().split('T')[0] which returns UTC date
 * and can show the wrong day for users in timezones ahead of UTC (e.g. India).
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
}
