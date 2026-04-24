'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ThemeType } from '../../types';
import { 
  Truck,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { masterDataAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { parseLocaleNumber } from '../../utils/workProgress';

interface Project {
  id: string | number;
  name: string;
}

interface Subproject {
  id: string | number;
  name: string;
}

interface ResourcesUsageFromDPRProps {
  theme: ThemeType;
}

const toToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const formatNum = (n: any) => {
  const v = parseLocaleNumber(n, NaN);
  if (!Number.isFinite(v)) return '0.00';
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ResourcesUsageFromDPR: React.FC<ResourcesUsageFromDPRProps> = ({ theme }) => {
  const toast = useToast();
  const [viewType, setViewType] = useState<'date' | 'details'>('date');
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(toToday());
  const [toDate, setToDate] = useState<string>(toToday());
  const [isLoading, setIsLoading] = useState(false);
  const [dateTabData, setDateTabData] = useState<{
    materials: any[];
    labour: any[];
    machinery: any[];
  }>({ materials: [], labour: [], machinery: [] });
  const [detailsTabData, setDetailsTabData] = useState<{
    materials: any[];
    labour: any[];
    machinery: any[];
  }>({ materials: [], labour: [], machinery: [] });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage] = useState(10);
  const [pageByTable, setPageByTable] = useState<Record<string, number>>({});
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const projectSearchInputRef = useRef<HTMLInputElement>(null);
  const [subprojectMenuOpen, setSubprojectMenuOpen] = useState(false);
  const [subprojectSearch, setSubprojectSearch] = useState('');
  const subprojectMenuRef = useRef<HTMLDivElement>(null);
  const subprojectSearchInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const arr = await masterDataAPI.getProjects();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setProjects(list.map((p: any) => ({ id: p.id ?? p.project_id ?? p.projects_id, name: p.project_name ?? p.name ?? '' })));
      } catch {
        setProjects([]);
      }
    };
    load();
  }, []);

  // Load subprojects when project changes
  useEffect(() => {
    if (!selectedProject) {
      setSubprojects([]);
      setSelectedSubProject('');
      return;
    }
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const projId = proj?.id ?? selectedProject;
    const load = async () => {
      try {
        const arr = await masterDataAPI.getSubprojects(Number(projId));
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setSubprojects(list.map((s: any) => ({ id: s.id ?? s.sub_projects_id, name: s.name ?? s.sub_project_name ?? '' })));
      setSelectedSubProject('');
      } catch {
        setSubprojects([]);
      }
    };
    load();
  }, [selectedProject, projects]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const sorted = [...projects].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!q) return sorted;
    return sorted.filter((p) => String(p.name).toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const filteredSubprojects = useMemo(() => {
    const q = subprojectSearch.trim().toLowerCase();
    const sorted = [...subprojects].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!q) return sorted;
    return sorted.filter((s) => String(s.name).toLowerCase().includes(q));
  }, [subprojects, subprojectSearch]);

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProject) return '---select project---';
    const p = projects.find((x) => String(x.id) === String(selectedProject));
    return p?.name?.trim() || '---select project---';
  }, [projects, selectedProject]);

  const selectedSubProjectLabel = useMemo(() => {
    if (!selectedSubProject) return 'Select Sub Project';
    const s = subprojects.find((x) => String(x.id) === String(selectedSubProject));
    return s?.name?.trim() || 'Select Sub Project';
  }, [subprojects, selectedSubProject]);

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

  useEffect(() => {
    if (!subprojectMenuOpen) {
      setSubprojectSearch('');
      return;
    }
    const t = window.setTimeout(() => subprojectSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [subprojectMenuOpen]);

  useEffect(() => {
    if (!subprojectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = subprojectMenuRef.current;
      if (el && !el.contains(e.target as Node)) setSubprojectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [subprojectMenuOpen]);

  const mapMaterialFromApi = (r: any, date?: string) => {
    const qty = parseLocaleNumber(r?.qty ?? r?.quantity, 0);
    const rate = parseLocaleNumber(r?.rate ?? r?.rate_per_unit, 0);
    const amount = parseLocaleNumber(r?.amount, qty * rate);
    return {
    date: date ?? r?.date ?? '-',
    code: r?.code ?? '-',
    name: r?.name ?? '-',
    spec: r?.specification ?? r?.spec ?? '-',
    unit: r?.unit ?? '-',
    qty,
    rate,
    amount,
    workDetails: r?.work_details ?? '-',
    enteredBy: r?.entered_by ?? '-',
    remarks: r?.remarks ?? r?.remarkes ?? '-',
  };
  };

  const mapLabourFromApi = (r: any, date?: string) => {
    const qty = parseLocaleNumber(r?.qty ?? r?.quantity, 0);
    const otQty = parseLocaleNumber(r?.ot_qty ?? r?.overtime_qty, 0);
    const rate = parseLocaleNumber(r?.rate ?? r?.rate_per_unit, 0);
    const amount = parseLocaleNumber(r?.amount, (qty + otQty) * rate);
    return {
    date: date ?? r?.date ?? '-',
    code: r?.code ?? '-',
    details: r?.name ?? r?.labour_details ?? '-',
    unit: r?.unit ?? '-',
    qty,
    otQty,
    rate,
    amount,
    workDetails: r?.work_details ?? '-',
    enteredBy: r?.entered_by ?? '-',
    remarks: r?.remarks ?? r?.remarkes ?? '-',
    contractor: (() => {
      const v = r?.labour_contractor ?? r?.contractor_supplier ?? r?.vendors ?? r?.vendor ?? r?.contractor;
      return !v ? '-' : typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
    })(),
  };
  };

  const mapMachineryFromApi = (r: any, date?: string) => {
    const qty = parseLocaleNumber(r?.qty ?? r?.quantity, 0);
    const rate = parseLocaleNumber(r?.rate ?? r?.rate_per_unit, 0);
    const amount = parseLocaleNumber(r?.amount, qty * rate);
    return {
    date: date ?? r?.date ?? '-',
    code: r?.code ?? '-',
    name: r?.name ?? '-',
    spec: r?.specification ?? r?.spec ?? '-',
    unit: r?.unit ?? '-',
    qty,
    rate,
    amount,
    workDetails: r?.work_details ?? '-',
    enteredBy: r?.entered_by ?? '-',
    remarks: r?.remarks ?? r?.remarkes ?? '-',
    contractor: (() => {
      const v = r?.contractor_supplier ?? r?.contractor ?? r?.vendors ?? r?.vendor;
      return !v ? '-' : typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
    })(),
  };
  };

  const loadDateTabData = useCallback(async () => {
    if (!selectedProject || !selectedSubProject || !fromDate) return;
    setIsLoading(true);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const dateStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const res = await masterDataAPI.getResourcesUsageFromDprDate({
        project: projId,
        subproject: selectedSubProject,
        date: dateStr,
      });
      const materials = (res.material ?? []).map((r: any) => mapMaterialFromApi(r));
      const labour = (res.labour ?? []).map((r: any) => mapLabourFromApi(r));
      const machinery = (res.assets ?? []).map((r: any) => mapMachineryFromApi(r));
      setDateTabData({ materials, labour, machinery });
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load data');
      setDateTabData({ materials: [], labour: [], machinery: [] });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, fromDate, projects, toast]);

  const loadDetailsTabData = useCallback(async () => {
    if (!selectedProject || !selectedSubProject || !fromDate || !toDate) return;
    setIsLoading(true);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const toStr = toDate.length >= 10 ? toDate.slice(0, 10) : toDate;
      const res = await masterDataAPI.getResourcesUsageFromDprDays({
        project: projId,
        subproject: selectedSubProject,
        from_date: fromStr,
        to_date: toStr,
      });
      const materials = (res.material ?? []).map((r: any) => mapMaterialFromApi(r, r?.date));
      const labour = (res.labour ?? []).map((r: any) => mapLabourFromApi(r, r?.date));
      const machinery = (res.assets ?? []).map((r: any) => mapMachineryFromApi(r, r?.date));
      setDetailsTabData({ materials, labour, machinery });
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load data');
      setDetailsTabData({ materials: [], labour: [], machinery: [] });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, fromDate, toDate, projects, toast]);

  useEffect(() => {
    if (viewType === 'date' && selectedProject && selectedSubProject && fromDate) loadDateTabData();
  }, [viewType, selectedProject, selectedSubProject, fromDate, loadDateTabData]);

  useEffect(() => {
    if (viewType === 'details' && selectedProject && selectedSubProject && fromDate && toDate) loadDetailsTabData();
  }, [viewType, selectedProject, selectedSubProject, fromDate, toDate, loadDetailsTabData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const TableWrapper = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`overflow-x-auto rounded-lg border border-inherit ${className}`}>{children}</div>
  );

  const PaginationBar = ({ total, current, onPageChange }: { total: number; current: number; onPageChange: (p: number) => void }) => {
    const totalPages = Math.max(1, Math.ceil(total / entriesPerPage));
    if (total === 0) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-2 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
        <span className={`text-sm ${textSecondary}`}>Showing {(current - 1) * entriesPerPage + 1}–{Math.min(current * entriesPerPage, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={current <= 1} className={`p-2 rounded disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className="w-4 h-4" /></button>
          <span className={`px-2 text-sm font-bold ${textPrimary}`}>{current} / {totalPages}</span>
          <button onClick={() => onPageChange(totalPages)} disabled={current >= totalPages} className={`p-2 rounded disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const filterAndSort = (rows: any[], searchKeys: string[]) => {
    let out = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter((r) => searchKeys.some((k) => String((r as any)[k] ?? '').toLowerCase().includes(q)));
    }
    if (sortConfig) {
      out = [...out].sort((a, b) => {
        const av = (a as any)[sortConfig.key];
        const bv = (b as any)[sortConfig.key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  };

  const getPage = (key: string) => pageByTable[key] ?? 1;
  const setPage = (key: string, p: number) => setPageByTable((prev) => ({ ...prev, [key]: p }));
  const paginate = (rows: any[], key: string) => {
    const page = getPage(key);
    const start = (page - 1) * entriesPerPage;
    return rows.slice(start, start + entriesPerPage);
  };

  const dateMaterials = useMemo(() => filterAndSort(dateTabData.materials, ['code', 'name', 'spec', 'unit']), [dateTabData.materials, searchQuery, sortConfig]);
  const dateLabour = useMemo(() => filterAndSort(dateTabData.labour, ['code', 'details', 'unit']), [dateTabData.labour, searchQuery, sortConfig]);
  const dateMachinery = useMemo(() => filterAndSort(dateTabData.machinery, ['code', 'name', 'spec', 'unit']), [dateTabData.machinery, searchQuery, sortConfig]);
  const detailsMaterials = useMemo(() => filterAndSort(detailsTabData.materials, ['date', 'code', 'name', 'spec', 'unit', 'workDetails', 'enteredBy', 'remarks']), [detailsTabData.materials, searchQuery, sortConfig]);
  const detailsLabour = useMemo(() => filterAndSort(detailsTabData.labour, ['date', 'code', 'details', 'unit', 'workDetails', 'enteredBy', 'remarks', 'contractor']), [detailsTabData.labour, searchQuery, sortConfig]);
  const detailsMachinery = useMemo(() => filterAndSort(detailsTabData.machinery, ['date', 'code', 'name', 'spec', 'unit', 'workDetails', 'enteredBy', 'remarks', 'contractor']), [detailsTabData.machinery, searchQuery, sortConfig]);

  useEffect(() => setPageByTable({}), [searchQuery, sortConfig, viewType]);

  return (
    <div className="space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Truck className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Resources Usage From DPR</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>View resource usage details from daily progress reports</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewType('date')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'date' ? 'bg-[#C2D642] text-white' : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            Date
          </button>
          <button
            onClick={() => setViewType('details')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'details' ? 'bg-[#C2D642] text-white' : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            Details Day wise
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="min-w-0">
            <label htmlFor="resources-dpr-project-button" className={`block text-sm font-bold mb-2 ${textPrimary}`}>Project <span className="text-red-500">*</span></label>
            <div className="relative" ref={projectMenuRef}>
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10 pointer-events-none`} />
              <button
                id="resources-dpr-project-button"
                type="button"
                onClick={() => setProjectMenuOpen((o) => !o)}
                className={`relative w-full flex items-center pl-10 pr-10 py-2 rounded-lg text-sm border text-left ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                aria-expanded={projectMenuOpen}
                aria-haspopup="listbox"
                aria-label="Select project"
              >
                <span className="min-w-0 flex-1 truncate pr-1">{selectedProjectLabel}</span>
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 size-[1.125rem] -translate-y-1/2 shrink-0 opacity-80 transition-transform duration-200 [transform-origin:center] ${projectMenuOpen ? 'rotate-180' : 'rotate-0'}`}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
              {projectMenuOpen ? (
                <div
                  role="listbox"
                  aria-label="Projects"
                  className={`absolute left-0 right-0 z-50 mt-1 rounded-lg border shadow-xl overflow-hidden flex flex-col ${
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
                        aria-selected={selectedProject === ''}
                        onClick={() => {
                          setSelectedProject('');
                          setProjectMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                          selectedProject === ''
                            ? isDark
                              ? 'bg-[#C2D642]/25 text-[#C2D642]'
                              : 'bg-[#C2D642]/15 text-[#6B7F2A]'
                            : isDark
                              ? 'text-slate-200 hover:bg-slate-800'
                              : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        ---select project---
                      </button>
                    </li>
                    {filteredProjects.map((p) => {
                      const idStr = String(p.id);
                      const selected = selectedProject === idStr;
                      return (
                        <li key={idStr}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedProject(idStr);
                              setProjectMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors truncate ${
                              selected
                                ? isDark
                                  ? 'bg-[#C2D642]/25 text-[#C2D642]'
                                  : 'bg-[#C2D642]/15 text-[#6B7F2A]'
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
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No matching projects
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="resources-dpr-subproject-button" className={`block text-sm font-bold mb-2 ${textPrimary}`}>Sub Project <span className="text-red-500">*</span></label>
            <div className="relative" ref={subprojectMenuRef}>
              <Layers className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10 pointer-events-none`} />
              <button
                id="resources-dpr-subproject-button"
                type="button"
                onClick={() => selectedProject && setSubprojectMenuOpen((o) => !o)}
                disabled={!selectedProject}
                className={`relative w-full flex items-center pl-10 pr-10 py-2 rounded-lg text-sm border text-left ${
                  isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                } focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-expanded={subprojectMenuOpen}
                aria-haspopup="listbox"
                aria-label="Select sub project"
              >
                <span className="min-w-0 flex-1 truncate pr-1">{selectedProject ? selectedSubProjectLabel : 'Select a project first'}</span>
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 size-[1.125rem] -translate-y-1/2 shrink-0 opacity-80 transition-transform duration-200 [transform-origin:center] ${subprojectMenuOpen ? 'rotate-180' : 'rotate-0'}`}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
              {subprojectMenuOpen && selectedProject ? (
                <div
                  role="listbox"
                  aria-label="Sub projects"
                  className={`absolute left-0 right-0 z-50 mt-1 rounded-lg border shadow-xl overflow-hidden flex flex-col ${
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
                        ref={subprojectSearchInputRef}
                        type="search"
                        autoComplete="off"
                        placeholder="Search sub projects…"
                        value={subprojectSearch}
                        onChange={(e) => setSubprojectSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={`w-full pl-9 pr-3 py-2 rounded-md border text-sm ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                        aria-label="Search sub project list"
                      />
                    </div>
                  </div>
                  <ul className="overflow-y-auto max-h-56 py-1">
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedSubProject === ''}
                        onClick={() => {
                          setSelectedSubProject('');
                          setSubprojectMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                          selectedSubProject === ''
                            ? isDark
                              ? 'bg-[#C2D642]/25 text-[#C2D642]'
                              : 'bg-[#C2D642]/15 text-[#6B7F2A]'
                            : isDark
                              ? 'text-slate-200 hover:bg-slate-800'
                              : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        Select Sub Project
                      </button>
                    </li>
                    {filteredSubprojects.map((s) => {
                      const idStr = String(s.id);
                      const selected = selectedSubProject === idStr;
                      return (
                        <li key={idStr}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedSubProject(idStr);
                              setSubprojectMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors truncate ${
                              selected
                                ? isDark
                                  ? 'bg-[#C2D642]/25 text-[#C2D642]'
                                  : 'bg-[#C2D642]/15 text-[#6B7F2A]'
                                : isDark
                                  ? 'text-slate-200 hover:bg-slate-800'
                                  : 'text-slate-800 hover:bg-slate-100'
                            }`}
                            title={s.name}
                          >
                            {s.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredSubprojects.length === 0 && subprojectSearch.trim() ? (
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No matching sub projects
                    </p>
                  ) : null}
                  {subprojects.length === 0 && !subprojectSearch.trim() ? (
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No sub projects for this project
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>From Date <span className="text-red-500">*</span></label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => { const v = e.target.value; setFromDate(v); if (v && toDate && new Date(v) > new Date(toDate)) setToDate(v); }}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
          {viewType === 'details' && (
          <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>To Date <span className="text-red-500">*</span></label>
            <DatePickerInput
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              iconClassName={textSecondary}
                className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 ${cardClass} rounded-xl border p-4`}>
        <Search className={`w-4 h-4 ${textSecondary}`} />
        <input
          type="text"
          placeholder="Search tables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
        />
          </div>

      {/* Content */}
      {selectedProject && selectedSubProject && fromDate && (viewType !== 'details' || toDate) && (
        <div className="space-y-6 relative min-h-[200px]">
          {isLoading && (
            <div className={`absolute inset-0 z-10 rounded-xl min-h-[300px] ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} flex items-center justify-center`}>
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
        </div>
      )}

          {viewType === 'date' && (
            <>
              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Materials</div>
                <TableWrapper>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['code', 'name', 'spec', 'unit', 'qty', 'rate', 'amount'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'code' ? 'Code' : k === 'name' ? 'Materials' : k === 'spec' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'rate' ? 'Rate' : 'Amount'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(dateMaterials, 'dateMaterials').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.name}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.spec}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                        </tr>
                      ))}
                      {dateMaterials.length === 0 && <tr><td colSpan={7} className={`px-4 py-8 text-center ${textSecondary}`}>No materials</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={dateMaterials.length} current={getPage('dateMaterials')} onPageChange={(p) => setPage('dateMaterials', p)} />
              </div>

              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Labour</div>
                <TableWrapper>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['code', 'details', 'unit', 'qty', 'otQty', 'rate', 'amount'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'code' ? 'Code' : k === 'details' ? 'Labour Details' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'otQty' ? 'OT Quantity' : k === 'rate' ? 'Rate' : 'Amount'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(dateLabour, 'dateLabour').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.details}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.otQty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                        </tr>
                      ))}
                      {dateLabour.length === 0 && <tr><td colSpan={7} className={`px-4 py-8 text-center ${textSecondary}`}>No labour</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={dateLabour.length} current={getPage('dateLabour')} onPageChange={(p) => setPage('dateLabour', p)} />
              </div>

              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Equipments/Machinery</div>
                <TableWrapper>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['code', 'name', 'spec', 'unit', 'qty', 'rate', 'amount'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'code' ? 'Code' : k === 'name' ? 'Machinery Names' : k === 'spec' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'rate' ? 'Rate' : 'Amount'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(dateMachinery, 'dateMachinery').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.name}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.spec}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                        </tr>
                      ))}
                      {dateMachinery.length === 0 && <tr><td colSpan={7} className={`px-4 py-8 text-center ${textSecondary}`}>No machinery</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={dateMachinery.length} current={getPage('dateMachinery')} onPageChange={(p) => setPage('dateMachinery', p)} />
              </div>
            </>
          )}

      {viewType === 'details' && (
            <>
              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Materials (Day wise)</div>
                <TableWrapper>
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['date', 'code', 'name', 'spec', 'unit', 'qty', 'rate', 'amount', 'workDetails', 'enteredBy', 'remarks'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'date' ? 'Date' : k === 'code' ? 'Code' : k === 'name' ? 'Materials' : k === 'spec' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'rate' ? 'Rate' : k === 'amount' ? 'Amount' : k === 'workDetails' ? 'Work Details' : k === 'enteredBy' ? 'Entered By' : 'Remarks'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(detailsMaterials, 'detailsMaterials').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.date ?? '-'}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.name}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.spec}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.workDetails}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.enteredBy}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.remarks}</td>
                        </tr>
                      ))}
                      {detailsMaterials.length === 0 && <tr><td colSpan={11} className={`px-4 py-8 text-center ${textSecondary}`}>No materials</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={detailsMaterials.length} current={getPage('detailsMaterials')} onPageChange={(p) => setPage('detailsMaterials', p)} />
              </div>

              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Labour (Day wise)</div>
                <TableWrapper>
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['date', 'code', 'details', 'unit', 'qty', 'otQty', 'rate', 'amount', 'workDetails', 'enteredBy', 'remarks', 'contractor'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'date' ? 'Date' : k === 'code' ? 'Code' : k === 'details' ? 'Labour Details' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'otQty' ? 'OT Quantity' : k === 'rate' ? 'Rate' : k === 'amount' ? 'Amount' : k === 'workDetails' ? 'Work Details' : k === 'enteredBy' ? 'Entered By' : k === 'remarks' ? 'Remarks' : 'Labour Contractor'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(detailsLabour, 'detailsLabour').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.date ?? '-'}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.details}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.otQty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.workDetails}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.enteredBy}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.remarks}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.contractor}</td>
                        </tr>
                      ))}
                      {detailsLabour.length === 0 && <tr><td colSpan={12} className={`px-4 py-8 text-center ${textSecondary}`}>No labour</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={detailsLabour.length} current={getPage('detailsLabour')} onPageChange={(p) => setPage('detailsLabour', p)} />
              </div>

              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>Equipments/Machinery (Day wise)</div>
                <TableWrapper>
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        {['date', 'code', 'name', 'spec', 'unit', 'qty', 'rate', 'amount', 'workDetails', 'enteredBy', 'remarks', 'contractor'].map((k) => (
                          <th key={k} className={`px-4 py-2 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort(k)}>
                            <span className="flex items-center gap-1">
                              {k === 'date' ? 'Date' : k === 'code' ? 'Code' : k === 'name' ? 'Machinery Names' : k === 'spec' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'qty' ? 'Quantity' : k === 'rate' ? 'Rate' : k === 'amount' ? 'Amount' : k === 'workDetails' ? 'Work Details' : k === 'enteredBy' ? 'Entered By' : k === 'remarks' ? 'Remarks' : 'Contractor Supplier'}
                              {getSortIcon(k)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(detailsMachinery, 'detailsMachinery').map((r, i) => (
                        <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.date ?? '-'}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.code}</td>
                          <td className={`px-4 py-2 ${textPrimary}`}>{r.name}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.spec}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.unit}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.qty)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.rate)}</td>
                          <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(r.amount)}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.workDetails}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.enteredBy}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.remarks}</td>
                          <td className={`px-4 py-2 ${textSecondary}`}>{r.contractor}</td>
                        </tr>
                      ))}
                      {detailsMachinery.length === 0 && <tr><td colSpan={12} className={`px-4 py-8 text-center ${textSecondary}`}>No machinery</td></tr>}
                    </tbody>
                  </table>
                </TableWrapper>
                <PaginationBar total={detailsMachinery.length} current={getPage('detailsMachinery')} onPageChange={(p) => setPage('detailsMachinery', p)} />
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourcesUsageFromDPR;
