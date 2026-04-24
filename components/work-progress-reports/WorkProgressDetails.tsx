'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ThemeType } from '../../types';
import { 
  ClipboardCheck,
  Search,
  Calendar,
  Copy,
  FileText,
  Download,
  FileDown,
  Printer,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { useProjectsFromMasters, useSubprojectsFromMasters } from '../../hooks/useProjectsFromMasters';
import { masterDataAPI } from '../../services/api';
import { computeWorkProgressBalanceQty, parseLocaleNumericInput } from '../../utils/workProgress';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WorkProgressActivity {
  id: string;
  slNo: number;
  activities: string;
  unit: string;
  estimateQty: number;
  estRate: number;
  estAmount: number;
  completedQty: number;
  estAmountForCompletion: number;
  completionPercentage: number;
  balanceQty: number;
}

interface WorkProgressDetailsProps {
  theme: ThemeType;
}

function mapApiRowToActivity(row: any, index: number): WorkProgressActivity {
  const n = (v: any) => {
    const x = parseLocaleNumericInput(v);
    return Number.isFinite(x) ? x : 0;
  };
  const s = (v: any) => String(v ?? '');
  const estimateQty = n(row.est_qty ?? row.estimate_qty ?? row.estimateQty);
  const completedQty = n(row.completed_qty ?? row.completedQty);
  return {
    id: String(row.id ?? row.sl_no ?? index + 1),
    slNo: index + 1,
    activities: s(row.activities ?? row.activity ?? row.name),
    unit: s(row.unit),
    estimateQty,
    estRate: n(row.est_rate ?? row.estRate),
    estAmount: n(row.est_amount ?? row.estAmount),
    completedQty,
    estAmountForCompletion: n(row.est_amount_completion ?? row.est_amount_for_completion ?? row.estAmountForCompletion),
    completionPercentage: n(row.completion ?? row.completion_percentage ?? row.completionPercentage),
    balanceQty: computeWorkProgressBalanceQty(estimateQty, completedQty),
  };
}

const WorkProgressDetails: React.FC<WorkProgressDetailsProps> = ({ theme }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activities, setActivities] = useState<WorkProgressActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const projectSearchInputRef = useRef<HTMLInputElement>(null);
  const [subprojectMenuOpen, setSubprojectMenuOpen] = useState(false);
  const [subprojectSearch, setSubprojectSearch] = useState('');
  const subprojectMenuRef = useRef<HTMLDivElement>(null);
  const subprojectSearchInputRef = useRef<HTMLInputElement>(null);

  const projects = useProjectsFromMasters();
  const projIdForSub = projects.find((p) => String(p.id) === String(selectedProject))?.id ?? selectedProject;
  const subprojects = useSubprojectsFromMasters(projIdForSub || undefined);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const sorted = [...projects].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!q) return sorted;
    return sorted.filter((p) => String(p.name).toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const filteredSubprojects = useMemo(() => {
    const q = subprojectSearch.trim().toLowerCase();
    const sorted = [...subprojects].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!q) return sorted;
    return sorted.filter((s) => String(s.name).toLowerCase().includes(q));
  }, [subprojects, subprojectSearch]);

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProject) return 'Select Project';
    const p = projects.find((x) => String(x.id) === String(selectedProject));
    return p?.name?.trim() || 'Select Project';
  }, [projects, selectedProject]);

  const selectedSubProjectLabel = useMemo(() => {
    if (!selectedSubProject) return 'Select Sub Project';
    const s = subprojects.find((x) => String(x.id) === String(selectedSubProject));
    return s?.name?.trim() || 'Select Sub Project';
  }, [subprojects, selectedSubProject]);

  useEffect(() => {
    if (!projectMenuOpen) {
      setProjectSearch('');
      return;
    }
    const t = window.setTimeout(() => projectSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [projectMenuOpen]);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = projectMenuRef.current;
      if (el && !el.contains(e.target as Node)) setProjectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [projectMenuOpen]);

  useEffect(() => {
    if (!subprojectMenuOpen) {
      setSubprojectSearch('');
      return;
    }
    const t = window.setTimeout(() => subprojectSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [subprojectMenuOpen]);

  useEffect(() => {
    if (!subprojectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = subprojectMenuRef.current;
      if (el && !el.contains(e.target as Node)) setSubprojectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [subprojectMenuOpen]);

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    if (!selectedProject) setSelectedSubProject('');
  }, [selectedProject]);

  // Required filters for loading table: project, fromDate, toDate
  const filtersReady = Boolean(selectedProject && fromDate && toDate);

  // Fetch work progress details from API when filters are ready
  useEffect(() => {
    if (!filtersReady) {
      setActivities([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    masterDataAPI
      .getWorkProgressDetailsReport({
        project: selectedProject,
        subproject: selectedSubProject || undefined,
        date_from: fromDate,
        date_to: toDate,
      })
      .then((res) => {
        const rows = res?.activities ?? (Array.isArray(res) ? res : []);
        const mapped = Array.isArray(rows) ? rows.map((r, i) => mapApiRowToActivity(r, i)) : [];
        setActivities(mapped);
      })
      .catch((e: any) => {
        setLoadError(e?.message || 'Failed to load work progress details');
        setActivities([]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedProject, selectedSubProject, fromDate, toDate, filtersReady]);

  // Use API activities only (no fallback demo data)
  const activitiesSource = activities;

  // Filter and sort activities
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = activitiesSource.filter(activity =>
      activity.activities.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof WorkProgressActivity];
        let bValue: any = b[sortConfig.key as keyof WorkProgressActivity];

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [activitiesSource, searchQuery, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedActivities.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedActivities = filteredAndSortedActivities.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProject, selectedSubProject]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return (
        <div className="flex flex-col">
          <ChevronUp className="w-3 h-3 opacity-30" />
          <ChevronDown className="w-3 h-3 opacity-30 -mt-1" />
        </div>
      );
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  const formatNumber = (num: number) => {
    if (!Number.isFinite(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExport = (format: string) => {
    // Simple export functionality
    const headers = ['Sl.no', 'Activities', 'Unit', 'Estimate Qty', 'Est Rate', 'Est. Amount', 'Completed Qty', 'Est. Amount for Completion', '% Completion', 'Balance qty'];
    const rows = filteredAndSortedActivities.map(activity => [
      activity.slNo,
      activity.activities,
      activity.unit,
      formatNumber(activity.estimateQty),
      formatNumber(activity.estRate),
      formatNumber(activity.estAmount),
      formatNumber(activity.completedQty),
      formatNumber(activity.estAmountForCompletion),
      formatNumber(activity.completionPercentage),
      formatNumber(activity.balanceQty)
    ]);

    if (format === 'CSV' || format === 'Excel') {
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-progress-details.${format === 'CSV' ? 'csv' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'Copy') {
      const text = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');
      navigator.clipboard.writeText(text);
      alert('Data copied to clipboard!');
    } else if (format === 'PDF') {
      handleDownloadPDF();
    } else if (format === 'Print') {
      handlePrint();
    }
  };

  const getPrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Work Progress Report</title>
          <style>
            @media print {
              @page {
                margin: 15mm;
                size: A4 landscape;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #000;
            }
            .info {
              font-size: 12px;
              margin-bottom: 20px;
              text-align: left;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .info p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Work Progress Report</div>
            <div class="info">
              <p><strong>Project:</strong> ${selectedProject}</p>
              <p><strong>Sub Project:</strong> ${selectedSubProject || 'N/A'}</p>
              <p><strong>From Date:</strong> ${new Date(fromDate).toLocaleDateString('en-GB')}</p>
              <p><strong>To Date:</strong> ${new Date(toDate).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sl.no</th>
                <th>Activities</th>
                <th>Unit</th>
                <th class="text-right">Estimate Qty</th>
                <th class="text-right">Est Rate</th>
                <th class="text-right">Est. Amount</th>
                <th class="text-right">Completed Qty</th>
                <th class="text-right">Est. Amount for Completion</th>
                <th class="text-right">% Completion</th>
                <th class="text-right">Balance qty</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedActivities.map(activity => `
                <tr>
                  <td>${activity.slNo}</td>
                  <td>${activity.activities}</td>
                  <td>${activity.unit}</td>
                  <td class="text-right">${formatNumber(activity.estimateQty)}</td>
                  <td class="text-right">${formatNumber(activity.estRate)}</td>
                  <td class="text-right">${formatNumber(activity.estAmount)}</td>
                  <td class="text-right">${formatNumber(activity.completedQty)}</td>
                  <td class="text-right">${formatNumber(activity.estAmountForCompletion)}</td>
                  <td class="text-right">${formatNumber(activity.completionPercentage)}</td>
                  <td class="text-right">${formatNumber(activity.balanceQty)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleDownloadPDF = () => {
    const projectName = projects.find((p) => String(p.id) === String(selectedProject))?.name ?? selectedProject;
    const subprojectName = subprojects.find((s) => String(s.id) === String(selectedSubProject))?.name ?? selectedSubProject;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Work Progress Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Project: ${projectName}`, 14, 22);
    doc.text(`Sub Project: ${subprojectName || 'N/A'}`, 14, 27);
    doc.text(`From Date: ${fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '-'}`, 100, 22);
    doc.text(`To Date: ${toDate ? new Date(toDate).toLocaleDateString('en-GB') : '-'}`, 100, 27);

    const headers = [['Sl.no', 'Activities', 'Unit', 'Estimate Qty', 'Est Rate', 'Est. Amount', 'Completed Qty', 'Est. Amount for Completion', '% Completion', 'Balance qty']];
    const body = filteredAndSortedActivities.map((a) => [
      String(a.slNo),
      a.activities,
      a.unit,
      formatNumber(a.estimateQty),
      formatNumber(a.estRate),
      formatNumber(a.estAmount),
      formatNumber(a.completedQty),
      formatNumber(a.estAmountForCompletion),
      formatNumber(a.completionPercentage),
      formatNumber(a.balanceQty),
    ]);

    autoTable(doc, {
      head: headers,
      body,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
    });

    doc.save('work-progress-details.pdf');
  };

  const handlePrint = () => {
    const printContent = getPrintContent();
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Wait for content to load, then trigger print dialog
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Work Progress Details</h1>
            <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Track and manage work progress activities
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`rounded-xl border ${cardClass} p-3 sm:p-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label htmlFor="work-progress-project-button" className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={projectMenuRef}>
              <button
                id="work-progress-project-button"
                type="button"
                onClick={() => setProjectMenuOpen((o) => !o)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm border text-left ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                aria-expanded={projectMenuOpen}
                aria-haspopup="listbox"
                aria-label="Select project"
              >
                <span className="truncate">{selectedProjectLabel}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {projectMenuOpen ? (
                <div
                  role="listbox"
                  aria-label="Projects"
                  className={`absolute left-0 right-0 z-50 mt-1 rounded-lg border shadow-xl overflow-hidden flex flex-col ${
                    isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`p-2 border-b shrink-0 ${isDark ? 'border-slate-600 bg-slate-900/95' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="relative">
                      <Search
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textSecondary}`}
                        aria-hidden
                      />
                      <input
                        ref={projectSearchInputRef}
                        type="search"
                        autoComplete="off"
                        placeholder="Search projects…"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={`w-full pl-9 pr-3 py-2 rounded-md border text-sm ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                        aria-label="Search project list"
                      />
                    </div>
                  </div>
                  <ul className="overflow-y-auto max-h-56 py-1">
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedProject === ''}
                        onClick={() => {
                          setSelectedProject('');
                          setProjectMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                          selectedProject === ''
                            ? isDark
                              ? 'bg-[#6B8E23]/25 text-[#C2D642]'
                              : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                            : isDark
                              ? 'text-slate-200 hover:bg-slate-800'
                              : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        Select Project
                      </button>
                    </li>
                    {filteredProjects.map((p) => {
                      const idStr = String(p.id);
                      const selected = selectedProject === idStr;
                      return (
                        <li key={idStr}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedProject(idStr);
                              setProjectMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors truncate ${
                              selected
                                ? isDark
                                  ? 'bg-[#6B8E23]/25 text-[#C2D642]'
                                  : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                                : isDark
                                  ? 'text-slate-200 hover:bg-slate-800'
                                  : 'text-slate-800 hover:bg-slate-100'
                            }`}
                            title={p.name}
                          >
                            {p.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredProjects.length === 0 && projectSearch.trim() ? (
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No matching projects
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label htmlFor="work-progress-subproject-button" className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Sub Project
            </label>
            <div className="relative" ref={subprojectMenuRef}>
              <button
                id="work-progress-subproject-button"
                type="button"
                onClick={() => selectedProject && setSubprojectMenuOpen((o) => !o)}
                disabled={!selectedProject}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm border text-left ${
                  isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                } focus:ring-2 focus:ring-[#6B8E23]/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-expanded={subprojectMenuOpen}
                aria-haspopup="listbox"
                aria-label="Select sub project"
              >
                <span className="truncate">{selectedProject ? selectedSubProjectLabel : 'Select a project first'}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${subprojectMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {subprojectMenuOpen && selectedProject ? (
                <div
                  role="listbox"
                  aria-label="Sub projects"
                  className={`absolute left-0 right-0 z-50 mt-1 rounded-lg border shadow-xl overflow-hidden flex flex-col ${
                    isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`p-2 border-b shrink-0 ${isDark ? 'border-slate-600 bg-slate-900/95' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="relative">
                      <Search
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textSecondary}`}
                        aria-hidden
                      />
                      <input
                        ref={subprojectSearchInputRef}
                        type="search"
                        autoComplete="off"
                        placeholder="Search sub projects…"
                        value={subprojectSearch}
                        onChange={(e) => setSubprojectSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={`w-full pl-9 pr-3 py-2 rounded-md border text-sm ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                        aria-label="Search sub project list"
                      />
                    </div>
                  </div>
                  <ul className="overflow-y-auto max-h-56 py-1">
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedSubProject === ''}
                        onClick={() => {
                          setSelectedSubProject('');
                          setSubprojectMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                          selectedSubProject === ''
                            ? isDark
                              ? 'bg-[#6B8E23]/25 text-[#C2D642]'
                              : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                            : isDark
                              ? 'text-slate-200 hover:bg-slate-800'
                              : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        Select Sub Project
                      </button>
                    </li>
                    {filteredSubprojects.map((s) => {
                      const idStr = String(s.id);
                      const selected = selectedSubProject === idStr;
                      return (
                        <li key={idStr}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedSubProject(idStr);
                              setSubprojectMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors truncate ${
                              selected
                                ? isDark
                                  ? 'bg-[#6B8E23]/25 text-[#C2D642]'
                                  : 'bg-[#6B8E23]/15 text-[#6B8E23]'
                                : isDark
                                  ? 'text-slate-200 hover:bg-slate-800'
                                  : 'text-slate-800 hover:bg-slate-100'
                            }`}
                            title={s.name}
                          >
                            {s.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredSubprojects.length === 0 && subprojectSearch.trim() ? (
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No matching sub projects
                    </p>
                  ) : null}
                  {subprojects.length === 0 && !subprojectSearch.trim() ? (
                    <p className={`px-3 py-2 text-sm border-t ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      No sub projects for this project
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select From Date
            </label>
            <DatePickerInput
              value={fromDate}
              onChange={(e) => {
                const v = e.target.value;
                setFromDate(v);
                if (v && toDate && new Date(v) > new Date(toDate)) setToDate(v);
              }}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20`}
            />
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select To Date
            </label>
            <DatePickerInput
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              iconClassName={textSecondary}
              className={`py-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20`}
            />
          </div>
        </div>
      </div>

      {/* Export Buttons and Search - only when filters are selected */}
      {filtersReady && (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${cardClass}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('Copy')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={() => handleExport('CSV')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <FileText className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => handleExport('Print')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className={`text-sm font-bold ${textSecondary}`}>Search:</label>
          <div className="relative flex-1 sm:flex-initial">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            />
          </div>
        </div>
      </div>
      )}

      {/* Work Progress Table - only when filters are selected */}
      {filtersReady ? (
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className={`w-8 h-8 animate-spin ${textSecondary}`} />
            <span className={`text-sm font-bold ${textSecondary}`}>Loading work progress details...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{loadError}</p>
          </div>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                {[
                  { key: 'slNo', label: 'Sl.no' },
                  { key: 'activities', label: 'Activities' },
                  { key: 'unit', label: 'Unit' },
                  { key: 'estimateQty', label: 'Estimate Qty' },
                  { key: 'estRate', label: 'Est Rate' },
                  { key: 'estAmount', label: 'Est. Amount' },
                  { key: 'completedQty', label: 'Completed Qty' },
                  { key: 'estAmountForCompletion', label: 'Est. Amount for Completion' },
                  { key: 'completionPercentage', label: '% Completion' },
                  { key: 'balanceQty', label: 'Balance qty' }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80 whitespace-nowrap`}
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-2">
                      {label}
                      {getSortIcon(key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {paginatedActivities.map((activity) => (
                <tr key={activity.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {activity.slNo}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {activity.activities}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {activity.unit}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.estimateQty)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.estRate)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.estAmount)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.completedQty)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.estAmountForCompletion)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.completionPercentage)}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textPrimary}`}>
                    {formatNumber(activity.balanceQty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 sm:p-4 border-t border-inherit flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className={`text-xs sm:text-sm font-bold ${textSecondary}`}>
            Showing {filteredAndSortedActivities.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredAndSortedActivities.length)} of {filteredAndSortedActivities.length} entries
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                currentPage === 1
                  ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  currentPage === page
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                    : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                currentPage === totalPages
                  ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </>
        )}
      </div>
      ) : (
        <div className={`rounded-xl border p-12 text-center ${cardClass}`}>
          <ClipboardCheck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Select filters to load report</h3>
          <p className={`text-sm ${textSecondary}`}>
            Select Project, From Date, and To Date above to load the work progress details table.
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkProgressDetails;
