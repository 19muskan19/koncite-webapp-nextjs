/** Shared AI Finance configuration (no demo business data). */

export const AI_FINANCE_APP_LABEL = 'AI Finance';

export const AI_FINANCE_ASSISTANT_BRAND_LABEL = 'Financial assistant';

export const AI_FINANCE_HEADER_SUBTITLE = 'Finance overview and transactions';

/** Party name used when a transaction is created from the assistant and no party was extracted. */
export const AI_FINANCE_ASSISTANT_PARTY_FALLBACK = 'Assistant entry';

export const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit Card'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** Chart colors keyed by expense category name; unknown categories get `DEFAULT_CHART_COLOR`. */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Materials: '#C2D642',
  Labour: '#22c55e',
  Equipment: '#3b82f6',
  Revenue: '#22c55e',
  Other: '#f59e0b',
};

export const DEFAULT_EXPENSE_CHART_COLOR = '#64748b';

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

