'use client';

import AppLayout from '@/components/AppLayout';
import GenericView from '@/components/GenericView';
import { useTheme } from '@/contexts/ThemeContext';
import { ViewType } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function LABOUR_MANAGEMENTPage() {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <GenericView theme={theme} currentView={ViewType.LABOUR_MANAGEMENT} />
    </AppLayout>
  );
}
