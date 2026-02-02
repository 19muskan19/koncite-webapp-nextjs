'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Warehouse, MoreVertical, Plus, Search, X, Download, Edit, Trash2, MapPin, Building2 } from 'lucide-react';
import CreateWarehouseModal from './Modals/CreateWarehouseModal';

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

interface WarehousesProps {
  theme: ThemeType;
}

const Warehouses: React.FC<WarehousesProps> = ({ theme }) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [userWarehouses, setUserWarehouses] = useState<WarehouseData[]>([]);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    project: '',
    warehouseName: '',
    location: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const availableProjects = [
    { name: 'Residential Complex A', code: 'PRJ001' },
    { name: 'Commercial Tower B', code: 'PRJ002' },
    { name: 'Highway Infrastructure Project', code: 'PRJ003' },
    { name: 'Shopping Mall Development', code: 'PRJ004' },
  ];

  const defaultWarehouses: WarehouseData[] = [
    { id: '1', name: 'Main Warehouse', code: 'WH001', project: 'Residential Complex A', location: 'Site A', capacity: '5000 sqft', status: 'Active', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', name: 'Storage Facility B', code: 'WH002', project: 'Commercial Tower B', location: 'Site B', capacity: '3000 sqft', status: 'Active', createdAt: '2024-02-20T00:00:00.000Z' },
  ];

  // Load warehouses from localStorage on mount
  useEffect(() => {
    const savedWarehouses = localStorage.getItem('warehouses');
    if (savedWarehouses) {
      try {
        const parsed = JSON.parse(savedWarehouses);
        setUserWarehouses(parsed);
      } catch (e) {
        setUserWarehouses([]);
      }
    } else {
      setUserWarehouses([]);
    }
  }, []);

  // Save warehouses to localStorage whenever userWarehouses state changes
  useEffect(() => {
    const defaultIds = ['1', '2'];
    const userAddedWarehouses = userWarehouses.filter(w => !defaultIds.includes(w.id));
    if (userAddedWarehouses.length > 0) {
      try {
        localStorage.setItem('warehouses', JSON.stringify(userAddedWarehouses));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('warehouses');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userWarehouses]);

  // Combine default and user warehouses
  const allWarehouses = useMemo(() => {
    return [...defaultWarehouses, ...userWarehouses];
  }, [userWarehouses]);

  // Filter warehouses based on search query (by project)
  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return allWarehouses;
    
    return allWarehouses.filter(warehouse =>
      warehouse.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allWarehouses]);

  const handleDownloadExcel = () => {
    const headers = ['Project', 'Warehouse Name', 'Location'];
    const rows = filteredWarehouses.map(warehouse => [
      warehouse.project,
      warehouse.name,
      warehouse.location
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `warehouses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingWarehouseId(null);
    setFormData({
      project: '',
      warehouseName: '',
      location: ''
    });
  };

  const handleWarehouseCreated = (newWarehouse: WarehouseData) => {
    setUserWarehouses(prev => [...prev, newWarehouse]);
  };

  // Listen for warehousesUpdated event
  useEffect(() => {
    const handleWarehousesUpdated = () => {
      const savedWarehouses = localStorage.getItem('warehouses');
      if (savedWarehouses) {
        try {
          const parsed = JSON.parse(savedWarehouses);
          if (Array.isArray(parsed)) {
            setUserWarehouses(parsed);
          }
        } catch (e) {
          // Keep current warehouses if parsing fails
        }
      }
    };

    window.addEventListener('warehousesUpdated', handleWarehousesUpdated);
    return () => {
      window.removeEventListener('warehousesUpdated', handleWarehousesUpdated);
    };
  }, []);

  const handleEditWarehouse = (warehouse: WarehouseData) => {
    setEditingWarehouseId(warehouse.id);
    setFormData({
      project: warehouse.project,
      warehouseName: warehouse.name,
      location: warehouse.location
    });
    setShowEditModal(true);
  };

  const handleDeleteWarehouse = (warehouseId: string) => {
    const defaultIds = ['1', '2'];
    if (defaultIds.includes(warehouseId)) {
      toast.showWarning('Cannot delete default warehouses');
      return;
    }

    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      setUserWarehouses(prev => prev.filter(w => w.id !== warehouseId));
      toast.showSuccess('Warehouse deleted successfully');
    }
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

    if (editingWarehouseId) {
      // Update existing warehouse
      const defaultIds = ['1', '2'];
      if (defaultIds.includes(editingWarehouseId)) {
        toast.showWarning('Cannot edit default warehouses');
        return;
      }

      setUserWarehouses(prev => prev.map(w => 
        w.id === editingWarehouseId 
          ? {
              ...w,
              name: formData.warehouseName,
              project: formData.project,
              location: formData.location
            }
          : w
      ));
      toast.showSuccess('Warehouse updated successfully');
    } else {
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

      setUserWarehouses(prev => [...prev, newWarehouse]);
      toast.showSuccess('Warehouse created successfully');
    }

    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Warehouse className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Warehouses</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage warehouse locations and inventory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadExcel}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {filteredWarehouses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse) => (
            <div 
              key={warehouse.id} 
              className={`rounded-xl border p-5 transition-all ${cardClass} ${
                isDark ? 'hover:border-[#C2D642]/30 hover:shadow-lg' : 'hover:border-[#C2D642]/20 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <Warehouse className="w-5 h-5 text-[#C2D642]" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>{warehouse.name}</h3>
                    <p className={`text-xs font-bold ${textSecondary} uppercase tracking-wider`}>{warehouse.code}</p>
                  </div>
                </div>
                {warehouse.status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    warehouse.status === 'Active'
                      ? 'bg-[#C2D642]/20 text-[#C2D642]'
                      : 'bg-slate-500/20 text-slate-500'
                  }`}>
                    {warehouse.status}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <Building2 className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Project
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.project}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Location
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.location}</p>
                  </div>
                </div>
                {warehouse.capacity && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>
                      Capacity
                    </p>
                    <p className={`text-sm font-bold ${textPrimary}`}>{warehouse.capacity}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-inherit">
                <button
                  onClick={() => handleEditWarehouse(warehouse)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteWarehouse(warehouse.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Warehouse className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first warehouse entry</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredWarehouses.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredWarehouses.filter(w => w.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Reload warehouses from localStorage
          const savedWarehouses = localStorage.getItem('warehouses');
          if (savedWarehouses) {
            try {
              const parsed = JSON.parse(savedWarehouses);
              if (Array.isArray(parsed)) {
                setUserWarehouses(parsed);
              }
            } catch (e) {
              // Keep current warehouses if parsing fails
            }
          }
        }}
        defaultWarehouses={defaultWarehouses}
        userWarehouses={userWarehouses}
        availableProjects={availableProjects}
        onWarehouseCreated={handleWarehouseCreated}
      />

      {/* Edit Warehouse Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Edit Warehouse</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Update warehouse details below</p>
              </div>
              <button
                onClick={handleCloseModal}
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
                  {availableProjects.map((project, idx) => (
                    <option key={idx} value={project.name}>
                      {project.name} ({project.code})
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
                onClick={handleCloseModal}
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
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
