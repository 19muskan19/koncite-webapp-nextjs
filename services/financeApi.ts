/**
 * AI Finance — Laravel `/finance/*` APIs + dashboard helpers.
 */

import {
  financeListTransactions,
  financeSummary,
  financeTimeseries,
  financeBookTransaction,
  financePatchTransaction,
  financeGetTransaction,
  distinctPartiesFromRows,
  distinctProjectsFromRows,
  summaryTrendsFromTimeseries,
  expenseDistributionFromSummary,
  financeErrorMessage,
  type FinanceTransactionRow,
} from './financeHttpApi';
import {
  DEFAULT_EXPENSE_CHART_COLOR,
  EXPENSE_CATEGORY_COLORS,
  FINANCE_DEFAULT_ITEM,
  FINANCE_DEFAULT_PARTY,
} from '@/constants/aiFinance';
import { masterDataAPI } from './api';

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  activeProjects: number;
  totalReceivables: number;
  totalPayables: number;
  incomeTrend?: number;
  expenseTrend?: number;
}

export interface Transaction {
  id: string;
  uuid?: string;
  date: string;
  party: string;
  partyId?: string;
  project: string;
  projectId?: string;
  item: string;
  remarks?: string;
  type: 'income' | 'expense';
  total: number;
  paid?: number;
  received?: number;
  balance: number;
  status: 'completed' | 'pending' | 'cancelled';
  category?: string;
}

/** Daily income & expense (from `/finance/timeseries`). */
export interface TimeseriesPoint {
  date: string;
  income: number;
  expense: number;
}

export interface Party {
  id: string;
  name: string;
  type?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  mode: string;
  reference?: string;
}

function mapRow(row: FinanceTransactionRow): Transaction {
  const type = String(row.transaction_type).toLowerCase() === 'income' ? 'income' : 'expense';
  const total = num(row.total_amount);
  const paidAmt = num(row.paid_amount);
  const bal =
    row.balance_amount != null && row.balance_amount !== ''
      ? num(row.balance_amount)
      : Math.max(0, total - paidAmt);
  let status: Transaction['status'] = 'pending';
  const rawSt = String(row.status).toLowerCase();
  if (rawSt === 'paid') status = 'completed';
  else if (rawSt === 'cancelled') status = 'cancelled';

  return {
    id: String(row.id),
    uuid: row.uuid,
    date: (row.transaction_date || '').slice(0, 10),
    party: row.party ?? '',
    project: row.project?.project_name ?? '—',
    projectId:
      row.project?.id != null ? String(row.project.id) : row.project_id != null ? String(row.project_id) : undefined,
    item: row.item ?? '',
    remarks: row.remarks_narration ?? undefined,
    type,
    total,
    paid: type === 'expense' ? paidAmt : undefined,
    received: type === 'income' ? paidAmt : undefined,
    balance: bal,
    status,
    category: row.cost_code ?? undefined,
  };
}

function defaultRangeDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/** Map `GET /project-list` rows to finance filter `{ id, name }` (prefer numeric id for `project_id` query). */
function mapMasterProjectToFilter(p: Record<string, unknown>): Project | null {
  const numericId = p.id;
  const uuid = p.uuid;
  const id =
    numericId != null && numericId !== ''
      ? String(numericId)
      : uuid != null && String(uuid).trim() !== ''
        ? String(uuid)
        : '';
  const name = String(p.project_name ?? p.name ?? '').trim();
  if (!id || !name) return null;
  return { id, name };
}

let cachedFilterFetch: Promise<FinanceTransactionRow[]> | null = null;

async function loadRowsForFilters(): Promise<FinanceTransactionRow[]> {
  if (!cachedFilterFetch) {
    cachedFilterFetch = financeListTransactions({ per_page: 200, page: 1 }).then((r) => r.items);
    cachedFilterFetch.finally(() => {
      setTimeout(() => {
        cachedFilterFetch = null;
      }, 30_000);
    });
  }
  return cachedFilterFetch;
}

export const financeAPI = {
  getDashboard: async (): Promise<DashboardStats> => {
    const { from, to } = defaultRangeDays(365);
    const [summary, ts, projectsSource] = await Promise.all([
      financeSummary(),
      financeTimeseries({ date_from: from, date_to: to }),
      financeListTransactions({ per_page: 200, page: 1 }),
    ]);

    const inc = summary.totals_by_type?.income;
    const exp = summary.totals_by_type?.expense;
    const totalIncome = num(inc?.total_amount);
    const totalExpense = num(exp?.total_amount);
    const trends = summaryTrendsFromTimeseries(ts);

    const projectIds = new Set<string>();
    for (const row of projectsSource.items) {
      const pid = row.project?.id ?? row.project_id;
      if (pid != null && pid !== '') projectIds.add(String(pid));
    }

    return {
      totalIncome,
      totalExpense,
      netProfit: num(summary.net_amount ?? totalIncome - totalExpense),
      activeProjects: projectIds.size,
      totalReceivables: num(summary.total_receivables),
      totalPayables: num(summary.total_payables),
      ...trends,
    };
  },

  getTransactions: async (params?: {
    search?: string;
    type?: 'all' | 'income' | 'expense';
    partyId?: string;
    projectId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Transaction[]> => {
    try {
      const apiParams: Parameters<typeof financeListTransactions>[0] = {
        per_page: 200,
        page: 1,
        date_from: params?.fromDate,
        date_to: params?.toDate,
        project_id: params?.projectId,
        search: params?.search,
      };
      if (params?.type && params.type !== 'all') {
        apiParams.transaction_type = params.type;
      }
      const { items } = await financeListTransactions(apiParams);
      let list = items.map(mapRow);
      if (params?.partyId) {
        const want = params.partyId.trim().toLowerCase();
        list = list.filter((t) => t.party.trim().toLowerCase() === want);
      }
      return list;
    } catch (e) {
      throw new Error(financeErrorMessage(e));
    }
  },

  /** Daily series for charts (no derived “net” mixing). */
  getTimeseries: async (days = 90): Promise<TimeseriesPoint[]> => {
    const { from, to } = defaultRangeDays(days);
    const series = await financeTimeseries({ date_from: from, date_to: to });
    return series.map((p) => ({
      date: p.date,
      income: num(p.income),
      expense: num(p.expense),
    }));
  },

  getRevenueVsExpenses: async (): Promise<TimeseriesPoint[]> => {
    return financeAPI.getTimeseries(90);
  },

  getExpenseDistribution: async (): Promise<{ name: string; value: number; color: string }[]> => {
    const summary = await financeSummary();
    return expenseDistributionFromSummary(summary, (code) => EXPENSE_CATEGORY_COLORS[code] || DEFAULT_EXPENSE_CHART_COLOR);
  },

  getReportsPnl: async (): Promise<{ revenue: number; expenses: number; netProfit: number }> => {
    const summary = await financeSummary();
    const inc = summary.totals_by_type?.income;
    const exp = summary.totals_by_type?.expense;
    const revenue = num(inc?.total_amount);
    const expenses = num(exp?.total_amount);
    return {
      revenue,
      expenses,
      netProfit: num(summary.net_amount ?? revenue - expenses),
    };
  },

  getParties: async (): Promise<Party[]> => {
    const rows = await loadRowsForFilters();
    return distinctPartiesFromRows(rows);
  },

  getProjects: async (): Promise<Project[]> => {
    try {
      const raw = await masterDataAPI.getProjectsList();
      if (!Array.isArray(raw)) return [];
      const out: Project[] = [];
      for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const m = mapMasterProjectToFilter(item as Record<string, unknown>);
        if (m) out.push(m);
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    } catch {
      const rows = await loadRowsForFilters();
      return distinctProjectsFromRows(rows);
    }
  },

  getPayments: async (_transactionId: string): Promise<Payment[]> => {
    void _transactionId;
    return [];
  },

  recordPayment: async (payload: {
    transactionId: string;
    amount: number;
    date: string;
    mode: string;
    reference?: string;
  }): Promise<void> => {
    let row: FinanceTransactionRow;
    try {
      row = await financeGetTransaction(payload.transactionId);
    } catch {
      throw new Error('Could not load transaction to update payment');
    }
    const currentPaid = num(row.paid_amount);
    const total = num(row.total_amount);
    const nextPaid = Math.min(total, currentPaid + payload.amount);
    let nextStatus: string | undefined;
    if (nextPaid >= total) nextStatus = 'paid';
    else if (nextPaid > 0) nextStatus = 'partial';

    const remarkNote = [payload.reference, payload.mode, payload.date].filter(Boolean).join(' · ');
    const prevRemarks = row.remarks_narration?.trim() ?? '';
    const remarks_narration = prevRemarks
      ? `${prevRemarks}\n[Paid +${payload.amount} ${remarkNote}]`
      : `[Paid +${payload.amount} ${remarkNote}]`;

    await financePatchTransaction(payload.transactionId, {
      paid_amount: nextPaid,
      ...(nextStatus ? { status: nextStatus } : {}),
      remarks_narration,
    });
  },

  createTransaction: async (payload: Partial<Transaction>): Promise<Transaction> => {
    const party = payload.party ?? FINANCE_DEFAULT_PARTY;
    const type = payload.type ?? 'expense';
    const total = num(payload.total);
    let paid = num(payload.paid ?? payload.received ?? 0);
    if (paid > total) paid = total;

    const body = {
      party,
      transaction_type: type,
      transaction_date: payload.date ?? new Date().toISOString().slice(0, 10),
      item: payload.item ?? FINANCE_DEFAULT_ITEM,
      remarks_narration: payload.remarks,
      total_amount: total,
      project_id: payload.projectId != null && payload.projectId !== '' ? payload.projectId : undefined,
      currency: 'INR',
      status: paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending',
      paid_amount: paid,
      ...(payload.category ? { cost_code: payload.category } : {}),
    };

    const created = await financeBookTransaction(body);
    return mapRow(created);
  },
};

export { formatCurrency, financeErrorMessage };
