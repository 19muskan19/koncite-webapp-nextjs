'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../types';
import { 
  ClipboardCheck,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PurchaseRequest {
  id: string;
  requestNo: string;
  userName: string;
  project: string;
  subProject: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

interface PRManagementProps {
  theme: ThemeType;
}

const PRManagement: React.FC<PRManagementProps> = ({ theme }) => {
  const toast = useToast();
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

  // Default purchase request data matching the image
  const defaultPRs: PurchaseRequest[] = [
    { id: '1', requestNo: 'PR-2025-001', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-08-31', status: 'Approved' },
    { id: '2', requestNo: 'PR-2025-002', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-09-01', status: 'Approved' },
    { id: '3', requestNo: 'PR-2025-003', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-09-02', status: 'Approved' },
    { id: '4', requestNo: 'PR-2025-004', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-09-03', status: 'Approved' },
    { id: '5', requestNo: 'PR-2025-005', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-09-04', status: 'Approved' },
    { id: '6', requestNo: 'PR-2025-006', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-09-05', status: 'Approved' },
    { id: '7', requestNo: 'PR-2025-007', userName: 'Niharika', project: 'Lotus Rise', subProject: 'A wing', date: '2025-09-10', status: 'Approved' },
    { id: '8', requestNo: 'PR-2025-008', userName: 'Niharika', project: 'Lotus Rise', subProject: 'A wing', date: '2025-09-15', status: 'Approved' },
    { id: '9', requestNo: 'PR-2025-009', userName: 'Niharika', project: 'Lotus Rise', subProject: 'A wing', date: '2025-09-20', status: 'Approved' },
    { id: '10', requestNo: 'PR-2025-010', userName: 'Niharika', project: 'Lakeshire', subProject: 'A wing', date: '2025-10-01', status: 'Approved' },
    { id: '11', requestNo: 'PR-2025-011', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-10-05', status: 'Approved' },
    { id: '12', requestNo: 'PR-2025-012', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-10-10', status: 'Approved' },
    { id: '13', requestNo: 'PR-2025-013', userName: 'Niharika', project: 'Lotus Rise', subProject: 'A wing', date: '2025-10-15', status: 'Approved' },
    { id: '14', requestNo: 'PR-2025-014', userName: 'Niharika', project: 'Lakeshire', subProject: 'A wing', date: '2025-10-20', status: 'Approved' },
    { id: '15', requestNo: 'PR-2025-015', userName: 'Niharika', project: 'Demo Data', subProject: '', date: '2025-10-25', status: 'Approved' },
    { id: '16', requestNo: 'PR-2025-016', userName: 'Niharika', project: 'Lotus Rise', subProject: 'A wing', date: '2025-10-28', status: 'Approved' },
    { id: '17', requestNo: 'PR-2025-017', userName: 'Niharika', project: 'Lakeshire', subProject: 'A wing', date: '2025-10-31', status: 'Approved' },
  ];

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lakeshire',
        'Residential Complex A',
        'Commercial Tower B',
        'Infrastructure Project C',
        'Urban Development D',
        'Demo Data',
        'Lotus Rise'
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
        { name: 'A wing', project: 'Lotus Rise' },
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

  // Filter and sort PRs
  const filteredAndSortedPRs = useMemo(() => {
    let filtered = defaultPRs.filter(pr =>
      pr.requestNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.subProject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.date.includes(searchQuery)
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof PurchaseRequest];
        let bValue: any = b[sortConfig.key as keyof PurchaseRequest];

        if (sortConfig.key === 'date') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [defaultPRs, searchQuery, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPRs.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedPRs = filteredAndSortedPRs.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage]);

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

  const handleExportExcel = () => {
    const headers = ['#', 'Request No', 'User Name', 'Project', 'Sub-Project', 'Date', 'Status'];
    const rows = filteredAndSortedPRs.map((pr, index) => [
      (index + 1).toString(),
      pr.requestNo,
      pr.userName,
      pr.project,
      pr.subProject || '',
      pr.date,
      pr.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-requests-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.showSuccess('Excel file downloaded successfully');
  };

  const handleRequestNoClick = (requestNo: string) => {
    // Navigate to PR details page or open modal
    toast.showInfo(`Opening details for ${requestNo}`);
    // You can add navigation logic here
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <ClipboardCheck className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>PURCH REQUEST</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Purchase requisition management
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <label className={`text-sm font-bold ${textSecondary}`}>Show</label>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <label className={`text-sm font-bold ${textSecondary}`}>entries</label>
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
          >
            <Download className="w-4 h-4" /> Excel
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
              placeholder="Search..."
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
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-2">
                    #
                    {getSortIcon('id')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('requestNo')}
                >
                  <div className="flex items-center gap-2">
                    Request No
                    {getSortIcon('requestNo')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('userName')}
                >
                  <div className="flex items-center gap-2">
                    User Name
                    {getSortIcon('userName')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('project')}
                >
                  <div className="flex items-center gap-2">
                    Project
                    {getSortIcon('project')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('subProject')}
                >
                  <div className="flex items-center gap-2">
                    Sub-Project
                    {getSortIcon('subProject')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer`}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {paginatedPRs.length > 0 ? (
                paginatedPRs.map((pr, index) => (
                  <tr key={pr.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {startIndex + index + 1}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <button
                        onClick={() => handleRequestNoClick(pr.requestNo)}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        {pr.requestNo}
                      </button>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {pr.userName}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {pr.project}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {pr.subProject || '-'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {pr.date}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <span className={`${
                        pr.status === 'Approved' 
                          ? 'text-[#6B8E23]' 
                          : pr.status === 'Pending'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${textSecondary}`}>
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
            Showing {paginatedPRs.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredAndSortedPRs.length)} of {filteredAndSortedPRs.length} entries
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  currentPage === page
                    ? isDark 
                      ? 'bg-slate-700 text-white border border-slate-600' 
                      : 'bg-slate-200 text-slate-900 border border-slate-300'
                    : isDark 
                      ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-100' 
                      : 'bg-white hover:bg-slate-50 text-slate-900'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

export default PRManagement;
