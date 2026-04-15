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
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { masterDataAPI, goodsReceiptAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { InventoryReportMeta } from '@/types/inventoryReportMeta';
import { useUser } from '@/contexts/UserContext';
import { getSameOriginAssetPathForPdf } from '@/utils/imageUtils';
import { loadCompanyLogoRasterForPdf } from '@/utils/pdfImage';

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
  poBalance: number;
  remarks: string;
}

interface GRNDetailsReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const GRNDetailsReport: React.FC<GRNDetailsReportProps> = ({ theme }) => {
  const toast = useToast();
  const { company: userCompany } = useUser();
  const projects = useProjectsFromMasters();
  const [stores, setStores] = useState<Store[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedEntryType, setSelectedEntryType] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'materials' | 'machines'>('materials');
  const [isLoading, setIsLoading] = useState(false);
  const [reportMeta, setReportMeta] = useState<InventoryReportMeta | null>(null);
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

  /** API `meta` plus UI + signed-in company for PDF/Print when API omits `meta`. */
  const mergedReportMeta = useMemo((): InventoryReportMeta | null => {
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const api = reportMeta;

    const companyName = (api?.company?.name?.trim() || userCompany?.name?.trim() || '').trim();
    const companyLogo =
      api?.company?.logo != null && String(api.company.logo).trim() ? api.company.logo : userCompany?.logo ?? null;

    const projectName = (api?.project?.name?.trim() || proj?.name?.trim() || '').trim();
    const projectLogo = api?.project?.logo ?? null;

    const subName = (api?.subProject?.name?.trim() || '').trim();
    const subLogo = api?.subProject?.logo ?? null;

    const selectedDate =
      api?.selectedDate && (api.selectedDate.from || api.selectedDate.to || api.selectedDate.date)
        ? api.selectedDate
        : fromDate.length >= 10 && toDate.length >= 10
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
              id: api?.subProject?.id ?? null,
              name: subName || undefined,
              logo: subLogo,
            },
          }
        : {}),
      ...(selectedDate ? { selectedDate } : {}),
    };
  }, [reportMeta, userCompany, projects, selectedProject, fromDate, toDate]);

  const loadReportData = useCallback(async () => {
    if (!selectedProject || !selectedStore || !fromDate || !toDate) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    setReportMeta(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const toStr = toDate.length >= 10 ? toDate.slice(0, 10) : toDate;

      let rows: ReportRow[] = [];
      try {
        const res = await goodsReceiptAPI.getReport({
          projectId: projId,
          storeId: selectedStore,
          entryTypeId: selectedEntryType || undefined,
          supplierId: selectedSupplier || undefined,
          from_date: fromStr,
          to_date: toStr,
          search: searchQuery.trim() || undefined,
          dataType: activeTab,
          reportType: 'grn-details',
        });
        setReportMeta(res.meta != null ? res.meta : null);
        const arr = res.rows ?? [];
        for (const item of arr) {
          const mat = item?.materials ?? item?.material ?? item?.assets ?? item;
          const code = mat?.code ?? item?.code ?? '-';
          const name = mat?.name ?? item?.material_name ?? item?.materials_name ?? item?.assets?.name ?? '-';
          const spec = mat?.specification ?? item?.specification ?? '-';
          const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
          const recQty = Number(item?.recipt_qty ?? item?.receipt_qty ?? item?.receiptQty ?? 0);
          const rejQty = Number(item?.reject_qty ?? item?.reject_qty ?? item?.rejectQty ?? 0);
          const accQty = Number(item?.accepted_qty ?? item?.acceptedQty ?? recQty - rejQty);
          const rate = Number(item?.price ?? item?.rate ?? item?.quote_rate ?? 0);
          const amt = Number(item?.amount ?? rate * accQty);
          const poQty = Number(item?.po_qty ?? item?.poQty ?? 0);
          const poBalance = Number(item?.po_balance ?? item?.poBalance ?? 0);
          const remarks = item?.remarkes ?? item?.remarks ?? '-';
          const grnNo = item?.grn_no ?? item?.grnNo ?? item?.inv_inward_reg_no ?? '-';
          const d = item?.date ?? item?.request_date ?? '-';
          const dateStr = typeof d === 'string' && d.length >= 10 ? d.slice(0, 10) : (d || '-');
          rows.push({
            id: `${item?.id ?? item?.grn_no ?? Math.random()}-${rows.length}`,
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
            poBalance,
            remarks,
          });
        }
      } catch {
        setReportMeta(null);
      }

      if (rows.length === 0 && selectedStore) {
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
          if (fromStr || toStr) {
            const d = inv?.date ?? inv?.created_at ?? '';
            const dStr = typeof d === 'string' && d.length >= 10 ? d.slice(0, 10) : '';
            if (dStr) {
              if (fromStr && dStr < fromStr) return false;
              if (toStr && dStr > toStr) return false;
            }
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const grn = (inv?.grn_no ?? inv?.name ?? inv?.id ?? '').toString().toLowerCase();
            if (!grn.includes(q)) return false;
          }
          return true;
        });

        for (const inv of filtered) {
          try {
            const invId = inv?.id ?? inv?.uuid ?? inv?.inv_inwards_id;
            const editData = await goodsReceiptAPI.edit(invId);
            // Backend returns InvInwardGoodDetails; items have materials_id as object
            const details = editData?.InvInwardGoodDetails ?? editData?.details ?? editData?.inward_details ?? editData?.inward_goods ?? [];
            const list = Array.isArray(details) ? details : [];
            const grnNo = editData?.grn_no ?? inv?.grn_no ?? inv?.name ?? inv?.id ?? '-';
            const invDate = editData?.date ?? inv?.date ?? inv?.created_at ?? '-';
            const dateStr = typeof invDate === 'string' && invDate.length >= 10 ? invDate.slice(0, 10) : (invDate || '-');
            for (const d of list) {
              const itemType = (d?.type ?? (d?.materials_id ? 'materials' : d?.assets_id ? 'machines' : 'materials')).toString().toLowerCase();
              const wantMaterials = activeTab === 'materials';
              if (wantMaterials && (itemType === 'machines' || itemType === 'assets')) continue;
              if (!wantMaterials && (itemType === 'materials' || itemType === 'material')) continue;
              const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d?.assets ?? d;
              const code = (typeof mat === 'object' && mat?.code) ?? d?.materialCode ?? d?.code ?? '-';
              const name = (typeof mat === 'object' && mat?.name) ?? d?.materialName ?? d?.materials_name ?? (typeof mat === 'object' && mat?.assets?.name) ?? '-';
              const spec = (typeof mat === 'object' && mat?.specification) ?? d?.materialSpec ?? d?.specification ?? '-';
              const unit = (typeof mat === 'object' && (mat?.unit_id?.unit ?? mat?.unit ?? mat?.units?.unit)) ?? d?.materialUnit ?? d?.unit ?? '-';
              const recQty = Number(d?.recipt_qty ?? d?.receipt_qty ?? 0);
              const rejQty = Number(d?.reject_qty ?? 0);
              const accQty = Number(d?.accepted_qty ?? recQty - rejQty);
              const rate = Number(d?.price ?? d?.rate ?? 0);
              const amt = rate * accQty;
              const poQty = Number(d?.po_qty ?? 0);
              const poBalance = (d?.po_balance ?? d?.poBalance) != null ? Number(d?.po_balance ?? d?.poBalance ?? 0) : Math.max(0, poQty - accQty);
              const remarks = d?.remarkes ?? d?.remarks ?? '-';
              rows.push({
                id: `${invId}-${d?.id ?? rows.length}`,
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
                poBalance,
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
      toast.showError(err?.message || 'Failed to load GRN Details report');
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedStore, selectedEntryType, selectedSupplier, fromDate, toDate, searchQuery, activeTab, projects, toast]);

  useEffect(() => {
    if (selectedProject && selectedStore && fromDate && toDate) loadReportData();
  }, [selectedProject, selectedStore, selectedEntryType, selectedSupplier, fromDate, toDate, searchQuery, activeTab, loadReportData]);

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

  const headers = ['GRN No', 'Date', 'Code', 'Name', 'Specification', 'Unit', 'Receipt Qty', 'Reject Qty', 'Accepted Qty', 'Rate', 'Amount', 'PO Qty', 'PO Balance', 'Remarks'];
  const handleExport = (format: string) => {
    const rows = filteredAndSorted.map((r) => [
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
      formatNum(r.poBalance),
      r.remarks,
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
      a.download = 'grn-details-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'Excel') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GRN Details');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'grn-details-report.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF') {
      void (async () => {
        try {
          const rm = mergedReportMeta;
          const reportTitle = `GRN (MRN) Details Report - ${activeTab === 'materials' ? 'Material' : 'Machines/Assets'}`;
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const margin = 14;
          let y = 12;

          doc.setFontSize(16);
          doc.text(reportTitle, margin, y);
          y += 9;

          const rawCompanyLogo = rm?.company?.logo ?? userCompany?.logo ?? null;
          const raster = await loadCompanyLogoRasterForPdf(rawCompanyLogo);

          const bandTop = y;
          const logoMaxH = 14;
          const logoMaxW = 32;
          let textX = margin;
          let logoH = 0;

          if (raster) {
            try {
              const ar = raster.widthPx / raster.heightPx;
              const th = logoMaxH;
              const tw = Math.min(ar * th, logoMaxW);
              const thDraw = tw / ar;
              doc.addImage(raster.dataUrl, raster.format, margin, bandTop, tw, thDraw);
              textX = margin + tw + 5;
              logoH = thDraw;
            } catch {
              /* text-only header */
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
          if (rm?.subProject?.name) line(`Sub project: ${String(rm.subProject.name)}`);
          const sd = rm?.selectedDate;
          if (sd?.from && sd?.to) line(`Period: ${sd.from} – ${sd.to}`);
          else if (sd?.date) line(`Date: ${String(sd.date)}`);

          const metaBottom = Math.max(bandTop + logoH, lineY + 1);
          y = metaBottom + 5;

          doc.setFontSize(10);
          const tableHeaders = [headers];
          const tableBody = filteredAndSorted.map((r) => [
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
            formatNum(r.poBalance),
            r.remarks,
          ]);
          autoTable(doc, {
            head: tableHeaders,
            body: tableBody,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          });
          doc.save('grn-details-report.pdf');
          toast.showSuccess('Downloaded');
        } catch {
          toast.showError('Could not generate PDF');
        }
      })();
    } else if (format === 'Print') {
      const rm = mergedReportMeta;
      const reportTitle = `GRN (MRN) Details Report - ${activeTab === 'materials' ? 'Material' : 'Machines/Assets'}`;
      const esc = (s: string) =>
        String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const companyImg =
        getSameOriginAssetPathForPdf(rm?.company?.logo ?? userCompany?.logo ?? null) || '';
      const metaLines = [
        rm?.company?.name ? `<p style="margin:0 0 4px 0"><strong>Company:</strong> ${esc(String(rm.company.name))}</p>` : '',
        rm?.project?.name ? `<p style="margin:0 0 4px 0"><strong>Project:</strong> ${esc(String(rm.project.name))}</p>` : '',
        rm?.subProject?.name ? `<p style="margin:0 0 4px 0"><strong>Sub project:</strong> ${esc(String(rm.subProject.name))}</p>` : '',
        rm?.selectedDate?.from && rm?.selectedDate?.to
          ? `<p style="margin:0 0 4px 0"><strong>Period:</strong> ${esc(`${rm.selectedDate.from} – ${rm.selectedDate.to}`)}</p>`
          : rm?.selectedDate?.date
            ? `<p style="margin:0 0 4px 0"><strong>Date:</strong> ${esc(String(rm.selectedDate.date))}</p>`
            : '',
      ]
        .filter(Boolean)
        .join('');
      const headerRow = `<h1 style="margin:0 0 14px 0;font-size:18px;font-weight:bold">${esc(reportTitle)}</h1>
<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:18px;flex-wrap:wrap">
  ${companyImg ? `<div style="flex-shrink:0"><img src="${esc(companyImg.startsWith('/') ? `${typeof window !== 'undefined' ? window.location.origin : ''}${companyImg}` : companyImg)}" alt="" style="max-height:56px;max-width:200px;object-fit:contain" /></div>` : ''}
  <div style="font-size:13px;line-height:1.55;min-width:200px">${metaLines}</div>
</div>`;
      const printContent = `
<!DOCTYPE html><html><head><title>GRN Details Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #000;padding:6px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
${headerRow}
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r) => `<tr><td>${r.grnNo}</td><td>${r.date}</td><td>${r.code}</td><td>${r.name}</td><td>${r.specification}</td><td>${r.unit}</td><td>${formatNum(r.receiptQty)}</td><td>${formatNum(r.rejectQty)}</td><td>${formatNum(r.acceptedQty)}</td><td>${formatNum(r.rate)}</td><td>${formatNum(r.amount)}</td><td>${formatNum(r.poQty)}</td><td>${formatNum(r.poBalance)}</td><td>${r.remarks}</td></tr>`).join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => w.print(), 100);
      }
    }
  };

  const colKeys = ['grnNo', 'date', 'code', 'name', 'specification', 'unit', 'receiptQty', 'rejectQty', 'acceptedQty', 'rate', 'amount', 'poQty', 'poBalance', 'remarks'];
  const rightAlignKeys = ['receiptQty', 'rejectQty', 'acceptedQty', 'rate', 'amount', 'poQty', 'poBalance'];

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <FileText className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>GRN (MRN) Details Report</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View GRN details with PO balance by material or machines/assets
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
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
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>From Date <span className="text-red-500">*</span></label>
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
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>To Date <span className="text-red-500">*</span></label>
            <DatePickerInput
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
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

      {selectedProject && selectedStore && fromDate && toDate && (
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
                        {k === 'grnNo' ? 'GRN No' : k === 'date' ? 'Date' : k === 'code' ? 'Code' : k === 'name' ? 'Name' : k === 'specification' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'receiptQty' ? 'Receipt Qty' : k === 'rejectQty' ? 'Reject Qty' : k === 'acceptedQty' ? 'Accepted Qty' : k === 'rate' ? 'Rate' : k === 'amount' ? 'Amount' : k === 'poQty' ? 'PO Qty' : k === 'poBalance' ? 'PO Balance' : 'Remarks'}
                        {getSortIcon(k)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
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
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.poBalance)}</td>
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

export default GRNDetailsReport;
