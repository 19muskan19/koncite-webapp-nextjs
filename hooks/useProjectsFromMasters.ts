'use client';

import { useState, useEffect } from 'react';
import { masterDataAPI } from '@/services/api';

export interface ProjectOption {
  id: string | number;
  name: string;
}

export interface SubprojectOption {
  id: string | number;
  name: string;
}

/**
 * Load all projects from masters (GET /project-list).
 * Use in reports and anywhere project dropdown is needed.
 */
export function useProjectsFromMasters(): ProjectOption[] {
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const arr = await masterDataAPI.getProjects();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setProjects(
          list.map((p: any) => ({
            id: p.id ?? p.project_id ?? p.projects_id,
            name: p.project_name ?? p.name ?? '',
          }))
        );
      } catch {
        setProjects([]);
      }
    };
    load();
  }, []);

  return projects;
}

/**
 * Load subprojects from masters (POST /sub-project-list) for the given project.
 * Use when project is selected and subproject dropdown is needed.
 * Pass projectId as string or number - supports both numeric ID and UUID.
 */
export function useSubprojectsFromMasters(projectId: string | number | undefined): SubprojectOption[] {
  const [subprojects, setSubprojects] = useState<SubprojectOption[]>([]);

  useEffect(() => {
    if (!projectId || projectId === '') {
      setSubprojects([]);
      return;
    }
    const load = async () => {
      try {
        const arr = await masterDataAPI.getSubprojects(projectId);
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setSubprojects(
          list.map((s: any) => ({
            id: s.id ?? s.sub_projects_id,
            name: s.name ?? s.sub_project_name ?? '',
          }))
        );
      } catch {
        setSubprojects([]);
      }
    };
    load();
  }, [projectId]);

  return subprojects;
}
