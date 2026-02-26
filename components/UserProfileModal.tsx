'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, User, Mail, Phone, Building, Loader2, ChevronDown, Search, Shield } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { userAPI, commonAPI } from '@/services/api';
import { sortCountryCodes, findCountryByDialCode } from '@/utils/countryCodeUtils';

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

const getFlagUrl = (countryCode: string) => {
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
};

interface CountryFromAPI {
  id: number | string;
  name: string;
  code?: string;
  phone_code?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  country: string; // Backend country ID - set from country code selection
  countryCode: string;
  countryCodeIso?: string; // e.g. US, CA - distinguishes US/Canada when both use +1
  profileImage: File | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const { user, refreshUser } = useUser();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    country: '',
    countryCode: '',
    profileImage: null,
  });
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<CountryFromAPI[]>([]);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorUpdating, setTwoFactorUpdating] = useState(false);
  const skipNext2FASyncRef = useRef(false);

  useEffect(() => {
    if (isOpen && countries.length === 0 && !isLoadingCountries) fetchCountries();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) fetchCountryCodes();
  }, [isOpen]);

  /** Extract country ID from user (backend stores ID) */
  const getCountryIdFromUser = (u: typeof user): string => {
    if (!u) return '';
    if (u.country_id != null && u.country_id !== '') return String(u.country_id);
    if (typeof u.country === 'string' && u.country) return u.country;
    const c = u.country as { id?: number | string; code?: string } | undefined;
    if (c?.id != null) return String(c.id);
    return '';
  };

  /** Normalize country_code from user (handles +91, 91, etc.) */
  const normalizeCountryCode = (val: unknown): string => {
    if (val == null || val === '') return '';
    const s = String(val).replace(/^\+/, '').replace(/\s/g, '').trim();
    return s || '';
  };

  /** Get country code from user - prefers country_code, falls back to country.phonecode */
  const getCountryCodeFromUser = (u: typeof user): string => {
    if (!u) return '';
    const fromTop = normalizeCountryCode(u.country_code);
    if (fromTop) return fromTop;
    const c = u.country as { phonecode?: string; phone_code?: string } | undefined;
    return normalizeCountryCode(c?.phonecode ?? c?.phone_code ?? '');
  };

  useEffect(() => {
    if (isOpen && user) {
      const countryCode = getCountryCodeFromUser(user);
      const countryId = getCountryIdFromUser(user);
      const c = user.country as { code?: string } | undefined;
      const countryCodeIso = c?.code || undefined;
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: countryId,
        countryCode,
        countryCodeIso,
        profileImage: null,
      });
      setErrors({});
    }
  }, [isOpen, user]);

  // When user has country_id but no country_code, derive country_code from countries list
  useEffect(() => {
    if (!isOpen || !user) return;
    const countryId = getCountryIdFromUser(user);
    const hasCountryId = countryId !== '';
    const hasCountryCode = getCountryCodeFromUser(user) !== '';
    if (hasCountryId && !hasCountryCode && countries.length > 0) {
      const match = countries.find((c) => String(c.id) === countryId);
      const phoneCode = match ? String(match.phone_code || '').replace(/^\+/, '') : '';
      const countryCodeIso = match?.code || undefined;
      if (phoneCode) {
        setFormData((prev) => prev.countryCode ? prev : { ...prev, countryCode: phoneCode, countryCodeIso });
      }
    }
  }, [isOpen, user, countries]);

  useEffect(() => {
    if (skipNext2FASyncRef.current) {
      skipNext2FASyncRef.current = false;
      return;
    }
    const fromUser = (user?.two_factor_status ?? 'off').toString().toLowerCase() === 'on';
    setTwoFactorEnabled(fromUser);
  }, [user?.two_factor_status, isOpen]);

  const findBackendCountry = (countryCodeObj: CountryCode | undefined): CountryFromAPI | null => {
    if (!countryCodeObj || countries.length === 0) return null;
    const dialCodeStr = String(countryCodeObj.dialCode).replace(/^\+/, '');
    const matchByIso = countries.find((c) => c.code?.toLowerCase() === countryCodeObj.code.toLowerCase());
    if (matchByIso) return matchByIso;
    const matchByPhone = countries.find((c) => {
      const pc = String(c.phone_code || '').replace(/^\+/, '');
      return pc === dialCodeStr;
    });
    if (matchByPhone) return matchByPhone;
    const nameLower = (countryCodeObj.name || '').toLowerCase().trim();
    const matchByName = countries.find((c) => {
      const cName = (c.name || '').toLowerCase().trim();
      return cName === nameLower || cName.includes(nameLower) || nameLower.includes(cName);
    });
    return matchByName || null;
  };

  // Sync country (backend ID) from country code when both lists are loaded
  useEffect(() => {
    if (formData.countryCode && countryCodes.length > 0 && countries.length > 0) {
      const selected = findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso);
      const backendCountry = findBackendCountry(selected);
      if (backendCountry) {
        setFormData((prev) => ({
          ...prev,
          country: String(backendCountry.id),
        }));
      }
    }
  }, [formData.countryCode, countryCodes, countries]);

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const fetched = await commonAPI.getCountries();
      const transformed: CountryFromAPI[] = (fetched || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.country_name || '',
        code: c.code || c.iso_code || c.country_code,
        phone_code: c.phone_code || c.dial_code ? String(c.phone_code || c.dial_code).replace(/^\+/, '') : undefined,
      })).filter((c) => c.id != null && c.name);
      transformed.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setCountries(transformed);
    } catch {
      toast.showError('Failed to load countries.');
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const parseDialCode = (c: any): string => {
    const root = (c.idd?.root || '').replace(/\+/g, '');
    const suffixes = c.idd?.suffixes || [];
    const first = suffixes[0];
    // US/Canada: +1 only
    if (root === '1' || (c.cca2 === 'US' || c.cca2 === 'CA')) return '1';
    // Russia, Kazakhstan etc: +7 only (suffixes like 6,7 are area codes, not dial code)
    if (root === '7') return '7';
    // Suffixes 3+ chars = area codes (e.g. US 201), use root only
    if (first && String(first).length >= 3) return root;
    if (first) return root + String(first);
    return root;
  };

  const fetchCountryCodes = async () => {
    setIsLoadingCountryCodes(true);
    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
      const data = await res.json();
      const fromApi: CountryCode[] = data
        .filter((c: any) => c.idd?.root && c.cca2)
        .map((c: any) => ({
          code: c.cca2,
          dialCode: parseDialCode(c),
          name: c.name?.common || '',
          flag: c.flags?.png || getFlagUrl(c.cca2),
        }))
        .filter((c: CountryCode) => c.dialCode);
      const byCode = new Map<string, CountryCode>();
      fromApi.forEach((c) => byCode.set(c.code, c));
      setCountryCodes(sortCountryCodes(Array.from(byCode.values())));
    } catch {
      setCountryCodes([]);
    } finally {
      setIsLoadingCountryCodes(false);
    }
  };

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 15) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
    if (errors[name as keyof ProfileFormData]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof ProfileFormData];
        return next;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, profileImage: e.target.files?.[0] || null }));
    if (errors.profileImage) setErrors((prev) => ({ ...prev, profileImage: undefined }));
  };

  const handleTwoFactorToggle = async () => {
    if (twoFactorUpdating) return;
    const newStatus = twoFactorEnabled ? 'off' : 'on';
    setTwoFactorEnabled(!twoFactorEnabled);
    setTwoFactorUpdating(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        country_code: formData.countryCode,
        phone: formData.phone.trim(),
        country: formData.country,
        two_factor_status: newStatus,
      };
      await userAPI.updateProfile(payload);
      toast.showSuccess(newStatus === 'on' ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
      skipNext2FASyncRef.current = true;
      await refreshUser();
    } catch (err: any) {
      setTwoFactorEnabled(twoFactorEnabled);
      toast.showError(err.message || 'Failed to update two-factor authentication');
    } finally {
      setTwoFactorUpdating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.countryCode.trim()) newErrors.countryCode = 'Please select a country code';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d+$/.test(formData.phone)) newErrors.phone = 'Phone must contain only numbers';
    else if (formData.phone.length < 10 || formData.phone.length > 15) newErrors.phone = 'Phone must be 10–15 digits';
    if (!formData.country) newErrors.country = 'Select a country code in the phone number field';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        country: formData.country,
        country_code: formData.countryCode,
        two_factor_status: twoFactorEnabled ? 'on' : 'off',
      };

      let formDataToSend: FormData | Record<string, any> = payload;
      if (formData.profileImage) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('profile_image', formData.profileImage);
        formDataToSend = fd;
      }

      await userAPI.updateProfile(formDataToSend);
      toast.showSuccess('Profile updated successfully');
      await refreshUser();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to update profile';
      toast.showError(msg);
      if (err.errors && typeof err.errors === 'object') {
        const apiErrors: Partial<ProfileFormData> = {};
        const map: Record<string, keyof ProfileFormData> = {
          name: 'name', email: 'email', phone: 'phone', country: 'country',
          country_code: 'countryCode',
        };
        Object.keys(err.errors).forEach((key) => {
          const field = map[key];
          if (field && err.errors[key]?.[0]) apiErrors[field] = err.errors[key][0];
        });
        setErrors(apiErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-[min(92vw,1024px)] mx-4 relative border ${borderClass} my-8 max-h-[90vh] overflow-hidden flex flex-col`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 z-10 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-8 pr-14">

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <User className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>User Profile</h2>
          <p className={`text-sm ${textSecondary}`}>Update your profile information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.name ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Phone Number <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <div className="relative">
                {isLoadingCountryCodes ? (
                  <div className={`w-32 px-3 py-3 border ${borderClass} rounded-lg ${inputBg} flex items-center justify-center`}>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className={`flex items-center gap-2 px-3 py-3 border ${errors.countryCode ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} min-w-[120px] hover:bg-opacity-80`}
                    >
                      {formData.countryCode ? (
                        (() => {
                          const sel = findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso);
                          return sel ? (
                            <>
                              <img src={sel.flag || getFlagUrl(sel.code)} alt="" className="w-5 h-4 object-cover rounded border" />
                              <span className="text-sm font-medium">+{sel.dialCode}</span>
                            </>
                          ) : (
                            <span className="text-sm font-medium">+{formData.countryCode}</span>
                          );
                        })()
                      ) : (
                        <span className={`text-sm ${textSecondary}`}>Select code</span>
                      )}
                      <ChevronDown className={`w-4 h-4 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCountryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }} />
                        <div className={`absolute top-full left-0 mt-1 z-[60] w-72 max-h-72 overflow-hidden ${inputBg} border ${borderClass} rounded-lg shadow-xl flex flex-col`}>
                          <div className="p-2 border-b border-inherit">
                            <div className="relative">
                              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                              <input
                                type="text"
                                value={countrySearchQuery}
                                onChange={(e) => setCountrySearchQuery(e.target.value)}
                                placeholder="Search..."
                                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${borderClass} ${inputBg} ${textPrimary}`}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-52 p-2">
                            {countryCodes
                              .filter((cc) => {
                                const q = countrySearchQuery.trim().toLowerCase();
                                if (!q) return true;
                                return cc.name.toLowerCase().includes(q) || cc.code.toLowerCase().includes(q) || cc.dialCode.includes(q);
                              })
                              .map((cc) => (
                                <button
                                  key={`${cc.code}-${cc.dialCode}`}
                                  type="button"
                                  onClick={() => {
                                    const backendCountry = findBackendCountry(cc);
                                    setFormData((prev) => ({
                                      ...prev,
                                      countryCode: cc.dialCode,
                                      countryCodeIso: cc.code,
                                      country: backendCountry ? String(backendCountry.id) : prev.country,
                                    }));
                                    setIsCountryDropdownOpen(false);
                                    setCountrySearchQuery('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${
                                    (formData.countryCodeIso ? formData.countryCodeIso === cc.code : formData.countryCode === cc.dialCode)
                                      ? (isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10')
                                      : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <img src={cc.flag || getFlagUrl(cc.code)} alt="" className="w-6 h-4 object-cover rounded" />
                                  <span className={`flex-1 text-sm ${textPrimary}`}>{cc.name}</span>
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
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={15}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.phone ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] outline-none`}
                  placeholder="Phone number"
                />
              </div>
            </div>
            {(errors.phone || errors.countryCode) && <p className="text-red-500 text-xs mt-1">{errors.phone || errors.countryCode}</p>}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Country <span className="text-red-500">*</span></label>
            <p className={`text-xs mb-2 ${textSecondary}`}>Auto-filled from phone country code</p>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <div
                className={`w-full pl-10 pr-4 py-3 border ${errors.country ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} min-h-[46px] flex items-center`}
              >
                {formData.countryCode && countryCodes.length > 0
                  ? (findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso)?.name || (formData.country && countries.length > 0 ? countries.find((c) => String(c.id) === formData.country)?.name : null) || 'Select a country code above')
                  : formData.country && countries.length > 0
                    ? (countries.find((c) => String(c.id) === formData.country)?.name || 'Select a country code in phone number above')
                    : 'Select a country code in phone number above'}
              </div>
            </div>
            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Profile Image (Optional)</label>
            <p className={`text-xs mb-2 ${textSecondary}`}>JPEG, PNG, JPG or GIF. Max 2MB</p>
            <input
              type="file"
              name="profile_image"
              accept="image/jpeg,image/png,image/jpg,image/gif"
              onChange={handleFileChange}
              className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#C2D642] file:text-white hover:file:bg-[#A8B838] cursor-pointer`}
            />
            {formData.profileImage && <p className="text-xs text-green-500 mt-1">Selected: {formData.profileImage.name}</p>}
          </div>

          {/* Two-factor authentication toggle */}
          <div className={`rounded-lg border p-4 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${textSecondary}`} />
                <div>
                  <span className={`text-sm font-semibold ${textPrimary}`}>Two-factor authentication</span>
                  <p className={`text-xs mt-0.5 ${textSecondary}`}>
                    {twoFactorEnabled ? 'OTP required when signing in' : 'Require OTP when signing in'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTwoFactorToggle}
                disabled={twoFactorUpdating}
                role="switch"
                aria-checked={twoFactorEnabled}
                className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 disabled:opacity-50 flex-shrink-0 ${
                  twoFactorEnabled ? 'bg-[#C2D642]' : isDark ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1.5 left-1.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
                {twoFactorUpdating && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  </span>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <User className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
