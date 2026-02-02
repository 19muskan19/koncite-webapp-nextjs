'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Activity, MoreVertical, Download, Plus, Trash2 } from 'lucide-react';
import CreateActivityModal from './Modals/CreateActivityModal';

interface ActivityItem {
  id: string;
  name: string;
  project: string;
  subproject: string;
  type: 'heading' | 'activity';
  unit?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

interface ActivitiesProps {
  theme: ThemeType;
}

const Activities: React.FC<ActivitiesProps> = ({ theme }) => {
  const toast = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubproject, setSelectedSubproject] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [userActivities, setUserActivities] = useState<ActivityItem[]>([]);
  
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

  const availableSubprojects = [
    { name: 'Foundation Work', project: 'Residential Complex A' },
    { name: 'Structural Framework', project: 'Residential Complex A' },
    { name: 'Plumbing Installation', project: 'Residential Complex A' },
    { name: 'Electrical Installation', project: 'Commercial Tower B' },
    { name: 'HVAC System', project: 'Commercial Tower B' },
    { name: 'Road Construction', project: 'Highway Infrastructure Project' },
    { name: 'Bridge Construction', project: 'Highway Infrastructure Project' },
    { name: 'Site Preparation', project: 'Shopping Mall Development' },
  ];

  const defaultActivities: ActivityItem[] = [
    { id: '1', name: 'Excavation & Misc', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', name: 'PCC', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', createdAt: '2024-01-16T00:00:00.000Z' },
    { id: '3', name: 'Steel Reinforcement', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', createdAt: '2024-01-17T00:00:00.000Z' },
    { id: '4', name: 'Concrete Work', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', createdAt: '2024-01-18T00:00:00.000Z' },
    { id: '5', name: 'Masonry', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-19T00:00:00.000Z' },
    { id: '6', name: 'Plastering, Gypsum, POP', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-20T00:00:00.000Z' },
    { id: '7', name: 'Water Proofing', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-21T00:00:00.000Z' },
    { id: '8', name: 'Doors & Windows', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-22T00:00:00.000Z' },
    { id: '9', name: 'Tiling & Paver Work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-23T00:00:00.000Z' },
    { id: '10', name: 'Railing & Fabrication work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-24T00:00:00.000Z' },
    { id: '11', name: 'Electrical', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', createdAt: '2024-01-25T00:00:00.000Z' },
    { id: '12', name: 'Plumbing', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', createdAt: '2024-01-26T00:00:00.000Z' },
    { id: '13', name: 'Painting', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', createdAt: '2024-01-27T00:00:00.000Z' },
    { id: '14', name: 'Bituminous Works', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', createdAt: '2024-01-28T00:00:00.000Z' },
    { id: '15', name: 'Sub Activites 1.1', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'heading', createdAt: '2024-01-29T00:00:00.000Z' },
  ];

  // Load activities from localStorage on mount
  useEffect(() => {
    const savedActivities = localStorage.getItem('activities');
    if (savedActivities) {
      try {
        const parsed = JSON.parse(savedActivities);
        setUserActivities(parsed);
      } catch (e) {
        setUserActivities([]);
      }
    } else {
      setUserActivities([]);
    }
  }, []);

  // Save activities to localStorage whenever userActivities state changes
  useEffect(() => {
    const defaultIds = defaultActivities.map(a => a.id);
    const userAddedActivities = userActivities.filter(a => !defaultIds.includes(a.id));
    if (userAddedActivities.length > 0) {
      try {
        localStorage.setItem('activities', JSON.stringify(userAddedActivities));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('activities');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userActivities]);

  // Combine default and user activities
  const allActivities = useMemo(() => {
    return [...defaultActivities, ...userActivities];
  }, [userActivities]);

  // Filter activities based on selected project and subproject
  const filteredActivities = useMemo(() => {
    let filtered = allActivities;
    
    if (selectedProject) {
      filtered = filtered.filter(activity => activity.project === selectedProject);
    }
    
    if (selectedSubproject) {
      filtered = filtered.filter(activity => activity.subproject === selectedSubproject);
    }
    
    return filtered;
  }, [selectedProject, selectedSubproject, allActivities]);

  // Get subprojects for selected project
  const projectSubprojects = useMemo(() => {
    if (!selectedProject) return [];
    return availableSubprojects.filter(sub => sub.project === selectedProject);
  }, [selectedProject]);

  const handleActivityCreated = (newActivity: ActivityItem) => {
    setUserActivities(prev => [...prev, newActivity]);
  };

  // Listen for activitiesUpdated event
  useEffect(() => {
    const handleActivitiesUpdated = () => {
      const savedActivities = localStorage.getItem('activities');
      if (savedActivities) {
        try {
          const parsed = JSON.parse(savedActivities);
          if (Array.isArray(parsed)) {
            setUserActivities(parsed);
          }
        } catch (e) {
          // Keep current activities if parsing fails
        }
      }
    };

    window.addEventListener('activitiesUpdated', handleActivitiesUpdated);
    return () => {
      window.removeEventListener('activitiesUpdated', handleActivitiesUpdated);
    };
  }, []);

  const handleDeleteActivity = (activityId: string) => {
    const defaultIds = defaultActivities.map(a => a.id);
    if (defaultIds.includes(activityId)) {
      toast.showWarning('Cannot delete default activities');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this activity?')) {
      setUserActivities(prev => prev.filter(a => a.id !== activityId));
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedSubproject(''); // Reset subproject when project changes
              }}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Project --</option>
              {availableProjects.map((project, idx) => (
                <option key={idx} value={project.name}>
                  {project.name} ({project.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Subproject
            </label>
            <select
              value={selectedSubproject}
              onChange={(e) => setSelectedSubproject(e.target.value)}
              disabled={!selectedProject}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">-- Select Subproject --</option>
              {projectSubprojects.map((subproject, idx) => (
                <option key={idx} value={subproject.name}>
                  {subproject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredActivities.length > 0 ? (
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
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.qty || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.rate || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.amount || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.startDate || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.endDate || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteActivity(row.id)}
                        className={`p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first activity entry</p>
        </div>
      )}

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
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Reload activities from localStorage
          const savedActivities = localStorage.getItem('activities');
          if (savedActivities) {
            try {
              const parsed = JSON.parse(savedActivities);
              if (Array.isArray(parsed)) {
                setUserActivities(parsed);
              }
            } catch (e) {
              // Keep current activities if parsing fails
            }
          }
        }}
        defaultActivities={defaultActivities}
        userActivities={userActivities}
        availableProjects={availableProjects}
        availableSubprojects={availableSubprojects}
        onActivityCreated={handleActivityCreated}
      />
    </div>
  );
};

export default Activities;
