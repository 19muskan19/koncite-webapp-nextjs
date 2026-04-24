'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2, Search, ChevronDown } from 'lucide-react';
import {
  getWorkers,
  getContractorEntries,
  getTotalOutstanding,
  getWorkerStatusToday,
} from '@/utils/workforceStorage';
import { workforceAPI } from '@/services/api';
import { ThemeType } from '@/types';

const getTodayString = () => new Date().toDateString();

/** Normalize GET /workforce/dashboard body (field names may vary by backend). */
function parseWorkforceDashboardPayload(raw: unknown): {
  totalOutstanding: number;
  onSiteNow: number;
  staffOnSite: number;
  contractorHead: number;
  contractorBreakdown: { name: string; count: number }[];
  statusLabel: string;
} | null {
  if (raw == null || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const o = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
  const num = (v: unknown) => {
    if (v == null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totalOutstanding = num(
    o.total_outstanding ??
      o.totalOutstanding ??
      o.outstanding ??
      o.outstanding_liabilities ??
      o.liability ??
      o.total_liability
  );
  const staffOnSite = num(
    o.staff_on_site ??
      o.staff_on_site_count ??
      o.staff_attendance ??
      o.staffAttendance ??
      o.staff_count_on_site
  );
  const contractorHead = num(
    o.contractor_head ??
      o.contractor_head_count ??
      o.contractor_head_today ??
      o.contractorHead ??
      o.contractor_labour ??
      o.contractor_labor
  );
  let onSiteNow = num(
    o.on_site_now ?? o.onSiteNow ?? o.site_total ?? o.total_on_site ?? o.present_count
  );
  if (onSiteNow <= 0 && (staffOnSite > 0 || contractorHead > 0)) {
    onSiteNow = staffOnSite + contractorHead;
  }
  const statusLabel = String(o.status ?? o.site_status ?? o.health ?? 'Normal').trim() || 'Normal';

  let contractorBreakdown: { name: string; count: number }[] = [];
  const br = o.contractor_breakdown ?? o.contractorBreakdown ?? o.contractors ?? o.contractor_breakdown_list;
  if (Array.isArray(br)) {
    contractorBreakdown = br.map((item: Record<string, unknown>) => ({
      name: String(item.name ?? item.contractor_name ?? item.vendor_name ?? item.label ?? '—'),
      count: num(item.count ?? item.head_count ?? item.labour ?? item.labor ?? item.qty),
    }));
  }

  return {
    totalOutstanding,
    onSiteNow,
    staffOnSite,
    contractorHead,
    contractorBreakdown,
    statusLabel,
  };
}

interface WorkforceDashboardTabProps {
  theme: ThemeType;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  borderClass: string;
  projects?: Array<{ id: number | string; name: string }>;
  /** Required to load live dashboard metrics for the signed-in company */
  companyId?: number | string | null;
}

export default function WorkforceDashboardTab({
  isDark,
  textPrimary,
  textSecondary,
  borderClass,
  projects = [],
  companyId,
}: WorkforceDashboardTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [apiMetrics, setApiMetrics] = useState<ReturnType<typeof parseWorkforceDashboardPayload> | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(() => companyId != null && companyId !== '');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [usedApi, setUsedApi] = useState(false);

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const projectSearchInputRef = useRef<HTMLInputElement>(null);

  const workers = useMemo(() => getWorkers(), []);
  const entries = useMemo(() => getContractorEntries(), []);

  const today = getTodayString();

  const selectedProjectName = useMemo(() => {
    if (!selectedProjectId.trim()) return undefined;
    return projects.find((p) => String(p.id) === String(selectedProjectId))?.name;
  }, [projects, selectedProjectId]);

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProjectId.trim()) return 'All projects';
    return projects.find((p) => String(p.id) === String(selectedProjectId))?.name ?? 'All projects';
  }, [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => String(p.name).toLowerCase().includes(q));
  }, [projects, projectSearch]);

  useEffect(() => {
    if (!projectMenuOpen) {
      setProjectSearch('');
      return;
    }
    const t = window.setTimeout(() => projectSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [projectMenuOpen]);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = projectMenuRef.current;
      if (el && !el.contains(e.target as Node)) setProjectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [projectMenuOpen]);

  const filterByProject = useCallback(
    <T extends { projectName?: string }>(items: T[]) => {
      if (!selectedProjectName) return items;
      return items.filter((i) => i.projectName === selectedProjectName);
    },
    [selectedProjectName]
  );

  const localStaffOnSite = useMemo(() => {
    const filtered = filterByProject(workers);
    return filtered.filter((w) => getWorkerStatusToday(w.id) === 'IN').length;
  }, [workers, filterByProject]);

  const localContractorHeadToday = useMemo(() => {
    const todayEntries = entries.filter((e) => new Date(e.date).toDateString() === today);
    const filtered = selectedProjectName
      ? todayEntries.filter((e) => e.projectName === selectedProjectName)
      : todayEntries;
    return filtered.reduce((sum, e) => sum + e.headCount, 0);
  }, [entries, selectedProjectName, today]);

  const localOnSiteNow = localStaffOnSite + localContractorHeadToday;

  const localContractorBreakdown = useMemo(() => {
    const todayEntries = entries.filter((e) => new Date(e.date).toDateString() === today);
    const filtered = selectedProjectName
      ? todayEntries.filter((e) => e.projectName === selectedProjectName)
      : todayEntries;
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const key = e.contractorName;
      map.set(key, (map.get(key) ?? 0) + e.headCount);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [entries, selectedProjectName, today]);

  useEffect(() => {
    if (companyId == null || companyId === '') {
      setApiMetrics(null);
      setUsedApi(false);
      setDashboardError(null);
      setDashboardLoading(false);
      return;
    }

    let cancelled = false;
    setDashboardLoading(true);
    setDashboardError(null);

    workforceAPI
      .getDashboard({
        company_id: companyId,
        project_id: selectedProjectId.trim() ? selectedProjectId : undefined,
      })
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseWorkforceDashboardPayload(raw);
        if (parsed) {
          setApiMetrics(parsed);
          setUsedApi(true);
        } else {
          setApiMetrics(null);
          setUsedApi(false);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Dashboard request failed';
        setDashboardError(msg);
        setApiMetrics(null);
        setUsedApi(false);
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, selectedProjectId]);

  const staffOnSite = usedApi && apiMetrics ? apiMetrics.staffOnSite : localStaffOnSite;
  const contractorHeadToday = usedApi && apiMetrics ? apiMetrics.contractorHead : localContractorHeadToday;
  const onSiteNow = usedApi && apiMetrics ? apiMetrics.onSiteNow : localOnSiteNow;
  const contractorBreakdown =
    usedApi && apiMetrics && apiMetrics.contractorBreakdown.length > 0
      ? apiMetrics.contractorBreakdown
      : localContractorBreakdown;

  const liability = useMemo(() => {
    if (usedApi && apiMetrics != null) return apiMetrics.totalOutstanding;
    return getTotalOutstanding(selectedProjectName);
  }, [usedApi, apiMetrics, selectedProjectName]);

  const statusDisplay = usedApi && apiMetrics ? apiMetrics.statusLabel : 'Normal';

  const pieData = useMemo(() => {
    const staff = staffOnSite;
    const contractor = contractorHeadToday;
    if (staff === 0 && contractor === 0) {
      return [
        { name: 'Staff', value: 1, color: '#3b82f6' },
        { name: 'Contractor', value: 1, color: '#f97316' },
      ];
    }
    return [
      { name: 'Staff', value: staff || 0.5, color: '#3b82f6' },
      { name: 'Contractor', value: contractor || 0.5, color: '#f97316' },
    ];
  }, [staffOnSite, contractorHeadToday]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-black ${textPrimary}`}>Site Overview</h2>
            {dashboardLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#6B8E23]" aria-hidden /> : null}
          </div>
          <p className={`text-sm ${textSecondary}`}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {companyId != null && companyId !== '' ? (
            <p className={`text-xs mt-1 ${textSecondary}`}>
              {dashboardLoading ? (
                <span>Checking for dashboard data…</span>
              ) : usedApi ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live · Dashboard data available</span>
              ) : (
                <span title={dashboardError ?? undefined}>Preview · Local data only</span>
              )}
            </p>
          ) : (
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Sign in with a company profile to load live dashboard data.
            </p>
          )}
        </div>
        <div className="flex flex-col xs:flex-row xs:items-center gap-2 min-w-0 sm:min-w-[220px]">
          <label htmlFor="workforce-dashboard-project-button" className={`text-sm font-bold ${textSecondary} shrink-0`}>
            Project:
          </label>
          <div className="relative flex-1 min-w-0 max-w-full" ref={projectMenuRef}>
            <button
              id="workforce-dashboard-project-button"
              type="button"
              onClick={() => setProjectMenuOpen((o) => !o)}
              className={`w-full sm:min-w-[180px] flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              aria-expanded={projectMenuOpen}
              aria-haspopup="listbox"
              aria-label="Filter dashboard by project"
            >
              <span className="truncate text-left">{selectedProjectLabel}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {projectMenuOpen ? (
              <div
                role="listbox"
                aria-label="Projects"
                className={`absolute right-0 z-50 mt-1 w-full min-w-[220px] max-w-[min(100vw-2rem,320px)] rounded-lg border shadow-xl overflow-hidden flex flex-col ${
                  isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className={`p-2 border-b shrink-0 ${isDark ? 'border-slate-600 bg-slate-900/95' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="relative">
                    <Search
                      className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textSecondary}`}
                      aria-hidden
                    />
                    <input
                      ref={projectSearchInputRef}
                      type="search"
                      autoComplete="off"
                      placeholder="Search projects…"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className={`w-full pl-9 pr-3 py-2 rounded-md border text-sm ${
                        isDark
                          ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                      aria-label="Search project list"
                    />
                  </div>
                </div>
                <ul className="overflow-y-auto max-h-56 py-1">
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedProjectId === ''}
                      onClick={() => {
                        setSelectedProjectId('');
                        setProjectMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                        selectedProjectId === ''
                          ? isDark
                            ? 'bg-[#C2D642]/20 text-[#C2D642]'
                            : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                          : isDark
                            ? 'text-slate-200 hover:bg-slate-800'
                            : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      All projects
                    </button>
                  </li>
                  {filteredProjects.map((p) => {
                    const idStr = String(p.id);
                    const selected = idStr === selectedProjectId;
                    return (
                      <li key={idStr}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setSelectedProjectId(idStr);
                            setProjectMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors truncate ${
                            selected
                              ? isDark
                                ? 'bg-[#C2D642]/20 text-[#C2D642]'
                                : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                              : isDark
                                ? 'text-slate-200 hover:bg-slate-800'
                                : 'text-slate-800 hover:bg-slate-100'
                          }`}
                          title={p.name}
                        >
                          {p.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filteredProjects.length === 0 && projectSearch.trim() ? (
                  <p className={`px-3 py-2 text-sm border-t ${borderClass} ${textSecondary}`}>No matching projects</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Liabilities Card */}
      <div className="p-4 rounded-xl border-2 border-red-500/50 bg-red-500/10">
        <p className={`text-sm font-bold ${textSecondary} mb-1`}>Total Outstanding</p>
        <p className="text-2xl font-black text-red-600 dark:text-red-400">₹ {liability.toLocaleString('en-IN')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>On Site Now</p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">{onSiteNow}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Staff Attendance</p>
          <p className="text-xl font-black text-green-600 dark:text-green-400">{staffOnSite}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Contractor Head</p>
          <p className="text-xl font-black text-orange-600 dark:text-orange-400">{contractorHeadToday}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Status</p>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 truncate" title={statusDisplay}>
            {statusDisplay}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workforce Mix Pie */}
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <h3 className={`text-sm font-bold ${textPrimary} mb-4`}>Workforce Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined) => (v != null ? Math.round(v) : v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contractor Breakdown */}
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <h3 className={`text-sm font-bold ${textPrimary} mb-4`}>Contractor Breakdown</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {contractorBreakdown.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>No contractor logs today</p>
            ) : (
              contractorBreakdown.map((c, idx) => (
                <div
                  key={`${c.name}-${idx}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass}`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary} truncate`}>{c.name}</p>
                  </div>
                  <p className={`text-sm font-bold ${textPrimary}`}>{c.count} LABOR</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
