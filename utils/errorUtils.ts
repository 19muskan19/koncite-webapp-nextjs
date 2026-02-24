/**
 * Extracts the exact error message from API errors (including Laravel validation/duplicate messages).
 */
export function getExactErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return String(err.message);
  const data = err.response?.data;
  if (data) {
    if (data.message) return String(data.message);
    if (data.error) return String(data.error);
    const errors = data.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).flat().find((v: any) => v && String(v).trim());
      if (first) return String(first);
    }
  }
  return 'Unknown error';
}
