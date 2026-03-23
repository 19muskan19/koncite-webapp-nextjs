'use client';

import React from 'react';
import { Search, Bot } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AIFinanceHeaderProps {
  activeTab: string;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onOpenAIChat: () => void;
  isDark: boolean;
}

export default function AIFinanceHeader({ activeTab, searchQuery, onSearchChange, onOpenAIChat, isDark }: AIFinanceHeaderProps) {
  const title = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-inherit')}>
      <div>
        <h1 className={cn('text-lg sm:text-xl font-black tracking-tight', textPrimary)}>{title}</h1>
        <p className={cn('text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5', textSecondary)}>Manage your construction finances with AI</p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-md w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="search"
            placeholder={activeTab === 'transactions' ? 'Search remarks, items, parties...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-bold transition-colors focus:ring-2 focus:ring-[#C2D642]/40 focus:border-[#C2D642] outline-none',
              isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500'
            )}
          />
        </div>
        <button
          onClick={onOpenAIChat}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm hover:bg-[#A8B838] hover:shadow-lg hover:shadow-[#C2D642]/25 transition-all duration-200 w-full sm:w-auto"
        >
          <Bot className="w-4 h-4" />
          AI Assistant
        </button>
      </div>
    </header>
  );
}
