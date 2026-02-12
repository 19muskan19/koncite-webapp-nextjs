'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface Project {
  id: number | string;
  uuid?: string;
  name: string;
  project_name?: string;
  logo?: string;
  code?: string;
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
  /** Project ID (uuid or numeric) to preselect when opened from DPR */
  defaultProjectId?: string;
  /** Project name for display when preselecting */
  defaultProjectName?: string;
}

const CreateSubprojectModal: React.FC<CreateSubprojectModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultSubprojects = [],
  userSubprojects = [],
  onSubprojectCreated,
  defaultProjectId = '',
  defaultProjectName = ''
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    projectId: '',
    subprojectName: '',
    plannedStartDate: '',
    plannedEndDate: '',
    status: 'pending' as string
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Fetch projects from API when modal opens - uses auth token (Bearer) from login
  useEffect(() => {
    if (!isOpen) return;

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await masterDataAPI.getProjects();
        const list = Array.isArray(fetchedProjects) ? fetchedProjects : [];
        setProjects(list);
        // Preselect project when opened from DPR with a selected project
        if (defaultProjectId && list.length > 0) {
          const match = list.find(
            (p: any) =>
              String(p.id) === defaultProjectId ||
              p.uuid === defaultProjectId ||
              String(p.uuid) === defaultProjectId
          );
          if (match) {
            setFormData((prev) => ({
              ...prev,
              projectId: String(match.uuid || match.id)
            }));
          }
        }
      } catch {
        toast.showError('Failed to load projects');
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isOpen, defaultProjectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        projectId: '',
        subprojectName: '',
        plannedStartDate: '',
        plannedEndDate: '',
        status: 'pending'
      });
    } else if (defaultProjectId) {
      setFormData((prev) => ({
        ...prev,
        projectId: defaultProjectId
      }));
    }
  }, [isOpen, defaultProjectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateSubproject = async () => {
    const missingFields: string[] = [];
    if (!formData.projectId) missingFields.push('Tag Project');
    if (!formData.subprojectName?.trim()) missingFields.push('Subproject Name');
    if (!formData.plannedStartDate) missingFields.push('Plan Start Date');
    if (!formData.plannedEndDate) missingFields.push('Plan End Date');

    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (new Date(formData.plannedEndDate) < new Date(formData.plannedStartDate)) {
      toast.showWarning('End date must be greater than or equal to start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const project = projects.find(
        (p: any) => String(p.uuid || p.id) === formData.projectId
      );
      const tagProjectId = project?.id ?? formData.projectId;

      const payload = {
        name: formData.subprojectName.trim(),
        start_date: formData.plannedStartDate,
        end_date: formData.plannedEndDate,
        tag_project: tagProjectId,
        status: formData.status
      };

      const result = await masterDataAPI.createSubproject(payload);
      const created = result?.data ?? result;

      const newSubproject: Subproject = {
        id: created?.uuid || String(created?.id || Date.now()),
        name: created?.name || formData.subprojectName,
        code: created?.code || `SUB${String(created?.id || '').padStart(3, '0')}`,
        project: project?.project_name || project?.name || defaultProjectName || '',
        status: created?.status || formData.status,
        progress: created?.progress ?? 0,
        startDate: created?.start_date || formData.plannedStartDate,
        endDate: created?.end_date || formData.plannedEndDate
      };

      toast.showSuccess('Subproject created successfully!');

      if (onSubprojectCreated) {
        onSubprojectCreated(newSubproject);
      }
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      toast.showError(error?.message || 'Failed to create subproject');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Subproject</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Enter subproject details below. Projects shown are associated with your account.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Tag Project <span className="text-red-500">*</span>
            </label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleInputChange}
              disabled={isLoadingProjects || isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">
                {isLoadingProjects ? 'Loading projects...' : '-- Select Project --'}
              </option>
              {projects.map((project: any) => (
                <option key={project.uuid || project.id} value={project.uuid || String(project.id)}>
                  {project.project_name || project.name} {project.code ? `(${project.code})` : ''}
                </option>
              ))}
            </select>
          </div>

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
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Plan Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="plannedStartDate"
              value={formData.plannedStartDate}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

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
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="closed">Closed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateSubproject}
            disabled={isSubmitting || isLoadingProjects || projects.length === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubprojectModal;
