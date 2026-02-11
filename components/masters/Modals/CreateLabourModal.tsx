'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface Labour {
  id: string;
  uuid?: string;
  name: string;
  code?: string;
  category: 'skilled' | 'semiskilled' | 'unskilled';
  unit_id?: number;
  unit?: {
    id: number;
    unit: string;
  };
  status?: 'Active' | 'Inactive';
}

interface CreateLabourModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdLabour?: any, updatedLabour?: { labourId: string; unit_id: number; unit: { id: number; unit: string } }) => void;
  editingLabourId?: string | null; // UUID for GET /labour-edit/{uuid}
  editingLabourNumericId?: number | string | null; // Numeric ID for API calls if needed
  labours?: Labour[];
}

const CreateLabourModal: React.FC<CreateLabourModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingLabourId = null,
  editingLabourNumericId = null,
  labours = []
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', // Required: labour name
    code: '', // Optional: auto-generated (LAB0001, LAB0002) if blank
    category: '', // Required: must be "skilled", "semiskilled", or "unskilled"
    unit_id: '' // Required: ID of measurement unit
  });
  const [units, setUnits] = useState<Array<{ id: number; unit: string; uuid?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingLabourId && !!editingLabourNumericId;

  const categoryOptions = [
    { value: 'skilled', label: 'Skilled' },
    { value: 'semiskilled', label: 'Semi Skilled' },
    { value: 'unskilled', label: 'Unskilled' },
  ];

  // Fetch units from API
  useEffect(() => {
    if (isOpen) {
      const fetchUnits = async () => {
        setIsLoadingUnits(true);
        try {
          const fetchedUnits = await masterDataAPI.getUnits();
          const transformedUnits = fetchedUnits.map((unit: any) => ({
            id: unit.id,
            uuid: unit.uuid,
            unit: unit.unit || unit.name || '',
          }));
          setUnits(transformedUnits);
          // Default to "Nos" for new labour when unit not yet selected
          if (!editingLabourId) {
            const nosUnit = transformedUnits.find((u: any) => (u.unit || '').toString().toLowerCase() === 'nos');
            if (nosUnit) {
              setFormData(prev => (prev.unit_id ? prev : { ...prev, unit_id: String(nosUnit.id) }));
            }
          }
        } catch (error: any) {
          console.error('Failed to fetch units:', error);
          toast.showError('Failed to load units');
        } finally {
          setIsLoadingUnits(false);
        }
      };
      fetchUnits();
    }
  }, [isOpen]);

  // Load labour data when editing
  useEffect(() => {
    if (isOpen && editingLabourId) {
      const loadLabourData = async () => {
        try {
          const labourData = await masterDataAPI.getLabour(editingLabourId);
          // Extract numeric unit_id - API may return unit as object
          let unitId = labourData.unit_id ?? labourData.unit?.id;
          if (typeof unitId === 'object' && unitId !== null && (unitId as any).id != null) {
            unitId = (unitId as any).id;
          }
          setFormData({
            name: labourData.name || '',
            code: labourData.code || '',
            category: labourData.category || '',
            unit_id: String(unitId ?? '')
          });
        } catch (error: any) {
          console.error('Failed to load labour data:', error);
          toast.showError('Failed to load labour data');
        }
      };
      loadLabourData();
    } else if (isOpen && !editingLabourId) {
      // Reset form for new labour
      setFormData({
        name: '',
        code: '',
        category: '',
        unit_id: ''
      });
    }
  }, [isOpen, editingLabourId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        code: '',
        category: '',
        unit_id: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    const missingFields: string[] = [];
    if (!formData.name.trim()) missingFields.push('Labour Name');
    if (!formData.category) missingFields.push('Category');
    if (!formData.unit_id) missingFields.push('Unit Type');

    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return false;
    }

    if (!['skilled', 'semiskilled', 'unskilled'].includes(formData.category)) {
      toast.showWarning('Category must be one of: Skilled, Semi Skilled, or Unskilled');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure unit_id is numeric - backend expects integer
      const unitId = formData.unit_id ? Number(formData.unit_id) : undefined;
      const payload: any = {
        name: formData.name.trim(),
        category: formData.category,
        unit_id: unitId
      };
      if (formData.code.trim()) payload.code = formData.code.trim();

      if (isEditing && editingLabourId) {
        // Update existing labour - use UUID for update API
        await masterDataAPI.updateLabour(editingLabourId, payload);
        toast.showSuccess('Labour updated successfully!');
        // Pass updated unit so table reflects the change immediately
        if (onSuccess) {
          if (unitId) {
            const selectedUnit = units.find(u => u.id === unitId);
            onSuccess(undefined, {
              labourId: String(editingLabourNumericId ?? editingLabourId),
              unit_id: unitId,
              unit: selectedUnit ? { id: selectedUnit.id, unit: selectedUnit.unit } : { id: unitId, unit: 'Nos' }
            });
          } else {
            onSuccess();
          }
          onClose();
          return;
        }
      } else {
        // Create new labour - set is_active to 1 (active) by default
        payload.is_active = 1;
        console.log('📦 Creating new labour with is_active = 1 (active by default)');
        const response = await masterDataAPI.createLabour(payload);
        toast.showSuccess('Labour created successfully!');
        // Extract created labour with code from labour-add response (returns code e.g. "L415190")
        const createdLabour = response?.data ?? response;
        if (onSuccess && createdLabour && (createdLabour.id != null || createdLabour.uuid)) {
          onSuccess(createdLabour);
          onClose();
          return;
        }
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save labour:', error);
      toast.showError(error.message || 'Failed to save labour');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Labour' : 'Create New Labour'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update labour details below' : 'Enter labour details below'}
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
          {/* Labour Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Labour Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter labour name (e.g., Mason, Supervisor, Helper)"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Code (optional - auto-generated if blank) */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Code <span className={`text-xs ${textSecondary}`}>(optional, auto-generated if blank)</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="e.g. LAB0001 or leave blank for auto-generation"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Category --</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Type */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Type <span className="text-red-500">*</span>
            </label>
            {isLoadingUnits ? (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                <span className={`text-sm ${textSecondary}`}>Loading units...</span>
              </div>
            ) : (
              <select
                name="unit_id"
                value={formData.unit_id}
                onChange={handleInputChange}
                disabled={isSubmitting}
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
            {units.length === 0 && !isLoadingUnits && (
              <p className={`text-xs mt-1 ${textSecondary}`}>
                No units available. Please create a unit first.
              </p>
            )}
          </div>
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
            disabled={isSubmitting || isLoadingUnits}
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

export default CreateLabourModal;
