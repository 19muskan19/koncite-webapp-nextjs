'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, UserPlus, Mail, Lock, Phone, Building, Loader2, ChevronDown, Search, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, commonAPI } from '../services/api';
import { sortCountryCodes, findCountryByDialCode } from '../utils/countryCodeUtils';
import TermsAndPrivacyModal from './TermsAndPrivacyModal';

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

// Helper function to get flag image URL
const getFlagUrl = (countryCode: string) => {
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
};

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup?: (data: SignupData) => void;
  loginHref?: string;
}

interface CountryFromAPI {
  id: number | string;
  name: string;
  code?: string;
  phone_code?: string;
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  country: string; // Backend country ID - set from country code selection
  countryCode: string; // Country code for user phone (e.g., '91', '971')
  countryCodeIso?: string; // US, CA - distinguishes when both use +1
  password: string;
  confirmPassword: string;
  companyName: string;
  profileImage: File | null;
  agreedToTerms: boolean;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSignup, loginHref }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [formData, setFormData] = useState<SignupData>({
    name: '',
    email: '',
    phone: '',
    country: '', // Backend country ID - set from country code selection
    countryCode: '', // Select or search to choose
    password: '',
    confirmPassword: '',
    companyName: '',
    profileImage: null,
    agreedToTerms: false
  });
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [countries, setCountries] = useState<CountryFromAPI[]>([]);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Find matching country from get-country by RestCountries selection
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

  // Update country (backend ID) when country code selection changes
  useEffect(() => {
    if (formData.countryCode && countryCodes.length > 0 && countries.length > 0) {
      const selected = findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso);
      const backendCountry = findBackendCountry(selected);
      setFormData((prev) => ({
        ...prev,
        country: backendCountry ? String(backendCountry.id) : '',
      }));
    }
  }, [formData.countryCode, countryCodes, countries]);

  // Fetch countries from get-country API (backend requires country ID)
  useEffect(() => {
    if (isOpen && countries.length === 0 && !isLoadingCountries) {
      fetchCountries();
    }
  }, [isOpen]);

  // Fetch country codes from RestCountries API when modal opens
  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) {
      fetchCountryCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    } catch (error) {
      toast.showError('Failed to load countries. Please refresh the page.');
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const parseDialCode = (c: any): string => {
    const root = (c.idd?.root || '').replace(/\+/g, '');
    const suffixes = c.idd?.suffixes || [];
    const first = suffixes[0];
    if (root === '1' || (c.cca2 === 'US' || c.cca2 === 'CA')) return '1';
    if (root === '7') return '7'; // Russia, Kazakhstan - suffixes are area codes
    if (first && String(first).length >= 3) return root;
    if (first) return root + String(first);
    return root;
  };

  const fetchCountryCodes = async () => {
    setIsLoadingCountryCodes(true);
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();

      const fromApi: CountryCode[] = data
        .filter((c: any) => c.idd?.root && c.cca2)
        .map((c: any) => {
          const dialCode = parseDialCode(c);
          return {
            code: c.cca2,
            dialCode,
            name: c.name?.common || c.name?.official || '',
            flag: c.flags?.png || getFlagUrl(c.cca2),
          };
        })
        .filter((c: CountryCode) => c.dialCode);

      const byCode = new Map<string, CountryCode>();
      fromApi.forEach((c) => byCode.set(c.code, c));
      setCountryCodes(sortCountryCodes(Array.from(byCode.values())));
    } catch (error) {
      console.error('Error fetching country codes:', error);
      setCountryCodes([]);
    } finally {
      setIsLoadingCountryCodes(false);
    }
  };


  // Early return AFTER all hooks
  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Phone number validation - only allow numbers
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10); // Remove all non-digit characters and limit to 10
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear error for this field
    if (errors[name as keyof SignupData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof SignupData];
        return newErrors;
      });
    }
    
    // Real-time password match validation
    if (name === 'password' || name === 'confirmPassword') {
      if (name === 'password' && formData.confirmPassword) {
        if (value !== formData.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: 'Passwords do not match'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.confirmPassword;
            return newErrors;
          });
        }
      }
      if (name === 'confirmPassword' && formData.password) {
        if (value !== formData.password) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: 'Passwords do not match'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.confirmPassword;
            return newErrors;
          });
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      profileImage: file
    }));
    
    // Clear error for this field
    if (errors.profileImage) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profileImage;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.countryCode.trim()) {
      newErrors.countryCode = 'Please select a country code';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must contain only numbers';
    } else if (formData.phone.length < 10 || formData.phone.length > 15) {
      newErrors.phone = 'Phone number must be between 10 and 15 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }



    if (!formData.countryCode.trim()) {
      newErrors.countryCode = 'Please select a country code';
    }

    if (!formData.country) {
      newErrors.country = formData.countryCode
        ? 'Selected country is not available. Please choose a different country.'
        : 'Select a country code in the phone number field';
    }

    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Double-check passwords match before sending
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      setIsSubmitting(false);
      toast.showError('Passwords do not match. Please check and try again.');
      return;
    }

    try {
      // Prepare FormData for Laravel API
      const formDataToSend = new FormData();
      
      // Required user fields
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim().toLowerCase());
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.confirmPassword);
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('country', formData.country); // Backend country ID (required)
      formDataToSend.append('country_code', formData.countryCode);
      
      // Required company fields
      formDataToSend.append('company_name', formData.companyName.trim());
      
      // Signup user gets Super Admin role by default (id: 1 = Super Admin per UserRolesPermissions)
      formDataToSend.append('company_user_role', '1');
      formDataToSend.append('designation', 'Super Admin');
      
      // Optional fields
      if (formData.profileImage) {
        formDataToSend.append('profile_images', formData.profileImage);
      }

      // Log the data being sent (for debugging)
      console.log('=== SIGNUP MODAL DEBUG ===');
      console.log('Form data before sending:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        companyName: formData.companyName,
        password: '***hidden***',
        confirmPassword: '***hidden***'
      });
      console.log('FormData entries:');
      for (const [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}:`, value);
      }
      console.log('==========================');

      // Call Laravel API
      const response = await authAPI.signup(formDataToSend);

      // Verify response
      console.log('=== SIGNUP RESPONSE ===');
      console.log('Full Response:', JSON.stringify(response, null, 2));
      console.log('Response message:', response.message);
      console.log('User from response.user:', response.user);
      console.log('======================');

      // Check if signup was successful
      // Check for success indicators: has message (user data is optional)
      const hasMessage = !!response.message;
      const hasUserData = !!response.user;
      
      // Signup is successful if we have a success message
      // User data is optional - some APIs don't return user data immediately after signup
      const signupSuccess = hasMessage;
      
      if (signupSuccess) {
        const userData = response.user;
        
        if (userData) {
          console.log('Signup: User data found:', userData);
          // If user data is returned, dispatch event (though user still needs OTP verification)
          if (typeof window !== 'undefined') {
            console.log('Signup: Dispatching userCreated event with user:', userData);
            window.dispatchEvent(new CustomEvent('userCreated', { detail: { user: userData } }));
          }
        } else {
          console.log('Signup: No user data returned (this is normal if backend sends OTP first)');
        }
        
        toast.showSuccess(response.message || 'Account created successfully! Please verify your email with OTP.');
      } else {
        console.error('Signup: Response indicates failure');
        console.error('Response structure:', response);
        const errorMessage = response.message || 'Signup failed. Please try again.';
        toast.showError(errorMessage);
        return; // Don't proceed if signup failed
      }
      
      // Store email for OTP verification
      localStorage.setItem('pendingVerificationEmail', formData.email);

      if (onSignup) {
        // Parent handles navigation (e.g. to /verify-otp) - don't close or open modal
        onSignup(formData);
      } else {
        // Modal flow: close and open OTP verification modal
        setFormData({
          name: '',
          email: '',
          phone: '',
          country: '',
          countryCode: '',
          password: '',
          confirmPassword: '',
          companyName: '',
          profileImage: null,
          agreedToTerms: false
        });
        setErrors({});
        onClose();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openOtpModal', { detail: { email: formData.email } }));
        }
      }
    } catch (error: any) {
      // Log full error for debugging
      console.error('Signup Error:', error);

      // Handle API errors
      if (error.errors && Object.keys(error.errors).length > 0) {
        // Laravel validation errors (422)
        const apiErrors: Partial<SignupData> = {};
        
        // Map Laravel field names to form field names
        Object.keys(error.errors).forEach((key) => {
          const fieldMap: Record<string, keyof SignupData> = {
            name: 'name',
            email: 'email',
            phone: 'phone',
            password: 'password',
            company_name: 'companyName',
            country: 'country',
          };
          
          const formField = fieldMap[key] || key as keyof SignupData;
          if (error.errors[key] && Array.isArray(error.errors[key]) && error.errors[key].length > 0) {
            // Laravel returns errors as arrays
            apiErrors[formField] = error.errors[key][0] as any;
          } else if (typeof error.errors[key] === 'string') {
            // Sometimes errors might be strings
            apiErrors[formField] = error.errors[key] as any;
          }
        });
        
        setErrors(apiErrors);
        
        // Show a general error message plus specific field errors
        const errorMessage = error.message || 'Please fix the errors in the form';
        toast.showError(errorMessage);
        
        // Log validation errors for debugging
        console.error('Validation Errors:', apiErrors);
      } else {
        // Network or other errors
        const errorMessage = error.message || 'Signup failed. Please try again.';
        toast.showError(errorMessage);
        
        // If it's a 404, show additional help
        if (error.status === 404 || errorMessage.includes('not found') || errorMessage.includes('endpoint')) {
          console.error('API Endpoint Error:', errorMessage);
          console.error('Please check LARAVEL_ENDPOINTS_GUIDE.md for help');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-[min(95vw,440px)] sm:max-w-[min(92vw,480px)] md:max-w-[480px] mx-auto relative border ${borderClass} my-4 sm:my-6 md:my-8 max-h-[90vh] overflow-hidden flex flex-col`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 z-10 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5 md:p-6 pr-12 sm:pr-14">

        <div className="text-center mb-4 sm:mb-6">
          <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-3 sm:mb-4`}>
            <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-black ${textPrimary} mb-1 sm:mb-2`}>Create Account</h2>
          <p className={`text-xs sm:text-sm ${textSecondary}`}>Sign up to get started with Koncite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Name */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${errors.name ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your full name"
                required
                autoComplete="off"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{typeof errors.name === 'string' ? errors.name : 'Invalid name'}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${errors.email ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your email"
                required
                autoComplete="off"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{typeof errors.email === 'string' ? errors.email : 'Invalid email'}</p>}
          </div>

          {/* Phone with Country Code */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {/* Country Code Selector */}
              <div className="relative flex-shrink-0">
                {isLoadingCountryCodes ? (
                  <div className={`w-24 sm:w-28 md:w-32 px-2 sm:px-3 py-2.5 sm:py-3 border ${borderClass} rounded-lg ${inputBg} flex items-center justify-center`}>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-3 border ${errors.countryCode ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none min-w-[100px] sm:min-w-[110px] md:min-w-[120px] hover:bg-opacity-80 transition-colors`}
                    >
                      {formData.countryCode && countryCodes.length > 0 ? (
                        (() => {
                          const sel = findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso);
                          return sel ? (
                            <>
                              <img
                                src={sel.flag || getFlagUrl(sel.code)}
                                alt=""
                                className="w-5 h-4 object-cover rounded border border-slate-300"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getFlagUrl(sel.code);
                                }}
                              />
                              <span className="text-sm font-medium">+{sel.dialCode}</span>
                            </>
                          ) : (
                            <span className={`text-sm ${textSecondary}`}>Select code</span>
                          );
                        })()
                      ) : (
                        <span className={`text-sm ${textSecondary}`}>Select code</span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isCountryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => { setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }}
                        />
                        <div className={`absolute top-full left-0 mt-1 z-[60] w-[min(90vw,288px)] max-h-72 overflow-hidden ${isDark ? 'bg-dropdown-panel' : inputBg} border ${borderClass} rounded-lg shadow-xl flex flex-col`}>
                          {countryCodes.length > 0 ? (
                            <>
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
                                    autoComplete="off"
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
                                  return filtered.map((countryCode) => (
                                <button
                                  key={`${countryCode.code}-${countryCode.dialCode}`}
                                  type="button"
                                  onClick={() => {
                                    const backendCountry = findBackendCountry(countryCode);
                                    setFormData((prev) => ({
                                      ...prev,
                                      countryCode: countryCode.dialCode,
                                      countryCodeIso: countryCode.code,
                                      country: backendCountry ? String(backendCountry.id) : '',
                                    }));
                                    setIsCountryDropdownOpen(false);
                                    setCountrySearchQuery('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-opacity-80 transition-colors ${
                                    (formData.countryCodeIso ? formData.countryCodeIso === countryCode.code : formData.countryCode === countryCode.dialCode)
                                      ? isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
                                      : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <img 
                                    src={countryCode.flag || getFlagUrl(countryCode.code)} 
                                    alt={countryCode.name}
                                    className="w-6 h-4 object-cover rounded border border-slate-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = getFlagUrl(countryCode.code);
                                    }}
                                  />
                                  <span className={`flex-1 text-left text-sm ${textPrimary}`}>{countryCode.name}</span>
                                  <span className={`text-sm ${textSecondary}`}>+{countryCode.dialCode}</span>
                                </button>
                                  ));
                                })()}
                              </div>
                            </>
                          ) : (
                            <div className="p-4">
                              <p className={`text-sm ${textSecondary}`}>Loading countries...</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              
              {/* Phone Number Input */}
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow numbers and limit to 10 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({
                      ...formData,
                      phone: value
                    });
                  }}
                  onKeyPress={(e) => {
                    // Only allow numbers
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                      e.preventDefault();
                    }
                  }}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={10}
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${errors.phone ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Enter phone number"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{typeof errors.phone === 'string' ? errors.phone : 'Invalid phone'}</p>}
            {errors.countryCode && <p className="text-red-500 text-xs mt-1">{typeof errors.countryCode === 'string' ? errors.countryCode : 'Invalid country code'}</p>}
          </div>

          {/* Country - auto-filled from phone country code */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Country <span className="text-red-500">*</span>
            </label>
            <p className={`text-xs mb-2 ${textSecondary}`}>Auto-filled from phone country code</p>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <div
                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${errors.country ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} min-h-[42px] sm:min-h-[46px] flex items-center text-sm`}
              >
                {formData.countryCode && countryCodes.length > 0
                  ? (findCountryByDialCode(countryCodes, formData.countryCode, formData.countryCodeIso)?.name || 'Select a country code above')
                  : 'Select a country code in phone number above'}
              </div>
            </div>
            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
          </div>

          {/* Password */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-9 sm:pl-10 pr-12 py-2.5 sm:py-3 border ${errors.password ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Create a password"
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{typeof errors.password === 'string' ? errors.password : 'Invalid password'}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full pl-9 sm:pl-10 pr-12 py-2.5 sm:py-3 border ${errors.confirmPassword ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Confirm your password"
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{typeof errors.confirmPassword === 'string' ? errors.confirmPassword : 'Passwords do not match'}</p>}
          </div>

          {/* Company Name */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${errors.companyName ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your company name"
                required
                autoComplete="off"
              />
            </div>
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{typeof errors.companyName === 'string' ? errors.companyName : 'Invalid company name'}</p>}
          </div>

          {/* Profile Image */}
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${textPrimary}`}>
              Profile Image (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                name="profileImage"
                accept="image/*"
                onChange={handleFileChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${errors.profileImage ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#C2D642] file:text-white hover:file:bg-[#A8B838] cursor-pointer text-sm`}
                autoComplete="off"
              />
            </div>
            {formData.profileImage && (
              <p className="text-xs text-green-500 mt-1">Selected: {formData.profileImage.name}</p>
            )}
            {errors.profileImage && <p className="text-red-500 text-xs mt-1">{typeof errors.profileImage === 'string' ? errors.profileImage : 'Invalid file'}</p>}
          </div>


          {/* Terms and Conditions Checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={handleInputChange}
                className={`mt-1 w-4 h-4 text-[#C2D642] rounded focus:ring-[#C2D642] ${errors.agreedToTerms ? 'border-red-500' : ''}`}
              />
              <span className={`text-sm ${textSecondary}`}>
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className="text-[#C2D642] hover:underline font-semibold"
                >
                  Terms & Conditions and Privacy Policy
                </button>
                <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.agreedToTerms && <p className="text-red-500 text-xs mt-1 ml-7">You must agree to the terms</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 sm:py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-sm sm:text-base font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mt-4 sm:mt-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
              </>
            )}
          </button>
        </form>

        {/* Terms and Privacy Modal */}
        <TermsAndPrivacyModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />

        <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${borderClass}`}>
          <p className={`text-xs sm:text-sm text-center ${textSecondary}`}>
            Already have an account?{' '}
            {loginHref ? (
              <Link href={loginHref} className="text-[#C2D642] hover:underline font-semibold">
                Sign In
              </Link>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-[#C2D642] hover:underline font-semibold"
              >
                Sign In
              </button>
            )}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;
