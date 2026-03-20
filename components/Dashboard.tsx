'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { ThemeType } from '../types';
import {
  Building2,
  Layers,
  Calendar,
  Loader2,
  ExternalLink,
  FileText,
  Users,
  Package,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  Box,
  Wrench,
  Copy,
  Download,
  FileDown,
  Printer,
} from 'lucide-react';
import DatePickerInput from './ui/DatePickerInput';
import { useProjectsFromMasters, useSubprojectsFromMasters } from '@/hooks/useProjectsFromMasters';
import { dashboardAPI, materialRequestAPI, masterDataAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

interface DashboardProps {
  theme: ThemeType;
}

type DashboardTab = 'overview' | 'workProgress' | 'stock';

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const Dashboard: React.FC<DashboardProps> = ({ theme }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getYesterday());
  const [isLoading, setIsLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [prPendingList, setPrPendingList] = useState<any[]>([]);
  const [prPendingLoading, setPrPendingLoading] = useState(false);

  const [workProcessData, setWorkProcessData] = useState<any>(null);
  const [workProcessLoading, setWorkProcessLoading] = useState(false);
  const [activityTab, setActivityTab] = useState<'inprogress' | 'completed' | 'notstart' | 'delay'>('inprogress');
  const [activityList, setActivityList] = useState<any[]>([]);
  const [activityListLoading, setActivityListLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 8;

  const [selectedStockStore, setSelectedStockStore] = useState<string>('');
  const [stockTab, setStockTab] = useState<'material' | 'machine'>('material');
  const [stockStores, setStockStores] = useState<{ id: string | number; name: string }[]>([]);
  const [stockMaterialData, setStockMaterialData] = useState<any[]>([]);
  const [stockMachineData, setStockMachineData] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 10;

  const projects = useProjectsFromMasters();
  const projIdForSub = projects.find((p) => String(p.id) === String(selectedProject))?.id ?? selectedProject;
  const subprojects = useSubprojectsFromMasters(projIdForSub || undefined);

  useEffect(() => {
    if (!selectedProject) setSelectedSubProject('');
  }, [selectedProject]);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    if (!selectedProject) {
      setOverviewData(null);
      return;
    }
    setIsLoading(true);
    setOverviewData(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject));
      const projId = proj?.id ?? selectedProject;
      const data = await dashboardAPI.getWorkOverview(
        { project: projId, subproject: selectedSubProject || undefined, date: selectedDate || undefined },
        signal ? { signal } : undefined
      );
      if (!signal?.aborted) setOverviewData(data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
      toastRef.current.showWarning(e?.message || 'Failed to load overview');
      if (!signal?.aborted) setOverviewData(null);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [selectedProject, selectedSubProject, selectedDate, projects]);

  useEffect(() => {
    if (activeTab !== 'overview' || !selectedProject) return;
    const ac = new AbortController();
    loadOverview(ac.signal);
    return () => ac.abort();
  }, [activeTab, selectedProject, loadOverview]);

  const loadWorkProcess = useCallback(async (signal?: AbortSignal) => {
    if (!selectedProject) {
      setWorkProcessData(null);
      return;
    }
    setWorkProcessLoading(true);
    setWorkProcessData(null);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject));
      const projId = proj?.id ?? selectedProject;
      const data = await dashboardAPI.getWorkProcess(
        { project: projId, subproject: selectedSubProject || undefined },
        signal ? { signal } : undefined
      );
      if (!signal?.aborted) setWorkProcessData(data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
      toastRef.current.showWarning(e?.message || 'Failed to load work process');
      if (!signal?.aborted) setWorkProcessData(null);
    } finally {
      if (!signal?.aborted) setWorkProcessLoading(false);
    }
  }, [selectedProject, selectedSubProject, projects]);

  const loadActivityList = useCallback(async (signal?: AbortSignal) => {
    if (!selectedProject) {
      setActivityList([]);
      return;
    }
    setActivityListLoading(true);
    setActivityList([]);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject));
      const projId = proj?.id ?? selectedProject;
      const list = await dashboardAPI.getWorkProcessActivities(
        { project: projId, subproject: selectedSubProject || undefined, filterName: activityTab },
        signal ? { signal } : undefined
      );
      if (!signal?.aborted) {
        setActivityList(Array.isArray(list) ? list : []);
        setActivityPage(1);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
      toastRef.current.showWarning(e?.message || 'Failed to load activities');
      if (!signal?.aborted) setActivityList([]);
    } finally {
      if (!signal?.aborted) setActivityListLoading(false);
    }
  }, [selectedProject, selectedSubProject, activityTab, projects]);

  useEffect(() => {
    if (activeTab !== 'workProgress' || !selectedProject) return;
    const ac = new AbortController();
    loadWorkProcess(ac.signal);
    return () => ac.abort();
  }, [activeTab, selectedProject, loadWorkProcess]);

  useEffect(() => {
    if (activeTab !== 'workProgress' || !selectedProject) return;
    const ac = new AbortController();
    loadActivityList(ac.signal);
    return () => ac.abort();
  }, [activeTab, selectedProject, activityTab, loadActivityList]);

  useEffect(() => {
    if (activeTab !== 'stock' || !selectedProject) {
      setStockStores([]);
      setSelectedStockStore('');
      return;
    }
    let cancelled = false;
    masterDataAPI
      .getProjectWiseWarehouses(selectedProject)
      .then((arr) => {
        if (cancelled) return;
        const list = Array.isArray(arr) ? arr : [];
        const stores = list.map((s: any) => {
          const storeId = s.store_warehouses_id ?? s.store_id ?? s.id ?? s.uuid;
          return { id: storeId, name: s.name ?? s.store_name ?? s.warehouse_name ?? '' };
        }).filter((s: any) => s.id != null && s.id !== '');
        setStockStores(stores);
        setSelectedStockStore(stores.length === 1 ? String(stores[0].id) : '');
      })
      .catch(() => {
        if (!cancelled) setStockStores([]);
      });
    return () => { cancelled = true; };
  }, [activeTab, selectedProject]);

  const loadInventoryStocks = useCallback(async (filterName?: 'material' | 'machine', signal?: AbortSignal) => {
    const storeVal = selectedStockStore != null ? String(selectedStockStore).trim() : '';
    if (!selectedProject || !storeVal || !/^\d+$/.test(storeVal) || !selectedDate) return;
    const fn = filterName ?? stockTab;
    setStockLoading(true);
    setStockMaterialData([]);
    setStockMachineData([]);
    try {
      const proj = projects.find((p) => String(p.id) === String(selectedProject));
      const projId = proj?.id ?? selectedProject;
      const res = await dashboardAPI.getInventoryStocks(
        { project: projId, store: selectedStockStore, date: selectedDate, filterName: fn },
        signal ? { signal } : undefined
      );
      if (!signal?.aborted) {
        const list = fn === 'material' ? (res.materialStocks ?? []) : (res.machineStocks ?? []);
        const arr = Array.isArray(list) ? list : [];
        if (fn === 'material') setStockMaterialData(arr);
        else setStockMachineData(arr);
        setStockPage(1);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
      toastRef.current.showWarning(e?.message || 'Failed to load inventory stocks');
      if (!signal?.aborted) {
        if (fn === 'material') setStockMaterialData([]);
        else setStockMachineData([]);
      }
    } finally {
      if (!signal?.aborted) setStockLoading(false);
    }
  }, [selectedProject, selectedStockStore, selectedDate, stockTab, projects]);

  useEffect(() => {
    if (activeTab !== 'stock' || !selectedProject || !selectedStockStore || !selectedDate) return;
    const ac = new AbortController();
    loadInventoryStocks(undefined, ac.signal);
    return () => ac.abort();
  }, [activeTab, selectedProject, selectedStockStore, selectedDate, stockTab, loadInventoryStocks]);

  const handleStockExport = (tab: 'material' | 'machine', format: 'Copy' | 'CSV' | 'Excel' | 'PDF' | 'Print') => {
    const data = tab === 'material' ? stockMaterialData : stockMachineData;
    const filtered = stockSearch.trim()
      ? data.filter((s: any) => {
          const mat = tab === 'material' ? (s.materials ?? s.material ?? s) : (s.assets ?? s.asset ?? s);
          const code = mat?.code ?? s?.code ?? '';
          const name = mat?.name ?? s?.name ?? '';
          const spec = mat?.specification ?? s?.specification ?? '';
          const q = stockSearch.toLowerCase();
          return [code, name, spec].some((v) => String(v).toLowerCase().includes(q));
        })
      : data;
    const headers = tab === 'material'
      ? ['Class', 'Code', 'Materials', 'Specification', 'Unit', 'Stock Qty']
      : ['Code', 'Machine/Tools', 'Specification', 'Unit', 'Stock Qty'];
    const rows = filtered.map((s: any) => {
      const mat = tab === 'material' ? (s.materials ?? s.material ?? s) : (s.assets ?? s.asset ?? s);
      const clsVal = tab === 'material' ? (mat?.class ?? s?.class ?? null) : null;
      const clsStr = clsVal != null ? (typeof clsVal === 'object' ? (clsVal?.name ?? '-') : String(clsVal)) : '-';
      const code = mat?.code ?? s?.code ?? '-';
      const name = mat?.name ?? s?.name ?? '-';
      const spec = mat?.specification ?? s?.specification ?? '-';
      const unit = mat?.units?.unit ?? mat?.unit ?? s?.unit ?? '-';
      const qty = Number(s.total_qty ?? s.qty ?? s.stock_qty ?? 0);
      return tab === 'material' ? [clsStr, code, name, spec, unit, qty.toLocaleString()] : [code, name, spec, unit, qty.toLocaleString()];
    });
    if (format === 'Copy') {
      const text = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(text);
      toast.showSuccess('Copied to clipboard');
    } else if (format === 'CSV' || format === 'Excel') {
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `stock-${tab}.${format === 'CSV' ? 'csv' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.showSuccess('Downloaded');
    } else if (format === 'PDF' || format === 'Print') {
      const tableRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
      const printContent = `<!DOCTYPE html><html><head><title>Stock ${tab}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}</style></head><body><h2>Stock - ${tab === 'material' ? 'Material' : 'Machines/Tools'}</h2><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printContent);
        w.document.close();
        if (format === 'Print') w.print();
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    setPrPendingLoading(true);
    const projectId = selectedProject ? (projects.find((p) => String(p.id) === String(selectedProject))?.id ?? selectedProject) : undefined;
    materialRequestAPI
      .list({ status: 0, projectId, subprojectId: selectedSubProject || undefined })
      .then((list) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setPrPendingList(arr.filter((r: any) => Number(r.status) === 0));
      })
      .catch(() => {
        if (!cancelled) setPrPendingList([]);
      })
      .finally(() => {
        if (!cancelled) setPrPendingLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedProject, selectedSubProject, projects]);

  // Work status: API returns inProgress, completed, notStart, totalActivites at root
  const workStatus = overviewData?.work_status ?? overviewData?.workStatus ?? {};
  const inProgress = Number(overviewData?.inProgress ?? workStatus.in_progress ?? workStatus.inProgress ?? 0);
  const completed = Number(overviewData?.completed ?? workStatus.completed ?? 0);
  const notStarted = Number(overviewData?.notStart ?? workStatus.not_started ?? workStatus.notStarted ?? 0);
  const totalActivities = Number(overviewData?.totalActivites ?? workStatus.total ?? workStatus.totalActivities ?? 0) || inProgress + completed + notStarted;

  const workStatusPieData = [
    { name: 'In Progress', value: inProgress, color: '#C2D642' },
    { name: 'Completed', value: completed, color: '#22c55e' },
    { name: 'Not Started', value: notStarted, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  // Cost: API returns estimatedCost, estimatedCostForExecutedQty, balanceEstimate, excessEstimateCost at root
  const costDetails = overviewData?.cost ?? overviewData?.costDetails ?? {};
  const estimatedCost = Number(overviewData?.estimatedCost ?? costDetails.estimatedCost ?? costDetails.estimated_cost ?? 0);
  const costForExecuted = Number(overviewData?.estimatedCostForExecutedQty ?? costDetails.estimatedCostForExecutedQty ?? costDetails.estimate_cost_for_executed_qty ?? 0);
  const balanceEstimate = Number(overviewData?.balanceEstimate ?? costDetails.balanceEstimate ?? costDetails.balance_estimate ?? 0) || Math.max(0, estimatedCost - costForExecuted);
  const excessEstimate = Number(overviewData?.excessEstimateCost ?? costDetails.excessEstimateCost ?? costDetails.excess_estimate ?? 0) || Math.max(0, costForExecuted - estimatedCost);

  // Timeline: API returns totalDuration, projectcompleted, remaining, actualProgress, variation at root
  const timeline = overviewData?.timeline ?? overviewData?.timelineProgress ?? {};
  const projectDuration = Number(overviewData?.totalDuration ?? timeline.projectDuration ?? timeline.project_duration ?? 0);
  const completedDays = Number(overviewData?.projectcompleted ?? timeline.completed ?? timeline.completed_days ?? 0);
  const remainingDays = Number(overviewData?.remaining ?? timeline.remaining ?? timeline.remaining_days ?? 0);
  const plannedProgressArr = overviewData?.monthwiseworkProgess?.plannedProgress ?? overviewData?.plannedProgress ?? timeline.plannedProgress ?? [];
  const plannedProgress = Array.isArray(plannedProgressArr) && plannedProgressArr.length > 0
    ? Number(plannedProgressArr[0]) : Number(overviewData?.planeProgress ?? timeline.plannedProgress ?? 0) || (projectDuration > 0 ? (completedDays / projectDuration) * 100 : 0);
  const actualProgressArr = overviewData?.actualProgress ?? timeline.actualProgress ?? timeline.actual_progress;
  const actualProgress = Array.isArray(actualProgressArr) && actualProgressArr.length > 0
    ? Number(actualProgressArr[0]) : Number(actualProgressArr ?? plannedProgress);
  const variation = Number(overviewData?.variation ?? timeline.variation ?? 0) || actualProgress - plannedProgress;

  // Month-wise chart: API returns monthwiseworkProgess.chartData with labels + datasets
  const monthWiseRaw = overviewData?.monthwiseworkProgess ?? overviewData?.monthWiseProgress ?? overviewData?.month_wise_progress ?? overviewData?.chartData ?? {};
  const chartLabels = monthWiseRaw?.labels ?? monthWiseRaw?.chartData?.labels ?? overviewData?.labels ?? [];
  const chartDatasets = monthWiseRaw?.chartData?.datasets ?? monthWiseRaw?.datasets ?? overviewData?.chartData?.datasets ?? [];
  const actualData = chartDatasets.find((d: any) => d.label?.toLowerCase().includes('actual'))?.data ?? [];
  const plannedData = chartDatasets.find((d: any) => d.label?.toLowerCase().includes('planned'))?.data ?? [];
  const monthWiseData = Array.isArray(chartLabels) && chartLabels.length > 0
    ? chartLabels.map((m: string, i: number) => ({
        month: m,
        actual: Number(actualData[i] ?? actualData[0] ?? 0),
        planned: Number(plannedData[i] ?? plannedData[0] ?? 0),
      }))
    : [];

  const dprList = overviewData?.fetchDpr ?? overviewData?.dpr ?? overviewData?.dprs ?? overviewData?.dilyprogessreport ?? [];

  // Labour: API returns totalLabourCount, totalLabourTotal, vendorWiseLabourListing
  const labourStrength = overviewData?.labourStrength ?? overviewData?.labour_strength ?? {};
  const totalLabour = Number(overviewData?.totalLabourTotal ?? overviewData?.totalLabourCount ?? labourStrength.total ?? labourStrength.total_count ?? 0);
  const vendorBreakdown = overviewData?.vendorWiseLabourListing ?? labourStrength.vendor_wise ?? labourStrength.vendorWise ?? [];

  // Inventory: API returns purchaseRequests, goodsReceipt, issueOutward, materialReturn, pORaised at root
  const inventoryCounts = overviewData?.inventory ?? overviewData?.inventorysdata ?? overviewData?.inventory_counts ?? {};
  const pendingApprovals = Number(inventoryCounts.pendingApprovals ?? inventoryCounts.pending_approvals ?? prPendingList.length);
  const prRaised = Number(overviewData?.purchaseRequests ?? inventoryCounts.purchaseRequestsRaised ?? inventoryCounts.pr_raised ?? 0);
  const grnEntries = Number(overviewData?.goodsReceipt ?? inventoryCounts.goodsReceiptEntries ?? inventoryCounts.grn_entries ?? 0);
  const issueEntries = Number(overviewData?.issueOutward ?? inventoryCounts.issueOutwardEntries ?? inventoryCounts.issue_entries ?? 0);
  const poRaised = Number(overviewData?.pORaised ?? inventoryCounts.poRaised ?? inventoryCounts.po_raised ?? 0);
  const materialReturn = Number(overviewData?.materialReturn ?? inventoryCounts.materialReturnToStore ?? inventoryCounts.material_return ?? 0);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: ClipboardList },
    { id: 'workProgress' as const, label: 'Work Progress', icon: TrendingUp },
    { id: 'stock' as const, label: 'Stock', icon: Package },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Dashboard</h1>
          <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mt-1 ${textSecondary}`}>Project overview & analytics</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 items-center border-b border-inherit pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${
              activeTab === t.id ? 'bg-[#C2D642] text-slate-900' : isDark ? 'hover:bg-slate-700 ' + textSecondary : 'hover:bg-slate-200 ' + textPrimary
            }`}
          >
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>Filters</h3>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
              <div>
                <label className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Project *</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={`w-full sm:min-w-[200px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Sub Project</label>
                <select
                  value={selectedSubProject}
                  onChange={(e) => setSelectedSubProject(e.target.value)}
                  disabled={!selectedProject}
                  className={`w-full sm:min-w-[180px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All</option>
                  {subprojects.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Date</label>
                <DatePickerInput
                  value={selectedDate}
                  onChange={(e: any) => setSelectedDate(e?.target?.value ?? '')}
                  className={`w-full sm:min-w-[140px] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                />
              </div>
              <button
                onClick={() => loadOverview()}
                disabled={!selectedProject || isLoading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load
              </button>
            </div>
          </div>

          {!selectedProject && (
            <div className={`p-8 rounded-xl border ${cardClass} text-center`}>
              <Building2 className={`w-12 h-12 mx-auto mb-3 opacity-40 ${textSecondary}`} />
              <p className={`font-bold ${textSecondary}`}>Select a project to view the overview</p>
            </div>
          )}

          {selectedProject && (
            <>
              <div className={`p-4 rounded-xl border ${cardClass}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>1. PR Pending Approvals List</h3>
                {prPendingLoading ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : prPendingList.length === 0 ? (
                  <p className={`text-sm ${textSecondary}`}>No pending PRs</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                          <th className="text-left py-2 font-bold">PR No</th>
                          <th className="text-left py-2 font-bold">Project</th>
                          <th className="text-left py-2 font-bold">Sub-Project</th>
                          <th className="text-left py-2 font-bold">Date</th>
                          <th className="text-left py-2 font-bold">User</th>
                          <th className="text-left py-2 font-bold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {prPendingList.slice(0, 10).map((pr: any) => (
                          <tr key={pr.id} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className="py-2">{pr.request_no ?? pr.name ?? pr.id ?? '-'}</td>
                            <td className="py-2">{pr.project_name ?? pr.projects?.name ?? '-'}</td>
                            <td className="py-2">{pr.sub_project_name ?? pr.sub_projects?.name ?? '-'}</td>
                            <td className="py-2">{pr.date ? String(pr.date).slice(0, 10) : '-'}</td>
                            <td className="py-2">{pr.user?.name ?? pr.created_by ?? '-'}</td>
                            <td className="py-2">
                              <Link href={`/pr-management/pr?edit=${pr.id}`} className="text-[#C2D642] font-bold flex items-center gap-1">
                                View Details <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className={`p-8 rounded-xl border ${cardClass} flex items-center justify-center gap-2`}>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>Loading overview...</span>
                </div>
              ) : overviewData ? (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className={`p-4 rounded-xl border ${cardClass} flex items-center gap-3`}>
                      <div className="p-2 rounded-lg bg-[#C2D642]/20">
                        <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-[#C2D642]" />
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Total Activities</p>
                        <p className={`text-xl sm:text-2xl font-black ${textPrimary}`}>{totalActivities}</p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border ${cardClass} flex items-center gap-3`}>
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Completed</p>
                        <p className={`text-xl sm:text-2xl font-black ${textPrimary}`}>{completed}</p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border ${cardClass} flex items-center gap-3`}>
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500" />
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Progress %</p>
                        <p className={`text-xl sm:text-2xl font-black ${textPrimary}`}>{actualProgress.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border ${cardClass} flex items-center gap-3`}>
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Labour</p>
                        <p className={`text-xl sm:text-2xl font-black ${textPrimary}`}>{totalLabour}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 sm:p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-3 sm:mb-4 ${textSecondary}`}>2. Work Status as on Date</h3>
                    {workStatusPieData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8 items-center">
                        <div className="h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] mx-auto sm:mx-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={workStatusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                                {workStatusPieData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className={`space-y-2 text-sm sm:text-base ${textPrimary}`}>
                          <p><span className="font-bold">In Progress:</span> {inProgress}</p>
                          <p><span className="font-bold">Completed:</span> {completed}</p>
                          <p><span className="font-bold">Not Started:</span> {notStarted}</p>
                          <p><span className="font-bold">Total Activities:</span> {totalActivities}</p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm ${textSecondary}`}>No work status data</p>
                    )}
                  </div>

                  <div className={`p-3 sm:p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-3 sm:mb-4 ${textSecondary}`}>3. Cost Details (Remaining)</h3>
                    <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
                      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${textPrimary} flex-1`}>
                        <div>
                          <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Estimated Cost for Project</p>
                          <p className={`text-base sm:text-lg font-black ${textPrimary}`}>{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Estimate Cost for Executed Qty</p>
                          <p className={`text-base sm:text-lg font-black ${textPrimary}`}>{costForExecuted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Balance Estimate Cost</p>
                          <p className="text-base sm:text-lg font-black text-green-500">{balanceEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Excess Estimate Cost</p>
                          <p className="text-base sm:text-lg font-black text-rose-500">{excessEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="h-[180px] sm:h-[220px] w-full lg:w-[280px] shrink-0">
                        {(() => {
                          const costPieData = [
                            { name: 'Executed', value: costForExecuted, color: '#C2D642' },
                            { name: 'Balance', value: balanceEstimate, color: '#22c55e' },
                            { name: 'Excess', value: excessEstimate, color: '#f43f5e' },
                          ].filter((d) => d.value > 0);
                          return costPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={costPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                                  {costPieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number | undefined) => (v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>4. Timeline & Progress</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Project Duration</p>
                        <p className={`text-base sm:text-lg font-black ${textPrimary}`}>{projectDuration} days</p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Completed</p>
                        <p className={`text-base sm:text-lg font-black ${textPrimary}`}>{completedDays} days</p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Remaining</p>
                        <p className={`text-base sm:text-lg font-black ${textPrimary}`}>{remainingDays} days</p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Variation</p>
                        <p className={`text-base sm:text-lg font-black ${variation >= 0 ? 'text-green-500' : 'text-rose-500'}`}>{variation.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Planned Progress</span>
                          <span>{plannedProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${Math.min(100, plannedProgress)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Actual Progress</span>
                          <span>{actualProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-[#C2D642] rounded-full" style={{ width: `${Math.min(100, actualProgress)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(monthWiseData) && monthWiseData.length > 0 && (
                    <div className={`p-4 rounded-xl border ${cardClass}`}>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>5. Month-wise Progress Chart</h3>
                      <div className="h-[220px] sm:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthWiseData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="actual" stroke="#C2D642" strokeWidth={2} name="Actual" />
                            <Line type="monotone" dataKey="planned" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Planned" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>6. DPR (Daily Progress Report)</h3>
                    {Array.isArray(dprList) && dprList.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                              <th className="text-left py-2 font-bold">Date</th>
                              <th className="text-left py-2 font-bold">User</th>
                              <th className="text-left py-2 font-bold">Safety & Hinderances</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dprList.slice(0, 10).map((dpr: any, i: number) => (
                              <tr key={i} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                <td className="py-2">{dpr.date ? String(dpr.date).slice(0, 10) : '-'}</td>
                                <td className="py-2">{dpr.user?.name ?? dpr.created_by ?? '-'}</td>
                                <td className="py-2">{dpr.safety_hinderances ?? dpr.remarks ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={`text-sm ${textSecondary}`}>No DPRs for selected date</p>
                    )}
                  </div>

                  <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>7. Labour Strength</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#C2D642]" />
                      <div>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Total Labour</p>
                        <p className="text-2xl font-black">{totalLabour}</p>
                      </div>
                    </div>
                    {Array.isArray(vendorBreakdown) && vendorBreakdown.length > 0 && (
                      <div className="space-y-4">
                        <p className={`text-xs font-bold uppercase ${textSecondary}`}>Vendor-wise</p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            {vendorBreakdown.map((v: any, i: number) => (
                              <div key={i} className="flex justify-between">
                                <span>{v.vendor_name ?? v.name ?? '-'}</span>
                                <span className="font-bold">{v.quantity ?? v.count ?? 0}</span>
                              </div>
                            ))}
                          </div>
                          <div className="h-[180px] sm:h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={vendorBreakdown.map((v: any) => ({
                                  name: (v.vendor_name ?? v.name ?? '-').slice(0, 12),
                                  count: Number(v.quantity ?? v.count ?? 0),
                                }))}
                                layout="vertical"
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#C2D642" radius={[0, 4, 4, 0]} name="Labour" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`p-4 rounded-xl border ${cardClass}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>8. Pending Approvals & Inventory Counts (for the day)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6">
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Pending Approvals</p>
                        <p className="text-xl font-black">{pendingApprovals}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>PR Raised</p>
                        <p className="text-xl font-black">{prRaised}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>GRN Entries</p>
                        <p className="text-xl font-black">{grnEntries}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Issue/Outward</p>
                        <p className="text-xl font-black">{issueEntries}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>PO Raised</p>
                        <p className="text-xl font-black">{poRaised}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSecondary}`}>Material Return</p>
                        <p className="text-xl font-black">{materialReturn}</p>
                      </div>
                    </div>
                    <div className="h-[200px] sm:h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Pending', value: pendingApprovals, fill: '#f59e0b' },
                            { name: 'PR Raised', value: prRaised, fill: '#C2D642' },
                            { name: 'GRN', value: grnEntries, fill: '#22c55e' },
                            { name: 'Issue', value: issueEntries, fill: '#3b82f6' },
                            { name: 'PO Raised', value: poRaised, fill: '#8b5cf6' },
                            { name: 'Return', value: materialReturn, fill: '#64748b' },
                          ]}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                            {[
                              { fill: '#f59e0b' },
                              { fill: '#C2D642' },
                              { fill: '#22c55e' },
                              { fill: '#3b82f6' },
                              { fill: '#8b5cf6' },
                              { fill: '#64748b' },
                            ].map((c, i) => (
                              <Cell key={i} fill={c.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : selectedProject && !isLoading ? (
                <div className={`p-8 rounded-xl border ${cardClass} text-center`}>
                  <AlertCircle className={`w-12 h-12 mx-auto mb-3 opacity-40 ${textSecondary}`} />
                  <p className={`font-bold ${textSecondary}`}>No overview data. The API may not be implemented or returned empty.</p>
                </div>
              ) : null}
            </>
          )}

        </>
      )}

      {activeTab === 'workProgress' && (
        <>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary} mb-4`}>Filters</h3>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
              <div>
                <label className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Project *</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={`w-full sm:min-w-[200px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Sub Project</label>
                <select
                  value={selectedSubProject}
                  onChange={(e) => setSelectedSubProject(e.target.value)}
                  disabled={!selectedProject}
                  className={`w-full sm:min-w-[180px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All</option>
                  {subprojects.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => loadWorkProcess()}
                disabled={!selectedProject || workProcessLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm disabled:opacity-50"
              >
                {workProcessLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load
              </button>
            </div>
          </div>

          {!selectedProject ? (
            <div className={`p-12 rounded-2xl border ${cardClass} text-center`}>
              <TrendingUp className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
              <p className={`font-bold text-lg ${textSecondary}`}>Select a project to view work progress</p>
            </div>
          ) : workProcessLoading ? (
            <div className={`p-12 rounded-2xl border ${cardClass} flex items-center justify-center gap-3`}>
              <Loader2 className="w-8 h-8 animate-spin text-[#C2D642]" />
              <span className="font-bold">Loading work progress...</span>
            </div>
          ) : workProcessData ? (
            <>
              <div className={`p-6 rounded-2xl border ${cardClass}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 sm:mb-6 ${textSecondary}`}>Cost Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'} border border-inherit`}>
                    <p className={`text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Total Estimate Cost</p>
                    <p className={`text-lg sm:text-xl font-black ${textPrimary}`}>
                      {(Number(workProcessData.estimatedCost ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'} border border-inherit`}>
                    <p className={`text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Executed Cost</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-500">
                      {(Number(workProcessData.estimatedCostForExecutedQty ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'} border border-inherit`}>
                    <p className={`text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Balance Cost</p>
                    <p className="text-lg sm:text-xl font-black text-cyan-500">
                      {(Number(workProcessData.balanceEstimate ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'} border border-inherit`}>
                    <p className={`text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Excess Estimate Cost</p>
                    <p className="text-lg sm:text-xl font-black text-rose-500">
                      {(Number(workProcessData.excessEstimateCost ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {(() => {
                  const costLabels = ['Estimated Cost', 'Executed Cost', 'Balance', 'Excess'];
                  let chartData = workProcessData.workProcessData;
                  if (chartData && Array.isArray(chartData) && chartData.length > 0) {
                    // Backend returns [{y, legendText}, ...] - map to {name, value} for Recharts
                    chartData = chartData.map((item: any, i: number) => ({
                      name: costLabels[i] ?? item.legendText ?? `Item ${i + 1}`,
                      value: Number(item.y ?? item.value ?? 0),
                    }));
                  } else if (chartData && typeof chartData === 'object' && !Array.isArray(chartData)) {
                    const obj = chartData as Record<string, unknown>;
                    chartData = [
                      { name: 'Estimated Cost', value: Number(obj.estimatedCost ?? obj.estimated_cost ?? 0) },
                      { name: 'Executed Cost', value: Number(obj.estimatedCostForExecutedQty ?? obj.executed_cost ?? 0) },
                      { name: 'Balance', value: Number(obj.balanceEstimate ?? obj.balance ?? 0) },
                      { name: 'Excess', value: Number(obj.excessEstimateCost ?? obj.excess ?? 0) },
                    ];
                  } else {
                    chartData = [
                      { name: 'Estimated Cost', value: Number(workProcessData.estimatedCost ?? 0) },
                      { name: 'Executed Cost', value: Number(workProcessData.estimatedCostForExecutedQty ?? 0) },
                      { name: 'Balance', value: Number(workProcessData.balanceEstimate ?? 0) },
                      { name: 'Excess', value: Number(workProcessData.excessEstimateCost ?? 0) },
                    ];
                  }
                  return chartData && chartData.length > 0 ? (
                  <div className="h-[220px] sm:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                        <Tooltip formatter={(v: number | undefined) => (v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
                        <Bar dataKey="value" fill="#C2D642" radius={[6, 6, 0, 0]} name="Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center rounded-xl bg-slate-500/5">
                    <p className={`text-sm ${textSecondary}`}>Chart data not available</p>
                  </div>
                );
                })()}
              </div>

              {/* Activity Status Overview - Pie Chart */}
              {(() => {
                const wpInProgress = Number(workProcessData.inProgress ?? 0);
                const wpCompleted = Number(workProcessData.completed ?? 0);
                const wpNotStart = Number(workProcessData.notStart ?? 0);
                const wpDelay = Number(workProcessData.delay ?? 0);
                const activityPieData = [
                  { name: 'In Progress', value: wpInProgress, color: '#C2D642' },
                  { name: 'Completed', value: wpCompleted, color: '#22c55e' },
                  { name: 'Not Started', value: wpNotStart, color: '#94a3b8' },
                  { name: 'Delay', value: wpDelay, color: '#f59e0b' },
                ].filter((d) => d.value > 0);
                return activityPieData.length > 0 ? (
                  <div className={`p-6 rounded-2xl border ${cardClass}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${textSecondary}`}>Activity Status Overview</h3>
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      <div className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={activityPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={90} dataKey="value" paddingAngle={2}>
                              {activityPieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={`grid grid-cols-2 gap-3 ${textPrimary}`}>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                          <p className="text-[10px] font-bold uppercase text-[#C2D642]">In Progress</p>
                          <p className="text-xl font-black">{wpInProgress}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                          <p className="text-[10px] font-bold uppercase text-emerald-500">Completed</p>
                          <p className="text-xl font-black">{wpCompleted}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Not Started</p>
                          <p className="text-xl font-black">{wpNotStart}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                          <p className="text-[10px] font-bold uppercase text-amber-500">Delay</p>
                          <p className="text-xl font-black">{wpDelay}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className={`p-6 rounded-2xl border ${cardClass}`}>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'inprogress' as const, label: 'In Progress', icon: Clock, color: '#C2D642' },
                      { id: 'completed' as const, label: 'Completed', icon: CheckCircle2, color: '#22c55e' },
                      { id: 'notstart' as const, label: 'Not Started', icon: XCircle, color: '#94a3b8' },
                      { id: 'delay' as const, label: 'Delay', icon: AlertTriangle, color: '#f59e0b' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActivityTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                          activityTab === t.id
                            ? 'text-white shadow-lg'
                            : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                        }`}
                        style={activityTab === t.id ? { backgroundColor: t.color } : {}}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${activityTab === t.id ? 'bg-white/20' : 'bg-slate-500/20'}`}>
                          {t.id === 'inprogress' ? (workProcessData.inProgress ?? 0) : t.id === 'completed' ? (workProcessData.completed ?? 0) : t.id === 'notstart' ? (workProcessData.notStart ?? 0) : (t.id === 'delay' && activityTab === 'delay' ? activityList.length : (workProcessData.delay ?? 0))}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className={`pl-9 pr-3 py-2 rounded-lg border text-sm w-full sm:w-48 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                    />
                  </div>
                </div>

                {activityListLoading ? (
                  <div className="py-12 flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading activities...</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-inherit">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                            {activityTab === 'delay' ? (
                              <>
                                <th className="text-left py-3 px-4 font-bold">Sr.No</th>
                                <th className="text-left py-3 px-4 font-bold">Activities</th>
                                <th className="text-left py-3 px-4 font-bold">Unit</th>
                                <th className="text-left py-3 px-4 font-bold">Est. Qty</th>
                                <th className="text-left py-3 px-4 font-bold">% Completion</th>
                                <th className="text-left py-3 px-4 font-bold">Planned Start</th>
                                <th className="text-left py-3 px-4 font-bold">Planned End</th>
                                <th className="text-left py-3 px-4 font-bold">Actual Start</th>
                                <th className="text-left py-3 px-4 font-bold">Delay Days</th>
                              </>
                            ) : (
                              <>
                                <th className="text-left py-3 px-4 font-bold">Sr.No</th>
                                <th className="text-left py-3 px-4 font-bold">Activities</th>
                                <th className="text-left py-3 px-4 font-bold">Unit</th>
                                <th className="text-left py-3 px-4 font-bold">Est. Qty</th>
                                <th className="text-left py-3 px-4 font-bold">Est. Rate</th>
                                <th className="text-left py-3 px-4 font-bold">Est. Amount</th>
                                <th className="text-left py-3 px-4 font-bold">Completed Qty</th>
                                <th className="text-left py-3 px-4 font-bold">Est. Amount for Completion</th>
                                <th className="text-left py-3 px-4 font-bold">% Completion</th>
                                {activityTab !== 'notstart' && (
                                  <>
                                    <th className="text-left py-3 px-4 font-bold">Excess Qty</th>
                                    <th className="text-left py-3 px-4 font-bold">Excess Amount</th>
                                  </>
                                )}
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const getActivityName = (a: any) => typeof a.activities === 'string' ? a.activities : (a.name ?? a.activity_name ?? a.activities?.name ?? '-');
                            const filtered = activitySearch.trim()
                              ? activityList.filter((a: any) =>
                                  getActivityName(a).toLowerCase().includes(activitySearch.toLowerCase())
                                )
                              : activityList;
                            const paginated = filtered.slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE);
                            return paginated.length === 0 ? (
                              <tr>
                                <td colSpan={activityTab === 'delay' ? 9 : 12} className="py-12 text-center">
                                  <p className={textSecondary}>No activities found</p>
                                </td>
                              </tr>
                            ) : (
                              paginated.map((a: any, i: number) => {
                                const srNo = (activityPage - 1) * ACTIVITY_PAGE_SIZE + i + 1;
                                const name = getActivityName(a);
                                const unit = a.unit ?? a.units?.unit ?? a.unit_id?.unit ?? (a.unit_id ? `#${a.unit_id}` : '-');
                                const estQty = Number(a.qty ?? a.estimate_qty ?? a.planned_qty ?? 0) || 0;
                                const rate = Number(a.rate ?? a.est_rate ?? 0) || 0;
                                const estAmount = Number(a.amount ?? a.est_amount ?? 0) || estQty * rate || 0;
                                const completedQtyRaw = Number(
                                  a.completed_qty
                                  ?? a.activities_history?.reduce?.((s: number, h: any) => s + Number(h.qty ?? h.total_qty ?? 0), 0)
                                  ?? a.activities_history?.[a.activities_history.length - 1]?.total_qty
                                  ?? a.total_qty ?? 0
                                );
                                const completedQty = Number.isFinite(completedQtyRaw) ? completedQtyRaw : 0;
                                const pctComplete = estQty > 0 ? (completedQty / estQty) * 100 : 0;
                                const pctDisplay = Number.isFinite(pctComplete) ? pctComplete : 0;
                                const excessQty = Math.max(0, completedQty - estQty);
                                const excessAmount = excessQty * rate;
                                const amountForCompletion = (estQty - completedQty) * rate;
                                const plannedStart = a.start_date ?? a.planned_start_date ?? a.planned_start ?? '-';
                                const plannedEnd = a.end_date ?? a.planned_end_date ?? a.planned_end ?? '-';
                                const actualStart = a.actual_start ?? a.actual_start_date ?? '-';
                                const delayDaysCalc = plannedEnd && actualStart ? Math.max(0, Math.ceil((new Date(actualStart).getTime() - new Date(plannedEnd).getTime()) / 86400000)) : null;
                                const delayDays = a.delay_days ?? (Number.isFinite(delayDaysCalc) ? delayDaysCalc : '-');
                                if (activityTab === 'delay') {
                                  return (
                                    <tr key={a.id ?? i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                      <td className="py-3 px-4">{srNo}</td>
                                      <td className="py-3 px-4 font-medium">{name}</td>
                                      <td className="py-3 px-4">{unit}</td>
                                      <td className="py-3 px-4">{estQty.toLocaleString()}</td>
                                      <td className="py-3 px-4">{pctDisplay.toFixed(1)}%</td>
                                      <td className="py-3 px-4">{typeof plannedStart === 'string' ? plannedStart.slice(0, 10) : plannedStart}</td>
                                      <td className="py-3 px-4">{typeof plannedEnd === 'string' ? plannedEnd.slice(0, 10) : plannedEnd}</td>
                                      <td className="py-3 px-4">{typeof actualStart === 'string' ? actualStart.slice(0, 10) : actualStart}</td>
                                      <td className="py-3 px-4 font-bold text-amber-500">{delayDays}</td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={a.id ?? i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <td className="py-3 px-4">{srNo}</td>
                                    <td className="py-3 px-4 font-medium">{name}</td>
                                    <td className="py-3 px-4">{unit}</td>
                                    <td className="py-3 px-4">{estQty.toLocaleString()}</td>
                                    <td className="py-3 px-4">{rate.toLocaleString()}</td>
                                    <td className="py-3 px-4">{(Number.isFinite(estAmount) ? estAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4">{completedQty.toLocaleString()}</td>
                                    <td className="py-3 px-4">{(Number.isFinite(amountForCompletion) ? amountForCompletion : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-3 px-4">
                                      <span className={`font-bold ${pctDisplay >= 100 ? 'text-emerald-500' : pctDisplay > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {pctDisplay.toFixed(1)}%
                                      </span>
                                    </td>
                                    {activityTab !== 'notstart' && (
                                      <>
                                        <td className="py-3 px-4">{excessQty > 0 ? (Number.isFinite(excessQty) ? excessQty : 0).toLocaleString() : '-'}</td>
                                        <td className="py-3 px-4">{excessAmount > 0 ? (Number.isFinite(excessAmount) ? excessAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                    {(() => {
                      const filtered = activitySearch.trim()
                        ? activityList.filter((a: any) =>
                            (typeof a.activities === 'string' ? a.activities : (a.name ?? a.activity_name ?? a.activities?.name ?? '')).toLowerCase().includes(activitySearch.toLowerCase())
                          )
                        : activityList;
                      const totalPages = Math.max(1, Math.ceil(filtered.length / ACTIVITY_PAGE_SIZE));
                      return totalPages > 1 ? (
                        <div className="flex items-center justify-between mt-4">
                          <p className={`text-sm ${textSecondary}`}>
                            Page {activityPage} of {totalPages} ({filtered.length} activities)
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                              disabled={activityPage <= 1}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActivityPage((p) => Math.min(totalPages, p + 1))}
                              disabled={activityPage >= totalPages}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            </>
          ) : selectedProject && !workProcessLoading ? (
            <div className={`p-12 rounded-2xl border ${cardClass} text-center`}>
              <AlertCircle className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
              <p className={`font-bold text-lg ${textSecondary}`}>No work process data. The API may not be implemented.</p>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'stock' && (
        <>
          <div id="filter-form-stocks" className={`p-4 rounded-xl border ${cardClass}`}>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 items-stretch sm:items-end">
              <div>
                <label htmlFor="from_project_stocks" className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Project *</label>
                <select
                  id="from_project_stocks"
                  value={selectedProject}
                  onChange={(e) => { setSelectedProject(e.target.value); setSelectedStockStore(''); setStockMaterialData([]); setStockMachineData([]); }}
                  className={`w-full sm:min-w-[200px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="from_subproject_stocks" className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Store *</label>
                <select
                  id="from_subproject_stocks"
                  value={selectedStockStore}
                  onChange={(e) => { setSelectedStockStore(e.target.value); setStockMaterialData([]); setStockMachineData([]); }}
                  disabled={!selectedProject}
                  className={`w-full sm:min-w-[200px] px-3 py-2 rounded-lg border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select Store</option>
                  {stockStores.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date_stocks" className={`block text-[10px] font-bold uppercase ${textSecondary} mb-1`}>Date</label>
                <DatePickerInput
                  id="date_stocks"
                  value={selectedDate}
                  onChange={(e: any) => setSelectedDate(e?.target?.value ?? '')}
                  className={`w-full sm:min-w-[140px] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                />
              </div>
              <button
                onClick={() => loadInventoryStocks()}
                disabled={!selectedProject || !selectedStockStore || !/^\d+$/.test(String(selectedStockStore || '')) || !selectedDate || stockLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm disabled:opacity-50"
              >
                {stockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load
              </button>
            </div>
          </div>

          {!selectedProject ? (
            <div className={`p-12 rounded-2xl border ${cardClass} text-center`}>
              <Warehouse className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
              <p className={`font-bold text-lg ${textSecondary}`}>Select a project to view stock</p>
            </div>
          ) : !selectedStockStore ? (
            <div className={`p-12 rounded-2xl border ${cardClass} text-center`}>
              <Warehouse className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
              <p className={`font-bold text-lg ${textSecondary}`}>Select a store to view stock</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 rounded-xl border border-inherit mb-4" role="tablist">
                {[
                  { id: 'material' as const, label: 'Material', icon: Box },
                  { id: 'machine' as const, label: 'Machines/Tools', icon: Wrench },
                ].map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    data-name={t.id}
                    aria-selected={stockTab === t.id}
                    onClick={() => { setStockTab(t.id); setStockPage(1); loadInventoryStocks(t.id); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                      stockTab === t.id ? 'bg-[#C2D642] text-slate-900 shadow' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Material panel */}
              <div id="pills-material" className={stockTab === 'material' ? '' : 'hidden'} role="tabpanel">
                <div id="stockMaterialTable" className={`p-6 rounded-2xl border ${cardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className={`pl-9 pr-3 py-2 rounded-lg border text-sm w-full sm:w-48 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleStockExport('material', 'Copy')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Copy className="w-3.5 h-3.5" /> Copy</button>
                      <button onClick={() => handleStockExport('material', 'CSV')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><FileText className="w-3.5 h-3.5" /> CSV</button>
                      <button onClick={() => handleStockExport('material', 'Excel')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Download className="w-3.5 h-3.5" /> Excel</button>
                      <button onClick={() => handleStockExport('material', 'PDF')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><FileDown className="w-3.5 h-3.5" /> PDF</button>
                      <button onClick={() => handleStockExport('material', 'Print')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Printer className="w-3.5 h-3.5" /> Print</button>
                    </div>
                  </div>
                  {stockTab === 'material' && stockLoading ? (
                    <div className="py-12 flex items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Loading stock...</span>
                    </div>
                  ) : (
                    <>
                      {/* Top Materials Bar Chart */}
                      {stockMaterialData.length > 0 && (
                        <div className="mb-6">
                          <h4 className={`text-xs font-bold uppercase ${textSecondary} mb-3`}>Top Materials by Stock Qty</h4>
                          <div className="h-[200px] sm:h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[...stockMaterialData]
                                  .map((s: any) => {
                                    const mat = s.materials ?? s.material ?? s;
                                    return {
                                      name: (mat?.name ?? mat?.code ?? s?.name ?? '-').slice(0, 14),
                                      qty: Number(s.total_qty ?? s.qty ?? s.stock_qty ?? 0),
                                    };
                                  })
                                  .sort((a, b) => b.qty - a.qty)
                                  .slice(0, 8)}
                                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="qty" fill="#C2D642" radius={[4, 4, 0, 0]} name="Stock Qty" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-xl border border-inherit">
                        <table id="stockMaterial" className="w-full text-sm">
                          <thead>
                            <tr className={`${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                              <th className="text-left py-3 px-4 font-bold">Class</th>
                              <th className="text-left py-3 px-4 font-bold">Code</th>
                              <th className="text-left py-3 px-4 font-bold">Materials</th>
                              <th className="text-left py-3 px-4 font-bold">Specification</th>
                              <th className="text-left py-3 px-4 font-bold">Unit</th>
                              <th className="text-left py-3 px-4 font-bold">Stock Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = stockSearch.trim()
                                ? stockMaterialData.filter((s: any) => {
                                    const mat = s.materials ?? s.material ?? s;
                                    const code = mat?.code ?? s?.code ?? '';
                                    const name = mat?.name ?? s?.name ?? '';
                                    const spec = mat?.specification ?? s?.specification ?? '';
                                    const q = stockSearch.toLowerCase();
                                    return [code, name, spec].some((v) => String(v).toLowerCase().includes(q));
                                  })
                                : stockMaterialData;
                              const paginated = filtered.slice((stockPage - 1) * STOCK_PAGE_SIZE, stockPage * STOCK_PAGE_SIZE);
                              return paginated.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center">
                                    <p className={textSecondary}>
                                      {stockMaterialData.length === 0
                                        ? 'No stock data for this project/store/date. Try a different selection or ensure inventory exists.'
                                        : 'No matching results for search.'}
                                    </p>
                                  </td>
                                </tr>
                              ) : (
                                paginated.map((s: any, i: number) => {
                                  const mat = s.materials ?? s.material ?? s;
                                  const code = mat?.code ?? s?.code ?? s?.material_code ?? '-';
                                  const name = mat?.name ?? s?.name ?? s?.material_name ?? mat?.material_name ?? '-';
                                  const spec = mat?.specification ?? s?.specification ?? s?.spec ?? '-';
                                  const unit = mat?.units?.unit ?? mat?.unit ?? s?.unit ?? s?.units?.unit ?? '-';
                                  const qty = Number(s.total_qty ?? s.qty ?? s.stock_qty ?? s.quantity ?? 0);
                                  const clsVal = mat?.class ?? s?.class ?? null;
                                  const clsStr = clsVal != null ? (typeof clsVal === 'object' ? (clsVal?.name ?? '-') : String(clsVal)) : '-';
                                  return (
                                    <tr key={s.id ?? i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                      <td className="py-3 px-4">{clsStr}</td>
                                      <td className="py-3 px-4 font-medium">{code}</td>
                                      <td className="py-3 px-4">{name}</td>
                                      <td className="py-3 px-4">{typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-')}</td>
                                      <td className="py-3 px-4">{typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-')}</td>
                                      <td className="py-3 px-4 font-bold">{qty.toLocaleString()}</td>
                                    </tr>
                                  );
                                })
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const filtered = stockSearch.trim()
                          ? stockMaterialData.filter((s: any) => {
                              const mat = s.materials ?? s.material ?? s;
                              const code = mat?.code ?? s?.code ?? '';
                              const name = mat?.name ?? s?.name ?? '';
                              const spec = mat?.specification ?? s?.specification ?? '';
                              const q = stockSearch.toLowerCase();
                              return [code, name, spec].some((v) => String(v).toLowerCase().includes(q));
                            })
                          : stockMaterialData;
                        const totalPages = Math.max(1, Math.ceil(filtered.length / STOCK_PAGE_SIZE));
                        const start = (stockPage - 1) * STOCK_PAGE_SIZE + 1;
                        const end = Math.min(stockPage * STOCK_PAGE_SIZE, filtered.length);
                        return filtered.length > STOCK_PAGE_SIZE ? (
                          <div className="flex items-center justify-between mt-4">
                            <p className={`text-sm ${textSecondary}`}>
                              Showing {start}–{end} of {filtered.length} (10 per page)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                                disabled={stockPage <= 1}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStockPage((p) => Math.min(totalPages, p + 1))}
                                disabled={stockPage >= totalPages}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Machines/Tools panel */}
              <div id="pills-machine" className={stockTab === 'machine' ? '' : 'hidden'} role="tabpanel">
                <div id="stockMachineTable" className={`p-6 rounded-2xl border ${cardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className={`pl-9 pr-3 py-2 rounded-lg border text-sm w-full sm:w-48 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleStockExport('machine', 'Copy')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Copy className="w-3.5 h-3.5" /> Copy</button>
                      <button onClick={() => handleStockExport('machine', 'CSV')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><FileText className="w-3.5 h-3.5" /> CSV</button>
                      <button onClick={() => handleStockExport('machine', 'Excel')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Download className="w-3.5 h-3.5" /> Excel</button>
                      <button onClick={() => handleStockExport('machine', 'PDF')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><FileDown className="w-3.5 h-3.5" /> PDF</button>
                      <button onClick={() => handleStockExport('machine', 'Print')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><Printer className="w-3.5 h-3.5" /> Print</button>
                    </div>
                  </div>
                  {stockTab === 'machine' && stockLoading ? (
                    <div className="py-12 flex items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Loading stock...</span>
                    </div>
                  ) : (
                    <>
                      {/* Top Machines Bar Chart */}
                      {stockMachineData.length > 0 && (
                        <div className="mb-6">
                          <h4 className={`text-xs font-bold uppercase ${textSecondary} mb-3`}>Top Machines/Tools by Stock Qty</h4>
                          <div className="h-[200px] sm:h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[...stockMachineData]
                                  .map((s: any) => {
                                    const mat = s.assets ?? s.asset ?? s;
                                    return {
                                      name: (mat?.name ?? mat?.code ?? s?.name ?? '-').slice(0, 14),
                                      qty: Number(s.total_qty ?? s.qty ?? s.stock_qty ?? 0),
                                    };
                                  })
                                  .sort((a, b) => b.qty - a.qty)
                                  .slice(0, 8)}
                                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="qty" fill="#C2D642" radius={[4, 4, 0, 0]} name="Stock Qty" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-xl border border-inherit">
                        <table id="stockMachine" className="w-full text-sm">
                          <thead>
                            <tr className={`${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                              <th className="text-left py-3 px-4 font-bold">Code</th>
                              <th className="text-left py-3 px-4 font-bold">Machine/Tools</th>
                              <th className="text-left py-3 px-4 font-bold">Specification</th>
                              <th className="text-left py-3 px-4 font-bold">Unit</th>
                              <th className="text-left py-3 px-4 font-bold">Stock Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = stockSearch.trim()
                                ? stockMachineData.filter((s: any) => {
                                    const mat = s.assets ?? s.asset ?? s;
                                    const code = mat?.code ?? s?.code ?? '';
                                    const name = mat?.name ?? s?.name ?? '';
                                    const spec = mat?.specification ?? s?.specification ?? '';
                                    const q = stockSearch.toLowerCase();
                                    return [code, name, spec].some((v) => String(v).toLowerCase().includes(q));
                                  })
                                : stockMachineData;
                              const paginated = filtered.slice((stockPage - 1) * STOCK_PAGE_SIZE, stockPage * STOCK_PAGE_SIZE);
                              return paginated.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center">
                                    <p className={textSecondary}>
                                      {stockMachineData.length === 0
                                        ? 'No stock data for this project/store/date. Try a different selection or ensure inventory exists.'
                                        : 'No matching results for search.'}
                                    </p>
                                  </td>
                                </tr>
                              ) : (
                                paginated.map((s: any, i: number) => {
                                  const mat = s.assets ?? s.asset ?? s;
                                  const code = mat?.code ?? s?.code ?? s?.asset_code ?? '-';
                                  const name = mat?.name ?? s?.name ?? s?.asset_name ?? mat?.asset_name ?? '-';
                                  const spec = mat?.specification ?? s?.specification ?? s?.spec ?? '-';
                                  const unit = mat?.units?.unit ?? mat?.unit ?? s?.unit ?? s?.units?.unit ?? '-';
                                  const qty = Number(s.total_qty ?? s.qty ?? s.stock_qty ?? s.quantity ?? 0);
                                  return (
                                    <tr key={s.id ?? i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                      <td className="py-3 px-4 font-medium">{code}</td>
                                      <td className="py-3 px-4">{name}</td>
                                      <td className="py-3 px-4">{typeof spec === 'object' ? (spec?.name ?? '-') : (spec ?? '-')}</td>
                                      <td className="py-3 px-4">{typeof unit === 'object' ? (unit?.unit ?? unit?.name ?? '-') : (unit ?? '-')}</td>
                                      <td className="py-3 px-4 font-bold">{qty.toLocaleString()}</td>
                                    </tr>
                                  );
                                })
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const filtered = stockSearch.trim()
                          ? stockMachineData.filter((s: any) => {
                              const mat = s.assets ?? s.asset ?? s;
                              const code = mat?.code ?? s?.code ?? '';
                              const name = mat?.name ?? s?.name ?? '';
                              const spec = mat?.specification ?? s?.specification ?? '';
                              const q = stockSearch.toLowerCase();
                              return [code, name, spec].some((v) => String(v).toLowerCase().includes(q));
                            })
                          : stockMachineData;
                        const totalPages = Math.max(1, Math.ceil(filtered.length / STOCK_PAGE_SIZE));
                        const start = (stockPage - 1) * STOCK_PAGE_SIZE + 1;
                        const end = Math.min(stockPage * STOCK_PAGE_SIZE, filtered.length);
                        return filtered.length > STOCK_PAGE_SIZE ? (
                          <div className="flex items-center justify-between mt-4">
                            <p className={`text-sm ${textSecondary}`}>
                              Showing {start}–{end} of {filtered.length} (10 per page)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                                disabled={stockPage <= 1}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStockPage((p) => Math.min(totalPages, p + 1))}
                                disabled={stockPage >= totalPages}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} disabled:opacity-50`}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
