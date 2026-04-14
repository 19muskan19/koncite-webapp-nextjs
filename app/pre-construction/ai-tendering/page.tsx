'use client';

import AiTendering from '@/components/ai-tendering';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AiTenderingPage() {
  usePageTitle();
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
      <div className="min-h-0">
        <AiTendering />
      </div>
    </AppLayout>
  );
}
