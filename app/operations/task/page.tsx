'use client';

import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TaskManagement } from '@/components/task';

export default function TaskPage() {
  usePageTitle();
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <TaskManagement theme={theme} />
      </div>
    </AppLayout>
  );
}
