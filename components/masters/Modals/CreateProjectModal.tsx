'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  company: string;
  companyLogo: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  location: string;
  logo: string;
  isContractor?: boolean;
  projectManager?: string;
}

interface CreateProjectModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjects?: Project[];
  userProjects?: Project[];
  onProjectCreated?: (project: Project) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultProjects = [],
  userProjects = [],
  onProjectCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    projectName: '',
    address: '',
    isContractor: '',
    plannedStartDate: '',
    plannedEndDate: '',
    company: '',
    projectManager: '',
    logo: null as File | null,
    logoPreview: '' as string | null,
    clientName: '',
    clientAddress: '',
    clientContactName: '',
    clientContactEmail: '',
    clientContactMobile: '',
    clientContactDesignation: '',
    clientContactPhone: ''
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Dummy data for dropdowns
  const dummyCompanies = [
    { name: 'ABC Construction Ltd', logo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64' },
    { name: 'XYZ Builders Inc', logo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64' },
  ];

  const dummyManagers = [
    { name: 'John Doe' },
    { name: 'Jane Smith' },
  ];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.logoPreview);
      }
      setFormData({
        projectName: '',
        address: '',
        isContractor: '',
        plannedStartDate: '',
        plannedEndDate: '',
        company: '',
        projectManager: '',
        logo: null,
        logoPreview: null,
        clientName: '',
        clientAddress: '',
        clientContactName: '',
        clientContactEmail: '',
        clientContactMobile: '',
        clientContactDesignation: '',
        clientContactPhone: ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRadioChange = (value: string) => {
    if (formData.isContractor === value) {
      setFormData({
        ...formData,
        isContractor: '',
        clientName: '',
        clientAddress: '',
        clientContactName: '',
        clientContactEmail: '',
        clientContactMobile: '',
        clientContactDesignation: '',
        clientContactPhone: ''
      });
    } else if (value === 'no') {
      setFormData({
        ...formData,
        isContractor: value,
        clientName: '',
        clientAddress: '',
        clientContactName: '',
        clientContactEmail: '',
        clientContactMobile: '',
        clientContactDesignation: '',
        clientContactPhone: ''
      });
    } else {
      setFormData({
        ...formData,
        isContractor: value
      });
    }
  };

  const handleCreateProject = async () => {
    const missingFields: string[] = [];
    
    if (!formData.projectName) missingFields.push('Project Name');
    if (!formData.address) missingFields.push('Address');
    if (!formData.isContractor) missingFields.push('Are you contractor for this project?');
    if (!formData.plannedStartDate) missingFields.push('Planned Start Date');
    if (!formData.plannedEndDate) missingFields.push('Planned End Date');
    if (!formData.company) missingFields.push('Tag Company');
    if (!formData.projectManager) missingFields.push('Tag Project Manager');
    
    if (formData.isContractor === 'yes') {
      if (!formData.clientName) missingFields.push('Client Name');
      if (!formData.clientAddress) missingFields.push('Client Address');
      if (!formData.clientContactName) missingFields.push('Client Point of Contact - Name');
      if (!formData.clientContactEmail) missingFields.push('Client Point of Contact - Email');
      if (!formData.clientContactMobile) missingFields.push('Client Point of Contact - Mobile Number');
      if (!formData.clientContactDesignation) missingFields.push('Client Point of Contact - Designation');
      if (!formData.clientContactPhone) missingFields.push('Client Point of Contact - Phone Number');
    }
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate a code from the project name
    const code = formData.projectName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + String(defaultProjects.length + userProjects.length + 1).padStart(3, '0');

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
      logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.projectName)}&background=C2D642&color=fff&size=128`;
    }

    const selectedCompany = dummyCompanies.find(c => c.name === formData.company);
    const companyLogo = selectedCompany?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.company)}&background=C2D642&color=fff&size=64`;

    const newProject: Project = {
      id: Date.now().toString(),
      name: formData.projectName,
      code: code,
      company: formData.company,
      companyLogo: companyLogo,
      startDate: formData.plannedStartDate,
      endDate: formData.plannedEndDate,
      status: 'Planning',
      progress: 0,
      location: formData.address,
      logo: logoUrl,
      isContractor: formData.isContractor === 'yes',
      projectManager: formData.projectManager
    };

    // Save to localStorage
    const savedProjects = localStorage.getItem('projects');
    let existingProjects: any[] = [];
    if (savedProjects) {
      try {
        existingProjects = JSON.parse(savedProjects);
      } catch (e) {
        console.error('Error parsing projects:', e);
      }
    }

    existingProjects.push(newProject);
    localStorage.setItem('projects', JSON.stringify(existingProjects));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('projectsUpdated'));

    toast.showSuccess('Project created successfully!');
    
    if (onProjectCreated) {
      onProjectCreated(newProject);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Add New Project</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter project details below</p>
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
          {/* Project Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="Enter project name"
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Address */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter project address"
              rows={3}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all resize-none ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Are you contractor for this project? */}
          <div>
            <label className={`block text-sm font-bold mb-3 ${textPrimary}`}>
              Are you contractor for this project? <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-6">
              <label className={`flex items-center gap-2 cursor-pointer`}>
                <input
                  type="radio"
                  name="isContractor"
                  value="yes"
                  checked={formData.isContractor === 'yes'}
                  onChange={() => handleRadioChange('yes')}
                  className={`w-4 h-4 text-[#C2D642] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#C2D642]`}
                />
                <span className={`text-sm font-bold ${textPrimary}`}>Yes</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer`}>
                <input
                  type="radio"
                  name="isContractor"
                  value="no"
                  checked={formData.isContractor === 'no'}
                  onChange={() => handleRadioChange('no')}
                  className={`w-4 h-4 text-[#C2D642] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#C2D642]`}
                />
                <span className={`text-sm font-bold ${textPrimary}`}>No</span>
              </label>
            </div>
          </div>

          {/* Client Information Fields - Shown when contractor is 'yes' */}
          {formData.isContractor === 'yes' && (
            <>
              {/* Client Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="Enter Your Client Name"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Client Address */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Client Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleInputChange}
                  placeholder="Enter Client Address"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Client Point of Contact Section */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <h3 className={`text-base font-bold mb-4 ${textPrimary}`}>
                  Client Point of Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="clientContactName"
                        value={formData.clientContactName}
                        onChange={handleInputChange}
                        placeholder="Enter Your client point Name"
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="clientContactEmail"
                        value={formData.clientContactEmail}
                        onChange={handleInputChange}
                        placeholder="Enter Your Email"
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="clientContactMobile"
                        value={formData.clientContactMobile}
                        onChange={handleInputChange}
                        placeholder="Enter Your Mobile Number"
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Designation */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="clientContactDesignation"
                        value={formData.clientContactDesignation}
                        onChange={handleInputChange}
                        placeholder="Enter Your Designation"
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="clientContactPhone"
                        value={formData.clientContactPhone}
                        onChange={handleInputChange}
                        placeholder="Enter Your Phone Number"
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                          isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Planned Start Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Planned Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="plannedStartDate"
              value={formData.plannedStartDate}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Planned End Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Planned End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="plannedEndDate"
              value={formData.plannedEndDate}
              onChange={handleInputChange}
              min={formData.plannedStartDate}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            />
          </div>

          {/* Tag Company */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Tag Company <span className="text-red-500">*</span>
            </label>
            <select
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Company --</option>
              {dummyCompanies.map((company, idx) => (
                <option key={idx} value={company.name}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Project Manager */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Tag Project Manager <span className="text-red-500">*</span>
            </label>
            <select
              name="projectManager"
              value={formData.projectManager}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
            >
              <option value="">-- Select Project Manager --</option>
              {dummyManagers.map((manager, idx) => (
                <option key={idx} value={manager.name}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Project Logo */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Upload Project Logo
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
            onClick={handleCreateProject}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
