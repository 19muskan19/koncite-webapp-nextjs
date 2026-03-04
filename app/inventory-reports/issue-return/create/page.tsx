'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GoodsReturnFlow from '@/components/inventory-reports/GoodsReturnFlow';
import { useAuth } from '@/hooks/useAuth';

function GoodsReturnCreateContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isChecking } = useAuth();
  const projectId = searchParams?.get('projectId') ?? '';
  const projectName = searchParams?.get('projectName') ?? '';
  const projectNumericId = searchParams?.get('projectNumericId') ?? '';

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8E23]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <GoodsReturnFlow
      mode="create"
      projectId={projectId || undefined}
      projectName={projectName || undefined}
      projectNumericId={projectNumericId || undefined}
    />
  );
}

export default function GoodsReturnCreatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8E23]" />
      </div>
    }>
      <GoodsReturnCreateContent />
    </Suspense>
  );
}
