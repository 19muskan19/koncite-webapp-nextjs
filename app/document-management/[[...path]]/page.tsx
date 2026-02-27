'use client';

import AppLayout from '@/components/AppLayout';
import DocumentManagement from '@/components/DocumentManagement';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DOCUMENT_MANAGEMENTPage() {
  usePageTitle();
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const params = useParams();
  const router = useRouter();
  const rawPath = (params?.path as string[] | undefined) ?? [];
  const pathSegments = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean);

  // Redirect /document-management (no path) to /document-management/office
  useEffect(() => {
    if (pathSegments.length === 0) {
      router.replace('/document-management/office');
    }
  }, [pathSegments.length, router]);

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
      <DocumentManagement theme={theme} initialPathFromUrl={pathSegments} />
    </AppLayout>
  );
}
