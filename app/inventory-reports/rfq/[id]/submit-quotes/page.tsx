'use client';

import { useParams } from 'next/navigation';
import SubmitQuotes from '@/components/inventory-reports/SubmitQuotes';
import { useAuth } from '@/hooks/useAuth';

export default function RfqSubmitQuotesPage() {
  const params = useParams();
  const { isAuthenticated, isChecking } = useAuth();
  const rfqId = params?.id as string | undefined;

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

  return <SubmitQuotes mode="edit" rfqId={rfqId} />;
}
