'use client';

import AppLayout from '@/components/AppLayout';
import GlobalStockDetailsReport from '@/components/inventory-reports/GlobalStockDetailsReport';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function GlobalStockDetailsReportPage() {
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
      <GlobalStockDetailsReport theme={theme} />
    </AppLayout>
  );
}
