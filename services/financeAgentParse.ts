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
  /** From invoice / markdown when available */
  invoiceDate?: string;
  invoiceRef?: string;
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

function parseInrAmountString(raw: string): number {
  const cleaned = raw.replace(/[₹\s]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/**
 * When the agent returns markdown prose but no JSON transaction, infer a draft from common labels
 * (electricity bills, etc.) so the Confirm & Save card can still appear.
 */
export function extractTransactionFromAssistText(text: string): ParsedAgentTransaction | undefined {
  if (!text || text.length < 24) return undefined;

  let total = NaN;
  const amtPatterns: RegExp[] = [
    /\*\*Total amount:\*\*\s*\*\*₹?\s*([\d,]+)\*\*/i,
    /\*\*Total amount:\*\*\s*₹?\s*([\d,]+)/i,
    /Total amount:?\s*\*?\*?\s*₹?\s*([\d,]+)/i,
    /(?:^|\n)[-*]\s*\*?\*?Total amount:?\*?\*?\s*[*₹\s]*([\d,]+)/i,
  ];
  for (const re of amtPatterns) {
    const m = text.match(re);
    if (m) {
      total = parseInrAmountString(m[1]);
      if (Number.isFinite(total)) break;
    }
  }
  if (!Number.isFinite(total)) {
    if (/\b(?:Total\s+amount|Invoice\s+total|Amount\s+due)\b/i.test(text)) {
      const loose = text.match(/\b₹\s*([\d,]+)\b/);
      if (loose) total = parseInrAmountString(loose[1]);
    }
  }
  if (!Number.isFinite(total)) return undefined;

  let type: 'income' | 'expense' = 'expense';
  const typeM = text.match(/(?:Transaction type|Type):\*?\*?\s*(income|expense)/i);
  if (typeM) type = typeM[1].toLowerCase() as 'income' | 'expense';

  let party: string | undefined;
  const vp = text.match(
    /(?:Vendor\s*\/\s*Party|Vendor|Party|Supplier):\*?\*?\s*([^\n*]+?)(?:\n|$|\*(?!\*))/i
  );
  if (vp) party = vp[1].replace(/\s+$/, '').trim();

  let item: string | undefined;
  const im = text.match(/(?:Item\s*\/\s*Service|Item|Service):\*?\*?\s*([^\n*]+?)(?:\n|$)/i);
  if (im) item = im[1].trim();

  let category: string | undefined;
  const cm = text.match(/Cost code[^:\n]*:\*?\*?\s*([^\n*]+?)(?:\n|$)/i);
  if (cm) category = cm[1].trim();

  let project: string | undefined;
  const pmA = text.match(/\*\*([^*]+)\*\*\s*\(Project ID:\s*(\d+)\)/);
  const pmB = text.match(/([A-Za-z][^.\n*]{1,80}?)\s*\(Project ID:\s*(\d+)\)/);
  if (pmA) project = `${pmA[1].trim()} (ID ${pmA[2]})`;
  else if (pmB) project = `${pmB[1].trim().replace(/\s+$/, '')} (ID ${pmB[2]})`;
  else {
    const idOnly = text.match(/Project ID:\s*(\d+)/i);
    if (idOnly) project = `(ID ${idOnly[1]})`;
  }

  let invoiceDate: string | undefined;
  const dm = text.match(/Invoice date:?\*?\*?\s*\*?\*?([^*\n]+?)\*?\*?(?:\n|$)/i);
  if (dm) invoiceDate = dm[1].trim();

  let invoiceRef: string | undefined;
  const ir = text.match(
    /(?:Invoice\s*\/\s*Receipt No|Invoice No|Receipt No):\*?\*?\s*([^\n*]+?)(?:\n|$)/i
  );
  if (ir) invoiceRef = ir[1].trim();

  let paid: number | undefined;
  let received: number | undefined;
  const paySt = text.match(/Payment status:?\*?\*?\s*(paid|unpaid|pending)/i);
  if (paySt && paySt[1].toLowerCase() === 'paid') {
    if (type === 'expense') paid = total;
    else received = total;
  }

  return {
    type,
    total,
    paid,
    received,
    category,
    balance: type === 'expense' && paid != null ? Math.max(0, total - paid) : undefined,
    item,
    project,
    party,
    invoiceDate,
    invoiceRef,
  };
}
