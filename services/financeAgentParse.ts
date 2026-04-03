/**
 * Best-effort parse of a structured finance transaction from AI agent JSON / envelope.
 */

import { extractReplyFromResponse } from './dmsAiService';

/** Unwrap nested Laravel `{ data: { data: … } }` agent payloads. */
export function unwrapAgentPayload(raw: unknown): unknown {
  let cur: unknown = raw;
  for (let i = 0; i < 4; i++) {
    if (!cur || typeof cur !== 'object') break;
    const o = cur as Record<string, unknown>;
    if ('data' in o && o.data != null && typeof o.data === 'object') cur = o.data;
    else break;
  }
  return cur;
}

export type ParsedAgentTransaction = {
  type: 'income' | 'expense';
  total: number;
  paid?: number;
  received?: number;
  category?: string;
  balance?: number;
  item?: string;
  project?: string;
  party?: string;
};

function num(v: unknown): number {
  if (v == null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeTx(tx: Record<string, unknown>): ParsedAgentTransaction | undefined {
  const tRaw = tx.transaction_type ?? tx.type;
  const type = tRaw === 'income' || tRaw === 'expense' ? tRaw : undefined;
  const total = num(tx.total_amount ?? tx.total ?? tx.amount);
  if (!type || !Number.isFinite(total) || total <= 0) return undefined;

  const paidAmt = num(tx.paid_amount);
  const balanceRaw = tx.balance_amount != null ? num(tx.balance_amount) : undefined;
  const balance =
    balanceRaw != null && Number.isFinite(balanceRaw)
      ? balanceRaw
      : Number.isFinite(paidAmt)
        ? Math.max(0, total - paidAmt)
        : undefined;

  const party =
    typeof tx.party === 'string'
      ? tx.party
      : typeof tx.vendor === 'string'
        ? tx.vendor
        : typeof tx.counterparty === 'string'
          ? tx.counterparty
          : undefined;

  const project =
    typeof tx.project === 'string'
      ? tx.project
      : tx.project && typeof tx.project === 'object' && tx.project !== null && 'project_name' in tx.project
        ? String((tx.project as { project_name?: unknown }).project_name ?? '')
        : undefined;

  return {
    type,
    total,
    paid: type === 'expense' && Number.isFinite(paidAmt) ? paidAmt : undefined,
    received: type === 'income' && Number.isFinite(paidAmt) ? paidAmt : undefined,
    category: typeof tx.cost_code === 'string' ? tx.cost_code : typeof tx.category === 'string' ? tx.category : undefined,
    balance: balance != null && Number.isFinite(balance) ? balance : undefined,
    item: typeof tx.item === 'string' ? tx.item : undefined,
    project: project?.trim() ? project : undefined,
    party: party?.trim() ? party : undefined,
  };
}

function tryPickTransaction(o: Record<string, unknown>): ParsedAgentTransaction | undefined {
  const candidates = [
    o.transaction,
    o.parsed_transaction,
    o.parsedTransaction,
    o.proposed_transaction,
    o.book_payload,
    o.data,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const hit = normalizeTx(c as Record<string, unknown>);
      if (hit) return hit;
    }
  }
  const direct = normalizeTx(o);
  return direct ?? undefined;
}

export function extractFinanceTransactionFromAgentResponse(raw: unknown): ParsedAgentTransaction | undefined {
  const unwrapped = unwrapAgentPayload(raw);
  if (!unwrapped || typeof unwrapped !== 'object') return undefined;
  const r = unwrapped as Record<string, unknown>;

  const data = r.data;
  if (data && typeof data === 'object') {
    const hit = tryPickTransaction(data as Record<string, unknown>);
    if (hit) return hit;
  }
  const top = tryPickTransaction(r);
  if (top) return top;

  const reply = extractReplyFromResponse(unwrapped) || extractReplyFromResponse(raw);
  const trimmed = reply.trim();
  if (trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed) as unknown;
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        return tryPickTransaction(j as Record<string, unknown>);
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}
