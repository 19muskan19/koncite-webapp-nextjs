'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
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
  type UnitRow = { unit: string; unit_coversion: string; unit_coversion_factor: string };
  const [formData, setFormData] = useState<UnitRow>({
    unit: '',
    unit_coversion: '',
    unit_coversion_factor: ''
  });
  const [rows, setRows] = useState<UnitRow[]>([{ unit: '', unit_coversion: '', unit_coversion_factor: '' }]);
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
      setFormData({ unit: '', unit_coversion: '', unit_coversion_factor: '' });
      setRows([{ unit: '', unit_coversion: '', unit_coversion_factor: '' }]);
    }
  }, [isOpen, editingUnitId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ unit: '', unit_coversion: '', unit_coversion_factor: '' });
      setRows([{ unit: '', unit_coversion: '', unit_coversion_factor: '' }]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRowChange = (index: number, field: keyof UnitRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { unit: '', unit_coversion: '', unit_coversion_factor: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const validateRow = (row: UnitRow, rowIndex: number): boolean => {
    if (!row.unit.trim()) {
      toast.showWarning(`Row ${rowIndex + 1}: Unit Name is required.`);
      return false;
    }
    if (row.unit_coversion?.trim() && !(row.unit_coversion_factor ?? '').trim()) {
      toast.showWarning(`Row ${rowIndex + 1}: Unit Conversion Factor is required when Unit Conversion is provided.`);
      return false;
    }
    const unitTrim = row.unit.trim().toLowerCase();
    const convTrim = (row.unit_coversion || '').trim().toLowerCase();
    const factorTrim = (row.unit_coversion_factor || '').trim();
    const isDuplicate = existingUnits.some((u) => {
      const uUnit = (u.unit || u.name || '').trim().toLowerCase();
      const uConv = (u.unit_coversion || u.conversion || '').trim().toLowerCase();
      const uFactor = (u.unit_coversion_factor || u.factor || '').trim();
      return uUnit === unitTrim && uConv === convTrim && uFactor === factorTrim;
    });
    if (isDuplicate) {
      toast.showWarning(`Row ${rowIndex + 1}: A unit with the same name, conversion, and factor already exists.`);
      return false;
    }
    return true;
  };

  const validateForm = (): boolean => {
    if (isEditing) {
      if (!formData.unit.trim()) {
        toast.showWarning('Required field "Unit Name" is empty.');
        return false;
      }
      if (formData.unit_coversion?.trim() && !(formData.unit_coversion_factor ?? '').trim()) {
        toast.showWarning('Unit Conversion Factor is required when Unit Conversion is provided.');
        return false;
      }
      const unitTrim = formData.unit.trim().toLowerCase();
      const convTrim = (formData.unit_coversion || '').trim().toLowerCase();
      const factorTrim = (formData.unit_coversion_factor || '').trim();
      const isDuplicate = existingUnits.some((u) => {
        if (String(u.numericId ?? u.id) === String(editingUnitNumericId)) return false;
        const uUnit = (u.unit || u.name || '').trim().toLowerCase();
        const uConv = (u.unit_coversion || u.conversion || '').trim().toLowerCase();
        const uFactor = (u.unit_coversion_factor || u.factor || '').trim();
        return uUnit === unitTrim && uConv === convTrim && uFactor === factorTrim;
      });
      if (isDuplicate) {
        toast.showWarning('A unit with the same name, conversion, and factor already exists.');
        return false;
      }
      return true;
    }
    const validRows = rows.filter(r => r.unit.trim());
    if (validRows.length === 0) {
      toast.showWarning('Add at least one unit with a name.');
      return false;
    }
    const seen = new Set<string>();
    for (let i = 0; i < validRows.length; i++) {
      const idx = rows.findIndex(r => r === validRows[i]);
      const key = `${validRows[i].unit.trim().toLowerCase()}|${(validRows[i].unit_coversion || '').trim().toLowerCase()}|${(validRows[i].unit_coversion_factor || '').trim()}`;
      if (seen.has(key)) {
        toast.showWarning(`Row ${idx + 1}: Duplicate unit (same name, conversion, and factor as another row).`);
        return false;
      }
      seen.add(key);
      if (!validateRow(validRows[i], idx)) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && editingUnitNumericId) {
        const payload: any = { unit: formData.unit.trim() };
        if (formData.unit_coversion.trim()) {
          payload.unit_coversion = formData.unit_coversion.trim();
          payload.unit_coversion_factor = formData.unit_coversion_factor.trim();
        }
        await masterDataAPI.updateUnit(String(editingUnitNumericId), payload);
        toast.showSuccess('Unit updated successfully!');
        onSuccess?.();
        onClose();
      } else {
        const validRows = rows.filter(r => r.unit.trim());
        const bulkItems = validRows.map(row => {
          const item: { unit: string; unit_coversion?: string; unit_coversion_factor?: string } = { unit: row.unit.trim() };
          if (row.unit_coversion?.trim()) {
            item.unit_coversion = row.unit_coversion.trim();
            item.unit_coversion_factor = (row.unit_coversion_factor?.trim() ?? '') || '';
          }
          return item;
        });
        const result = await masterDataAPI.createUnitsBulk(bulkItems);
        const msg = result?.message ?? (result?.data?.created?.length === validRows.length
          ? `${validRows.length} unit(s) created successfully!`
          : `${result?.data?.created?.length ?? 0} created. ${result?.data?.already_present?.length ?? 0} already present.`);
        toast.showSuccess(msg);
        onSuccess?.();
        onClose();
      }
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
      <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <button onClick={onClose} disabled={isSubmitting} className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`} title="Close">
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-6 pr-14 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Unit' : 'Create New Unit'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update unit details below' : 'Enter unit details below'}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isEditing ? (
            /* Single-row form for Edit */
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Unit Name <span className="text-red-500">*</span></label>
                <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Enter unit name" disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`} />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Unit Conversion <span className="text-xs text-slate-500">(Optional)</span></label>
                <select name="unit_coversion" value={formData.unit_coversion} onChange={(e) => setFormData({ ...formData, unit_coversion: e.target.value })} disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold border appearance-none cursor-pointer pr-10 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}>
                  <option value="">-- Select Unit --</option>
                  {['Bags', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 'Bulk', 'Bundles'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Unit Conversion Factor <span className="text-xs text-slate-500">(Optional)</span></label>
                <input type="text" name="unit_coversion_factor" value={formData.unit_coversion_factor} onChange={handleInputChange} placeholder="Enter conversion factor" disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`} />
              </div>
            </div>
          ) : (
            /* Multi-row form for Create - add multiple units at once */
            <div className="space-y-4">
              {rows.length > 0 && (
                <div className="grid grid-cols-12 gap-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <div className="col-span-4">Unit Name <span className="text-red-500">*</span></div>
                  <div className="col-span-3">Unit Conversion <span className="text-xs normal-case font-normal">(Optional)</span></div>
                  <div className="col-span-3">Unit Conversion Factor <span className="text-xs normal-case font-normal">(Optional)</span></div>
                  <div className="col-span-2" />
                </div>
              )}
              {rows.length === 0 && (
                <p className={`text-sm ${textSecondary} py-2`}>No units added. Click &quot;Add Unit&quot; below to add one.</p>
              )}
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                      placeholder="Enter unit name"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={row.unit_coversion}
                      onChange={(e) => handleRowChange(idx, 'unit_coversion', e.target.value)}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold border appearance-none cursor-pointer pr-8 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                    >
                      <option value="">-- Select Unit --</option>
                      {['Bags', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 'Bulk', 'Bundles'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={row.unit_coversion_factor}
                      onChange={(e) => handleRowChange(idx, 'unit_coversion_factor', e.target.value)}
                      placeholder="Enter conversion factor"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={isSubmitting}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'} disabled:opacity-50`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* + Add button at constant place */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'} disabled:opacity-50`}
                >
                  <Plus className="w-4 h-4" /> Add Unit
                </button>
              </div>
            </div>
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
            disabled={isSubmitting}
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

export default CreateUnitModal;
