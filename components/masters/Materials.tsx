'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Boxes, Download, Plus, Search, ArrowUpDown, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload, MoreVertical, Edit, Trash2 } from 'lucide-react';
import CreateMaterialModal from './Modals/CreateMaterialModal';
import { masterDataAPI } from '../../services/api';
import { getExactErrorMessage } from '../../utils/errorUtils';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface Material {
  id: string;
  numericId?: number;
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
  const [activeTab, setActiveTab] = useState<'list' | 'openingStock'>('list');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [availableStockFilters, setAvailableStockFilters] = useState({
    project: '',
    storeWarehouse: ''
  });
  const [availableStockSearch, setAvailableStockSearch] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [listEntriesPerPage, setListEntriesPerPage] = useState<number>(25);
  const [listCurrentPage, setListCurrentPage] = useState<number>(1);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const classOptions: Array<{ value: 'A' | 'B' | 'C'; label: string }> = [
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
  ];

  const [openingStockProjects, setOpeningStockProjects] = useState<Array<{ id: number; uuid: string; project_name: string }>>([]);
  const [availableStockStores, setAvailableStockStores] = useState<Array<{ id: number; uuid: string; name: string }>>([]);
  const [isLoadingOpeningStockData, setIsLoadingOpeningStockData] = useState(false);

  const availableProjects = openingStockProjects;

  // Fetch materials from API (GET /materials-list)
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
      const transformedMaterials = (fetchedMaterials || []).map((material: any) => {
        const materialClass = material.class?.value || material.class || '';
        const unitObj = material.units || material.unit;
        const unitLabel = unitObj?.unit || unitObj?.name || (typeof material.unit === 'string' ? material.unit : '') || '';
        return {
          id: material.uuid || String(material.id),
          numericId: material.id,
          uuid: material.uuid,
          class: materialClass as 'A' | 'B' | 'C',
          code: material.code || '',
          name: material.name || '',
          specification: material.specification ?? '',
          unit: unitLabel,
          unit_id: material.unit_id || unitObj?.id,
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

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Fetch projects for Opening Stock tab when active
  useEffect(() => {
    if (activeTab === 'openingStock' && isAuthenticated) {
      const load = async () => {
        setIsLoadingOpeningStockData(true);
        try {
          const projs = await masterDataAPI.getProjects();
          setOpeningStockProjects(Array.isArray(projs) ? projs.map((p: any) => ({
            id: p.id,
            uuid: p.uuid || String(p.id),
            project_name: p.project_name || p.name || ''
          })) : []);
        } catch {
          setOpeningStockProjects([]);
        } finally {
          setIsLoadingOpeningStockData(false);
        }
      };
      load();
    }
  }, [activeTab, isAuthenticated]);

  // Fetch stores for Available Opening Stock filters when project selected
  useEffect(() => {
    if (activeTab === 'openingStock' && availableStockFilters.project && isAuthenticated) {
      masterDataAPI.getProjectWiseWarehouses(availableStockFilters.project)
        .then((stores: any) => setAvailableStockStores(Array.isArray(stores) ? stores.map((s: any) => ({
          id: s.id, uuid: s.uuid || String(s.id), name: s.name || s.store_name || ''
        })) : []))
        .catch(() => setAvailableStockStores([]));
    } else {
      setAvailableStockStores([]);
    }
  }, [activeTab, availableStockFilters.project, isAuthenticated]);


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

  // Pagination for main materials list
  const listTotalPages = Math.max(1, Math.ceil(filteredMaterials.length / listEntriesPerPage));
  const listStartIndex = (listCurrentPage - 1) * listEntriesPerPage;
  const listEndIndex = Math.min(listStartIndex + listEntriesPerPage, filteredMaterials.length);
  const paginatedMaterials = filteredMaterials.slice(listStartIndex, listEndIndex);

  useEffect(() => {
    setListCurrentPage(1);
  }, [searchQuery, listEntriesPerPage]);

  const handleMaterialCreated = async () => {
    await fetchMaterials();
  };

  const handleEditMaterial = async (material: Material) => {
    const idForApi = material.numericId ?? material.id;
    try {
      await masterDataAPI.getMaterial(String(idForApi));
      setEditingMaterial(material);
      setEditingMaterialId(String(idForApi));
      setShowCreateModal(true);
    } catch (error: any) {
      toast.showError(error?.message || 'Failed to load material details');
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await masterDataAPI.deleteMaterial(String(material.numericId ?? material.id));
      toast.showSuccess('Material deleted successfully');
      await fetchMaterials();
    } catch (error: any) {
      toast.showError(error?.message || 'Failed to delete material');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownId]);

  const parseImportFile = (file: File): Promise<string[][]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) { reject(new Error('Failed to read file')); return; }
          const ext = (file.name || '').toLowerCase();
          if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
            reject(new Error('Use CSV or Excel (.xlsx, .xls)'));
            return;
          }
          const wb = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as string[][];
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      file.name?.toLowerCase().endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    });

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
        const rows = await parseImportFile(file);
        if (rows.length < 2) {
          toast.showWarning('File must have a header row and at least one data row');
          return;
        }
        const header = (rows[0] || []).map((h: unknown) => String(h || '').trim().toLowerCase());
        const dataRows = rows.slice(1);
        const classIdx = header.findIndex((h: string) => h === 'class' || h === 'material class');
        const codeIdx = header.findIndex((h: string) => h === 'code');
        const nameIdx = header.findIndex((h: string) => h === 'name' || h === 'material name');
        const specIdx = header.findIndex((h: string) => h === 'specification' || h === 'spec');
        const unitIdx = header.findIndex((h: string) => h === 'unit' || h === 'units');
        if (nameIdx < 0 || classIdx < 0 || unitIdx < 0) {
          toast.showError('File must contain: class, name, unit columns');
          return;
        }
        const units = await masterDataAPI.getUnits();
        const unitsList = Array.isArray(units) ? units : (units as any)?.data ?? [];
        const findUnitId = (val: string): number | undefined => {
          const u = (val || '').toString().trim().toLowerCase();
          const m = unitsList.find((x: any) => (x.unit || x.name || '').toString().toLowerCase() === u);
          if (m) return m.id;
          const n = parseInt(val, 10);
          return !isNaN(n) && unitsList.some((x: any) => x.id === n) ? n : undefined;
        };
        const safeStr = (v: unknown) => (v != null && v !== '') ? String(v).trim() : '';
        const validClasses = ['a', 'b', 'c'];
        const usedCodes = new Set((materials || []).map(m => (m.code || '').toLowerCase().trim()).filter(Boolean));
        let success = 0, failed = 0;
        let lastError: any = null;
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i] || [];
          const name = safeStr(row[nameIdx]);
          let cls = safeStr(row[classIdx]).toUpperCase();
          if (!validClasses.includes(cls.toLowerCase())) cls = 'A';
          const unitVal = safeStr(row[unitIdx]);
          const unitId = unitVal ? findUnitId(unitVal) : undefined;
          if (!name || !unitId) { failed++; continue; }
          let code = codeIdx >= 0 ? safeStr(row[codeIdx]) : '';
          if (code) {
            let base = code;
            let suffix = 1;
            while (usedCodes.has(code.toLowerCase())) {
              code = `${base}-${++suffix}`;
            }
            usedCodes.add(code.toLowerCase());
          }
          try {
            if (i > 0) await new Promise(r => setTimeout(r, 200));
            await masterDataAPI.createMaterial({
              class: cls,
              name,
              unit_id: unitId,
              ...(specIdx >= 0 && { specification: safeStr(row[specIdx]) }),
              ...(code && { code }),
            });
            success++;
          } catch (err: any) {
            failed++;
            lastError = err;
          }
        }
        if (success > 0) {
          toast.showSuccess(`${success} material(s) imported`);
          await fetchMaterials();
          setListCurrentPage(1);
          setSearchQuery('');
        }
        if (failed > 0 && success === 0) {
          const msg = lastError ? getExactErrorMessage(lastError) : '';
          toast.showError(msg ? `Import failed for all ${failed} row(s): ${msg}` : `Import failed for all ${failed} row(s)`);
        }
      } catch (err: any) {
        toast.showError(err.message || 'Failed to import');
      } finally {
        setIsImporting(false);
        input.value = '';
      }
    };
    input.click();
  };

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Class', 'Code', 'Name', 'Specification', 'Unit'];
    const rows = filteredMaterials.map((material, idx) => [
      idx + 1,
      material.class,
      material.code,
      material.name,
      material.specification || '',
      material.unit
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `materials_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Materials</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage construction materials inventory
          </p>
        </div>
        {activeTab === 'list' && (
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
                await fetchMaterials();
              }}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Refresh Materials List"
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
            </button>
            <button 
              onClick={handleImport}
              disabled={isImporting}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'} shadow-sm disabled:opacity-70 disabled:cursor-not-allowed`}
              title="Bulk upload materials from CSV or Excel"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importing...' : <><span className="hidden sm:inline">Bulk Upload</span><span className="sm:hidden">Bulk</span></>}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} overflow-x-auto`}>
        <div className="flex gap-1 min-w-max sm:min-w-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'list'
                ? `${textPrimary}`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <span className="hidden sm:inline">Materials List</span>
            <span className="sm:hidden">List</span>
            {activeTab === 'list' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-500`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('openingStock')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'openingStock'
                ? `${textPrimary}`
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <span className="hidden sm:inline">Opening Stock</span>
            <span className="sm:hidden">Opening</span>
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
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredMaterials.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredMaterials.filter(m => (m as any).status === 'Active').length}</p>
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

      {/* Materials Table - always show (no list API, empty) */}
      {!isLoadingMaterials && !materialsError ? (
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
                {paginatedMaterials.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.class}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.code}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.specification || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit || '-'}</td>
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
                                  handleDeleteMaterial(row);
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
              <span className={`text-sm ${textSecondary}`}>Number of rows:</span>
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
              Page {listCurrentPage} of {listTotalPages} ({filteredMaterials.length} total)
            </span>
          </div>
        </div>
      ) : null}
        </>
      )}

      {activeTab === 'openingStock' && (
        <>
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
                      onChange={(e) => setAvailableStockFilters({ ...availableStockFilters, project: e.target.value, storeWarehouse: '' })}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    >
                      <option value="">----Select Project----</option>
                      {availableProjects.map((project: any) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.project_name || project.name}
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
                      disabled={!availableStockFilters.project}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                      } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                    >
                      <option value="">----Select Store/Warehouses----</option>
                      {availableStockStores.map((warehouse: any) => (
                        <option key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name}
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
        </>
      )}

      {/* Create Material Modal */}
      <CreateMaterialModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMaterialId(null);
          setEditingMaterial(null);
        }}
        onSuccess={handleMaterialCreated}
        editingMaterialId={editingMaterialId}
        editingMaterial={editingMaterial}
        materials={materials}
        classOptions={classOptions}
      />
    </div>
  );
};

export default Materials;
