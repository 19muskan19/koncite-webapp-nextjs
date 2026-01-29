'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Package, MoreVertical, Search, ArrowUpDown, Download, Plus, X } from 'lucide-react';

interface UnitsProps {
  theme: ThemeType;
}

interface Unit {
  id: string;
  name: string;
  code: string;
  conversion: string;
  factor: string;
  status: 'Active' | 'Inactive';
}

const Units: React.FC<UnitsProps> = ({ theme }) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUnitModal, setShowUnitModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    conversion: '',
    factor: ''
  });
  
  const defaultUnits: Unit[] = [
    { id: '1', name: 'Bags', code: 'Bags', conversion: 'Base Unit', factor: '1', status: 'Active' },
    { id: '2', name: 'Nos', code: 'Nos', conversion: 'Base Unit', factor: '1', status: 'Active' },
    { id: '3', name: 'Cum', code: 'Cum', conversion: 'Cubic Meter', factor: '1', status: 'Active' },
    { id: '4', name: 'Sqm', code: 'Sqm', conversion: 'Square Meter', factor: '1', status: 'Active' },
    { id: '5', name: 'Rmt', code: 'Rmt', conversion: 'Running Meter', factor: '1', status: 'Active' },
    { id: '6', name: 'Brass', code: 'Brass', conversion: 'Cubic Feet', factor: '100', status: 'Active' },
    { id: '7', name: 'Yard', code: 'Yard', conversion: 'Meter', factor: '0.9144', status: 'Active' },
    { id: '8', name: 'Packet', code: 'Packet', conversion: 'Base Unit', factor: '1', status: 'Active' },
    { id: '9', name: 'LS', code: 'LS', conversion: 'Lump Sum', factor: '1', status: 'Active' },
    { id: '10', name: 'Bulk', code: 'Bulk', conversion: 'Base Unit', factor: '1', status: 'Active' },
    { id: '11', name: 'Bundles', code: 'Bundles', conversion: 'Base Unit', factor: '1', status: 'Active' },
    { id: '12', name: 'MT', code: 'MT', conversion: 'Metric Ton', factor: '1000', status: 'Active' },
    { id: '13', name: 'Cft', code: 'Cft', conversion: 'Cubic Feet', factor: '1', status: 'Active' },
    { id: '14', name: 'Sft', code: 'Sft', conversion: 'Square Feet', factor: '1', status: 'Active' },
    { id: '15', name: 'Rft', code: 'Rft', conversion: 'Running Feet', factor: '1', status: 'Active' },
    { id: '16', name: 'Kgs', code: 'Kgs', conversion: 'Kilogram', factor: '1', status: 'Active' },
    { id: '17', name: 'Ltr', code: 'Ltr', conversion: 'Liter', factor: '1', status: 'Active' },
    { id: '18', name: 'Hrs', code: 'Hrs', conversion: 'Hours', factor: '1', status: 'Active' },
    { id: '19', name: 'Day', code: 'Day', conversion: 'Days', factor: '1', status: 'Active' },
  ];

  const [units, setUnits] = useState<Unit[]>(defaultUnits);
  const isInitialMount = useRef(true);

  // Load units from localStorage on mount
  useEffect(() => {
    const savedUnits = localStorage.getItem('units');
    if (savedUnits) {
      try {
        const parsed = JSON.parse(savedUnits);
        // Only load if we have valid data
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUnits(parsed);
        }
      } catch (e) {
        // Keep default units if parsing fails
      }
    }
    isInitialMount.current = false;
  }, []);

  // Save units to localStorage whenever units state changes (but skip initial mount)
  useEffect(() => {
    // Skip saving on initial mount to avoid overwriting with defaults
    if (isInitialMount.current) return;
    
    try {
      localStorage.setItem('units', JSON.stringify(units));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [units]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleToggleStatus = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    setUnits(prevUnits =>
      prevUnits.map(unit =>
        unit.id === unitId
          ? { ...unit, status: unit.status === 'Active' ? 'Inactive' : 'Active' }
          : unit
      )
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowUnitModal(false);
    setFormData({
      name: '',
      code: '',
      conversion: '',
      factor: ''
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
    const codeExists = units.some(unit => unit.code.toLowerCase() === formData.code.toLowerCase());
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

    try {
      setUnits(prev => [...prev, newUnit]);
      handleCloseModal();
      toast.showSuccess('Unit added successfully');
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.showError('Error saving unit. Please try again.');
    }
  };

  // Filter units based on search query
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    
    return units.filter(unit =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.conversion.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, units]);

  const handleDownloadExcel = () => {
    const headers = ['Unit', 'Unit Conversion', 'Unit Conversion Factor', 'Status'];
    const rows = filteredUnits.map(unit => [
      unit.name,
      unit.conversion,
      unit.factor,
      unit.status
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
    link.setAttribute('download', `units_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Package className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Units</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage measurement units and conversions
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
            onClick={() => setShowUnitModal(true)}
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
            placeholder="Search by unit name, code, or conversion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {filteredUnits.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit Conversion
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Unit Conversion Factor
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Status
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center justify-end gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Action
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredUnits.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className={`${
                      row.status === 'Inactive' 
                        ? isDark 
                          ? 'opacity-50 bg-slate-800/20' 
                          : 'opacity-50 bg-slate-50/50'
                        : isDark 
                          ? 'hover:bg-slate-800/30' 
                          : 'hover:bg-slate-50/50'
                    } transition-colors`}
                  >
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.conversion}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.factor}</td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={(e) => handleToggleStatus(e, row.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B8E23] focus:ring-offset-2 cursor-pointer ${
                          row.status === 'Active'
                            ? 'bg-[#6B8E23]'
                            : 'bg-slate-400'
                        }`}
                        role="switch"
                        aria-checked={row.status === 'Active'}
                        title={row.status === 'Active' ? 'Click to disable' : 'Click to enable'}
                        type="button"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                        disabled={row.status === 'Inactive'}
                        title={row.status === 'Inactive' ? 'Unit is disabled' : ''}
                      >
                        <MoreVertical className={`w-4 h-4 ${row.status === 'Inactive' ? 'opacity-50' : textSecondary}`} />
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
          <Package className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Units Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No units found matching "${searchQuery}"` 
              : 'Start by adding your first unit entry'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredUnits.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredUnits.filter(u => u.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Add Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Unit</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter unit details below</p>
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
                  placeholder="Enter unit name (e.g., Bags, Nos)"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                onClick={handleCreateUnit}
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

export default Units;
