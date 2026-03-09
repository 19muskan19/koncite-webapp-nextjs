'use client';

import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DMSAgentChat from '@/components/DMSAgentChat';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParams } from 'next/navigation';

function DMSAgentContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project_id') ?? undefined;
  return (
    <AppLayout>
      <div className="w-full min-h-0 flex-1 flex flex-col min-h-[260px] h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] md:h-[calc(100vh-4.5rem)] max-h-[100dvh]">
        <DMSAgentChat theme={theme} projectId={projectId} />
      </div>
    </AppLayout>
  );
}

export default function DMSAgentPage() {
  usePageTitle('DMS Agent - KONCITE');
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <DMSAgentContent />
    </Suspense>
  );
}
