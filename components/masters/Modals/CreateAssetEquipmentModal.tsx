'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface AssetEquipment {
  id: string;
  name: string;
  code: string;
  unit: string;
  specification: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

interface CreateAssetEquipmentModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAssets?: AssetEquipment[];
  userAssets?: AssetEquipment[];
  machineryOptions?: string[];
  unitOptions?: string[];
  onAssetCreated?: (asset: AssetEquipment) => void;
}

const CreateAssetEquipmentModal: React.FC<CreateAssetEquipmentModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultAssets = [],
  userAssets = [],
  machineryOptions = [
    'Machinery Hire',
    'Breaker Hire',
    'MS Props',
    'MS Shikanja',
    'MS Shuttering Plates',
    'Concrete Breaker Machine',
    'Measuring Tape',
    'Helmets',
    'Safety Belt',
    'Excavator on hire',
    'Excavator Hire',
    'Concrete Mixer Hire',
    'Vibrator Hire',
    'DG Hire',
    'Poclain machine Hire',
    'Road Roller Hire',
    'Tipper Hire',
    'Compactor Hire'
  ],
  unitOptions = [],
  onAssetCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    machineryName: '',
    unit: '',
    specification: ''
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

      // Combine with unitOptions prop (only if provided and not empty)
      const allUnits = unitOptions && unitOptions.length > 0 
        ? [...unitOptions, ...unitList]
        : unitList;
      setUnits([...new Set(allUnits)]);
    };

    if (isOpen) {
      loadUnits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        machineryName: '',
        unit: '',
        specification: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateAsset = () => {
    const missingFields: string[] = [];
    
    if (!formData.machineryName) missingFields.push('Machinery Name');
    if (!formData.unit) missingFields.push('Unit');
    if (!formData.specification) missingFields.push('Specification');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate a code
    const code = 'AST' + String(defaultAssets.length + userAssets.length + 1).padStart(3, '0');

    const newAsset: AssetEquipment = {
      id: Date.now().toString(),
      name: formData.machineryName,
      code: code,
      unit: formData.unit,
      specification: formData.specification,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedAssets = localStorage.getItem('assetsEquipments');
    let existingAssets: any[] = [];
    if (savedAssets) {
      try {
        existingAssets = JSON.parse(savedAssets);
      } catch (e) {
        console.error('Error parsing assets:', e);
      }
    }

    existingAssets.push(newAsset);
    localStorage.setItem('assetsEquipments', JSON.stringify(existingAssets));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('assetsEquipmentsUpdated'));

    toast.showSuccess('Asset/Equipment created successfully!');
    
    if (onAssetCreated) {
      onAssetCreated(newAsset);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Asset/Equipment</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter asset details below</p>
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
          {/* Machinery Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Name of Machinery <span className="text-red-500">*</span>
            </label>
            <select
              name="machineryName"
              value={formData.machineryName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Machinery Name --</option>
              {machineryOptions.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Unit <span className="text-red-500">*</span>
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

          {/* Asset Specification */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Asset Specification <span className="text-red-500">*</span>
            </label>
            <textarea
              name="specification"
              value={formData.specification}
              onChange={handleInputChange}
              placeholder="Enter asset specification..."
              rows={4}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none resize-none`}
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
            onClick={handleCreateAsset}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAssetEquipmentModal;
