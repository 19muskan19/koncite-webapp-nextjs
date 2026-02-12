'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface Unit {
  id: string;
  uuid?: string;
  name: string;
  unit?: string;
  code?: string;
  conversion?: string;
  unit_coversion?: string;
  factor?: string;
  unit_coversion_factor?: string;
  status?: 'Active' | 'Inactive';
}

interface CreateUnitModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingUnitId?: string | null; // UUID for GET /unit-edit/{uuid}
  editingUnitNumericId?: string | number | null; // Numeric ID for POST /unit-add with updateId
  existingUnits?: Array<{ id?: string; numericId?: number | string; uuid?: string; unit?: string; name?: string; unit_coversion?: string; conversion?: string; unit_coversion_factor?: string; factor?: string }>;
}

const CreateUnitModal: React.FC<CreateUnitModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingUnitId = null,
  editingUnitNumericId = null,
  existingUnits = []
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    unit: '', // Required: unit name
    unit_coversion: '', // Optional: conversion unit name
    unit_coversion_factor: '' // Required if unit_coversion is provided
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingUnitId && !!editingUnitNumericId;

  // Load unit data when editing
  useEffect(() => {
    if (isOpen && editingUnitId) {
      const loadUnitData = async () => {
        try {
          const unitData = await masterDataAPI.getUnit(editingUnitId);
          setFormData({
            unit: unitData.unit || unitData.name || '',
            unit_coversion: unitData.unit_coversion || unitData.conversion || '',
            unit_coversion_factor: unitData.unit_coversion_factor || unitData.factor || ''
          });
        } catch (error: any) {
          console.error('Failed to load unit data:', error);
          toast.showError('Failed to load unit data');
        }
      };
      loadUnitData();
    } else if (isOpen && !editingUnitId) {
      // Reset form for new unit
      setFormData({
        unit: '',
        unit_coversion: '',
        unit_coversion_factor: ''
      });
    }
  }, [isOpen, editingUnitId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        unit: '',
        unit_coversion: '',
        unit_coversion_factor: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    if (!formData.unit.trim()) {
      toast.showWarning('Required field "Unit Name" is empty. Please fill it before submitting.');
      return false;
    }

    const unitTrim = formData.unit.trim().toLowerCase();
    const convTrim = (formData.unit_coversion || '').trim().toLowerCase();
    const factorTrim = (formData.unit_coversion_factor || '').trim();

    const isDuplicate = existingUnits.some((u) => {
      if (isEditing && (u.id === editingUnitId || u.uuid === editingUnitId || String(u.numericId ?? u.id) === String(editingUnitNumericId))) return false;
      const uUnit = (u.unit || u.name || '').trim().toLowerCase();
      const uConv = (u.unit_coversion || u.conversion || '').trim().toLowerCase();
      const uFactor = (u.unit_coversion_factor || u.factor || '').trim();
      return uUnit === unitTrim && uConv === convTrim && uFactor === factorTrim;
    });
    if (isDuplicate) {
      toast.showWarning('A unit with the same name, conversion, and factor already exists. Change unit conversion or conversion factor to add.');
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
        unit: formData.unit.trim()
      };

      // Add optional fields if provided
      if (formData.unit_coversion.trim()) {
        payload.unit_coversion = formData.unit_coversion.trim();
        payload.unit_coversion_factor = formData.unit_coversion_factor.trim();
      }

      if (isEditing && editingUnitNumericId) {
        // Update existing unit
        // Backend POST /unit-add with updateId expects numeric ID (where('id', $updateId))
        // Note: When editing via modal, preserve existing is_active status (don't override)
        console.log('📝 Updating unit with numeric ID:', editingUnitNumericId);
        const updateResponse = await masterDataAPI.updateUnit(String(editingUnitNumericId), payload);
        console.log('✅ Unit update response:', updateResponse);
        toast.showSuccess('Unit updated successfully!');
      } else {
        // Create new unit - set is_active to 1 (active) by default
        payload.is_active = 1;
        console.log('📦 Creating new unit with is_active = 1 (active by default)');
        const createResponse = await masterDataAPI.createUnit(payload);
        console.log('✅ Unit create response:', createResponse);
        toast.showSuccess('Unit created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save unit:', error);
      toast.showError(error.message || 'Failed to save unit');
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
              {isEditing ? 'Edit Unit' : 'Create New Unit'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update unit details below' : 'Enter unit details below'}
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
          {/* Unit Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder="Enter unit name (e.g., Bags, Nos, MT, Kgs, Cft, Sft, Hrs, Day)"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Unit Conversion (Optional) */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Conversion <span className="text-xs text-slate-500">(Optional)</span>
            </label>
            <select
              name="unit_coversion"
              value={formData.unit_coversion}
              onChange={(e) => setFormData({ ...formData, unit_coversion: e.target.value })}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50 pr-10`}
            >
              <option value="">-- Select Unit --</option>
              {['Bags', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 'Bulk', 'Bundles'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              If provided, conversion factor is required
            </p>
          </div>

          {/* Unit Conversion Factor (Optional) */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Conversion Factor <span className="text-xs text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              name="unit_coversion_factor"
              value={formData.unit_coversion_factor}
              onChange={handleInputChange}
              placeholder="Enter conversion factor (e.g., 1, 0.9144, 100, 1000)"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
            disabled={isSubmitting}
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

export default CreateUnitModal;
