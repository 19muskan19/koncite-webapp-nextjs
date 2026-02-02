'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  code: string;
  conversion: string;
  factor: string;
  status: 'Active' | 'Inactive';
}

interface CreateUnitModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultUnits?: Unit[];
  userUnits?: Unit[];
  onUnitCreated?: (unit: Unit) => void;
}

const CreateUnitModal: React.FC<CreateUnitModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultUnits = [],
  userUnits = [],
  onUnitCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    conversion: '',
    factor: ''
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        code: '',
        conversion: '',
        factor: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateUnit = () => {
    const missingFields: string[] = [];
    
    if (!formData.name) missingFields.push('Unit Name');
    if (!formData.code) missingFields.push('Unit Code');
    if (!formData.conversion) missingFields.push('Unit Conversion');
    if (!formData.factor) missingFields.push('Unit Conversion Factor');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Check if unit code already exists
    const allUnits = [...defaultUnits, ...userUnits];
    const codeExists = allUnits.some(unit => unit.code.toLowerCase() === formData.code.toLowerCase());
    if (codeExists) {
      toast.showError('Unit code already exists. Please use a different code.');
      return;
    }

    const newUnit: Unit = {
      id: Date.now().toString(),
      name: formData.name,
      code: formData.code,
      conversion: formData.conversion,
      factor: formData.factor,
      status: 'Active'
    };

    // Save to localStorage
    const savedUnits = localStorage.getItem('units');
    let existingUnits: any[] = [];
    if (savedUnits) {
      try {
        existingUnits = JSON.parse(savedUnits);
      } catch (e) {
        console.error('Error parsing units:', e);
      }
    }

    existingUnits.push(newUnit);
    localStorage.setItem('units', JSON.stringify(existingUnits));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('unitsUpdated'));

    toast.showSuccess('Unit created successfully!');
    
    if (onUnitCreated) {
      onUnitCreated(newUnit);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Unit</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter unit details below</p>
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
          {/* Unit Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter unit name (e.g., Bags, Nos, Cum)"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Unit Code */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="Enter unit code (e.g., Bags, Nos)"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Unit Conversion */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Conversion <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="conversion"
              value={formData.conversion}
              onChange={handleInputChange}
              placeholder="Enter conversion type (e.g., Base Unit, Cubic Meter)"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Unit Conversion Factor */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit Conversion Factor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="factor"
              value={formData.factor}
              onChange={handleInputChange}
              placeholder="Enter conversion factor (e.g., 1, 0.9144, 100)"
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
            onClick={handleCreateUnit}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateUnitModal;
