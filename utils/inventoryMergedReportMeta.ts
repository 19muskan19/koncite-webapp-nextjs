import type { InventoryReportMeta } from '@/types/inventoryReportMeta';

type CompanyLike = { name?: string; logo?: string | null } | null;

type ProjectRow = { id: string | number; name: string };

/**
 * Merge API `meta` with signed-in company and selected project/subproject from UI
 * so PDF/Print stay populated when the API omits `meta`.
 */
export function mergeInventoryReportMeta(params: {
  reportMeta: InventoryReportMeta | null;
  userCompany: CompanyLike;
  projects: ProjectRow[];
  selectedProject: string;
  selectedSubProject?: string;
  subprojects?: ProjectRow[];
  /** `single`: one YYYY-MM-DD column; `range`: from–to; `none`: API / empty */
  dateMode: 'none' | 'single' | 'range';
  selectDate?: string;
  fromDate?: string;
  toDate?: string;
}): InventoryReportMeta | null {
  const {
    reportMeta: api,
    userCompany,
    projects,
    selectedProject,
    selectedSubProject,
    subprojects,
    dateMode,
    selectDate,
    fromDate,
    toDate,
  } = params;

  const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
  const sub =
    selectedSubProject && subprojects?.length
      ? subprojects.find((s) => String(s.id) === String(selectedSubProject))
      : undefined;

  const companyName = (api?.company?.name?.trim() || userCompany?.name?.trim() || '').trim();
  const companyLogo =
    api?.company?.logo != null && String(api.company.logo).trim() ? api.company.logo : userCompany?.logo ?? null;

  const projectName = (api?.project?.name?.trim() || proj?.name?.trim() || '').trim();
  const projectLogo = api?.project?.logo ?? null;

  const subName = (
    selectedSubProject && subprojects?.length
      ? api?.subProject?.name?.trim() || sub?.name?.trim() || ''
      : api?.subProject?.name?.trim() || ''
  ).trim();
  const subLogo = api?.subProject?.logo ?? null;

  const selectedDate =
    api?.selectedDate && (api.selectedDate.from || api.selectedDate.to || api.selectedDate.date)
      ? api.selectedDate
      : dateMode === 'single' && selectDate && selectDate.length >= 10
        ? { from: selectDate.slice(0, 10), to: selectDate.slice(0, 10) }
        : dateMode === 'range' && fromDate && fromDate.length >= 10 && toDate && toDate.length >= 10
          ? { from: fromDate.slice(0, 10), to: toDate.slice(0, 10) }
          : api?.selectedDate;

  if (!companyName && !projectName && !subName && !companyLogo && !projectLogo && !subLogo) {
    return null;
  }

  return {
    ...(companyName || companyLogo
      ? { company: { name: companyName || undefined, logo: typeof companyLogo === 'string' ? companyLogo : null } }
      : {}),
    ...(projectName || projectLogo
      ? {
          project: {
            id: api?.project?.id ?? (proj?.id != null ? Number(proj.id) : null),
            name: projectName || undefined,
            logo: projectLogo,
          },
        }
      : {}),
    ...(subName || subLogo
      ? {
          subProject: {
            id: api?.subProject?.id ?? (sub?.id != null ? Number(sub.id) : null),
            name: subName || undefined,
            logo: subLogo,
          },
        }
      : {}),
    ...(selectedDate ? { selectedDate } : {}),
  };
}

/** Company-only merge (e.g. Global Stock) when there is no project-scoped API `meta`. */
export function mergeCompanyOnlyMeta(userCompany: CompanyLike): InventoryReportMeta | null {
  const companyName = (userCompany?.name?.trim() || '').trim();
  const companyLogo = userCompany?.logo ?? null;
  if (!companyName && !companyLogo) return null;
  return {
    company: {
      name: companyName || undefined,
      logo: typeof companyLogo === 'string' ? companyLogo : null,
    },
  };
}

/**
 * Project-scoped reports without API `meta` (e.g. Project Stock Statement fallbacks).
 */
export function mergeProjectScopedMeta(params: {
  userCompany: CompanyLike;
  projects: ProjectRow[];
  selectedProject: string;
}): InventoryReportMeta | null {
  const { userCompany, projects, selectedProject } = params;
  const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
  const companyName = (userCompany?.name?.trim() || '').trim();
  const companyLogo = userCompany?.logo ?? null;
  const projectName = (proj?.name?.trim() || '').trim();
  if (!companyName && !projectName && !companyLogo) return null;
  return {
    ...(companyName || companyLogo
      ? { company: { name: companyName || undefined, logo: typeof companyLogo === 'string' ? companyLogo : null } }
      : {}),
    ...(projectName
      ? { project: { id: proj?.id != null ? Number(proj.id) : null, name: projectName } }
      : {}),
  };
}
