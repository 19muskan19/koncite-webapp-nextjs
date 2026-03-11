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
import DatePickerInput from '../ui/DatePickerInput';
import { useProjectsFromMasters } from '../../hooks/useProjectsFromMasters';
import { masterDataAPI, goodsReceiptAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Project {
  id: string | number;
  name: string;
}

interface Store {
  id: string | number;
  name: string;
}

interface EntryType {
  id: string | number;
  name: string;
}

interface Vendor {
  id: string | number;
  name: string;
}

interface ReportRow {
  id: string;
  slNo: number;
  grnNo: string;
  date: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  receiptQty: number;
  rejectQty: number;
  acceptedQty: number;
  rate: number;
  amount: number;
  poQty: number;
  remarks: string;
}

interface GRNSlipReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GRNSlipReport: React.FC<GRNSlipReportProps> = ({ theme }) => {
  const toast = useToast();
  const projects = useProjectsFromMasters();
  const [stores, setStores] = useState<Store[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedEntryType, setSelectedEntryType] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'materials' | 'machines'>('materials');
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
    const load = async () => {
      try {
        const arr = await goodsReceiptAPI.getEntryTypeList();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setEntryTypes(list.map((e: any) => ({ id: e.id ?? e.uuid, name: e.name ?? e.entry_type ?? '' })));
      } catch {
        setEntryTypes([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const arr = await masterDataAPI.getVendors();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setVendors(list.map((v: any) => ({ id: v.id ?? v.uuid ?? v.vendors_id, name: v.name ?? v.vendor_name ?? '' })));
      } catch {
        setVendors([]);
      }
    };
    load();
  }, []);

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

  const loadReportData = useCallback(async () => {
    if (!selectedProject) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;

      let rows: ReportRow[] = [];
      try {
        const raw = await goodsReceiptAPI.getReport({
          projectId: projId,
          storeId: selectedStore || undefined,
          entryTypeId: selectedEntryType || undefined,
          supplierId: selectedSupplier || undefined,
          dateFrom: fromStr || undefined,
          search: searchQuery.trim() || undefined,
          dataType: activeTab,
        });
        const arr = Array.isArray(raw) ? raw : [];
        let slNo = 0;
        for (const item of arr) {
          const mat = item?.materials ?? item?.material ?? item?.assets ?? item;
          const code = mat?.code ?? item?.code ?? '-';
          const name = mat?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
          const spec = mat?.specification ?? item?.specification ?? '-';
          const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
          const recQty = Number(item?.recipt_qty ?? item?.receipt_qty ?? item?.receiptQty ?? 0);
          const rejQty = Number(item?.reject_qty ?? item?.reject_qty ?? item?.rejectQty ?? 0);
          const accQty = Number(item?.accepted_qty ?? item?.acceptedQty ?? recQty - rejQty);
          const rate = Number(item?.price ?? item?.rate ?? 0);
          const amt = rate * accQty;
          const poQty = Number(item?.po_qty ?? item?.poQty ?? 0);
          const remarks = item?.remarkes ?? item?.remarks ?? '-';
          const grnNo = item?.grn_no ?? item?.grnNo ?? item?.inv_inward_reg_no ?? '-';
          const d = item?.date ?? item?.request_date ?? '-';
          const dateStr = typeof d === 'string' && d.length >= 10 ? d.slice(0, 10) : (d || '-');
          slNo++;
          rows.push({
            id: `${item?.id ?? slNo}-${slNo}`,
            slNo,
            grnNo,
            date: dateStr,
            code,
            name,
            specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
            unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
            receiptQty: recQty,
            rejectQty: rejQty,
            acceptedQty: accQty,
            rate,
            amount: amt,
            poQty,
            remarks,
          });
        }
      } catch {
        /* API may not be available, fall through to build from list+edit */
      }

      if (rows.length === 0) {
        const inwardList = await goodsReceiptAPI.list();
        const inwards = Array.isArray(inwardList) ? inwardList : [];
        const filtered = inwards.filter((inv: any) => {
          const pId = inv?.projects_id?.id ?? inv?.projects_id ?? inv?.project_id ?? inv?.projects_id?.projects_id;
          if (String(pId) !== String(projId)) return false;
          if (selectedStore) {
            const storeIds = inv?.store_warehouses_id ?? inv?.store_ids ?? [];
            const arr = Array.isArray(storeIds) ? storeIds : (storeIds?.id ? [storeIds.id] : []);
            if (!arr.some((s: any) => String(s?.id ?? s) === String(selectedStore))) return false;
          }
          if (fromStr) {
            const d = inv?.date ?? inv?.created_at ?? '';
            const dStr = typeof d === 'string' && d.length >= 10 ? d.slice(0, 10) : '';
            if (dStr && dStr < fromStr) return false;
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const grn = (inv?.grn_no ?? inv?.name ?? inv?.id ?? '').toString().toLowerCase();
            if (!grn.includes(q)) return false;
          }
          return true;
        });

        let slNo = 0;
        for (const inv of filtered) {
          try {
            const invId = inv?.id ?? inv?.uuid ?? inv?.inv_inwards_id;
            const editData = await goodsReceiptAPI.edit(invId);
            const details = editData?.details ?? editData?.inward_details ?? editData?.inward_goods ?? [];
            const list = Array.isArray(details) ? details : [];
            const grnNo = inv?.grn_no ?? inv?.name ?? inv?.id ?? '-';
            const invDate = inv?.date ?? inv?.created_at ?? '-';
            const dateStr = typeof invDate === 'string' && invDate.length >= 10 ? invDate.slice(0, 10) : (invDate || '-');
            for (const d of list) {
              const itemType = (d?.type ?? (d?.materials_id ? 'materials' : d?.assets_id ? 'machines' : 'materials')).toString().toLowerCase();
              const wantMaterials = activeTab === 'materials';
              if (wantMaterials && (itemType === 'machines' || itemType === 'assets')) continue;
              if (!wantMaterials && (itemType === 'materials' || itemType === 'material')) continue;
              const mat = d?.materials ?? d?.material ?? d?.assets ?? d;
              const code = mat?.code ?? d?.materialCode ?? d?.code ?? '-';
              const name = mat?.name ?? d?.materialName ?? d?.materials_name ?? mat?.assets?.name ?? '-';
              const spec = mat?.specification ?? d?.materialSpec ?? d?.specification ?? '-';
              const unit = mat?.unit ?? d?.materialUnit ?? d?.unit ?? (mat?.units?.unit ?? '-');
              const recQty = Number(d?.recipt_qty ?? d?.receipt_qty ?? 0);
              const rejQty = Number(d?.reject_qty ?? 0);
              const accQty = Number(d?.accepted_qty ?? recQty - rejQty);
              const rate = Number(d?.price ?? d?.rate ?? 0);
              const amt = rate * accQty;
              const poQty = Number(d?.po_qty ?? 0);
              const remarks = d?.remarkes ?? d?.remarks ?? '-';
              slNo++;
              rows.push({
                id: `${invId}-${d?.id ?? slNo}`,
                slNo,
                grnNo,
                date: dateStr,
                code,
                name,
                specification: typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-'),
                unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
                receiptQty: recQty,
                rejectQty: rejQty,
                acceptedQty: accQty,
                rate,
                amount: amt,
                poQty,
                remarks,
              });
            }
          } catch {
            /* skip */
          }
        }
      }
      setTableData(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load GRN report');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedStore, selectedEntryType, selectedSupplier, fromDate, searchQuery, activeTab, projects, toast]);

  useEffect(() => {
    if (selectedProject) loadReportData();
  }, [selectedProject, selectedStore, selectedEntryType, selectedSupplier, fromDate, searchQuery, activeTab, loadReportData]);

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
        [r.grnNo, r.code, r.name, r.specification, r.unit, r.remarks].some((v) =>
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

  const headers = ['Sl No', 'GRN No', 'Date', 'Code', 'Name', 'Specification', 'Unit', 'Receipt Qty', 'Reject Qty', 'Accepted Qty', 'Rate', 'Amount', 'PO Qty', 'Remarks'];
  const handleExport = (format: string) => {
    const rows = filteredAndSorted.map((r) => [
      r.slNo,
      r.grnNo,
      r.date,
      r.code,
      r.name,
      r.specification,
      r.unit,
      formatNum(r.receiptQty),
      formatNum(r.rejectQty),
      formatNum(r.acceptedQty),
      formatNum(r.rate),
      formatNum(r.amount),
      formatNum(r.poQty),
      r.remarks,
    ]);
    if (format === 'Copy') {
      const text = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(text);
      toast.showSuccess('Copied to clipboard');
    } else if (format === 'CSV' || format === 'Excel') {
      const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `grn-slip-report.${format === 'CSV' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF' || format === 'Print') {
      const printContent = `
<!DOCTYPE html><html><head><title>GRN Slip Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
<h1>GRN (MRN) Slip Report - ${activeTab === 'materials' ? 'Material' : 'Machines/Assets'}</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r) => `<tr><td>${r.slNo}</td><td>${r.grnNo}</td><td>${r.date}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td><td>${formatNum(r.receiptQty)}</td><td>${formatNum(r.rejectQty)}</td><td>${formatNum(r.acceptedQty)}</td><td>${formatNum(r.rate)}</td><td>${formatNum(r.amount)}</td><td>${formatNum(r.poQty)}</td><td>${r.remarks}</td></tr>`).join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        if (format === 'Print') w.print();
      }
    }
  };

  const colKeys = ['slNo', 'grnNo', 'date', 'code', 'name', 'specification', 'unit', 'receiptQty', 'rejectQty', 'acceptedQty', 'rate', 'amount', 'poQty', 'remarks'];
  const rightAlignKeys = ['receiptQty', 'rejectQty', 'acceptedQty', 'rate', 'amount', 'poQty'];

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <FileText className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>GRN (MRN) Slip Report</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View goods receipt details by material or machines/assets
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Store</label>
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
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Entry To</label>
            <select
              value={selectedEntryType}
              onChange={(e) => setSelectedEntryType(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">Select Entry To</option>
              {entryTypes.map((e) => <option key={String(e.id)} value={String(e.id)}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>From Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">Select From Supplier</option>
              {vendors.map((v) => <option key={String(v.id)} value={String(v.id)}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Select From Date</label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Search</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
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
            onClick={() => setActiveTab('machines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'machines' ? 'bg-[#C2D642] text-slate-900' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
          >
            <Cpu className="w-4 h-4" /> Machines/Assets
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className={`w-4 h-4 ${textSecondary}`} />
          <input
            type="text"
            placeholder="Search table..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className={`flex-1 sm:w-64 pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
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
            <table className="w-full min-w-[1100px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  {colKeys.map((k) => (
                    <th key={k} className={`px-4 py-3 font-bold ${textPrimary} cursor-pointer ${rightAlignKeys.includes(k) ? 'text-right' : 'text-left'}`} onClick={() => handleSort(k)}>
                      <span className="flex items-center gap-2">
                        {k === 'slNo' ? 'Sl No' : k === 'grnNo' ? 'GRN No' : k === 'date' ? 'Date' : k === 'code' ? 'Code' : k === 'name' ? 'Name' : k === 'specification' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'receiptQty' ? 'Receipt Qty' : k === 'rejectQty' ? 'Reject Qty' : k === 'acceptedQty' ? 'Accepted Qty' : k === 'rate' ? 'Rate' : k === 'amount' ? 'Amount' : k === 'poQty' ? 'PO Qty' : 'Remarks'}
                        {getSortIcon(k)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.slNo}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.grnNo}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.date}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.name}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.receiptQty)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.rejectQty)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.acceptedQty)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.rate)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.amount)}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.poQty)}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.remarks}</td>
                  </tr>
                ))}
                {!isLoading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={14} className={`px-4 py-12 text-center ${textSecondary}`}>
                      No data available. Select a project and ensure there are GRN/MRN slips in the date range.
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

export default GRNSlipReport;
