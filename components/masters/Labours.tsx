'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Users, Plus, Search, X, Download, Loader2, Edit, Trash2, MoreVertical, RefreshCw, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CreateLabourModal from './Modals/CreateLabourModal';
import LabourBulkUploadModal from './Modals/LabourBulkUploadModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface Labour {
  id: string; // UUID or string for display
  numericId?: number | string; // Numeric ID from database for API calls
  uuid?: string; // UUID if available
  name: string;
  code?: string;
  category: 'skilled' | 'semiskilled' | 'unskilled'; // API uses lowercase
  unit_id?: number;
  unit?: {
    id: number;
    unit: string;
    unit_coversion?: string;
    unit_coversion_factor?: string;
  };
  status?: 'Active' | 'Inactive';
  is_active?: number; // 1 = active, 0 = inactive
  createdAt?: string;
}

interface LaboursProps {
  theme: ThemeType;
}

const Labours: React.FC<LaboursProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingLabourId, setEditingLabourId] = useState<string | null>(null); // UUID for display
  const [editingLabourNumericId, setEditingLabourNumericId] = useState<number | string | null>(null); // Numeric ID for API calls
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [isLoadingLabours, setIsLoadingLabours] = useState<boolean>(false);
  const [laboursError, setLaboursError] = useState<string | null>(null);
  const [togglingLabourId, setTogglingLabourId] = useState<string | null>(null); // Track which labour is being toggled
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [deleteConfirmLabourId, setDeleteConfirmLabourId] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<boolean>(false);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch labours from API
  const fetchLabours = async () => {
    if (!isAuthenticated) {
      setLabours([]);
      setIsLoadingLabours(false);
      return;
    }
    
    setIsLoadingLabours(true);
    setLaboursError(null);
    try {
      const fetchedLabours = await masterDataAPI.getLabours({ per_page: 9999 });
      // Transform API response to match Labour interface
      const transformedLabours: Labour[] = fetchedLabours.map((labour: any) => {
        const numericId = labour.id; // Numeric ID from database
        const uuid = labour.uuid; // UUID if available
        
        // Normalize category to lowercase
        let category: 'skilled' | 'semiskilled' | 'unskilled' = 'skilled';
        const cat = (labour.category || '').toLowerCase();
        if (cat === 'skilled' || cat === 'semiskilled' || cat === 'unskilled') {
          category = cat as 'skilled' | 'semiskilled' | 'unskilled';
        }
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = labour.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        // Code: use only from API (e.g. L415190 from DB) - never invent a code
        const code = labour.code || labour.labour_code || '';
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: labour.name || '',
          code,
          category,
          unit_id: labour.unit_id || labour.unit?.id,
          unit: labour.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: labour.created_at || labour.createdAt,
        };
      });
      setLabours(transformedLabours);
    } catch (err: any) {
      console.error('Failed to fetch labours:', err);
      setLaboursError(err.message || 'Failed to load labours');
      setLabours([]);
      toast.showError(err.message || 'Failed to load labours');
    } finally {
      setIsLoadingLabours(false);
    }
  };

  // Load labours from API on mount and when auth changes
  useEffect(() => {
    fetchLabours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search labours using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all labours
      await fetchLabours();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchLabours(query);
      // Transform API response to match Labour interface
      const transformedLabours: Labour[] = searchResults.map((labour: any) => {
        const numericId = labour.id; // Numeric ID from database
        const uuid = labour.uuid; // UUID if available
        
        // Normalize category to lowercase
        let category: 'skilled' | 'semiskilled' | 'unskilled' = 'skilled';
        const cat = (labour.category || '').toLowerCase();
        if (cat === 'skilled' || cat === 'semiskilled' || cat === 'unskilled') {
          category = cat as 'skilled' | 'semiskilled' | 'unskilled';
        }
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = labour.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        // Code: use only from API (e.g. L415190 from DB) - never invent a code
        const code = labour.code || labour.labour_code || '';
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: labour.name || '',
          code,
          category,
          unit_id: labour.unit_id || labour.unit?.id,
          unit: labour.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: labour.created_at || labour.createdAt,
        };
      });
      setLabours(transformedLabours);
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
        fetchLabours();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const labourTypeOptions = [
    'Supervisor',
    'Foremen',
    'Helpers',
    'Male Coolie',
    'Female Coolie',
    'General Laborers',
    'Beldar',
    'Masons',
    'Carpenters',
    'Electricians',
    'Plumbers',
    'Welders',
    'Fitters',
    'Tilers',
    'Painter'
  ];

  // Filter labours (client-side filtering is optional since we're using API search)
  const filteredLabours = useMemo(() => {
    let filtered = [...labours];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(labour =>
        labour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        labour.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [labours, searchQuery, isSearching]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLabours.length / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, filteredLabours.length);
  const paginatedLabours = filteredLabours.slice(startIndex, endIndex);

  // Reset to page 1 when search or rows-per-page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage]);

  const handleEditLabour = async (labour: Labour) => {
    try {
      // Controller edit() uses where('id', $uuid) - pass numeric ID for labour-edit and labour-add updateId
      const numericId = labour.numericId ?? labour.id;
      if (numericId == null || numericId === '') {
        toast.showError('Invalid labour ID. Cannot edit labour.');
        return;
      }

      await masterDataAPI.getLabour(String(numericId));

      setEditingLabourId(String(numericId));
      setEditingLabourNumericId(numericId);

      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch labour details:', error);
      toast.showError(error.message || 'Failed to load labour details');
    }
  };

  const handleDeleteLabour = async (labourId: string | null) => {
    if (!labourId) return;
    const labour = labours.find(l => l.id === labourId || l.numericId === labourId);
    const deleteId = labour?.numericId ?? labourId;
    try {
      await masterDataAPI.deleteLabour(String(deleteId));
      toast.showSuccess('Labour deleted successfully');
      await fetchLabours();
    } catch (error: any) {
      toast.showError(error.message || 'Failed to delete labour');
    } finally {
      setDeleteConfirmLabourId(null);
    }
  };

  const handleDeleteAllLabours = async () => {
    if (labours.length === 0) {
      toast.showWarning('No labours to delete.');
      setDeleteAllConfirm(false);
      return;
    }
    setIsDeletingAll(true);
    setDeleteAllConfirm(false);
    let deleted = 0;
    let failed = 0;
    try {
      for (const labour of labours) {
        const deleteId = labour.numericId ?? labour.id;
        try {
          await masterDataAPI.deleteLabour(String(deleteId));
          deleted++;
        } catch (err) {
          failed++;
          console.error('Failed to delete labour:', labour.name, err);
        }
      }
      await fetchLabours();
      if (deleted > 0) {
        toast.showSuccess(`Deleted ${deleted} labour${deleted !== 1 ? 's' : ''}.`);
      }
      if (failed > 0) {
        toast.showError(`Failed to delete ${failed} labour${failed !== 1 ? 's' : ''}.`);
      }
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleToggleStatus = async (labour: Labour) => {
    if (togglingLabourId === labour.id) return;
    if (isLoadingLabours) return;

    try {
      setTogglingLabourId(labour.id);

      const currentStatus = labour.status || (labour.is_active === 1 ? 'Active' : 'Inactive');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const isActive = newStatus === 'Active' ? 1 : 0;

      // Controller updateStatus($uuid) uses uuidtoid() - must pass UUID
      const labourUuid = labour.uuid || labour.id;
      if (!labourUuid) {
        toast.showError('Labour identifier not found');
        return;
      }

      // Optimistically update UI immediately
      setLabours(prevLabours => 
        prevLabours.map(l => 
          l.id === labour.id 
            ? { ...l, status: newStatus, is_active: isActive }
            : l
        )
      );

      // Close dropdown if labour was deactivated (row will be disabled)
      if (newStatus === 'Inactive') {
        setOpenDropdownId(prev => prev === labour.id ? null : prev);
      }

      await masterDataAPI.updateLabourStatus(labourUuid, isActive as 0 | 1);

      // Keep optimistic update - don't call fetchLabours() which can overwrite with stale data

      toast.showSuccess(`Labour ${newStatus.toLowerCase()} successfully`);
      
    } catch (error: any) {
      // Revert optimistic update on error
      setLabours(prevLabours => 
        prevLabours.map(l => 
          l.id === labour.id 
            ? { ...l, status: labour.status, is_active: labour.is_active }
            : l
        )
      );
      
      toast.showError(error.message || 'Failed to update labour status');
    } finally {
      setTogglingLabourId(null);
    }
  };

  const handleLabourCreated = async (createdLabour?: any, updatedLabour?: { labourId: string; unit_id: number; unit: { id: number; unit: string } }) => {
    if (createdLabour) {
      // Controller addLabour returns created labour (may omit code/is_active if not in create)
      const numericId = createdLabour.id;
      const uuid = createdLabour.uuid;
      const code = createdLabour.code || '';
      const newLabour: Labour = {
        id: uuid || String(numericId),
        numericId: numericId,
        uuid: uuid,
        name: createdLabour.name || '',
        code,
        category: (createdLabour.category || 'skilled') as 'skilled' | 'semiskilled' | 'unskilled',
        unit_id: createdLabour.unit_id ?? createdLabour.unit?.id,
        unit: createdLabour.unit,
        status: 'Active',
        is_active: 1,
      };
      setLabours(prev => [newLabour, ...prev]);
      return;
    }
    if (updatedLabour) {
      // Update labour's unit in the list so table reflects the edit immediately
      setLabours(prev => prev.map(l => {
        const matchId = l.numericId ?? l.id;
        if (String(matchId) === String(updatedLabour.labourId) || l.id === updatedLabour.labourId) {
          return { ...l, unit_id: updatedLabour.unit_id, unit: updatedLabour.unit };
        }
        return l;
      }));
      return;
    }
    await fetchLabours();
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

  const handleDownloadExcel = () => {
    // Export pattern: #, Code, Name, Category, Unit, uuid (backend expects uuid key; empty for new rows)
    const headers = ['#', 'Code', 'Name', 'Category', 'Unit', 'uuid'];
    const rows = filteredLabours.map((labour, idx) => [
      idx + 1,
      labour.code || '',
      labour.name || '',
      (labour.category || '').toLowerCase(),
      labour.unit?.unit || 'Nos',
      labour.uuid || '' // Required column for backend; empty for new records
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Labours');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `labours_bulk_upload_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Labours</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage labour workforce and assignments
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
            title="Download current labours as Excel (bulk upload format)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={async () => {
              console.log('🔄 Manual refresh triggered');
              setSearchQuery('');
              await fetchLabours();
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Refresh Labours List"
          >
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => setShowBulkUploadModal(true)}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Bulk Upload Labours"
          >
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Bulk Upload</span><span className="sm:hidden">Bulk</span>
          </button>
          <button 
            onClick={() => setDeleteAllConfirm(true)}
            disabled={labours.length === 0 || isDeletingAll}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark ? 'bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-700' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
            } shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Delete all labours"
          >
            {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDeletingAll ? 'Deleting...' : 'Delete All'}</span>
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
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredLabours.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredLabours.filter(l => l.status === 'Active').length}</p>
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
            placeholder="Search by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoadingLabours && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Labours...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your labours</p>
        </div>
      )}

      {/* Error State */}
      {laboursError && !isLoadingLabours && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Users className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Labours</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{laboursError}</p>
          <button
            onClick={fetchLabours}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Labours Table */}
      {!isLoadingLabours && !laboursError && filteredLabours.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto pt-1 pb-6">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sr No</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Category</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedLabours.map((row, index) => (
                  <tr 
                    key={row.id} 
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
                      {startIndex + index + 1}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.code || '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name || '—'}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
{(row.category === 'skilled' ? 'Skilled' :
                       row.category === 'semiskilled' ? 'Semi Skilled' :
                       row.category === 'unskilled' ? 'Unskilled' :
                       row.category) || '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.unit?.unit || 'Nos'}
                    </td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔄 Toggle button clicked for labour:', {
                            id: row.id,
                            name: row.name,
                            currentStatus: row.status,
                            currentIsActive: row.is_active,
                            togglingLabourId: togglingLabourId,
                            isLoadingLabours: isLoadingLabours
                          });
                          handleToggleStatus(row);
                        }}
                        disabled={isLoadingLabours || togglingLabourId === row.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-green-600'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        } ${(isLoadingLabours || togglingLabourId === row.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                            if (row.status === 'Inactive') return;
                            setOpenDropdownId(openDropdownId === row.id ? null : row.id);
                          }}
                          disabled={row.status === 'Inactive'}
                          className={`dropdown-trigger p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors ${row.status === 'Inactive' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={row.status === 'Inactive' ? 'Activate labour to enable actions' : 'Actions'}
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && row.status !== 'Inactive' && (
                          <div className={`dropdown-menu absolute right-0 w-32 rounded-lg border shadow-xl z-[100] ${index === paginatedLabours.length - 1 ? 'bottom-full mb-1' : 'top-full mt-1'} ${isDark ? 'bg-dropdown-panel border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditLabour(row);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                                }`}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmLabourId(row.id);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-50 text-red-600'
                                }`}
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
                <option value={99999}>All</option>
              </select>
            </div>
            <span className={`text-sm ${textSecondary}`}>
              Page {currentPage} of {totalPages} ({filteredLabours.length} total)
            </span>
          </div>
        </div>
      ) : !isLoadingLabours && !laboursError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Labours Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No labours found matching "${searchQuery}"` 
              : 'Start by adding your first labour entry'}
          </p>
        </div>
      ) : null}

      {/* Create Labour Modal */}
      <CreateLabourModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingLabourId(null);
          setEditingLabourNumericId(null);
        }}
        onSuccess={handleLabourCreated}
        editingLabourId={editingLabourId}
        editingLabourNumericId={editingLabourNumericId}
        labours={labours}
      />

      {/* Delete Single Labour Confirmation Modal */}
      {deleteConfirmLabourId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${cardClass} rounded-xl border w-full max-w-lg p-6 shadow-xl`}>
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Confirm Delete</h3>
            <p className={`text-sm ${textSecondary} mb-6`}>
              Are you sure you want to delete labour{' '}
              <span className={`font-bold ${textPrimary}`}>
                {labours.find(l => l.id === deleteConfirmLabourId || l.numericId === deleteConfirmLabourId)?.name || 'this item'}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmLabourId(null)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLabour(deleteConfirmLabourId)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Labours Confirmation Modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${cardClass} rounded-xl border w-full max-w-lg p-6 shadow-xl`}>
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Confirm Delete All</h3>
            <p className={`text-sm ${textSecondary} mb-6`}>
              Are you sure you want to delete all <span className={`font-bold ${textPrimary}`}>{labours.length}</span> labour{labours.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllLabours}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 hover:bg-red-700 text-white"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <LabourBulkUploadModal
        theme={theme}
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => { setSearchQuery(''); setCurrentPage(1); fetchLabours(); }}
      />
    </div>
  );
};

export default Labours;
