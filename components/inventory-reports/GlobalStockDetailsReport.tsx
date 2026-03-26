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
  Loader2,
  Copy,
  Download,
  FileDown,
  Printer,
  Package,
  Cpu,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { masterDataAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface ReportRow {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  project: string;
  totalStockQty: number;
}

/** One row per material; qty broken out by project column + total */
interface PivotRow {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  byProject: Record<string, number>;
  totalQty: number;
}

const materialGroupKey = (r: Pick<ReportRow, 'code' | 'name' | 'specification' | 'unit'>) =>
  [r.code, r.name, r.specification, r.unit].join('\x1e');

interface GlobalStockDetailsReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GlobalStockDetailsReport: React.FC<GlobalStockDetailsReportProps> = ({ theme }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'materials' | 'assets'>('materials');
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<ReportRow[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dataLoaded, setDataLoaded] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    setTableData([]);
    setDataLoaded(true);
    try {
      const dataType = activeTab === 'materials' ? 'materials' : 'assets';
      let rows: ReportRow[] = [];

      try {
        const raw = await masterDataAPI.getGlobalStockReport(dataType);
        const arr = Array.isArray(raw) ? raw : [];
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          const mat = item?.material ?? item?.materials ?? item?.assets ?? item;
          const code = mat?.code ?? item?.code ?? '-';
          const name = mat?.name ?? item?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
          const spec = mat?.specification ?? item?.specification ?? '-';
          const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
          const project = item?.project?.project_name ?? item?.project_name ?? item?.project ?? '-';
          const qty = Number(item?.total_inward ?? item?.total_stock_qty ?? item?.qty ?? 0);
          if (qty <= 0) continue;
          rows.push({
            id: `${item?.id ?? i}-${rows.length}`,
            code,
            name,
            specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
            unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
            project,
            totalStockQty: qty,
          });
        }
      } catch {
        /* API may not exist - fallback to opening stock across all projects */
      }

      if (rows.length === 0) {
        try {
          const projects = await masterDataAPI.getProjects();
          const projectList = Array.isArray(projects) ? projects : ((projects as { data?: any[] })?.data ?? []);
          const allRows: ReportRow[] = [];
          for (const proj of projectList) {
            const projId = proj?.id ?? proj?.project_id ?? proj?.projects_id;
            const projName = proj?.project_name ?? proj?.name ?? '-';
            let list: any[] = [];
            if (dataType === 'materials') {
              list = await masterDataAPI.getMaterialsOpeningList(projId);
            } else {
              list = await masterDataAPI.getAssetsOpeningStockList(projId);
            }
            const arr = Array.isArray(list) ? list : [];
            for (let i = 0; i < arr.length; i++) {
              const item = arr[i];
              const mat = item?.material ?? item?.materials ?? item?.assets ?? item;
              const code = mat?.code ?? item?.code ?? '-';
              const name = mat?.name ?? item?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
              const spec = mat?.specification ?? item?.specification ?? '-';
              const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
              const qty = Number(item?.qty ?? item?.opening ?? item?.opening_qty ?? 0);
              if (qty <= 0) continue;
              allRows.push({
                id: `${projId}-${item?.id ?? i}-${allRows.length}`,
                code,
                name,
                specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
                unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
                project: projName,
                totalStockQty: qty,
              });
            }
          }
          rows = allRows;
        } catch (err: any) {
          toast.showError(err?.message || 'Failed to load global stock data');
        }
      }

      setTableData(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load Global Stock Details report');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const { projectColumns, pivotRows } = useMemo(() => {
    const projSet = new Set<string>();
    const groups = new Map<
      string,
      { code: string; name: string; specification: string; unit: string; projectQty: Map<string, number> }
    >();

    for (const r of tableData) {
      const key = materialGroupKey(r);
      const projName = (r.project || '-').trim() || '-';
      projSet.add(projName);
      if (!groups.has(key)) {
        groups.set(key, {
          code: r.code,
          name: r.name,
          specification: r.specification,
          unit: r.unit,
          projectQty: new Map(),
        });
      }
      const g = groups.get(key)!;
      const prev = g.projectQty.get(projName) ?? 0;
      g.projectQty.set(projName, prev + r.totalStockQty);
    }

    const sortedProjects = Array.from(projSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const rows: PivotRow[] = [];
    for (const [key, g] of groups) {
      const byProject: Record<string, number> = {};
      let totalQty = 0;
      for (const p of sortedProjects) {
        const q = g.projectQty.get(p) ?? 0;
        byProject[p] = q;
        totalQty += q;
      }
      rows.push({
        id: key,
        code: g.code,
        name: g.name,
        specification: g.specification,
        unit: g.unit,
        byProject,
        totalQty,
      });
    }

    return { projectColumns: sortedProjects, pivotRows: rows };
  }, [tableData]);

  const filteredAndSorted = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    let out = pivotRows.filter((r) => {
      if (!q) return true;
      const inBase = [r.code, r.name, r.specification, r.unit].some((v) => String(v).toLowerCase().includes(q));
      if (inBase) return true;
      return projectColumns.some((p) => String(r.byProject[p] ?? '').includes(q) || p.toLowerCase().includes(q));
    });

    if (sortConfig) {
      const sk = sortConfig.key;
      out = [...out].sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        if (sk === 'totalQty') {
          av = a.totalQty;
          bv = b.totalQty;
        } else if (sk.startsWith('project:')) {
          const p = sk.slice('project:'.length);
          av = a.byProject[p] ?? 0;
          bv = b.byProject[p] ?? 0;
        } else {
          av = (a as any)[sk] ?? '';
          bv = (b as any)[sk] ?? '';
        }
        const cmp =
          typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [pivotRows, projectColumns, tableSearch, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAndSorted.slice(start, start + entriesPerPage);
  }, [filteredAndSorted, currentPage, entriesPerPage]);

  useEffect(() => setCurrentPage(1), [tableSearch, sortConfig]);

  const baseHeaders = ['Code', 'Name', 'Specification', 'Unit'];
  const headers = useMemo(
    () => ['Sl.no', ...baseHeaders, ...projectColumns, 'Total'],
    [projectColumns]
  );

  const handleExport = (format: string) => {
    const rows = filteredAndSorted.map((r, idx) => [
      idx + 1,
      r.code,
      r.name,
      r.specification,
      r.unit,
      ...projectColumns.map((p) => formatNum(r.byProject[p] ?? 0)),
      formatNum(r.totalQty),
    ]);
    if (format === 'Copy') {
      const text = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(text);
      toast.showSuccess('Copied to clipboard');
    } else if (format === 'CSV') {
      const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`;
      const csv = [headers.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `global-stock-details-${activeTab}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'Excel') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Global Stock');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `global-stock-details-${activeTab}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(`Global Stock Details - ${activeTab === 'materials' ? 'Material' : 'Assets'}`, 14, 15);
      doc.setFontSize(10);
      const tableHeaders = [headers];
      const tableBody = filteredAndSorted.map((r, idx) => [
        String(idx + 1),
        r.code,
        r.name,
        r.specification,
        r.unit,
        ...projectColumns.map((p) => formatNum(r.byProject[p] ?? 0)),
        formatNum(r.totalQty),
      ]);
      autoTable(doc, {
        head: tableHeaders,
        body: tableBody,
        startY: 22,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        horizontalPageBreak: true,
      });
      doc.save(`global-stock-details-${activeTab}.pdf`);
      toast.showSuccess('Downloaded');
    } else if (format === 'Print') {
      const printContent = `
<!DOCTYPE html><html><head><title>Global Stock Details Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
<h1>Global Stock Details - ${activeTab === 'materials' ? 'Material' : 'Assets'}</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted
        .map(
          (r, idx) =>
            `<tr><td>${idx + 1}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td>${projectColumns.map((p) => `<td class="text-right">${formatNum(r.byProject[p] ?? 0)}</td>`).join('')}<td class="text-right">${formatNum(r.totalQty)}</td></tr>`
        )
        .join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => w.print(), 100);
      }
    }
  };

  const staticSortKeys = ['code', 'name', 'specification', 'unit'] as const;

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <FileText className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Global Stock Details</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View global stock across all projects by material or assets
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="flex gap-2">
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
                <th className={`px-3 py-3 font-bold ${textPrimary} text-left whitespace-nowrap`}>Sl.no</th>
                {staticSortKeys.map((k) => (
                  <th
                    key={k}
                    className={`px-3 py-3 font-bold ${textPrimary} cursor-pointer text-left whitespace-nowrap`}
                    onClick={() => handleSort(k)}
                  >
                    <span className="flex items-center gap-2">
                      {k === 'code' ? 'Code' : k === 'name' ? 'Name' : k === 'specification' ? 'Specification' : 'Unit'}
                      {getSortIcon(k)}
                    </span>
                  </th>
                ))}
                {projectColumns.map((p) => (
                  <th
                    key={`col-${p}`}
                    className={`px-3 py-3 font-bold ${textPrimary} cursor-pointer text-right whitespace-nowrap max-w-[140px] truncate`}
                    title={p}
                    onClick={() => handleSort(`project:${p}`)}
                  >
                    <span className="flex items-center justify-end gap-2">
                      {p}
                      {getSortIcon(`project:${p}`)}
                    </span>
                  </th>
                ))}
                <th
                  className={`px-3 py-3 font-bold ${textPrimary} cursor-pointer text-right whitespace-nowrap`}
                  onClick={() => handleSort('totalQty')}
                >
                  <span className="flex items-center justify-end gap-2">
                    Total
                    {getSortIcon('totalQty')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, idx) => (
                <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                  <td className={`px-3 py-3 ${textPrimary} whitespace-nowrap`}>{(currentPage - 1) * entriesPerPage + idx + 1}</td>
                  <td className={`px-3 py-3 ${textPrimary}`}>{row.code}</td>
                  <td className={`px-3 py-3 ${textPrimary}`}>{row.name}</td>
                  <td className={`px-3 py-3 ${textSecondary} max-w-[200px]`}>{row.specification}</td>
                  <td className={`px-3 py-3 ${textSecondary} whitespace-nowrap`}>{row.unit}</td>
                  {projectColumns.map((p) => (
                    <td key={`${row.id}-${p}`} className={`px-3 py-3 text-right tabular-nums ${textPrimary}`}>
                      {formatNum(row.byProject[p] ?? 0)}
                    </td>
                  ))}
                  <td className={`px-3 py-3 text-right tabular-nums font-bold ${textPrimary}`}>{formatNum(row.totalQty)}</td>
                </tr>
              ))}
              {!isLoading && dataLoaded && paginated.length === 0 && (
                <tr>
                  <td colSpan={6 + projectColumns.length} className={`px-4 py-12 text-center ${textSecondary}`}>
                    No data available. Select a tab to load {activeTab === 'materials' ? 'material' : 'assets'} stock.
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
    </div>
  );
};

export default GlobalStockDetailsReport;
