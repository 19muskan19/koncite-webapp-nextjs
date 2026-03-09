'use client';

import AppLayout from '@/components/AppLayout';
import DMSAgentChat from '@/components/DMSAgentChat';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParams } from 'next/navigation';

export default function DMSAgentPage() {
  usePageTitle('DMS Agent - KONCITE');
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project_id') ?? undefined;

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
    <AppLayout>
      <div className="w-full min-h-0 flex-1 flex flex-col min-h-[260px] p-1.5 sm:p-2 md:p-3 lg:p-4" style={{ height: 'calc(100vh - 4.5rem)', minHeight: 260 }}>
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <DMSAgentChat theme={theme} projectId={projectId} />
        </div>
      </div>
    </AppLayout>
  );
}
