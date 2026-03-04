'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2, ChevronDown, Search } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import { getExactErrorMessage } from '@/utils/errorUtils';
import { sortCountryCodes, findCountryByDialCode } from '@/utils/countryCodeUtils';

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

const getFlagUrl = (countryCode: string) =>
  `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;

interface Vendor {
  id: string;
  uuid?: string;
  name: string;
  gstNo?: string;
  gst_no?: string;
  address: string;
  type: 'contractor' | 'supplier' | 'both';
  contactPersonName?: string;
  contact_person_name?: string;
  phone: string;
  email: string;
  country_code?: string;
  status?: 'Active' | 'Inactive';
}

interface CreateVendorModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdVendor?: any, formData?: any) => void;
  editingVendorId?: string | null;
  vendors?: Vendor[];
  /** Pre-select vendor type when creating new vendor (e.g. 'contractor' when opening from Add Labour Entry) */
  defaultVendorType?: 'contractor' | 'supplier' | 'both';
}

const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingVendorId = null,
  vendors = [],
  defaultVendorType
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: '',
    contact_person_name: '',
    country_code: '91',
    phone: '',
    email: '',
    is_active: 1 as number
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';

  const isEditing = !!editingVendorId;

  // Priority countries (USA, GCC, India) - always included, used as fallback and to ensure correct dial codes
  const PRIORITY_COUNTRIES: CountryCode[] = [
    { code: 'US', dialCode: '1', name: 'United States', flag: getFlagUrl('US') },
    { code: 'IN', dialCode: '91', name: 'India', flag: getFlagUrl('IN') },
    { code: 'AE', dialCode: '971', name: 'United Arab Emirates', flag: getFlagUrl('AE') },
    { code: 'SA', dialCode: '966', name: 'Saudi Arabia', flag: getFlagUrl('SA') },
    { code: 'QA', dialCode: '974', name: 'Qatar', flag: getFlagUrl('QA') },
    { code: 'KW', dialCode: '965', name: 'Kuwait', flag: getFlagUrl('KW') },
    { code: 'BH', dialCode: '973', name: 'Bahrain', flag: getFlagUrl('BH') },
    { code: 'OM', dialCode: '968', name: 'Oman', flag: getFlagUrl('OM') },
  ];

  const parseDialCode = (c: any): string => {
    const root = (c.idd?.root || '').replace(/\+/g, '');
    const suffixes = c.idd?.suffixes || [];
    const firstSuffix = suffixes[0];
    // USA/Canada: root is "+1", suffixes are area codes (e.g. "201") - use root only
    if (root === '1' || (c.cca2 === 'US' || c.cca2 === 'CA')) return '1';
    // When suffix is 3+ chars, it's likely an area code - use root only
    if (firstSuffix && String(firstSuffix).length >= 3) return root;
    // Otherwise: root + first suffix (e.g. IN: "9"+"1"=91, AE: "9"+"71"=971)
    if (firstSuffix) return root + String(firstSuffix);
    return root;
  };

  // Fetch country codes from REST Countries API (third-party)
  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) {
      setIsLoadingCountryCodes(true);
      fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags')
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch')))
        .then((data: any[]) => {
          const priorityCodes = new Set(PRIORITY_COUNTRIES.map((p) => p.code));
          const fromApi: CountryCode[] = data
            .filter((c: any) => c.idd?.root && c.cca2)
            .map((c: any) => {
              const dialCode = parseDialCode(c);
              return {
                code: c.cca2,
                dialCode,
                name: c.name?.common || c.name?.official || '',
                flag: c.flags?.png || getFlagUrl(c.cca2)
              };
            })
            .filter((c: CountryCode) => c.dialCode);
          // Merge: priority first, then API (dedupe by code), ensuring USA + GCC always present
          const byCode = new Map<string, CountryCode>();
          PRIORITY_COUNTRIES.forEach((p) => byCode.set(p.code, p));
          fromApi.forEach((c) => { if (!byCode.has(c.code)) byCode.set(c.code, c); });
          setCountryCodes(sortCountryCodes(Array.from(byCode.values())));
        })
        .catch(() => {
          setCountryCodes(PRIORITY_COUNTRIES);
        })
        .finally(() => setIsLoadingCountryCodes(false));
    }
  }, [isOpen]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
        setCountrySearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeOptions = [
    { value: 'supplier', label: 'Supplier' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'both', label: 'Both' },
  ];

  // Load vendor data when editing
  useEffect(() => {
    if (isOpen && editingVendorId) {
      const loadVendorData = async () => {
        try {
          const vendorData = await masterDataAPI.getVendor(editingVendorId);
          const isActive = vendorData.is_active === 1 || vendorData.is_active === true || vendorData.is_active === '1';
          setFormData({
            name: vendorData.name || '',
            address: vendorData.address || '',
            type: vendorData.type || '',
            contact_person_name: vendorData.contact_person_name || vendorData.contactPersonName || '',
            country_code: vendorData.country_code || '91',
            phone: vendorData.phone || '',
            email: vendorData.email || '',
            is_active: isActive ? 1 : 0
          });
        } catch (error: any) {
          console.error('Failed to load vendor data:', error);
          toast.showError('Failed to load vendor data');
        }
      };
      loadVendorData();
    } else if (isOpen && !editingVendorId) {
      // Reset form for new vendor (use defaultVendorType if provided)
      setFormData({
        name: '',
        address: '',
        type: defaultVendorType || '',
        contact_person_name: '',
        country_code: '91',
        phone: '',
        email: '',
        is_active: 1
      });
    }
  }, [isOpen, editingVendorId, defaultVendorType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        address: '',
        type: '',
        contact_person_name: '',
        country_code: '91',
        phone: '',
        email: '',
        is_active: 1
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    const missingFields: string[] = [];

    if (!formData.name.trim()) missingFields.push('Vendor Name');
    if (!formData.address.trim()) missingFields.push('Address');
    if (!formData.type || !['both', 'supplier', 'contractor'].includes(formData.type)) missingFields.push('Type');
    if (!formData.contact_person_name.trim()) missingFields.push('Contact Person Name');
    if (!formData.country_code?.trim()) missingFields.push('Country Code');
    if (!formData.phone.trim()) missingFields.push('Phone');
    if (!formData.email.trim()) missingFields.push('Email');

    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.showWarning('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        type: formData.type,
        contact_person_name: formData.contact_person_name.trim(),
        country_code: formData.country_code,
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase()
      };

      if (isEditing && editingVendorId) {
        payload.is_active = formData.is_active;
        // Update existing vendor
        await masterDataAPI.updateVendor(editingVendorId, payload);
        toast.showSuccess('Vendor updated successfully!');
      } else {
        // Create new vendor - status enabled/on (1) by default
        const createPayload = { is_active: 1, ...payload };
        const createResponse = await masterDataAPI.createVendor(createPayload);
        toast.showSuccess('Vendor created successfully!');
        const raw = createResponse?.data ?? createResponse?.vendor ?? createResponse;
        const createdVendor = Array.isArray(raw) ? raw[0] : raw;
        if (onSuccess) onSuccess(createdVendor, formData);
        onClose();
        return;
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save vendor:', error);
      toast.showError(getExactErrorMessage(error) || 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <button onClick={onClose} disabled={isSubmitting} className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`} title="Close">
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-6 pr-14 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Vendor' : 'Create New Vendor'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update vendor details below' : 'Enter vendor details below'}
            </p>
          </div>
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
              >
                <option value="">----Select Vendor Type----</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Person Name"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                />
              </div>

              {/* Country Code & Phone (third-party API with flags) */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Country Code & Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div ref={countryDropdownRef} className="relative">
                    {isLoadingCountryCodes ? (
                      <div className={`w-36 px-4 py-3 rounded-lg border ${borderClass} ${inputBg} flex items-center justify-center`}>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          disabled={isSubmitting}
                          className={`flex items-center gap-2 px-3 py-3 rounded-lg border ${borderClass} ${inputBg} ${textPrimary} min-w-[140px] hover:opacity-90 transition-all disabled:opacity-50 focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                        >
                          {countryCodes.length > 0 ? (
                            <>
                              <img
                                src={(findCountryByDialCode(countryCodes, formData.country_code) || findCountryByDialCode(countryCodes, '91') || countryCodes[0])?.flag || getFlagUrl('IN')}
                                alt=""
                                className="w-5 h-4 object-cover rounded"
                                onError={(e) => { (e.target as HTMLImageElement).src = getFlagUrl('IN'); }}
                              />
                              <span className="text-sm font-bold">+{formData.country_code}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold">+91</span>
                          )}
                          <ChevronDown className={`w-4 h-4 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isCountryDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => { setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }} />
                            <div className={`absolute top-full left-0 mt-1 z-[60] w-72 max-h-72 overflow-hidden ${inputBg} border ${borderClass} rounded-lg shadow-xl flex flex-col`}>
                              <div className="p-2 border-b border-inherit flex-shrink-0">
                                <div className="relative">
                                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                                  <input
                                    type="text"
                                    value={countrySearchQuery}
                                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                                    placeholder="Search country or code..."
                                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${borderClass} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto max-h-52 p-2">
                                {(() => {
                                  const filtered = countryCodes.filter((cc) => {
                                    const q = countrySearchQuery.trim().toLowerCase();
                                    if (!q) return true;
                                    return (
                                      cc.name.toLowerCase().includes(q) ||
                                      cc.code.toLowerCase().includes(q) ||
                                      cc.dialCode.includes(q)
                                    );
                                  });
                                  if (filtered.length === 0) {
                                    return (
                                      <div className={`p-4 text-center text-sm ${textSecondary}`}>
                                        No countries found
                                      </div>
                                    );
                                  }
                                  return filtered.map((cc) => (
                                  <button
                                    key={`${cc.code}-${cc.dialCode}`}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, country_code: cc.dialCode });
                                      setIsCountryDropdownOpen(false);
                                      setCountrySearchQuery('');
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${
                                      formData.country_code === cc.dialCode
                                        ? isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
                                        : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    <img
                                      src={cc.flag || getFlagUrl(cc.code)}
                                      alt=""
                                      className="w-6 h-4 object-cover rounded"
                                      onError={(e) => { (e.target as HTMLImageElement).src = getFlagUrl(cc.code); }}
                                    />
                                    <span className={`flex-1 text-sm font-bold ${textPrimary}`}>{cc.name}</span>
                                    <span className={`text-sm ${textSecondary}`}>+{cc.dialCode}</span>
                                  </button>
                                ));
                                })()}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setFormData({ ...formData, phone: v });
                    }}
                    placeholder="Enter phone number"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold border ${borderClass} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  />
                </div>
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
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                />
              </div>

              {/* Status - only show when editing */}
              {isEditing && (
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Status
                  </label>
                  <select
                    name="is_active"
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' ? 1 : 0 })}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorModal;
