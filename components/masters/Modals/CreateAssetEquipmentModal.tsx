'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface AssetEquipment {
  id: string;
  uuid?: string;
  name: string;
  code?: string;
  unit?: string;
  unit_id?: number;
  specification: string;
  status?: 'Active' | 'Inactive';
}

interface CreateAssetEquipmentModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingAssetId?: string | null; // UUID for GET /assets-edit/{uuid}
  editingAssetNumericId?: number | string | null; // Numeric ID for API calls if needed
  assets?: AssetEquipment[];
}

const CreateAssetEquipmentModal: React.FC<CreateAssetEquipmentModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingAssetId = null,
  editingAssetNumericId = null,
  assets = []
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', // Required: asset name
    specification: '', // Required: asset specifications/details
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

  const isEditing = !!editingAssetId && !!editingAssetNumericId;

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

  // Load asset data when editing
  useEffect(() => {
    if (isOpen && editingAssetId) {
      const loadAssetData = async () => {
        try {
          const assetData = await masterDataAPI.getAssetEquipment(editingAssetId);
          const unitId = typeof assetData.unit_id === 'object' ? assetData.unit_id?.id : assetData.unit_id;
          setFormData({
            name: assetData.assets || assetData.name || '', // API returns name in "assets" field
            specification: assetData.specification || '',
            unit_id: String(unitId || assetData.unit?.id || '')
          });
        } catch (error: any) {
          console.error('Failed to load asset data:', error);
          toast.showError('Failed to load asset data');
        }
      };
      loadAssetData();
    } else if (isOpen && !editingAssetId) {
      // Reset form for new asset
      setFormData({
        name: '',
        specification: '',
        unit_id: ''
      });
    }
  }, [isOpen, editingAssetId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        specification: '',
        unit_id: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.showWarning('Asset name is required');
      return false;
    }

    if (!formData.specification.trim()) {
      toast.showWarning('Specification is required');
      return false;
    }

    if (!formData.unit_id) {
      toast.showWarning('Unit selection is required');
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
        name: formData.name.trim(),
        specification: formData.specification.trim(),
        unit_id: Number(formData.unit_id)
      };

      if (isEditing && editingAssetId) {
        // Update existing asset - use UUID for update API
        await masterDataAPI.updateAssetEquipment(editingAssetId, payload);
        toast.showSuccess('Asset updated successfully!');
      } else {
        // Create new asset - set is_active to 1 (active) by default
        payload.is_active = 1;
        console.log('📦 Creating new asset with is_active = 1 (active by default)');
        await masterDataAPI.createAssetEquipment(payload);
        toast.showSuccess('Asset created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save asset:', error);
      toast.showError(error.message || 'Failed to save asset');
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
              {isEditing ? 'Edit Asset/Equipment' : 'Create New Asset/Equipment'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update asset details below' : 'Enter asset details below'}
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
          {/* Asset Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter asset name (e.g., Excavator, Crane, Concrete Mixer)"
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
              Measurement Unit <span className="text-red-500">*</span>
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

          {/* Specification */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Asset Specification <span className="text-red-500">*</span>
            </label>
            <textarea
              name="specification"
              value={formData.specification}
              onChange={handleInputChange}
              placeholder="Enter asset specifications and details..."
              rows={4}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none resize-none disabled:opacity-50`}
            />
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

export default CreateAssetEquipmentModal;
