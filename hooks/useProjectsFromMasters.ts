'use client';

import { useEffect } from 'react';
import { useProjectsContext } from '@/contexts/ProjectsContext';

export type { ProjectOption, SubprojectOption } from '@/contexts/ProjectsContext';

/**
 * Load all projects from masters (GET /project-list).
 * Uses ProjectsContext for caching - fast on refresh.
 */
export function useProjectsFromMasters() {
  const ctx = useProjectsContext();
  if (!ctx) return [];
  return ctx.projects;
}

/**
 * Load subprojects from masters for the given project.
 * Uses ProjectsContext for caching - prefetched for first project.
 */
export function useSubprojectsFromMasters(projectId: string | number | undefined) {
  const ctx = useProjectsContext();
  const subprojects = ctx && projectId ? ctx.getSubprojects(projectId) : [];

  useEffect(() => {
    if (ctx && projectId) ctx.ensureSubprojectsLoaded(projectId);
  }, [ctx, projectId]);

  return subprojects;
}
