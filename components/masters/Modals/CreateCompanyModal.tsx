'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload } from 'lucide-react';

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

interface CreateCompanyModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCompanies?: Company[];
  userCompanies?: Company[];
  onCompanyCreated?: (company: Company) => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultCompanies = [],
  userCompanies = [],
  onCompanyCreated
}) => {
  const toast = useToast();
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
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.logoPreview);
      }
      setFormData({
        registrationName: '',
        registeredAddress: '',
        companyRegistrationNo: '',
        logo: null,
        logoPreview: null
      });
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
    };
  }, [formData.logoPreview]);

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

  const handleCreateCompany = async () => {
    const missingFields: string[] = [];
    
    if (!formData.registrationName) missingFields.push('Registration Name');
    if (!formData.registeredAddress) missingFields.push('Registered Address');
    if (!formData.companyRegistrationNo) missingFields.push('Company Registration No');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    const code = formData.registrationName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + String(defaultCompanies.length + userCompanies.length + 1).padStart(3, '0');

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
      logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.registrationName)}&background=C2D642&color=fff&size=128`;
    }

    const newCompany: Company = {
      id: Date.now().toString(),
      name: formData.registrationName,
      code: code,
      address: formData.registeredAddress,
      registrationNo: formData.companyRegistrationNo,
      logo: logoUrl,
      status: 'Active',
      projects: 0,
      employees: 0,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedCompanies = localStorage.getItem('companies');
    let existingCompanies: any[] = [];
    if (savedCompanies) {
      try {
        existingCompanies = JSON.parse(savedCompanies);
      } catch (e) {
        console.error('Error parsing companies:', e);
      }
    }

    existingCompanies.push(newCompany);
    localStorage.setItem('companies', JSON.stringify(existingCompanies));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('companiesUpdated'));

    toast.showSuccess('Company created successfully!');
    
    if (onCompanyCreated) {
      onCompanyCreated(newCompany);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Company</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter company details below</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Registration Name */}
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

          {/* Registered Address */}
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

          {/* Company Registration No */}
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

          {/* Company Logo */}
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
                    <p className={`text-xs ${textSecondary} mt-1`}>PNG, JPG, GIF up to 5MB</p>
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

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateCompany}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCompanyModal;
