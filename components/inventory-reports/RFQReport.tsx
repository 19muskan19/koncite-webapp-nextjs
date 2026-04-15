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
  User,
  Copy,
  Download,
  FileDown,
  Printer,
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { useProjectsFromMasters, useSubprojectsFromMasters } from '../../hooks/useProjectsFromMasters';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { masterDataAPI, rfqAPI, teamsAPI } from '../../services/api';
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

interface UserOption {
  id: string | number;
  name: string;
}

interface ReportRow {
  id: string;
  slNo: number;
  code: string;
  materialsNames: string;
  specification: string;
  unit: string;
  requestQuantity: number;
  requestDate: string;
  price: number;
  /** For client-side filtering by subproject */
  prSubProjectId?: string | number;
  /** For client-side filtering by date */
  prDate?: string;
  /** For client-side filtering by prepared by */
  preparedById?: string | number;
}

interface RFQReportProps {
  theme: ThemeType;
}

const formatNum = (n: any) => {
  const v = Number(n);
  return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const RFQReport: React.FC<RFQReportProps> = ({ theme }) => {
  const toast = useToast();
  const { company: userCompany } = useUser();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const projects = useProjectsFromMasters();
  const projIdForSub = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject)?.id ?? selectedProject;
  const subprojects = useSubprojectsFromMasters(projIdForSub || undefined);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [rfqNo, setRfqNo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
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

  /** API `meta` plus UI selections and signed-in company for PDF/Print when API omits `meta`. */
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

  useEffect(() => {
    const load = async () => {
      try {
        const arr = await teamsAPI.getTeamsList();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setUsers(list.map((u: any) => ({
          id: u.id ?? u.uuid ?? u.user_id,
          name: u.name ?? u.user?.name ?? u.email ?? '',
        })));
      } catch {
        setUsers([]);
      }
    };
    load();
  }, []);

  const loadReportData = useCallback(async () => {
    const hasProject = Boolean(selectedProject);
    const hasRfqNo = Boolean(rfqNo.trim());
    const hasPrepared = Boolean(preparedBy);
    if (!hasProject && !hasRfqNo && !hasPrepared) {
      setTableData([]);
      return;
    }
    setIsLoading(true);
    setTableData([]);
    setReportMeta(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;

      const { rows: arr, meta } = await rfqAPI.getReport({
        projectId: projId || undefined,
        prepared: preparedBy || undefined,
        rfqno: rfqNo.trim() || undefined,
      });
      setReportMeta(meta ?? null);

      const rows: ReportRow[] = [];
      let slNo = 0;
      for (const item of arr) {
        if (item == null) continue;
        const mat = item?.materials ?? item?.material ?? item;
        const code = mat?.code ?? item?.code ?? '-';
        const name = mat?.name ?? item?.material_name ?? item?.materials_names ?? item?.materials_name ?? '-';
        const spec = mat?.specification ?? item?.specification ?? '-';
        const unit = mat?.unit ?? item?.unit ?? (mat?.units?.unit ?? '-');
        const qty = Number(item?.required_qty ?? item?.qty ?? item?.request_qty ?? item?.request_quantity ?? item?.requestQuantity ?? 0);
        const reqDate = item?.required_date ?? item?.date ?? item?.request_date ?? item?.requestDate ?? '-';
        const dateStr = typeof reqDate === 'string' && reqDate.length >= 10 ? reqDate.slice(0, 10) : (reqDate || '-');
        const price = Number(item?.quote_rate ?? item?.price ?? 0);
        const spId = item?.sub_projects_id?.id ?? item?.sub_projects_id ?? item?.subproject_id;
        const prepId = item?.prepared_by?.id ?? item?.prepared_by ?? item?.user_id ?? item?.users_id;
        slNo++;
        rows.push({
          id: `${item?.id ?? slNo}-${slNo}`,
          slNo,
          code,
          materialsNames: name,
          specification: spec,
          unit: typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-'),
          requestQuantity: qty,
          requestDate: dateStr,
          price,
          prDate: dateStr,
          prSubProjectId: spId,
          preparedById: prepId,
        });
      }
      setTableData(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load RFQ report');
      setTableData([]);
      setReportMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, preparedBy, rfqNo, projects, toast]);

  useEffect(() => {
    if (selectedProject || rfqNo.trim() || preparedBy) loadReportData();
  }, [selectedProject, preparedBy, rfqNo, loadReportData]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => (prev?.key === key && prev?.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <div className="flex flex-col"><ChevronUp className="w-3 h-3 opacity-30" /><ChevronDown className="w-3 h-3 opacity-30 -mt-1" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const filteredAndSorted = useMemo(() => {
    const fromStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : '';
    const toStr = toDate.length >= 10 ? toDate.slice(0, 10) : '';

    let out = tableData.filter((r) => {
      if (selectedSubProject && r.prSubProjectId != null && String(r.prSubProjectId) !== String(selectedSubProject)) return false;
      if (fromStr && r.prDate) {
        const d = r.prDate.slice(0, 10);
        if (d < fromStr) return false;
      }
      if (toStr && r.prDate) {
        const d = r.prDate.slice(0, 10);
        if (d > toStr) return false;
      }
      if (searchQuery.trim() !== '') {
        const match = [r.code, r.materialsNames, r.specification, r.unit].some((v) =>
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

  useEffect(() => setCurrentPage(1), [searchQuery, sortConfig, selectedSubProject, fromDate, toDate]);

  const handleExport = (format: string) => {
    const headers = ['Sl.no', 'Code', 'Materials Names', 'Specification', 'Unit', 'Request Quantity', 'Request Date', 'Quote Rate'];
    const rows = filteredAndSorted.map((r) => [
      r.slNo,
      r.code,
      r.materialsNames,
      r.specification,
      r.unit,
      formatNum(r.requestQuantity),
      r.requestDate,
      formatNum(r.price),
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
      a.download = 'rfq-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'Excel') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RFQ Report');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rfq-report.xlsx';
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
          doc.text('Request for Quote (RFQ) Report', margin, y);
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
            String(r.slNo),
            r.code,
            r.materialsNames,
            r.specification,
            r.unit,
            formatNum(r.requestQuantity),
            r.requestDate,
            formatNum(r.price),
          ]);
          autoTable(doc, {
            head: tableHeaders,
            body: tableBody,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          });
          doc.save('rfq-report.pdf');
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
      const headerRow = `<h1 style="margin:0 0 14px 0;font-size:20px;font-weight:bold">Request for Quote (RFQ) Report</h1>
<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:18px;flex-wrap:wrap">
  ${companyImg ? `<div style="flex-shrink:0"><img src="${esc(companyImg.startsWith('/') ? `${typeof window !== 'undefined' ? window.location.origin : ''}${companyImg}` : companyImg)}" alt="" style="max-height:56px;max-width:200px;object-fit:contain" /></div>` : ''}
  <div style="font-size:13px;line-height:1.55;min-width:200px">${metaLines}</div>
</div>`;
      const printContent = `<!DOCTYPE html><html><head><title>RFQ Report</title>
<style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:8px;text-align:left} th{background:#f0f0f0} .num{text-align:right}</style>
</head><body>
${headerRow}
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${filteredAndSorted.map((r) => `<tr><td>${r.slNo}</td><td>${r.code}</td><td>${r.materialsNames}</td><td>${r.specification}</td><td>${r.unit}</td><td class="num">${formatNum(r.requestQuantity)}</td><td>${r.requestDate}</td><td class="num">${formatNum(r.price)}</td></tr>`).join('')}</tbody></table>
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
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Request for Quote (RFQ) Report</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View RFQ details with materials and pricing
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Prepared by</label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} z-10`} />
              <select
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">Select Prepared by</option>
                {users.map((u) => <option key={String(u.id)} value={String(u.id)}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>RFQ No</label>
            <input
              type="text"
              placeholder="Enter RFQ No"
              value={rfqNo}
              onChange={(e) => setRfqNo(e.target.value)}
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

      {(selectedProject || rfqNo.trim() || preparedBy) && (
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
                  {['slNo', 'code', 'materialsNames', 'specification', 'unit', 'requestQuantity', 'requestDate', 'price'].map((k) => (
                    <th key={k} className={`px-4 py-3 font-bold ${textPrimary} cursor-pointer ${['requestQuantity', 'price'].includes(k) ? 'text-right' : 'text-left'}`} onClick={() => handleSort(k)}>
                      <span className="flex items-center gap-2">
                        {k === 'slNo' ? 'Sl.no' : k === 'code' ? 'Code' : k === 'materialsNames' ? 'Materials Names' : k === 'specification' ? 'Specification' : k === 'unit' ? 'Unit' : k === 'requestQuantity' ? 'Request Quantity' : k === 'requestDate' ? 'Request Date' : 'Quote Rate'}
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
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.code}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.materialsNames}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.specification}</td>
                    <td className={`px-4 py-3 ${textSecondary}`}>{row.unit}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.requestQuantity)}</td>
                    <td className={`px-4 py-3 ${textPrimary}`}>{row.requestDate}</td>
                    <td className={`px-4 py-3 text-right ${textPrimary}`}>{formatNum(row.price)}</td>
                  </tr>
                ))}
                {!isLoading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className={`px-4 py-12 text-center ${textSecondary}`}>
                      {!(selectedProject || rfqNo.trim() || preparedBy)
                        ? 'Select a project, enter RFQ No, or select Prepared by to load data. Use subproject and date filters to narrow results.'
                        : tableData.length === 0
                          ? 'No RFQ line items returned for this report. Try different filters or dates.'
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

export default RFQReport;
