'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { masterDataAPI } from '@/services/api';

interface ActivityItem {
  id: string;
  name?: string;
  project?: string;
  project_id?: number;
  subproject?: string;
  subproject_id?: number;
  type: 'heading' | 'activity' | 'activites';
  unit?: string;
  unit_id?: number;
  qty?: number;
  quantity?: number;
  rate?: number;
  amount?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  uuid?: string;
  activities?: string;
  heading?: number;
  parent_id?: number;
  createdAt?: string;
}

/** Shape passed to onActivityCreated - has required display fields */
export interface CreatedActivityItem extends ActivityItem {
  name: string;
  project: string;
  subproject: string;
}

interface CreateActivityModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onActivityCreated?: (activity: CreatedActivityItem) => void;
  editingActivityId?: string | null;
  activities?: ActivityItem[];
  projects?: Array<{ id: number; uuid: string; project_name: string }>;
  subprojects?: Array<{ id: number; uuid: string; name: string; project_id?: number }>;
  defaultProjectId?: string;
  defaultSubprojectId?: string;
  defaultHeadingId?: string;
  projectName?: string;
  subprojectName?: string;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  onActivityCreated,
  editingActivityId = null,
  activities = [],
  projects = [],
  subprojects = [],
  defaultProjectId = '',
  projectName = '',
  subprojectName = '',
  defaultSubprojectId = '',
  defaultHeadingId = ''
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
  const [activityHierarchy, setActivityHierarchy] = useState<Array<{ id: number; uuid: string; name: string; depth: number; type: string }>>([]);
  const [modalSubprojects, setModalSubprojects] = useState<Array<{ id: number; uuid: string; name: string; project_id?: number }>>([]);
  const [units, setUnits] = useState<Array<{ id: number; unit: string; uuid?: string }>>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [isLoadingHeadings, setIsLoadingHeadings] = useState<boolean>(false);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingActivityId;

  // Fetch units from Masters (unit-list API) - same source as Masters > Units
  useEffect(() => {
    const fetchUnits = async () => {
      if (!isOpen) return;

      setIsLoadingUnits(true);
      try {
        const fetchedUnits = await masterDataAPI.getUnits();
        const raw = Array.isArray(fetchedUnits) ? fetchedUnits : [];
        const transformedUnits = raw
          .filter((unit: any) => {
            const isActive = unit.is_active;
            return isActive === 1 || isActive === '1' || isActive === true || isActive === undefined || isActive === null;
          })
          .map((unit: any) => ({
            id: unit.id,
            unit: (unit.unit || unit.name || '').toString().trim(),
            uuid: unit.uuid
          }))
          .filter((u) => u.unit)
          .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
          .sort((a, b) => a.unit.localeCompare(b.unit, undefined, { sensitivity: 'base' }));
        setUnits(transformedUnits);
      } catch (error: any) {
        console.error('Failed to fetch units from masters:', error);
        toast.showError('Failed to load units from Masters');
        setUnits([]);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [isOpen]);

  // Fetch subprojects when project is selected in modal
  useEffect(() => {
    const fetchSubprojects = async () => {
      if (!isOpen || !formData.project) {
        setModalSubprojects((prev) => (prev.length > 0 ? [] : prev));
        return;
      }
      const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
      const projectIdForApi = projectIdNum ?? formData.project;
      setIsLoadingSubprojects(true);
      try {
        const result = await masterDataAPI.getSubprojects(projectIdForApi);
        const list = Array.isArray(result) ? result : (result as any)?.subProject || (result as any)?.data || [];
        setModalSubprojects(list.map((s: any) => ({
          id: s.id,
          uuid: s.uuid || String(s.id),
          name: s.name || s.subproject_name || '',
          project_id: s.project_id || s.tag_project
        })));
      } catch (error: any) {
        console.error('Failed to fetch subprojects:', error);
        setModalSubprojects([]);
        toast.showError('Failed to load subprojects');
      } finally {
        setIsLoadingSubprojects(false);
      }
    };
    fetchSubprojects();
  }, [isOpen, formData.project, projects]);

  // Fetch full activities hierarchy (headings + activities) when project and type are selected
  useEffect(() => {
    const fetchHierarchy = async () => {
      if (!isOpen || !formData.project || formData.type !== 'activites') {
        setActivityHierarchy((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      setIsLoadingHeadings(true);
      try {
        const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
        const subprojectIdNum = formData.subproject
          ? modalSubprojects.find(s => s.uuid === formData.subproject || String(s.id) === formData.subproject)?.id
          : undefined;
        const result = await masterDataAPI.getActivities(projectIdNum || formData.project, subprojectIdNum);
        const raw = Array.isArray(result) ? result : (result?.data ?? []);
        const isHeading = (a: any) => {
          const t = a.type ?? a.activity_type ?? '';
          return t && String(t).toLowerCase() === 'heading';
        };
        const headings = raw.filter(isHeading);
        const activities = raw.filter((a: any) => !isHeading(a));
        const getNodeId = (a: any) => a.id ?? (typeof a.uuid === 'string' && !isNaN(Number(a.uuid)) ? Number(a.uuid) : null);
        const getParentId = (a: any) => a.parent_id ?? a.heading;

        const hierarchy: Array<{ id: number; uuid: string; name: string; depth: number; type: string }> = [];
        for (const h of headings) {
          const hid = getNodeId(h);
          hierarchy.push({
            id: h.id,
            uuid: h.uuid || String(h.id),
            name: (h.activities || h.name || '').trim() || '—',
            depth: 0,
            type: 'heading'
          });
          const kids = activities.filter((c: any) => {
            const pid = getParentId(c);
            if (pid == null) return false;
            return pid === hid || String(pid) === String(h.id);
          });
          kids.forEach((k: any) => {
            hierarchy.push({
              id: k.id,
              uuid: k.uuid || String(k.id),
              name: (k.activities || k.name || '').trim() || '—',
              depth: 1,
              type: 'activity'
            });
          });
        }
        setActivityHierarchy(hierarchy);
      } catch (error: any) {
        console.error('Failed to fetch activities hierarchy:', error);
        toast.showError('Failed to load activities hierarchy');
      } finally {
        setIsLoadingHeadings(false);
      }
    };

    fetchHierarchy();
  }, [isOpen, formData.project, formData.subproject, formData.type, projects, modalSubprojects]);

  // Load activity data when editing (preserve all fields; use ?? to keep 0 for quantity/rate/amount)
  useEffect(() => {
    if (isOpen && editingActivityId) {
      const loadActivityData = async () => {
        try {
          const d = await masterDataAPI.getActivity(editingActivityId);
          // API returns project/heading/subproject/unit_id as nested objects; extract ids
          const projectVal = d.project_id ?? d.project?.id ?? '';
          const subprojectVal = d.subproject_id ?? d.subproject?.id ?? '';
          const typeVal = d.type ?? d.activity_type ?? '';
          const activitiesVal = d.activities ?? d.name ?? d.activity_name ?? '';
          const headingVal = d.parent_id ?? d.heading?.id ?? (typeof d.heading === 'object' && d.heading != null ? d.heading.id : null) ?? '';
          const unitIdVal = (typeof d.unit_id === 'object' && d.unit_id != null && d.unit_id.id != null) ? d.unit_id.id : (d.unit_id ?? d.unit?.id ?? d.units?.id ?? '');
          const qtyVal = d.quantity ?? d.qty ?? d.estimate_qty ?? '';
          const rateVal = d.rate ?? d.est_rate ?? '';
          const amountVal = d.amount ?? d.est_amount ?? '';
          setFormData({
            project: String(projectVal),
            subproject: subprojectVal ? String(subprojectVal) : '',
            type: typeVal ? String(typeVal) : '',
            activities: activitiesVal ? String(activitiesVal) : '',
            heading: headingVal ? String(headingVal) : '',
            unit_id: unitIdVal ? String(unitIdVal) : '',
            quantity: qtyVal !== '' && qtyVal !== null && qtyVal !== undefined ? String(qtyVal) : '',
            rate: rateVal !== '' && rateVal !== null && rateVal !== undefined ? String(rateVal) : '',
            amount: amountVal !== '' && amountVal !== null && amountVal !== undefined ? String(amountVal) : '',
            start_date: (d.start_date ?? d.startDate ?? '').toString().trim(),
            end_date: (d.end_date ?? d.endDate ?? '').toString().trim()
          });
        } catch (error: any) {
          console.error('Failed to load activity data:', error);
          toast.showError('Failed to load activity data');
        }
      };
      loadActivityData();
    } else if (isOpen && !editingActivityId) {
      // Reset form for new activity (pre-fill heading when adding under a specific heading)
      setFormData({
        project: defaultProjectId || '',
        subproject: defaultSubprojectId || '',
        type: defaultHeadingId ? 'activites' : '',
        activities: '',
        heading: defaultHeadingId || '',
        unit_id: '',
        quantity: '',
        rate: '',
        amount: '',
        start_date: '',
        end_date: ''
      });
    }
  }, [isOpen, editingActivityId, defaultProjectId, defaultSubprojectId, defaultHeadingId]);

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
    } else if (name === 'project') {
      // Reset subproject when project changes (subprojects are project-specific)
      setFormData({
        ...formData,
        project: value,
        subproject: ''
      });
    } else if (name === 'quantity' || name === 'rate' || name === 'amount') {
      // Rate & Amount auto-calculation (non-mandatory): Amount = Est Qty * Rate, or Rate = Amount / Qty
      const qtyVal = name === 'quantity' ? value : formData.quantity;
      const rateVal = name === 'rate' ? value : formData.rate;
      const amountVal = name === 'amount' ? value : formData.amount;
      const qty = parseFloat(qtyVal as string);
      const rate = parseFloat(rateVal as string);
      const amount = parseFloat(amountVal as string);

      let newQuantity = formData.quantity;
      let newRate = formData.rate;
      let newAmount = formData.amount;

      if (name === 'quantity') {
        newQuantity = value as string;
        if (!isNaN(qty) && qty > 0) {
          if (!isNaN(rate) && rate >= 0) newAmount = String(Math.round(qty * rate * 100) / 100);
          else if (!isNaN(amount) && amount >= 0) newRate = String(Math.round((amount / qty) * 100) / 100);
        }
      } else if (name === 'rate') {
        newRate = value as string;
        if (!isNaN(qty) && qty > 0 && rateVal !== '' && !isNaN(rate))
          newAmount = String(Math.round(qty * rate * 100) / 100);
      } else if (name === 'amount') {
        newAmount = value as string;
        if (!isNaN(qty) && qty > 0 && amountVal !== '' && !isNaN(amount))
          newRate = String(Math.round((amount / qty) * 100) / 100);
      }

      setFormData({
        ...formData,
        quantity: newQuantity,
        rate: newRate,
        amount: newAmount
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const validateForm = (): boolean => {
    const missingFields: string[] = [];
    if (!formData.project) missingFields.push('Project');
    if (!formData.type || !['heading', 'activites'].includes(formData.type)) missingFields.push('Type');
    if (!formData.activities.trim()) missingFields.push(formData.type === 'heading' ? 'Heading Name' : 'Activity Name');

    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return false;
    }

    // If type is 'activites', heading and unit_id are required
    if (formData.type === 'activites') {
      const hasHeadings = activityHierarchy.some((item) => item.depth === 0 || item.type === 'heading');
      if (!hasHeadings) {
        toast.showWarning('No headings found. Please add a heading first, then add activities.');
        return false;
      }
      if (!formData.heading) {
        toast.showWarning('Required field "Heading (Parent Activity)" is empty. Please fill it before submitting.');
        return false;
      }
      if (!formData.unit_id) {
        toast.showWarning('Required field "Unit" is empty. Please fill it before submitting.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.showWarning('Please enter appropriate end date. End date must be greater than or equal to start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectIdNum = projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.id;
      
      const payload: any = {
        project: projectIdNum || formData.project,
        type: formData.type,
        activities: formData.activities.trim(),
        is_active: 1 // Active by default when creating
      };

      // Add optional subproject if provided
      if (formData.subproject) {
        const subprojectIdNum = modalSubprojects.find(s => s.uuid === formData.subproject || String(s.id) === formData.subproject)?.id;
        payload.subproject = subprojectIdNum || formData.subproject;
      }

      // Add conditional fields if type is 'activites'
      if (formData.type === 'activites') {
        const parentItem = activityHierarchy.find(h => h.uuid === formData.heading || String(h.id) === formData.heading);
        const parentId = parentItem?.id ?? formData.heading;
        payload.heading = parentId;
        payload.parent_id = parentId;
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
        const result = await masterDataAPI.createActivity(payload);
        toast.showSuccess('Activity created successfully!');
        const created = result?.data ?? result;
        if (onActivityCreated && created) {
          const newActivity: CreatedActivityItem = {
            id: created.uuid || String(created.id),
            name: created.activities || created.name || formData.activities.trim() || '',
            project: projectName || projects.find(p => p.uuid === formData.project || String(p.id) === formData.project)?.project_name || '',
            subproject: subprojectName || modalSubprojects.find(s => s.uuid === formData.subproject || String(s.id) === formData.subproject)?.name || '',
            type: (formData.type === 'heading' ? 'heading' : 'activity') as 'heading' | 'activity',
            unit: created.unit?.unit || created.unit?.name || formData.unit_id ? units.find(u => String(u.id) === formData.unit_id)?.unit : undefined,
            qty: created.quantity ?? created.qty,
            rate: created.rate,
            amount: created.amount,
            startDate: created.start_date || formData.start_date,
            endDate: created.end_date || formData.end_date,
            createdAt: created.created_at
          };
          onActivityCreated(newActivity);
        }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <button onClick={onClose} disabled={isSubmitting} className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`} title="Close">
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-6 pr-14 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Activity' : 'Create New Activity/Heading'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update activity details below' : 'Enter activity details below'}
            </p>
          </div>
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
              Subproject
            </label>
            {isLoadingSubprojects ? (
              <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subprojects...
              </div>
            ) : (
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
                <option value="">-- Select Subproject --</option>
                {modalSubprojects.map((subproject) => (
                  <option key={subproject.uuid || subproject.id} value={subproject.uuid || String(subproject.id)}>
                    {subproject.name}
                  </option>
                ))}
              </select>
            )}
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
              {/* Heading/Subheading - full activities hierarchy */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Heading/Subheading <span className="text-red-500">*</span>
                </label>
                {isLoadingHeadings ? (
                  <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading activities hierarchy...
                  </div>
                ) : !activityHierarchy.some((item) => item.depth === 0 || item.type === 'heading') ? (
                  <div className={`w-full px-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-amber-500/10 border-amber-500/50 text-amber-600' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    No headings found. Please add a heading first, then add activities.
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
                    <option value="">-- Select Heading/Subheading --</option>
                    {activityHierarchy.map((item) => (
                      <option key={`${item.id}-${item.uuid}`} value={item.uuid || String(item.id)}>
                        {item.depth === 0 ? item.name : `\u00A0\u00A0\u00A0\u00A0└ ${item.name}`}
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

              {/* Est Qty, Rate, Amount */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Est Qty (Optional)
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
                  <DatePickerInput
                    name="start_date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    disabled={isSubmitting}
                    iconClassName={textSecondary}
                    className={`${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                        : 'bg-white border-slate-200 text-slate-900'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    End Date (Optional)
                  </label>
                  <DatePickerInput
                    name="end_date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    disabled={isSubmitting}
                    iconClassName={textSecondary}
                    className={`${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                        : 'bg-white border-slate-200 text-slate-900'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 disabled:opacity-50`}
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
            disabled={isSubmitting || isLoadingUnits || isLoadingHeadings || (formData.type === 'activites' && !activityHierarchy.some((item) => item.depth === 0 || item.type === 'heading'))}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreateActivityModal;
