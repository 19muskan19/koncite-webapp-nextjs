/**
 * Laravel finance + AI agent HTTP layer (Bearer via apiClient).
 * Envelope: { status, response_code, message, data }
 */

import apiClient from './apiClient';
import type { AxiosError } from 'axios';

export interface FinanceTransactionRow {
  id: number;
  uuid?: string;
  company_id?: number;
  project_id?: number | string | null;
  project?: { id?: number; uuid?: string; project_name?: string } | null;
  user_id?: number;
  user_name?: string;
  party?: string | null;
  transaction_type: 'income' | 'expense' | string;
  transaction_date: string;
  item?: string | null;
  remarks_narration?: string | null;
  total_amount: number | string;
  paid_amount?: number | string | null;
  balance_amount?: number | string | null;
  currency?: string | null;
  status: string;
  cost_code?: string | null;
  invoice_no?: string | null;
  conversion_rate?: number | string | null;
  invoice_azure_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceListMeta {
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
}

export interface FinanceTotalsSide {
  count?: number;
  total_amount?: number | string;
  paid_amount?: number | string;
  balance_amount?: number | string;
}

export interface FinanceSummaryData {
  totals_by_type?: {
    income?: FinanceTotalsSide;
    expense?: FinanceTotalsSide;
  };
  net_amount?: number | string;
  pending_partial_count?: number;
  total_receivables?: number | string;
  total_payables?: number | string;
  by_cost_code?: Array<{
    cost_code?: string | null;
    transaction_type?: string;
    txn_count?: number;
    total_amount?: number | string;
  }>;
}

export interface FinanceTimeseriesPoint {
  date: string;
  income?: number | string;
  expense?: number | string;
}

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function pickEnvelopeData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body && (body as { data: unknown }).data !== undefined) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function assertFinanceEnvelopeOk(body: unknown): void {
  if (!body || typeof body !== 'object') return;
  if (!('status' in body)) return;
  const s = (body as { status?: boolean }).status;
  if (s === false) {
    const msg = (body as { message?: string }).message || 'Finance request failed';
    throw new Error(msg);
  }
}

export function financeErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Request failed';
  const ax = err as AxiosError<{ message?: string; error?: string }>;
  const d = ax.response?.data;
  if (d && typeof d === 'object') {
    if (typeof d.message === 'string' && d.message) return d.message;
    if (typeof d.error === 'string' && d.error) return d.error;
  }
  if (ax.message) return ax.message;
  return 'Request failed';
}

export async function financeListTransactions(params?: {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  project_id?: string | number;
  transaction_type?: 'expense' | 'income';
  status?: 'pending' | 'partial' | 'paid' | 'cancelled';
  cost_code?: string;
  search?: string;
}): Promise<{ items: FinanceTransactionRow[]; meta: FinanceListMeta }> {
  const { data: raw } = await apiClient.get<unknown>('/finance/transactions', {
    params: { ...params, per_page: params?.per_page ?? 200, page: params?.page ?? 1 },
  });
  assertFinanceEnvelopeOk(raw);
  const data = pickEnvelopeData<{ items?: FinanceTransactionRow[]; meta?: FinanceListMeta }>(raw);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    meta: data?.meta && typeof data.meta === 'object' ? data.meta : {},
  };
}

export async function financeGetTransaction(identifier: string): Promise<FinanceTransactionRow> {
  const { data: raw } = await apiClient.get<unknown>(`/finance/transactions/${encodeURIComponent(identifier)}`);
  assertFinanceEnvelopeOk(raw);
  return pickEnvelopeData<FinanceTransactionRow>(raw);
}

export async function financeSummary(params?: {
  date_from?: string;
  date_to?: string;
  project_id?: string | number;
}): Promise<FinanceSummaryData> {
  const { data: raw } = await apiClient.get<unknown>('/finance/summary', { params });
  assertFinanceEnvelopeOk(raw);
  return pickEnvelopeData<FinanceSummaryData>(raw);
}

export async function financeTimeseries(params: {
  date_from: string;
  date_to: string;
  project_id?: string | number;
}): Promise<FinanceTimeseriesPoint[]> {
  const { data: raw } = await apiClient.get<unknown>('/finance/timeseries', { params });
  assertFinanceEnvelopeOk(raw);
  const data = pickEnvelopeData<{ series?: FinanceTimeseriesPoint[] }>(raw);
  return Array.isArray(data?.series) ? data.series : [];
}

export async function financeBookTransaction(body: {
  party: string;
  transaction_type: 'income' | 'expense';
  transaction_date: string;
  item?: string;
  remarks_narration?: string;
  total_amount: number;
  project_id?: string | number | null;
  currency?: string;
  status?: string;
  paid_amount?: number;
  cost_code?: string;
  invoice_no?: string;
  conversion_rate?: number;
  invoice_azure_path?: string;
}): Promise<FinanceTransactionRow> {
  const { data: raw } = await apiClient.post<unknown>('/finance/book', body);
  assertFinanceEnvelopeOk(raw);
  return pickEnvelopeData<FinanceTransactionRow>(raw);
}

export async function financePatchTransaction(
  identifier: string,
  body: Record<string, unknown>
): Promise<FinanceTransactionRow> {
  const { data: raw } = await apiClient.patch<unknown>(
    `/finance/transactions/${encodeURIComponent(identifier)}`,
    body
  );
  assertFinanceEnvelopeOk(raw);
  return pickEnvelopeData<FinanceTransactionRow>(raw);
}

export async function financeDeleteTransaction(identifier: string): Promise<{ id?: number; uuid?: string }> {
  const { data: raw } = await apiClient.delete<unknown>(`/finance/transactions/${encodeURIComponent(identifier)}`);
  assertFinanceEnvelopeOk(raw);
  return pickEnvelopeData<{ id?: number; uuid?: string }>(raw);
}

/** Unique projects from a listing (for filter dropdowns). */
export function distinctProjectsFromRows(rows: FinanceTransactionRow[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const pid = r.project?.id ?? r.project_id;
    if (pid == null || pid === '') continue;
    const id = String(pid);
    const name = r.project?.project_name?.trim() || `Project ${id}`;
    if (!map.has(id)) map.set(id, name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct party names for filter dropdowns. */
export function distinctPartiesFromRows(rows: FinanceTransactionRow[]): Array<{ id: string; name: string }> {
  const set = new Set<string>();
  for (const r of rows) {
    const p = (r.party ?? '').trim();
    if (p) set.add(p);
  }
  return [...set].sort().map((name) => ({ id: name, name }));
}

export function summaryTrendsFromTimeseries(
  series: FinanceTimeseriesPoint[]
): { incomeTrend?: number; expenseTrend?: number } {
  const pts = series.filter((p) => p.date);
  if (pts.length < 4) return {};
  const mid = Math.floor(pts.length / 2);
  if (mid < 1) return {};
  const sum = (arr: FinanceTimeseriesPoint[], key: 'income' | 'expense') =>
    arr.reduce((s, p) => s + num(p[key]), 0);
  const i1 = sum(pts.slice(0, mid), 'income');
  const i2 = sum(pts.slice(mid), 'income');
  const e1 = sum(pts.slice(0, mid), 'expense');
  const e2 = sum(pts.slice(mid), 'expense');
  const pct = (a: number, b: number) => (a > 0 ? ((b - a) / a) * 100 : undefined);
  return {
    ...(pct(i1, i2) != null ? { incomeTrend: pct(i1, i2)! } : {}),
    ...(pct(e1, e2) != null ? { expenseTrend: pct(e1, e2)! } : {}),
  };
}

export function expenseDistributionFromSummary(
  summary: FinanceSummaryData,
  expenseColor: (code: string, index: number) => string
): { name: string; value: number; color: string }[] {
  const rows = summary.by_cost_code?.filter((r) => String(r.transaction_type).toLowerCase() === 'expense') ?? [];
  const amounts = rows.map((r) => num(r.total_amount));
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return rows.map((r, index) => {
    const label = (r.cost_code?.trim() || 'Uncoded').trim();
    const v = num(r.total_amount);
    return {
      name: label,
      value: Math.round((v / total) * 100),
      color: expenseColor(label, index),
    };
  });
}
