'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { masterDataAPI, dprAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const extractMaterials = (dprDetails: any): any[] => {
    const d = dprDetails?.materials ?? dprDetails?.materials_history ?? [];
    return Array.isArray(d) ? d : [];
  };
  const extractLabour = (dprDetails: any): any[] => {
    const d = dprDetails?.labour ?? dprDetails?.labours ?? dprDetails?.labour_history ?? [];
    return Array.isArray(d) ? d : [];
  };
  const extractMachinery = (dprDetails: any): any[] => {
    const d = dprDetails?.assets ?? dprDetails?.assets_history ?? [];
    return Array.isArray(d) ? d : [];
  };

  const mapMaterialToRow = (r: any, date?: string) => {
    const mat = r?.materials ?? r?.material ?? r;
    const code = mat?.code ?? r?.code ?? '-';
    const name = mat?.name ?? r?.material_name ?? r?.materials_name ?? '-';
    const spec = mat?.specification ?? r?.specification ?? '-';
    const unit = mat?.unit ?? r?.unit ?? '-';
    const qty = Number(r?.qty ?? r?.quantity ?? 0);
    const rate = Number(r?.rate ?? r?.rate_per_unit ?? 0);
    const amount = qty * rate;
    const workDetails = r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '-';
    const enteredBy = r?.user?.name ?? r?.entered_by ?? '-';
    const remarks = r?.remarkes ?? r?.remarks ?? '-';
    return { date, code, name, spec, unit, qty, rate, amount, workDetails, enteredBy, remarks };
  };

  const mapLabourToRow = (r: any, date?: string) => {
    const lab = r?.labours ?? r?.labour ?? r;
    const code = lab?.code ?? r?.code ?? '-';
    const details = lab?.type && lab?.category ? `${lab.type} - ${lab.category}` : (lab?.name ?? r?.labour_name ?? '-');
    const unit = lab?.unit ?? r?.unit ?? '-';
    const qty = Number(r?.qty ?? r?.quantity ?? 0);
    const otQty = Number(r?.ot_qty ?? r?.overtime_qty ?? 0);
    const rate = Number(r?.rate_per_unit ?? r?.rate ?? 0);
    const amount = (qty + otQty) * rate;
    const workDetails = r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '-';
    const enteredBy = r?.user?.name ?? r?.entered_by ?? '-';
    const remarks = r?.remarkes ?? r?.remarks ?? '-';
    const contractor = (() => {
      const v = r?.vendors ?? r?.vendor ?? r?.contractor;
      return !v ? '-' : typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
    })();
    return { date, code, details, unit, qty, otQty, rate, amount, workDetails, enteredBy, remarks, contractor };
  };

  const mapMachineryToRow = (r: any, date?: string) => {
    const asset = r?.assets ?? r?.asset ?? r;
    const code = asset?.code ?? r?.code ?? '-';
    const name = asset?.name ?? r?.asset_name ?? '-';
    const spec = asset?.specification ?? r?.specification ?? '-';
    const unit = asset?.unit ?? r?.unit ?? '-';
    const qty = Number(r?.qty ?? r?.quantity ?? 0);
    const rate = Number(r?.rate_per_unit ?? r?.rate ?? 0);
    const amount = qty * rate;
    const workDetails = r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '-';
    const enteredBy = r?.user?.name ?? r?.entered_by ?? '-';
    const remarks = r?.remarkes ?? r?.remarks ?? '-';
    const contractor = (() => {
      const v = r?.vendors ?? r?.vendor ?? r?.contractor;
      return !v ? '-' : typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
    })();
    return { date, code, name, spec, unit, qty, rate, amount, workDetails, enteredBy, remarks, contractor };
  };

  const loadDateTabData = useCallback(async () => {
    if (!selectedProject || !fromDate) return;
    setIsLoading(true);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const dateStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      let list = await dprAPI.getList({ project: projId, subproject: selectedSubProject || undefined, date: dateStr });
      let arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) list = await dprAPI.getList({});
      arr = Array.isArray(list) ? list : [];
      const matched = arr.find((d: any) => {
        const dDate = d?.date ?? d?.dpr_date ?? d?.name;
        const dStr = typeof dDate === 'string' && dDate.length >= 10 ? dDate.slice(0, 10) : '';
        if (dStr !== dateStr) return false;
        const dProj = d?.projects_id?.id ?? d?.projects_id ?? d?.projects?.id;
        return String(dProj) === String(projId);
      }) || arr[0];
      if (!matched) {
        setDateTabData({ materials: [], labour: [], machinery: [] });
        return;
      }
      const details = await dprAPI.getDetails(matched.id);
      const raw = details?.data ?? details ?? {};
      const materials = extractMaterials(raw).map((r: any) => mapMaterialToRow(r));
      const labour = extractLabour(raw).map((r: any) => mapLabourToRow(r));
      const machinery = extractMachinery(raw).map((r: any) => mapMachineryToRow(r));
      setDateTabData({ materials, labour, machinery });
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load data');
      setDateTabData({ materials: [], labour: [], machinery: [] });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, fromDate, projects, toast]);

  const loadDetailsTabData = useCallback(async () => {
    if (!selectedProject || !fromDate || !toDate) return;
    setIsLoading(true);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const toStr = toDate.length >= 10 ? toDate.slice(0, 10) : toDate;
      let list = await dprAPI.getList({ project: projId, subproject: selectedSubProject || undefined });
      let arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) list = await dprAPI.getList({});
      arr = Array.isArray(list) ? list : [];
      const inRange = arr.filter((d: any) => {
        const dDate = d?.date ?? d?.dpr_date ?? d?.name;
        const dStr = typeof dDate === 'string' && dDate.length >= 10 ? dDate.slice(0, 10) : '';
        if (!dStr) return false;
        const dProj = d?.projects_id?.id ?? d?.projects_id ?? d?.projects?.id;
        if (String(dProj) !== String(projId)) return false;
        return dStr >= fromStr && dStr <= toStr;
      });
      const materials: any[] = [];
      const labour: any[] = [];
      const machinery: any[] = [];
      for (const d of inRange) {
        const details = await dprAPI.getDetails(d.id);
        const raw = details?.data ?? details ?? {};
        const dDate = d?.date ?? d?.dpr_date ?? d?.name;
        const dateStr = typeof dDate === 'string' && dDate.length >= 10 ? dDate.slice(0, 10) : '';
        extractMaterials(raw).forEach((r: any) => materials.push(mapMaterialToRow(r, dateStr)));
        extractLabour(raw).forEach((r: any) => labour.push(mapLabourToRow(r, dateStr)));
        extractMachinery(raw).forEach((r: any) => machinery.push(mapMachineryToRow(r, dateStr)));
      }
      setDetailsTabData({ materials, labour, machinery });
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load data');
      setDetailsTabData({ materials: [], labour: [], machinery: [] });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, fromDate, toDate, projects, toast]);

  useEffect(() => {
    if (viewType === 'date' && selectedProject && fromDate) loadDateTabData();
  }, [viewType, selectedProject, selectedSubProject, fromDate, loadDateTabData]);

  useEffect(() => {
    if (viewType === 'details' && selectedProject && fromDate && toDate) loadDetailsTabData();
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
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Project <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">---select project---</option>
                {projects.map((p) => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Sub Project</label>
            <div className="relative">
              <Layers className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <select
                value={selectedSubProject}
                onChange={(e) => setSelectedSubProject(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">Select Sub Project</option>
                {subprojects.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Select From Date</label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => { const v = e.target.value; setFromDate(v); if (v && toDate && new Date(v) > new Date(toDate)) setToDate(v); }}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
          {viewType === 'details' && (
          <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Select To Date</label>
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
      {selectedProject && fromDate && (viewType !== 'details' || toDate) && (
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
