'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import PRProjectUserAllocation from '@/components/pr-approval/PRProjectUserAllocation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

/** Admin: project ↔ user allocation for PR approval (POST /pr-approval-add). */
export default function PRApprovalManagePage() {
  usePageTitle();
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

  return (
    <AppLayout>
      <PRProjectUserAllocation theme={theme} />
    </AppLayout>
  );
}
