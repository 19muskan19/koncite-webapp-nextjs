'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Wrench, MoreVertical, Download, Plus, Search, FileSpreadsheet, Upload, ArrowUpDown, Loader2, Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CreateAssetEquipmentModal from './Modals/CreateAssetEquipmentModal';
import AssetBulkUploadModal from './Modals/AssetBulkUploadModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface AssetEquipment {
  id: string; // UUID or string for display
  numericId?: number | string; // Numeric ID from database for API calls
  uuid?: string; // UUID if available
  name: string;
  code?: string;
  unit?: string;
  unit_id?: number;
  unit_data?: {
    id: number;
    unit: string;
    unit_coversion?: string;
    unit_coversion_factor?: string;
  };
  specification: string;
  status?: 'Active' | 'Inactive';
  is_active?: number; // 1 = active, 0 = inactive
  createdAt?: string;
}

interface AssetsEquipmentsProps {
  theme: ThemeType;
}

const AssetsEquipments: React.FC<AssetsEquipmentsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'bulkUpload' | 'openingStock'>('list');
  const [openingStockSubTab, setOpeningStockSubTab] = useState<'bulkUpload' | 'available'>('bulkUpload');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null); // UUID for display
  const [editingAssetNumericId, setEditingAssetNumericId] = useState<number | string | null>(null); // Numeric ID for API calls
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetEquipment[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [togglingAssetId, setTogglingAssetId] = useState<string | null>(null); // Track which asset is being toggled
  const [openingStockForm, setOpeningStockForm] = useState({
    project: 'Demo Data',
    storeWarehouse: 'Main Store',
    openingDate: '2026-01-08',
    file: null as File | null
  });
  const [availableStockFilters, setAvailableStockFilters] = useState({
    project: '',
    storeWarehouse: ''
  });
  const [availableStockSearch, setAvailableStockSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [listEntriesPerPage, setListEntriesPerPage] = useState<number>(25);
  const [listCurrentPage, setListCurrentPage] = useState<number>(1);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const machineryOptions = [
    'Machinery Hire',
    'Breaker Hire',
    'MS Props',
    'MS Shikanja',
    'MS Shuttering Plates',
    'Concrete Breaker Machine',
    'Measuring Tape',
    'Helmets',
    'Safety Belt',
    'Excavator on hire',
    'Excavator Hire',
    'Concrete Mixer Hire',
    'Vibrator Hire',
    'DG Hire',
    'Poclain machine Hire',
    'Road Roller Hire',
    'Tipper Hire',
    'Compactor Hire'
  ];

  const unitOptions = [
    'Bags', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 
    'Bulk', 'Bundles', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day'
  ];

  const availableProjects = [
    { name: 'Residential Complex A', code: 'PRJ001' },
    { name: 'Commercial Tower B', code: 'PRJ002' },
    { name: 'Highway Infrastructure Project', code: 'PRJ003' },
    { name: 'Shopping Mall Development', code: 'PRJ004' },
  ];

  const availableWarehouses = [
    { name: 'Main Store', code: 'WH001' },
    { name: 'Main Warehouse', code: 'WH002' },
    { name: 'Storage Facility B', code: 'WH003' },
  ];

  // Fetch assets from API
  const fetchAssets = async () => {
    if (!isAuthenticated) {
      setAssets([]);
      setIsLoadingAssets(false);
      return;
    }
    
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      const fetchedAssets = await masterDataAPI.getAssetsEquipments();
      // Transform API response to match AssetEquipment interface
      const transformedAssets: AssetEquipment[] = fetchedAssets.map((asset: any) => {
        const numericId = asset.id; // Numeric ID from database
        const uuid = asset.uuid; // UUID if available
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = asset.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        const unitObj = asset.unit_id && typeof asset.unit_id === 'object' ? asset.unit_id : asset.unit;
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: asset.assets || asset.name || '', // API returns name in "assets" field
          code: asset.code || '',
          specification: asset.specification || '',
          unit: unitObj?.unit || asset.unit?.unit || asset.unit || '',
          unit_id: typeof asset.unit_id === 'object' ? asset.unit_id?.id : asset.unit_id,
          unit_data: unitObj || asset.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: asset.created_at || asset.createdAt,
        };
      });
      setAssets(transformedAssets);
    } catch (err: any) {
      console.error('Failed to fetch assets:', err);
      setAssetsError(err.message || 'Failed to load assets');
      setAssets([]);
      toast.showError(err.message || 'Failed to load assets');
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Load assets from API on mount and when auth changes
  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search assets using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all assets
      await fetchAssets();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchAssetsEquipments(query);
      // Transform API response to match AssetEquipment interface
      const transformedAssets: AssetEquipment[] = searchResults.map((asset: any) => {
        const numericId = asset.id; // Numeric ID from database
        const uuid = asset.uuid; // UUID if available
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = asset.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        const unitObj = asset.unit_id && typeof asset.unit_id === 'object' ? asset.unit_id : asset.unit;
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: asset.assets || asset.name || '', // API returns name in "assets" field
          code: asset.code || '',
          specification: asset.specification || '',
          unit: unitObj?.unit || asset.unit?.unit || asset.unit || '',
          unit_id: typeof asset.unit_id === 'object' ? asset.unit_id?.id : asset.unit_id,
          unit_data: unitObj || asset.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: asset.created_at || asset.createdAt,
        };
      });
      setAssets(transformedAssets);
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
        fetchAssets();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter assets (client-side filtering is optional since we're using API search)
  const filteredAssets = useMemo(() => {
    let filtered = [...assets];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.code && asset.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.unit && asset.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        asset.specification.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [assets, searchQuery, isSearching]);

  // Pagination for assets list
  const listTotalPages = Math.max(1, Math.ceil(filteredAssets.length / listEntriesPerPage));
  const listStartIndex = (listCurrentPage - 1) * listEntriesPerPage;
  const listEndIndex = Math.min(listStartIndex + listEntriesPerPage, filteredAssets.length);
  const paginatedAssets = filteredAssets.slice(listStartIndex, listEndIndex);

  useEffect(() => {
    setListCurrentPage(1);
  }, [searchQuery, listEntriesPerPage]);

  const handleEditAsset = async (asset: AssetEquipment) => {
    try {
      // Backend expects numeric id for assets-edit, update, delete
      const idForApi = asset.numericId ?? asset.id;
      await masterDataAPI.getAssetEquipment(String(idForApi));
      
      setEditingAssetId(String(idForApi));
      setEditingAssetNumericId(asset.numericId || null);
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch asset details:', error);
      toast.showError(error.message || 'Failed to load asset details');
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    // Backend expects numeric id for delete (assets table uses id column, not uuid)
    const idForApi = asset?.numericId ?? assetId;
    
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await masterDataAPI.deleteAssetEquipment(String(idForApi));
        toast.showSuccess('Asset deleted successfully');
        // Refresh assets list
        await fetchAssets();
      } catch (error: any) {
        console.error('Failed to delete asset:', error);
        toast.showError(error.message || 'Failed to delete asset');
      }
    }
  };

  const handleToggleStatus = async (asset: AssetEquipment) => {
    if (togglingAssetId === asset.id || isLoadingAssets) return;

    try {
      setTogglingAssetId(asset.id);
      
      // Determine current status
      const currentStatus = asset.status || (asset.is_active === 1 ? 'Active' : 'Inactive');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const isActive = newStatus === 'Active' ? 1 : 0;
      
      // Backend expects numeric id for assets-edit and update
      const idForApi = asset.numericId ?? asset.id;

      // First, fetch current asset data to ensure we have latest data
      let currentAssetData;
      try {
        currentAssetData = await masterDataAPI.getAssetEquipment(String(idForApi));
      } catch (fetchError: any) {
        console.warn('⚠️ Failed to fetch asset data, using existing data:', fetchError);
        // Fallback to existing asset data if fetch fails
        currentAssetData = {
          name: asset.name,
          code: asset.code,
          specification: asset.specification,
          unit_id: asset.unit_id,
          is_active: asset.is_active
        };
      }

      // Optimistically update UI immediately
      setAssets(prevAssets => 
        prevAssets.map(a => 
          a.id === asset.id 
            ? { ...a, status: newStatus, is_active: isActive }
            : a
        )
      );

      const unitIdForPayload = typeof currentAssetData.unit_id === 'object' 
        ? currentAssetData.unit_id?.id 
        : currentAssetData.unit_id;
      const updatePayload = {
        name: currentAssetData.assets || currentAssetData.name || asset.name,
        code: currentAssetData.code || asset.code,
        specification: currentAssetData.specification || asset.specification,
        unit_id: unitIdForPayload ?? asset.unit_id,
        is_active: isActive
      };
      
      await masterDataAPI.updateAssetEquipment(String(idForApi), updatePayload);
      
      toast.showSuccess(`Asset ${newStatus.toLowerCase()} successfully`);
      
      // Refresh assets list to ensure UI reflects database state
      await fetchAssets();
      
    } catch (error: any) {
      console.error('❌ Failed to toggle asset status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      
      // Revert optimistic update on error
      setAssets(prevAssets => 
        prevAssets.map(a => 
          a.id === asset.id 
            ? { ...a, status: asset.status, is_active: asset.is_active }
            : a
        )
      );
      
      toast.showError(error.message || 'Failed to update asset status');
    } finally {
      setTogglingAssetId(null);
    }
  };

  const handleAssetCreated = async () => {
    // Refresh assets list after create/update
    await fetchAssets();
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
    const headers = ['SR No', 'Name', 'Specification', 'Unit', 'Code', 'Status'];
    const rows = filteredAssets.map((asset, idx) => [
      idx + 1,
      asset.name,
      asset.specification,
      asset.unit,
      asset.code,
      asset.status || 'Active'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assets_equipments_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMasterData = () => {
    const headers = ['SR No', 'Name', 'Specification', 'Unit', 'Code', 'Status'];
    const rows = assets.map((asset, idx) => [
      idx + 1,
      asset.name,
      asset.specification,
      asset.unit,
      asset.code,
      asset.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asset_equipments_machinery_master_data_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.showSuccess('Master data exported successfully');
  };

  const handleDownloadBulkUploadTemplate = () => {
    const headers = ['name', 'specification', 'unit', 'code'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assets_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.showSuccess('Template downloaded. Fill name, specification, unit, code and upload.');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Assets Equipments</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage construction equipment and assets
          </p>
        </div>
        {activeTab === 'list' && (
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <button 
              onClick={handleDownloadExcel}
              className={`p-2 rounded-lg transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Download as Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setSearchQuery('');
                fetchAssets();
              }}
              className={`p-2 rounded-lg transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Refresh Assets List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} overflow-x-auto`}>
        <div className="flex gap-1 min-w-max sm:min-w-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'list'
                ? `${textPrimary}`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <span className="hidden sm:inline">Asset/Equipments/Machinery List</span>
            <span className="sm:hidden">List</span>
            {activeTab === 'list' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bulkUpload')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'bulkUpload'
                ? `text-red-500`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <span className="hidden sm:inline">Bulk Upload of Asset/Equipments/Machinery</span>
            <span className="sm:hidden">Bulk Upload</span>
            {activeTab === 'bulkUpload' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('openingStock')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'openingStock'
                ? `${textPrimary}`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            Opening Stock
            {activeTab === 'openingStock' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredAssets.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredAssets.filter(a => a.status === 'Active').length}</p>
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
                placeholder="Search by asset name..."
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
      {isLoadingAssets && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Assets...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your assets</p>
        </div>
      )}

      {/* Error State */}
      {assetsError && !isLoadingAssets && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Wrench className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Assets</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{assetsError}</p>
          <button
            onClick={fetchAssets}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Assets Table */}
      {!isLoadingAssets && !assetsError && filteredAssets.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sr No</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedAssets.map((row, idx) => (
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
                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{listStartIndex + idx + 1}</td>
                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.specification || '-'}</td>
                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.unit || '-'}</td>
                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.code || '-'}</td>
                    <td className={`px-3 sm:px-6 py-3 sm:py-4`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleStatus(row);
                        }}
                        disabled={isLoadingAssets || togglingAssetId === row.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-green-600'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        } ${(isLoadingAssets || togglingAssetId === row.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={row.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                          className={`dropdown-trigger p-1.5 sm:p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                          title="Actions"
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && (
                          <div className={`dropdown-menu absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditAsset(row);
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
                                  handleDeleteAsset(row.id);
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
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setListCurrentPage(1)}
                disabled={listCurrentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  listCurrentPage <= 1
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setListCurrentPage((p) => Math.max(1, p - 1))}
                disabled={listCurrentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  listCurrentPage <= 1
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={listCurrentPage}
                onChange={(e) => setListCurrentPage(Number(e.target.value))}
                className={`px-3 py-1.5 rounded text-sm font-bold border appearance-none cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
                title="Current page"
              >
                {Array.from({ length: listTotalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={() => setListCurrentPage((p) => Math.min(listTotalPages, p + 1))}
                disabled={listCurrentPage >= listTotalPages}
                className={`p-2 rounded transition-colors ${
                  listCurrentPage >= listTotalPages
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setListCurrentPage(listTotalPages)}
                disabled={listCurrentPage >= listTotalPages}
                className={`p-2 rounded transition-colors ${
                  listCurrentPage >= listTotalPages
                    ? isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed'
                    : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900'
                }`}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <div className={`h-6 w-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <span className={`text-sm ${textSecondary}`}>Rows per page:</span>
              <select
                value={listEntriesPerPage}
                onChange={(e) => {
                  setListEntriesPerPage(Number(e.target.value));
                  setListCurrentPage(1);
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
              Page {listCurrentPage} of {listTotalPages} ({filteredAssets.length} total)
            </span>
          </div>
        </div>
      ) : !isLoadingAssets && !assetsError ? (
        <div className={`p-8 sm:p-12 rounded-xl border text-center ${cardClass}`}>
          <Wrench className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-base sm:text-lg font-black mb-2 ${textPrimary}`}>No Assets Found</h3>
          <p className={`text-xs sm:text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No assets found matching "${searchQuery}"` 
              : 'Start by adding your first equipment entry'}
          </p>
        </div>
      ) : null}
        </>
      )}

      {activeTab === 'bulkUpload' && (
        <div className={`rounded-xl border p-4 sm:p-8 ${cardClass}`}>
          <p className={`text-sm ${textSecondary} mb-4 text-center`}>
            Use columns: <strong className={textPrimary}>name</strong>, <strong className={textPrimary}>specification</strong>, <strong className={textPrimary}>unit</strong>, <strong className={textPrimary}>code</strong> (optional)
          </p>
          <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
            <button
              onClick={handleDownloadBulkUploadTemplate}
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-center">Download Template (name, specification, unit, code)</span>
            </button>
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isDark
                  ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                  : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
              } shadow-md`}
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-center">Upload File</span>
            </button>
            <button
              onClick={handleExportMasterData}
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
            >
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-center">Export Master Data</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'openingStock' && (
        <>
          {/* Sub-tabs */}
          <div className={`flex gap-1 sm:gap-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} overflow-x-auto`}>
            <button
              onClick={() => setOpeningStockSubTab('bulkUpload')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                openingStockSubTab === 'bulkUpload'
                  ? isDark
                    ? 'bg-slate-800 border-t border-l border-r border-slate-700 text-slate-100'
                    : 'bg-white border-t border-l border-r border-slate-200 text-slate-900'
                  : `${textSecondary} hover:${textPrimary}`
              } rounded-t-lg`}
            >
              <span className="hidden sm:inline">Bulk Upload Opening Stock</span>
              <span className="sm:hidden">Bulk Upload</span>
            </button>
            <button
              onClick={() => setOpeningStockSubTab('available')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                openingStockSubTab === 'available'
                  ? isDark
                    ? 'bg-slate-800 border-t border-l border-r border-slate-700 text-slate-100'
                    : 'bg-white border-t border-l border-r border-slate-200 text-slate-900'
                  : `${textSecondary} hover:${textPrimary}`
              } rounded-t-lg`}
            >
              <span className="hidden sm:inline">Available Opening Stock</span>
              <span className="sm:hidden">Available</span>
            </button>
          </div>

          {openingStockSubTab === 'bulkUpload' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Export Button */}
              <div className={`rounded-xl border p-4 sm:p-8 ${cardClass}`}>
                <button
                  onClick={handleExportMasterData}
                  className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                      : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                  } shadow-md`}
                >
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-center">Export Asset/Equipments/Machinery Data</span>
                </button>
              </div>

              {/* Bulk Upload Form */}
              <div className={`rounded-xl border ${cardClass}`}>
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <h3 className={`text-base sm:text-lg font-black ${textPrimary} mb-3 sm:mb-4`}>Bulk Upload Opening Stock</h3>
                  
                  {/* Project */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Project
                    </label>
                    <input
                      type="text"
                      value={openingStockForm.project}
                      onChange={(e) => setOpeningStockForm({ ...openingStockForm, project: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                          : 'bg-white border-slate-200 text-slate-900'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>

                  {/* Store/Warehouses */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Store/Warehouses
                    </label>
                    <input
                      type="text"
                      value={openingStockForm.storeWarehouse}
                      onChange={(e) => setOpeningStockForm({ ...openingStockForm, storeWarehouse: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                          : 'bg-white border-slate-200 text-slate-900'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>

                  {/* Opening Date */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Opening Date
                    </label>
                    <input
                      type="date"
                      value={openingStockForm.openingDate}
                      onChange={(e) => setOpeningStockForm({ ...openingStockForm, openingDate: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                          : 'bg-white border-slate-200 text-slate-900'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Upload File
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                      <label className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border flex items-center justify-center`}>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setOpeningStockForm({ ...openingStockForm, file });
                            }
                          }}
                          className="hidden"
                        />
                        Choose File
                      </label>
                      <span className={`text-xs sm:text-sm ${textSecondary} text-center sm:text-left break-all`}>
                        {openingStockForm.file ? openingStockForm.file.name : 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  {/* Import Data Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        if (!openingStockForm.file) {
                          toast.showWarning('Please select a file to upload');
                          return;
                        }
                        toast.showSuccess('Opening stock data imported successfully');
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark
                          ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                          : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                      } shadow-md`}
                    >
                      Import Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {openingStockSubTab === 'available' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Filters */}
              <div className={`rounded-xl border p-4 sm:p-6 ${cardClass}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Project
                    </label>
                    <select
                      value={availableStockFilters.project}
                      onChange={(e) => {
                        setAvailableStockFilters({ ...availableStockFilters, project: e.target.value });
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    >
                      <option value="">----Select Project----</option>
                      {availableProjects.map((project, idx) => (
                        <option key={idx} value={project.name}>
                          {project.name} ({project.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Store/Warehouses
                    </label>
                    <select
                      value={availableStockFilters.storeWarehouse}
                      onChange={(e) => {
                        setAvailableStockFilters({ ...availableStockFilters, storeWarehouse: e.target.value });
                        setCurrentPage(1);
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    >
                      <option value="">----Select Store/Warehouses----</option>
                      {availableWarehouses.map((warehouse, idx) => (
                        <option key={idx} value={warehouse.name}>
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Opening Stock Table */}
              <div className={`rounded-xl border ${cardClass}`}>
                <div className="p-4 sm:p-6">
                  <h3 className={`text-base sm:text-lg font-black ${textPrimary} mb-4`}>LIST ASSET/MACHINERY OPENING DETAILS</h3>
                  
                  {/* Table Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Show</span>
                      <select
                        value={entriesPerPage}
                        onChange={(e) => {
                          setEntriesPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-bold ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                            : 'bg-white border-slate-200 text-slate-900'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>entries</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Search:</span>
                      <input
                        type="text"
                        value={availableStockSearch}
                        onChange={(e) => {
                          setAvailableStockSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`flex-1 sm:w-auto px-3 py-1 rounded text-xs sm:text-sm font-bold ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                            : 'bg-white border-slate-200 text-slate-900'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                        placeholder="Search..."
                      />
                    </div>
                  </div>

                  {/* Sample Data - In real app, this would come from state/API */}
                  {(() => {
                    const sampleData = [
                      { id: 1, project: 'Demo Data', store: 'Main Store', name: 'Machinery Hire', code: 'AST001', specification: 'Heavy Machinery', unit: 'Hrs', openingQty: 10, openingDate: '2025-11-01' },
                      { id: 2, project: 'Demo Data', store: 'Main Store', name: 'Excavator Hire', code: 'AST002', specification: 'Excavator Equipment', unit: 'Hrs', openingQty: 5, openingDate: '2025-11-01' },
                    ];

                    const filteredData = sampleData.filter((item) => {
                      if (availableStockFilters.project && item.project !== availableStockFilters.project) return false;
                      if (availableStockFilters.storeWarehouse && item.store !== availableStockFilters.storeWarehouse) return false;
                      if (availableStockSearch) {
                        const searchLower = availableStockSearch.toLowerCase();
                        return (
                          item.name.toLowerCase().includes(searchLower) ||
                          item.code.toLowerCase().includes(searchLower) ||
                          item.specification.toLowerCase().includes(searchLower)
                        );
                      }
                      return true;
                    });

                    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
                    const startIndex = (currentPage - 1) * entriesPerPage;
                    const endIndex = startIndex + entriesPerPage;
                    const paginatedData = filteredData.slice(startIndex, endIndex);

                    return (
                      <>
                        {filteredData.length === 0 ? (
                          <div className={`p-8 sm:p-12 text-center ${cardClass}`}>
                            <p className={`text-sm sm:text-base ${textSecondary}`}>!No Data Found</p>
                          </div>
                        ) : (
                          <>
                            {/* Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[800px]">
                                <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                                  <tr>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        #
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Project Name
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Store/ Warehouse
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Name
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Code
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Specification
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Unit
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Opening QTY
                                      </div>
                                    </th>
                                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                                      <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Opening Date
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-inherit">
                                  {paginatedData.length > 0 ? (
                                    paginatedData.map((row, index) => (
                                      <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{startIndex + index + 1}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.project}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.store}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.name}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.code}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.specification}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.unit}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.openingQty}</td>
                                        <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold ${textPrimary}`}>{row.openingDate}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={9} className={`px-4 py-8 text-center ${textSecondary}`}>
                                        No data available in table
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Table Footer */}
                            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                              <div className={`text-xs sm:text-sm ${textSecondary}`}>
                                Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentPage === 1}
                                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold transition-all ${
                                    currentPage === 1
                                      ? isDark
                                        ? 'bg-slate-800/30 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : isDark
                                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                                  }`}
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={currentPage === totalPages || totalPages === 0}
                                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold transition-all ${
                                    currentPage === totalPages || totalPages === 0
                                      ? isDark
                                        ? 'bg-slate-800/30 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : isDark
                                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                                  }`}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Asset/Equipment Modal */}
      <CreateAssetEquipmentModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAssetId(null);
          setEditingAssetNumericId(null);
        }}
        onSuccess={handleAssetCreated}
        editingAssetId={editingAssetId}
        editingAssetNumericId={editingAssetNumericId}
        assets={assets}
      />

      {/* Bulk Upload Modal */}
      <AssetBulkUploadModal
        theme={theme}
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => {
          setShowBulkUploadModal(false);
          fetchAssets();
        }}
      />
    </div>
  );
};

export default AssetsEquipments;
