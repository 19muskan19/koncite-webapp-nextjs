'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import { getExactErrorMessage } from '@/utils/errorUtils';

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
}

const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingVendorId = null,
  vendors = []
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
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';

  const isEditing = !!editingVendorId;

  // Fetch country codes from REST Countries API (third-party)
  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) {
      setIsLoadingCountryCodes(true);
      fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags')
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch')))
        .then((data: any[]) => {
          const transformed: CountryCode[] = data
            .filter((c: any) => c.idd?.root && c.cca2)
            .map((c: any) => {
              const root = c.idd.root || '';
              const suffixes = c.idd.suffixes || [''];
              const dialCode = suffixes.length > 0 && suffixes[0]
                ? `${root}${suffixes[0]}`.replace(/\+/g, '')
                : root.replace(/\+/g, '');
              return {
                code: c.cca2,
                dialCode: dialCode || '',
                name: c.name?.common || c.name?.official || '',
                flag: c.flags?.png || getFlagUrl(c.cca2)
              };
            })
            .filter((c: CountryCode) => c.dialCode)
            .sort((a, b) => {
              const nA = parseInt(a.dialCode) || 0;
              const nB = parseInt(b.dialCode) || 0;
              return nA !== nB ? nA - nB : a.name.localeCompare(b.name);
            });
          setCountryCodes(transformed);
        })
        .catch(() => {
          setCountryCodes([
            { code: 'IN', dialCode: '91', name: 'India', flag: getFlagUrl('IN') },
            { code: 'AE', dialCode: '971', name: 'United Arab Emirates', flag: getFlagUrl('AE') },
          ]);
        })
        .finally(() => setIsLoadingCountryCodes(false));
    }
  }, [isOpen]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
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
      // Reset form for new vendor
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
    }
  }, [isOpen, editingVendorId]);

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
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Vendor' : 'Create New Vendor'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update vendor details below' : 'Enter vendor details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
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
                                src={(countryCodes.find(c => c.dialCode === formData.country_code) || countryCodes.find(c => c.dialCode === '91') || countryCodes[0])?.flag || getFlagUrl('IN')}
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
                            <div className="fixed inset-0 z-40" onClick={() => setIsCountryDropdownOpen(false)} />
                            <div className={`absolute top-full left-0 mt-1 z-[60] w-72 max-h-60 overflow-y-auto ${inputBg} border ${borderClass} rounded-lg shadow-xl`}>
                              <div className="p-2">
                                {countryCodes.map((cc) => (
                                  <button
                                    key={`${cc.code}-${cc.dialCode}`}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, country_code: cc.dialCode });
                                      setIsCountryDropdownOpen(false);
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
                                ))}
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
  );
};

export default CreateVendorModal;
