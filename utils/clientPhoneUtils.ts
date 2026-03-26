/**
 * Project edit API often returns client_phone as full digits (e.g. 918529630147) with country_code null.
 * Derive dial code prefix and 10-digit national mobile.
 */
export function parseClientPhonePartsFromApi(
  countryCode: string | null | undefined,
  clientPhoneFull: string | null | undefined,
  clientMobile: string | null | undefined
): { dialCode: string; mobile10: string } {
  const existingDial = String(countryCode ?? '')
    .replace(/\D/g, '')
    .trim();
  const digitsFull = String(clientPhoneFull ?? '').replace(/\D/g, '');
  const mobileRaw = String(clientMobile ?? '').replace(/\D/g, '');

  if (existingDial) {
    const m = mobileRaw.length >= 10 ? mobileRaw.slice(-10) : mobileRaw;
    return { dialCode: existingDial, mobile10: m };
  }
  if (digitsFull.length >= 11) {
    return {
      dialCode: digitsFull.slice(0, digitsFull.length - 10),
      mobile10: digitsFull.slice(-10),
    };
  }
  if (digitsFull.length === 10) {
    return { dialCode: '', mobile10: digitsFull };
  }
  if (mobileRaw.length >= 10) {
    return { dialCode: '', mobile10: mobileRaw.slice(-10) };
  }
  if (mobileRaw.length > 0) {
    return { dialCode: '', mobile10: mobileRaw.slice(0, 10) };
  }
  return { dialCode: '', mobile10: '' };
}
