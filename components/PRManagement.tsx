'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeType } from '../types';
import {
  ClipboardCheck,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { prApprovalAPI } from '@/services/api';
import type { PrListRow } from '@/components/pr-approval/prApprovalTypes';
import {
  normalizePrListPayload,
  rowRequestNo,
  rowStatusLabel,
  rowProjectLabel,
  rowUuid,
  listRowMatchesSearch,
} from '@/components/pr-approval/prApprovalHelpers';

function rowDateDisplay(row: PrListRow): string {
  const raw = row.date ?? row.created_at ?? row.request_date ?? row.updated_at;
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return s.length > 16 ? s.slice(0, 16) : s;
}

function rowSubProjectLabel(row: PrListRow): string {
  const v = row.sub_project_name;
  if (v != null && String(v).trim()) return String(v).trim();
  return '—';
}

function rowUserName(row: PrListRow): string {
  const v = row.user_name;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return '—';
}

interface PurchaseRequest {
  key: string;
  numericId: number;
  requestNo: string;
  userName: string;
  project: string;
  subProject: string;
  date: string;
  statusLabel: string;
  raw: PrListRow;
}

function sortDateMs(pr: PurchaseRequest): number {
  const raw = pr.raw.date ?? pr.raw.created_at ?? pr.raw.request_date;
  if (raw == null || raw === '') return 0;
  const t = new Date(String(raw)).getTime();
  return Number.isFinite(t) ? t : 0;
}

interface PRManagementProps {
  theme: ThemeType;
}

function prRowToTable(row: PrListRow, index: number): PurchaseRequest {
  const idRaw = row.id;
  const numericId =
    typeof idRaw === 'number' && Number.isFinite(idRaw)
      ? idRaw
      : idRaw != null
        ? Number(idRaw)
        : index;
  const u = rowUuid(row);
  const key = u ?? (Number.isFinite(numericId) && numericId > 0 ? `mr-${numericId}` : `idx-${index}`);

  return {
    key,
    numericId: Number.isFinite(numericId) ? numericId : 0,
    requestNo: rowRequestNo(row),
    userName: rowUserName(row),
    project: rowProjectLabel(row),
    subProject: rowSubProjectLabel(row),
    date: rowDateDisplay(row),
    statusLabel: rowStatusLabel(row),
    raw: row,
  };
}

function statusTextClass(statusLabel: string, isDark: boolean): string {
  const l = statusLabel.toLowerCase();
  if (l === 'approved')
    return isDark ? 'text-emerald-400' : 'text-[#6B8E23]';
  if (l === 'rejected') return isDark ? 'text-rose-400' : 'text-red-600';
  if (l === 'pending') return isDark ? 'text-amber-300' : 'text-yellow-600';
  return '';
}

const PRManagement: React.FC<PRManagementProps> = ({ theme }) => {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [apiRows, setApiRows] = useState<PrListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await prApprovalAPI.list();
      setApiRows(normalizePrListPayload(raw));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load PR list';
      toast.showError(msg);
      setApiRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const tableRows = useMemo(
    () => apiRows.map((row, i) => prRowToTable(row, i)),
    [apiRows]
  );

  // Filter and sort PRs
  const filteredAndSortedPRs = useMemo(() => {
    const q = searchQuery.trim();
    let filtered = tableRows.filter((pr) => {
      if (!q) return true;
      if (listRowMatchesSearch(pr.raw, q)) return true;
      const n = q.toLowerCase();
      return pr.userName.toLowerCase().includes(n) || pr.subProject.toLowerCase().includes(n);
    });

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number = a[sortConfig.key as keyof PurchaseRequest] as string | number;
        let bValue: string | number = b[sortConfig.key as keyof PurchaseRequest] as string | number;

        if (sortConfig.key === 'numericId') {
          aValue = a.numericId;
          bValue = b.numericId;
        } else if (sortConfig.key === 'date') {
          aValue = sortDateMs(a);
          bValue = sortDateMs(b);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tableRows, searchQuery, sortConfig]);

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
      pr.subProject === '—' ? '' : pr.subProject,
      pr.date,
      pr.statusLabel
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

  const handleRequestNoClick = (pr: PurchaseRequest) => {
    const u = rowUuid(pr.raw);
    if (u) {
      router.push(`/pr-approval/${encodeURIComponent(u)}`);
      return;
    }
    toast.showInfo(`No detail link for ${pr.requestNo}`);
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
                  onClick={() => handleSort('numericId')}
                >
                  <div className="flex items-center gap-2">
                    #
                    {getSortIcon('numericId')}
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
                  onClick={() => handleSort('statusLabel')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('statusLabel')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${textSecondary}`}>
                    <Loader2 className="w-8 h-8 animate-spin inline text-[#6B8E23]" aria-hidden />
                    <span className="sr-only">Loading purchase requests</span>
                  </td>
                </tr>
              ) : paginatedPRs.length > 0 ? (
                paginatedPRs.map((pr, index) => (
                  <tr key={pr.key} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {startIndex + index + 1}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <button
                        type="button"
                        onClick={() => handleRequestNoClick(pr)}
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
                      {pr.subProject === '—' ? '-' : pr.subProject}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {pr.date}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <span className={statusTextClass(pr.statusLabel, isDark)}>
                        {pr.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${textSecondary}`}>
                    No purchase requests found.
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
