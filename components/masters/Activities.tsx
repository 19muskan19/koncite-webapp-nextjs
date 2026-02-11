'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Activity, MoreVertical, Download, Plus, Trash2, Loader2, Edit, Search, RefreshCw } from 'lucide-react';
import CreateActivityModal from './Modals/CreateActivityModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface ActivityItem {
  id: string;
  uuid?: string;
  name?: string;
  activities?: string; // API field name
  project?: string;
  project_id?: number;
  subproject?: string;
  subproject_id?: number;
  type: 'heading' | 'activity' | 'activites'; // API uses "activites" (with typo)
  unit?: string;
  unit_id?: number;
  qty?: number;
  quantity?: number; // API field name
  rate?: number;
  amount?: number;
  startDate?: string;
  start_date?: string; // API field name
  endDate?: string;
  end_date?: string; // API field name
  heading?: number; // Parent activity ID
  parent_id?: number;
  createdAt?: string;
}

interface ActivitiesProps {
  theme: ThemeType;
}

const Activities: React.FC<ActivitiesProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; uuid: string; project_name: string }>>([]);
  const [subprojects, setSubprojects] = useState<Array<{ id: number; uuid: string; name: string; project_id?: number }>>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState<boolean>(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isAuthenticated) {
        setProjects([]);
        return;
      }
      
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await masterDataAPI.getProjects();
        setProjects(fetchedProjects.map((p: any) => ({
          id: p.id,
          uuid: p.uuid || String(p.id),
          project_name: p.project_name || p.name || ''
        })));
      } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        toast.showError('Failed to load projects');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated]);

  // Fetch subprojects when project is selected
  useEffect(() => {
    const fetchSubprojects = async () => {
      if (!isAuthenticated || !selectedProjectId) {
        setSubprojects([]);
        return;
      }
      
      setIsLoadingSubprojects(true);
      try {
        const fetchedSubprojects = await masterDataAPI.getProjectSubprojects(selectedProjectId);
        setSubprojects(fetchedSubprojects.map((s: any) => ({
          id: s.id,
          uuid: s.uuid || String(s.id),
          name: s.name || '',
          project_id: s.project_id || s.tag_project
        })));
      } catch (error: any) {
        console.error('Failed to fetch subprojects:', error);
        toast.showError('Failed to load subprojects');
      } finally {
        setIsLoadingSubprojects(false);
      }
    };

    fetchSubprojects();
  }, [selectedProjectId, isAuthenticated]);

  // Fetch activities from API based on selected project/subproject
  const fetchActivities = async () => {
    if (!isAuthenticated || !selectedProjectId) {
      setActivities([]);
      setIsLoadingActivities(false);
      return;
    }
    
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const projectIdNum = projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId)?.id;
      const subprojectIdNum = selectedSubprojectId 
        ? subprojects.find(s => s.uuid === selectedSubprojectId || String(s.id) === selectedSubprojectId)?.id
        : undefined;
      
      const fetchedActivities = await masterDataAPI.getActivities(
        projectIdNum || selectedProjectId,
        subprojectIdNum
      );
      
      // Transform API response to match ActivityItem interface
      const transformedActivities = fetchedActivities.map((activity: any) => ({
        id: activity.uuid || String(activity.id),
        uuid: activity.uuid,
        name: activity.activities || activity.name || '',
        activities: activity.activities || '',
        project: activity.project?.project_name || activity.project_name || '',
        project_id: activity.project_id || activity.project?.id,
        subproject: activity.subproject?.name || activity.subproject_name || '',
        subproject_id: activity.subproject_id || activity.subproject?.id,
        type: activity.type || '',
        unit: activity.unit?.unit || activity.unit || '',
        unit_id: activity.unit_id || activity.unit?.id,
        qty: activity.qty || activity.quantity || 0,
        quantity: activity.quantity || activity.qty || 0,
        rate: activity.rate || 0,
        amount: activity.amount || 0,
        startDate: activity.start_date || activity.startDate || '',
        start_date: activity.start_date || '',
        endDate: activity.end_date || activity.endDate || '',
        end_date: activity.end_date || '',
        heading: activity.heading || activity.parent_id,
        parent_id: activity.parent_id || activity.heading,
        createdAt: activity.created_at || activity.createdAt,
      }));
      setActivities(transformedActivities);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setActivitiesError(err.message || 'Failed to load activities');
      setActivities([]);
      toast.showError(err.message || 'Failed to load activities');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Load activities when project/subproject changes
  useEffect(() => {
    if (selectedProjectId && !searchQuery.trim()) {
      fetchActivities();
    }
  }, [selectedProjectId, selectedSubprojectId]);

  // Search activities using API
  const handleSearch = async (query: string) => {
    if (!query.trim() || !selectedProjectId) {
      if (selectedProjectId) {
        await fetchActivities();
      }
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const projectIdNum = projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId)?.id;
      const searchResults = await masterDataAPI.searchActivities(query, projectIdNum || selectedProjectId);
      
      // Transform API response
      const transformedActivities = searchResults.map((activity: any) => ({
        id: activity.uuid || String(activity.id),
        uuid: activity.uuid,
        name: activity.activities || activity.name || '',
        activities: activity.activities || '',
        project: activity.project?.project_name || activity.project_name || '',
        project_id: activity.project_id || activity.project?.id,
        subproject: activity.subproject?.name || activity.subproject_name || '',
        subproject_id: activity.subproject_id || activity.subproject?.id,
        type: activity.type || '',
        unit: activity.unit?.unit || activity.unit || '',
        unit_id: activity.unit_id || activity.unit?.id,
        qty: activity.qty || activity.quantity || 0,
        quantity: activity.quantity || activity.qty || 0,
        rate: activity.rate || 0,
        amount: activity.amount || 0,
        startDate: activity.start_date || activity.startDate || '',
        start_date: activity.start_date || '',
        endDate: activity.end_date || activity.endDate || '',
        end_date: activity.end_date || '',
        heading: activity.heading || activity.parent_id,
        parent_id: activity.parent_id || activity.heading,
        createdAt: activity.created_at || activity.createdAt,
      }));
      setActivities(transformedActivities);
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
        fetchActivities();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter activities (client-side filtering is optional since we're using API search)
  const filteredActivities = useMemo(() => {
    return activities;
  }, [activities]);

  const handleEditActivity = async (activity: ActivityItem) => {
    try {
      // Fetch full activity details from API
      const activityDetails = await masterDataAPI.getActivity(activity.id);
      setEditingActivityId(activity.id);
      // Open modal with activity data - CreateActivityModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('Failed to fetch activity details:', error);
      toast.showError('Failed to load activity details');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await masterDataAPI.deleteActivity(activityId);
        toast.showSuccess('Activity deleted successfully');
        // Refresh activities list
        await fetchActivities();
      } catch (error: any) {
        console.error('Failed to delete activity:', error);
        toast.showError(error.message || 'Failed to delete activity');
      }
    }
  };

  const handleActivityCreated = async () => {
    // Refresh activities list after create/update
    await fetchActivities();
  };

  const handleDownloadExcel = () => {
    const headers = ['#', 'Activities', 'Unit', 'Qty', 'Rate', 'Amount', 'Start Date', 'End Date'];
    const rows = filteredActivities.map((activity, idx) => [
      String(idx + 1),
      activity.name,
      activity.unit || '',
      activity.qty?.toString() || '',
      activity.rate?.toString() || '',
      activity.amount?.toString() || '',
      activity.startDate || '',
      activity.endDate || ''
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
    link.setAttribute('download', `activities_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Activity className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Activities</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage project activities and tasks
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
          {selectedProjectId && (
            <button 
              onClick={async () => {
                console.log('🔄 Manual refresh triggered');
                setSearchQuery('');
                await fetchActivities();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Refresh Activities List"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          )}
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Create New
          </button>
        </div>
      </div>

      {/* Project and Subproject Selectors */}
      <div className={`p-6 rounded-xl border ${cardClass}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Project <span className="text-red-500">*</span>
            </label>
            {isLoadingProjects ? (
              <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedSubprojectId(''); // Reset subproject when project changes
                  setActivities([]); // Clear activities
                }}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">-- Select Project --</option>
                {projects.map((project) => (
                  <option key={project.uuid || project.id} value={project.uuid || String(project.id)}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Subproject (Optional)
            </label>
            {isLoadingSubprojects ? (
              <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subprojects...
              </div>
            ) : (
              <select
                value={selectedSubprojectId}
                onChange={(e) => {
                  setSelectedSubprojectId(e.target.value);
                  // Refetch activities when subproject changes
                  if (selectedProjectId) {
                    fetchActivities();
                  }
                }}
                disabled={!selectedProjectId}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!selectedProjectId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">-- All Subprojects --</option>
                {subprojects.map((subproject) => (
                  <option key={subproject.uuid || subproject.id} value={subproject.uuid || String(subproject.id)}>
                    {subproject.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredActivities.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredActivities.filter(a => a.status === 'Active').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
              <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Search Activities
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search by activity name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!selectedProjectId || isSearching}
                className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                    : 'bg-white border-slate-200 text-slate-900'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingActivities && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Activities...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your activities</p>
        </div>
      )}

      {/* Error State */}
      {activitiesError && !isLoadingActivities && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Activities</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{activitiesError}</p>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Activities Table */}
      {!isLoadingActivities && !activitiesError && selectedProjectId && filteredActivities.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>#</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Activities</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Qty</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Amount</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Start Date</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>End Date</th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredActivities.map((row, rowIdx) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4`}>
                      <input
                        type="checkbox"
                        className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                      />
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {row.name || row.activities || '-'}
                      {row.type === 'heading' && (
                        <span className="ml-2 text-xs text-[#C2D642]">(Heading)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.qty || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.rate || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.amount || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.startDate || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.endDate || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditActivity(row)}
                          className={`p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteActivity(row.id)}
                          className={`p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoadingActivities && !activitiesError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>
            {!selectedProjectId 
              ? 'Please select a project to view activities' 
              : searchQuery.trim()
                ? `No activities found matching "${searchQuery}"`
                : 'No activities found for this project/subproject'}
          </h3>
          <p className={`text-sm ${textSecondary}`}>
            {selectedProjectId && !searchQuery.trim() && 'Start by adding your first activity entry'}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredActivities.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Activities</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredActivities.filter(a => a.type === 'activity').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Headings</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredActivities.filter(a => a.type === 'heading').length}</p>
        </div>
      </div>

      {/* Create Activity Modal */}
      <CreateActivityModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingActivityId(null);
        }}
        onSuccess={handleActivityCreated}
        editingActivityId={editingActivityId}
        activities={activities}
        projects={projects}
        subprojects={subprojects}
        defaultProjectId={selectedProjectId}
        defaultSubprojectId={selectedSubprojectId}
      />
    </div>
  );
};

export default Activities;
