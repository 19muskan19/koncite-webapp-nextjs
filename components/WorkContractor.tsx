'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../types';
import { 
  Briefcase,
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
import { useToast } from '../contexts/ToastContext';

interface WorkContractorActivity {
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

interface WorkContractorProps {
  theme: ThemeType;
}

const WorkContractor: React.FC<WorkContractorProps> = ({ theme }) => {
  const toast = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('Lakeshire');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('A wing');
  const [selectedContractor, setSelectedContractor] = useState<string>('A wing');
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
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default work contractor data
  const defaultActivities: WorkContractorActivity[] = [
    // Sample data - can be replaced with actual data
  ];

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lakeshire',
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

  // Load subprojects from localStorage
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
        let aValue: any = a[sortConfig.key as keyof WorkContractorActivity];
        let bValue: any = b[sortConfig.key as keyof WorkContractorActivity];

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
  }, [searchQuery, selectedProject, selectedSubProject, selectedContractor]);

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
    const headers = ['Sl.no', 'Activities', 'Unit', 'Estimate Qty', 'Est Rate', 'Est. Amount', 'Completed Qty', 'Est. Amount for Completion', '% Completion', 'Balance qty'];
    const rows = filteredAndSortedActivities.map(activity => [
      activity.slNo.toString(),
      activity.activities,
      activity.unit,
      activity.estimateQty.toString(),
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
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: format === 'CSV' 
          ? 'text/csv;charset=utf-8;' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // For Excel, use .csv extension but Excel will open it correctly due to BOM
      a.download = `work-contractor-${selectedProject}-${new Date().toISOString().split('T')[0]}.${format === 'CSV' ? 'csv' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.showSuccess(`${format} file downloaded successfully`);
    } else if (format === 'Copy') {
      const text = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');
      navigator.clipboard.writeText(text).then(() => {
        toast.showSuccess('Data copied to clipboard!');
      }).catch(() => {
        toast.showError('Failed to copy data');
      });
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
          <title>Work Contractor Report</title>
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
            <div class="title">Work Contractor Report</div>
            <div class="info">
              <p><strong>Project:</strong> ${selectedProject}</p>
              <p><strong>Sub Project:</strong> ${selectedSubProject || 'N/A'}</p>
              <p><strong>Contractor:</strong> ${selectedContractor || 'N/A'}</p>
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(getPrintContent());
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownloadPDF = () => {
    // For PDF, we'll use the print functionality and let user save as PDF
    // In a real implementation, you might want to use a library like jsPDF or pdfmake
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(getPrintContent());
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast.showInfo('Use the print dialog to save as PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Briefcase className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Work Contractor</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage contractors and their work assignments
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${cardClass}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              Select From Date:
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
              Select To Date:
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
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Contractor
            </label>
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            >
              <option value="A wing">A wing</option>
              <option value="B wing">B wing</option>
              <option value="Contractor 1">Contractor 1</option>
              <option value="Contractor 2">Contractor 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons and Search */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border ${cardClass}`}>
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
        <div className="flex items-center gap-2">
          <label className={`text-sm font-bold ${textSecondary}`}>Search:</label>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className={`pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('slNo')}
                >
                  <div className="flex items-center gap-2">
                    Sl.no
                    {getSortIcon('slNo')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('activities')}
                >
                  <div className="flex items-center gap-2">
                    Activities
                    {getSortIcon('activities')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('unit')}
                >
                  <div className="flex items-center gap-2">
                    Unit
                    {getSortIcon('unit')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('estimateQty')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Estimate Qty
                    {getSortIcon('estimateQty')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('estRate')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Est Rate
                    {getSortIcon('estRate')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('estAmount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Est. Amount
                    {getSortIcon('estAmount')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('completedQty')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Completed Qty
                    {getSortIcon('completedQty')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('estAmountForCompletion')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Est. Amount for Completion
                    {getSortIcon('estAmountForCompletion')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('completionPercentage')}
                >
                  <div className="flex items-center justify-end gap-2">
                    % Completion
                    {getSortIcon('completionPercentage')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('balanceQty')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Balance qty
                    {getSortIcon('balanceQty')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {paginatedActivities.length > 0 ? (
                paginatedActivities.map((activity) => (
                  <tr key={activity.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {activity.slNo}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {activity.activities}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {activity.unit}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {activity.estimateQty}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.estRate)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.estAmount)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.completedQty)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.estAmountForCompletion)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.completionPercentage)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${textPrimary}`}>
                      {formatNumber(activity.balanceQty)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className={`px-6 py-12 text-center ${textSecondary}`}>
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={`p-4 border-t border-inherit flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className={`text-sm font-bold ${textSecondary}`}>
            Showing {paginatedActivities.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredAndSortedActivities.length)} of {filteredAndSortedActivities.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                currentPage === 1
                  ? isDark ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              Previous
            </button>
            <span className={`text-sm font-bold ${textPrimary}`}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                currentPage === totalPages || totalPages === 0
                  ? isDark ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkContractor;
