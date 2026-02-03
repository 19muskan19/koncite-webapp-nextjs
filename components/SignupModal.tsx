'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Mail, Lock, Phone, Building, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, commonAPI, Country } from '../services/api';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup?: (data: SignupData) => void;
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  country: number | string; // Country ID
  countryCode: string; // Country code for user phone (e.g., '91', '971')
  password: string;
  confirmPassword: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyCountryCode: string; // Country code for company phone
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
    companyAddress: '',
    companyPhone: '',
    companyCountryCode: '91', // Default to India
    profileImage: null,
    agreedToTerms: false
  });
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    if (isOpen && countries.length === 0 && !isLoadingCountries) {
      fetchCountries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch countries from API
  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const fetchedCountries = await commonAPI.getCountries();
      setCountries(fetchedCountries);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      toast.showError('Failed to load countries. Please refresh the page.');
    } finally {
      setIsLoadingCountries(false);
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
    if (name === 'phone' || name === 'companyPhone') {
      const numericValue = value.replace(/\D/g, ''); // Remove all non-digit characters
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

    if (!formData.companyAddress.trim()) {
      newErrors.companyAddress = 'Company address is required';
    }

    if (!formData.companyPhone.trim()) {
      newErrors.companyPhone = 'Company phone is required';
    } else if (!/^\d+$/.test(formData.companyPhone)) {
      newErrors.companyPhone = 'Company phone must contain only numbers';
    } else if (formData.companyPhone.length < 10 || formData.companyPhone.length > 15) {
      newErrors.companyPhone = 'Company phone must be between 10 and 15 digits';
    }

    if (!formData.companyCountryCode.trim()) {
      newErrors.companyCountryCode = 'Company country code is required';
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
      formDataToSend.append('company_address', formData.companyAddress.trim());
      formDataToSend.append('company_phone', formData.companyPhone.trim());
      formDataToSend.append('company_country_code', formData.companyCountryCode);
      
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
      console.log('Response status:', response.status);
      console.log('Response message:', response.message);
      console.log('User from response.user:', response.user);
      console.log('User from response.data?.user:', response.data?.user);
      console.log('User from response.data?.data?.user:', response.data?.data?.user);
      console.log('======================');

      // Check if signup was successful
      const signupSuccess = response.status !== false && (response.user || response.data?.user || response.data?.data?.user);
      
      if (signupSuccess) {
        const userData = response.user || response.data?.user || response.data?.data?.user;
        console.log('Signup: User data found:', userData);
        
        toast.showSuccess(response.message || 'Account created successfully! Please verify your email with OTP.');
        
        // If user data is returned, dispatch event (though user still needs OTP verification)
        if (userData && typeof window !== 'undefined') {
          console.log('Signup: Dispatching userCreated event with user:', userData);
          window.dispatchEvent(new CustomEvent('userCreated', { detail: { user: userData } }));
        }
      } else {
        console.error('Signup: Response indicates failure or no user data returned');
        console.error('Response structure:', response);
        toast.showWarning('Signup request sent, but user data not returned. Please check database and Laravel logs.');
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
        companyAddress: '',
        companyPhone: '',
        companyCountryCode: '91',
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
              <div className="w-24">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-3 border ${errors.countryCode ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                >
                  <option value="91">+91 (IN)</option>
                  <option value="971">+971 (AE)</option>
                  <option value="1">+1 (US)</option>
                  <option value="44">+44 (UK)</option>
                </select>
              </div>
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    // Only allow numbers
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                      e.preventDefault();
                    }
                  }}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={15}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.phone ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{typeof errors.phone === 'string' ? errors.phone : 'Invalid phone'}</p>}
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

          {/* Company Address */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Company Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="companyAddress"
                value={formData.companyAddress}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${errors.companyAddress ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter company address"
                required
              />
            </div>
            {errors.companyAddress && <p className="text-red-500 text-xs mt-1">{typeof errors.companyAddress === 'string' ? errors.companyAddress : 'Invalid address'}</p>}
          </div>

          {/* Company Phone with Country Code */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Company Phone <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="w-24">
                <select
                  name="companyCountryCode"
                  value={formData.companyCountryCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-3 border ${errors.companyCountryCode ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                >
                  <option value="91">+91 (IN)</option>
                  <option value="971">+971 (AE)</option>
                  <option value="1">+1 (US)</option>
                  <option value="44">+44 (UK)</option>
                </select>
              </div>
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    // Only allow numbers
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                      e.preventDefault();
                    }
                  }}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={15}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.companyPhone ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Enter company phone number"
                  required
                />
              </div>
            </div>
            {errors.companyPhone && <p className="text-red-500 text-xs mt-1">{typeof errors.companyPhone === 'string' ? errors.companyPhone : 'Invalid phone'}</p>}
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
                <a href="#" className="text-[#C2D642] hover:underline font-semibold">Privacy Policy</a>
                {' '}and{' '}
                <a href="#" className="text-[#C2D642] hover:underline font-semibold">Terms and Conditions</a>
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
