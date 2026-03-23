'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/services/financeApi';
import { cn } from '@/utils/cn';

type Variant = 'emerald' | 'rose' | 'indigo' | 'amber';

const variantStyles: Record<Variant, Record<string, string>> = {
  emerald: { iconBg: 'bg-[#C2D642]/20', icon: 'text-[#C2D642]', trendUp: 'text-emerald-500', trendDown: 'text-rose-500' },
  rose: { iconBg: 'bg-rose-500/20', icon: 'text-rose-500', trendUp: 'text-emerald-500', trendDown: 'text-rose-500' },
  indigo: { iconBg: 'bg-indigo-500/20', icon: 'text-indigo-500', trendUp: 'text-emerald-500', trendDown: 'text-rose-500' },
  amber: { iconBg: 'bg-amber-500/20', icon: 'text-amber-500', trendUp: 'text-emerald-500', trendDown: 'text-rose-500' },
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  trend?: number;
  variant?: Variant;
  isDark?: boolean;
  className?: string;
}

export default function StatCard({ icon, title, value, trend, variant = 'emerald', isDark = false, className }: StatCardProps) {
  const s = variantStyles[variant];
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  return (
    <div className={cn('rounded-lg border p-3 transition-all duration-200 overflow-hidden hover:shadow-md hover:border-[#C2D642]/40', cardClass, className)}>
      <div className="flex flex-col">
        <div className={cn('p-1.5 rounded-md w-fit', s.iconBg)}>{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: cn('w-4 h-4 sm:w-5 sm:h-5', s.icon) })}</div>
        <p className={cn('text-[9px] font-bold uppercase tracking-wide mt-2', textSecondary)}>{title}</p>
        <p className={cn('mt-0.5 text-base sm:text-lg font-black', textPrimary)}>{formatCurrency(value)}</p>
        {trend != null && (
          <div className={cn('mt-0.5 flex items-center gap-0.5 text-xs font-medium', trend >= 0 ? s.trendUp : s.trendDown)}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
