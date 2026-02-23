'use client';

import AppLayout from '@/components/AppLayout';
import DPR from '@/components/work-progress-reports/DPR';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function DPRLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#C2D642]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <DPR theme={theme} />
      {children}
    </AppLayout>
  );
}
