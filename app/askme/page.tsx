'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import AskMeChat from '@/components/ask-me/AskMeChat';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AskMePage() {
  usePageTitle();
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
      <div className="h-[calc(100vh-3.5rem)] min-h-0 flex flex-col">
        <div className="max-w-3xl w-full mx-auto flex-1 min-h-0 flex flex-col py-2">
          <AskMeChat />
        </div>
      </div>
    </AppLayout>
  );
}
