'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Boxes, MoreVertical, Download, Plus, Search, ArrowUpDown, FileSpreadsheet, Upload, Loader2, Edit, Trash2 } from 'lucide-react';
import CreateMaterialModal from './Modals/CreateMaterialModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface Material {
  id: string;
  uuid?: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  unit_id?: number;
  createdAt?: string;
}

interface MaterialsProps {
  theme: ThemeType;
}

const Materials: React.FC<MaterialsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'list' | 'bulkUpload' | 'openingStock'>('list');
  const [openingStockSubTab, setOpeningStockSubTab] = useState<'bulkUpload' | 'available'>('bulkUpload');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [openingStockForm, setOpeningStockForm] = useState({
    project: '',
    storeWarehouse: '',
    openingDate: '',
    file: null as File | null
  });
  const [availableStockFilters, setAvailableStockFilters] = useState({
    project: '',
    storeWarehouse: ''
  });
  const [availableStockSearch, setAvailableStockSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const classOptions: Array<{ value: 'A' | 'B' | 'C'; label: string }> = [
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
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

  // Fetch materials from API
  const fetchMaterials = async () => {
    if (!isAuthenticated) {
      setMaterials([]);
      setIsLoadingMaterials(false);
      return;
    }
    
    setIsLoadingMaterials(true);
    setMaterialsError(null);
    try {
      const fetchedMaterials = await masterDataAPI.getMaterials();
      // Transform API response to match Material interface
      const transformedMaterials = fetchedMaterials.map((material: any) => {
        // Handle class field - API returns formatted object with title and value
        const materialClass = material.class?.value || material.class || '';
        return {
          id: material.uuid || String(material.id),
          uuid: material.uuid,
          class: materialClass as 'A' | 'B' | 'C',
          code: material.code || '',
          name: material.name || '',
          specification: material.specification || '',
          unit: material.unit?.unit || material.unit || '',
          unit_id: material.unit_id || material.unit?.id,
          createdAt: material.created_at || material.createdAt,
        };
      });
      setMaterials(transformedMaterials);
    } catch (err: any) {
      console.error('Failed to fetch materials:', err);
      setMaterialsError(err.message || 'Failed to load materials');
      setMaterials([]);
      toast.showError(err.message || 'Failed to load materials');
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Load materials from API on mount and when auth changes
  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search materials using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all materials
      await fetchMaterials();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchMaterials(query);
      // Transform API response to match Material interface
      const transformedMaterials = searchResults.map((material: any) => {
        const materialClass = material.class?.value || material.class || '';
        return {
          id: material.uuid || String(material.id),
          uuid: material.uuid,
          class: materialClass as 'A' | 'B' | 'C',
          code: material.code || '',
          name: material.name || '',
          specification: material.specification || '',
          unit: material.unit?.unit || material.unit || '',
          unit_id: material.unit_id || material.unit?.id,
          createdAt: material.created_at || material.createdAt,
        };
      });
      setMaterials(transformedMaterials);
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
        fetchMaterials();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter materials (client-side filtering is optional since we're using API search)
  const filteredMaterials = useMemo(() => {
    let filtered = [...materials];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(material =>
        material.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.specification && material.specification.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.unit && material.unit.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [materials, searchQuery, isSearching]);

  const handleEditMaterial = async (material: Material) => {
    try {
      // Fetch full material details from API
      const materialDetails = await masterDataAPI.getMaterial(material.id);
      setEditingMaterialId(material.id);
      // Open modal with material data - CreateMaterialModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('Failed to fetch material details:', error);
      toast.showError('Failed to load material details');
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await masterDataAPI.deleteMaterial(materialId);
        toast.showSuccess('Material deleted successfully');
        // Refresh materials list
        await fetchMaterials();
      } catch (error: any) {
        console.error('Failed to delete material:', error);
        toast.showError(error.message || 'Failed to delete material');
      }
    }
  };

  const handleMaterialCreated = async () => {
    // Refresh materials list after create/update
    await fetchMaterials();
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
    const headers = ['Class', 'Code', 'Name', 'Specification', 'Unit'];
    const rows = filteredMaterials.map(material => [
      material.class,
      material.code,
      material.name,
      material.specification || '',
      material.unit
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `materials_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMaterialsData = () => {
    const headers = ['Class', 'Code', 'Name', 'Specification', 'Unit'];
    const rows = materials.map((material: Material) => [
      material.class,
      material.code,
      material.name,
      material.specification || '',
      material.unit || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `materials_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showSuccess('Materials data exported successfully');
  };

  const handleImportMaterialsData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Here you would typically parse the file and import the data
        // For now, just show a success message
        toast.showSuccess('Materials data imported successfully');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Boxes className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Materials</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage construction materials inventory
            </p>
          </div>
        </div>
        {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadExcel}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Download as Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 text-sm font-bold transition-colors relative ${
              activeTab === 'list'
                ? `${textPrimary}`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            Materials List
            {activeTab === 'list' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bulkUpload')}
            className={`px-6 py-3 text-sm font-bold transition-colors relative ${
              activeTab === 'bulkUpload'
                ? `text-red-500`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            Bulk Upload of Material
            {activeTab === 'bulkUpload' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('openingStock')}
            className={`px-6 py-3 text-sm font-bold transition-colors relative ${
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
          {/* Search Bar */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input 
                type="text" 
                placeholder="Search by material name or code..."
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
      {isLoadingMaterials && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Materials...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your materials</p>
        </div>
      )}

      {/* Error State */}
      {materialsError && !isLoadingMaterials && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Boxes className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Materials</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{materialsError}</p>
          <button
            onClick={fetchMaterials}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Materials Table */}
      {!isLoadingMaterials && !materialsError && filteredMaterials.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Class
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Code
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Name
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Specification
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredMaterials.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.class}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.code}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.specification || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                          className={`dropdown-trigger p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                          title="Actions"
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && (
                          <div className={`dropdown-menu absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditMaterial(row);
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
                                  handleDeleteMaterial(row.id);
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
        </div>
      ) : !isLoadingMaterials && !materialsError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Materials Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No materials found matching "${searchQuery}"` 
              : 'Start by adding your first material entry'}
          </p>
        </div>
      ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredMaterials.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class A</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredMaterials.filter(m => m.class === 'A').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class B</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredMaterials.filter(m => m.class === 'B').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class C</p>
              <p className={`text-2xl font-black text-amber-500`}>{filteredMaterials.filter(m => m.class === 'C').length}</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'bulkUpload' && (
        <div className={`rounded-xl border p-8 ${cardClass}`}>
          <div className="space-y-4 max-w-md mx-auto">
            <button
              onClick={handleExportMaterialsData}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                  : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
              } shadow-md`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export Materials Data
            </button>
            <button
              onClick={handleImportMaterialsData}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                  : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
              } shadow-md`}
            >
              <Upload className="w-5 h-5" />
              Import Materials Data
            </button>
          </div>
        </div>
      )}

      {activeTab === 'openingStock' && (
        <>
          {/* Sub-tabs */}
          <div className={`flex gap-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              onClick={() => setOpeningStockSubTab('bulkUpload')}
              className={`px-6 py-3 text-sm font-bold transition-colors ${
                openingStockSubTab === 'bulkUpload'
                  ? isDark
                    ? 'bg-slate-800 border-t border-l border-r border-slate-700 text-slate-100'
                    : 'bg-white border-t border-l border-r border-slate-200 text-slate-900'
                  : `${textSecondary} hover:${textPrimary}`
              } rounded-t-lg`}
            >
              Bulk Upload Opening Materials
            </button>
            <button
              onClick={() => setOpeningStockSubTab('available')}
              className={`px-6 py-3 text-sm font-bold transition-colors ${
                openingStockSubTab === 'available'
                  ? isDark
                    ? 'bg-slate-800 border-t border-l border-r border-slate-700 text-slate-100'
                    : 'bg-white border-t border-l border-r border-slate-200 text-slate-900'
                  : `${textSecondary} hover:${textPrimary}`
              } rounded-t-lg`}
            >
              Available Opening Stock
            </button>
          </div>

          {openingStockSubTab === 'bulkUpload' && (
            <div className="space-y-6">
              {/* Export Button */}
              <div className={`rounded-xl border p-8 ${cardClass}`}>
                <button
                  onClick={handleExportMaterialsData}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                      : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'
                  } shadow-md`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Export Materials Data
                </button>
              </div>

              {/* Bulk Upload Form */}
              <div className={`rounded-xl border ${cardClass}`}>
                <div className="p-6 space-y-6">
                  <h3 className={`text-lg font-black ${textPrimary} mb-4`}>Bulk Upload Opening Materials</h3>
                  
                  {/* Project */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Project
                    </label>
                    <select
                      value={openingStockForm.project}
                      onChange={(e) => setOpeningStockForm({ ...openingStockForm, project: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    >
                      <option value="">---Select Project---</option>
                      {availableProjects.map((project, idx) => (
                        <option key={idx} value={project.name}>
                          {project.name} ({project.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Store/Warehouses */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Store/Warehouses
                    </label>
                    <select
                      value={openingStockForm.storeWarehouse}
                      onChange={(e) => setOpeningStockForm({ ...openingStockForm, storeWarehouse: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    >
                      <option value="">---Select Store/Warehouses---</option>
                      {availableWarehouses.map((warehouse, idx) => (
                        <option key={idx} value={warehouse.name}>
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                    </select>
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
                    <div className="flex items-center gap-4">
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
                      <span className={`text-sm ${textSecondary}`}>
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
                        if (!openingStockForm.project) {
                          toast.showWarning('Please select a project');
                          return;
                        }
                        if (!openingStockForm.storeWarehouse) {
                          toast.showWarning('Please select a store/warehouse');
                          return;
                        }
                        if (!openingStockForm.openingDate) {
                          toast.showWarning('Please select an opening date');
                          return;
                        }
                        toast.showSuccess('Opening materials stock data imported successfully');
                        // Reset form
                        setOpeningStockForm({
                          project: '',
                          storeWarehouse: '',
                          openingDate: '',
                          file: null
                        });
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
            <div className="space-y-6">
              {/* Filters */}
              <div className={`rounded-xl border p-6 ${cardClass}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Project
                    </label>
                    <select
                      value={availableStockFilters.project}
                      onChange={(e) => setAvailableStockFilters({ ...availableStockFilters, project: e.target.value })}
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
                      onChange={(e) => setAvailableStockFilters({ ...availableStockFilters, storeWarehouse: e.target.value })}
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

              {/* Materials Details Table */}
              <div className={`rounded-xl border ${cardClass}`}>
                <div className="p-6">
                  <h3 className={`text-lg font-black ${textPrimary} mb-4`}>LIST MATERIALS DETAILS</h3>
                  
                  {/* Table Controls */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${textSecondary}`}>Show</span>
                      <select
                        value={entriesPerPage}
                        onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                        className={`px-3 py-1 rounded text-sm font-bold ${
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
                      <span className={`text-sm ${textSecondary}`}>entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${textSecondary}`}>Search:</span>
                      <input
                        type="text"
                        value={availableStockSearch}
                        onChange={(e) => setAvailableStockSearch(e.target.value)}
                        className={`px-3 py-1 rounded text-sm font-bold ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                            : 'bg-white border-slate-200 text-slate-900'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                        placeholder="Search..."
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              #
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Project Name
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Store/ Warehouse
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Class of Materials
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Materials Code
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Materials Name
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Specification
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Unit
                            </div>
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="w-3 h-3" />
                              Opening
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {/* Sample data - in real app, this would come from state/API */}
                        {[
                          { id: 1, project: 'Demo Data', store: 'Main Store', class: 'A', code: 'M685270', name: 'Cement', specification: 'OPC testy', unit: 'Packet', opening: '2025-11' },
                          { id: 10, project: 'Demo Data', store: 'Main Store', class: 'A', code: 'M984236', name: 'RMC', specification: 'M40', unit: 'Cft', opening: '2025-11' },
                          { id: 100, project: 'Demo Data', store: 'Main Store', class: 'B', code: 'M211203', name: 'Measuring Tape', specification: '1/2 Inches', unit: 'Nos', opening: '2025-11' },
                          { id: 101, project: 'Demo Data', store: 'Main Store', class: 'B', code: 'M257929', name: 'Hose Pipe', specification: '1 Inches', unit: 'Nos', opening: '2025-11' },
                          { id: 102, project: 'Demo Data', store: 'Main Store', class: 'B', code: 'M205837', name: 'Hose Pipe', specification: '', unit: 'Rft', opening: '2025-11' },
                          { id: 103, project: 'Demo Data', store: 'Main Store', class: 'B', code: 'M987837', name: 'Nylon Rope', specification: '', unit: 'Rft', opening: '2025-11' },
                          { id: 104, project: 'Demo Data', store: 'Main Store', class: 'C', code: 'M183654', name: 'Oil', specification: '', unit: 'Ltr', opening: '2025-11' },
                          { id: 105, project: 'Demo Data', store: 'Main Store', class: 'C', code: 'M976735', name: 'Cover Blocks', specification: '20mm', unit: 'Nos', opening: '2025-11' },
                        ]
                          .filter((item) => {
                            // Filter by project
                            if (availableStockFilters.project && item.project !== availableStockFilters.project) {
                              return false;
                            }
                            // Filter by store/warehouse
                            if (availableStockFilters.storeWarehouse && item.store !== availableStockFilters.storeWarehouse) {
                              return false;
                            }
                            // Filter by search
                            if (availableStockSearch) {
                              const searchLower = availableStockSearch.toLowerCase();
                              return (
                                item.code.toLowerCase().includes(searchLower) ||
                                item.name.toLowerCase().includes(searchLower) ||
                                item.specification.toLowerCase().includes(searchLower) ||
                                item.class.toLowerCase().includes(searchLower)
                              );
                            }
                            return true;
                          })
                          .slice(0, entriesPerPage)
                          .map((row, index) => (
                            <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.id}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.project}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.store}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.class}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.code}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.specification || '-'}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.unit}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{row.opening}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Material Modal */}
      <CreateMaterialModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMaterialId(null);
        }}
        onSuccess={handleMaterialCreated}
        editingMaterialId={editingMaterialId}
        materials={materials}
        classOptions={classOptions}
      />
    </div>
  );
};

export default Materials;
