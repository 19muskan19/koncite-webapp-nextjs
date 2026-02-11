'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import { getExactErrorMessage } from '@/utils/errorUtils';

interface Material {
  id: string;
  uuid?: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  unit_id?: number;
  createdAt?: string;
}

interface CreateMaterialModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingMaterialId?: string | null;
  editingMaterial?: Material | null;
  materials?: Material[];
  classOptions?: Array<{ value: 'A' | 'B' | 'C'; label: string }>;
}

const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingMaterialId = null,
  editingMaterial = null,
  materials = [],
  classOptions = [
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
  ],
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    class: '', // Required: must be "A", "B", or "C"
    name: '', // Required: material name
    unit_id: '', // Required: unit ID (must exist in units table)
    specification: '' // Optional: material specifications/details
  });
  const [units, setUnits] = useState<Array<{ id: number; unit: string; uuid?: string }>>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingMaterialId;

  // Fetch units from API
  useEffect(() => {
    const fetchUnits = async () => {
      if (!isOpen) return;
      
      setIsLoadingUnits(true);
      try {
        const fetchedUnits = await masterDataAPI.getUnits();
        // Transform API response to match unit structure
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

  // Load material data when editing
  useEffect(() => {
    if (isOpen && editingMaterialId) {
      const loadMaterialData = async () => {
        try {
          const materialData = await masterDataAPI.getMaterial(editingMaterialId);
          const materialClass = materialData.class?.value || materialData.class || '';
          const unitId =
            materialData.unit_id ??
            materialData.unit?.id ??
            materialData.units?.id ??
            materialData.units?.unit_id ??
            materialData.data?.unit_id ??
            (editingMaterial?.unit_id ?? '');
          setFormData({
            class: materialClass,
            name: materialData.name || '',
            unit_id: String(unitId || ''),
            specification: materialData.specification ?? ''
          });
        } catch (error: any) {
          console.error('Failed to load material data:', error);
          toast.showError('Failed to load material data');
        }
      };
      loadMaterialData();
    } else if (isOpen && !editingMaterialId) {
      // Reset form for new material
      setFormData({
        class: '',
        name: '',
        unit_id: '',
        specification: ''
      });
    }
  }, [isOpen, editingMaterialId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        class: '',
        name: '',
        unit_id: '',
        specification: ''
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
    if (!formData.class || !['A', 'B', 'C'].includes(formData.class)) {
      toast.showWarning('Material class must be A, B, or C');
      return false;
    }

    if (!formData.name.trim()) {
      toast.showWarning('Material name is required');
      return false;
    }

    if (!formData.unit_id) {
      toast.showWarning('Unit is required');
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
      const payload: any = {
        class: formData.class,
        name: formData.name.trim(),
        unit_id: Number(formData.unit_id)
      };

      // Add optional specification if provided
      if (formData.specification.trim()) {
        payload.specification = formData.specification.trim();
      }

      if (isEditing && editingMaterialId) {
        // Update existing material
        await masterDataAPI.updateMaterial(editingMaterialId, payload);
        toast.showSuccess('Material updated successfully!');
      } else {
        // Create new material
        await masterDataAPI.createMaterial(payload);
        toast.showSuccess('Material created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save material:', error);
      toast.showError(getExactErrorMessage(error) || 'Failed to save material');
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
              {isEditing ? 'Edit Material' : 'Create New Material'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update material details below' : 'Enter material details below'}
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
          {/* Material Class */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Material Class <span className="text-red-500">*</span>
            </label>
            <select
              name="class"
              value={formData.class}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Material Class --</option>
              {classOptions.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Material Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter material name"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Specification */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Specification (Optional)
            </label>
            <input
              type="text"
              name="specification"
              value={formData.specification}
              onChange={handleInputChange}
              placeholder="Enter specification (optional)"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
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

export default CreateMaterialModal;
