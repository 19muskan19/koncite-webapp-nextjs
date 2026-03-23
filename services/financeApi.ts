/**
 * AI Finance Service - LocalStorage-based (no APIs)
 * All data is stored in localStorage under the ai-finance-* keys.
 */

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
  status: 'completed' | 'pending';
  category?: string;
}

export interface ChartDataPoint {
  date: string;
  amount: number;
  name?: string;
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

interface StoredPayment extends Payment {
  transactionId: string;
}

const STORAGE_KEYS = {
  transactions: 'ai-finance-transactions',
  parties: 'ai-finance-parties',
  projects: 'ai-finance-projects',
  payments: 'ai-finance-payments',
} as const;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Default seed data for first load
const SEED_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2025-03-15', party: 'Global Steel Ltd', partyId: '1', project: 'Skyline Tower', projectId: '1', item: 'Cement', remarks: 'Batch #4521', type: 'expense', total: 45000, paid: 45000, balance: 0, status: 'completed', category: 'Materials' },
  { id: '2', date: '2025-03-14', party: 'ABC Constructions', partyId: '2', project: 'Residency Complex', projectId: '2', item: 'Progress Payment', remarks: 'Milestone 2', type: 'income', total: 250000, received: 250000, balance: 0, status: 'completed', category: 'Revenue' },
  { id: '3', date: '2025-03-13', party: 'Metro Hardware', partyId: '3', project: 'Skyline Tower', projectId: '1', item: 'Tools & Equipment', remarks: 'Monthly rental', type: 'expense', total: 15000, paid: 10000, balance: 5000, status: 'pending', category: 'Equipment' },
  { id: '4', date: '2025-03-12', party: 'XYZ Developers', partyId: '4', project: 'Residency Complex', projectId: '2', item: 'Advance Payment', remarks: 'Phase 1', type: 'income', total: 500000, received: 500000, balance: 0, status: 'completed', category: 'Revenue' },
  { id: '5', date: '2025-03-11', party: 'Labour Contractor', partyId: '5', project: 'Skyline Tower', projectId: '1', item: 'Labour charges', remarks: 'Week 11', type: 'expense', total: 85000, paid: 0, balance: 85000, status: 'pending', category: 'Labour' },
];

const SEED_PARTIES: Party[] = [
  { id: '1', name: 'Global Steel Ltd' },
  { id: '2', name: 'ABC Constructions' },
  { id: '3', name: 'Metro Hardware' },
  { id: '4', name: 'XYZ Developers' },
  { id: '5', name: 'Labour Contractor' },
];

const SEED_PROJECTS: Project[] = [
  { id: '1', name: 'Skyline Tower' },
  { id: '2', name: 'Residency Complex' },
];

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Materials: '#C2D642',
  Labour: '#22c55e',
  Equipment: '#3b82f6',
  Revenue: '#22c55e',
  Other: '#f59e0b',
};

function isClient() {
  return typeof window !== 'undefined';
}

function getStored<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage set failed:', e);
  }
}

function getTransactions(): Transaction[] {
  const stored = getStored<Transaction[]>(STORAGE_KEYS.transactions, []);
  if (stored.length === 0) {
    setStored(STORAGE_KEYS.transactions, SEED_TRANSACTIONS);
    return SEED_TRANSACTIONS;
  }
  return stored;
}

function getParties(): Party[] {
  const stored = getStored<Party[]>(STORAGE_KEYS.parties, []);
  if (stored.length === 0) {
    setStored(STORAGE_KEYS.parties, SEED_PARTIES);
    return SEED_PARTIES;
  }
  return stored;
}

function getProjects(): Project[] {
  const stored = getStored<Project[]>(STORAGE_KEYS.projects, []);
  if (stored.length === 0) {
    setStored(STORAGE_KEYS.projects, SEED_PROJECTS);
    return SEED_PROJECTS;
  }
  return stored;
}

function getPaymentsList(): StoredPayment[] {
  return getStored<StoredPayment[]>(STORAGE_KEYS.payments, []);
}

function computeDashboard(transactions: Transaction[]): DashboardStats {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.total, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.total, 0);
  const receivables = transactions.filter((t) => t.type === 'income' && t.balance > 0).reduce((s, t) => s + t.balance, 0);
  const payables = transactions.filter((t) => t.type === 'expense' && t.balance > 0).reduce((s, t) => s + t.balance, 0);
  const projectIds = new Set(transactions.map((t) => t.projectId || t.project).filter(Boolean));
  return {
    totalIncome: income,
    totalExpense: expense,
    netProfit: income - expense,
    activeProjects: projectIds.size || 1,
    totalReceivables: receivables,
    totalPayables: payables,
    incomeTrend: 12.5,
    expenseTrend: -3.2,
  };
}

function computeChartData(transactions: Transaction[]): ChartDataPoint[] {
  return transactions
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((t) => ({
      date: t.date,
      amount: t.type === 'income' ? t.total : -t.total,
      name: t.party,
    }));
}

function computeExpenseDistribution(transactions: Transaction[]): { name: string; value: number; color: string }[] {
  const byCategory: Record<string, number> = {};
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((s, t) => s + t.total, 0) || 1;
  expenses.forEach((t) => {
    const cat = t.category || 'Other';
    byCategory[cat] = (byCategory[cat] ?? 0) + t.total;
  });
  return Object.entries(byCategory).map(([name, value]) => ({
    name,
    value: Math.round((value / totalExpense) * 100),
    color: EXPENSE_CATEGORY_COLORS[name] || '#64748b',
  }));
}

export const financeAPI = {
  getDashboard: async (): Promise<DashboardStats> => {
    const transactions = getTransactions();
    return computeDashboard(transactions);
  },

  getTransactions: async (params?: {
    search?: string;
    type?: 'all' | 'income' | 'expense';
    partyId?: string;
    projectId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Transaction[]> => {
    let list = [...getTransactions()];
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.remarks ?? '').toLowerCase().includes(q) ||
          (t.item ?? '').toLowerCase().includes(q) ||
          (t.party ?? '').toLowerCase().includes(q) ||
          (t.project ?? '').toLowerCase().includes(q) ||
          (t.category ?? '').toLowerCase().includes(q)
      );
    }
    if (params?.type && params.type !== 'all') {
      list = list.filter((t) => t.type === params.type);
    }
    if (params?.partyId) list = list.filter((t) => String(t.partyId ?? '') === String(params.partyId));
    if (params?.projectId) list = list.filter((t) => String(t.projectId ?? '') === String(params.projectId));
    if (params?.fromDate) {
      const from = params.fromDate.slice(0, 10);
      list = list.filter((t) => (t.date ?? '').slice(0, 10) >= from);
    }
    if (params?.toDate) {
      const to = params.toDate.slice(0, 10);
      list = list.filter((t) => (t.date ?? '').slice(0, 10) <= to);
    }
    return list;
  },

  getRevenueVsExpenses: async (): Promise<ChartDataPoint[]> => {
    const transactions = getTransactions();
    const data = computeChartData(transactions);
    return data.length > 0 ? data : [{ date: new Date().toISOString().slice(0, 10), amount: 0 }];
  },

  getExpenseDistribution: async (): Promise<{ name: string; value: number; color: string }[]> => {
    const transactions = getTransactions();
    const dist = computeExpenseDistribution(transactions);
    return dist.length > 0 ? dist : [{ name: 'Other', value: 100, color: '#64748b' }];
  },

  getReportsPnl: async (): Promise<{ revenue: number; expenses: number; netProfit: number }> => {
    const stats = await financeAPI.getDashboard();
    return { revenue: stats.totalIncome, expenses: stats.totalExpense, netProfit: stats.netProfit };
  },

  getParties: async (): Promise<Party[]> => getParties(),

  getProjects: async (): Promise<Project[]> => getProjects(),

  getPayments: async (transactionId: string): Promise<Payment[]> => {
    const list = getPaymentsList();
    return list
      .filter((p) => p.transactionId === transactionId)
      .map(({ transactionId: _, ...p }) => p);
  },

  recordPayment: async (payload: {
    transactionId: string;
    amount: number;
    date: string;
    mode: string;
    reference?: string;
  }): Promise<void> => {
    const payments = getPaymentsList();
    const newPayment: StoredPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      transactionId: payload.transactionId,
      amount: payload.amount,
      date: payload.date,
      mode: payload.mode,
      reference: payload.reference,
    };
    payments.push(newPayment);
    setStored(STORAGE_KEYS.payments, payments);

    // Update transaction paid/balance
    const transactions = getTransactions();
    const tx = transactions.find((t) => t.id === payload.transactionId);
    if (tx) {
      const txPayments = payments.filter((p) => p.transactionId === tx.id);
      const totalPaid = txPayments.reduce((s, p) => s + p.amount, 0);
      const newBalance = Math.max(0, tx.total - totalPaid);
      tx.balance = newBalance;
      if (tx.type === 'expense') {
        tx.paid = totalPaid;
      } else {
        tx.received = totalPaid;
      }
      tx.status = newBalance <= 0 ? 'completed' : 'pending';
      setStored(STORAGE_KEYS.transactions, transactions);
    }
  },

  createTransaction: async (payload: Partial<Transaction>): Promise<Transaction> => {
    const transactions = getTransactions();
    const parties = getParties();
    const projects = getProjects();
    const partyName = payload.party ?? 'Unknown';
    const projectName = payload.project ?? 'General';

    // Auto-add party if new (e.g. "AI Entry")
    let partyId = payload.partyId;
    if (!parties.some((p) => p.name === partyName)) {
      const maxP = parties.length ? Math.max(...parties.map((p) => parseInt(p.id, 10) || 0)) : 0;
      const newPartyId = String(maxP + 1);
      parties.push({ id: newPartyId, name: partyName });
      setStored(STORAGE_KEYS.parties, parties);
      partyId = newPartyId;
    } else {
      partyId = partyId ?? parties.find((p) => p.name === partyName)?.id;
    }

    // Auto-add project if new
    let projectId = payload.projectId;
    if (!projects.some((p) => p.name === projectName)) {
      const maxPr = projects.length ? Math.max(...projects.map((p) => parseInt(p.id, 10) || 0)) : 0;
      const newProjectId = String(maxPr + 1);
      projects.push({ id: newProjectId, name: projectName });
      setStored(STORAGE_KEYS.projects, projects);
      projectId = newProjectId;
    } else {
      projectId = projectId ?? projects.find((p) => p.name === projectName)?.id;
    }

    const maxId = transactions.reduce((m, t) => Math.max(m, parseInt(t.id, 10) || 0), 0);
    const id = String(maxId + 1);
    const total = payload.total ?? 0;
    const paid = payload.paid ?? payload.received ?? 0;
    const balance = Math.max(0, total - paid);
    const newTx: Transaction = {
      id,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      party: partyName,
      partyId,
      project: projectName,
      projectId,
      item: payload.item ?? 'Misc',
      remarks: payload.remarks,
      type: payload.type ?? 'expense',
      total,
      paid: payload.type === 'expense' ? paid : undefined,
      received: payload.type === 'income' ? paid : undefined,
      balance,
      status: balance <= 0 ? 'completed' : 'pending',
      category: payload.category ?? 'Other',
    };
    transactions.push(newTx);
    setStored(STORAGE_KEYS.transactions, transactions);
    return newTx;
  },
};

export { formatCurrency };
