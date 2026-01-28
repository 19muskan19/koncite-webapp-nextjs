'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  Package,
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
  Building2,
  Layers,
  Warehouse,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';

interface MaterialUsedVsStoreIssueProps {
  theme: ThemeType;
}

interface MaterialData {
  id: string;
  code: string;
  machineryNames: string;
  specification: string;
  unit: string;
  issueQty: number;
  dprQty: number;
  variation: number;
}

const MaterialUsedVsStoreIssue: React.FC<MaterialUsedVsStoreIssueProps> = ({ theme }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableSubProjects, setAvailableSubProjects] = useState<Array<{ name: string; project: string }>>([]);
  const [materialsData, setMaterialsData] = useState<MaterialData[]>([]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default stores list
  const storesList = ['Main Store', 'Sub Store 1', 'Sub Store 2', 'Warehouse A', 'Warehouse B'];

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lakeshire',
        'Demo Data',
        'Lotus Rise',
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
    if (!selectedProject) {
      setSelectedSubProject('');
      return;
    }
    if (filteredSubProjects.length > 0 && !filteredSubProjects.find(sub => sub.name === selectedSubProject)) {
      setSelectedSubProject(filteredSubProjects[0].name);
    } else if (filteredSubProjects.length === 0) {
      setSelectedSubProject('');
    }
  }, [selectedProject, filteredSubProjects, selectedSubProject]);

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = materialsData.filter(item =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.machineryNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof MaterialData];
        const bValue = b[sortConfig.key as keyof MaterialData];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [materialsData, searchQuery, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / entriesPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredAndSortedData, currentPage, entriesPerPage]);

  const handleExport = (format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}`);
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <div className="flex flex-col">
          <ChevronUp className="w-3 h-3 opacity-30" />
          <ChevronDown className="w-3 h-3 opacity-30 -mt-1" />
        </div>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-500/10' : 'bg-purple-500/5'}`}>
            <Package className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Material Used vs Store Issue</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Compare material usage with store issue records
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                <option value="">---select project---</option>
                {availableProjects.length > 0 && (
                  availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))
                )}
              </select>
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Sub Project
            </label>
            <div className="relative">
              <Layers className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <select
                value={selectedSubProject}
                onChange={(e) => setSelectedSubProject(e.target.value)}
                disabled={!selectedProject}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Sub Project</option>
                {filteredSubProjects.length > 0 ? (
                  filteredSubProjects.map(sub => (
                    <option key={sub.name} value={sub.name}>{sub.name}</option>
                  ))
                ) : (
                  <option value="" disabled>No subprojects available</option>
                )}
              </select>
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Stores
            </label>
            <div className="relative">
              <Warehouse className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                <option value="">Select Store</option>
                {storesList.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
              <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select From Date:
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select To Date:
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
            </div>
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className={`text-sm font-bold ${textSecondary}`}>Search:</label>
          <div className="relative flex-1 sm:flex-initial">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={`rounded-xl border ${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th
                  className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-2">
                    Code
                    {getSortIcon('code')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('machineryNames')}
                >
                  <div className="flex items-center gap-2">
                    Machinery Names
                    {getSortIcon('machineryNames')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('specification')}
                >
                  <div className="flex items-center gap-2">
                    Specification
                    {getSortIcon('specification')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('unit')}
                >
                  <div className="flex items-center gap-2">
                    Unit
                    {getSortIcon('unit')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('issueQty')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Issue Qty
                    {getSortIcon('issueQty')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('dprQty')}
                >
                  <div className="flex items-center justify-end gap-2">
                    DPR Qty
                    {getSortIcon('dprQty')}
                  </div>
                </th>
                <th
                  className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:bg-slate-700/50 transition-colors`}
                  onClick={() => handleSort('variation')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Variation
                    {getSortIcon('variation')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className={`hover:${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{item.code}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{item.machineryNames}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{item.specification}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{item.unit}</td>
                    <td className={`px-4 py-3 text-sm text-right ${textPrimary}`}>{item.issueQty.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right ${textPrimary}`}>{item.dprQty.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right ${textPrimary}`}>{item.variation.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-4 py-12 text-center ${textSecondary}`}>
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`text-sm ${textSecondary}`}>
            Showing {paginatedData.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'} border ${isDark ? 'border-slate-700' : 'border-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold ${textPrimary}`}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'} border ${isDark ? 'border-slate-700' : 'border-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialUsedVsStoreIssue;
