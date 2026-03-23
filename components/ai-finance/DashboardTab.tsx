'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { financeAPI, type DashboardStats } from '@/services/financeApi';
import StatCard from './StatCard';
import { Wallet, TrendingDown, TrendingUp, FolderKanban, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DashboardTabProps {
  isDark: boolean;
}

export default function DashboardTab({ isDark }: DashboardTabProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);
  const [expenseDist, setExpenseDist] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    financeAPI.getDashboard().then(setStats);
    financeAPI.getRevenueVsExpenses().then((d) => setChartData(d.slice(-10).map((x) => ({ date: x.date, amount: Math.abs(x.amount) }))));
    financeAPI.getExpenseDistribution().then(setExpenseDist);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <StatCard icon={<Wallet className="w-5 h-5" />} title="Total Income" value={stats.totalIncome} trend={stats.incomeTrend} variant="emerald" isDark={isDark} />
        <StatCard icon={<TrendingDown className="w-5 h-5" />} title="Total Expense" value={stats.totalExpense} trend={stats.expenseTrend} variant="rose" isDark={isDark} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} title="Net Profit" value={stats.netProfit} variant="indigo" isDark={isDark} />
        <StatCard icon={<FolderKanban className="w-5 h-5" />} title="Active Projects" value={stats.activeProjects} variant="amber" isDark={isDark} />
        <StatCard icon={<ArrowUpRight className="w-5 h-5" />} title="Total Receivables" value={stats.totalReceivables} variant="emerald" isDark={isDark} />
        <StatCard icon={<ArrowDownRight className="w-5 h-5" />} title="Total Payables" value={stats.totalPayables} variant="rose" isDark={isDark} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn('rounded-xl border p-6 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark' : 'card-light')}>
          <h3 className={cn('text-xs font-black uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>Revenue vs Expenses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis tick={{ fontSize: 11 }} stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Amount']} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }} />
                <Bar dataKey="amount" fill="#C2D642" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={cn('rounded-xl border p-6 transition-all hover:border-[#C2D642]/30', isDark ? 'card-dark' : 'card-light')}>
          <h3 className={cn('text-xs font-black uppercase tracking-widest mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>Expense Distribution</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="h-48 w-full max-w-[280px] flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <Pie data={expenseDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} label={false}>
                    {expenseDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke={isDark ? '#0f172a' : '#fff'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {expenseDist.map((entry, i) => {
                const total = expenseDist.reduce((s, e) => s + e.value, 0);
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={cn('text-xs font-semibold', isDark ? 'text-slate-200' : 'text-slate-800')}>
                      {entry.name} {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
