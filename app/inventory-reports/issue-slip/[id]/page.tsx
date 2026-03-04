'use client';

import { useParams } from 'next/navigation';
import GoodsIssueFlow from '@/components/inventory-reports/GoodsIssueFlow';
import { useAuth } from '@/hooks/useAuth';

export default function GoodsIssueEditPage() {
  const params = useParams();
  const { isAuthenticated, isChecking } = useAuth();
  const issueId = params?.id as string | undefined;

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

  return <GoodsIssueFlow mode="edit" issueId={issueId} />;
}
