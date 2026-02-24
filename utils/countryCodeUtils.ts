/**
 * Shared country code utilities.
 * Fixes +1 (US/CA/American Samoa) selection - prefer US and Canada over American Samoa.
 */

export interface CountryCodeItem {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

/** Preferred order for countries sharing +1 - US and Canada first */
const PREFERRED_PLUS1 = ['US', 'CA'];

/** Sort country codes; for +1, put US and Canada before American Samoa, etc. */
export function sortCountryCodes<T extends CountryCodeItem>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const nA = parseInt(a.dialCode) || 0;
    const nB = parseInt(b.dialCode) || 0;
    if (nA !== nB) return nA - nB;
    // Same dial code - for +1, prefer US, CA first
    if (a.dialCode === '1') {
      const idxA = PREFERRED_PLUS1.indexOf(a.code);
      const idxB = PREFERRED_PLUS1.indexOf(b.code);
      if (idxA !== -1 || idxB !== -1) {
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        if (orderA !== orderB) return orderA - orderB;
      }
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Find country by dial code. When dial code is +1, prefer US then Canada over American Samoa.
 * Use countryCodeIso when the user explicitly selected a specific country (e.g. US vs CA vs AS).
 */
export function findCountryByDialCode<T extends CountryCodeItem>(
  list: T[],
  dialCode: string,
  countryCodeIso?: string | null
): T | undefined {
  if (!dialCode) return undefined;
  const normalized = String(dialCode).replace(/^\+/, '').trim();
  if (countryCodeIso) {
    const byIso = list.find((c) => c.code === countryCodeIso && c.dialCode === normalized);
    if (byIso) return byIso;
    const byIsoOnly = list.find((c) => c.code === countryCodeIso);
    if (byIsoOnly) return byIsoOnly;
  }
  // For +1, prefer US then CA (avoids defaulting to American Samoa)
  if (normalized === '1') {
    return (
      list.find((c) => c.dialCode === normalized && c.code === 'US') ||
      list.find((c) => c.dialCode === normalized && c.code === 'CA') ||
      list.find((c) => c.dialCode === normalized)
    );
  }
  return list.find((c) => c.dialCode === normalized);
}
