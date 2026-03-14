'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  Package,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Warehouse,
  ChevronDown as ChevronDownIcon,
  Loader2,
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { masterDataAPI, dprAPI, goodsIssueAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Project {
  id: string | number;
  name: string;
}

interface Subproject {
  id: string | number;
  name: string;
}

interface Store {
  id: string | number;
  name: string;
}

interface ReportRow {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  issueQty: number;
  dprQty: number;
  variation: number;
}

interface MaterialUsedVsStoreIssueProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const MaterialUsedVsStoreIssue: React.FC<MaterialUsedVsStoreIssueProps> = ({ theme }) => {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<ReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
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

  // Load stores when project changes
  useEffect(() => {
    if (!selectedProject) {
      setStores([]);
      setSelectedStore('');
      return;
    }
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const projId = proj?.id ?? selectedProject;
    const load = async () => {
      try {
        const arr = await masterDataAPI.getProjectWiseWarehouses(Number(projId));
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setStores(list.map((s: any) => ({ id: s.id ?? s.store_id ?? s.store_warehouses_id, name: s.name ?? s.store_name ?? s.warehouse_name ?? '' })));
        setSelectedStore('');
      } catch {
        setStores([]);
      }
    };
    load();
  }, [selectedProject, projects]);

  const loadReportData = useCallback(async () => {
    if (!selectedProject || !fromDate || !toDate) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const toStr = toDate.length >= 10 ? toDate.slice(0, 10) : toDate;

      // DPR materials aggregate
      const dprMap: Record<string, { code: string; name: string; spec: string; unit: string; qty: number }> = {};
      let dprList = await dprAPI.getList({ project: projId, subproject: selectedSubProject || undefined });
      let dprArr = Array.isArray(dprList) ? dprList : [];
      if (dprArr.length === 0) dprList = await dprAPI.getList({});
      dprArr = Array.isArray(dprList) ? dprList : [];
      const dprsInRange = dprArr.filter((d: any) => {
        const dDate = d?.date ?? d?.dpr_date ?? d?.name;
        const dStr = typeof dDate === 'string' && dDate.length >= 10 ? dDate.slice(0, 10) : '';
        if (!dStr) return false;
        const dProj = d?.projects_id?.id ?? d?.projects_id ?? d?.projects?.id;
        if (String(dProj) !== String(projId)) return false;
        return dStr >= fromStr && dStr <= toStr;
      });
      for (const d of dprsInRange) {
        try {
          const details = await dprAPI.getDetails(d.id);
          const raw = details?.data ?? details ?? {};
          const materials = raw?.materials ?? raw?.materials_history ?? [];
          const list = Array.isArray(materials) ? materials : [];
          for (const r of list) {
            const mat = r?.materials ?? r?.material ?? r;
            const code = mat?.code ?? r?.code ?? '-';
            const name = mat?.name ?? r?.material_name ?? r?.materials_name ?? '-';
            const spec = mat?.specification ?? r?.specification ?? '-';
            const unit = mat?.unit ?? r?.unit ?? '-';
            const qty = Number(r?.qty ?? r?.quantity ?? 0);
            if (!code || code === '-') continue;
            const key = String(code).toLowerCase();
            if (!dprMap[key]) dprMap[key] = { code, name, spec, unit, qty: 0 };
            dprMap[key].qty += qty;
          }
        } catch {
          /* skip */
        }
      }

      // Store issue aggregate - from goods issue list
      const issueMap: Record<string, number> = {};
      try {
        const issueList = await goodsIssueAPI.list();
        const issues = Array.isArray(issueList) ? issueList : [];
        for (const issue of issues) {
          const issueProj = issue?.projects_id ?? issue?.project_id ?? issue?.projects?.id;
          const issueStores = issue?.store_warehouses_id ?? issue?.store_id ?? issue?.store_warehouses;
          const storeArr = Array.isArray(issueStores) ? issueStores : (issueStores != null ? [issueStores] : []);
          const issueDate = issue?.date ?? issue?.issue_date;
          const dStr = typeof issueDate === 'string' && issueDate.length >= 10 ? issueDate.slice(0, 10) : '';
          if (String(issueProj) !== String(projId)) continue;
          if (dStr && (dStr < fromStr || dStr > toStr)) continue;
          if (selectedStore && storeArr.length > 0 && !storeArr.some((s: any) => String(s?.id ?? s) === String(selectedStore))) continue;
          const details = issue?.issue_goods_details ?? issue?.details ?? issue?.goods_details ?? [];
          const detailList = Array.isArray(details) ? details : [];
          for (const d of detailList) {
            const code = d?.materials?.code ?? d?.materialCode ?? d?.code ?? d?.materials_id;
            const qty = Number(d?.issue_qty ?? d?.qty ?? 0);
            if (!code) continue;
            const key = String(code).toLowerCase();
            issueMap[key] = (issueMap[key] ?? 0) + qty;
          }
          if (detailList.length === 0 && issue?.id) {
            try {
              const editData = await goodsIssueAPI.edit(issue.id);
              const editDetails = editData?.issue_goods_details ?? editData?.details ?? editData?.goods_details ?? [];
              const list = Array.isArray(editDetails) ? editDetails : [];
              for (const d of list) {
                const code = d?.materials?.code ?? d?.materialCode ?? d?.code ?? d?.materials_id;
                const qty = Number(d?.issue_qty ?? d?.qty ?? 0);
                if (!code) continue;
                const key = String(code).toLowerCase();
                issueMap[key] = (issueMap[key] ?? 0) + qty;
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch {
        /* goods issue may not be available */
      }

      // Merge into report rows
      const allKeys = new Set([...Object.keys(dprMap), ...Object.keys(issueMap)]);
      const rows: ReportRow[] = [];
      for (const key of allKeys) {
        const dpr = dprMap[key];
        const issueQty = issueMap[key] ?? 0;
        const dprQty = dpr?.qty ?? 0;
        const variation = issueQty - dprQty;
        rows.push({
          id: key,
          code: dpr?.code ?? key,
          name: dpr?.name ?? key,
          specification: dpr?.spec ?? '-',
          unit: dpr?.unit ?? '-',
          issueQty,
          dprQty,
          variation,
        });
      }
      for (const key of Object.keys(issueMap)) {
        if (allKeys.has(key)) continue;
        const issueQty = issueMap[key] ?? 0;
        rows.push({
          id: key,
          code: key,
          name: key,
          specification: '-',
          unit: '-',
          issueQty,
          dprQty: 0,
          variation: issueQty,
        });
      }
      setTableData(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load report data');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, selectedStore, fromDate, toDate, projects, toast]);

  useEffect(() => {
    if (selectedProject && fromDate && toDate) loadReportData();
  }, [selectedProject, selectedSubProject, selectedStore, fromDate, toDate, loadReportData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const filteredAndSorted = useMemo(() => {
    let out = tableData.filter(
      (r) =>
        searchQuery.trim() === '' ||
        [r.code, r.name, r.specification, r.unit].some((v) => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (sortConfig) {
      out = [...out].sort((a, b) => {
        const av = (a as any)[sortConfig.key];
        const bv = (b as any)[sortConfig.key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [tableData, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAndSorted.slice(start, start + entriesPerPage);
  }, [filteredAndSorted, currentPage, entriesPerPage]);

  useEffect(() => setCurrentPage(1), [searchQuery, sortConfig]);

  return (
    <div className="space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Package className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Material Used vs Store Issue</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Compare material usage with store issue records
            </p>
          </div>
        </div>
      </div>

      {/* Filter Form */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
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
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Stores</label>
            <div className="relative">
              <Warehouse className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">Select Store</option>
                {stores.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
              </select>
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Select From Date</label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => {
                const v = e.target.value;
                setFromDate(v);
                if (v && toDate && new Date(v) > new Date(toDate)) setToDate(v);
              }}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
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
        </div>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 ${cardClass} rounded-xl border p-4`}>
        <Search className={`w-4 h-4 ${textSecondary}`} />
            <input
              type="text"
          placeholder="Search..."
              value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
        />
      </div>

      {/* Data Table */}
      {selectedProject && fromDate && toDate && (
        <div className={`rounded-xl border ${cardClass} overflow-hidden relative min-h-[200px]`}>
          {isLoading && (
            <div className={`absolute inset-0 z-10 rounded-xl ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} flex items-center justify-center`}>
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          )}
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                  <th className={`px-4 py-3 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('code')}>
                    <span className="flex items-center gap-2">Code {getSortIcon('code')}</span>
                </th>
                  <th className={`px-4 py-3 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-2">Materials Names / Machinery Names {getSortIcon('name')}</span>
                </th>
                  <th className={`px-4 py-3 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('specification')}>
                    <span className="flex items-center gap-2">Specification {getSortIcon('specification')}</span>
                </th>
                  <th className={`px-4 py-3 text-left font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('unit')}>
                    <span className="flex items-center gap-2">Unit {getSortIcon('unit')}</span>
                </th>
                  <th className={`px-4 py-3 text-right font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('issueQty')}>
                    <span className="flex items-center justify-end gap-2">Issue Qty {getSortIcon('issueQty')}</span>
                </th>
                  <th className={`px-4 py-3 text-right font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('dprQty')}>
                    <span className="flex items-center justify-end gap-2">DPR Qty {getSortIcon('dprQty')}</span>
                </th>
                  <th className={`px-4 py-3 text-right font-bold ${textPrimary} cursor-pointer`} onClick={() => handleSort('variation')}>
                    <span className="flex items-center justify-end gap-2">Variation {getSortIcon('variation')}</span>
                </th>
              </tr>
            </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.name}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.issueQty)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.dprQty)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.variation)}</td>
                  </tr>
                ))}
                {!isLoading && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className={`px-4 py-12 text-center ${textSecondary}`}>
                      No data available. Select filters and ensure the date range has DPR or store issue records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          {filteredAndSorted.length > 0 && (
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <div className={`text-sm ${textSecondary}`}>
                Showing {paginated.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
                <span className={`text-sm font-bold ${textPrimary}`}>Page {currentPage} of {totalPages}</span>
            <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
          )}
      </div>
      )}
    </div>
  );
};

export default MaterialUsedVsStoreIssue;
