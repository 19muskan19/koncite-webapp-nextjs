'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Warehouse, MoreVertical, Plus, Search, X, Download, Edit, Trash2, MapPin, Building2, Loader2 } from 'lucide-react';
import CreateWarehouseModal from './Modals/CreateWarehouseModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface WarehouseData {
  id: string;
  numericId?: number | string; // Store numeric ID from database for API calls
  uuid?: string;
  name: string;
  code?: string;
  project?: string;
  project_id?: number;
  tag_project?: number; // API field name
  location: string;
  logo?: string;
  capacity?: string;
  status?: 'Active' | 'Inactive';
  is_active?: number;
  createdAt?: string;
}

interface WarehousesProps {
  theme: ThemeType;
}

const Warehouses: React.FC<WarehousesProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null); // UUID for display
  const [editingWarehouseNumericId, setEditingWarehouseNumericId] = useState<number | string | null>(null); // Numeric ID for API calls
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string; uuid?: string }>>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState<boolean>(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [warehousesError, setWarehousesError] = useState<string | null>(null);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch projects from API
  const fetchProjects = async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }
    
    setIsLoadingProjects(true);
    try {
      const fetchedProjects = await masterDataAPI.getProjects();
      const transformedProjects = fetchedProjects.map((project: any) => ({
        id: project.id,
        uuid: project.uuid,
        name: project.project_name || project.name || '',
      }));
      setProjects(transformedProjects);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch warehouses from API - project-wise if project is selected
  const fetchWarehouses = async (projectId?: number | string) => {
    if (!isAuthenticated) {
      setWarehouses([]);
      setIsLoadingWarehouses(false);
      return;
    }
    
    const targetProjectId = projectId || selectedProjectId;
    
    if (!targetProjectId) {
      // No project selected, clear warehouses
      setWarehouses([]);
      setIsLoadingWarehouses(false);
      return;
    }
    
    setIsLoadingWarehouses(true);
    setWarehousesError(null);
    try {
      console.log('📦 Fetching warehouses for project ID:', targetProjectId);
      // Use project-wise API when project is selected
      const fetchedWarehouses = await masterDataAPI.getProjectWiseWarehouses(targetProjectId);
      console.log('✅ Fetched warehouses:', fetchedWarehouses);
      
      // Transform API response to match WarehouseData interface
      const transformedWarehouses: WarehouseData[] = fetchedWarehouses.map((warehouse: any) => {
        // Extract project name - check both singular and plural forms
        const projectName = warehouse.projects?.project_name || 
                           warehouse.project?.project_name || 
                           warehouse.project_name || 
                           '';
        
        // Extract project ID - check multiple possible locations
        const projectId = warehouse.projects?.id || 
                         warehouse.project_id || 
                         warehouse.project?.id || 
                         warehouse.tag_project;
        
        console.log('📦 Warehouse transformation:', {
          warehouseName: warehouse.name,
          projects: warehouse.projects,
          project: warehouse.project,
          projectName: projectName,
          projectId: projectId
        });
        
        return {
          id: warehouse.uuid || String(warehouse.id), // UUID for display
          numericId: warehouse.id, // Store numeric ID from database (backend queries using numeric id)
          uuid: warehouse.uuid, // Store UUID
          name: warehouse.name || '',
          code: warehouse.code || '',
          project: projectName,
          project_id: projectId,
          tag_project: warehouse.tag_project || projectId,
          location: warehouse.location || '',
          logo: warehouse.logo || warehouse.img || '',
          status: (warehouse.is_active === 1 || warehouse.is_active === true ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: warehouse.is_active,
          createdAt: warehouse.created_at || warehouse.createdAt,
        };
      });
      console.log('✅ Transformed warehouses:', transformedWarehouses);
      setWarehouses(transformedWarehouses);
    } catch (err: any) {
      console.error('Failed to fetch warehouses:', err);
      setWarehousesError(err.message || 'Failed to load warehouses');
      setWarehouses([]);
      toast.showError(err.message || 'Failed to load warehouses');
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Load warehouses when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchWarehouses(selectedProjectId);
    } else {
      setWarehouses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, isAuthenticated]);

  // Reset search when project changes
  useEffect(() => {
    setSearchQuery('');
  }, [selectedProject]);

  // Search warehouses using API (project-wise)
  const handleSearch = async (query: string) => {
    if (!selectedProjectId) {
      setIsSearching(false);
      return;
    }

    if (!query.trim()) {
      // If search is empty, fetch warehouses for selected project
      await fetchWarehouses(selectedProjectId);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchWarehouses(query);
      // Filter search results to only show warehouses for selected project
      const projectWarehouses = searchResults.filter((warehouse: any) => {
        const warehouseProjectId = warehouse.project_id || warehouse.project?.id || warehouse.tag_project;
        return String(warehouseProjectId) === String(selectedProjectId);
      });
      
      // Transform API response to match WarehouseData interface
      const transformedWarehouses: WarehouseData[] = projectWarehouses.map((warehouse: any) => {
        // Extract project name - check both singular and plural forms (API uses "projects" plural)
        const projectName = warehouse.projects?.project_name || 
                           warehouse.project?.project_name || 
                           warehouse.project_name || 
                           '';
        
        // Extract project ID - check multiple possible locations
        const projectId = warehouse.projects?.id || 
                         warehouse.project_id || 
                         warehouse.project?.id || 
                         warehouse.tag_project;
        
        return {
          id: warehouse.uuid || String(warehouse.id), // UUID for display
          numericId: warehouse.id, // Store numeric ID from database (backend queries using numeric id)
          uuid: warehouse.uuid, // Store UUID
          name: warehouse.name || '',
          code: warehouse.code || '',
          project: projectName,
          project_id: projectId,
          tag_project: warehouse.tag_project || projectId,
          location: warehouse.location || '',
          logo: warehouse.logo || warehouse.img || '',
          status: (warehouse.is_active === 1 || warehouse.is_active === true ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: warehouse.is_active,
          createdAt: warehouse.created_at || warehouse.createdAt,
        };
      });
      setWarehouses(transformedWarehouses);
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
      if (searchQuery.trim() && selectedProjectId) {
        handleSearch(searchQuery);
      } else if (selectedProjectId) {
        fetchWarehouses(selectedProjectId);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedProjectId]);

  // Filter warehouses (client-side filtering is optional since we're using API search)
  const filteredWarehouses = useMemo(() => {
    let filtered = [...warehouses];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (warehouse.project && warehouse.project.toLowerCase().includes(searchQuery.toLowerCase())) ||
        warehouse.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [warehouses, searchQuery, isSearching]);

  const handleDownloadExcel = () => {
    const headers = ['Project', 'Warehouse Name', 'Location'];
    const rows = filteredWarehouses.map(warehouse => [
      warehouse.project,
      warehouse.name,
      warehouse.location
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
    link.setAttribute('download', `warehouses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditWarehouse = async (warehouse: WarehouseData) => {
    try {
      // Backend edit function uses where('id', $uuid) which queries numeric id column
      // So we need to use numeric ID, not UUID
      const numericId = warehouse.numericId || warehouse.id;
      
      if (!numericId) {
        toast.showError('Invalid warehouse ID. Cannot edit warehouse.');
        return;
      }
      
      console.log('📝 Editing warehouse:', {
        uuid: warehouse.uuid || warehouse.id,
        numericId: numericId,
        id: warehouse.id,
        name: warehouse.name,
        type: typeof numericId
      });
      console.log('Note: Backend uses where("id", $uuid) which queries numeric id column');
      
      // Fetch full warehouse details from API using numeric ID
      // Route: GET /store-edit/{uuid}
      // Even though route parameter is named {uuid}, backend queries numeric id column
      const warehouseDetails = await masterDataAPI.getWarehouse(String(numericId));
      console.log('✅ Fetched warehouse details:', warehouseDetails);
      
      setEditingWarehouseId(warehouse.uuid || warehouse.id); // Store UUID for modal display
      setEditingWarehouseNumericId(numericId); // Store numeric ID for API calls
      // Open modal with warehouse data - CreateWarehouseModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch warehouse details:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      toast.showError(error.message || 'Failed to load warehouse details');
    }
  };

  const handleDeleteWarehouse = async (warehouse: WarehouseData) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        // Backend delete function uses where('id', $uuid) which queries numeric id column
        // So we need to use numeric ID, not UUID
        const numericId = warehouse.numericId || warehouse.id;
        
        if (!numericId) {
          toast.showError('Invalid warehouse ID. Cannot delete warehouse.');
          return;
        }
        
        console.log('🗑️ Deleting warehouse:', {
          uuid: warehouse.uuid || warehouse.id,
          numericId: numericId,
          id: warehouse.id,
          name: warehouse.name,
          type: typeof numericId
        });
        console.log('Note: Backend uses where("id", $uuid) which queries numeric id column');
        
        // Route: DELETE /store-delete/{uuid}
        // Even though route parameter is named {uuid}, backend queries numeric id column
        await masterDataAPI.deleteWarehouse(String(numericId));
        console.log('✅ Warehouse deleted successfully');
        toast.showSuccess('Warehouse deleted successfully');
        // Refresh warehouses list for selected project
        if (selectedProjectId) {
          await fetchWarehouses(selectedProjectId);
        }
      } catch (error: any) {
        console.error('❌ Failed to delete warehouse:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status,
          response: error.response?.data
        });
        toast.showError(error.message || 'Failed to delete warehouse');
      }
    }
  };

  const handleWarehouseCreated = async () => {
    // Refresh warehouses list after create/update
    if (selectedProjectId) {
      await fetchWarehouses(selectedProjectId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Warehouse className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Warehouses</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage warehouse locations and inventory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadExcel}
            disabled={!selectedProjectId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedProjectId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className={`p-6 rounded-xl border ${cardClass}`}>
        <div className="flex items-center gap-4">
          <Building2 className={`w-5 h-5 ${textSecondary}`} />
          <div className="flex-1">
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
              Select Project
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const projectId = e.target.value;
                  const project = projects.find(p => (p.id || p.uuid) == projectId);
                  setSelectedProjectId(projectId);
                  setSelectedProject(project?.name || '');
                }}
                disabled={isLoadingProjects}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none pr-10 disabled:opacity-50`}
              >
                <option value="">{isLoadingProjects ? 'Loading projects...' : '-- Select a Project --'}</option>
                {projects.map((project: any) => (
                  <option key={project.uuid || project.id} value={project.id || project.uuid}>
                    {project.name} {project.code ? `(${project.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject && (
              <p className={`mt-3 text-sm ${textSecondary}`}>
                Showing warehouses for <span className={`font-black ${textPrimary}`}>{selectedProject}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar - Only show when project is selected */}
      {selectedProjectId && (
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search by warehouse name..."
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
      )}

      {/* Loading State */}
      {isLoadingWarehouses && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Warehouses...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your warehouses</p>
        </div>
      )}

      {/* Error State */}
      {warehousesError && !isLoadingWarehouses && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Warehouse className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Warehouses</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{warehousesError}</p>
          <button
            onClick={fetchWarehouses}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Warehouses Grid */}
      {!selectedProjectId ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Select a Project</h3>
          <p className={`text-sm ${textSecondary}`}>Please select a project from the dropdown above to view its warehouses</p>
        </div>
      ) : !isLoadingWarehouses && !warehousesError && filteredWarehouses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse) => (
            <div 
              key={warehouse.id} 
              className={`rounded-xl border p-5 transition-all ${cardClass} ${
                isDark ? 'hover:border-[#C2D642]/30 hover:shadow-lg' : 'hover:border-[#C2D642]/20 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <Warehouse className="w-5 h-5 text-[#C2D642]" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>{warehouse.name}</h3>
                    <p className={`text-xs font-bold ${textSecondary} uppercase tracking-wider`}>{warehouse.code}</p>
                  </div>
                </div>
                {warehouse.status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    warehouse.status === 'Active'
                      ? 'bg-[#C2D642]/20 text-[#C2D642]'
                      : 'bg-slate-500/20 text-slate-500'
                  }`}>
                    {warehouse.status}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <Building2 className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Project
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.project || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Location
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.location}</p>
                  </div>
                </div>
                {warehouse.capacity && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Capacity
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.capacity}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-inherit">
                <button
                  onClick={() => handleEditWarehouse(warehouse)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteWarehouse(warehouse)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !isLoadingWarehouses && !warehousesError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Warehouse className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Warehouses Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No warehouses found matching "${searchQuery}"` 
              : `No warehouses found for ${selectedProject}`}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredWarehouses.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredWarehouses.filter(w => w.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingWarehouseId(null);
          setEditingWarehouseNumericId(null);
        }}
        onSuccess={handleWarehouseCreated}
        editingWarehouseId={editingWarehouseId}
        editingWarehouseNumericId={editingWarehouseNumericId}
        warehouses={warehouses}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />
    </div>
  );
};

export default Warehouses;
