'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';
import { 
  Layers,
  FolderKanban,
  MoreVertical,
  Plus,
  Search,
  Filter,
  X,
  Download,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface Subproject {
  id: string;
  numericId?: number | string; // Store numeric ID from database for API calls
  uuid?: string; // Store UUID for display
  name: string;
  code: string;
  project: string;
  manager?: string;
  status: string;
  progress?: number;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

interface SubprojectProps {
  theme: ThemeType;
}

const Subproject: React.FC<SubprojectProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sortFilter, setSortFilter] = useState<'recent' | 'oldest' | 'none'>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showSubprojectModal, setShowSubprojectModal] = useState<boolean>(false);
  const [editingSubprojectId, setEditingSubprojectId] = useState<string | null>(null);
  const [editingSubprojectNumericId, setEditingSubprojectNumericId] = useState<number | string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState<boolean>(false);
  const [subprojectsError, setSubprojectsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    project: '',
    projectId: '',
    subprojectName: '',
    plannedStartDate: '',
    plannedEndDate: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';


  // Fetch all projects on mount
  const fetchProjects = async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }
    
    setIsLoadingProjects(true);
    try {
      console.log('📦 Fetching all projects for subproject dropdown...');
      const fetchedProjects = await masterDataAPI.getProjects();
      console.log('✅ Fetched projects:', fetchedProjects?.length || 0);
      setProjects(fetchedProjects || []);
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
      toast.showError('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-trigger')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search and filter when project changes
  useEffect(() => {
    setSearchQuery('');
    setSortFilter('none');
    setShowFilterDropdown(false);
  }, [selectedProject]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowSubprojectModal(false);
    setEditingSubprojectId(null);
    setEditingSubprojectNumericId(null);
    setFormData({
      project: '',
      projectId: '',
      subprojectName: '',
      plannedStartDate: '',
      plannedEndDate: ''
    });
  };

  // Fetch subprojects from API
  const fetchSubprojects = async (projectId: number | string) => {
    if (!isAuthenticated || !projectId) {
      setSubprojects([]);
      setIsLoadingSubprojects(false);
      return;
    }
    
    setIsLoadingSubprojects(true);
    setSubprojectsError(null);
    try {
      console.log('📦 Fetching subprojects for project ID:', projectId);
      const fetchedSubprojects = await masterDataAPI.getSubprojects(projectId);
      console.log('✅ Fetched subprojects:', fetchedSubprojects);
      
      // Transform API response to match Subproject interface
      const transformedSubprojects = fetchedSubprojects.map((sub: any) => ({
        id: sub.uuid || String(sub.id), // UUID for display
        numericId: sub.id, // Store numeric ID from database (backend queries using numeric id)
        uuid: sub.uuid || sub.id, // Store UUID
        name: sub.name || sub.subproject_name || '',
        code: sub.code || '',
        project: sub.project?.name || sub.project?.project_name || sub.project_name || '',
        manager: sub.manager || sub.project_manager || '',
        status: sub.status || 'Pending',
        progress: sub.progress || 0,
        startDate: sub.start_date || sub.planned_start_date || sub.startDate || '',
        endDate: sub.end_date || sub.planned_end_date || sub.endDate || '',
        createdAt: sub.created_at || sub.createdAt,
      }));
      console.log('✅ Transformed subprojects:', transformedSubprojects);
      setSubprojects(transformedSubprojects);
    } catch (err: any) {
      console.error('❌ Failed to fetch subprojects:', err);
      setSubprojectsError(err.message || 'Failed to load subprojects');
      setSubprojects([]);
      toast.showError(err.message || 'Failed to load subprojects');
    } finally {
      setIsLoadingSubprojects(false);
    }
  };

  // Load subprojects when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchSubprojects(selectedProjectId);
    } else {
      setSubprojects([]);
    }
  }, [selectedProjectId, isAuthenticated]);

  const handleToggleCard = (subprojectId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set<string>();
      // If clicking the same card, close it. Otherwise, open only the clicked card
      if (prev.has(subprojectId)) {
        // Close the card
        return newSet;
      } else {
        // Open only this card (close all others)
        newSet.add(subprojectId);
        return newSet;
      }
    });
  };

  const handleEditSubproject = async (subproject: Subproject) => {
    try {
      // Backend edit() likely uses where('id', $uuid) - expects numeric ID in URL, despite route param name
      const subprojectIdForApi = subproject.numericId ?? subproject.id;
      
      if (subprojectIdForApi == null || subprojectIdForApi === '') {
        toast.showError('Invalid subproject ID. Cannot edit subproject.');
        return;
      }
      
      console.log('📝 Editing subproject:', {
        idForApi: subprojectIdForApi,
        uuid: subproject.uuid,
        numericId: subproject.numericId,
        type: typeof subprojectIdForApi
      });
      
      setEditingSubprojectId(subproject.id);
      setEditingSubprojectNumericId(subproject.numericId || subproject.id);
      
      // Fetch full details - GET /sub-project-edit/{id} (backend queries by numeric id)
      let subprojectDetails: any = null;
      try {
        subprojectDetails = await masterDataAPI.getSubproject(String(subprojectIdForApi));
        console.log('✅ Fetched subproject details from API:', subprojectDetails);
      } catch (apiError: any) {
        console.error('❌ Failed to fetch subproject details from API:', apiError);
        toast.showError(apiError.message || 'Failed to load subproject details');
        return;
      }
      
      // Find the project ID from the project name or use project_id from API response
      const projectIdFromAPI = subprojectDetails?.project_id || subprojectDetails?.tag_project;
      let projectId = projectIdFromAPI;
      
      if (!projectId) {
        // Fallback: find project by name
        const project = projects.find(p => 
          p.name === subproject.project || 
          p.project_name === subproject.project ||
          String(p.id) === String(subprojectDetails?.project_id) ||
          String(p.uuid) === String(subprojectDetails?.project_id)
        );
        projectId = project?.id || project?.uuid || selectedProjectId || '';
      }
      
      // Use API data if available, otherwise use existing subproject data
      setFormData({
        project: subproject.project,
        projectId: String(projectId),
        subprojectName: subprojectDetails?.name || subprojectDetails?.subproject_name || subproject.name,
        plannedStartDate: subprojectDetails?.start_date || subprojectDetails?.planned_start_date || subprojectDetails?.startDate || subproject.startDate,
        plannedEndDate: subprojectDetails?.end_date || subprojectDetails?.planned_end_date || subprojectDetails?.endDate || subproject.endDate
      });
      setShowSubprojectModal(true);
    } catch (error: any) {
      console.error('❌ Failed to edit subproject:', error);
      toast.showError(error.message || 'Failed to load subproject details');
    }
  };

  const handleDeleteSubproject = async (subproject: Subproject) => {
    if (window.confirm('Are you sure you want to delete this subproject?')) {
      try {
        // Backend delete() likely uses where('id', $uuid) - expects numeric ID in URL
        const subprojectIdForApi = subproject.numericId ?? subproject.id;
        
        if (subprojectIdForApi == null || subprojectIdForApi === '') {
          toast.showError('Invalid subproject ID. Cannot delete subproject.');
          return;
        }
        
        console.log('🗑️ Deleting subproject:', {
          idForApi: subprojectIdForApi,
          numericId: subproject.numericId,
          type: typeof subprojectIdForApi
        });
        
        // DELETE /sub-project-delete/{id} (backend queries by numeric id)
        await masterDataAPI.deleteSubproject(String(subprojectIdForApi));
        console.log('✅ Subproject deleted successfully');
        toast.showSuccess('Subproject deleted successfully');
        // Refresh subprojects list
        if (selectedProjectId) {
          await fetchSubprojects(selectedProjectId);
        }
      } catch (error: any) {
        console.error('❌ Failed to delete subproject:', error);
        toast.showError(error.message || 'Failed to delete subproject');
      }
    }
  };

  const handleCreateSubproject = async () => {
    const missingFields: string[] = [];
    
    if (!formData.projectId) missingFields.push('Select Project');
    if (!formData.subprojectName.trim()) missingFields.push('Subproject Name');
    if (!formData.plannedStartDate) missingFields.push('Planned Start Date');
    if (!formData.plannedEndDate) missingFields.push('Planned End Date');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (new Date(formData.plannedEndDate) < new Date(formData.plannedStartDate)) {
      toast.showWarning('Please enter appropriate end date. End date must be greater than or equal to start date.');
      return;
    }

    try {
      const subprojectData = {
        name: formData.subprojectName.trim(),
        start_date: formData.plannedStartDate,
        end_date: formData.plannedEndDate,
        tag_project: formData.projectId,
      };

      console.log('📝 Creating/updating subproject:', {
        editing: !!editingSubprojectId,
        data: subprojectData
      });

      if (editingSubprojectId && editingSubprojectNumericId) {
        // Use numeric ID for update (backend expects numeric id even though route uses {uuid})
        console.log('📝 Updating subproject with numeric ID:', editingSubprojectNumericId);
        await masterDataAPI.updateSubproject(String(editingSubprojectNumericId), subprojectData);
        toast.showSuccess('Subproject updated successfully');
      } else {
        await masterDataAPI.createSubproject(subprojectData);
        toast.showSuccess('Subproject created successfully');
      }

      // Refresh subprojects list
      if (selectedProjectId) {
        await fetchSubprojects(selectedProjectId);
      }

      handleCloseModal();
    } catch (error: any) {
      console.error('❌ Failed to save subproject:', error);
      toast.showError(error.message || 'Failed to save subproject');
    }
  };

  // Search subprojects using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all subprojects for selected project
      if (selectedProjectId) {
        await fetchSubprojects(selectedProjectId);
      }
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Searching subprojects with query:', query, 'projectId:', selectedProjectId);
      const searchResults = await masterDataAPI.searchSubprojects(query, selectedProjectId || undefined);
      console.log('✅ Search results:', searchResults);
      
      // Transform API response to match Subproject interface
      const transformedSubprojects = searchResults.map((sub: any) => ({
        id: sub.uuid || String(sub.id), // UUID for display
        numericId: sub.id, // Store numeric ID from database (backend queries using numeric id)
        uuid: sub.uuid || sub.id, // Store UUID
        name: sub.name || sub.subproject_name || '',
        code: sub.code || '',
        project: sub.project?.name || sub.project?.project_name || sub.project_name || '',
        manager: sub.manager || sub.project_manager || '',
        status: sub.status || 'Pending',
        progress: sub.progress || 0,
        startDate: sub.start_date || sub.planned_start_date || sub.startDate || '',
        endDate: sub.end_date || sub.planned_end_date || sub.endDate || '',
        createdAt: sub.created_at || sub.createdAt,
      }));
      console.log('✅ Transformed search results:', transformedSubprojects);
      setSubprojects(transformedSubprojects);
    } catch (error: any) {
      console.error('❌ Search failed:', error);
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
      } else if (selectedProjectId) {
        fetchSubprojects(selectedProjectId);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Memoize filtered and sorted subprojects
  const filteredAndSortedSubprojects = useMemo(() => {
    if (!selectedProjectId) return [];
    
    let filtered = [...subprojects];

    // Client-side filtering is optional since we're using API search
    // But keep it for sorting
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(subproject =>
        subproject.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort filter
    if (sortFilter === 'recent') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else if (sortFilter === 'oldest') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB; // Oldest first
      });
    }

    return filtered;
  }, [subprojects, searchQuery, sortFilter, selectedProjectId, isSearching]);

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Subproject Name', 'Code', 'Project', 'Planned Start Date', 'Planned End Date', 'Status'];
    const rows = filteredAndSortedSubprojects.map((subproject, idx) => [
      idx + 1,
      subproject.name,
      subproject.code,
      subproject.project,
      subproject.startDate || '-',
      subproject.endDate || '-',
      subproject.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subprojects');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `subprojects_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Layers className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Subproject</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage subprojects within main projects
            </p>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className={`p-6 rounded-xl border ${cardClass}`}>
        <div className="flex items-center gap-4">
          <FolderKanban className={`w-5 h-5 ${textSecondary}`} />
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
                  setSelectedProject(project?.name || project?.project_name || '');
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
                    {project.name || project.project_name} {project.code ? `(${project.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject && (
              <p className={`mt-3 text-sm ${textSecondary}`}>
                Showing subprojects for <span className={`font-black ${textPrimary}`}>{selectedProject}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add New Button and Search/Filter Bar - Only show when project is selected */}
      {selectedProjectId && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
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
                onClick={async () => {
                  console.log('🔄 Manual refresh triggered');
                  setSearchQuery('');
                  if (selectedProjectId) {
                    await fetchSubprojects(selectedProjectId);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                } shadow-sm`}
                title="Refresh Subprojects List"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button 
                onClick={() => {
                  setFormData({
                    ...formData,
                    project: selectedProject,
                    projectId: String(selectedProjectId)
                  });
                  setShowSubprojectModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
              >
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredAndSortedSubprojects.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredAndSortedSubprojects.filter(s => s.status === 'Active' || s.status === 'In Progress').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
              <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input 
                type="text" 
                placeholder="Search by subproject name..."
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
            <div className="relative filter-dropdown">
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all filter-trigger ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              >
                <Filter className="w-4 h-4" /> 
                Filter
                {sortFilter !== 'none' && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'}`}>
                    {sortFilter === 'recent' ? 'Recent' : 'Oldest'}
                  </span>
                )}
              </button>
              {showFilterDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg z-20 filter-dropdown ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSortFilter('none');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                        sortFilter === 'none'
                          ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                          : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        setSortFilter('recent');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                        sortFilter === 'recent'
                          ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                          : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => {
                        setSortFilter('oldest');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                        sortFilter === 'oldest'
                          ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                          : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      Oldest
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Subprojects Cards */}
      {!selectedProjectId ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Select a Project</h3>
          <p className={`text-sm ${textSecondary}`}>Please select a project from the dropdown above to view its subprojects</p>
        </div>
      ) : isLoadingSubprojects ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642] mx-auto mb-4"></div>
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Subprojects...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch subprojects</p>
        </div>
      ) : subprojectsError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Subprojects</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{subprojectsError}</p>
          <button
            onClick={() => selectedProjectId && fetchSubprojects(selectedProjectId)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredAndSortedSubprojects.length > 0 ? (
        <div className="space-y-3">
          {filteredAndSortedSubprojects.map((subproject) => {
            const isExpanded = expandedCards.has(subproject.id);
            return (
              <div 
                key={subproject.id} 
                className={`rounded-lg border overflow-hidden transition-all shadow-sm ${
                  isExpanded 
                    ? isDark 
                      ? 'border-[#C2D642]/50 bg-slate-800/50' 
                      : 'border-[#C2D642]/30 bg-white'
                    : isDark 
                      ? 'border-slate-700 bg-slate-800/30 hover:border-slate-600' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div 
                  className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isDark 
                      ? isExpanded 
                        ? 'bg-slate-700' 
                        : 'bg-slate-800 hover:bg-slate-750'
                      : isExpanded
                        ? 'bg-slate-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                  onClick={() => handleToggleCard(subproject.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      isExpanded 
                        ? 'bg-[#C2D642]/20' 
                        : 'bg-white/10'
                    }`}>
                      <Layers className={`w-6 h-6 ${isExpanded ? 'text-[#C2D642]' : 'text-white'}`} />
                    </div>
                    <h3 className={`text-lg font-bold text-white truncate`}>{subproject.name}</h3>
                    {subproject.status && !isExpanded && (
                      <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        subproject.status === 'Active' || subproject.status === 'In Progress'
                          ? 'bg-[#C2D642]/30 text-[#C2D642]'
                          : subproject.status === 'Completed'
                          ? 'bg-blue-500/30 text-blue-300'
                          : 'bg-slate-500/30 text-slate-300'
                      }`}>
                        {subproject.status}
                      </span>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>

                {/* Card Body */}
                {isExpanded && (
                  <div className={`p-5 space-y-4 animate-in slide-in-from-top-2 duration-200 ${
                    isDark ? 'bg-slate-800/80' : 'bg-slate-50'
                  }`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                          Project Name
                        </p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{subproject.project}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                          Sub-Project Name
                        </p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{subproject.name}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                          Start Date
                        </p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{subproject.startDate}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                          End Date
                        </p>
                        <p className={`text-sm font-bold ${textPrimary}`}>{subproject.endDate}</p>
                      </div>
                      {subproject.code && (
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                            Code
                          </p>
                          <p className={`text-sm font-bold ${textPrimary}`}>{subproject.code}</p>
                        </div>
                      )}
                      {subproject.status && (
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                            Status
                          </p>
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
                            subproject.status === 'Active' || subproject.status === 'In Progress'
                              ? 'bg-[#C2D642]/20 text-[#C2D642]'
                              : subproject.status === 'Completed'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {subproject.status}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-inherit">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSubproject(subproject);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubproject(subproject);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
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
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Layers className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Subprojects Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No subprojects found matching "${searchQuery}"` 
              : `No subprojects found for ${selectedProject}`}
          </p>
        </div>
      )}

      {/* Add Subproject Modal */}
      {showSubprojectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  {editingSubprojectId ? 'Edit Subproject' : 'Add New Subproject'}
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  {editingSubprojectId ? 'Update subproject details below' : 'Enter subproject details below'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Select Project */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Select Project <span className="text-red-500">*</span>
                </label>
                <select
                  name="projectId"
                  value={formData.projectId}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    const project = projects.find(p => (p.id || p.uuid) == projectId);
                    setFormData({
                      ...formData,
                      projectId: projectId,
                      project: project?.name || project?.project_name || ''
                    });
                  }}
                  disabled={isLoadingProjects}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                >
                  <option value="">{isLoadingProjects ? 'Loading projects...' : '-- Select Project --'}</option>
                  {projects.map((project: any) => (
                    <option key={project.uuid || project.id} value={project.id || project.uuid}>
                      {project.name || project.project_name} {project.code ? `(${project.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subproject Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Subproject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subprojectName"
                  value={formData.subprojectName}
                  onChange={handleInputChange}
                  placeholder="Enter subproject name"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Planned Start Date */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Planned Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="plannedStartDate"
                  value={formData.plannedStartDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Planned End Date */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Planned End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="plannedEndDate"
                  value={formData.plannedEndDate}
                  onChange={handleInputChange}
                  min={formData.plannedStartDate}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
              <button
                onClick={handleCloseModal}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubproject}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md"
              >
                {editingSubprojectId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subproject;
