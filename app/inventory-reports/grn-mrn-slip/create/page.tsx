'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GoodsReceiptFlow from '@/components/inventory-reports/GoodsReceiptFlow';
import { useAuth } from '@/hooks/useAuth';

function GoodsReceiptCreateContent() {
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
    <GoodsReceiptFlow
      mode="create"
      projectId={projectId || undefined}
      projectName={projectName || undefined}
      projectNumericId={projectNumericId || undefined}
    />
  );
}

export default function GoodsReceiptCreatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8E23]" />
      </div>
    }>
      <GoodsReceiptCreateContent />
    </Suspense>
  );
}
