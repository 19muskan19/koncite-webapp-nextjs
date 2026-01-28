'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Warehouse, MoreVertical, Plus, Search, X, Download } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWarehouseModal, setShowWarehouseModal] = useState<boolean>(false);
  const [userWarehouses, setUserWarehouses] = useState<WarehouseData[]>([]);
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
          alert('Storage limit exceeded. Some data may not be saved.');
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
    setShowWarehouseModal(false);
    setFormData({
      project: '',
      warehouseName: '',
      location: ''
    });
  };

  const handleCreateWarehouse = () => {
    if (!formData.project || !formData.warehouseName || !formData.location) {
      alert('Please fill in all required fields');
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

    try {
      setUserWarehouses(prev => [...prev, newWarehouse]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert('Error saving warehouse. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Warehouse className="w-6 h-6 text-[#6B8E23]" />
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
            onClick={() => setShowWarehouseModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
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
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {filteredWarehouses.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Warehouse Name</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredWarehouses.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.project}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <p className={`text-2xl font-black text-emerald-500`}>{filteredWarehouses.filter(w => w.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Warehouse</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter warehouse details below</p>
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white transition-all shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
