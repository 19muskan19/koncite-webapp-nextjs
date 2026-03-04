'use client';

import { useParams } from 'next/navigation';
import GoodsReceiptFlow from '@/components/inventory-reports/GoodsReceiptFlow';
import { useAuth } from '@/hooks/useAuth';

export default function GoodsReceiptEditPage() {
  const params = useParams();
  const { isAuthenticated, isChecking } = useAuth();
  const inwardId = params?.id as string | undefined;

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

  return <GoodsReceiptFlow mode="edit" inwardId={inwardId} />;
}
