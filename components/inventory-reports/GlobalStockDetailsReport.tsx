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

  const filteredAndSorted = useMemo(() => {
    let out = tableData.filter(
      (r) =>
        tableSearch.trim() === '' ||
        [r.code, r.name, r.specification, r.unit, r.project].some((v) =>
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

  const headers = ['Sl.no', 'Code', 'Name', 'Specification', 'Unit', 'Project', 'Total Stock QTY'];
  const colKeys = ['code', 'name', 'specification', 'unit', 'project', 'totalStockQty'];

  const handleExport = (format: string) => {
    const rows = filteredAndSorted.map((r, idx) => [
      idx + 1,
      r.code,
      r.name,
      r.specification,
      r.unit,
      r.project,
      formatNum(r.totalStockQty),
    ]);
    if (format === 'Copy') {
      const text = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(text);
      toast.showSuccess('Copied to clipboard');
    } else if (format === 'CSV') {
      const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
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
        String(idx + 1), r.code, r.name, r.specification, r.unit, r.project, formatNum(r.totalStockQty),
      ]);
      autoTable(doc, { head: tableHeaders, body: tableBody, startY: 22, styles: { fontSize: 8 }, headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] } });
      doc.save(`global-stock-details-${activeTab}.pdf`);
      toast.showSuccess('Downloaded');
    } else if (format === 'Print') {
      const printContent = `
<!DOCTYPE html><html><head><title>Global Stock Details Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
<h1>Global Stock Details - ${activeTab === 'materials' ? 'Material' : 'Assets'}</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r, idx) => `<tr><td>${idx + 1}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td><td>${r.project}</td><td>${formatNum(r.totalStockQty)}</td></tr>`).join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => w.print(), 100);
      }
    }
  };

  const rightAlignKeys = ['totalStockQty'];

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
          <table className="w-full min-w-[700px] text-sm">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 font-bold ${textPrimary} text-left`}>Sl.no</th>
                {colKeys.map((k) => (
                  <th key={k} className={`px-4 py-3 font-bold ${textPrimary} cursor-pointer ${rightAlignKeys.includes(k) ? 'text-right' : 'text-left'}`} onClick={() => handleSort(k)}>
                    <span className="flex items-center gap-2">
                      {k === 'code' ? 'Code' : k === 'name' ? 'Name' : k === 'specification' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'project' ? 'Project' : 'Total Stock QTY'}
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
                  <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{row.name}</td>
                  <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                  <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{row.project}</td>
                  <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.totalStockQty)}</td>
                </tr>
              ))}
              {!isLoading && dataLoaded && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className={`px-4 py-12 text-center ${textSecondary}`}>
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
