'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import PRApprovalDetail from '@/components/pr-approval/PRApprovalDetail';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PRApprovalDetailPage() {
  usePageTitle();
  const params = useParams();
  const raw = params?.uuid;
  const uuid = Array.isArray(raw) ? raw[0] : raw;
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!uuid || typeof uuid !== 'string') {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-slate-600 dark:text-slate-400">Invalid PR link.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PRApprovalDetail theme={theme} uuid={decodeURIComponent(uuid)} />
    </AppLayout>
  );
}
