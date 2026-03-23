'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { masterDataAPI } from '@/services/api';

export interface ProjectOption {
  id: string | number;
  name: string;
}

export interface SubprojectOption {
  id: string | number;
  name: string;
}

interface ProjectsContextType {
  projects: ProjectOption[];
  getSubprojects: (projectId: string | number) => SubprojectOption[];
  ensureSubprojectsLoaded: (projectId: string | number) => void;
  isProjectsLoading: boolean;
  isSubprojectsLoading: (projectId: string | number) => boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let lastFetchTime = 0;

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { getCookie } = require('../utils/cookies');
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
    return !!(token && authFlag);
  } catch {
    return false;
  }
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [subprojectsCache, setSubprojectsCache] = useState<Map<string, SubprojectOption[]>>(new Map());
  const [subprojectsLoading, setSubprojectsLoading] = useState<Set<string>>(new Set());
  const subprojectsInFlightRef = useRef<Set<string>>(new Set());

  const loadProjects = useCallback(async (force = false) => {
    if (!isAuthenticated()) return;
    const now = Date.now();
    if (!force && projects.length > 0 && now - lastFetchTime < CACHE_TTL_MS) return;

    setIsProjectsLoading(true);
    try {
      const arr = await masterDataAPI.getProjects();
      const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
      const mapped: ProjectOption[] = list.map((p: any) => ({
        id: p.id ?? p.project_id ?? p.projects_id,
        name: p.project_name ?? p.name ?? '',
      }));
      lastFetchTime = Date.now();
      setProjects(mapped);
    } catch {
      setProjects([]);
    } finally {
      setIsProjectsLoading(false);
    }
  }, [projects.length]);

  const refreshProjects = useCallback(async () => {
    lastFetchTime = 0;
    setSubprojectsCache(new Map());
    await loadProjects(true);
  }, [loadProjects]);

  const loadSubprojects = useCallback(async (projectId: string | number) => {
    if (!projectId || projectId === '') return;
    const key = String(projectId);
    if (subprojectsCache.has(key)) return;
    if (subprojectsInFlightRef.current.has(key)) return; // Already fetching
    subprojectsInFlightRef.current.add(key);
    setSubprojectsLoading((prev) => new Set(prev).add(key));
    try {
      const arr = await masterDataAPI.getSubprojects(projectId);
      const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
      const mapped: SubprojectOption[] = list.map((s: any) => ({
        id: s.id ?? s.sub_projects_id,
        name: s.name ?? s.sub_project_name ?? '',
      }));
      setSubprojectsCache((prev) => {
        const next = new Map(prev);
        next.set(key, mapped);
        return next;
      });
    } catch {
      setSubprojectsCache((prev) => {
        const next = new Map(prev);
        next.set(key, []);
        return next;
      });
    } finally {
      subprojectsInFlightRef.current.delete(key);
      setSubprojectsLoading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [subprojectsCache]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Prefetch subprojects for first project when projects load (speeds up dashboard)
  useEffect(() => {
    if (projects.length > 0) {
      const firstId = projects[0]?.id;
      if (firstId && !subprojectsCache.has(String(firstId))) {
        loadSubprojects(firstId);
      }
    }
  }, [projects, subprojectsCache, loadSubprojects]);

  const getSubprojects = useCallback((projectId: string | number): SubprojectOption[] => {
    const key = String(projectId);
    return subprojectsCache.get(key) ?? [];
  }, [subprojectsCache]);

  const ensureSubprojectsLoaded = useCallback((projectId: string | number) => {
    const key = String(projectId);
    if (!key || subprojectsCache.has(key) || subprojectsInFlightRef.current.has(key)) return;
    loadSubprojects(projectId);
  }, [subprojectsCache, loadSubprojects]);

  const isSubprojectsLoadingFn = useCallback((projectId: string | number): boolean => {
    return subprojectsLoading.has(String(projectId));
  }, [subprojectsLoading]);

  const value: ProjectsContextType = {
    projects,
    getSubprojects,
    ensureSubprojectsLoaded,
    isProjectsLoading,
    isSubprojectsLoading: isSubprojectsLoadingFn,
    refreshProjects,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext);
  return ctx;
}
