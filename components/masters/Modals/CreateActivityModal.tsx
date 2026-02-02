'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

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

interface CreateActivityModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultActivities?: ActivityItem[];
  userActivities?: ActivityItem[];
  availableProjects?: Array<{ name: string; code: string }>;
  availableSubprojects?: Array<{ name: string; project: string }>;
  defaultProject?: string;
  defaultSubproject?: string;
  onActivityCreated?: (activity: ActivityItem) => void;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultActivities = [],
  userActivities = [],
  availableProjects = [],
  availableSubprojects = [],
  defaultProject = '',
  defaultSubproject = '',
  onActivityCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    project: '',
    subproject: '',
    type: '',
    name: ''
  });

  const [projects, setProjects] = useState<Array<{ name: string; code: string }>>([]);
  const [subprojects, setSubprojects] = useState<Array<{ name: string; project: string }>>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Residential Complex A',
        'Commercial Tower B',
        'Highway Infrastructure Project',
        'Shopping Mall Development',
      ];

      const savedProjects = localStorage.getItem('projects');
      let projectList: Array<{ name: string; code: string }> = [];

      // Add default projects
      projectList = defaultProjectNames.map(name => ({
        name,
        code: ''
      }));

      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const userProjects = parsed.map((p: any) => ({
              name: p.projectName || p.name || '',
              code: p.code || ''
            })).filter((p: { name: string; code: string }) => p.name);
            projectList = [...projectList, ...userProjects];
          }
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      // Combine with availableProjects prop
      const allProjects = [...availableProjects, ...projectList];
      // Remove duplicates based on name
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.name, p])).values()
      );
      setProjects(uniqueProjects);
    };

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, availableProjects]);

  // Load subprojects from localStorage and filter by selected project
  useEffect(() => {
    const loadSubprojects = () => {
      if (!formData.project) {
        setSubprojects([]);
        return;
      }

      const savedSubprojects = localStorage.getItem('subprojects');
      let subprojectList: Array<{ name: string; project: string }> = [];

      // Add default subprojects for the selected project
      const defaultSubs = availableSubprojects.filter(sub => sub.project === formData.project);
      subprojectList = [...defaultSubs];

      if (savedSubprojects) {
        try {
          const parsed = JSON.parse(savedSubprojects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const userSubs = parsed
              .map((s: any) => ({
                name: s.subprojectName || s.name || '',
                project: s.projectName || s.project || ''
              }))
              .filter((s: { name: string; project: string }) => s.name && s.project === formData.project);
            subprojectList = [...subprojectList, ...userSubs];
          }
        } catch (e) {
          console.error('Error parsing subprojects:', e);
        }
      }

      // Remove duplicates based on name
      const uniqueSubprojects = Array.from(
        new Map(subprojectList.map(s => [s.name, s])).values()
      );
      setSubprojects(uniqueSubprojects);
    };

    if (isOpen && formData.project) {
      loadSubprojects();
    } else if (!formData.project) {
      setSubprojects([]);
    }
  }, [isOpen, formData.project, availableSubprojects]);

  // Reset form when modal closes or set defaults when opens
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        project: '',
        subproject: '',
        type: '',
        name: ''
      });
    } else if (isOpen && defaultProject && defaultSubproject) {
      // Pre-fill project and subproject when modal opens
      setFormData(prev => ({
        project: defaultProject,
        subproject: defaultSubproject,
        type: prev.type,
        name: prev.name
      }));
    }
  }, [isOpen, defaultProject, defaultSubproject]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Reset subproject when project changes
    if (name === 'project') {
      setFormData(prev => ({
        ...prev,
        project: value,
        subproject: '',
        type: prev.type,
        name: prev.name
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleCreateActivity = () => {
    const missingFields: string[] = [];
    
    if (!formData.project) missingFields.push('Project');
    if (!formData.subproject) missingFields.push('Subproject');
    if (!formData.type) missingFields.push('Type');
    if (!formData.name) missingFields.push('Name');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      name: formData.name,
      project: formData.project,
      subproject: formData.subproject,
      type: formData.type as 'heading' | 'activity',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedActivities = localStorage.getItem('activities');
    let existingActivities: any[] = [];
    if (savedActivities) {
      try {
        existingActivities = JSON.parse(savedActivities);
      } catch (e) {
        console.error('Error parsing activities:', e);
      }
    }

    existingActivities.push(newActivity);
    localStorage.setItem('activities', JSON.stringify(existingActivities));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('activitiesUpdated'));

    toast.showSuccess('Activity created successfully!');
    
    if (onActivityCreated) {
      onActivityCreated(newActivity);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Activity/Heading</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter activity details below</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Project */}
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
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Project --</option>
              {projects.map((project, idx) => (
                <option key={idx} value={project.name}>
                  {project.name} {project.code ? `(${project.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subproject */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Subproject <span className="text-red-500">*</span>
            </label>
            <select
              name="subproject"
              value={formData.subproject}
              onChange={handleInputChange}
              disabled={!formData.project}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!formData.project ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">-- Select Subproject --</option>
              {subprojects.map((subproject, idx) => (
                <option key={idx} value={subproject.name}>
                  {subproject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Type --</option>
              <option value="heading">Heading</option>
              <option value="activity">Activities</option>
            </select>
          </div>

          {/* Activity Name / Heading Name */}
          {formData.type && (
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                {formData.type === 'heading' ? 'Heading Name' : 'Activity Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={formData.type === 'heading' ? 'Enter Heading Name' : 'Enter Activity Name'}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateActivity}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateActivityModal;
