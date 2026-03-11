'use client';

import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DPRReportView from '@/components/work-progress-reports/DPRReportView';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function DPRReportPage() {
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
      <Suspense fallback={<div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C2D642]" /></div>}>
        <DPRReportView theme={theme} />
      </Suspense>
    </AppLayout>
  );
}
