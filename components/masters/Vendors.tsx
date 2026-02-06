'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Truck, MoreVertical, Download, Plus, Search, ArrowUpDown, Loader2, Edit, Trash2 } from 'lucide-react';
import CreateVendorModal from './Modals/CreateVendorModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface Vendor {
  id: string;
  uuid?: string;
  name: string;
  gstNo?: string;
  gst_no?: string; // API field name
  address: string;
  type: 'contractor' | 'supplier' | 'both';
  contactPersonName?: string;
  contact_person_name?: string; // API field name
  phone: string;
  email: string;
  country_code?: string; // API field (must be "91" or "971")
  status?: 'Active' | 'Inactive';
  is_active?: number;
  additional_fields?: any; // JSON field for custom data
  createdAt?: string;
}

interface VendorsProps {
  theme: ThemeType;
}

const Vendors: React.FC<VendorsProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const typeOptions = [
    { value: 'contractor', label: 'Contractor' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'both', label: 'Both' },
  ];

  // Fetch vendors from API
  const fetchVendors = async () => {
    if (!isAuthenticated) {
      setVendors([]);
      setIsLoadingVendors(false);
      return;
    }
    
    setIsLoadingVendors(true);
    setVendorsError(null);
    try {
      const fetchedVendors = await masterDataAPI.getVendors();
      // Transform API response to match Vendor interface
      const transformedVendors: Vendor[] = fetchedVendors.map((vendor: any) => ({
        id: vendor.uuid || String(vendor.id),
        uuid: vendor.uuid,
        name: vendor.name || '',
        gstNo: vendor.gst_no || vendor.gstNo || '',
        gst_no: vendor.gst_no || '',
        address: vendor.address || '',
        type: vendor.type || '',
        contactPersonName: vendor.contact_person_name || vendor.contactPersonName || '',
        contact_person_name: vendor.contact_person_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        country_code: vendor.country_code || '',
        status: (vendor.is_active === 1 || vendor.is_active === true ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
        is_active: vendor.is_active,
        additional_fields: vendor.additional_fields || null,
        createdAt: vendor.created_at || vendor.createdAt,
      }));
      setVendors(transformedVendors);
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err);
      setVendorsError(err.message || 'Failed to load vendors');
      setVendors([]);
      toast.showError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoadingVendors(false);
    }
  };

  // Load vendors from API on mount and when auth changes
  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search vendors using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all vendors
      await fetchVendors();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchVendors(query);
      // Transform API response to match Vendor interface
      const transformedVendors: Vendor[] = searchResults.map((vendor: any) => ({
        id: vendor.uuid || String(vendor.id),
        uuid: vendor.uuid,
        name: vendor.name || '',
        gstNo: vendor.gst_no || vendor.gstNo || '',
        gst_no: vendor.gst_no || '',
        address: vendor.address || '',
        type: vendor.type || '',
        contactPersonName: vendor.contact_person_name || vendor.contactPersonName || '',
        contact_person_name: vendor.contact_person_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        country_code: vendor.country_code || '',
        status: (vendor.is_active === 1 || vendor.is_active === true ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
        is_active: vendor.is_active,
        additional_fields: vendor.additional_fields || null,
        createdAt: vendor.created_at || vendor.createdAt,
      }));
      setVendors(transformedVendors);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.showError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchVendors();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter vendors (client-side filtering is optional since we're using API search)
  const filteredVendors = useMemo(() => {
    let filtered = [...vendors];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.gstNo && vendor.gstNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        vendor.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.contactPersonName && vendor.contactPersonName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        vendor.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [vendors, searchQuery, isSearching]);

  const handleEditVendor = async (vendor: Vendor) => {
    try {
      // Fetch full vendor details from API
      const vendorDetails = await masterDataAPI.getVendor(vendor.id);
      setEditingVendorId(vendor.id);
      // Open modal with vendor data - CreateVendorModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('Failed to fetch vendor details:', error);
      toast.showError('Failed to load vendor details');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await masterDataAPI.deleteVendor(vendorId);
        toast.showSuccess('Vendor deleted successfully');
        // Refresh vendors list
        await fetchVendors();
      } catch (error: any) {
        console.error('Failed to delete vendor:', error);
        toast.showError(error.message || 'Failed to delete vendor');
      }
    }
  };

  const handleVendorCreated = async () => {
    // Refresh vendors list after create/update
    await fetchVendors();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId]);

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
            placeholder="Search by vendor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C2D642]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingVendors && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Vendors...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your vendors</p>
        </div>
      )}

      {/* Error State */}
      {vendorsError && !isLoadingVendors && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Truck className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Vendors</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{vendorsError}</p>
          <button
            onClick={fetchVendors}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Vendors Table */}
      {!isLoadingVendors && !vendorsError && filteredVendors.length > 0 ? (
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
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.gstNo || row.gst_no || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.address || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.type === 'supplier' ? 'Supplier' : 
                       row.type === 'contractor' ? 'Contractor' : 
                       row.type === 'both' ? 'Both' : 
                       row.type}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.contactPersonName || row.contact_person_name || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.phone || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.email || '-'}</td>
                    <td className={`px-6 py-4`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        row.status === 'Active'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {row.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                          className={`dropdown-trigger p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                          title="Actions"
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && (
                          <div className={`dropdown-menu absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditVendor(row);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                                }`}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteVendor(row.id);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-50 text-red-600'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoadingVendors && !vendorsError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Truck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Vendors Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No vendors found matching "${searchQuery}"` 
              : 'Start by adding your first vendor entry'}
          </p>
        </div>
      ) : null}

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
        onClose={() => {
          setShowCreateModal(false);
          setEditingVendorId(null);
        }}
        onSuccess={handleVendorCreated}
        editingVendorId={editingVendorId}
        vendors={vendors}
      />
    </div>
  );
};

export default Vendors;
