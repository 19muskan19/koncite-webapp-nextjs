'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface Labour {
  id: string;
  name: string;
  category: 'Skilled' | 'Unskilled' | 'Semi Skilled';
  trade?: string;
  skillLevel?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

interface CreateLabourModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultLabours?: Labour[];
  userLabours?: Labour[];
  onLabourCreated?: (labour: Labour) => void;
}

const CreateLabourModal: React.FC<CreateLabourModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultLabours = [],
  userLabours = [],
  onLabourCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    labourType: '',
    category: ''
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const categoryOptions = [
    { value: 'Skilled', label: 'Skilled' },
    { value: 'Unskilled', label: 'Unskilled' },
    { value: 'Semi Skilled', label: 'Semi Skilled' },
  ];

  const labourTypeOptions = [
    'Supervisor',
    'Foremen',
    'Helpers',
    'Male Coolie',
    'Female Coolie',
    'General Laborers',
    'Beldar',
    'Masons',
    'Carpenters',
    'Electricians',
    'Plumbers',
    'Welders',
    'Fitters',
    'Tilers',
    'Painter'
  ];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        labourType: '',
        category: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateLabour = () => {
    const missingFields: string[] = [];
    
    if (!formData.labourType) missingFields.push('Labour Type');
    if (!formData.category) missingFields.push('Category');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate an ID
    const id = 'LAB' + String(defaultLabours.length + userLabours.length + 1).padStart(3, '0');

    const newLabour: Labour = {
      id: id,
      name: formData.labourType,
      category: formData.category as 'Skilled' | 'Unskilled' | 'Semi Skilled',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedLabours = localStorage.getItem('labours');
    let existingLabours: any[] = [];
    if (savedLabours) {
      try {
        existingLabours = JSON.parse(savedLabours);
      } catch (e) {
        console.error('Error parsing labours:', e);
      }
    }

    existingLabours.push(newLabour);
    localStorage.setItem('labours', JSON.stringify(existingLabours));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('laboursUpdated'));

    toast.showSuccess('Labour created successfully!');
    
    if (onLabourCreated) {
      onLabourCreated(newLabour);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Labour</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter labour details below</p>
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
          {/* Labour Type */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Labour Type <span className="text-red-500">*</span>
            </label>
            <select
              name="labourType"
              value={formData.labourType}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Labour Type --</option>
              {labourTypeOptions.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Category Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Category Name <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Category --</option>
              {categoryOptions.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
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
            onClick={handleCreateLabour}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLabourModal;
