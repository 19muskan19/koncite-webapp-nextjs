'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  Truck,
  Calendar,
  Building2,
  Layers,
  ChevronDown
} from 'lucide-react';

interface ResourcesUsageFromDPRProps {
  theme: ThemeType;
}

const ResourcesUsageFromDPR: React.FC<ResourcesUsageFromDPRProps> = ({ theme }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSubProject, setSelectedSubProject] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [viewType, setViewType] = useState<'date' | 'details'>('date');
  
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableSubProjects, setAvailableSubProjects] = useState<Array<{ name: string; project: string }>>([]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lakeshire',
        'Demo Data',
        'Lotus Rise',
        'Residential Complex A',
        'Commercial Tower B',
        'Infrastructure Project C',
        'Urban Development D'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectNames: string[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectNames = parsed.map((project: { name: string }) => project.name);
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      const allProjects = [...new Set([...defaultProjectNames, ...userProjectNames])];
      setAvailableProjects(allProjects);
    };

    loadProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', loadProjects);
    const interval = setInterval(loadProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', loadProjects);
      clearInterval(interval);
    };
  }, []);

  // Load subprojects from Subproject component (localStorage)
  useEffect(() => {
    const loadSubProjects = () => {
      const defaultSubProjects = [
        { name: 'A wing', project: 'Lakeshire' },
        { name: 'B wing', project: 'Lakeshire' },
        { name: 'Foundation Work', project: 'Residential Complex A' },
        { name: 'Structural Framework', project: 'Residential Complex A' },
        { name: 'Electrical Installation', project: 'Commercial Tower B' },
        { name: 'HVAC System', project: 'Commercial Tower B' },
      ];

      const savedSubProjects = localStorage.getItem('subprojects');
      let userSubProjects: Array<{ name: string; project: string }> = [];
      
      if (savedSubProjects) {
        try {
          const parsed = JSON.parse(savedSubProjects);
          userSubProjects = parsed.map((sub: { name: string; project: string }) => ({
            name: sub.name,
            project: sub.project
          }));
        } catch (e) {
          console.error('Error parsing subprojects:', e);
        }
      }

      const allSubProjects = [...defaultSubProjects, ...userSubProjects];
      setAvailableSubProjects(allSubProjects);
    };

    loadSubProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subprojects') {
        loadSubProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('subprojectsUpdated', loadSubProjects);
    const interval = setInterval(loadSubProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('subprojectsUpdated', loadSubProjects);
      clearInterval(interval);
    };
  }, []);

  // Filter subprojects by selected project
  const filteredSubProjects = useMemo(() => {
    return availableSubProjects.filter(sub => sub.project === selectedProject);
  }, [availableSubProjects, selectedProject]);

  // Update selected subproject when project changes
  useEffect(() => {
    if (!selectedProject) {
      setSelectedSubProject('');
      return;
    }
    if (filteredSubProjects.length > 0 && !filteredSubProjects.find(sub => sub.name === selectedSubProject)) {
      setSelectedSubProject(filteredSubProjects[0].name);
    } else if (filteredSubProjects.length === 0) {
      setSelectedSubProject('');
    }
  }, [selectedProject, filteredSubProjects, selectedSubProject]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-pink-500/10' : 'bg-pink-500/5'}`}>
            <Truck className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Resources Usage From DPR</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              View resource usage details from daily progress reports
            </p>
          </div>
        </div>
      </div>

      {/* View Type Toggle */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewType('date')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewType === 'date'
                ? 'bg-[#6B8E23] text-white'
                : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            Date
          </button>
          <button
            onClick={() => setViewType('details')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewType === 'details'
                ? 'bg-[#6B8E23] text-white'
                : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            Details Day wise
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                <option value="">---select project---</option>
                {availableProjects.length > 0 && (
                  availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))
                )}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Sub Project
            </label>
            <div className="relative">
              <Layers className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <select
                value={selectedSubProject}
                onChange={(e) => setSelectedSubProject(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm border appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                <option value="">Select Sub Project</option>
                {filteredSubProjects.length > 0 ? (
                  filteredSubProjects.map(sub => (
                    <option key={sub.name} value={sub.name}>{sub.name}</option>
                  ))
                ) : (
                  <option value="" disabled>No subprojects available</option>
                )}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select From Date:
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select To Date:
            </label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none z-10`} />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date View - Shows calendar/date-based view */}
      {viewType === 'date' && (
        <div className={`rounded-xl border ${cardClass} p-12 text-center`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Date View</h3>
          <p className={`text-sm ${textSecondary}`}>Select a date range to view resource usage by date</p>
          <div className="mt-6">
            <p className={`text-sm ${textSecondary}`}>Date-based resource usage data will be displayed here</p>
          </div>
        </div>
      )}

      {/* Details Day wise View - Shows categories */}
      {viewType === 'details' && (
        <div className={`rounded-xl border ${cardClass} p-6`}>
          <div className="space-y-4">
            <h3 className={`text-lg font-black ${textPrimary}`}>Materials</h3>
            <h3 className={`text-lg font-black ${textPrimary}`}>Labour</h3>
            <h3 className={`text-lg font-black ${textPrimary}`}>Equipments/Machinery</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesUsageFromDPR;
