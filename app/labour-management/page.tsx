'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LABOUR_MANAGEMENTRedirect() {
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();

  useEffect(() => {
    if (!isChecking) {
      if (isAuthenticated) {
        router.replace('/operations/labour');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isChecking, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
}
