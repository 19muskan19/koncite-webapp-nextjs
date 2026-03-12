'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight
} from 'lucide-react';
import DatePickerInput from '../ui/DatePickerInput';
import { useProjectsFromMasters, useSubprojectsFromMasters } from '../../hooks/useProjectsFromMasters';
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

const WorkProgressDetails: React.FC<WorkProgressDetailsProps> = ({ theme }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const projects = useProjectsFromMasters();
  const projIdForSub = projects.find((p) => String(p.id) === String(selectedProject))?.id ?? selectedProject;
  const subprojects = useSubprojectsFromMasters(projIdForSub || undefined);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default work progress data matching the image
  const defaultActivities: WorkProgressActivity[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      activities: 'Site cleaning',
      unit: 'Sqm',
      estimateQty: 1000,
      estRate: 150,
      estAmount: 150000.00,
      completedQty: 122.00,
      estAmountForCompletion: 18300.00,
      completionPercentage: 12.20,
      balanceQty: 878.00
    },
    {
      id: '2',
      slNo: 2,
      activities: 'RCC M20',
      unit: 'Cum',
      estimateQty: 110,
      estRate: 7500,
      estAmount: 825000.00,
      completedQty: 2.00,
      estAmountForCompletion: 15000.00,
      completionPercentage: 1.82,
      balanceQty: 108.00
    },
    {
      id: '3',
      slNo: 3,
      activities: 'Exacavation',
      unit: 'Cum',
      estimateQty: 150,
      estRate: 200,
      estAmount: 30000.00,
      completedQty: 125.00,
      estAmountForCompletion: 25000.00,
      completionPercentage: 83.33,
      balanceQty: 25.00
    },
    {
      id: '4',
      slNo: 4,
      activities: 'PCC M15',
      unit: 'Cum',
      estimateQty: 250,
      estRate: 5000,
      estAmount: 1250000.00,
      completedQty: 120.00,
      estAmountForCompletion: 600000.00,
      completionPercentage: 48.00,
      balanceQty: 130.00
    },
  ], []);

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    if (!selectedProject) setSelectedSubProject('');
  }, [selectedProject]);

  // Required filters for loading table: project, fromDate, toDate
  const filtersReady = Boolean(selectedProject && fromDate && toDate);

  // Filter and sort activities
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = defaultActivities.filter(activity =>
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
  }, [defaultActivities, searchQuery, sortConfig]);

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
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExport = (format: string) => {
    // Simple export functionality
    const headers = ['Sl.no', 'Activities', 'Unit', 'Estimate Qty', 'Est Rate', 'Est. Amount', 'Completed Qty', 'Est. Amount for Completion', '% Completion', 'Balance qty'];
    const rows = filteredAndSortedActivities.map(activity => [
      activity.slNo,
      activity.activities,
      activity.unit,
      activity.estimateQty,
      activity.estRate,
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
                  <td class="text-right">${activity.estimateQty}</td>
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

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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
      String(a.estimateQty),
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
      headStyles: { fillColor: [240, 240, 240] },
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
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Sub Project
            </label>
            <select
              value={selectedSubProject}
              onChange={(e) => setSelectedSubProject(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            >
              <option value="">Select Sub Project</option>
              {subprojects.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
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
                    {activity.estimateQty}
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
