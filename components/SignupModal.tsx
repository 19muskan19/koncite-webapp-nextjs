'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Mail, Lock, Phone, Building, Loader2, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, commonAPI } from '../services/api';
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
}

interface CountryFromAPI {
  id: number | string; // Backend numeric ID (required for signup validation)
  name: string;
  code?: string; // ISO code (e.g. IN, US)
  phone_code?: string; // Dial code (e.g. 91, 1)
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  country: number | string; // Country ID or ISO code
  countryCode: string; // Country code for user phone (e.g., '91', '971')
  password: string;
  confirmPassword: string;
  companyName: string;
  profileImage: File | null;
  agreedToTerms: boolean;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSignup }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [formData, setFormData] = useState<SignupData>({
    name: '',
    email: '',
    phone: '',
    country: '', // Country ID - will be set based on country selection
    countryCode: '91', // Default to India
    password: '',
    confirmPassword: '',
    companyName: '',
    profileImage: null,
    agreedToTerms: false
  });
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<CountryFromAPI[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Priority mapping for dial codes to preferred country ISO codes
  // This ensures correct country selection when multiple countries share the same dial code
  const dialCodeToCountryMapping: Record<string, string> = {
    '91': 'IN', // India (not British Indian Territory)
    '1': 'US', // United States
    '44': 'GB', // United Kingdom
    '971': 'AE', // United Arab Emirates
    '86': 'CN', // China
    '81': 'JP', // Japan
    '49': 'DE', // Germany
    '33': 'FR', // France
    '39': 'IT', // Italy
    '34': 'ES', // Spain
    '61': 'AU', // Australia
    '7': 'RU', // Russia
    '82': 'KR', // South Korea
    '65': 'SG', // Singapore
    '60': 'MY', // Malaysia
    '66': 'TH', // Thailand
  };

  // Helper function to find matching country
  const findMatchingCountry = (dialCode: string, countryCodeObj: CountryCode | undefined, countriesList: CountryFromAPI[]) => {
    if (!countryCodeObj || countriesList.length === 0) return null;
    
    const dialCodeStr = String(dialCode).replace(/^\+/, '');
    
    // First, try to find by preferred mapping (for common dial codes)
    const preferredCountryCode = dialCodeToCountryMapping[dialCodeStr];
    if (preferredCountryCode) {
      const preferredCountry = countriesList.find((country) => 
        country.code && country.code.toLowerCase() === preferredCountryCode.toLowerCase()
      );
      if (preferredCountry) {
        return preferredCountry;
      }
    }
    
    // Try matching by ISO code from countryCodeObj (most reliable)
    const matchByIso = countriesList.find((country) => {
      if (country.code && country.code.toLowerCase() === countryCodeObj.code.toLowerCase()) {
        return true;
      }
      return false;
    });
    if (matchByIso) {
      return matchByIso;
    }
    
    // Try matching by phone_code, but prefer main countries over territories
    const matchesByPhone = countriesList.filter((country) => {
      if (country.phone_code) {
        const phoneCodeStr = String(country.phone_code).replace(/^\+/, '');
        return phoneCodeStr === dialCodeStr;
      }
      return false;
    });
    
    if (matchesByPhone.length > 0) {
      // If we have a preferred mapping, use it
      if (preferredCountryCode) {
        const preferred = matchesByPhone.find(c => c.code?.toLowerCase() === preferredCountryCode.toLowerCase());
        if (preferred) return preferred;
      }
      // Otherwise, prefer countries that match the countryCodeObj name
      const nameMatch = matchesByPhone.find((country) => {
        if (country.name && countryCodeObj.name) {
          const countryName = country.name.toLowerCase().trim();
          const codeName = countryCodeObj.name.toLowerCase().trim();
          return countryName === codeName;
        }
        return false;
      });
      if (nameMatch) return nameMatch;
      
      // Filter out territories and use the first main country
      const mainCountries = matchesByPhone.filter(c => 
        !c.name.toLowerCase().includes('territory') &&
        !c.name.toLowerCase().includes('dependency') &&
        !c.name.toLowerCase().includes('island')
      );
      if (mainCountries.length > 0) {
        return mainCountries[0];
      }
      
      // Fallback to first match
      return matchesByPhone[0];
    }
    
    // Try matching by country name (case-insensitive) as final fallback
    if (countryCodeObj.name) {
      const nameMatch = countriesList.find((country) => {
        if (country.name) {
          const countryName = country.name.toLowerCase().trim();
          const codeName = countryCodeObj.name.toLowerCase().trim();
          return countryName === codeName || 
                 countryName.includes(codeName) || 
                 codeName.includes(countryName);
        }
        return false;
      });
      if (nameMatch) return nameMatch;
    }
    
    return null;
  };

  // Fetch countries on mount - using API
  useEffect(() => {
    if (isOpen && countries.length === 0 && !isLoadingCountries) {
      fetchCountries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-select country when country code is selected and countries are loaded
  useEffect(() => {
    if (formData.countryCode && countries.length > 0 && countryCodes.length > 0) {
      // Find the selected country code object
      const selectedCountryCode = countryCodes.find(c => c.dialCode === formData.countryCode);
      
      if (selectedCountryCode) {
        // Find matching country using helper function
        const matchingCountry = findMatchingCountry(formData.countryCode, selectedCountryCode, countries);
        
        // Update if we found a match and it's different from current selection
        if (matchingCountry && formData.country !== matchingCountry.id) {
          setFormData(prev => {
            console.log('Auto-selecting country via useEffect:', matchingCountry.name, 'for dial code:', formData.countryCode);
            return { ...prev, country: matchingCountry.id };
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.countryCode, countries, countryCodes]);

  // Fetch country codes from API when modal opens
  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) {
      fetchCountryCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch countries from backend API (GET /get-country) - backend expects numeric country ID for signup
  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const fetchedCountries = await commonAPI.getCountries();
      // Backend returns { id: number, name, code?, phone_code? } - id is required for signup validation
      const transformedCountries: CountryFromAPI[] = (fetchedCountries || []).map((c: any) => ({
        id: c.id, // Numeric ID - required by backend signup validation
        name: c.name || c.country_name || '',
        code: c.code || c.iso_code || c.country_code,
        phone_code: c.phone_code || c.dial_code ? String(c.phone_code || c.dial_code).replace(/^\+/, '') : undefined
      })).filter((c) => c.id != null && c.name);

      // Sort: India first if present, then alphabetically
      transformedCountries.sort((a, b) => {
        if (a.code === 'IN' || a.phone_code === '91') return -1;
        if (b.code === 'IN' || b.phone_code === '91') return 1;
        return String(a.name).localeCompare(String(b.name));
      });

      setCountries(transformedCountries);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      toast.showError('Failed to load countries. Please refresh the page.');
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchCountryCodes = async () => {
    setIsLoadingCountryCodes(true);
    try {
      // Using REST Countries API v3.1
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
      
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }

      const data = await response.json();
      
      // Transform API data to our format
      const transformedCountries: CountryCode[] = data
        .filter((country: any) => {
          // Only include countries with calling codes
          return country.idd && country.idd.root && country.cca2;
        })
        .map((country: any) => {
          // Extract dial code (remove + and root)
          const root = country.idd.root || '';
          const suffixes = country.idd.suffixes || [''];
          // Use first suffix if available, otherwise just root
          const dialCode = suffixes.length > 0 && suffixes[0] 
            ? `${root}${suffixes[0]}`.replace(/\+/g, '')
            : root.replace(/\+/g, '');
          
          return {
            code: country.cca2, // ISO 3166-1 alpha-2 code
            dialCode: dialCode || '',
            name: country.name.common || country.name.official,
            flag: country.flags?.png || getFlagUrl(country.cca2)
          };
        })
        .filter((country: CountryCode) => country.dialCode) // Remove entries without dial codes
        .sort((a: CountryCode, b: CountryCode) => {
          // Sort by dial code (as number) then by name
          const dialA = parseInt(a.dialCode) || 0;
          const dialB = parseInt(b.dialCode) || 0;
          if (dialA !== dialB) {
            return dialA - dialB;
          }
          return a.name.localeCompare(b.name);
        });

      setCountryCodes(transformedCountries);
    } catch (error) {
      console.error('Error fetching country codes:', error);
      // Fallback to a few common countries
      setCountryCodes([
        { code: 'IN', dialCode: '91', name: 'India', flag: getFlagUrl('IN') },
        { code: 'US', dialCode: '1', name: 'United States', flag: getFlagUrl('US') },
        { code: 'GB', dialCode: '44', name: 'United Kingdom', flag: getFlagUrl('GB') },
        { code: 'AE', dialCode: '971', name: 'United Arab Emirates', flag: getFlagUrl('AE') },
      ]);
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
      newErrors.countryCode = 'Country code is required';
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
      newErrors.countryCode = 'Country code is required';
    }

    if (!formData.country) {
      newErrors.country = 'Please select a country';
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
      formDataToSend.append('country', String(formData.country)); // Country ID (integer)
      formDataToSend.append('country_code', formData.countryCode);
      
      // Required company fields
      formDataToSend.append('company_name', formData.companyName.trim());
      
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
      
      // Call the onSignup callback if provided
      if (onSignup) {
        onSignup(formData);
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        country: '',
        countryCode: '91',
        password: '',
        confirmPassword: '',
        companyName: '',
        profileImage: null,
        agreedToTerms: false
      });
      setErrors({});
      
      // Close modal and trigger OTP verification modal
      onClose();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openOtpModal', { detail: { email: formData.email } }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 md:p-8 relative border ${borderClass} my-8 max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors z-10`}
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <UserPlus className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>Create Account</h2>
          <p className={`text-sm ${textSecondary}`}>Sign up to get started with Koncite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.name ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your full name"
                required
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{typeof errors.name === 'string' ? errors.name : 'Invalid name'}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your email"
                required
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{typeof errors.email === 'string' ? errors.email : 'Invalid email'}</p>}
          </div>

          {/* Phone with Country Code */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {/* Country Code Selector */}
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
                      className={`flex items-center gap-2 px-3 py-3 border ${errors.countryCode ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none min-w-[120px] hover:bg-opacity-80 transition-colors`}
                    >
                      {countryCodes.length > 0 ? (
                        <>
                          <img 
                            src={(countryCodes.find(c => c.dialCode === formData.countryCode) || countryCodes.find(c => c.dialCode === '91') || countryCodes[0])?.flag || getFlagUrl('IN')} 
                            alt="Flag"
                            className="w-5 h-4 object-cover rounded border border-slate-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getFlagUrl((countryCodes.find(c => c.dialCode === formData.countryCode) || countryCodes.find(c => c.dialCode === '91') || countryCodes[0])?.code || 'IN');
                            }}
                          />
                          <span className="text-sm font-medium">+{formData.countryCode}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium">+91</span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isCountryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsCountryDropdownOpen(false)}
                        />
                        <div className={`absolute top-full left-0 mt-1 z-[60] w-64 max-h-60 overflow-y-auto ${inputBg} border ${borderClass} rounded-lg shadow-xl`}>
                          {countryCodes.length > 0 ? (
                            <div className="p-2">
                              {countryCodes.map((countryCode) => (
                                <button
                                  key={`${countryCode.code}-${countryCode.dialCode}`}
                                  type="button"
                                  onClick={() => {
                                    // Find matching country using helper function
                                    const matchingCountry = findMatchingCountry(countryCode.dialCode, countryCode, countries);
                                    
                                    // Update form data with country code and matching country
                                    setFormData(prev => {
                                      const updated = {
                                        ...prev,
                                        countryCode: countryCode.dialCode
                                      };
                                      
                                      // Auto-select matching country if found
                                      if (matchingCountry) {
                                        updated.country = matchingCountry.id; // Using ISO code as ID
                                        console.log('Auto-selected country:', matchingCountry.name, 'for dial code:', countryCode.dialCode);
                                      } else {
                                        console.warn('No matching country found for dial code:', countryCode.dialCode, 'Country name:', countryCode.name);
                                        // Clear country selection if no match found
                                        updated.country = '';
                                      }
                                      
                                      return updated;
                                    });
                                    
                                    setIsCountryDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-opacity-80 transition-colors ${
                                    formData.countryCode === countryCode.dialCode 
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
                              ))}
                            </div>
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
                  className={`w-full pl-10 pr-4 py-3 border ${errors.phone ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{typeof errors.phone === 'string' ? errors.phone : 'Invalid phone'}</p>}
            {errors.countryCode && <p className="text-red-500 text-xs mt-1">{typeof errors.countryCode === 'string' ? errors.countryCode : 'Invalid country code'}</p>}
          </div>

          {/* Country Dropdown */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select
                name="country"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                disabled={isLoadingCountries}
                className={`w-full pl-10 pr-4 py-3 border ${errors.country ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                required
              >
                <option value="">{isLoadingCountries ? 'Loading countries...' : 'Select a country'}</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.country && <p className="text-red-500 text-xs mt-1">{typeof errors.country === 'string' ? errors.country : 'Please select a country'}</p>}
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.password ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Create a password"
                required
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{typeof errors.password === 'string' ? errors.password : 'Invalid password'}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.confirmPassword ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Confirm your password"
                required
              />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{typeof errors.confirmPassword === 'string' ? errors.confirmPassword : 'Passwords do not match'}</p>}
          </div>

          {/* Company Name */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.companyName ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your company name"
                required
              />
            </div>
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{typeof errors.companyName === 'string' ? errors.companyName : 'Invalid company name'}</p>}
          </div>

          {/* Profile Image */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Profile Image (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                name="profileImage"
                accept="image/*"
                onChange={handleFileChange}
                className={`w-full px-4 py-3 border ${errors.profileImage ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#C2D642] file:text-white hover:file:bg-[#A8B838] cursor-pointer`}
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
            className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mt-6"
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

        <div className={`mt-6 pt-6 border-t ${borderClass}`}>
          <p className={`text-sm text-center ${textSecondary}`}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onClose}
              className="text-[#C2D642] hover:underline font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;
