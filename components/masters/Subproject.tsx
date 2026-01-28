'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
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
  Trash2
} from 'lucide-react';

interface Subproject {
  id: string;
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
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortFilter, setSortFilter] = useState<'recent' | 'oldest' | 'none'>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showSubprojectModal, setShowSubprojectModal] = useState<boolean>(false);
  const [editingSubprojectId, setEditingSubprojectId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [userSubprojects, setUserSubprojects] = useState<Subproject[]>([]);
  const [formData, setFormData] = useState({
    project: '',
    subprojectName: '',
    plannedStartDate: '',
    plannedEndDate: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const availableProjects = [
    { name: 'Residential Complex A', code: 'PRJ001' },
    { name: 'Commercial Tower B', code: 'PRJ002' },
    { name: 'Highway Infrastructure Project', code: 'PRJ003' },
    { name: 'Shopping Mall Development', code: 'PRJ004' },
  ];

  const defaultSubprojects: Subproject[] = [
    { id: '1', name: 'Foundation Work', code: 'SUB001', project: 'Residential Complex A', manager: 'John Doe', status: 'Active', progress: 85, startDate: '2024-01-20', endDate: '2024-03-15', createdAt: '2024-01-20T00:00:00.000Z' },
    { id: '2', name: 'Structural Framework', code: 'SUB002', project: 'Residential Complex A', manager: 'John Doe', status: 'In Progress', progress: 60, startDate: '2024-03-16', endDate: '2024-06-30', createdAt: '2024-03-16T00:00:00.000Z' },
    { id: '3', name: 'Plumbing Installation', code: 'SUB003', project: 'Residential Complex A', manager: 'Mike Johnson', status: 'Pending', progress: 0, startDate: '2024-07-01', endDate: '2024-08-15', createdAt: '2024-07-01T00:00:00.000Z' },
    { id: '4', name: 'Electrical Installation', code: 'SUB004', project: 'Commercial Tower B', manager: 'Jane Smith', status: 'In Progress', progress: 45, startDate: '2024-02-25', endDate: '2024-05-20', createdAt: '2024-02-25T00:00:00.000Z' },
    { id: '5', name: 'HVAC System', code: 'SUB005', project: 'Commercial Tower B', manager: 'Jane Smith', status: 'Pending', progress: 0, startDate: '2024-05-21', endDate: '2024-07-10', createdAt: '2024-05-21T00:00:00.000Z' },
    { id: '6', name: 'Interior Finishing', code: 'SUB006', project: 'Commercial Tower B', manager: 'Sarah Williams', status: 'Pending', progress: 0, startDate: '2024-07-11', endDate: '2024-09-30', createdAt: '2024-07-11T00:00:00.000Z' },
    { id: '7', name: 'Road Construction', code: 'SUB007', project: 'Highway Infrastructure Project', manager: 'Robert Brown', status: 'Active', progress: 70, startDate: '2024-03-05', endDate: '2024-08-31', createdAt: '2024-03-05T00:00:00.000Z' },
    { id: '8', name: 'Bridge Construction', code: 'SUB008', project: 'Highway Infrastructure Project', manager: 'Robert Brown', status: 'In Progress', progress: 35, startDate: '2024-04-01', endDate: '2024-10-15', createdAt: '2024-04-01T00:00:00.000Z' },
    { id: '9', name: 'Drainage System', code: 'SUB009', project: 'Highway Infrastructure Project', manager: 'David Lee', status: 'Pending', progress: 0, startDate: '2024-09-01', endDate: '2024-11-30', createdAt: '2024-09-01T00:00:00.000Z' },
    { id: '10', name: 'Site Preparation', code: 'SUB010', project: 'Shopping Mall Development', manager: 'Emily Davis', status: 'Completed', progress: 100, startDate: '2024-01-10', endDate: '2024-02-28', createdAt: '2024-01-10T00:00:00.000Z' },
    { id: '11', name: 'Retail Space Construction', code: 'SUB011', project: 'Shopping Mall Development', manager: 'Emily Davis', status: 'In Progress', progress: 55, startDate: '2024-03-01', endDate: '2024-07-31', createdAt: '2024-03-01T00:00:00.000Z' },
    { id: '12', name: 'Parking Structure', code: 'SUB012', project: 'Shopping Mall Development', manager: 'Chris Wilson', status: 'In Progress', progress: 40, startDate: '2024-03-15', endDate: '2024-08-20', createdAt: '2024-03-15T00:00:00.000Z' },
  ];

  // Load subprojects from localStorage on mount
  useEffect(() => {
    const savedSubprojects = localStorage.getItem('subprojects');
    if (savedSubprojects) {
      try {
        const parsed = JSON.parse(savedSubprojects);
        setUserSubprojects(parsed);
      } catch (e) {
        setUserSubprojects([]);
      }
    } else {
      setUserSubprojects([]);
    }
  }, []);

  // Save subprojects to localStorage whenever userSubprojects state changes
  useEffect(() => {
    const defaultIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const userAddedSubprojects = userSubprojects.filter(s => !defaultIds.includes(s.id));
    if (userAddedSubprojects.length > 0) {
      try {
        localStorage.setItem('subprojects', JSON.stringify(userAddedSubprojects));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('subprojects');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userSubprojects]);

  // Combine default and user subprojects
  const allSubprojects = useMemo(() => {
    return [...defaultSubprojects, ...userSubprojects];
  }, [userSubprojects]);

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
    setFormData({
      project: '',
      subprojectName: '',
      plannedStartDate: '',
      plannedEndDate: ''
    });
  };

  const handleToggleCard = (subprojectId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set();
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

  const handleEditSubproject = (subproject: Subproject) => {
    setEditingSubprojectId(subproject.id);
    setFormData({
      project: subproject.project,
      subprojectName: subproject.name,
      plannedStartDate: subproject.startDate,
      plannedEndDate: subproject.endDate
    });
    setShowSubprojectModal(true);
  };

  const handleDeleteSubproject = (subprojectId: string) => {
    if (window.confirm('Are you sure you want to delete this subproject?')) {
      setUserSubprojects(prev => prev.filter(s => s.id !== subprojectId));
      toast.showSuccess('Subproject deleted successfully');
    }
  };

  const handleCreateSubproject = () => {
    const missingFields: string[] = [];
    
    if (!formData.project) missingFields.push('Select Project');
    if (!formData.subprojectName) missingFields.push('Subproject Name');
    if (!formData.plannedStartDate) missingFields.push('Planned Start Date');
    if (!formData.plannedEndDate) missingFields.push('Planned End Date');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (editingSubprojectId) {
      // Update existing subproject
      setUserSubprojects(prev => prev.map(s => 
        s.id === editingSubprojectId 
          ? {
              ...s,
              name: formData.subprojectName,
              project: formData.project,
              startDate: formData.plannedStartDate,
              endDate: formData.plannedEndDate
            }
          : s
      ));
    } else {
      // Generate a code from the subproject name
      const code = formData.subprojectName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 6) + String(defaultSubprojects.length + userSubprojects.length + 1).padStart(3, '0');

      const newSubproject: Subproject = {
        id: Date.now().toString(),
        name: formData.subprojectName,
        code: code,
        project: formData.project,
        status: 'Pending',
        progress: 0,
        startDate: formData.plannedStartDate,
        endDate: formData.plannedEndDate,
        createdAt: new Date().toISOString()
      };

      setUserSubprojects(prev => [...prev, newSubproject]);
    }

    handleCloseModal();
  };

  // Memoize filtered and sorted subprojects
  const filteredAndSortedSubprojects = useMemo(() => {
    if (!selectedProject) return [];
    
    let filtered = allSubprojects.filter(sub => sub.project === selectedProject);

    // Apply search filter by subproject name
    if (searchQuery.trim()) {
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
  }, [selectedProject, searchQuery, sortFilter, allSubprojects]);

  const handleDownloadExcel = () => {
    const headers = ['Subproject Name', 'Code', 'Project', 'Planned Start Date', 'Planned End Date', 'Status'];
    const rows = filteredAndSortedSubprojects.map(subproject => [
      subproject.name,
      subproject.code,
      subproject.project,
      subproject.startDate || '-',
      subproject.endDate || '-',
      subproject.status
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
    link.setAttribute('download', `subprojects_${new Date().toISOString().split('T')[0]}.csv`);
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
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Layers className="w-6 h-6 text-[#6B8E23]" />
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
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none pr-10`}
              >
                <option value="">-- Select a Project --</option>
                {availableProjects.map((project, idx) => (
                  <option key={idx} value={project.name}>
                    {project.name} ({project.code})
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
      {selectedProject && (
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
                onClick={() => {
                  setFormData({
                    ...formData,
                    project: selectedProject
                  });
                  setShowSubprojectModal(true);
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
                placeholder="Search by subproject name..."
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
        </>
      )}

      {/* Subprojects Cards */}
      {!selectedProject ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Select a Project</h3>
          <p className={`text-sm ${textSecondary}`}>Please select a project from the dropdown above to view its subprojects</p>
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
                      ? 'border-[#6B8E23]/50 bg-slate-800/50' 
                      : 'border-[#6B8E23]/30 bg-white'
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
                        ? 'bg-[#6B8E23]/20' 
                        : 'bg-white/10'
                    }`}>
                      <Layers className={`w-6 h-6 ${isExpanded ? 'text-[#6B8E23]' : 'text-white'}`} />
                    </div>
                    <h3 className={`text-lg font-bold text-white truncate`}>{subproject.name}</h3>
                    {subproject.status && !isExpanded && (
                      <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        subproject.status === 'Active' || subproject.status === 'In Progress'
                          ? 'bg-emerald-500/30 text-emerald-300'
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
                              ? 'bg-emerald-500/20 text-emerald-400'
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
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white transition-all shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubproject(subproject.id);
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

      {/* Stats Cards - Only show when project is selected */}
      {selectedProject && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
            <p className={`text-2xl font-black ${textPrimary}`}>{filteredAndSortedSubprojects.length}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
            <p className={`text-2xl font-black text-emerald-500`}>{filteredAndSortedSubprojects.filter(s => s.status === 'Active' || s.status === 'In Progress').length}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
            <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
          </div>
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
                  name="project"
                  value={formData.project}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                >
                  <option value="">-- Select Project --</option>
                  {availableProjects.map((project, idx) => (
                    <option key={idx} value={project.name}>
                      {project.name} ({project.code})
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white transition-all shadow-md"
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
