'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
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
  Download
} from 'lucide-react';

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
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    projectName: '',
    address: '',
    isContractor: '',
    plannedStartDate: '',
    plannedEndDate: '',
    company: '',
    projectManager: '',
    logo: null as File | null,
    logoPreview: '' as string | null,
    // Client fields (shown when isContractor is 'yes')
    clientName: '',
    clientAddress: '',
    clientContactName: '',
    clientContactEmail: '',
    clientContactMobile: '',
    clientContactDesignation: '',
    clientContactPhone: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Dummy data for dropdowns
  const dummyCompanies = [
    { name: 'ABC Construction Ltd', logo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64' },
    { name: 'XYZ Builders Inc', logo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64' },
  ];

  const dummyManagers = [
    { name: 'John Doe' },
    { name: 'Jane Smith' },
  ];

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

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setUserProjects(parsed);
      } catch (e) {
        setUserProjects([]);
      }
    } else {
      setUserProjects([]);
    }
  }, []);

  // Save projects to localStorage whenever userProjects state changes
  useEffect(() => {
    const defaultIds = ['1', '2', '3', '4'];
    const userAddedProjects = userProjects.filter(p => !defaultIds.includes(p.id));
    if (userAddedProjects.length > 0) {
      try {
        localStorage.setItem('projects', JSON.stringify(userAddedProjects));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved. Please clear browser storage or use smaller images.');
        }
      }
    } else {
      try {
        localStorage.removeItem('projects');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userProjects]);

  // Compress and resize image before storing
  const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.showError('Image size should be less than 5MB');
        return;
      }
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
      setFormData({
        ...formData,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRadioChange = (value: string) => {
    // Toggle: if clicking the same value, deselect it
    if (formData.isContractor === value) {
      setFormData({
        ...formData,
        isContractor: '',
        clientName: '',
        clientAddress: '',
        clientContactName: '',
        clientContactEmail: '',
        clientContactMobile: '',
        clientContactDesignation: '',
        clientContactPhone: ''
      });
    } else if (value === 'no') {
      // Clear client fields when "no" is selected
      setFormData({
        ...formData,
        isContractor: value,
        clientName: '',
        clientAddress: '',
        clientContactName: '',
        clientContactEmail: '',
        clientContactMobile: '',
        clientContactDesignation: '',
        clientContactPhone: ''
      });
    } else {
      setFormData({
        ...formData,
        isContractor: value
      });
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProjectId(project.id);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setShowProjectModal(false);
    setViewingProjectId(null);
    setFormData({
      projectName: '',
      address: '',
      isContractor: '',
      plannedStartDate: '',
      plannedEndDate: '',
      company: '',
      projectManager: '',
      logo: null,
      logoPreview: null,
      clientName: '',
      clientAddress: '',
      clientContactName: '',
      clientContactEmail: '',
      clientContactMobile: '',
      clientContactDesignation: '',
      clientContactPhone: ''
    });
  };

  useEffect(() => {
    return () => {
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
    };
  }, [formData.logoPreview]);

  const handleCreateProject = async () => {
    const missingFields: string[] = [];
    
    if (!formData.projectName) missingFields.push('Project Name');
    if (!formData.address) missingFields.push('Address');
    if (!formData.isContractor) missingFields.push('Are you contractor for this project?');
    if (!formData.plannedStartDate) missingFields.push('Planned Start Date');
    if (!formData.plannedEndDate) missingFields.push('Planned End Date');
    if (!formData.company) missingFields.push('Tag Company');
    if (!formData.projectManager) missingFields.push('Tag Project Manager');
    
    // If contractor is 'yes', check client fields
    if (formData.isContractor === 'yes') {
      if (!formData.clientName) missingFields.push('Client Name');
      if (!formData.clientAddress) missingFields.push('Client Address');
      if (!formData.clientContactName) missingFields.push('Client Point of Contact - Name');
      if (!formData.clientContactEmail) missingFields.push('Client Point of Contact - Email');
      if (!formData.clientContactMobile) missingFields.push('Client Point of Contact - Mobile Number');
      if (!formData.clientContactDesignation) missingFields.push('Client Point of Contact - Designation');
      if (!formData.clientContactPhone) missingFields.push('Client Point of Contact - Phone Number');
    }
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate a code from the project name
    const code = formData.projectName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + String(defaultProjects.length + userProjects.length + 1).padStart(3, '0');

    let logoUrl = '';

    // Compress and convert logo to base64 if uploaded
    if (formData.logo) {
      try {
        logoUrl = await compressImage(formData.logo, 200, 200, 0.7);
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.showError('Error processing image. Please try again.');
        return;
      }
    } else {
      // Use default avatar if no logo
      logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.projectName)}&background=6366f1&color=fff&size=128`;
    }

    // Find selected company logo
    const selectedCompany = dummyCompanies.find(c => c.name === formData.company);
    const companyLogo = selectedCompany?.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(formData.company) + '&background=6366f1&color=fff&size=64';

    const newProject: Project = {
      id: Date.now().toString(),
      name: formData.projectName,
      code: code,
      company: formData.company,
      companyLogo: companyLogo,
      startDate: formData.plannedStartDate,
      endDate: formData.plannedEndDate,
      status: 'Planning',
      progress: 0,
      location: formData.address,
      logo: logoUrl,
      isContractor: formData.isContractor === 'yes',
      projectManager: formData.projectManager,
      createdAt: new Date().toISOString()
    };

    try {
      setUserProjects(prev => [...prev, newProject]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving project:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast.showError('Storage limit exceeded. Please clear some data or use a smaller image.');
      } else {
        toast.showError('Error saving project. Please try again.');
      }
    }
  };

  // Combine default and user projects
  const allProjects = useMemo(() => {
    return [...defaultProjects, ...userProjects];
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
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/100/5'}`}>
            <FolderKanban className="w-6 h-6 text-[#6B8E23]" />
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
              setViewingProjectId(null);
              setShowProjectModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
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
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23]' : 'bg-[#6B8E23]/10 text-[#6B8E23]'}`}>
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
                      ? isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23]' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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
                      ? isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23]' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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
                      ? isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23]' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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

      {/* Projects Bars View */}
      {filteredAndSortedProjects.length > 0 ? (
        <div className="space-y-2">
          {filteredAndSortedProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => handleViewProject(project)}
              className={`rounded-lg border ${cardClass} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDark ? 'hover:border-[#6B8E23]/30' : 'hover:border-[#6B8E23]/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#6B8E23]/20 flex-shrink-0">
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
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Projects Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first project</p>
        </div>
      )}

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

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  {viewingProjectId ? 'Project Details' : 'Add New Project'}
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  {viewingProjectId ? 'View project information' : 'Enter project details below'}
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
            {viewingProjectId ? (
              (() => {
                const viewingProject = allProjects.find(p => p.id === viewingProjectId);
                if (!viewingProject) return null;
                
                return (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#6B8E23]/20 flex-shrink-0">
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
                            ? 'bg-[#6B8E23]/20 text-[#6B8E23]'
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
              })()
            ) : (
              <div className="p-6 space-y-6">
              {/* Project Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                />
              </div>

              {/* Address */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter project address"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all resize-none ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                />
              </div>

              {/* Are you contractor for this project? */}
              <div>
                <label className={`block text-sm font-bold mb-3 ${textPrimary}`}>
                  Are you contractor for this project? <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className={`flex items-center gap-2 cursor-pointer`}>
                    <input
                      type="radio"
                      name="isContractor"
                      value="yes"
                      checked={formData.isContractor === 'yes'}
                      onChange={() => handleRadioChange('yes')}
                      className={`w-4 h-4 text-[#6B8E23] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#6B8E23]`}
                    />
                    <span className={`text-sm font-bold ${textPrimary}`}>Yes</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer`}>
                    <input
                      type="radio"
                      name="isContractor"
                      value="no"
                      checked={formData.isContractor === 'no'}
                      onChange={() => handleRadioChange('no')}
                      className={`w-4 h-4 text-[#6B8E23] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#6B8E23]`}
                    />
                    <span className={`text-sm font-bold ${textPrimary}`}>No</span>
                  </label>
                </div>
              </div>

              {/* Client Information Fields - Shown when contractor is 'yes' */}
              {formData.isContractor === 'yes' && (
                <>
                  {/* Client Name */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Client Name
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      placeholder="Enter Your Client Name"
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                      } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    />
                  </div>

                  {/* Client Address */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Client Address
                    </label>
                    <input
                      type="text"
                      name="clientAddress"
                      value={formData.clientAddress}
                      onChange={handleInputChange}
                      placeholder="Enter Client Address"
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                      } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    />
                  </div>

                  {/* Client Point of Contact Section */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                    <h3 className={`text-base font-bold mb-4 ${textPrimary}`}>
                      Client Point of Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Name */}
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                            Name
                          </label>
                          <input
                            type="text"
                            name="clientContactName"
                            value={formData.clientContactName}
                            onChange={handleInputChange}
                            placeholder="Enter Your client_pontin Name"
                            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                              isDark 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                                : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                            } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                            Email
                          </label>
                          <input
                            type="email"
                            name="clientContactEmail"
                            value={formData.clientContactEmail}
                            onChange={handleInputChange}
                            placeholder="Enter Your Email"
                            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                              isDark 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                                : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                            } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          />
                        </div>

                        {/* Mobile Number */}
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            name="clientContactMobile"
                            value={formData.clientContactMobile}
                            onChange={handleInputChange}
                            placeholder="Enter Your Mobile Number"
                            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                              isDark 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                                : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                            } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Designation */}
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                            Designation
                          </label>
                          <input
                            type="text"
                            name="clientContactDesignation"
                            value={formData.clientContactDesignation}
                            onChange={handleInputChange}
                            placeholder="Enter Your Designation"
                            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                              isDark 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                                : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                            } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          />
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="clientContactPhone"
                            value={formData.clientContactPhone}
                            onChange={handleInputChange}
                            placeholder="Enter Your Phone Number"
                            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                              isDark 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                                : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                            } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                />
              </div>

              {/* Tag Company */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Tag Company <span className="text-red-500">*</span>
                </label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                >
                  <option value="">-- Select Company --</option>
                  {dummyCompanies.map((company, idx) => (
                    <option key={idx} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Project Manager */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Tag Project Manager <span className="text-red-500">*</span>
                </label>
                <select
                  name="projectManager"
                  value={formData.projectManager}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                >
                  <option value="">-- Select Project Manager --</option>
                  {dummyManagers.map((manager, idx) => (
                    <option key={idx} value={manager.name}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Project Logo */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Upload Project Logo
                </label>
                <div className="space-y-4">
                  {formData.logoPreview ? (
                    <div className="relative">
                      <img
                        src={formData.logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 rounded-xl object-cover border-2 border-[#6B8E23]/20"
                      />
                      <button
                        onClick={() => {
                          if (formData.logoPreview) {
                            URL.revokeObjectURL(formData.logoPreview);
                          }
                          setFormData({ ...formData, logo: null, logoPreview: null });
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isDark
                          ? 'border-slate-700 hover:border-[#6B8E23] bg-slate-800/30'
                          : 'border-slate-300 hover:border-[#6B8E23] bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className={`w-8 h-8 mb-2 ${textSecondary}`} />
                        <p className={`text-sm font-bold ${textSecondary}`}>
                          <span className="text-[#6B8E23]">Click to upload</span> or drag and drop
                        </p>
                        <p className={`text-xs ${textSecondary} mt-1`}>PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
              {viewingProjectId ? (
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
              ) : (
                <>
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
                    onClick={handleCreateProject}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white transition-all shadow-md"
                  >
                    Create
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
