'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface Material {
  id: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface CreateMaterialModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMaterials?: Material[];
  userMaterials?: Material[];
  classOptions?: Array<{ value: 'A' | 'B' | 'C'; label: string }>;
  unitOptions?: string[];
  onMaterialCreated?: (material: Material) => void;
}

const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultMaterials = [],
  userMaterials = [],
  classOptions = [
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
  ],
  unitOptions = [],
  onMaterialCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    materialClass: '',
    materialName: '',
    specification: '',
    unit: ''
  });

  const [units, setUnits] = useState<string[]>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Load units from localStorage
  useEffect(() => {
    const loadUnits = () => {
      const defaultUnitOptions = [
        'Bags', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 
        'Bulk', 'Bundles', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day'
      ];

      const savedUnits = localStorage.getItem('units');
      let unitList: string[] = [...defaultUnitOptions];

      if (savedUnits) {
        try {
          const parsed = JSON.parse(savedUnits);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const unitNames = parsed.map((u: any) => u.name || u.code).filter(Boolean);
            unitList = [...new Set([...defaultUnitOptions, ...unitNames])];
          }
        } catch (e) {
          console.error('Error parsing units:', e);
        }
      }

      // Combine with unitOptions prop
      const allUnits = [...unitOptions, ...unitList];
      setUnits([...new Set(allUnits)]);
    };

    if (isOpen) {
      loadUnits();
    }
  }, [isOpen, unitOptions]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        materialClass: '',
        materialName: '',
        specification: '',
        unit: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const generateCode = () => {
    // Generate a code like M123456
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return 'M' + randomNum.toString();
  };

  const handleCreateMaterial = () => {
    const missingFields: string[] = [];
    
    if (!formData.materialClass) missingFields.push('Material Class');
    if (!formData.materialName) missingFields.push('Material Name');
    if (!formData.unit) missingFields.push('Unit');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    const newMaterial: Material = {
      id: Date.now().toString(),
      class: formData.materialClass as 'A' | 'B' | 'C',
      code: generateCode(),
      name: formData.materialName,
      specification: formData.specification || '',
      unit: formData.unit,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedMaterials = localStorage.getItem('materials');
    let existingMaterials: any[] = [];
    if (savedMaterials) {
      try {
        existingMaterials = JSON.parse(savedMaterials);
      } catch (e) {
        console.error('Error parsing materials:', e);
      }
    }

    existingMaterials.push(newMaterial);
    localStorage.setItem('materials', JSON.stringify(existingMaterials));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('materialsUpdated'));

    toast.showSuccess('Material created successfully!');
    
    if (onMaterialCreated) {
      onMaterialCreated(newMaterial);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Material</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter material details below</p>
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
          {/* Material Class */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Material Class <span className="text-red-500">*</span>
            </label>
            <select
              name="materialClass"
              value={formData.materialClass}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
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
              name="materialName"
              value={formData.materialName}
              onChange={handleInputChange}
              placeholder="Enter material name"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Specification */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Specification
            </label>
            <input
              type="text"
              name="specification"
              value={formData.specification}
              onChange={handleInputChange}
              placeholder="Enter specification (optional)"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Unit */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Unit --</option>
              {units.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
            onClick={handleCreateMaterial}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMaterialModal;
