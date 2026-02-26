'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';
import { 
  FolderKanban,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Plus,
  X,
  Upload,
  Users,
  Download,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import CreateProjectModal from './Modals/CreateProjectModal';

type SortFilterType = 'none' | 'recent_created' | 'oldest_created' | 'recent_updated' | 'oldest_updated';

interface Project {
  id: string; // For display/UI purposes (can be uuid or id)
  numericId?: number | string; // Original numeric ID from database for API calls
  uuid?: string; // UUID if available
  name: string;
  code: string;
  company: string;
  companyId?: string; // Store company ID for lookup
  companyLogo: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  budget?: string;
  location: string;
  logo: string;
  teamSize?: number;
  createdAt?: string;
  updatedAt?: string;
  isContractor?: boolean;
  projectManager?: string;
  azure_folder_path?: string; // Azure Blob Storage folder path for documents
}

interface ProjectsProps {
  theme: ThemeType;
}

const Projects: React.FC<ProjectsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sortFilter, setSortFilter] = useState<SortFilterType>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectData, setEditingProjectData] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch projects from API
  const fetchProjects = async () => {
    console.log('🔵 fetchProjects() called');
    console.log('isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.warn('⚠️ Not authenticated, clearing projects');
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }
    
    setIsLoadingProjects(true);
    setProjectsError(null);
    try {
      console.log('📡 Fetching projects from API...');
      const fetchedProjects = await masterDataAPI.getProjects();
      console.log('✅ Fetched projects from API:', fetchedProjects);
      console.log('Number of projects:', fetchedProjects?.length || 0);
      console.log('Type:', typeof fetchedProjects, 'Is array:', Array.isArray(fetchedProjects));
      
      if (!Array.isArray(fetchedProjects)) {
        console.error('❌ API did not return an array:', fetchedProjects);
        setProjects([]);
        setProjectsError('Invalid response format from API');
        return;
      }
      
      // Store raw projects for company lookup
      setRawProjects(fetchedProjects);
      
      // Transform API response to match Project interface
      const transformedProjects = fetchedProjects.map((p: any, index: number) => {
        // Store companies_id for later lookup - keep original format (number or string)
        // API returns companies_id as numeric ID
        // Also check nested companies object (API response includes companies: { id: 109, registration_name: "vj", ... })
        const companiesId = p.companies_id || p.companies?.id || p.company_id || '';
        const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
        const companyLogo = p.companies?.logo || p.company_logo || '';
        
        // Preserve original numeric ID for API calls (backend expects numeric id)
        // API returns: { id: 107, uuid: "ecfa3c96-..." }
        const numericId = p.id; // This is the numeric ID from database (e.g., 107)
        const uuid = p.uuid; // UUID if available (e.g., "ecfa3c96-...")
        
        // Ensure companiesId is stored as string for consistent matching
        const companyIdForStorage = companiesId ? String(companiesId) : '';
        
        const transformed = {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store original numeric ID for API calls (MUST be numeric)
          uuid: uuid, // Store UUID if available
          name: p.project_name || p.name || '',
          code: p.code || '',
          company: companyName, // Use company name from nested companies object or fallback
          companyId: companyIdForStorage, // Store company ID as string for lookup
          companyLogo: companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=64`,
          startDate: p.planned_start_date || p.start_date || p.startDate || '',
          endDate: p.planned_end_date || p.end_date || p.endDate || '',
          status: (() => {
            const s = (p.status || 'Pending').toString();
            if (['Closed', 'Pending', 'Completed', 'Ongoing'].includes(s)) return s;
            if (s === 'Planning' || s === 'planning') return 'Pending';
            if (s === 'In Progress' || s === 'in progress') return 'Ongoing';
            return s || 'Pending';
          })(),
          progress: p.progress || 0,
          budget: p.budget,
          location: p.address || p.location || '',
          logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name || p.name || '')}&background=6366f1&color=fff&size=128`,
          teamSize: p.team_size || p.teamSize,
          createdAt: p.created_at || p.createdAt,
          updatedAt: p.updated_at || p.updatedAt,
          isContractor: p.own_project_or_contractor === 'yes' || p.is_contractor || p.isContractor,
          projectManager: p.project_manager || p.projectManager,
          azure_folder_path: p.azure_folder_path || p.azureFolderPath, // Store Azure folder path for document management
        };
        console.log(`Project ${index + 1}:`, {
          id: transformed.id,
          name: transformed.name,
          company: transformed.company,
          companyId: transformed.companyId,
          companyIdType: typeof transformed.companyId,
          rawCompaniesId: p.companies_id,
          rawCompanyId: p.company_id,
          nestedCompaniesId: p.companies?.id,
          nestedCompanyName: p.companies?.registration_name,
          rawCompaniesIdType: typeof p.companies_id,
          startDate: transformed.startDate
        });
        return transformed;
      });
      
      console.log('✅ Transformed projects:', transformedProjects);
      console.log('Setting projects state with', transformedProjects.length, 'projects');
      
      // Log Azure folder paths for debugging
      transformedProjects.forEach((project, index) => {
        if (project.azure_folder_path) {
          console.log(`📁 Project ${index + 1} (${project.name}) Azure folder:`, project.azure_folder_path);
        } else {
          console.warn(`⚠️ Project ${index + 1} (${project.name}) missing azure_folder_path`);
        }
      });
      
      setProjects(transformedProjects);
    } catch (err: any) {
      console.error('❌ Failed to fetch projects:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setProjectsError(err.message || 'Failed to load projects');
      setProjects([]);
      toast.showError(err.message || 'Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
      console.log('🔵 fetchProjects() completed');
    }
  };

  // Fetch companies to match with projects
  const fetchCompanies = async () => {
    if (!isAuthenticated) {
      setAllCompanies([]);
      return;
    }
    
    try {
      console.log('📦 Fetching companies for project company name lookup...');
      const companies = await masterDataAPI.getCompanies();
      console.log('✅ Fetched companies:', companies?.length || 0);
      setAllCompanies(companies || []);
    } catch (error: any) {
      console.error('Failed to fetch companies for project lookup:', error);
      setAllCompanies([]);
    }
  };

  // Load projects from API on mount and when auth changes
  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search projects using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all projects
      await fetchProjects();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchProjects(query);
      // Transform API response to match Project interface
      const transformedProjects = searchResults.map((p: any) => {
        // Store companies_id for later lookup - keep original format
        // Also check nested companies object (API response includes companies: { id: 109, registration_name: "vj", ... })
        const companiesId = p.companies_id || p.companies?.id || p.company_id || '';
        const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
        const companyLogo = p.companies?.logo || p.company_logo || '';
        
        // Preserve original numeric ID for API calls
        const numericId = p.id; // Numeric ID from database
        const uuid = p.uuid; // UUID if available
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store original numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: p.project_name || p.name || '',
          code: p.code || '',
          company: companyName, // Use company name from nested companies object or fallback
          companyId: companiesId ? String(companiesId) : '', // Store company ID as string for lookup
          companyLogo: companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=64`,
          startDate: p.planned_start_date || p.start_date || p.startDate || '',
          endDate: p.planned_end_date || p.end_date || p.endDate || '',
          status: (() => {
            const s = (p.status || 'Pending').toString();
            if (['Closed', 'Pending', 'Completed', 'Ongoing'].includes(s)) return s;
            if (s === 'Planning' || s === 'planning') return 'Pending';
            if (s === 'In Progress' || s === 'in progress') return 'Ongoing';
            return s || 'Pending';
          })(),
          progress: p.progress || 0,
          budget: p.budget,
          location: p.address || p.location || '',
          logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name || p.name || '')}&background=6366f1&color=fff&size=128`,
          teamSize: p.team_size || p.teamSize,
          createdAt: p.created_at || p.createdAt,
          updatedAt: p.updated_at || p.updatedAt,
          isContractor: p.own_project_or_contractor === 'yes' || p.is_contractor || p.isContractor,
          projectManager: p.project_manager || p.projectManager,
        };
      });
      setProjects(transformedProjects);
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
        fetchProjects();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleProjectStatusChange = async (projectId: string, newStatus: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const previousStatus = proj.status;
    setProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
    );
    try {
      const updateId = proj.numericId ?? proj.id;
      if (!updateId) return;
      const formData = new FormData();
      formData.append('projectUpdateId', String(updateId));
      formData.append('project_name', proj.name || '');
      formData.append('address', proj.location || '');
      formData.append('planned_start_date', proj.startDate || '');
      formData.append('planned_end_date', proj.endDate || '');
      formData.append('companies_id', (proj as any).companyId || (proj as any).companies_id || '');
      formData.append('own_project_or_contractor', proj.isContractor ? 'yes' : 'no');
      formData.append('status', newStatus);
      await masterDataAPI.updateProject(String(updateId), formData);
      toast.showSuccess('Project status updated');
    } catch (error: any) {
      setProjects(prev =>
        prev.map(p => p.id === projectId ? { ...p, status: previousStatus } : p)
      );
      toast.showError(error.message || 'Failed to update project status');
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProjectId(project.id);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setViewingProjectId(null);
    setEditingProjectId(null);
  };

  const handleEditProject = async (project: Project) => {
    console.log('📝 Editing project:', {
      id: project.id,
      numericId: project.numericId,
      uuid: project.uuid,
      name: project.name,
      idType: typeof project.id,
      numericIdType: typeof project.numericId
    });
    setViewingProjectId(null);
    
    // Backend edit() uses where('id', $uuid) - expects numeric ID in URL, despite route param name
    const projectIdForApi = project.numericId ?? project.id;
    if (projectIdForApi == null || projectIdForApi === '') {
      toast.showError('Invalid project ID. Cannot edit project.');
      return;
    }
    
    console.log('Using project ID for edit API:', projectIdForApi, 'Type:', typeof projectIdForApi);
    
    // Fetch project details (GET /project-edit/{id} - backend queries by numeric id)
    try {
      const projectData = await masterDataAPI.getProject(String(projectIdForApi));
      console.log('✅ Fetched project data for editing:', projectData);
      
      // Store project data and numeric ID for the modal
      setEditingProjectId(project.id); // Keep UUID for display
      
      // Extract companies_id from projectData (API returns it)
      const companiesId = projectData.companies_id || 
                         projectData.company_id || 
                         project.companyId || 
                         '';
      
      console.log('🏢 Company ID extracted from project data:', {
        companies_id: projectData.companies_id,
        company_id: projectData.company_id,
        projectCompanyId: project.companyId,
        finalCompaniesId: companiesId
      });
      
      // Store ALL project data from API response to preserve all fields for editing
      setEditingProjectData({
        ...projectData, // Include all fields from API response
        uuid: project.uuid || project.id,
        numericId: project.numericId ?? projectData.id, // Store numeric ID for update
        companies_id: companiesId, // Ensure companies_id is included
        companyId: companiesId, // Also set companyId for compatibility
        // Map API field names to form-friendly names
        name: projectData.project_name || projectData.name || project.name || '',
        location: projectData.address || projectData.location || project.location || '',
        startDate: projectData.planned_start_date || projectData.start_date || project.startDate || '',
        endDate: projectData.planned_end_date || projectData.end_date || project.endDate || '',
        isContractor: projectData.own_project_or_contractor === 'yes' || projectData.is_contractor || project.isContractor || false,
        logo: projectData.logo || project.logo || '',
        // Preserve all other fields from API response
        code: projectData.code || project.code || '',
        status: (() => {
          const s = (projectData.status || project.status || 'Pending').toString();
          if (['Closed', 'Pending', 'Completed', 'Ongoing'].includes(s)) return s;
          if (s === 'Planning' || s === 'planning') return 'Pending';
          if (s === 'In Progress' || s === 'in progress') return 'Ongoing';
          return s || 'Pending';
        })(),
        progress: projectData.progress || project.progress || 0,
        projectManager: projectData.project_manager || project.projectManager || ''
      });
      
      console.log('✅ Stored editing project data with all fields:', {
        ...projectData,
        numericId: project.numericId ?? projectData.id,
        companies_id: companiesId
      });
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch project details:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      const errorMsg = error.message || 'Failed to load project details from server';
      toast.showError(errorMsg);
    }
  };

  const handleDeleteProject = async (projectId: string | null) => {
    console.log('🗑️ handleDeleteProject called with projectId:', projectId);
    
    if (!projectId) {
      console.error('❌ No projectId provided');
      toast.showError('No project selected for deletion.');
      return;
    }
    
    // Find the project to get its numeric ID
    console.log('🗑️ Searching for project with id:', projectId);
    console.log('🗑️ Available project IDs:', projects.map(p => ({ id: p.id, numericId: p.numericId, name: p.name })));
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      console.error('❌ Project not found:', projectId);
      console.error('❌ Available projects:', projects);
      toast.showError('Project not found. Please refresh the page and try again.');
      return;
    }
    
    console.log('✅ Project found:', project);
    
    // Backend delete function likely uses: where('id', $uuid) which queries the numeric 'id' column
    // So we need to send the numeric ID, not the UUID
    let numericId: number | string | null = project.numericId ?? null;
    
    // Fallback: if numericId is not set, try to extract from projectId
    if (!numericId) {
      // Check if projectId is numeric (not a UUID)
      if (projectId && !isNaN(Number(projectId)) && !projectId.includes('-')) {
        numericId = Number(projectId);
        console.warn('⚠️ Using projectId as numericId:', numericId);
      } else {
        console.error('❌ No numeric ID found for project:', {
          project,
          id: project.id,
          numericId: project.numericId,
          uuid: project.uuid
        });
        toast.showError('Invalid project ID. Cannot delete project. Please refresh the page.');
        return;
      }
    }
    
    console.log('🗑️ Deleting project - Numeric ID extraction:', {
      projectId, // The ID used to find the project
      numericId, // The numeric ID to send to API
      projectName: project.name,
      numericIdType: typeof numericId,
      projectDetails: {
        id: project.id, // Display ID (UUID if available)
        uuid: project.uuid, // UUID from API response
        numericId: project.numericId, // Numeric ID from database
        name: project.name
      },
      validation: {
        hasNumericId: !!project.numericId,
        numericIdValue: project.numericId,
        extractedNumericId: numericId,
        isNumericIdValid: numericId !== null && numericId !== undefined
      }
    });
    
    if (!numericId || (typeof numericId === 'number' && isNaN(numericId))) {
      console.error('❌ Invalid numeric ID for project:', {
        project,
        extractedNumericId: numericId,
        projectNumericId: project.numericId,
        projectId: projectId
      });
      toast.showError('Invalid project ID. Cannot delete project. Please refresh the page.');
      return;
    }
    
    try {
      // Backend route: DELETE /projects/{uuid} or /project-delete/{uuid}
      // But backend function likely uses where('id', $uuid) which queries numeric 'id' column
      // So we send the numeric ID even though route parameter is named {uuid}
      console.log('🗑️ Calling delete API with numeric ID:', numericId);
      await masterDataAPI.deleteProject(String(numericId));
      console.log('✅ Project deleted successfully');
      
      // Refresh projects list
      await fetchProjects();
      setDeleteConfirmId(null);
      if (viewingProjectId === projectId) {
        setViewingProjectId(null);
        setShowProjectModal(false);
      }
      toast.showSuccess('Project deleted successfully!');
    } catch (error: any) {
      console.error('❌ Error deleting project:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        fullError: error
      });
      
      const errorMsg = error.message || 
                      error.response?.data?.message ||
                      error.response?.data?.error ||
                      'Failed to delete project. Please try again.';
      toast.showError(errorMsg);
    }
  };

  const handleProjectCreated = async (newProject: Project) => {
    try {
      // Save project via API
      const projectData = {
        name: newProject.name,
        code: newProject.code,
        company: newProject.company,
        start_date: newProject.startDate,
        end_date: newProject.endDate,
        status: newProject.status,
        progress: newProject.progress,
        budget: newProject.budget,
        location: newProject.location,
        is_contractor: newProject.isContractor,
        project_manager: newProject.projectManager,
      };

      const response = await masterDataAPI.createProject(projectData);
      toast.showSuccess('Project created successfully!');
      
      // Refresh projects list
      await fetchProjects();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      toast.showError(err.message || 'Failed to create project');
    }
  };

  // Use API projects
  const allProjects = useMemo(() => {
    console.log('📊 allProjects useMemo - projects:', projects);
    console.log('Number of projects:', projects.length);
    return [...projects];
  }, [projects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-trigger')) {
        setShowFilterDropdown(false);
      }
      if (!target.closest('.status-dropdown') && !target.closest('.status-trigger')) {
        setOpenStatusDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Memoize filtered and sorted projects - recent (created/updated) appear on top
  const filteredAndSortedProjects = useMemo(() => {
    const parseDate = (val: string | undefined, fallback: number): number => {
      if (!val) return fallback;
      const ts = new Date(String(val).trim()).getTime();
      return Number.isNaN(ts) ? fallback : ts;
    };
    const getIdAsNumber = (p: Project): number => {
      const n = p.numericId ?? p.id;
      if (n == null) return 0;
      const num = typeof n === 'number' ? n : parseInt(String(n), 10);
      return Number.isNaN(num) ? 0 : num;
    };
    const getCreatedAt = (p: Project) => (p as any).created_at ?? p.createdAt;
    const getUpdatedAt = (p: Project) => (p as any).updated_at ?? p.updatedAt;

    let filtered = [...allProjects];

    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortFilter === 'recent_created') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = parseDate(getCreatedAt(a), -1);
        const dateB = parseDate(getCreatedAt(b), -1);
        if (dateA >= 0 && dateB >= 0) return dateB - dateA;
        if (dateA >= 0) return -1;
        if (dateB >= 0) return 1;
        return getIdAsNumber(b) - getIdAsNumber(a);
      });
    } else if (sortFilter === 'oldest_created') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = parseDate(getCreatedAt(a), Infinity);
        const dateB = parseDate(getCreatedAt(b), Infinity);
        if (dateA < Infinity && dateB < Infinity) return dateA - dateB;
        if (dateA < Infinity) return -1;
        if (dateB < Infinity) return 1;
        return getIdAsNumber(a) - getIdAsNumber(b);
      });
    } else if (sortFilter === 'recent_updated') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = parseDate(getUpdatedAt(a), -1);
        const dateB = parseDate(getUpdatedAt(b), -1);
        if (dateA >= 0 && dateB >= 0) return dateB - dateA;
        if (dateA >= 0) return -1;
        if (dateB >= 0) return 1;
        return getIdAsNumber(b) - getIdAsNumber(a);
      });
    } else if (sortFilter === 'oldest_updated') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = parseDate(getUpdatedAt(a), Infinity);
        const dateB = parseDate(getUpdatedAt(b), Infinity);
        if (dateA < Infinity && dateB < Infinity) return dateA - dateB;
        if (dateA < Infinity) return -1;
        if (dateB < Infinity) return 1;
        return getIdAsNumber(a) - getIdAsNumber(b);
      });
    }

    return filtered;
  }, [searchQuery, sortFilter, allProjects, isSearching]);

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Project Name', 'Code', 'Company', 'Address', 'Is Contractor', 'Planned Start Date', 'Planned End Date', 'Project Manager', 'Status'];
    const rows = filteredAndSortedProjects.map((project, idx) => [
      idx + 1,
      project.name,
      project.code,
      project.company,
      project.location || '-',
      project.isContractor ? 'Yes' : 'No',
      project.startDate || '-',
      project.endDate || '-',
      project.projectManager || '-',
      project.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header: 1. Icon + Heading, 2. Description, 3. Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Projects</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage construction projects and their details
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
              await fetchProjects();
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Refresh Projects List"
          >
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => {
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
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredAndSortedProjects.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredAndSortedProjects.filter(p => p.status !== 'Closed').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 min-w-0 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by project name..."
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
                {sortFilter === 'recent_created' && 'Recent (Created)'}
                {sortFilter === 'oldest_created' && 'Oldest (Created)'}
                {sortFilter === 'recent_updated' && 'Recent (Updated)'}
                {sortFilter === 'oldest_updated' && 'Oldest (Updated)'}
              </span>
            )}
          </button>
          {showFilterDropdown && (
            <div className={`absolute right-0 top-full mt-2 w-52 rounded-lg border shadow-lg z-20 filter-dropdown ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="py-1">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSortFilter('none'); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'none' ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSortFilter('recent_created'); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'recent_created' ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Recent (by Created)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSortFilter('oldest_created'); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'oldest_created' ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Oldest (by Created)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSortFilter('recent_updated'); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'recent_updated' ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Recent (by Updated)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSortFilter('oldest_updated'); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'oldest_updated' ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Oldest (by Updated)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingProjects && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Projects...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your projects</p>
        </div>
      )}

      {/* Error State */}
      {projectsError && !isLoadingProjects && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Error Loading Projects</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{projectsError}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-[#C2D642] hover:bg-[#A8B838] text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Projects Bars View */}
      {!isLoadingProjects && !projectsError && filteredAndSortedProjects.length > 0 ? (
        <div className="space-y-2">
          {filteredAndSortedProjects.map((project, idx) => (
            <div 
              key={project.id} 
              onClick={() => handleViewProject(project)}
              className={`rounded-lg border ${cardClass} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDark ? 'hover:border-[#C2D642]/30' : 'hover:border-[#C2D642]/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className={`text-xs font-bold ${textSecondary} flex-shrink-0 w-6`}>{idx + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={project.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=6366f1&color=fff&size=128`}
                      alt={project.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <h3 className={`text-base font-black ${textPrimary} truncate`}>{project.name}</h3>
                </div>
                <div className="relative status-dropdown ml-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenStatusDropdownId(openStatusDropdownId === project.id ? null : project.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`status-trigger flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer border-0 focus:ring-2 focus:ring-[#C2D642]/50 outline-none ${
                      isDark ? 'bg-slate-700/80 text-slate-100' : 'bg-slate-200/80 text-slate-900'
                    }`}
                  >
                    {project.status || 'Pending'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openStatusDropdownId === project.id && (
                    <div className={`absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 py-1 status-dropdown ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {['Closed', 'Pending', 'Completed', 'Ongoing'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectStatusChange(project.id, opt);
                            setOpenStatusDropdownId(null);
                          }}
                          className={`w-full flex items-center px-4 py-2 text-sm font-bold transition-colors text-left ${
                            (project.status || 'Pending').toLowerCase() === opt.toLowerCase()
                              ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                              : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isLoadingProjects && !projectsError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Projects Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first project</p>
        </div>
      ) : null}

      {/* Create Project Modal */}
      <CreateProjectModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProjectId(null);
          setEditingProjectData(null);
        }}
        onSuccess={async () => {
          setShowCreateModal(false);
          setEditingProjectId(null);
          setEditingProjectData(null);
          // Reload projects from API
          await fetchProjects();
        }}
        projectUpdateId={editingProjectData?.numericId ?? editingProjectData?.uuid ?? null}
        editingProject={editingProjectData ? {
          id: editingProjectId || '',
          name: editingProjectData.project_name || editingProjectData.name || '',
          code: editingProjectData.code || '',
          company: editingProjectData.company || editingProjectData.company_name || '',
          companyLogo: editingProjectData.company_logo || '',
          startDate: editingProjectData.planned_start_date || editingProjectData.start_date || '',
          endDate: editingProjectData.planned_end_date || editingProjectData.end_date || '',
          status: editingProjectData.status || 'Pending',
          progress: editingProjectData.progress || 0,
          location: editingProjectData.address || editingProjectData.location || '',
          logo: editingProjectData.logo || '',
          isContractor: editingProjectData.own_project_or_contractor === 'yes' || editingProjectData.is_contractor || false,
          projectManager: editingProjectData.project_manager || '',
          companies_id: editingProjectData.companies_id,
          company_id: editingProjectData.company_id,
          companyId: editingProjectData.companyId,
          ...editingProjectData, // Spread to pass all API fields (client_*, etc.)
        } : null}
        userProjects={projects}
        onProjectCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-xl border ${cardClass} shadow-2xl`}>
            <div className={`p-6 border-b border-inherit`}>
              <h2 className={`text-xl font-black ${textPrimary}`}>Delete Project</h2>
              <p className={`text-sm ${textSecondary} mt-1`}>
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
            </div>
            <div className={`flex items-center justify-end gap-3 p-6`}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('🗑️ Delete button clicked!');
                  console.log('deleteConfirmId:', deleteConfirmId);
                  if (deleteConfirmId) {
                    console.log('🗑️ Calling handleDeleteProject with:', deleteConfirmId);
                    try {
                      await handleDeleteProject(deleteConfirmId);
                    } catch (error) {
                      console.error('❌ Error in delete button onClick:', error);
                    }
                  } else {
                    console.error('❌ No deleteConfirmId set!');
                    toast.showError('No project selected for deletion.');
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Project Modal */}
      {showProjectModal && viewingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`relative w-full max-w-[min(92vw,1024px)] rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <button
              onClick={handleCloseModal}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={`flex items-center justify-between p-6 pr-14 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  Project Details
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  View project information
                </p>
              </div>
            </div>

            {/* Modal Body */}
            {(() => {
              const viewingProject = allProjects.find(p => p.id === viewingProjectId);
              if (!viewingProject) return null;
              
              // Find the company name from companies_id
              // Check both companyId field and also look in raw project data if available
              const projectCompanyId = (viewingProject as any).companyId || 
                                      (viewingProject as any).companies_id ||
                                      '';
              
              // Also check if we have company name directly from the project (from nested companies object)
              const directCompanyName = (viewingProject as any).company || '';
              
              console.log('🔍 Starting company lookup:', {
                projectId: viewingProject.id,
                projectName: viewingProject.name,
                projectCompanyId: projectCompanyId,
                projectCompanyIdType: typeof projectCompanyId,
                allCompaniesCount: allCompanies.length,
                allCompaniesLoaded: allCompanies.length > 0
              });
              
              // Try to match company by both UUID and numeric ID (handle all formats)
              let matchedCompany: any = null;
              
              if (projectCompanyId && allCompanies.length > 0) {
                matchedCompany = allCompanies.find((c: any) => {
                  // Get company identifiers
                  const companyUuid = c.uuid ? String(c.uuid).trim() : '';
                  const companyId = c.id ? String(c.id).trim() : '';
                  const companyNumericId = c.numericId ? String(c.numericId).trim() : '';
                  const projectIdStr = String(projectCompanyId).trim();
                  
                  // Try multiple matching strategies
                  const matchByUuid = companyUuid && companyUuid === projectIdStr;
                  const matchById = companyId && companyId === projectIdStr;
                  
                  // Match by numeric ID (most important - companies_id is numeric)
                  const matchByNumericId = companyNumericId && companyNumericId === projectIdStr;
                  
                  // Also try numeric comparison if both are numbers
                  const matchByNumeric = !isNaN(Number(companyId)) && 
                                        !isNaN(Number(projectIdStr)) && 
                                        Number(companyId) === Number(projectIdStr);
                  
                  // Also try matching company.id if it's numeric
                  const matchByIdNumeric = !isNaN(Number(companyId)) && 
                                          !isNaN(Number(projectIdStr)) && 
                                          Number(companyId) === Number(projectIdStr);
                  
                  const isMatch = matchByUuid || matchById || matchByNumericId || matchByNumeric || matchByIdNumeric;
                  
                  if (isMatch) {
                    console.log('✅ Company match found:', {
                      companyUuid,
                      companyId,
                      companyNumericId,
                      projectIdStr,
                      matchByUuid,
                      matchById,
                      matchByNumericId,
                      matchByNumeric,
                      matchByIdNumeric,
                      registration_name: c.registration_name
                    });
                  }
                  
                  return isMatch;
                });
              }
              
              // Prioritize registration_name for company display
              // If we have a direct company name from nested companies object, use it
              // Otherwise, try to match from companies list
              let companyName = 'Not tagged';
              if (directCompanyName && directCompanyName.trim() !== '') {
                companyName = directCompanyName;
                console.log('✅ Using direct company name from project:', companyName);
              } else if (matchedCompany) {
                companyName = matchedCompany.registration_name || matchedCompany.name || 'Not tagged';
                console.log('✅ Using matched company name:', companyName);
              } else if (viewingProject.company && viewingProject.company.trim() !== '') {
                companyName = viewingProject.company;
                console.log('✅ Using project.company fallback:', companyName);
              }
              
              const companyLogo = matchedCompany
                ? (matchedCompany.logo || matchedCompany.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=64`)
                : viewingProject.companyLogo;
              
              console.log('🔍 Project company lookup result:', {
                projectId: viewingProject.id,
                projectName: viewingProject.name,
                projectCompanyId: projectCompanyId,
                projectCompanyIdType: typeof projectCompanyId,
                allCompaniesCount: allCompanies.length,
                companiesSample: allCompanies.slice(0, 3).map((c: any) => ({
                  uuid: c.uuid,
                  id: c.id,
                  idType: typeof c.id,
                  registration_name: c.registration_name
                })),
                matchedCompany: matchedCompany ? {
                  uuid: matchedCompany.uuid,
                  id: matchedCompany.id,
                  idType: typeof matchedCompany.id,
                  registration_name: matchedCompany.registration_name
                } : 'Not found',
                companyName: companyName
              });
              
              return (
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                      <img 
                        src={viewingProject.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingProject.name)}&background=6366f1&color=fff&size=128`}
                        alt={viewingProject.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingProject.name)}&background=6366f1&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-2xl font-black ${textPrimary} mb-1`}>{viewingProject.name}</h3>
                      <p className={`text-sm font-bold ${textSecondary} uppercase tracking-wider`}>Code: {viewingProject.code}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Address */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Address
                      </label>
                      <p className={`text-sm ${textPrimary}`}>{viewingProject.location}</p>
                    </div>

                    {/* Contractor Status */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Are you contractor for this project?
                      </label>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                        viewingProject.isContractor 
                          ? 'bg-[#C2D642]/20 text-[#C2D642]' 
                          : 'bg-slate-500/20 text-slate-500'
                      }`}>
                        {viewingProject.isContractor ? 'Yes' : 'No'}
                      </span>
                    </div>

                    {/* Planned Start Date */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Planned Start Date
                      </label>
                      <p className={`text-sm font-bold ${textPrimary}`}>{viewingProject.startDate}</p>
                    </div>

                    {/* Planned End Date */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Planned End Date
                      </label>
                      <p className={`text-sm font-bold ${textPrimary}`}>{viewingProject.endDate}</p>
                    </div>

                    {/* Tag Company */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Tag Company
                      </label>
                      <div className="flex items-center gap-2">
                        <img 
                          src={companyLogo} 
                          alt={companyName}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=64`;
                          }}
                        />
                        <p className={`text-sm font-bold ${textPrimary}`}>{companyName}</p>
                      </div>
                      {projectCompanyId && (
                        <p className={`text-[10px] ${textSecondary} mt-1`}>
                          Company ID: {projectCompanyId}
                        </p>
                      )}
                    </div>

                    {/* Tag Project Manager */}
                    {viewingProject.projectManager && (
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                          Tag Project Manager
                        </label>
                        <p className={`text-sm font-bold ${textPrimary}`}>{viewingProject.projectManager}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
                Close
              </button>
              {viewingProjectId && (() => {
                const viewingProject = allProjects.find(p => p.id === viewingProjectId);
                if (!viewingProject) return null;
                return (
                  <>
                    <button
                      onClick={() => {
                        handleEditProject(viewingProject);
                        handleCloseModal();
                      }}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        console.log('🗑️ Delete button clicked from modal for project:', viewingProject.id);
                        setDeleteConfirmId(viewingProject.id);
                        handleCloseModal();
                      }}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
