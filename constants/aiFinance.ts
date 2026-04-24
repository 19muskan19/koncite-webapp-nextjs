/** Shared AI Finance configuration (no demo business data). */

export const AI_FINANCE_APP_LABEL = 'AI Finance';

export const AI_FINANCE_ASSISTANT_BRAND_LABEL = 'Financial assistant';

export const AI_FINANCE_HEADER_SUBTITLE = 'Finance overview and transactions';

/** Party name used when a transaction is created from the assistant and no party was extracted. */
export const AI_FINANCE_ASSISTANT_PARTY_FALLBACK = 'Assistant entry';

/** UI labels — mapped to API `payment_method`: cash | upi | bank_transfer | cheque | other | credit_card */
export const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit Card', 'Other'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** Chart colors keyed by expense category / cost_code label (exact or case-insensitive). */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Materials: '#C2D642',
  Labour: '#22c55e',
  Equipment: '#3b82f6',
  Revenue: '#22c55e',
  Other: '#f59e0b',
  Uncoded: '#94a3b8',
  'Electrical / Utilities': '#0ea5e9',
  'Civil / Waterproofing': '#f97316',
  'Maintenance / Electrical': '#a855f7',
  Plumbing: '#14b8a6',
};

/** When no explicit mapping exists, cycle by slice index so each segment is distinct. */
export const EXPENSE_CHART_PALETTE = [
  '#C2D642',
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#6366f1',
  '#84cc16',
] as const;

export const DEFAULT_EXPENSE_CHART_COLOR = '#64748b';

export function getExpenseCategoryChartColor(label: string, index: number): string {
  const t = label.trim();
  const direct = EXPENSE_CATEGORY_COLORS[t];
  if (direct) return direct;
  const lower = t.toLowerCase();
  for (const [k, v] of Object.entries(EXPENSE_CATEGORY_COLORS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return EXPENSE_CHART_PALETTE[index % EXPENSE_CHART_PALETTE.length]!;
}

/** Chat / session failure (check auth and `/api/ai-agent` routes). */
export const AI_FINANCE_ASSISTANT_UNAVAILABLE =
  'The financial assistant is unavailable. Ensure you are signed in and the AI agent service is reachable.';

export const AI_FINANCE_INVOICE_UNAVAILABLE =
  'Could not process the uploaded file. Ensure you are signed in and try again.';

export const AI_FINANCE_EMPTY_STATE_HINT =
  'Describe a transaction in chat or attach an invoice. Confirmed drafts can be saved to Finance with Book.';

/** Fallbacks when creating transactions with incomplete payloads */
export const FINANCE_DEFAULT_PARTY = 'Unknown';
export const FINANCE_DEFAULT_PROJECT = 'General';
export const FINANCE_DEFAULT_ITEM = 'Misc';
export const FINANCE_DEFAULT_CATEGORY = 'Other';

/** Browser event: finance ledger changed (e.g. AI assistant booked a transaction). */
export const KONCITE_FINANCE_DATA_CHANGED = 'koncite:finance-data-changed';

export function dispatchFinanceDataChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(KONCITE_FINANCE_DATA_CHANGED));
}

