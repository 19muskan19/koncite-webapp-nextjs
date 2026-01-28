'use client';

import React, { useState, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Package, MoreVertical, Search, ArrowUpDown, Download } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([
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
  ]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleToggleStatus = (unitId: string) => {
    setUnits(prevUnits =>
      prevUnits.map(unit =>
        unit.id === unitId
          ? { ...unit, status: unit.status === 'Active' ? 'Inactive' : 'Active' }
          : unit
      )
    );
  };

  // Filter units based on search query
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    
    return units.filter(unit =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.conversion.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
                  <tr key={rowIdx} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.conversion}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.factor}</td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={() => handleToggleStatus(row.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B8E23] focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-[#6B8E23]'
                            : 'bg-slate-400'
                        }`}
                        role="switch"
                        aria-checked={row.status === 'Active'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
          <p className={`text-2xl font-black text-emerald-500`}>{filteredUnits.filter(u => u.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>
    </div>
  );
};

export default Units;
