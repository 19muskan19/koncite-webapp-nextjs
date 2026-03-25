'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Package, MoreVertical, Search, ArrowUpDown, Download, Plus, Loader2, Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CreateUnitModal from './Modals/CreateUnitModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface UnitsProps {
  theme: ThemeType;
}

interface Unit {
  id: string; // For display/UI purposes (UUID or string)
  numericId?: number | string; // Original numeric ID from database for API calls
  uuid?: string; // UUID if available
  name: string;
  unit?: string; // API field name
  code?: string;
  conversion?: string;
  unit_coversion?: string; // API field name (note: typo in API)
  factor?: string;
  unit_coversion_factor?: string; // API field name (note: typo in API)
  status?: 'Active' | 'Inactive';
  is_active?: number; // API field (1 = active, 0 = inactive)
}

/**
 * Laravel `edit` / `delete` use `where('id', $param)` despite the route name — value must be numeric PK.
 */
function unitPkForIdRoute(u: Pick<Unit, 'numericId' | 'id'>): string | null {
  if (u.numericId != null && String(u.numericId).trim() !== '') {
    const n = Number(u.numericId);
    if (!Number.isNaN(n) && n > 0) return String(n);
  }
  const raw = String(u.id ?? '').trim();
  if (/^\d+$/.test(raw)) return raw;
  return null;
}

/** Rows for the edit modal from table data (always available); works even if GET /unit-edit fails. */
function buildEditingRowsFromGroup(group: Unit[]) {
  return group.map((u) => ({
    numericId: u.numericId ?? unitPkForIdRoute(u) ?? undefined,
    uuid: u.uuid,
    unit: u.unit || u.name || '',
    unit_coversion: u.unit_coversion || u.conversion || '',
    unit_coversion_factor: u.unit_coversion_factor || u.factor || '',
  }));
}

const Units: React.FC<UnitsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUnitRows, setEditingUnitRows] = useState<
    Array<{ numericId?: number | string; uuid?: string; unit: string; unit_coversion?: string; unit_coversion_factor?: string }>
  | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null); // Track which unit is being toggled
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [editingUnitLoading, setEditingUnitLoading] = useState<boolean>(false);

  // Fetch units from API
  const fetchUnits = async () => {
    if (!isAuthenticated) {
      console.warn('⚠️ Not authenticated, skipping units fetch');
      setUnits([]);
      setIsLoadingUnits(false);
      return;
    }
    
    // Verify token is available (check cookies first, then localStorage)
    const { getCookie } = require('../../utils/cookies');
    const token = typeof window !== 'undefined' 
      ? (getCookie('auth_token') || localStorage.getItem('auth_token'))
      : null;
    console.log('🔐 Fetching units - Auth token present:', !!token);
    
    setIsLoadingUnits(true);
    setUnitsError(null);
    try {
      const fetchedUnits = await masterDataAPI.getUnits();
      console.log('📦 Fetched units from API:', fetchedUnits);
      console.log('📦 Total units received:', fetchedUnits.length);
      
      // Transform API response to match Unit interface
      // API returns: { id: 1432, uuid: "78f5bc1f-...", unit: "cft", ... }
      const transformedUnits: Unit[] = fetchedUnits.map((unit: any) => {
        const numericId = unit.id ?? unit.unit_id ?? unit.units_id;
        const uuid = unit.uuid;
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // IMPORTANT: Only default to Active if is_active is truly undefined/null
        // If API explicitly returns 0 or false, respect that (unit is inactive)
        // If API returns 1, "1", true, or "true", unit is active
        const isActiveValue = unit.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default new units to active
                        isActiveValue === null; // Default new units to active
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store original numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: unit.unit || unit.name || '',
          unit: unit.unit || unit.name || '',
          code: unit.code || unit.unit || unit.name || '',
          conversion: unit.unit_coversion || unit.conversion || '',
          unit_coversion: unit.unit_coversion || unit.conversion || '',
          factor: unit.unit_coversion_factor || unit.factor || '',
          unit_coversion_factor: unit.unit_coversion_factor || unit.factor || '',
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
        };
      });
      
      console.log('✅ Transformed units:', transformedUnits);
      console.log('✅ Setting units state with', transformedUnits.length, 'units');
      
      // Log is_active values for debugging
      transformedUnits.forEach((u, idx) => {
        console.log(`Unit ${idx + 1} (${u.name}):`, {
          is_active_raw: fetchedUnits[idx]?.is_active,
          is_active_type: typeof fetchedUnits[idx]?.is_active,
          is_active_transformed: u.is_active,
          status: u.status
        });
      });
      
      setUnits(transformedUnits);
    } catch (err: any) {
      console.error('❌ Failed to fetch units:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        response: err.response?.data
      });
      setUnitsError(err.message || 'Failed to load units');
      setUnits([]);
      toast.showError(err.message || 'Failed to load units');
    } finally {
      setIsLoadingUnits(false);
    }
  };

  // Load units from API on mount and when auth changes (single source for initial load)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Debounced search - only runs when user types, NOT on initial mount (avoids duplicate fetch)
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip on mount - auth effect already fetches
    }
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchUnits(); // User cleared search - refetch all
      }
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Search units using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all units
      await fetchUnits();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchUnits(query);
      // Transform API response to match Unit interface
      const transformedUnits: Unit[] = searchResults.map((unit: any) => {
        const numericId = unit.id ?? unit.unit_id ?? unit.units_id;
        const uuid = unit.uuid;
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        const isActiveValue = unit.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined ||
                        isActiveValue === null;
        
        return {
          id: uuid || String(numericId),
          numericId: numericId,
          uuid: uuid,
          name: unit.unit || unit.name || '',
          unit: unit.unit || unit.name || '',
          code: unit.code || unit.unit || unit.name || '',
          conversion: unit.unit_coversion || unit.conversion || '',
          unit_coversion: unit.unit_coversion || unit.conversion || '',
          factor: unit.unit_coversion_factor || unit.factor || '',
          unit_coversion_factor: unit.unit_coversion_factor || unit.factor || '',
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
        };
      });
      setUnits(transformedUnits);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.showError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleEditUnit = async (group: Unit[]) => {
    const firstUnit = group[0];
    const unitPk = unitPkForIdRoute(firstUnit);

    // Open modal immediately with list row(s) so fields are never blank; GET only refines row 1.
    const rowsFromList = buildEditingRowsFromGroup(group);
    setEditingUnitRows(rowsFromList);
    setShowCreateModal(true);

    if (!unitPk) {
      toast.showWarning(
        'Could not resolve numeric id for this unit. Fields are from the list only — refresh if data looks wrong.'
      );
      return;
    }

    setEditingUnitLoading(true);
    try {
      // GET /unit-edit/{id} — id in URL path (no body). Backend uses where('id', $id).
      const apiData = await masterDataAPI.getUnit(unitPk);

      const firstRow = {
        numericId: apiData.id ?? firstUnit.numericId ?? unitPkForIdRoute(firstUnit) ?? undefined,
        uuid: apiData.uuid ?? firstUnit.uuid,
        unit: apiData.unit ?? apiData.name ?? firstUnit.unit ?? firstUnit.name ?? '',
        unit_coversion: apiData.unit_coversion ?? apiData.conversion ?? '',
        unit_coversion_factor: apiData.unit_coversion_factor ?? apiData.factor ?? ''
      };

      const restRows = group.slice(1).map((u) => ({
        numericId: u.numericId ?? unitPkForIdRoute(u) ?? undefined,
        uuid: u.uuid,
        unit: u.unit || u.name || '',
        unit_coversion: u.unit_coversion || u.conversion || '',
        unit_coversion_factor: u.unit_coversion_factor || u.factor || ''
      }));

      setEditingUnitRows([firstRow, ...restRows]);
    } catch (error: any) {
      console.error('Failed to fetch unit for edit:', error);
      toast.showError(
        error?.message ||
          'Could not load latest unit from server. You can still edit using the values shown from the list.'
      );
    } finally {
      setEditingUnitLoading(false);
    }
  };

  const handleDeleteUnit = async (group: Unit[]) => {
    if (!window.confirm(`Are you sure you want to delete this unit${group.length > 1 ? ' and all its conversions' : ''}?`)) return;
    try {
      for (const u of group) {
        const deleteId = unitPkForIdRoute(u);
        if (!deleteId) continue;
        await masterDataAPI.deleteUnit(deleteId);
      }
      toast.showSuccess('Unit deleted successfully');
      await fetchUnits();
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Failed to delete unit:', error);
      toast.showError(error.message || 'Failed to delete unit');
    }
  };

  const handleToggleStatus = async (group: Unit[]) => {
    const firstUnit = group[0];
    const groupKey = group.map((u) => u.id).join(',');
    if (togglingUnitId === groupKey) return;
    if (isLoadingUnits) return;

    const currentStatus = firstUnit.status || (firstUnit.is_active === 1 ? 'Active' : 'Inactive');
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const isActive = newStatus === 'Active' ? 1 : 0;

    try {
      setTogglingUnitId(groupKey);
      const groupIds = new Set(group.map((u) => u.id));
      setUnits((prev) =>
        prev.map((u) => (groupIds.has(u.id) ? { ...u, status: newStatus, is_active: isActive } : u))
      );
      if (newStatus === 'Inactive') setOpenDropdownId(null);
      for (const u of group) {
        const unitUuid = u.uuid || u.id;
        if (unitUuid) await masterDataAPI.updateUnitStatus(unitUuid, isActive as 0 | 1);
      }
      toast.showSuccess(`Unit ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      setUnits((prev) =>
        prev.map((u) => (group.some((g) => g.id === u.id) ? { ...u, status: firstUnit.status, is_active: firstUnit.is_active } : u))
      );
      toast.showError(error.message || 'Failed to update unit status');
    } finally {
      setTogglingUnitId(null);
    }
  };

  const handleUnitCreated = async () => {
    // Refresh units list after create/update
    await fetchUnits();
  };

  const handleDeleteAllUnits = async () => {
    if (units.length === 0) {
      toast.showWarning('No units to delete.');
      setDeleteAllConfirm(false);
      return;
    }
    setIsDeletingAll(true);
    setDeleteAllConfirm(false);
    let deleted = 0;
    let failed = 0;
    try {
      for (const unit of units) {
        const deleteId = unitPkForIdRoute(unit);
        if (!deleteId) {
          failed++;
          continue;
        }
        try {
          await masterDataAPI.deleteUnit(deleteId);
          deleted++;
        } catch (err) {
          failed++;
          console.error('Failed to delete unit:', unit.name || unit.unit, err);
        }
      }
      await fetchUnits();
      if (deleted > 0) {
        toast.showSuccess(`Deleted ${deleted} unit${deleted !== 1 ? 's' : ''}.`);
      }
      if (failed > 0) {
        toast.showError(`Failed to delete ${failed} unit${failed !== 1 ? 's' : ''}.`);
      }
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter units (client-side filtering is optional since we're using API search)
  const filteredUnits = useMemo(() => {
    let filtered = [...units];
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(unit =>
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (unit.code && unit.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (unit.conversion && unit.conversion.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  }, [units, searchQuery, isSearching]);

  // Group units by base unit name - one row per unit, conversions accessible via Edit
  const groupedUnits = useMemo(() => {
    const groups = new Map<string, Unit[]>();
    for (const u of filteredUnits) {
      const key = (u.unit || u.name || '').trim().toLowerCase() || '__empty__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(u);
    }
    return Array.from(groups.values());
  }, [filteredUnits]);

  // Pagination - over grouped rows
  const totalPages = Math.max(1, Math.ceil(groupedUnits.length / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, groupedUnits.length);
  const paginatedGroups = groupedUnits.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage]);

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Code', 'Unit', 'Unit Conversion', 'Unit Conversion Factor', 'Status'];
    const rows = filteredUnits.map((unit, idx) => [
      idx + 1,
      unit.code || '',
      unit.name || unit.unit || '',
      unit.conversion || '',
      unit.factor || '',
      unit.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Units');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `units_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Units</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage measurement units and conversions
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <button 
            onClick={handleDownloadExcel}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={async () => {
              console.log('🔄 Manual refresh triggered');
              setSearchQuery('');
              await fetchUnits();
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Refresh Units List"
          >
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => setDeleteAllConfirm(true)}
            disabled={units.length === 0 || isDeletingAll}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark ? 'bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-700' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
            } shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Delete all units"
          >
            {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDeletingAll ? 'Deleting...' : 'Delete All'}</span>
          </button>
          <button 
            onClick={() => {
              setEditingUnitRows(null);
              setShowCreateModal(true);
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{groupedUnits.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{groupedUnits.filter((g) => g[0]?.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 min-w-0 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by unit name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C2D642]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingUnits && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Units...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your units</p>
        </div>
      )}

      {/* Error State */}
      {unitsError && !isLoadingUnits && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Package className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Units</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{unitsError}</p>
          <button
            onClick={fetchUnits}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Units Table - grouped by unit name, columns: Sr No, Unit, Status, Action */}
      {!isLoadingUnits && !unitsError && groupedUnits.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto pl-1 pr-2 pt-1 pb-6">
            <table className="w-full min-w-[320px]">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sr No</th>
                  <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-4 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} min-w-[80px] w-[80px]`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedGroups.map((group, rowIdx) => {
                  const first = group[0];
                  const groupKey = group.map((u) => u.id).join(',');
                  const isInactive = first?.status === 'Inactive';
                  return (
                  <tr 
                    key={groupKey} 
                    className={`${
                      isInactive 
                        ? isDark ? 'opacity-50 bg-slate-800/20' : 'opacity-50 bg-slate-50/50'
                        : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'
                    } transition-colors`}
                  >
                    <td className={`px-4 py-4 text-sm font-bold ${isInactive ? textSecondary : textPrimary}`}>
                      {(currentPage - 1) * entriesPerPage + rowIdx + 1}
                    </td>
                    <td className={`px-4 py-4 text-sm font-bold ${isInactive ? textSecondary : textPrimary}`}>
                      {first?.name || first?.unit || '—'}
                      {isInactive && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-4 py-4`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleStatus(group);
                        }}
                        disabled={isLoadingUnits || togglingUnitId === groupKey}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 focus:ring-offset-2 ${
                          first?.status === 'Active'
                            ? 'bg-green-600'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        } ${(isLoadingUnits || togglingUnitId === groupKey) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={first?.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            first?.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right min-w-[80px] w-[80px]">
                      <div className="relative inline-flex justify-end">
                        <button 
                          onClick={(e) => {
                            if (isInactive) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === groupKey ? null : groupKey);
                          }}
                          disabled={isInactive}
                          className={`dropdown-trigger p-2.5 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700/60 hover:bg-slate-600/80 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} transition-colors ${isInactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isInactive ? 'Activate unit to enable actions' : 'Actions'}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdownId === groupKey && !isInactive && (
                          <div className={`dropdown-menu absolute right-0 w-36 rounded-lg border shadow-xl z-[100] ${rowIdx === paginatedGroups.length - 1 ? 'bottom-full mb-1' : 'top-full mt-1'} ${isDark ? 'bg-dropdown-panel border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  await handleEditUnit(group);
                                }}
                                disabled={editingUnitLoading}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                                } ${editingUnitLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {editingUnitLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Edit className="w-4 h-4" />
                                )}
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteUnit(group);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-50 text-red-600'
                                } cursor-pointer`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Bar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  currentPage <= 1
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  currentPage <= 1
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className={`px-3 py-1.5 rounded text-sm font-bold border appearance-none cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
                title="Current page"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage >= totalPages
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage >= totalPages
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <div className={`h-6 w-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <span className={`text-sm ${textSecondary}`}>Number of rows:</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded text-sm font-bold border appearance-none cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
            <span className={`text-sm ${textSecondary}`}>
              Page {currentPage} of {totalPages} ({groupedUnits.length} total)
            </span>
          </div>
        </div>
      ) : !isLoadingUnits && !unitsError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Package className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Units Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No units found matching "${searchQuery}"` 
              : 'Start by adding your first unit entry'}
          </p>
        </div>
      ) : null}

      {/* Delete All Units Confirmation Modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${cardClass} rounded-xl border w-full max-w-lg p-6 shadow-xl`}>
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Confirm Delete All</h3>
            <p className={`text-sm ${textSecondary} mb-6`}>
              Are you sure you want to delete all <span className={`font-bold ${textPrimary}`}>{units.length}</span> unit{units.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllUnits}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 hover:bg-red-700 text-white"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Unit Modal */}
      <CreateUnitModal
        key={
          editingUnitRows?.length
            ? `edit-${editingUnitRows.map((r, i) => r.numericId ?? r.uuid ?? `r${i}`).join('-')}`
            : 'create'
        }
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingUnitRows(null);
        }}
        onSuccess={handleUnitCreated}
        editingUnitRows={editingUnitRows}
        existingUnits={units}
      />
    </div>
  );
};

export default Units;
