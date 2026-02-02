'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  project: string;
  location: string;
  capacity?: string;
  status: string;
  createdAt?: string;
}

interface CreateWarehouseModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultWarehouses?: WarehouseData[];
  userWarehouses?: WarehouseData[];
  availableProjects?: Array<{ name: string; code: string }>;
  onWarehouseCreated?: (warehouse: WarehouseData) => void;
}

const CreateWarehouseModal: React.FC<CreateWarehouseModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultWarehouses = [],
  userWarehouses = [],
  availableProjects = [],
  onWarehouseCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    project: '',
    warehouseName: '',
    location: ''
  });

  const [projects, setProjects] = useState<Array<{ name: string; code: string }>>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Residential Complex A',
        'Commercial Tower B',
        'Highway Infrastructure Project',
        'Shopping Mall Development',
      ];

      const savedProjects = localStorage.getItem('projects');
      let projectList: Array<{ name: string; code: string }> = [];

      // Add default projects
      projectList = defaultProjectNames.map(name => ({
        name,
        code: ''
      }));

      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const userProjects = parsed.map((p: any) => ({
              name: p.projectName || p.name || '',
              code: p.code || ''
            })).filter((p: { name: string; code: string }) => p.name);
            projectList = [...projectList, ...userProjects];
          }
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      // Combine with availableProjects prop
      const allProjects = [...availableProjects, ...projectList];
      // Remove duplicates based on name
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.name, p])).values()
      );
      setProjects(uniqueProjects);
    };

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, availableProjects]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        project: '',
        warehouseName: '',
        location: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateWarehouse = () => {
    const missingFields: string[] = [];
    
    if (!formData.project) missingFields.push('Project');
    if (!formData.warehouseName) missingFields.push('Warehouse Name');
    if (!formData.location) missingFields.push('Location');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate a code from the warehouse name
    const code = formData.warehouseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + String(defaultWarehouses.length + userWarehouses.length + 1).padStart(3, '0');

    const newWarehouse: WarehouseData = {
      id: Date.now().toString(),
      name: formData.warehouseName,
      code: code,
      project: formData.project,
      location: formData.location,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedWarehouses = localStorage.getItem('warehouses');
    let existingWarehouses: any[] = [];
    if (savedWarehouses) {
      try {
        existingWarehouses = JSON.parse(savedWarehouses);
      } catch (e) {
        console.error('Error parsing warehouses:', e);
      }
    }

    existingWarehouses.push(newWarehouse);
    localStorage.setItem('warehouses', JSON.stringify(existingWarehouses));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('warehousesUpdated'));

    toast.showSuccess('Warehouse created successfully!');
    
    if (onWarehouseCreated) {
      onWarehouseCreated(newWarehouse);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Warehouse</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter warehouse details below</p>
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
          {/* Select Project */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Project --</option>
              {projects.map((project, idx) => (
                <option key={idx} value={project.name}>
                  {project.name} {project.code ? `(${project.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="warehouseName"
              value={formData.warehouseName}
              onChange={handleInputChange}
              placeholder="Enter warehouse name"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Location */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter warehouse location"
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
            onClick={handleCreateWarehouse}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWarehouseModal;
