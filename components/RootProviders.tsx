'use client';

import ClientThemeProvider from '@/components/ClientThemeProvider';
import { UserProvider } from '@/contexts/UserContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';

/**
 * Single client boundary for the root layout so heavy providers (and api.ts) load in their own chunk,
 * avoiding oversized `app/layout` and ChunkLoadError timeouts in dev.
 */
export default function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClientThemeProvider>
      <UserProvider>
        <ProjectsProvider>{children}</ProjectsProvider>
      </UserProvider>
    </ClientThemeProvider>
  );
}
