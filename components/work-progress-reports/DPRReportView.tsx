'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeType } from '../../types';
import {
  ClipboardCheck,
  Download,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { masterDataAPI, teamsAPI, dprAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { API_BASE_URL } from '../../services/apiClient';

interface Project {
  id: string | number;
  name: string;
  project_name?: string;
}

interface Subproject {
  id: string | number;
  name: string;
}

interface Employee {
  id: string | number;
  name: string;
  email?: string;
}

interface DPRReportViewProps {
  theme: ThemeType;
}

const DPRReportView: React.FC<DPRReportViewProps> = ({ theme }) => {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dprDetails, setDprDetails] = useState<any>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // URL params: project, user, date
  useEffect(() => {
    if (!searchParams) return;
    const project = searchParams.get('project');
    const user = searchParams.get('user');
    const date = searchParams.get('date');
    if (project) setSelectedProject(project);
    if (user) setSelectedEmployee(user);
    if (date) setFromDate(date);
  }, [searchParams]);

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const arr = await masterDataAPI.getProjects();
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setProjects(list.map((p: any) => ({
          id: p.id ?? p.project_id ?? p.projects_id,
          name: p.project_name ?? p.name ?? '',
        })));
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
      return;
    }
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const projId = proj?.id ?? selectedProject;
    const load = async () => {
      try {
        const arr = await masterDataAPI.getSubprojects(Number(projId));
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        setSubprojects(list.map((s: any) => ({
          id: s.id ?? s.subproject_id ?? s.sub_projects_id,
          name: s.name ?? s.sub_project_name ?? '',
        })));
      } catch {
        setSubprojects([]);
      }
    };
    load();
  }, [selectedProject, projects]);

  // Load employees (staff) from teams-list API; fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const arr = await teamsAPI.getTeamsList();
        if (cancelled) return;
        const list = Array.isArray(arr) ? arr : ((arr as { data?: any[] })?.data ?? []);
        const mapped = list.map((e: any) => ({
          id: e.id ?? e.uuid ?? e.user_id,
          name: (e.name ?? e.user?.name ?? e.email ?? '').trim() || 'Unnamed',
          email: e.email ?? e.user?.email,
        })).filter((e) => e.id != null && e.name);
        setEmployees(mapped);
      } catch {
        if (cancelled) return;
        try {
          const saved = localStorage.getItem('manageTeamsUsers');
          const parsed = saved ? JSON.parse(saved) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          setEmployees(list.map((u: any) => ({
            id: u.id ?? u.uuid,
            name: (u.name ?? u.email ?? '').trim() || 'Unnamed',
            email: u.email,
          })).filter((e) => e.id != null && e.name));
        } catch {
          setEmployees([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const loadDPRData = useCallback(async () => {
    if (!selectedProject || !fromDate) {
      setDprDetails(null);
      return;
    }
    setIsLoading(true);
    setDprDetails(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
      const projId = proj?.id ?? selectedProject;
      const dateStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
      const report = await masterDataAPI.getDPRReport({
        project: projId,
        date: dateStr,
        ...(selectedEmployee ? { emp_id: selectedEmployee } : {}),
      });
      setDprDetails(report);
    } catch (err: any) {
      const msg = err?.message ?? err?.response?.data?.message ?? 'Failed to load DPR data';
      toast.showError(msg);
      setDprDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedEmployee, fromDate, projects, toast]);

  useEffect(() => {
    if (selectedProject && fromDate) {
      loadDPRData();
    } else {
      setDprDetails(null);
    }
  }, [selectedProject, selectedEmployee, fromDate, loadDPRData]);

  const handleExportPDF = async () => {
    if (!selectedProject || !fromDate) {
      toast.showError('Please select project and date first.');
      return;
    }
    const proj = projects.find((p) => String(p.id) === String(selectedProject) || p.name === selectedProject);
    const projId = proj?.id ?? selectedProject;
    const dateStr = fromDate.length >= 10 ? fromDate.slice(0, 10) : fromDate;
    setIsExporting(true);
    try {
      const res = await dprAPI.generatePDFByParams({
        project: projId,
        date: dateStr,
        ...(selectedEmployee ? { emp_id: selectedEmployee } : {}),
      });
      const url = res?.pdf_url ?? res?.data?.pdf_url;
      if (url) {
        try {
          const blob = await dprAPI.downloadPdfBlob(url);
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `dpr_${projId}_${dateStr}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          toast.showSuccess('DPR downloaded');
        } catch {
          window.open(url, '_blank');
          toast.showSuccess('PDF opened in new tab');
        }
      } else {
        toast.showError('PDF URL not found');
      }
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to generate PDF. Backend may require dpr ID.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatNum = (n: any) => {
    const v = Number(n);
    return isNaN(v) ? '-' : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Extract arrays from dpr-details
  const activities = (() => {
    const d = dprDetails?.activites ?? dprDetails?.activities ?? dprDetails?.activities_history ?? [];
    return Array.isArray(d) ? d : [];
  })();
  const materials = (() => {
    const d = dprDetails?.material ?? dprDetails?.materials ?? dprDetails?.materials_history ?? [];
    return Array.isArray(d) ? d : [];
  })();
  const labour = (() => {
    const d = dprDetails?.labour ?? dprDetails?.labours ?? dprDetails?.labour_history ?? [];
    return Array.isArray(d) ? d : [];
  })();
  const machinery = (() => {
    const d = dprDetails?.assets ?? dprDetails?.assets_history ?? [];
    return Array.isArray(d) ? d : [];
  })();
  const hinderances = (() => {
    const d = dprDetails?.historie ?? dprDetails?.hindrance ?? dprDetails?.hindrances ?? dprDetails?.hinderance ?? [];
    return Array.isArray(d) ? d : [];
  })();
  const safety = (() => {
    const d = dprDetails?.safetie ?? dprDetails?.safety ?? dprDetails?.safeties ?? [];
    return Array.isArray(d) ? d : [];
  })();

  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string') return null;
    const t = url.trim();
    if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t;
    if (t.startsWith('/')) return `${API_BASE_URL.replace(/\/$/, '')}${t}`;
    return t;
  };

  const parseImages = (item: any): string[] => {
    const imgs = item?.images ?? item?.img;
    if (Array.isArray(imgs)) return imgs.filter(Boolean);
    const img = item?.img ?? item?.image ?? item?.activities_history_img;
    if (img) return [img];
    return [];
  };

  const TableSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
      <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit`}>{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>DPR Report</h1>
            <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Daily Progress Report – View and export
            </p>
          </div>
        </div>
      </div>

      {/* Filter Form */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Employee <span className="text-slate-400">(optional)</span>
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Date <span className="text-red-500">*</span></label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value ?? '')}
              iconClassName={textSecondary}
              className={`py-2.5 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20`}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExportPDF}
              disabled={!selectedProject || !fromDate || isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export to PDF
            </button>
          </div>
        </div>
      </div>

      {/* Content - 6 Tables + Attached Photos (show after filters applied) */}
      {selectedProject && fromDate && (
        <div className="space-y-6 relative min-h-[200px]">
          {isLoading && (
            <div className={`absolute inset-0 z-10 rounded-xl min-h-[300px] ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} flex items-center justify-center`}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
                <span className={`text-sm font-bold ${textPrimary}`}>Loading DPR data...</span>
              </div>
            </div>
          )}
          {/* Activities */}
          <TableSection title="Activities">
            <table className="w-full min-w-[900px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Activities</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Unit</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Estimate Qty</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Est Rate</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Est Amount</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Completed Qty</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Est Amount for Completion</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>% Completion</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Balance qty</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((r: any, i: number) => {
                  const act = r?.activities ?? r?.activites ?? r;
                  const name = (typeof act === 'string' ? act : (act?.activities ?? act?.name ?? r?.activity_name)) ?? '-';
                  const unit = (typeof act === 'object' ? act?.unit : null) ?? r?.unit ?? '-';
                  const estQty = Number(r?.est_qty ?? r?.estimate_qty ?? r?.qty ?? r?.quantity ?? 0);
                  const rate = Number(r?.est_rate ?? r?.rate ?? r?.rate_per_unit ?? 0);
                  const amount = Number(r?.est_amount ?? r?.amount ?? estQty * rate);
                  const completedQty = Number(r?.completed_qty ?? r?.qty ?? r?.quantity ?? 0);
                  const estAmtCompletion = Number(r?.est_amount_completion ?? completedQty * rate);
                  const pct = Number(r?.completion ?? (estQty > 0 ? (completedQty / estQty) * 100 : 0));
                  const balance = Number(r?.balance_qty ?? estQty - completedQty);
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{name}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{unit}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(estQty)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(rate)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(amount)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(completedQty)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(estAmtCompletion)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(pct)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(balance)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={11} className={`px-4 py-8 text-center ${textSecondary}`}>No activities</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Materials */}
          <TableSection title="Materials">
            <table className="w-full min-w-[700px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Materials Names</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Specification</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Unit</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Quantity Used</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Work details</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((r: any, i: number) => {
                  const mat = r?.materials ?? r?.material ?? r;
                  const name = (typeof mat === 'string' ? mat : (mat?.name ?? r?.material_name ?? r?.materials_name)) ?? '-';
                  const spec = (typeof mat === 'object' ? mat?.specification : null) ?? r?.specification ?? '-';
                  const unit = (typeof mat === 'object' ? mat?.unit : null) ?? r?.unit ?? '-';
                  const qty = Number(r?.qty_used ?? r?.qty ?? r?.quantity ?? 0);
                  const workDetails = r?.work_details ?? r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '-';
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{name}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{spec}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{unit}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(qty)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{workDetails}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`px-4 py-8 text-center ${textSecondary}`}>No materials</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Labour */}
          <TableSection title="Labour">
            <table className="w-full min-w-[700px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Labour Details</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Unit</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Quantity</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>OT Quantity</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Labour Contractor</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Rate/Unit</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {labour.map((r: any, i: number) => {
                  const lab = r?.labours ?? r?.labour ?? r;
                  const details = r?.labour_details ?? (lab?.type && lab?.category ? `${lab.type} - ${lab.category}` : (lab?.name ?? r?.labour_name)) ?? '-';
                  const unit = (typeof lab === 'object' ? lab?.unit : null) ?? r?.unit ?? '-';
                  const qty = Number(r?.qty ?? r?.quantity ?? 0);
                  const otQty = Number(r?.ot_qty ?? r?.overtime_qty ?? 0);
                  const contractor = (() => {
                    const v = r?.labour_contractor ?? r?.vendors ?? r?.vendor ?? r?.contractor;
                    if (!v) return '-';
                    return typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
                  })();
                  const rate = Number(r?.rate ?? r?.rate_per_unit ?? 0);
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{details}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{unit}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(qty)}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(otQty)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{contractor}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(rate)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {labour.length === 0 && (
                  <tr>
                    <td colSpan={8} className={`px-4 py-8 text-center ${textSecondary}`}>No labour</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Machinery */}
          <TableSection title="Machinery">
            <table className="w-full min-w-[600px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Machinery Names</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Specification</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Unit</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Quantity</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Contractor</th>
                  <th className={`px-4 py-2 text-right font-bold ${textPrimary}`}>Rate/Unit</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {machinery.map((r: any, i: number) => {
                  const asset = r?.assets ?? r?.asset ?? r;
                  const name = r?.machinery_names ?? (typeof asset === 'object' ? asset?.name : null) ?? r?.asset_name ?? '-';
                  const spec = (typeof asset === 'object' ? asset?.specification : null) ?? r?.specification ?? '-';
                  const unit = (typeof asset === 'object' ? asset?.unit : null) ?? r?.unit ?? '-';
                  const qty = Number(r?.quantity ?? r?.qty ?? 0);
                  const contractor = (() => {
                    const v = r?.contractor ?? r?.vendors ?? r?.vendor;
                    if (!v) return '-';
                    return typeof v === 'string' ? v : (v?.name ?? v?.registration_name ?? '-');
                  })();
                  const rate = Number(r?.rate ?? r?.rate_per_unit ?? 0);
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{name}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{spec}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{unit}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(qty)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{contractor}</td>
                      <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatNum(rate)}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {machinery.length === 0 && (
                  <tr>
                    <td colSpan={8} className={`px-4 py-8 text-center ${textSecondary}`}>No machinery</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Hinderances */}
          <TableSection title="Hinderances">
            <table className="w-full min-w-[500px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Hinderances Title</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Concern Team Members</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {hinderances.map((r: any, i: number) => {
                  const title = r?.hinderances_details ?? r?.details ?? r?.title ?? r?.name ?? '-';
                  const members = Array.isArray(r?.concern_team_members) ? r.concern_team_members.join(', ') : (r?.concern_team_members ?? r?.team_members ?? '-');
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{title}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{members}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {hinderances.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-8 text-center ${textSecondary}`}>No hinderances</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Safety */}
          <TableSection title="Safety">
            <table className="w-full min-w-[500px] text-sm">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Sl.no</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Safety Title</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Concern Team Members</th>
                  <th className={`px-4 py-2 text-left font-bold ${textPrimary}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {safety.map((r: any, i: number) => {
                  const title = r?.safety_problem_details ?? r?.details ?? r?.title ?? r?.name ?? '-';
                  const members = Array.isArray(r?.concern_team_members) ? r.concern_team_members.join(', ') : (r?.concern_team_members ?? r?.team_members ?? '-');
                  const remarks = r?.remarkes ?? r?.remarks ?? '';
                  return (
                    <tr key={i} className={`border-t border-inherit ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2 ${textPrimary}`}>{i + 1}</td>
                      <td className={`px-4 py-2 ${textPrimary}`}>{title}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{members}</td>
                      <td className={`px-4 py-2 ${textSecondary}`}>{remarks}</td>
                    </tr>
                  );
                })}
                {safety.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-8 text-center ${textSecondary}`}>No safety entries</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableSection>

          {/* Attached Photos */}
          <div className={`rounded-xl border ${cardClass} overflow-hidden`}>
            <div className={`px-4 py-3 font-bold ${textPrimary} border-b border-inherit flex items-center gap-2`}>
              <ImageIcon className="w-4 h-4" />
              Attached Photos
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className={`text-sm font-bold ${textSecondary} mb-2`}>Safety</div>
                <div className="flex flex-wrap gap-2">
                  {safety.flatMap((s: any) => parseImages(s)).map((src, i) => {
                    const url = getImageUrl(src);
                    if (!url) return null;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-inherit" />
                      </a>
                    );
                  })}
                  {safety.flatMap((s: any) => parseImages(s)).filter(Boolean).length === 0 && (
                    <span className={`text-sm ${textSecondary}`}>No images</span>
                  )}
                </div>
              </div>
              <div>
                <div className={`text-sm font-bold ${textSecondary} mb-2`}>Hinderances</div>
                <div className="flex flex-wrap gap-2">
                  {hinderances.flatMap((h: any) => parseImages(h)).map((src, i) => {
                    const url = getImageUrl(src);
                    if (!url) return null;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-inherit" />
                      </a>
                    );
                  })}
                  {hinderances.flatMap((h: any) => parseImages(h)).filter(Boolean).length === 0 && (
                    <span className={`text-sm ${textSecondary}`}>No images</span>
                  )}
                </div>
              </div>
              <div>
                <div className={`text-sm font-bold ${textSecondary} mb-2`}>Activities</div>
                <div className="flex flex-wrap gap-2">
                  {activities.flatMap((a: any) => parseImages(a)).map((src, i) => {
                    const url = getImageUrl(src);
                    if (!url) return null;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-inherit" />
                      </a>
                    );
                  })}
                  {activities.flatMap((a: any) => parseImages(a)).filter(Boolean).length === 0 && (
                    <span className={`text-sm ${textSecondary}`}>No images</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DPRReportView;
