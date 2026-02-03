'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { masterDataAPI } from '../../services/api';
import { 
  FolderKanban,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  MoreVertical,
  Search,
  Filter,
  Plus,
  X,
  Upload,
  Users,
  Download,
  Loader2
} from 'lucide-react';
import CreateProjectModal from './Modals/CreateProjectModal';

interface Project {
  id: string;
  name: string;
  code: string;
  company: string;
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
  isContractor?: boolean;
  projectManager?: string;
}

interface ProjectsProps {
  theme: ThemeType;
}

const Projects: React.FC<ProjectsProps> = ({ theme }) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortFilter, setSortFilter] = useState<'recent' | 'oldest' | 'none'>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Dummy data for dropdowns

  const defaultProjects: Project[] = [
    { 
      id: '1',
      name: 'Residential Complex A', 
      code: 'PRJ001', 
      company: 'ABC Construction Ltd',
      companyLogo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64',
      startDate: '2024-01-15',
      endDate: '2024-12-31',
      status: 'In Progress',
      progress: 65,
      location: '123 Main Street, New York, NY 10001',
      logo: 'https://ui-avatars.com/api/?name=Residential+Complex&background=6366f1&color=fff&size=128',
      isContractor: true,
      projectManager: 'John Doe',
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    { 
      id: '2',
      name: 'Commercial Tower B', 
      code: 'PRJ002', 
      company: 'XYZ Builders Inc',
      companyLogo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64',
      startDate: '2024-02-20',
      endDate: '2025-06-30',
      status: 'Planning',
      progress: 15,
      location: '456 Oak Avenue, Los Angeles, CA 90001',
      logo: 'https://ui-avatars.com/api/?name=Commercial+Tower&background=10b981&color=fff&size=128',
      isContractor: false,
      projectManager: 'Jane Smith',
      createdAt: '2024-02-20T00:00:00.000Z'
    },
    { 
      id: '3',
      name: 'Highway Infrastructure Project', 
      code: 'PRJ003', 
      company: 'ABC Construction Ltd',
      companyLogo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64',
      startDate: '2024-03-01',
      endDate: '2025-11-15',
      status: 'In Progress',
      progress: 42,
      location: '789 Business Park, Chicago, IL 60601',
      logo: 'https://ui-avatars.com/api/?name=Highway+Infrastructure&background=f59e0b&color=fff&size=128',
      isContractor: true,
      projectManager: 'John Doe',
      createdAt: '2024-03-01T00:00:00.000Z'
    },
    { 
      id: '4',
      name: 'Shopping Mall Development', 
      code: 'PRJ004', 
      company: 'XYZ Builders Inc',
      companyLogo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64',
      startDate: '2024-01-10',
      endDate: '2024-10-20',
      status: 'In Progress',
      progress: 78,
      location: '321 Commerce Drive, Houston, TX 77001',
      logo: 'https://ui-avatars.com/api/?name=Shopping+Mall&background=ef4444&color=fff&size=128',
      isContractor: false,
      projectManager: 'Jane Smith',
      createdAt: '2024-01-10T00:00:00.000Z'
    },
  ];

  // Fetch projects from API on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const projects = await masterDataAPI.getProjects();
      // Transform API response to match Project interface if needed
      setUserProjects(projects.map((p: any) => ({
        id: String(p.id),
        name: p.name || '',
        code: p.code || '',
        company: p.company || p.company_name || '',
        companyLogo: p.company_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.company || p.company_name || '')}&background=6366f1&color=fff&size=64`,
        startDate: p.start_date || p.startDate || '',
        endDate: p.end_date || p.endDate || '',
        status: p.status || 'Planning',
        progress: p.progress || 0,
        budget: p.budget,
        location: p.location || '',
        logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || '')}&background=6366f1&color=fff&size=128`,
        teamSize: p.team_size || p.teamSize,
        createdAt: p.created_at || p.createdAt,
        isContractor: p.is_contractor || p.isContractor,
        projectManager: p.project_manager || p.projectManager,
      })));
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.message || 'Failed to load projects');
      toast.showError(err.message || 'Failed to load projects');
      setUserProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProjectId(project.id);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setViewingProjectId(null);
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

  // Use only API projects (no default projects)
  const allProjects = useMemo(() => {
    return userProjects;
  }, [userProjects]);

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

  // Memoize filtered and sorted projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...allProjects];

    // Apply search filter by project name
    if (searchQuery.trim()) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [searchQuery, sortFilter, allProjects]);

  const handleDownloadExcel = () => {
    const headers = ['Project Name', 'Code', 'Company', 'Address', 'Is Contractor', 'Planned Start Date', 'Planned End Date', 'Project Manager', 'Status'];
    const rows = filteredAndSortedProjects.map(project => [
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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/100/5'}`}>
            <FolderKanban className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Projects</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage construction projects and their details
            </p>
          </div>
        </div>
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
            onClick={() => {
              setShowCreateModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
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

      {/* Loading State */}
      {isLoading && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Projects...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your projects</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Error Loading Projects</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-[#C2D642] hover:bg-[#A8B838] text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Projects Bars View */}
      {!isLoading && !error && filteredAndSortedProjects.length > 0 ? (
        <div className="space-y-2">
          {filteredAndSortedProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => handleViewProject(project)}
              className={`rounded-lg border ${cardClass} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDark ? 'hover:border-[#C2D642]/30' : 'hover:border-[#C2D642]/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={project.logo} 
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
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                >
                  <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !isLoading && !error ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Projects Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first project</p>
        </div>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredAndSortedProjects.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredAndSortedProjects.filter(p => p.status === 'In Progress').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={async () => {
          setShowCreateModal(false);
          // Reload projects from API
          await fetchProjects();
        }}
        defaultProjects={defaultProjects}
        userProjects={userProjects}
        onProjectCreated={handleProjectCreated}
      />

      {/* View Project Modal */}
      {showProjectModal && viewingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  Project Details
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  View project information
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
            {(() => {
              const viewingProject = allProjects.find(p => p.id === viewingProjectId);
              if (!viewingProject) return null;
              
              return (
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                      <img 
                        src={viewingProject.logo} 
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
                          src={viewingProject.companyLogo} 
                          alt={viewingProject.company}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingProject.company)}&background=6366f1&color=fff&size=64`;
                          }}
                        />
                        <p className={`text-sm font-bold ${textPrimary}`}>{viewingProject.company}</p>
                      </div>
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

                    {/* Status */}
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Status
                      </label>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                        viewingProject.status === 'In Progress' 
                          ? 'bg-[#C2D642]/20 text-[#C2D642]'
                          : viewingProject.status === 'Planning'
                          ? 'bg-amber-500/20 text-amber-500'
                          : viewingProject.status === 'Completed'
                          ? 'bg-[#C2D642]/20 text-[#C2D642]'
                          : 'bg-slate-500/20 text-slate-500'
                      }`}>
                        {viewingProject.status}
                      </span>
                    </div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
