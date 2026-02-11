'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  logo: string;
  code?: string;
  company?: string;
  location?: string;
}

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
}

interface CreateSubprojectModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultSubprojects?: Subproject[];
  userSubprojects?: Subproject[];
  onSubprojectCreated?: (subproject: Subproject) => void;
  defaultProject?: string;
}

const CreateSubprojectModal: React.FC<CreateSubprojectModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultSubprojects = [],
  userSubprojects = [],
  onSubprojectCreated,
  defaultProject = ''
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    subprojectName: '',
    plannedStartDate: '',
    plannedEndDate: '',
    project: defaultProject
  });
  const [projects, setProjects] = useState<Project[]>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lotus Rise',
        'Lakeshire',
        'Demo Data',
        'Residential Complex A',
        'Commercial Tower B'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectsData: Project[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectsData = parsed.map((project: any) => ({
            id: project.id || project.name,
            name: project.name,
            logo: project.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=C2D642&color=fff&size=128`,
            code: project.code,
            company: project.company,
            location: project.location
          }));
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      // Add default projects with images
      const defaultProjectsData: Project[] = defaultProjectNames.map((name, idx) => ({
        id: `default-${idx}`,
        name,
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C2D642&color=fff&size=128`
      }));

      setProjects([...defaultProjectsData, ...userProjectsData]);
    };

    loadProjects();

    window.addEventListener('projectsUpdated', loadProjects);

    return () => {
      window.removeEventListener('projectsUpdated', loadProjects);
    };
  }, []);

  // Reset form when modal closes or defaultProject changes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        subprojectName: '',
        plannedStartDate: '',
        plannedEndDate: '',
        project: ''
      });
    } else if (defaultProject) {
      setFormData(prev => ({
        ...prev,
        project: defaultProject
      }));
    }
  }, [isOpen, defaultProject]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateSubproject = () => {
    const missingFields: string[] = [];
    
    if (!formData.project) missingFields.push('Tag Project');
    if (!formData.subprojectName) missingFields.push('Subproject Name');
    if (!formData.plannedStartDate) missingFields.push('Plan Start Date');
    if (!formData.plannedEndDate) missingFields.push('Plan End Date');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (new Date(formData.plannedEndDate) < new Date(formData.plannedStartDate)) {
      toast.showWarning('Please enter appropriate end date. End date must be greater than or equal to start date.');
      return;
    }

    // Generate a code from the subproject name
    const defaultSubprojectsCount = defaultSubprojects.length;
    const userSubprojectsCount = userSubprojects.length;
    const code = formData.subprojectName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + String(defaultSubprojectsCount + userSubprojectsCount + 1).padStart(3, '0');

    const newSubproject: Subproject = {
      id: Date.now().toString(),
      name: formData.subprojectName,
      code: code,
      project: formData.project,
      status: 'Pending',
      progress: 0,
      startDate: formData.plannedStartDate,
      endDate: formData.plannedEndDate
    };

    // Save to localStorage
    const savedSubprojects = localStorage.getItem('subprojects');
    let existingSubprojects: any[] = [];
    if (savedSubprojects) {
      try {
        existingSubprojects = JSON.parse(savedSubprojects);
      } catch (e) {
        console.error('Error parsing subprojects:', e);
      }
    }

    existingSubprojects.push(newSubproject);
    localStorage.setItem('subprojects', JSON.stringify(existingSubprojects));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('subprojectsUpdated'));

    toast.showSuccess('Subproject created successfully!');
    
    if (onSubprojectCreated) {
      onSubprojectCreated(newSubproject);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Subproject</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter subproject details below</p>
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
          {/* Tag Project */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Tag Project <span className="text-red-500">*</span>
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
              {projects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name} {project.code ? `(${project.code})` : ''}
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

          {/* Plan Start Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Plan Start Date <span className="text-red-500">*</span>
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

          {/* Plan End Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Plan End Date <span className="text-red-500">*</span>
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
            onClick={handleCreateSubproject}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubprojectModal;
