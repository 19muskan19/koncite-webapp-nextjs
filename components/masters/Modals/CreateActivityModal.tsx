'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface ActivityItem {
  id: string;
  uuid?: string;
  name?: string;
  activities?: string;
  project_id?: number;
  subproject_id?: number;
  type: 'heading' | 'activity' | 'activites';
  unit_id?: number;
  qty?: number;
  quantity?: number;
  rate?: number;
  amount?: number;
  start_date?: string;
  end_date?: string;
  heading?: number;
  parent_id?: number;
}

interface CreateActivityModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingActivityId?: string | null;
  activities?: ActivityItem[];
  projects?: Array<{ id: number; uuid: string; project_name: string }>;
  subprojects?: Array<{ id: number; uuid: string; name: string; project_id?: number }>;
  defaultProjectId?: string;
  defaultSubprojectId?: string;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingActivityId = null,
  activities = [],
  projects = [],
  subprojects = [],
  defaultProjectId = '',
  defaultSubprojectId = ''
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    project: '', // Required: project ID
    subproject: '', // Optional: subproject ID
    type: '', // Required: "heading" or "activites"
    activities: '', // Required: activity name/description
    heading: '', // Conditional: parent activity ID (required if type = 'activites')
    unit_id: '', // Conditional: unit ID (required if type = 'activites')
    quantity: '', // Optional: quantity (defaults to 0)
    rate: '', // Optional: rate (defaults to 0)
    amount: '', // Optional: amount (defaults to 0)
    start_date: '', // Optional: start date
    end_date: '' // Optional: end date
  });
  const [availableHeadings, setAvailableHeadings] = useState<Array<{ id: number; uuid: string; activities: string }>>([]);
  const [units, setUnits] = useState<Array<{ id: number; unit: string; uuid?: string }>>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [isLoadingHeadings, setIsLoadingHeadings] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingActivityId;

  // Fetch units from API
  useEffect(() => {
    const fetchUnits = async () => {
      if (!isOpen) return;
      
      setIsLoadingUnits(true);
      try {
        const fetchedUnits = await masterDataAPI.getUnits();
        const transformedUnits = fetchedUnits.map((unit: any) => ({
          id: unit.id,
          unit: unit.unit || unit.name || '',
          uuid: unit.uuid
        }));
        setUnits(transformedUnits);
      } catch (error: any) {
        console.error('Failed to fetch units:', error);
        toast.showError('Failed to load units');
      } finally {
        setIsLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [isOpen]);

  // Fetch headings when project and type are selected
  useEffect(() => {
    const fetchHeadings = async () => {
      if (!isOpen || !formData.project || formData.type !== 'activites') {
        setAvailableHeadings([]);
        return;
      }
      
      setIsLoadingHeadings(true);
      try {
        const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
        const fetchedActivities = await masterDataAPI.getActivities(projectIdNum || formData.project);
        // Filter headings (type = 'heading')
        const headings = fetchedActivities
          .filter((a: any) => a.type === 'heading')
          .map((a: any) => ({
            id: a.id,
            uuid: a.uuid || String(a.id),
            activities: a.activities || a.name || ''
          }));
        setAvailableHeadings(headings);
      } catch (error: any) {
        console.error('Failed to fetch headings:', error);
        toast.showError('Failed to load headings');
      } finally {
        setIsLoadingHeadings(false);
      }
    };

    fetchHeadings();
  }, [isOpen, formData.project, formData.type]);

  // Load activity data when editing
  useEffect(() => {
    if (isOpen && editingActivityId) {
      const loadActivityData = async () => {
        try {
          const activityData = await masterDataAPI.getActivity(editingActivityId);
          setFormData({
            project: String(activityData.project_id || activityData.project?.id || ''),
            subproject: activityData.subproject_id || activityData.subproject?.id ? String(activityData.subproject_id || activityData.subproject?.id) : '',
            type: activityData.type || '',
            activities: activityData.activities || activityData.name || '',
            heading: activityData.heading || activityData.parent_id ? String(activityData.heading || activityData.parent_id) : '',
            unit_id: activityData.unit_id || activityData.unit?.id ? String(activityData.unit_id || activityData.unit?.id) : '',
            quantity: activityData.quantity || activityData.qty ? String(activityData.quantity || activityData.qty) : '',
            rate: activityData.rate ? String(activityData.rate) : '',
            amount: activityData.amount ? String(activityData.amount) : '',
            start_date: activityData.start_date || activityData.startDate || '',
            end_date: activityData.end_date || activityData.endDate || ''
          });
        } catch (error: any) {
          console.error('Failed to load activity data:', error);
          toast.showError('Failed to load activity data');
        }
      };
      loadActivityData();
    } else if (isOpen && !editingActivityId) {
      // Reset form for new activity
      setFormData({
        project: defaultProjectId || '',
        subproject: defaultSubprojectId || '',
        type: '',
        activities: '',
        heading: '',
        unit_id: '',
        quantity: '',
        rate: '',
        amount: '',
        start_date: '',
        end_date: ''
      });
    }
  }, [isOpen, editingActivityId, defaultProjectId, defaultSubprojectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        project: '',
        subproject: '',
        type: '',
        activities: '',
        heading: '',
        unit_id: '',
        quantity: '',
        rate: '',
        amount: '',
        start_date: '',
        end_date: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Reset heading and unit_id when type changes
    if (name === 'type') {
      setFormData({
        ...formData,
        type: value,
        heading: '',
        unit_id: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.project) {
      toast.showWarning('Project is required');
      return false;
    }

    if (!formData.type || !['heading', 'activites'].includes(formData.type)) {
      toast.showWarning('Type must be "heading" or "activites"');
      return false;
    }

    if (!formData.activities.trim()) {
      toast.showWarning('Activity name is required');
      return false;
    }

    // If type is 'activites', heading and unit_id are required
    if (formData.type === 'activites') {
      if (!formData.heading) {
        toast.showWarning('Heading (parent activity) is required for activities');
        return false;
      }
      if (!formData.unit_id) {
        toast.showWarning('Unit is required for activities');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
      
      const payload: any = {
        project: projectIdNum || formData.project,
        type: formData.type,
        activities: formData.activities.trim()
      };

      // Add optional subproject if provided
      if (formData.subproject) {
        const subprojectIdNum = subprojects.find(s => s.uuid === formData.subproject || String(s.id) === formData.subproject)?.id;
        payload.subproject = subprojectIdNum || formData.subproject;
      }

      // Add conditional fields if type is 'activites'
      if (formData.type === 'activites') {
        const headingIdNum = availableHeadings.find(h => h.uuid === formData.heading || String(h.id) === formData.heading)?.id;
        payload.heading = headingIdNum || formData.heading;
        payload.unit_id = Number(formData.unit_id);
      }

      // Add optional fields if provided
      if (formData.quantity) payload.quantity = Number(formData.quantity);
      if (formData.rate) payload.rate = Number(formData.rate);
      if (formData.amount) payload.amount = Number(formData.amount);
      if (formData.start_date) payload.start_date = formData.start_date;
      if (formData.end_date) payload.end_date = formData.end_date;

      if (isEditing && editingActivityId) {
        // Update existing activity
        await masterDataAPI.updateActivity(editingActivityId, payload);
        toast.showSuccess('Activity updated successfully!');
      } else {
        // Create new activity
        await masterDataAPI.createActivity(payload);
        toast.showSuccess('Activity created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save activity:', error);
      toast.showError(error.message || 'Failed to save activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered subprojects for selected project
  const filteredSubprojects = useMemo(() => {
    if (!formData.project) return [];
    const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
    return subprojects.filter(s => 
      s.project_id === projectIdNum || 
      s.uuid === formData.project || 
      String(s.id) === formData.project
    );
  }, [formData.project, subprojects, projects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Activity' : 'Create New Activity/Heading'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update activity details below' : 'Enter activity details below'}
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

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Project */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <select
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              disabled={isSubmitting || isEditing}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => (
                <option key={project.uuid || project.id} value={project.uuid || String(project.id)}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subproject */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Subproject (Optional)
            </label>
            <select
              name="subproject"
              value={formData.subproject}
              onChange={handleInputChange}
              disabled={!formData.project || isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Subproject (Optional) --</option>
              {filteredSubprojects.map((subproject: { id: number; uuid: string; name: string; project_id?: number }) => (
                <option key={subproject.uuid || subproject.id} value={subproject.uuid || String(subproject.id)}>
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
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Type --</option>
              <option value="heading">Heading</option>
              <option value="activites">Activities</option>
            </select>
          </div>

          {/* Activity Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              {formData.type === 'heading' ? 'Heading Name' : 'Activity Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="activities"
              value={formData.activities}
              onChange={handleInputChange}
              placeholder={formData.type === 'heading' ? 'Enter Heading Name' : 'Enter Activity Name'}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Conditional Fields for Activities */}
          {formData.type === 'activites' && (
            <>
              {/* Heading (Parent Activity) */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Heading (Parent Activity) <span className="text-red-500">*</span>
                </label>
                {isLoadingHeadings ? (
                  <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading headings...
                  </div>
                ) : (
                  <select
                    name="heading"
                    value={formData.heading}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoadingHeadings}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    <option value="">-- Select Heading --</option>
                    {availableHeadings.map((heading) => (
                      <option key={heading.uuid || heading.id} value={heading.uuid || String(heading.id)}>
                        {heading.activities}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Unit */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Unit <span className="text-red-500">*</span>
                </label>
                {isLoadingUnits ? (
                  <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading units...
                  </div>
                ) : (
                  <select
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoadingUnits}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    <option value="">-- Select Unit --</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity, Rate, Amount */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="0"
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
                    Rate (Optional)
                  </label>
                  <input
                    type="number"
                    name="rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                    placeholder="0"
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
                    Amount (Optional)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  />
                </div>
              </div>

              {/* Start Date and End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                        : 'bg-white border-slate-200 text-slate-900'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                        : 'bg-white border-slate-200 text-slate-900'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
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
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingUnits || isLoadingHeadings}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateActivityModal;
