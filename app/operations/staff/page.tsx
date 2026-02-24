'use client';

import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { Users, Sparkles } from 'lucide-react';

export default function StaffComingSoonPage() {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div
          className={`flex flex-col items-center justify-center min-h-[60vh] rounded-2xl border ${
            isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
              isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/15'
            }`}
          >
            <Users className={`w-10 h-10 ${isDark ? 'text-[#C2D642]' : 'text-[#9AAF2E]'}`} />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-[#C2D642]' : 'text-[#9AAF2E]'}`} />
            <span
              className={`text-xl font-bold tracking-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              New feature coming soon
            </span>
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-[#C2D642]' : 'text-[#9AAF2E]'}`} />
          </div>
          <p
            className={`text-sm max-w-md text-center ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Staff management has been moved to Admin → User Management → Teams. Use that section to manage company users and team assignments.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
