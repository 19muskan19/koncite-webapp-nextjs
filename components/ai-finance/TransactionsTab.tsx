'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KONCITE_FINANCE_DATA_CHANGED } from '@/constants/aiFinance';
import { RotateCcw, CheckCircle2, Clock, CreditCard, Ban } from 'lucide-react';
import { financeAPI, formatCurrency, type Transaction, type Party, type Project } from '@/services/financeApi';
import PaymentModal from './PaymentModal';
import { cn } from '@/utils/cn';

interface TransactionsTabProps {
  isDark: boolean;
  searchQuery?: string;
  onSearchReset?: () => void;
}

export default function TransactionsTab({ isDark, searchQuery = '', onSearchReset }: TransactionsTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [partyFilter, setPartyFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentModalTx, setPaymentModalTx] = useState<Transaction | null>(null);

  const effectiveSearch = searchQuery?.trim() || undefined;
  const load = useCallback(() => {
    financeAPI
      .getTransactions({
        search: effectiveSearch,
        type: typeFilter,
        partyId: partyFilter || undefined,
        projectId: projectFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      .then(setTransactions);
  }, [effectiveSearch, typeFilter, partyFilter, projectFilter, fromDate, toDate]);

  useEffect(() => {
    financeAPI.getParties().then(setParties);
    financeAPI.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener(KONCITE_FINANCE_DATA_CHANGED, load);
    return () => window.removeEventListener(KONCITE_FINANCE_DATA_CHANGED, load);
  }, [load]);

  const resetFilters = () => {
    setTypeFilter('all');
    setPartyFilter('');
    setProjectFilter('');
    setFromDate('');
    setToDate('');
    onSearchReset?.();
  };

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputClass = cn('px-3 py-2 rounded-lg border text-sm font-bold transition-colors focus:ring-2 focus:ring-[#C2D642]/30 focus:border-[#C2D642] outline-none', isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900');

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={cn(inputClass, 'w-full')}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className={cn(inputClass, 'w-full')}>
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={cn(inputClass, 'w-full')}>
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="grid grid-cols-2 gap-3 sm:flex-1 sm:max-w-[280px]">
            <div className="flex flex-col gap-1">
              <label className={cn('text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-600')}>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={cn('text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-600')}>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <button onClick={resetFilters} className={cn('flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg border font-bold text-sm transition-colors w-full sm:w-auto', isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-[#C2D642]/30' : 'border-slate-300 text-slate-600 hover:bg-slate-200 hover:border-[#C2D642]/30')}>
            <RotateCcw className="w-4 h-4 shrink-0" /> Reset
          </button>
        </div>
      </div>

      <div className={cn('rounded-xl border overflow-hidden transition-colors hover:border-[#C2D642]/20', cardClass)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={cn('uppercase tracking-wider text-xs font-bold', isDark ? 'bg-slate-800/80 text-slate-200' : 'bg-slate-100 text-slate-700')}>
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Party</th>
                <th className="text-left p-3">Project</th>
                <th className="text-left p-3">Item</th>
                <th className="text-left p-3">Remarks</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Paid/Recv</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className={cn(isDark ? 'text-slate-300' : 'text-slate-700')}>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-slate-200 dark:border-slate-700 transition-colors hover:bg-[#C2D642]/5 dark:hover:bg-[#C2D642]/10">
                  <td className="p-3">{t.date}</td>
                  <td className="p-3">{t.party}</td>
                  <td className="p-3">{t.project}</td>
                  <td className="p-3">{t.item}</td>
                  <td className="p-3 max-w-[120px] truncate">{t.remarks || '—'}</td>
                  <td className="p-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', t.type === 'income' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400')}>{t.type}</span>
                  </td>
                  <td className="p-3 text-right font-mono">{formatCurrency(t.total)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(t.paid ?? t.received ?? t.total - t.balance)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(t.balance)}</td>
                  <td className="p-3 text-left">
                    {t.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : t.status === 'cancelled' ? (
                      <Ban className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </td>
                  <td className="p-3">
                    <button onClick={() => setPaymentModalTx(t)} className="flex items-center gap-1 px-2 py-1 rounded bg-[#C2D642]/20 text-[#C2D642] hover:bg-[#C2D642]/35 hover:ring-1 hover:ring-[#C2D642]/50 text-xs font-semibold transition-all">
                      <CreditCard className="w-3.5 h-3.5" /> Payments
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalTx && <PaymentModal transaction={paymentModalTx} onClose={() => setPaymentModalTx(null)} onSaved={() => { setPaymentModalTx(null); load(); }} isDark={isDark} />}
    </div>
  );
}
