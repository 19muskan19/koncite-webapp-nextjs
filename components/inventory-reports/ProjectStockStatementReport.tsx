'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeType } from '../../types';
import {
  FileText,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Warehouse,
  Loader2,
  Copy,
  Download,
  FileDown,
  Printer,
  Package,
  Cpu,
} from 'lucide-react';
import { useProjectsFromMasters } from '../../hooks/useProjectsFromMasters';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { masterDataAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { getSameOriginAssetPathForPdf } from '@/utils/imageUtils';
import { loadCompanyLogoRasterForPdf } from '@/utils/pdfImage';
import { mergeProjectScopedMeta } from '@/utils/inventoryMergedReportMeta';

interface Project {
  id: string | number;
  name: string;
}

interface Store {
  id: string | number;
  name: string;
}

interface ReportRow {
  id: string;
  class?: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  totalInward: number;
  totalIssue: number;
  availableStock: number;
}

interface ProjectStockStatementReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ProjectStockStatementReport: React.FC<ProjectStockStatementReportProps> = ({ theme }) => {
  const toast = useToast();
  const { company: userCompany } = useUser();
  const projects = useProjectsFromMasters();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'materials' | 'assets'>('materials');
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<ReportRow[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  useEffect(() => {
    if (!selectedProject) {
      setStores([]);
      setSelectedStore('');
      return;
    }
    const load = async () => {
      try {
        const arr = await masterDataAPI.getProjectWiseWarehouses(selectedProject);
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setStores(list.map((s: any) => ({ id: s.id ?? s.store_warehouses_id ?? s.uuid, name: s.name ?? s.store_name ?? s.warehouse_name ?? '' })));
        setSelectedStore('');
      } catch {
        setStores([]);
      }
    };
    load();
  }, [selectedProject]);

  const mergedReportMeta = useMemo(
    () => mergeProjectScopedMeta({ userCompany, projects, selectedProject }),
    [userCompany, projects, selectedProject]
  );

  const loadReportData = useCallback(async () => {
    if (!selectedProject) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    try {
      const projId = selectedProject;
      const dataType = activeTab === 'materials' ? 'materials' : 'assets';
      let rows: ReportRow[] = [];

      try {
        const raw = await masterDataAPI.getProjectStockStatement({
          projectId: projId,
          storeId: selectedStore || undefined,
          dataType,
        });
        const arr = Array.isArray(raw) ? raw : [];
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          const mat = item?.material ?? item?.materials ?? item?.assets ?? item;
          const code = mat?.code ?? item?.code ?? '-';
          const name = mat?.name ?? item?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
          const spec = mat?.specification ?? item?.specification ?? '-';
          const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
          const cls = mat?.class ?? item?.class ?? item?.class_of_materials ?? '';
          const totalInward = Number(item?.total_inward ?? item?.totalInward ?? 0);
          const totalIssueApi = Number(item?.total_issue ?? item?.totalIssue ?? 0);
          const availRaw = item?.available_stock ?? item?.availableStock;
          const hasExplicitAvail = availRaw != null && availRaw !== '';
          // Backend may send gross issues in total_issue while available_stock already nets returns.
          // Show net issue = inward − available so Total Issue matches stock math (same as user expectation).
          let totalIssue: number;
          let availableStock: number;
          if (hasExplicitAvail) {
            availableStock = Number(availRaw);
            const netIssue = totalInward - availableStock;
            totalIssue = Number.isFinite(netIssue) ? Math.max(0, netIssue) : totalIssueApi;
          } else {
            totalIssue = totalIssueApi;
            availableStock = totalInward - totalIssue;
          }
          rows.push({
            id: `${item?.id ?? i}-${rows.length}`,
            ...(dataType === 'materials' ? { class: typeof cls === 'object' ? (cls?.name ?? '-') : (cls ?? '-') } : {}),
            code,
            name,
            specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
            unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
            totalInward,
            totalIssue,
            availableStock,
          });
        }
      } catch {
        /* API may not exist - fallback to opening stock */
      }

      if (rows.length === 0) {
        try {
          const list = dataType === 'materials'
            ? await masterDataAPI.getMaterialsOpeningList(projId, selectedStore || undefined)
            : await masterDataAPI.getAssetsOpeningStockList(projId, selectedStore || undefined);
          const arr = Array.isArray(list) ? list : [];
          for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const mat = item?.material ?? item?.materials ?? item?.assets ?? item;
            const code = mat?.code ?? item?.code ?? '-';
            const name = mat?.name ?? item?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
            const spec = mat?.specification ?? item?.specification ?? '-';
            const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
            const cls = mat?.class ?? item?.class ?? item?.class_of_materials ?? '';
            const qty = Number(item?.quantity ?? item?.qty ?? item?.opening ?? item?.opening_qty ?? 0);
            rows.push({
              id: `${item?.id ?? i}-${rows.length}`,
              ...(dataType === 'materials' ? { class: typeof cls === 'object' ? (cls?.name ?? '-') : (cls ?? '-') } : {}),
              code,
              name,
              specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
              unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
              totalInward: qty,
              totalIssue: 0,
              availableStock: qty,
            });
          }
        } catch (err: any) {
          toast.showError(err?.message || 'Failed to load project stock statement');
        }
      }

      setTableData(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load Project Stock Statement report');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedStore, activeTab, toast]);

  useEffect(() => {
    if (selectedProject && selectedStore) loadReportData();
  }, [selectedProject, selectedStore, activeTab, loadReportData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const isMaterials = activeTab === 'materials';
  const colKeys = isMaterials
    ? ['class', 'code', 'name', 'specification', 'unit', 'totalInward', 'totalIssue', 'availableStock']
    : ['code', 'name', 'specification', 'unit', 'totalInward', 'totalIssue', 'availableStock'];

  const filteredAndSorted = useMemo(() => {
    let out = tableData.filter(
      (r) =>
        tableSearch.trim() === '' ||
        [r.class, r.code, r.name, r.specification, r.unit].filter(Boolean).some((v) =>
          String(v).toLowerCase().includes(tableSearch.toLowerCase())
        )
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
  }, [tableData, tableSearch, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAndSorted.slice(start, start + entriesPerPage);
  }, [filteredAndSorted, currentPage, entriesPerPage]);

  useEffect(() => setCurrentPage(1), [tableSearch, sortConfig]);

  const headers = isMaterials
    ? ['Sl.no', 'Class', 'Code', 'Name', 'Specification', 'Unit', 'Total Inward', 'Total Issue', 'Available Stock']
    : ['Sl.no', 'Code', 'Name', 'Specification', 'Unit', 'Total Inward', 'Total Issue', 'Available Stock'];

  const rightAlignKeys = ['totalInward', 'totalIssue', 'availableStock'];

  const handleExport = (format: string) => {
    const rows = filteredAndSorted.map((r, idx) => {
      const base = isMaterials ? [idx + 1, r.class ?? '-', r.code, r.name, r.specification, r.unit] : [idx + 1, r.code, r.name, r.specification, r.unit];
      return [...base, formatNum(r.totalInward), formatNum(r.totalIssue), formatNum(r.availableStock)];
    });
    if (format === 'Copy') {
      const text = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(text);
      toast.showSuccess('Copied to clipboard');
    } else if (format === 'CSV' || format === 'Excel') {
      const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `project-stock-statement-${activeTab}.${format === 'CSV' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF') {
      void (async () => {
        try {
          const rm = mergedReportMeta;
          const reportTitle = `Project Stock Statement - ${activeTab === 'materials' ? 'Material' : 'Assets'}`;
          const storeName = stores.find((s) => String(s.id) === String(selectedStore))?.name?.trim() || '';
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const margin = 14;
          let y = 12;
          doc.setFontSize(16);
          doc.text(reportTitle, margin, y);
          y += 9;
          const raster = await loadCompanyLogoRasterForPdf(rm?.company?.logo ?? userCompany?.logo ?? null);
          const bandTop = y;
          let textX = margin;
          let logoH = 0;
          if (raster) {
            try {
              const ar = raster.widthPx / raster.heightPx;
              const th = 14;
              const tw = Math.min(ar * th, 32);
              const thDraw = tw / ar;
              doc.addImage(raster.dataUrl, raster.format, margin, bandTop, tw, thDraw);
              textX = margin + tw + 5;
              logoH = thDraw;
            } catch {
              /* text-only */
            }
          }
          doc.setFontSize(9);
          let lineY = bandTop + 3.5;
          const line = (s: string) => {
            doc.text(s, textX, lineY);
            lineY += 4.8;
          };
          if (rm?.company?.name) line(`Company: ${String(rm.company.name)}`);
          if (rm?.project?.name) line(`Project: ${String(rm.project.name)}`);
          if (storeName) line(`Store: ${storeName}`);
          y = Math.max(bandTop + logoH, lineY + 1) + 5;
          doc.setFontSize(10);
          const tableHeaders = [headers];
          const tableBody = filteredAndSorted.map((r, idx) => {
            const base = isMaterials
              ? [String(idx + 1), r.class ?? '-', r.code, r.name, r.specification, r.unit]
              : [String(idx + 1), r.code, r.name, r.specification, r.unit];
            return [...base, formatNum(r.totalInward), formatNum(r.totalIssue), formatNum(r.availableStock)];
          });
          autoTable(doc, {
            head: tableHeaders,
            body: tableBody,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          });
          doc.save(`project-stock-statement-${activeTab}.pdf`);
          toast.showSuccess('Downloaded');
        } catch {
          toast.showError('Could not generate PDF');
        }
      })();
    } else if (format === 'Print') {
      const rm = mergedReportMeta;
      const reportTitle = `Project Stock Statement - ${activeTab === 'materials' ? 'Material' : 'Assets'}`;
      const storeName = stores.find((s) => String(s.id) === String(selectedStore))?.name?.trim() || '';
      const esc = (s: string) =>
        String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const companyImg = getSameOriginAssetPathForPdf(rm?.company?.logo ?? userCompany?.logo ?? null) || '';
      const metaLines = [
        rm?.company?.name ? `<p style="margin:0 0 4px 0"><strong>Company:</strong> ${esc(String(rm.company.name))}</p>` : '',
        rm?.project?.name ? `<p style="margin:0 0 4px 0"><strong>Project:</strong> ${esc(String(rm.project.name))}</p>` : '',
        storeName ? `<p style="margin:0 0 4px 0"><strong>Store:</strong> ${esc(storeName)}</p>` : '',
      ]
        .filter(Boolean)
        .join('');
      const headerRow = `<h1 style="margin:0 0 14px 0;font-size:18px;font-weight:bold">${esc(reportTitle)}</h1>
<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:18px;flex-wrap:wrap">
  ${companyImg ? `<div style="flex-shrink:0"><img src="${esc(companyImg.startsWith('/') ? `${typeof window !== 'undefined' ? window.location.origin : ''}${companyImg}` : companyImg)}" alt="" style="max-height:56px;max-width:200px;object-fit:contain" /></div>` : ''}
  <div style="font-size:13px;line-height:1.55;min-width:200px">${metaLines}</div>
</div>`;
      const printContent = `
<!DOCTYPE html><html><head><title>Project Stock Statement</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
${headerRow}
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r, idx) => {
        const base = isMaterials
          ? `<tr><td>${idx + 1}</td><td>${r.class ?? '-'}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td>`
          : `<tr><td>${idx + 1}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td>`;
        return `${base}<td>${formatNum(r.totalInward)}</td><td>${formatNum(r.totalIssue)}</td><td>${formatNum(r.availableStock)}</td></tr>`;
      }).join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => w.print(), 100);
      }
    }
  };

  const colLabels: Record<string, string> = {
    class: 'Class',
    code: 'Code',
    name: 'Name',
    specification: 'Specification',
    unit: 'Unit',
    totalInward: 'Total Inward',
    totalIssue: 'Total Issue',
    availableStock: 'Available Stock',
  };

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <FileText className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Project Stock Statement</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View stock by project and store for material or assets
            </p>
          </div>
        </div>
      </div>

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
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Store <span className="text-red-500">*</span></label>
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
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'materials' ? 'bg-[#C2D642] text-slate-900' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
          >
            <Package className="w-4 h-4" /> Material
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'assets' ? 'bg-[#C2D642] text-slate-900' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
          >
            <Cpu className="w-4 h-4" /> Assets
          </button>
        </div>
      </div>

      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleExport('Copy')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}><Copy className="w-4 h-4" /> Copy</button>
          <button onClick={() => handleExport('CSV')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}><FileText className="w-4 h-4" /> CSV</button>
          <button onClick={() => handleExport('Excel')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}><Download className="w-4 h-4" /> Excel</button>
          <button onClick={() => handleExport('PDF')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => handleExport('Print')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}><Printer className="w-4 h-4" /> Print</button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10 pointer-events-none`} />
          <input
            type="text"
            placeholder="Search table..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {selectedProject && (
        <div className={`rounded-xl border ${cardClass} overflow-hidden relative min-h-[200px]`}>
          {isLoading && (
            <div className={`absolute inset-0 z-10 ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} flex items-center justify-center`}>
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          )}
          <div className="overflow-x-auto table-responsive">
            <table className="w-full min-w-[800px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-3 font-bold ${textPrimary} text-left`}>Sl.no</th>
                  {colKeys.map((k) => (
                    <th key={k} className={`px-4 py-3 font-bold ${textPrimary} cursor-pointer ${rightAlignKeys.includes(k) ? 'text-right' : 'text-left'}`} onClick={() => handleSort(k)}>
                      <span className="flex items-center gap-2">
                        {colLabels[k] ?? k}
                        {getSortIcon(k)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, idx) => (
                  <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>{(currentPage - 1) * entriesPerPage + idx + 1}</td>
                    {isMaterials && <td className={`px-4 py-3 ${textPrimary}`}>{row.class ?? '-'}</td>}
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.name}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.totalInward)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.totalIssue)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.availableStock)}</td>
                  </tr>
                ))}
                {!isLoading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={colKeys.length + 1} className={`px-4 py-12 text-center ${textSecondary}`}>
                      No data available. Select a project and ensure there is stock for the selected {activeTab === 'materials' ? 'material' : 'assets'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredAndSorted.length > 0 && (
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <div className={`text-sm ${textSecondary}`}>
                Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50`}><ChevronLeft className="w-4 h-4" /></button>
                <span className={`text-sm font-bold ${textPrimary}`}>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50`}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectStockStatementReport;
