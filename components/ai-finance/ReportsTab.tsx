'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { financeAPI, formatCurrency } from '@/services/financeApi';
import { Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ReportsTabProps {
  isDark: boolean;
}

export default function ReportsTab({ isDark }: ReportsTabProps) {
  const [pnl, setPnl] = useState<{ revenue: number; expenses: number; netProfit: number } | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [cashflowData, setCashflowData] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    financeAPI.getReportsPnl().then(setPnl);
    financeAPI.getExpenseDistribution().then((d) => setExpenseBreakdown(d.map((x) => ({ name: x.name, value: x.value }))));
    financeAPI.getRevenueVsExpenses().then((d) => setCashflowData(d.slice(-15).map((x) => ({ date: x.date, amount: x.amount }))));
  }, []);

  if (!pnl) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={cn('rounded-lg border p-4 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark border-emerald-500/40' : 'card-light border-emerald-500/30')}>
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-[#C2D642]/20"><Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" /></div>
            <span className={cn('text-[9px] font-bold uppercase', isDark ? 'text-slate-400' : 'text-slate-600')}>Total Revenue</span>
          </div>
          <p className={cn('mt-1.5 text-lg sm:text-xl font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(pnl.revenue)}</p>
        </div>
        <div className={cn('rounded-lg border p-4 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark border-rose-500/40' : 'card-light border-rose-500/30')}>
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-rose-500/20"><TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" /></div>
            <span className={cn('text-[9px] font-bold uppercase', isDark ? 'text-slate-400' : 'text-slate-600')}>Total Expenses</span>
          </div>
          <p className={cn('mt-1.5 text-lg sm:text-xl font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(pnl.expenses)}</p>
        </div>
        <div className={cn('rounded-lg border p-4 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark border-slate-500/40' : 'card-light border-slate-500/30')}>
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1.5 rounded-md', isDark ? 'bg-slate-600/30' : 'bg-slate-400/20')}><TrendingUp className={cn('w-5 h-5 sm:w-6 sm:h-6', isDark ? 'text-slate-400' : 'text-slate-600')} /></div>
            <span className={cn('text-[9px] font-bold uppercase', isDark ? 'text-slate-400' : 'text-slate-600')}>Net Profit</span>
          </div>
          <p className={cn('mt-1.5 text-lg sm:text-xl font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>{formatCurrency(pnl.netProfit)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn('rounded-xl border p-6 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark' : 'card-light')}>
          <h3 className={cn('text-xs font-black uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>Expense Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseBreakdown} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} width={70} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }} />
                <Bar dataKey="value" fill="#C2D642" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={cn('rounded-xl border p-6 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark' : 'card-light')}>
          <h3 className={cn('text-xs font-black uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>Cashflow Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C2D642" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#C2D642" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Amount']} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }} />
                <Area type="monotone" dataKey="amount" stroke="#C2D642" fill="url(#cashflowGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
