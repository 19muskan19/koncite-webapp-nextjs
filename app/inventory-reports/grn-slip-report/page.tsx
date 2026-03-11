'use client';

import AppLayout from '@/components/AppLayout';
import GRNSlipReport from '@/components/inventory-reports/GRNSlipReport';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function GRNSlipReportPage() {
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
      <GRNSlipReport theme={theme} />
    </AppLayout>
  );
}
