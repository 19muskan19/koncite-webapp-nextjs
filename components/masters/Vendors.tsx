'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Truck, MoreVertical, Download, Plus, Search, ArrowUpDown } from 'lucide-react';
import CreateVendorModal from './Modals/CreateVendorModal';

interface Vendor {
  id: string;
  name: string;
  gstNo?: string;
  address: string;
  type: 'contractor' | 'supplier' | 'both';
  contactPersonName: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

interface VendorsProps {
  theme: ThemeType;
}

const Vendors: React.FC<VendorsProps> = ({ theme }) => {
  const toast = useToast();
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const defaultVendors: Vendor[] = [
    { id: '1', name: 'One Test Contractor', gstNo: '', address: 'Delhi,India', type: 'contractor', contactPersonName: 'Test contractor Name', phone: '9876543210', email: 'rajesh@gmail.com', status: 'Active', createdAt: '2024-01-15T00:00:00.000Z' },
    { id: '2', name: 'One Test Supplier', gstNo: '', address: 'Delhi,India', type: 'supplier', contactPersonName: 'Test supplier Name', phone: '9876543233', email: 'rajesh@gmail.com', status: 'Active', createdAt: '2024-02-20T00:00:00.000Z' },
    { id: '3', name: 'Ramji', gstNo: '', address: 'Pune', type: 'contractor', contactPersonName: 'Ramji', phone: '9856328096', email: 'ramji@gmail.com', status: 'Active', createdAt: '2024-03-10T00:00:00.000Z' },
    { id: '4', name: 'Prabhu Materials', gstNo: '', address: 'Pune', type: 'supplier', contactPersonName: 'Prabhu', phone: '9852096780', email: 'prabhu@gmail.com', status: 'Active', createdAt: '2024-03-15T00:00:00.000Z' },
    { id: '5', name: 'Raka enterprises', gstNo: '', address: 'Pune', type: 'both', contactPersonName: 'Ramesh', phone: '9764357093', email: 'mahesh.max3il@gmail.com', status: 'Active', createdAt: '2024-03-20T00:00:00.000Z' },
  ];

  const typeOptions = [
    { value: 'contractor', label: 'Contractor' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'both', label: 'Both' },
  ];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [defaultVendorsState, setDefaultVendorsState] = useState<Vendor[]>(defaultVendors);

  // Load vendors from localStorage on mount
  useEffect(() => {
    const savedVendors = localStorage.getItem('vendors');
    if (savedVendors) {
      try {
        const parsed = JSON.parse(savedVendors);
        setVendors(parsed);
      } catch (e) {
        setVendors([]);
      }
    } else {
      setVendors([]);
    }
  }, []);

  // Save vendors to localStorage whenever vendors state changes
  useEffect(() => {
    const defaultIds = ['1', '2', '3', '4', '5'];
    const userAddedVendors = vendors.filter(v => !defaultIds.includes(v.id));
    if (userAddedVendors.length > 0) {
      try {
        localStorage.setItem('vendors', JSON.stringify(userAddedVendors));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved.');
        }
      }
    } else {
      try {
        localStorage.removeItem('vendors');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [vendors]);

  // Combine default and user vendors
  const allVendors = useMemo(() => {
    return [...defaultVendorsState, ...vendors];
  }, [vendors, defaultVendorsState]);

  // Filter vendors based on search query
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return allVendors;
    
    return allVendors.filter(vendor =>
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.gstNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contactPersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allVendors]);

  const handleVendorCreated = (newVendor: Vendor) => {
    setVendors(prev => [...prev, newVendor]);
  };

  // Listen for vendorsUpdated event
  useEffect(() => {
    const handleVendorsUpdated = () => {
      const savedVendors = localStorage.getItem('vendors');
      if (savedVendors) {
        try {
          const parsed = JSON.parse(savedVendors);
          if (Array.isArray(parsed)) {
            setVendors(parsed);
          }
        } catch (e) {
          // Keep current vendors if parsing fails
        }
      }
    };

    window.addEventListener('vendorsUpdated', handleVendorsUpdated);
    return () => {
      window.removeEventListener('vendorsUpdated', handleVendorsUpdated);
    };
  }, []);

  const handleToggleStatus = (vendorId: string) => {
    const defaultIds = ['1', '2', '3', '4', '5'];
    if (defaultIds.includes(vendorId)) {
      // Toggle status for default vendors
      setDefaultVendorsState(prevVendors => {
        return prevVendors.map(vendor =>
          vendor.id === vendorId
            ? { ...vendor, status: vendor.status === 'Active' ? 'Inactive' : 'Active' }
            : vendor
        );
      });
    } else {
      // Toggle status for user-added vendors
      setVendors(prevVendors => {
        return prevVendors.map(vendor =>
          vendor.id === vendorId
            ? { ...vendor, status: vendor.status === 'Active' ? 'Inactive' : 'Active' }
            : vendor
        );
      });
    }
  };

  const handleDownloadExcel = () => {
    const headers = ['Name', 'Gst No', 'Address', 'Type', 'Contact Person Name', 'Phone', 'Email', 'Status'];
    const rows = filteredVendors.map(vendor => [
      vendor.name,
      vendor.gstNo || '',
      vendor.address,
      vendor.type,
      vendor.contactPersonName,
      vendor.phone,
      vendor.email,
      vendor.status
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
    link.setAttribute('download', `vendors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Truck className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Vendors</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage vendor information and contracts
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
            placeholder="Search by name, GST No, address, type, contact person, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {filteredVendors.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      SR No
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
                      Gst No
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Address
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Type
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Contact Person Name
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Phone
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Email
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3" />
                      Status
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredVendors.map((row, idx) => (
                  <tr 
                    key={row.id} 
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
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{idx + 1}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.gstNo || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.address}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.type}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.contactPersonName}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.phone}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.email}</td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          handleToggleStatus(row.id);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642] focus:ring-offset-2 cursor-pointer ${
                          row.status === 'Active'
                            ? 'bg-[#C2D642]'
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
                        title={row.status === 'Inactive' ? 'Vendor is disabled' : ''}
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
          <Truck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first vendor entry</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredVendors.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredVendors.filter(v => v.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Vendor Modal */}
      <CreateVendorModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Reload vendors from localStorage
          const savedVendors = localStorage.getItem('vendors');
          if (savedVendors) {
            try {
              const parsed = JSON.parse(savedVendors);
              if (Array.isArray(parsed)) {
                setVendors(parsed);
              }
            } catch (e) {
              // Keep current vendors if parsing fails
            }
          }
        }}
        defaultVendors={defaultVendorsState}
        userVendors={vendors}
        onVendorCreated={handleVendorCreated}
      />
    </div>
  );
};

export default Vendors;
