'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Boxes, MoreVertical, Download, Plus, Search, X, ArrowUpDown } from 'lucide-react';

interface Material {
  id: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface MaterialsProps {
  theme: ThemeType;
}

const Materials: React.FC<MaterialsProps> = ({ theme }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMaterialModal, setShowMaterialModal] = useState<boolean>(false);
  const [userMaterials, setUserMaterials] = useState<Material[]>([]);
  const [formData, setFormData] = useState({
    materialClass: '',
    materialName: '',
    specification: '',
    unit: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const classOptions = [
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
  ];

  const unitOptions = [
    'Bags', 'Nos', 'Cum', 'Sqm', 'Rmt', 'Brass', 'Yard', 'Packet', 'LS', 
    'Bulk', 'Bundles', 'MT', 'Cft', 'Sft', 'Rft', 'Kgs', 'Ltr', 'Hrs', 'Day'
  ];

  const defaultMaterials: Material[] = [
    { id: '1', class: 'A', code: 'M685270', name: 'Cement', specification: 'OPC testy', unit: 'Packet', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', class: 'A', code: 'M984236', name: 'RMC', specification: 'M40', unit: 'Cft', createdAt: '2024-01-16T00:00:00.000Z' },
    { id: '3', class: 'B', code: 'M211203', name: 'Measuring Tape', specification: '1/2 Inches', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
    { id: '4', class: 'B', code: 'M257929', name: 'Hose Pipe', specification: '1 Inches', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
    { id: '5', class: 'B', code: 'M205837', name: 'Hose Pipe', specification: '', unit: 'Rft', createdAt: '2024-01-19T00:00:00.000Z' },
    { id: '6', class: 'B', code: 'M987837', name: 'Nylon Rope', specification: '', unit: 'Rft', createdAt: '2024-01-20T00:00:00.000Z' },
    { id: '7', class: 'C', code: 'M183654', name: 'Oil', specification: '', unit: 'Ltr', createdAt: '2024-01-21T00:00:00.000Z' },
    { id: '8', class: 'C', code: 'M976735', name: 'Cover Blocks', specification: '20mm', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
    { id: '9', class: 'C', code: 'M421512', name: 'Cover Blocks', specification: '25mm', unit: 'Nos', createdAt: '2024-01-23T00:00:00.000Z' },
    { id: '10', class: 'C', code: 'M625759', name: 'Petrol', specification: '', unit: 'Ltr', createdAt: '2024-01-24T00:00:00.000Z' },
    { id: '11', class: 'C', code: 'M232620', name: 'Diesel', specification: '', unit: 'Ltr', createdAt: '2024-01-25T00:00:00.000Z' },
    { id: '12', class: 'B', code: 'M932823', name: 'UPVC', specification: '12 inch', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
    { id: '13', class: 'A', code: 'M880841', name: 'Tmt Concrete', specification: '', unit: 'Cft', createdAt: '2024-01-27T00:00:00.000Z' },
    { id: '14', class: 'A', code: 'M100439', name: 'Cement', specification: 'OPC 53 grade', unit: 'Bags', createdAt: '2024-01-28T00:00:00.000Z' },
  ];

  // Load materials from localStorage on mount
  useEffect(() => {
    const savedMaterials = localStorage.getItem('materials');
    if (savedMaterials) {
      try {
        const parsed = JSON.parse(savedMaterials);
        setUserMaterials(parsed);
      } catch (e) {
        setUserMaterials([]);
      }
    } else {
      setUserMaterials([]);
    }
  }, []);

  // Save materials to localStorage whenever userMaterials state changes
  useEffect(() => {
    const defaultIds = defaultMaterials.map(m => m.id);
    const userAddedMaterials = userMaterials.filter(m => !defaultIds.includes(m.id));
    if (userAddedMaterials.length > 0) {
      try {
        localStorage.setItem('materials', JSON.stringify(userAddedMaterials));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          alert('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('materials');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userMaterials]);

  // Combine default and user materials
  const allMaterials = useMemo(() => {
    return [...defaultMaterials, ...userMaterials];
  }, [userMaterials]);

  // Filter materials based on search query
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return allMaterials;
    
    return allMaterials.filter(material =>
      material.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.specification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allMaterials]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowMaterialModal(false);
    setFormData({
      materialClass: '',
      materialName: '',
      specification: '',
      unit: ''
    });
  };

  const generateCode = () => {
    // Generate a code like M123456
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return 'M' + randomNum.toString();
  };

  const handleCreateMaterial = () => {
    if (!formData.materialClass || !formData.materialName || !formData.unit) {
      alert('Please fill in all required fields');
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

    try {
      setUserMaterials(prev => [...prev, newMaterial]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Error saving material. Please try again.');
    }
  };

  const handleDownloadExcel = () => {
    const headers = ['Class', 'Code', 'Name', 'Specification', 'Unit'];
    const rows = filteredMaterials.map(material => [
      material.class,
      material.code,
      material.name,
      material.specification || '',
      material.unit
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
    link.setAttribute('download', `materials_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Boxes className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Materials</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage construction materials inventory
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
            onClick={() => setShowMaterialModal(true)}
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
            placeholder="Search by class, code, name, specification, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Class
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Code
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Name
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Specification
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredMaterials.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.class}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.code}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.specification || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.unit}</td>
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
          <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first material entry</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredMaterials.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class A</p>
          <p className={`text-2xl font-black text-[#6B8E23]`}>{filteredMaterials.filter(m => m.class === 'A').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class B</p>
          <p className={`text-2xl font-black text-emerald-500`}>{filteredMaterials.filter(m => m.class === 'B').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Class C</p>
          <p className={`text-2xl font-black text-amber-500`}>{filteredMaterials.filter(m => m.class === 'C').length}</p>
        </div>
      </div>

      {/* Add Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Material</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter material details below</p>
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                onClick={handleCreateMaterial}
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

export default Materials;
