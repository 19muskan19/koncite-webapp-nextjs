'use client';

import AppLayout from '@/components/AppLayout';
import AIAgents from '@/components/AIAgents';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const VALID_AGENTS = ['dpr', 'inventory'] as const;
type ValidAgent = (typeof VALID_AGENTS)[number];

function getAgentFromParams(params: Record<string, string | string[] | undefined>): ValidAgent | null {
  const agent = params?.agent;
  if (Array.isArray(agent) && agent.length > 0 && (agent[0] === 'dpr' || agent[0] === 'inventory')) {
    return agent[0] as ValidAgent;
  }
  if (typeof agent === 'string' && (agent === 'dpr' || agent === 'inventory')) {
    return agent as ValidAgent;
  }
  return null;
}

export default function AI_AGENTS_Page() {
  usePageTitle();
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const params = useParams();
  const router = useRouter();

  const agent = getAgentFromParams(params as Record<string, string | string[] | undefined>);

  useEffect(() => {
    if (!isChecking && !agent) {
      router.replace('/ai-agents/dpr');
    }
  }, [agent, isChecking, router]);

  if (isChecking || !agent) {
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
      <AIAgents theme={theme} initialAgent={agent} />
    </AppLayout>
  );
}
