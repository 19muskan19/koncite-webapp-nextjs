'use client';

import React from 'react';
import { LayoutDashboard, Receipt, BarChart3, Users, FolderKanban, Menu, X, Banknote } from 'lucide-react';
import { cn } from '@/utils/cn';

export type FinanceTab = 'dashboard' | 'transactions' | 'reports' | 'parties' | 'projects';

const navItems: { id: FinanceTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'parties', label: 'Parties', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
];

interface AIFinanceSidebarProps {
  activeTab: FinanceTab;
  onTabChange: (tab: FinanceTab) => void;
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
}

export default function AIFinanceSidebar({ activeTab, onTabChange, collapsed, onToggle, isDark }: AIFinanceSidebarProps) {
  return (
    <aside className={cn('flex flex-col border-r transition-all duration-300 flex-shrink-0', collapsed ? 'w-20' : 'w-[280px]', isDark ? 'sidebar-dark' : 'sidebar-light')}>
        <div className={cn('p-4 border-b flex items-center justify-between', isDark ? 'border-[#2d2d2d]' : 'border-slate-200')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#C2D642] flex items-center justify-center shadow-sm">
              <Banknote className="w-5 h-5 text-slate-900" />
            </div>
            <span className={cn('font-black', isDark ? 'text-white' : 'text-slate-900')}>ai-finance</span>
          </div>
        )}
        <button onClick={onToggle} className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-[#C2D642]/15 text-slate-300 hover:text-[#C2D642]' : 'hover:bg-[#C2D642]/10 text-slate-600 hover:text-slate-900')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
              activeTab === id
                ? 'bg-[#C2D642] text-slate-900 shadow-sm'
                : isDark
                  ? 'text-white hover:bg-[#C2D642]/15 hover:text-[#C2D642] border-l-2 border-transparent hover:border-[#C2D642]/50'
                  : 'text-slate-600 hover:bg-[#C2D642]/10 hover:text-slate-900 border-l-2 border-transparent hover:border-[#C2D642]/40'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
