'use client';

import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]"></div>
    </div>
  ),
  ssr: false,
});

export default function DashboardPage() {
  usePageTitle();
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
      <Dashboard theme={theme} />
    </AppLayout>
  );
}
