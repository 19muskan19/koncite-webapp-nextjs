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
  Layers,
  Loader2,
  Copy,
  Download,
  FileDown,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePickerInput from '../ui/DatePickerInput';
import { useProjectsFromMasters, useSubprojectsFromMasters } from '../../hooks/useProjectsFromMasters';
import { masterDataAPI, materialRequestAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { InventoryReportMeta } from '@/types/inventoryReportMeta';
import { useUser } from '@/contexts/UserContext';
import { getSameOriginAssetPathForPdf } from '@/utils/imageUtils';
import { loadCompanyLogoRasterForPdf } from '@/utils/pdfImage';

interface Project {
  id: string | number;
  name: string;
}

interface Subproject {
  id: string | number;
  name: string;
}

interface ReportRow {
  id: string;
  srNo: number;
  code: string;
  materials: string;
  specification: string;
  unit: string;
  requiredQty: number;
  requiredDate: string;
  requiredForActivities: string;
  remarks: string;
  currentStock: number;
  /** For client-side filtering by subproject */
  prSubProjectId?: string | number;
  /**
   * PR document date (e.g. created_at / header date) for client date-range filter.
   * May differ from `requiredDate` (line item required date).
   */
  prDate?: string;
}

interface IndentReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Normalize a row or filter value to YYYY-MM-DD for inclusive range compare.
 * Accepts ISO date, short ISO, dd/mm/yyyy, datetime strings, and local Date-parsable text.
 * Returns null when the value cannot be interpreted as a calendar day (e.g. '-').
 */
function toComparableYmd(value: string | null | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '' || s === '-') return null;
  if (s.startsWith('1899-12-30') || s.startsWith('1899-12-31')) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Drop opening-stock rows that clearly belong to another project or (when filtered) another subproject. */
function openingStockRowMatchesScope(
  s: Record<string, unknown>,
  projId: string | number,
  subProjectFilter: string
): boolean {
  const rowProj =
    (s?.project as { id?: string | number } | undefined)?.id ??
    s?.projects_id ??
    s?.project_id ??
    (typeof s?.project === 'object' && s?.project != null && 'id' in (s.project as object)
      ? (s.project as { id?: string | number }).id
      : undefined);
  if (rowProj != null && String(rowProj) !== String(projId)) return false;
  if (!subProjectFilter) return true;
  const rowSub =
    (s?.sub_projects_id as { id?: string | number } | undefined)?.id ??
    s?.sub_projects_id ??
    s?.subproject_id ??
    (s?.sub_projects as { id?: string | number } | undefined)?.id;
  if (rowSub == null) return true;
  return String(rowSub) === String(subProjectFilter);
}

const IndentReport: React.FC<IndentReportProps> = ({ theme }) => {
  const toast = useToast();
  const { company: userCompany } = useUser();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const projects = useProjectsFromMasters();
  const projIdForSub = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject)?.id ?? selectedProject;
  const subprojects = useSubprojectsFromMasters(projIdForSub || undefined);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [indentNo, setIndentNo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  /** Set when /inventory-report returns (includes company/project logos from `meta`). */
  const [reportMeta, setReportMeta] = useState<InventoryReportMeta | null>(null);
  const [tableData, setTableData] = useState<ReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  useEffect(() => {
    if (!selectedProject) setSelectedSubProject('');
  }, [selectedProject]);

  /** API `meta` plus UI selections and signed-in company so PDF/Print/header stay populated when the report API fails or omits `meta`. */
  const mergedReportMeta = useMemo((): InventoryReportMeta | null => {
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const sub = subprojects.find((s) => String(s.id) === String(selectedSubProject));
    const api = reportMeta;

    const companyName = (api?.company?.name?.trim() || userCompany?.name?.trim() || '').trim();
    const companyLogo =
      api?.company?.logo != null && String(api.company.logo).trim() ? api.company.logo : userCompany?.logo ?? null;

    const projectName = (api?.project?.name?.trim() || proj?.name?.trim() || '').trim();
    const projectLogo = api?.project?.logo ?? null;

    const subName = (
      selectedSubProject ? api?.subProject?.name?.trim() || sub?.name?.trim() || '' : api?.subProject?.name?.trim() || ''
    ).trim();
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
              id: api?.subProject?.id ?? (sub?.id != null ? Number(sub.id) : null),
              name: subName || undefined,
              logo: subLogo,
            },
          }
        : {}),
      ...(selectedDate ? { selectedDate } : {}),
    };
  }, [reportMeta, userCompany, projects, subprojects, selectedProject, selectedSubProject, fromDate, toDate]);

  const loadReportData = useCallback(async () => {
    const hasProject = Boolean(selectedProject);
    const hasIndentNo = Boolean(indentNo.trim());
    if (!hasProject && !hasIndentNo) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    setReportMeta(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;

      let rows: ReportRow[] = [];
      /** When true, /inventory-report returned successfully — empty `material` must show empty table (no list+edit fill-in). */
      let prReportApiCompleted = false;
      let metaFromApi: InventoryReportMeta | null = null;
      try {
        /** Backend does not apply date range for PR report — fetch full set; filter in `filteredAndSorted`. */
        const { rows: arr, meta } = await materialRequestAPI.getReport({
          projectId: projId || undefined,
          indentNo: indentNo.trim() || undefined,
          ...(selectedSubProject ? { subProjectId: selectedSubProject } : {}),
        });
        metaFromApi = meta ?? null;
        prReportApiCompleted = true;
        const slice10 = (v: unknown): string => {
          if (v == null) return '';
          const s = String(v).trim();
          return s.length >= 10 ? s.slice(0, 10) : s;
        };
        let srNo = 0;
        for (const item of arr) {
          srNo++;
          const reqDate = item?.totalRequiredDate ?? item?.required_date ?? '-';
          const dateStr = typeof reqDate === 'string' && reqDate.length >= 10 ? reqDate.slice(0, 10) : (reqDate || '-');
          const prDocRaw =
            item?.pr_date ??
            item?.prDate ??
            item?.indent_date ??
            item?.mr_date ??
            item?.request_date ??
            item?.created_at ??
            item?.material_request?.date ??
            item?.material_request?.created_at;
          const prForFilter = slice10(prDocRaw) || dateStr;
          const spId = item?.sub_projects_id?.id ?? item?.sub_projects_id ?? item?.subproject_id;
          rows.push({
            id: `api-${srNo}-${item?.sl_no ?? 'na'}-${item?.code ?? ''}-${item?.name ?? ''}`.replace(/\s+/g, '_'),
            srNo,
            code: item?.code ?? '-',
            materials: item?.name ?? item?.materials ?? '-',
            specification: item?.specification ?? '-',
            unit: typeof item?.unit === 'object' ? (item?.unit?.unit ?? '-') : (item?.unit ?? '-'),
            requiredQty: Number(item?.totalRequiredQty ?? item?.required_qty ?? 0),
            requiredDate: dateStr,
            requiredForActivities: item?.requiredforActivities ?? item?.required_for_activities ?? '-',
            remarks: item?.remarks ?? '-',
            currentStock: Number(item?.currentStock ?? item?.current_stock ?? 0),
            prDate: prForFilter,
            prSubProjectId: spId,
          });
        }
      } catch {
        /* Report API error — allow list+edit fallback when project is selected */
        prReportApiCompleted = false;
        metaFromApi = null;
      }

      if (prReportApiCompleted) {
        setReportMeta(metaFromApi);
      }

      if (rows.length === 0 && hasProject && !prReportApiCompleted) {
      let prList = await materialRequestAPI.list({
        projectId: projId,
      });
      let prArr = Array.isArray(prList) ? prList : [];
      if (prArr.length === 0) {
        prList = await materialRequestAPI.list({ projectId: projId });
        prArr = Array.isArray(prList) ? prList : [];
      }

      const filtered = prArr.filter((pr: any) => {
        if (indentNo.trim()) {
          const reqNo = pr?.request_no ?? pr?.req_no ?? pr?.name ?? pr?.id ?? '';
          if (!String(reqNo).toLowerCase().includes(indentNo.trim().toLowerCase())) return false;
        }
        return true;
      });

      let stockMap: Record<string, number> = {};
      try {
        const stockList = await masterDataAPI.getMaterialsOpeningList(projId);
        const stockArr = Array.isArray(stockList) ? stockList : ((stockList as { data?: any[] })?.data ?? []);
        for (const s of stockArr) {
          if (!openingStockRowMatchesScope(s, projId, selectedSubProject)) continue;
          const matId = s?.materials_id ?? s?.material_id ?? s?.materials?.id ?? s?.material?.id;
          const qty = Number(s?.qty ?? s?.opening_qty ?? 0);
          if (matId != null) stockMap[String(matId)] = (stockMap[String(matId)] ?? 0) + qty;
        }
      } catch {
        /* ignore */
      }

      let srNo = 0;
      for (const pr of filtered) {
        try {
          const prProjId = (typeof pr.projects_id === 'object' && pr.projects_id != null) ? (pr.projects_id as any).id : (pr.projects_id ?? pr.project_id ?? pr.projects?.id);
          const editData = await materialRequestAPI.edit(pr.id ?? pr.material_requests_id, prProjId ?? undefined);
          const details = Array.isArray(editData) ? editData : (editData?.material_request_details ?? editData?.details ?? []);
          const list = Array.isArray(details) ? details : [];
          const prDate = pr?.date ?? pr?.created_at ?? pr?.pr_date ?? '';
          const prDateStr = typeof prDate === 'string' && prDate.length >= 10 ? prDate.slice(0, 10) : '';
          const prSpId = pr?.sub_projects_id?.id ?? pr?.sub_projects_id ?? pr?.subproject_id;
          for (const item of list) {
            const mat = item?.materials ?? item?.material ?? item;
            const code = mat?.code ?? item?.code ?? '-';
            const name = mat?.name ?? item?.material_name ?? item?.materials_name ?? '-';
            const spec = mat?.specification ?? item?.specification ?? '-';
            const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
            const qty = Number(item?.qty ?? item?.required_qty ?? item?.request_qty ?? 0);
            const reqDate = item?.date ?? item?.required_date ?? item?.requiredDate ?? prDateStr;
            const dateStr = typeof reqDate === 'string' && reqDate.length >= 10 ? reqDate.slice(0, 10) : (reqDate || prDateStr || '-');
            const act = item?.activities ?? item?.activity;
            const activityName = act?.name ?? act?.activities ?? item?.activity_name ?? '-';
            const remarks = item?.remarkes ?? item?.remarks ?? '-';
            const matId = mat?.id ?? item?.materials_id ?? item?.material_id;
            const currentStock = matId != null ? (stockMap[String(matId)] ?? 0) : 0;
            srNo++;
            rows.push({
              id: `${pr.id}-${item?.id ?? srNo}`,
              srNo,
              code,
              materials: name,
              specification: spec,
              unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
              requiredQty: qty,
              requiredDate: dateStr,
              requiredForActivities: activityName,
              remarks,
              currentStock,
              prDate: prDateStr || dateStr,
              prSubProjectId: prSpId,
            });
          }
        } catch {
          /* skip */
        }
      }
      }
      setTableData(rows);
      if (!prReportApiCompleted) {
        setReportMeta(null);
      }
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load report data');
      setTableData([]);
      setReportMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, indentNo, projects, toast]);

  useEffect(() => {
    if (selectedProject || indentNo.trim()) loadReportData();
  }, [selectedProject, selectedSubProject, indentNo, loadReportData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const filteredAndSorted = useMemo(() => {
    const fromY = toComparableYmd(fromDate);
    const toY = toComparableYmd(toDate);

    let out = tableData.filter((r) => {
      if (selectedSubProject && r.prSubProjectId != null && String(r.prSubProjectId) !== String(selectedSubProject)) return false;
      /** Inclusive: PR date in [fromY, toY]. Prefers `prDate` (PR document date), else required line date. */
      const d = toComparableYmd(r.prDate || r.requiredDate);
      if (fromY) {
        if (d == null) return true;
        if (d < fromY) return false;
      }
      if (toY) {
        if (d == null) return true;
        if (d > toY) return false;
      }
      if (searchQuery.trim() !== '') {
        const match = [r.code, r.materials, r.specification, r.unit, r.requiredForActivities, r.remarks].some((v) =>
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!match) return false;
      }
      return true;
    });
    if (sortConfig) {
      out = [...out].sort((a, b) => {
        const av = (a as any)[sortConfig!.key];
        const bv = (b as any)[sortConfig!.key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [tableData, searchQuery, sortConfig, selectedSubProject, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAndSorted.slice(start, start + entriesPerPage);
  }, [filteredAndSorted, currentPage, entriesPerPage]);

  useEffect(() => setCurrentPage(1), [searchQuery, sortConfig, selectedSubProject, fromDate, toDate, tableData.length]);

  const handleExport = (format: string) => {
    const headers = ['Sr.No', 'Code', 'Materials', 'Specification', 'Unit', 'Required qty', 'Required date', 'Required for Activities', 'Remarks', 'Current Stock'];
    const rows = filteredAndSorted.map((r) => [
      r.srNo,
      r.code,
      r.materials,
      r.specification,
      r.unit,
      formatNum(r.requiredQty),
      r.requiredDate,
      r.requiredForActivities,
      r.remarks,
      formatNum(r.currentStock),
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
      a.download = 'indent-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'Excel') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Indent Report');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'indent-report.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF') {
      void (async () => {
        try {
          const rm = mergedReportMeta;
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const margin = 14;
          let y = 12;

          doc.setFontSize(16);
          doc.text('Indent (Purchase Request) Report', margin, y);
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
            String(r.srNo),
            r.code,
            r.materials,
            r.specification,
            r.unit,
            formatNum(r.requiredQty),
            r.requiredDate,
            r.requiredForActivities,
            r.remarks,
            formatNum(r.currentStock),
          ]);

          autoTable(doc, {
            head: tableHeaders,
            body: tableBody,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          });

          doc.save('indent-report.pdf');
          toast.showSuccess('Downloaded');
        } catch {
          toast.showError('Could not generate PDF');
        }
      })();
    } else if (format === 'Print') {
      const rm = mergedReportMeta;
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
      const headerRow = `<h1 style="margin:0 0 14px 0;font-size:20px;font-weight:bold">Indent (Purchase Request) Report</h1>
<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:18px;flex-wrap:wrap">
  ${companyImg ? `<div style="flex-shrink:0"><img src="${esc(companyImg.startsWith('/') ? `${typeof window !== 'undefined' ? window.location.origin : ''}${companyImg}` : companyImg)}" alt="" style="max-height:56px;max-width:200px;object-fit:contain" /></div>` : ''}
  <div style="font-size:13px;line-height:1.55;min-width:200px">${metaLines}</div>
</div>`;
      const printContent = `
<!DOCTYPE html><html><head><title>Indent Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:8px;text-align:left} th{background:#f0f0f0}</style>
</head><body>
${headerRow}
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r) => `<tr><td>${r.srNo}</td><td>${r.code}</td><td>${r.materials}</td><td>${r.specification}</td><td>${r.unit}</td><td>${formatNum(r.requiredQty)}</td><td>${r.requiredDate}</td><td>${r.requiredForActivities}</td><td>${r.remarks}</td><td>${formatNum(r.currentStock)}</td></tr>`).join('')}</tbody></table>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => w.print(), 100);
      }
    }
  };

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <FileText className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Indent (Purchase Request) Report</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View indent / purchase request details
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                aria-required
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">---select project---</option>
                {projects.map((p) => <option key={String(p.id)} value={String(p.id)}>{p.name}</option>)}
              </select>
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
                <option value="">All Sub Projects</option>
                {subprojects.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.name}</option>)}
              </select>
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
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Indent No</label>
            <input
              type="text"
              placeholder="Enter Indent No."
              value={indentNo}
              onChange={(e) => setIndentNo(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>
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
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {(selectedProject || indentNo.trim()) && (
        <div className={`rounded-xl border ${cardClass} overflow-hidden relative min-h-[200px]`}>
          {isLoading && (
            <div className={`absolute inset-0 z-10 ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} flex items-center justify-center`}>
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  {['srNo', 'code', 'materials', 'specification', 'unit', 'requiredQty', 'requiredDate', 'requiredForActivities', 'remarks', 'currentStock'].map((k) => (
                    <th key={k} className={`px-4 py-3 font-bold ${textPrimary} cursor-pointer ${['requiredQty', 'currentStock'].includes(k) ? 'text-right' : 'text-left'}`} onClick={() => handleSort(k)}>
                      <span className="flex items-center gap-2">
                        {k === 'srNo' ? 'Sr.No' : k === 'code' ? 'Code' : k === 'materials' ? 'Materials' : k === 'specification' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'requiredQty' ? 'Required qty' : k === 'requiredDate' ? 'Required date' : k === 'requiredForActivities' ? 'Required for Activities' : k === 'remarks' ? 'Remarks' : 'Current Stock'}
                        {getSortIcon(k)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr key={row.id} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.srNo}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.materials}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.requiredQty)}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.requiredDate}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.requiredForActivities}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.remarks}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.currentStock)}</td>
                  </tr>
                ))}
                {!isLoading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={10} className={`px-4 py-12 text-center ${textSecondary}`}>
                      {tableData.length === 0
                        ? 'Select a project or enter Indent No to load data. Use subproject and date filters to narrow results.'
                        : 'No data matches the current filters. Try adjusting subproject or date range.'}
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

export default IndentReport;
