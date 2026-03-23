'use client';

import React, { useState } from 'react';
import AIFinanceSidebar, { type FinanceTab } from './AIFinanceSidebar';
import AIFinanceHeader from './AIFinanceHeader';
import DashboardTab from './DashboardTab';
import TransactionsTab from './TransactionsTab';
import ReportsTab from './ReportsTab';
import AIChatDrawer from './AIChatDrawer';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/cn';

interface AIFinanceProps {
  theme: 'dark' | 'light';
}

export default function AIFinance({ theme }: AIFinanceProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const isDark = theme === 'dark';

  const cardClass = isDark ? 'card-dark' : 'card-light';
  return (
    <div className={cn('flex h-full min-h-0', isDark ? 'bg-[#0a0a0a]' : 'bg-[#f8fafc]')}>
      <AIFinanceSidebar activeTab={activeTab} onTabChange={setActiveTab} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} isDark={isDark} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <AIFinanceHeader activeTab={activeTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenAIChat={() => setAiChatOpen(true)} isDark={isDark} />
          <div className="mt-6">
            {activeTab === 'dashboard' && <DashboardTab isDark={isDark} />}
            {activeTab === 'transactions' && <TransactionsTab isDark={isDark} searchQuery={searchQuery} onSearchReset={() => setSearchQuery('')} />}
            {activeTab === 'reports' && <ReportsTab isDark={isDark} />}
            {(activeTab === 'parties' || activeTab === 'projects') && (
              <div className={cn('rounded-xl border p-12 text-center', cardClass)}>
                <p className={cn('font-bold', isDark ? 'text-slate-400' : 'text-slate-600')}>Coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AIChatDrawer isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} isDark={isDark} />
    </div>
  );
}
