'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Wrench, MoreVertical, Download, Plus, Search, X } from 'lucide-react';

interface AssetEquipment {
  id: string;
  name: string;
  code: string;
  unit: string;
  specification: string;
  status?: string;
  createdAt?: string;
}

interface AssetsEquipmentsProps {
  theme: ThemeType;
}

const AssetsEquipments: React.FC<AssetsEquipmentsProps> = ({ theme }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAssetModal, setShowAssetModal] = useState<boolean>(false);
  const [userAssets, setUserAssets] = useState<AssetEquipment[]>([]);
  const [formData, setFormData] = useState({
    machineryName: '',
    unit: '',
    specification: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const machineryOptions = [
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
  ];

  const unitOptions = [
    'Bags', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 
    'Bulk', 'Bundles', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day'
  ];

  const defaultAssets: AssetEquipment[] = [
    { id: '1', name: 'Machinery Hire', code: 'AST001', unit: 'Hrs', specification: 'Heavy Machinery', status: 'Active', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', name: 'Excavator Hire', code: 'AST002', unit: 'Hrs', specification: 'Excavator Equipment', status: 'Active', createdAt: '2024-02-20T00:00:00.000Z' },
  ];

  // Load assets from localStorage on mount
  useEffect(() => {
    const savedAssets = localStorage.getItem('assetsEquipments');
    if (savedAssets) {
      try {
        const parsed = JSON.parse(savedAssets);
        setUserAssets(parsed);
      } catch (e) {
        setUserAssets([]);
      }
    } else {
      setUserAssets([]);
    }
  }, []);

  // Save assets to localStorage whenever userAssets state changes
  useEffect(() => {
    const defaultIds = ['1', '2'];
    const userAddedAssets = userAssets.filter(a => !defaultIds.includes(a.id));
    if (userAddedAssets.length > 0) {
      try {
        localStorage.setItem('assetsEquipments', JSON.stringify(userAddedAssets));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          alert('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('assetsEquipments');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userAssets]);

  // Combine default and user assets
  const allAssets = useMemo(() => {
    return [...defaultAssets, ...userAssets];
  }, [userAssets]);

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return allAssets;
    
    return allAssets.filter(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.specification.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allAssets]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowAssetModal(false);
    setFormData({
      machineryName: '',
      unit: '',
      specification: ''
    });
  };

  const handleCreateAsset = () => {
    if (!formData.machineryName || !formData.unit || !formData.specification) {
      alert('Please fill in all required fields');
      return;
    }

    // Generate an ID
    const id = 'AST' + String(defaultAssets.length + userAssets.length + 1).padStart(3, '0');

    const newAsset: AssetEquipment = {
      id: Date.now().toString(),
      name: formData.machineryName,
      code: id,
      unit: formData.unit,
      specification: formData.specification,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    try {
      setUserAssets(prev => [...prev, newAsset]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Error saving asset. Please try again.');
    }
  };

  const handleDownloadExcel = () => {
    const headers = ['Machinery Name', 'Code', 'Unit', 'Asset Specification', 'Status'];
    const rows = filteredAssets.map(asset => [
      asset.name,
      asset.code,
      asset.unit,
      asset.specification,
      asset.status || 'Active'
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
    link.setAttribute('download', `assets_equipments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Wrench className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Assets Equipments</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage construction equipment and assets
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
            onClick={() => setShowAssetModal(true)}
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
            placeholder="Search by machinery name, code, unit, or specification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {filteredAssets.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredAssets.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.code}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.specification}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        row.status === 'Active' 
                          ? 'bg-emerald-500/20 text-emerald-500' 
                          : 'bg-slate-500/20 text-slate-500'
                      }`}>
                        {row.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                        <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Wrench className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first equipment entry</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredAssets.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-emerald-500`}>{filteredAssets.filter(a => a.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Asset/Equipment</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter asset details below</p>
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                >
                  <option value="">-- Select Unit --</option>
                  {unitOptions.map((option, idx) => (
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none resize-none`}
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
                onClick={handleCreateAsset}
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

export default AssetsEquipments;
