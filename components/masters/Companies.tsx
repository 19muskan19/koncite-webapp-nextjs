'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { 
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  X,
  Upload,
  Download
} from 'lucide-react';
import CreateCompanyModal from './Modals/CreateCompanyModal';

interface Company {
  id: string;
  name: string;
  code: string;
  address: string;
  registrationNo: string;
  logo: string;
  contact?: string;
  email?: string;
  status: string;
  projects?: number;
  employees?: number;
  createdAt?: string;
}

interface CompaniesProps {
  theme: ThemeType;
}

const Companies: React.FC<CompaniesProps> = ({ theme }) => {
  const toast = useToast();
  const [showCompanyModal, setShowCompanyModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortFilter, setSortFilter] = useState<'recent' | 'oldest' | 'none'>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    registrationName: '',
    registeredAddress: '',
    companyRegistrationNo: '',
    logo: null as File | null,
    logoPreview: '' as string | null
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Memoize default companies
  const defaultCompanies = useMemo(() => [
    { 
      id: '1',
      name: 'ABC Construction Ltd', 
      code: 'ABC001', 
      address: '123 Main Street, New York, NY 10001', 
      contact: '+1-234-567-8900',
      email: 'contact@abcconstruction.com',
      logo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=128',
      registrationNo: 'REG001',
      status: 'Active',
      projects: 12,
      employees: 245,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    { 
      id: '2',
      name: 'XYZ Builders Inc', 
      code: 'XYZ002', 
      address: '456 Oak Avenue, Los Angeles, CA 90001',
      contact: '+1-234-567-8901',
      email: 'info@xyzbuilders.com',
      logo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=128',
      registrationNo: 'REG002',
      status: 'Active',
      projects: 8,
      employees: 180,
      createdAt: '2024-02-20T00:00:00.000Z'
    },
    { 
      id: '3',
      name: 'Premier Infrastructure Group', 
      code: 'PIG003', 
      address: '789 Business Park, Chicago, IL 60601',
      contact: '+1-234-567-8902',
      email: 'hello@premierinfra.com',
      logo: 'https://ui-avatars.com/api/?name=Premier+Infrastructure&background=f59e0b&color=fff&size=128',
      registrationNo: 'REG003',
      status: 'Active',
      projects: 15,
      employees: 320,
      createdAt: '2024-03-10T00:00:00.000Z'
    },
    { 
      id: '4',
      name: 'Elite Construction Solutions', 
      code: 'ECS004', 
      address: '321 Commerce Drive, Houston, TX 77001',
      contact: '+1-234-567-8903',
      email: 'contact@eliteconstruction.com',
      logo: 'https://ui-avatars.com/api/?name=Elite+Construction&background=ef4444&color=fff&size=128',
      registrationNo: 'REG004',
      status: 'Active',
      projects: 6,
      employees: 95,
      createdAt: '2024-04-05T00:00:00.000Z'
    },
  ], []);

  // Load companies from localStorage on mount
  useEffect(() => {
    const savedCompanies = localStorage.getItem('companies');
    if (savedCompanies) {
      try {
        const parsed = JSON.parse(savedCompanies);
        setCompanies(parsed);
      } catch (e) {
        setCompanies([]);
      }
    } else {
      setCompanies([]);
    }
  }, []);

  // Save companies to localStorage whenever companies state changes
  useEffect(() => {
    const defaultIds = ['1', '2', '3', '4'];
    const userCompanies = companies.filter(c => !defaultIds.includes(c.id));
    if (userCompanies.length > 0) {
      try {
        localStorage.setItem('companies', JSON.stringify(userCompanies));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          toast.showWarning('Storage limit exceeded. Some data may not be saved. Please clear browser storage or use smaller images.');
        }
      }
    } else {
      try {
        localStorage.removeItem('companies');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [companies]);

  // Compress and resize image before storing
  const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.showError('Image size should be less than 5MB');
        return;
      }
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
      setFormData({
        ...formData,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies(prev => [...prev, newCompany]);
  };

  // Listen for companiesUpdated event
  useEffect(() => {
    const handleCompaniesUpdated = () => {
      const savedCompanies = localStorage.getItem('companies');
      if (savedCompanies) {
        try {
          const parsed = JSON.parse(savedCompanies);
          setCompanies(parsed);
        } catch (e) {
          setCompanies([]);
        }
      }
    };

    window.addEventListener('companiesUpdated', handleCompaniesUpdated);
    return () => {
      window.removeEventListener('companiesUpdated', handleCompaniesUpdated);
    };
  }, []);

  const handleCloseModal = () => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setShowCompanyModal(false);
    setEditingCompanyId(null);
    setViewingCompanyId(null);
    setFormData({
      registrationName: '',
      registeredAddress: '',
      companyRegistrationNo: '',
      logo: null,
      logoPreview: null
    });
  };

  useEffect(() => {
    return () => {
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
    };
  }, [formData.logoPreview]);

  const handleViewCompany = (company: Company) => {
    setViewingCompanyId(company.id);
    setShowCompanyModal(true);
    setOpenDropdownId(null);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompanyId(company.id);
    setViewingCompanyId(null);
    setFormData({
      registrationName: company.name,
      registeredAddress: company.address,
      companyRegistrationNo: company.registrationNo,
      logo: null,
      logoPreview: company.logo || null
    });
    setShowCompanyModal(true);
    setOpenDropdownId(null);
  };

  const handleUpdateCompany = async () => {
    const missingFields: string[] = [];
    
    if (!formData.registrationName) missingFields.push('Registration Name');
    if (!formData.registeredAddress) missingFields.push('Registered Address');
    if (!formData.companyRegistrationNo) missingFields.push('Company Registration No');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (!editingCompanyId) return;

    let logoUrl = '';

    if (formData.logo) {
      try {
        logoUrl = await compressImage(formData.logo, 200, 200, 0.7);
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.showError('Error processing image. Please try again.');
        return;
      }
    } else {
      logoUrl = formData.logoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.registrationName)}&background=6366f1&color=fff&size=128`;
    }

    try {
      setCompanies(prev => prev.map(company => 
        company.id === editingCompanyId
          ? {
              ...company,
              name: formData.registrationName,
              address: formData.registeredAddress,
              registrationNo: formData.companyRegistrationNo,
              logo: logoUrl,
              createdAt: new Date().toISOString()
            }
          : company
      ));
      handleCloseModal();
      setEditingCompanyId(null);
    } catch (error) {
      console.error('Error updating company:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast.showError('Storage limit exceeded. Please clear some data or use a smaller image.');
      } else {
        toast.showError('Error updating company. Please try again.');
      }
    }
  };

  const handleDeleteCompany = (companyId: string) => {
    const defaultIds = ['1', '2', '3', '4'];
    if (defaultIds.includes(companyId)) {
      toast.showWarning('Cannot delete sample companies');
      return;
    }

    if (window.confirm('Are you sure you want to delete this company?')) {
      setCompanies(prev => prev.filter(company => company.id !== companyId));
      setDeleteConfirmId(null);
      setOpenDropdownId(null);
      if (viewingCompanyId === companyId) {
        setViewingCompanyId(null);
        setShowCompanyModal(false);
      }
    }
  };

  const toggleDropdown = (companyId: string) => {
    setOpenDropdownId(openDropdownId === companyId ? null : companyId);
    setDeleteConfirmId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdownId(null);
        setDeleteConfirmId(null);
      }
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-trigger')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Memoize sorted companies
  const sortedCompanies = useMemo(() => {
    const defaultIds = new Set(defaultCompanies.map(c => c.id));
    const newCompanies = companies.filter(c => !defaultIds.has(c.id));
    let allCompanies = [...defaultCompanies, ...newCompanies];
    
    if (searchQuery.trim()) {
      allCompanies = allCompanies.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortFilter === 'recent') {
      allCompanies = [...allCompanies].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortFilter === 'oldest') {
      allCompanies = [...allCompanies].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    }
    
    return allCompanies;
  }, [companies, sortFilter, searchQuery, defaultCompanies]);

  const viewingCompany = viewingCompanyId 
    ? [...defaultCompanies, ...companies].find(c => c.id === viewingCompanyId)
    : null;

  const handleDownloadExcel = () => {
    // Prepare data for Excel export
    const headers = ['Company Name', 'Code', 'Address', 'Registration No', 'Contact', 'Email', 'Status', 'Projects', 'Employees'];
    const rows = sortedCompanies.map(company => [
      company.name,
      company.code,
      company.address,
      company.registrationNo,
      company.contact || '-',
      company.email || '-',
      company.status,
      company.projects?.toString() || '0',
      company.employees?.toString() || '0'
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
    link.setAttribute('download', `companies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Building2 className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Companies</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage company information and details
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
            onClick={() => {
              setShowCreateModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
        <div className="relative filter-dropdown">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all filter-trigger ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <Filter className="w-4 h-4" /> 
            Filter
            {sortFilter !== 'none' && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'}`}>
                {sortFilter === 'recent' ? 'Recent' : 'Oldest'}
              </span>
            )}
          </button>
          {showFilterDropdown && (
            <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg z-20 filter-dropdown ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="py-1">
                <button
                  onClick={() => {
                    setSortFilter('none');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'none'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  None
                </button>
                <button
                  onClick={() => {
                    setSortFilter('recent');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'recent'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => {
                    setSortFilter('oldest');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'oldest'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Companies Bars View */}
      {sortedCompanies.length > 0 ? (
        <div className="space-y-2">
          {sortedCompanies.map((company, idx) => (
            <div 
              key={company.id || idx} 
              onClick={() => handleViewCompany(company)}
              className={`rounded-lg border ${cardClass} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDark ? 'hover:border-[#C2D642]/30' : 'hover:border-[#C2D642]/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={company.logo} 
                      alt={company.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <h3 className={`text-base font-black ${textPrimary} truncate`}>{company.name}</h3>
                </div>
                <div className="relative dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => toggleDropdown(company.id)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors dropdown-trigger`}
                  >
                    <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                  </button>
                  {openDropdownId === company.id && (
                    <div className={`absolute right-0 top-10 z-10 w-48 rounded-lg border shadow-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="py-1">
                        <button
                          onClick={() => handleEditCompany(company)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors ${
                            isDark 
                              ? 'hover:bg-slate-700 text-slate-100' 
                              : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        {!['1', '2', '3', '4'].includes(company.id) && (
                          <button
                            onClick={() => {
                              setDeleteConfirmId(company.id);
                              setOpenDropdownId(null);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors ${
                              isDark 
                                ? 'hover:bg-red-500/20 text-red-400' 
                                : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Companies Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first company</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{sortedCompanies.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{sortedCompanies.filter(c => c.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Company Modal */}
      <CreateCompanyModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          // Reload companies from localStorage
          const savedCompanies = localStorage.getItem('companies');
          if (savedCompanies) {
            try {
              const parsed = JSON.parse(savedCompanies);
              setCompanies(parsed);
            } catch (e) {
              setCompanies([]);
            }
          }
        }}
        defaultCompanies={defaultCompanies}
        userCompanies={companies.filter(c => !['1', '2', '3', '4'].includes(c.id))}
        onCompanyCreated={handleCompanyCreated}
      />

      {/* Edit/View Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  {viewingCompanyId ? 'Company Details' : 'Edit Company'}
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  {viewingCompanyId ? 'View company information' : 'Update company details below'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>

            {/* Modal Body */}
            {viewingCompanyId && viewingCompany ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={viewingCompany.logo} 
                      alt={viewingCompany.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingCompany.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-black ${textPrimary} mb-1`}>{viewingCompany.name}</h3>
                    <p className={`text-sm font-bold ${textSecondary} uppercase tracking-wider`}>Code: {viewingCompany.code}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Registration Name
                    </label>
                    <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.name}</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Registered Address
                    </label>
                    <p className={`text-sm ${textSecondary}`}>{viewingCompany.address}</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Company Registration No
                    </label>
                    <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.registrationNo}</p>
                  </div>

                  {viewingCompany.contact && (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Contact
                      </label>
                      <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.contact}</p>
                    </div>
                  )}

                  {viewingCompany.email && (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Email
                      </label>
                      <p className={`text-sm ${textSecondary}`}>{viewingCompany.email}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-inherit">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Projects
                      </label>
                      <p className={`text-xl font-black ${textPrimary}`}>{viewingCompany.projects || 0}</p>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Employees
                      </label>
                      <p className={`text-xl font-black ${textPrimary}`}>{viewingCompany.employees || 0}</p>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Status
                    </label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                      viewingCompany.status === 'Active' 
                        ? 'bg-[#C2D642]/20 text-[#C2D642]' 
                        : 'bg-slate-500/20 text-slate-500'
                    }`}>
                      {viewingCompany.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : editingCompanyId ? (
              <div className="p-6 space-y-6">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Registration Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="registrationName"
                    value={formData.registrationName}
                    onChange={handleInputChange}
                    placeholder="Enter company registration name"
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Registered Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="registeredAddress"
                    value={formData.registeredAddress}
                    onChange={handleInputChange}
                    placeholder="Enter registered address"
                    rows={3}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all resize-none ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Company Registration No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyRegistrationNo"
                    value={formData.companyRegistrationNo}
                    onChange={handleInputChange}
                    placeholder="Enter company registration number"
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Company Logo
                  </label>
                  <div className="space-y-4">
                    {formData.logoPreview ? (
                      <div className="relative">
                        <img
                          src={formData.logoPreview}
                          alt="Logo preview"
                          className="w-32 h-32 rounded-xl object-cover border-2 border-[#C2D642]/20"
                        />
                        <button
                          onClick={() => {
                            if (formData.logoPreview) {
                              URL.revokeObjectURL(formData.logoPreview);
                            }
                            setFormData({ ...formData, logo: null, logoPreview: null });
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          isDark
                            ? 'border-slate-700 hover:border-[#C2D642] bg-slate-800/30'
                            : 'border-slate-300 hover:border-[#C2D642] bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className={`w-8 h-8 mb-2 ${textSecondary}`} />
                          <p className={`text-sm font-bold ${textSecondary}`}>
                            <span className="text-[#C2D642]">Click to upload</span> or drag and drop
                          </p>
                          <p className={`text-xs ${textSecondary} mt-1`}>PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
              {viewingCompanyId ? (
                <>
                  <button
                    onClick={handleCloseModal}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      isDark
                        ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                    }`}
                  >
                    Close
                  </button>
                  {viewingCompany && (
                    <button
                      onClick={() => {
                        handleEditCompany(viewingCompany);
                      }}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </>
              ) : (
                <>
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
                    onClick={handleUpdateCompany}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md"
                  >
                    Update
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl border ${cardClass} shadow-2xl`}>
            <div className={`p-6 border-b border-inherit`}>
              <h2 className={`text-xl font-black ${textPrimary}`}>Delete Company</h2>
              <p className={`text-sm ${textSecondary} mt-1`}>
                Are you sure you want to delete this company? This action cannot be undone.
              </p>
            </div>
            <div className={`flex items-center justify-end gap-3 p-6`}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCompany(deleteConfirmId)}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
