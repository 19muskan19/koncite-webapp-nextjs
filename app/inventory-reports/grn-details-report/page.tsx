'use client';

import AppLayout from '@/components/AppLayout';
import GRNDetailsReport from '@/components/inventory-reports/GRNDetailsReport';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function GRNDetailsReportPage() {
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
      <GRNDetailsReport theme={theme} />
    </AppLayout>
  );
}
