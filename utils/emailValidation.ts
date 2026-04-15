/**
 * Shared email validation: requires a complete domain with a TLD (e.g. .com, .org, .in).
 * Rejects incomplete addresses like `name@gmail` (no dot + extension).
 */

export const EMAIL_INVALID_MESSAGE =
  'Enter a complete email with domain and extension (e.g. name@company.com).';

/**
 * Returns true if `value` looks like a complete internet email: local@domain.tld
 * with at least one dot in the domain and a TLD of length ≥ 2.
 */
export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 254) return false;

  const at = email.indexOf('@');
  if (at <= 0 || email.indexOf('@', at + 1) !== -1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > 64 || !domain || domain.length > 253) return false;

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  for (const label of labels) {
    if (!label.length || label.length > 63) return false;
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)) return false;
  }

  const tld = labels[labels.length - 1]!;
  if (tld.length < 2) return false;

  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  if (local.length === 1) {
    return /^[A-Za-z0-9]$/.test(local);
  }

  return /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?$/.test(local);
}
