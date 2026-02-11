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

const Units: React.FC<UnitsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null); // UUID for GET /unit-edit/{uuid}
  const [editingUnitNumericId, setEditingUnitNumericId] = useState<string | number | null>(null); // Numeric ID for POST /unit-add with updateId
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null); // Track which unit is being toggled
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
        const numericId = unit.id; // This is the numeric ID from database (e.g., 1432)
        const uuid = unit.uuid; // UUID if available
        
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

  // Load units from API on mount and when auth changes
  useEffect(() => {
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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
        const numericId = unit.id; // Numeric ID from database
        const uuid = unit.uuid; // UUID if available
        
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
          id: uuid || String(numericId), // Use UUID for display if available
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
      setUnits(transformedUnits);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.showError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchUnits();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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

  const handleEditUnit = async (unit: Unit) => {
    try {
      // Backend edit() uses where('id', $uuid) - expects numeric ID in URL, despite route param name
      const unitIdForApi = unit.numericId ?? unit.id;
      const numericId = unit.numericId ?? unit.id;
      
      if (unitIdForApi == null || unitIdForApi === '') {
        toast.showError('Invalid unit ID. Cannot edit unit.');
        return;
      }
      
      console.log('📝 Editing unit:', {
        idForApi: unitIdForApi,
        numericId,
        type: typeof unitIdForApi
      });
      
      // Fetch full unit details - GET /unit-edit/{id} (backend queries by numeric id)
      const unitDetails = await masterDataAPI.getUnit(String(unitIdForApi));
      console.log('✅ Unit details fetched:', unitDetails);
      
      setEditingUnitId(String(unitIdForApi)); // Pass numeric ID - modal's getUnit expects it
      setEditingUnitNumericId(numericId);
      
      // Open modal with unit data - CreateUnitModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch unit details:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      toast.showError(error.message || 'Failed to load unit details');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    // Find the unit to get its numeric ID
    // Backend delete() uses where('id', $uuid) so it expects numeric ID, not UUID
    const unit = units.find(u => u.id === unitId);
    const deleteId = unit?.numericId || unitId; // Use numeric ID
    
    console.log('🗑️ Deleting unit:', {
      unitId: unitId,
      numericId: unit?.numericId,
      uuid: unit?.uuid,
      usingId: deleteId
    });
    
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        // Backend expects numeric ID
        await masterDataAPI.deleteUnit(String(deleteId));
        toast.showSuccess('Unit deleted successfully');
        // Refresh units list
        await fetchUnits();
        setDeleteConfirmId(null);
      } catch (error: any) {
        console.error('Failed to delete unit:', error);
        toast.showError(error.message || 'Failed to delete unit');
      }
    }
  };

  const handleToggleStatus = async (unit: Unit) => {
    console.log('🔄 handleToggleStatus called with unit:', {
      id: unit.id,
      name: unit.name || unit.unit,
      status: unit.status,
      is_active: unit.is_active,
      togglingUnitId: togglingUnitId,
      isLoadingUnits: isLoadingUnits
    });
    
    // Prevent multiple simultaneous toggles
    if (togglingUnitId === unit.id) {
      console.log('⏳ Toggle already in progress for this unit');
      return;
    }

    if (isLoadingUnits) {
      console.log('⏳ Units are loading, cannot toggle');
      return;
    }

    try {
      setTogglingUnitId(unit.id);
      
      // Determine current status - check both status field and is_active field
      const currentStatus = unit.status || (unit.is_active === 1 ? 'Active' : 'Inactive');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const isActive = newStatus === 'Active' ? 1 : 0;
      
      console.log('🔄 Status toggle calculation:', {
        currentStatus: currentStatus,
        currentIsActive: unit.is_active,
        newStatus: newStatus,
        newIsActive: isActive
      });
      
      // Backend unit-edit/{uuid} uses where('id', $uuid) - expects numeric ID
      const unitIdForApi = unit.numericId ?? unit.id;
      const numericId = unit.numericId ?? unit.id;
      
      console.log('🔄 Toggling unit status:', {
        unitId: unit.id,
        numericId,
        currentStatus: unit.status,
        currentIsActive: unit.is_active,
        newStatus: newStatus,
        newIsActive: isActive
      });

      // First, fetch current unit data - GET /unit-edit/{id} (backend queries by numeric id)
      let currentUnitData;
      try {
        console.log('📖 Fetching current unit data via unit-edit');
        currentUnitData = await masterDataAPI.getUnit(String(unitIdForApi));
        console.log('✅ Current unit data:', currentUnitData);
      } catch (fetchError: any) {
        console.warn('⚠️ Failed to fetch unit data, using existing data:', fetchError);
        // Fallback to existing unit data if fetch fails
        currentUnitData = {
          unit: unit.unit || unit.name,
          unit_coversion: unit.unit_coversion || unit.conversion || '',
          unit_coversion_factor: unit.unit_coversion_factor || unit.factor || '',
          is_active: unit.is_active
        };
      }

      // Optimistically update UI immediately
      setUnits(prevUnits => 
        prevUnits.map(u => 
          u.id === unit.id 
            ? { ...u, status: newStatus, is_active: isActive }
            : u
        )
      );

      // Update unit status using updateUnit API
      // Backend POST /unit-add with updateId expects numeric ID (where('id', $updateId))
      // Include is_active in the update payload to persist status change
      const updatePayload = {
        unit: currentUnitData.unit || unit.unit || unit.name,
        unit_coversion: currentUnitData.unit_coversion || unit.unit_coversion || unit.conversion || '',
        unit_coversion_factor: currentUnitData.unit_coversion_factor || unit.unit_coversion_factor || unit.factor || '',
        is_active: isActive // Explicitly set the new status (1 = Active, 0 = Inactive/Disabled)
      };

      console.log('📝 Updating unit status:', {
        unitName: unit.name || unit.unit,
        currentStatus: unit.status,
        currentIsActive: unit.is_active,
        newStatus: newStatus,
        newIsActive: isActive,
        payload: updatePayload
      });
      console.log('📝 Full update payload:', JSON.stringify(updatePayload, null, 2));
      
      const response = await masterDataAPI.updateUnit(String(numericId), updatePayload);

      console.log('✅ Unit status update response:', response);
      console.log('✅ Full response:', JSON.stringify(response, null, 2));

      // Refresh the units list to get the latest data from database
      console.log('🔄 Refreshing units list to sync with database...');
      await fetchUnits();

      toast.showSuccess(`Unit ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      console.error('❌ Failed to toggle unit status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      
      // Revert optimistic update on error
      setUnits(prevUnits => 
        prevUnits.map(u => 
          u.id === unit.id 
            ? { ...u, status: unit.status, is_active: unit.is_active }
            : u
        )
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

  // Filter units (client-side filtering is optional since we're using API search)
  const filteredUnits = useMemo(() => {
    let filtered = [...units];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(unit =>
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (unit.code && unit.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (unit.conversion && unit.conversion.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [units, searchQuery, isSearching]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, filteredUnits.length);
  const paginatedUnits = filteredUnits.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage]);

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Unit', 'Unit Conversion', 'Unit Conversion Factor', 'Status'];
    const rows = filteredUnits.map((unit, idx) => [
      idx + 1,
      unit.name,
      unit.conversion,
      unit.factor,
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
            onClick={() => setShowCreateModal(true)}
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
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredUnits.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredUnits.filter(u => u.status === 'Active').length}</p>
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

      {/* Units Table */}
      {!isLoadingUnits && !unitsError && filteredUnits.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit Conversion
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit Conversion Factor
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Status
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center justify-end gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Action
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedUnits.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className={`${
                      row.status === 'Inactive' 
                        ? isDark 
                          ? 'opacity-50 bg-slate-800/20' 
                          : 'opacity-50 bg-slate-50/50'
                        : isDark 
                          ? 'hover:bg-slate-800/30' 
                          : 'hover:bg-slate-50/50'
                    } transition-colors`}
                  >
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name || row.unit || ''}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.conversion || row.unit_coversion || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.factor || row.unit_coversion_factor || '-'}</td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔄 Toggle button clicked for unit:', {
                            id: row.id,
                            name: row.name || row.unit,
                            currentStatus: row.status,
                            currentIsActive: row.is_active,
                            togglingUnitId: togglingUnitId,
                            isLoadingUnits: isLoadingUnits
                          });
                          handleToggleStatus(row);
                        }}
                        disabled={isLoadingUnits || togglingUnitId === row.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-green-600'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        } ${(isLoadingUnits || togglingUnitId === row.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={row.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📋 Dropdown button clicked for unit:', row.id);
                            setOpenDropdownId(openDropdownId === row.id ? null : row.id);
                          }}
                          className={`dropdown-trigger p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors cursor-pointer`}
                          title="Actions"
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && (
                          <div className={`dropdown-menu absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('✏️ Edit button clicked for unit:', row);
                                  handleEditUnit(row);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                                } cursor-pointer`}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🗑️ Delete button clicked for unit:', row.id);
                                  handleDeleteUnit(row.id);
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
                ))}
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
              Page {currentPage} of {totalPages} ({filteredUnits.length} total)
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

      {/* Create Unit Modal */}
      <CreateUnitModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingUnitId(null);
          setEditingUnitNumericId(null);
        }}
        onSuccess={handleUnitCreated}
        editingUnitId={editingUnitId}
        editingUnitNumericId={editingUnitNumericId}
      />
    </div>
  );
};

export default Units;
