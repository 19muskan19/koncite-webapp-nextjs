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
  const [selectedProject, setSelectedProject] = useState<string>('Lakeshire');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('A wing');
  const [fromDate, setFromDate] = useState<string>('2021-12-26');
  const [toDate, setToDate] = useState<string>('2026-01-13');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableSubProjects, setAvailableSubProjects] = useState<Array<{ name: string; project: string }>>([]);
  
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
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lakeshire',
        'Demo Data',
        'Residential Complex A',
        'Commercial Tower B',
        'Infrastructure Project C',
        'Urban Development D'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectNames: string[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectNames = parsed.map((project: { name: string }) => project.name);
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      const allProjects = [...new Set([...defaultProjectNames, ...userProjectNames])];
      setAvailableProjects(allProjects);
    };

    loadProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', loadProjects);
    const interval = setInterval(loadProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', loadProjects);
      clearInterval(interval);
    };
  }, []);

  // Load subprojects from Subproject component (localStorage)
  useEffect(() => {
    const loadSubProjects = () => {
      const defaultSubProjects = [
        { name: 'A wing', project: 'Lakeshire' },
        { name: 'B wing', project: 'Lakeshire' },
        { name: 'Foundation Work', project: 'Residential Complex A' },
        { name: 'Structural Framework', project: 'Residential Complex A' },
        { name: 'Electrical Installation', project: 'Commercial Tower B' },
        { name: 'HVAC System', project: 'Commercial Tower B' },
      ];

      const savedSubProjects = localStorage.getItem('subprojects');
      let userSubProjects: Array<{ name: string; project: string }> = [];
      
      if (savedSubProjects) {
        try {
          const parsed = JSON.parse(savedSubProjects);
          userSubProjects = parsed.map((sub: { name: string; project: string }) => ({
            name: sub.name,
            project: sub.project
          }));
        } catch (e) {
          console.error('Error parsing subprojects:', e);
        }
      }

      const allSubProjects = [...defaultSubProjects, ...userSubProjects];
      setAvailableSubProjects(allSubProjects);
    };

    loadSubProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subprojects') {
        loadSubProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('subprojectsUpdated', loadSubProjects);
    const interval = setInterval(loadSubProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('subprojectsUpdated', loadSubProjects);
      clearInterval(interval);
    };
  }, []);

  // Filter subprojects by selected project
  const filteredSubProjects = useMemo(() => {
    return availableSubProjects.filter(sub => sub.project === selectedProject);
  }, [availableSubProjects, selectedProject]);

  // Update selected subproject when project changes
  useEffect(() => {
    if (filteredSubProjects.length > 0 && !filteredSubProjects.find(sub => sub.name === selectedSubProject)) {
      setSelectedSubProject(filteredSubProjects[0].name);
    } else if (filteredSubProjects.length === 0) {
      setSelectedSubProject('');
    }
  }, [selectedProject, filteredSubProjects]);

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
    const printContent = getPrintContent();
    
    // Create a hidden iframe for PDF download
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Wait for content to load, then automatically trigger print dialog for PDF save
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          // Trigger print dialog - user can select "Save as PDF" as destination
          iframe.contentWindow.print();
        }
        
        // Clean up iframe after print dialog is shown
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 500);
    }
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
              {availableProjects.map(project => (
                <option key={project} value={project}>{project}</option>
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
              {filteredSubProjects.map(sub => (
                <option key={sub.name} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
              <Calendar className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
              <Calendar className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons and Search */}
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

      {/* Work Progress Table */}
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
    </div>
  );
};

export default WorkProgressDetails;
