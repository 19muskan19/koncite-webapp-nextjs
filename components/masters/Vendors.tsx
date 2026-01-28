'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { Truck, MoreVertical, Download, Plus, Search, X, ArrowUpDown } from 'lucide-react';

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
  const [showVendorModal, setShowVendorModal] = useState<boolean>(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [defaultVendorsState, setDefaultVendorsState] = useState<Vendor[]>(defaultVendors);
  const [formData, setFormData] = useState({
    name: '',
    gstNo: '',
    address: '',
    type: '',
    contactPersonName: '',
    phone: '',
    email: ''
  });

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
          alert('Storage limit exceeded. Some data may not be saved.');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowVendorModal(false);
    setFormData({
      name: '',
      gstNo: '',
      address: '',
      type: '',
      contactPersonName: '',
      phone: '',
      email: ''
    });
  };

  const handleCreateVendor = () => {
    if (!formData.name || !formData.address || !formData.type || !formData.contactPersonName || !formData.phone || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    const newVendor: Vendor = {
      id: Date.now().toString(),
      name: formData.name,
      gstNo: formData.gstNo || undefined,
      address: formData.address,
      type: formData.type as 'contractor' | 'supplier' | 'both',
      contactPersonName: formData.contactPersonName,
      phone: formData.phone,
      email: formData.email,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    try {
      setVendors(prev => [...prev, newVendor]);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Error saving vendor. Please try again.');
    }
  };

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
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Truck className="w-6 h-6 text-[#6B8E23]" />
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
            onClick={() => setShowVendorModal(true)}
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
            placeholder="Search by name, GST No, address, type, contact person, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      #
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
                  <tr key={row.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>#{idx + 1}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.name}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.gstNo || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.address}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.type}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.contactPersonName}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.phone}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{row.email}</td>
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
          <p className={`text-2xl font-black text-emerald-500`}>{filteredVendors.filter(v => v.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Add New Vendor</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Enter vendor details below</p>
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
              {/* Vendor Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor Name */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter Vendor Name"
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                    } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none ${!formData.type ? 'border-red-500' : ''}`}
                  >
                    <option value="">----Select Vendor Type----</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* GST No */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    GST No (If any)
                  </label>
                  <input
                    type="text"
                    name="gstNo"
                    value={formData.gstNo}
                    onChange={handleInputChange}
                    placeholder="Enter Your GST No. (If Any)"
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                    } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  />
                </div>

                {/* Address */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter Your Address"
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                    } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  />
                </div>
              </div>

              {/* Separator */}
              <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}></div>

              {/* Contact Details Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-black ${textPrimary}`}>CONTACT DETAILS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Person Name */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={handleInputChange}
                      placeholder="Enter Contact Person Name"
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                      } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    />
                  </div>

                  {/* Mobile No */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Mobile No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter Your Mobile No."
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                      } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter Your Email Id"
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#6B8E23]' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-[#6B8E23]'
                      } border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    />
                  </div>
                </div>
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
                onClick={handleCreateVendor}
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

export default Vendors;
