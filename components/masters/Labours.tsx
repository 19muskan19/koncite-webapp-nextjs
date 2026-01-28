'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Users, Plus, Search, X, Download } from 'lucide-react';

interface Labour {
  id: string;
  name: string;
  category: 'Skilled' | 'Unskilled' | 'Semi Skilled';
  trade?: string;
  skillLevel?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

interface LaboursProps {
  theme: ThemeType;
}

const Labours: React.FC<LaboursProps> = ({ theme }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLabourModal, setShowLabourModal] = useState<boolean>(false);
  const [userLabours, setUserLabours] = useState<Labour[]>([]);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [formData, setFormData] = useState({
    labourType: '',
    category: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const defaultLabours: Labour[] = [
    { id: 'LAB001', name: 'Carpenters', category: 'Skilled', status: 'Active', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: 'LAB002', name: 'Electricians', category: 'Skilled', status: 'Active', createdAt: '2024-02-20T00:00:00.000Z' },
  ];

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

  // Load labours from localStorage on mount
  useEffect(() => {
    const savedLabours = localStorage.getItem('labours');
    if (savedLabours) {
      try {
        const parsed = JSON.parse(savedLabours);
        setUserLabours(parsed);
      } catch (e) {
        setUserLabours([]);
      }
    } else {
      setUserLabours([]);
    }
  }, []);

  // Initialize labours state with default and user labours
  useEffect(() => {
    setLabours([...defaultLabours, ...userLabours]);
  }, [userLabours]);

  // Save labours to localStorage whenever userLabours state changes
  useEffect(() => {
    const defaultIds = ['LAB001', 'LAB002'];
    const userAddedLabours = userLabours.filter(l => !defaultIds.includes(l.id));
    if (userAddedLabours.length > 0) {
      try {
        localStorage.setItem('labours', JSON.stringify(userAddedLabours));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          alert('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('labours');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [userLabours]);

  // Filter labours based on search query
  const filteredLabours = useMemo(() => {
    if (!searchQuery.trim()) return labours;
    
    return labours.filter(labour =>
      labour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      labour.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      labour.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, labours]);

  const handleToggleStatus = (labourId: string) => {
    setLabours(prevLabours => {
      const updated = prevLabours.map(labour =>
        labour.id === labourId
          ? { ...labour, status: labour.status === 'Active' ? 'Inactive' : 'Active' }
          : labour
      );
      
      // Update userLabours state for localStorage persistence
      const defaultIds = ['LAB001', 'LAB002'];
      const userAddedLabours = updated.filter(l => !defaultIds.includes(l.id));
      setUserLabours(userAddedLabours);
      
      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowLabourModal(false);
    setFormData({
      labourType: '',
      category: ''
    });
  };

  const handleCreateLabour = () => {
    if (!formData.labourType || !formData.category) {
      alert('Please fill in all required fields');
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

    try {
      setUserLabours(prev => [...prev, newLabour]);
      setLabours(prev => [...prev, newLabour]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving labour:', error);
      alert('Error saving labour. Please try again.');
    }
  };

  const handleDownloadExcel = () => {
    // Prepare data for Excel export
    const headers = ['Labour Type', 'Code', 'Category', 'Status'];
    const rows = filteredLabours.map(labour => [
      labour.name,
      labour.id,
      labour.category,
      labour.status
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for UTF-8 to ensure Excel opens it correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `labours_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Users className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Labours</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage labour workforce and assignments
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
            onClick={() => setShowLabourModal(true)}
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
            placeholder="Search by labour type, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {filteredLabours.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Type</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Category</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredLabours.map((row) => (
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.id}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.category}</td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={() => handleToggleStatus(row.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B8E23] focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-[#6B8E23]'
                            : 'bg-slate-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
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
          <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first labour entry</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredLabours.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-emerald-500`}>{filteredLabours.filter(l => l.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Add Labour Modal */}
      {showLabourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Labour</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter labour details below</p>
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                  } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                onClick={handleCreateLabour}
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

export default Labours;
