'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

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
  projectUpdateId?: number | null; // For update mode (numeric ID)
  clientId?: number | null; // Existing client ID when updating
  editingProject?: Project | null; // Project data when editing
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultProjects = [],
  userProjects = [],
  onProjectCreated,
  projectUpdateId = null,
  clientId = null,
  editingProject = null
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    address: '',
    own_project_or_contractor: '' as 'yes' | 'no' | '',
    planned_start_date: '',
    planned_end_date: '',
    companies_id: '',
    tag_member: [] as number[],
    logo: null as File | null,
    logoPreview: '' as string | null,
    // Client fields (required if own_project_or_contractor = 'yes')
    client_name: '',
    client_address: '',
    client_company_name: '',
    client_company_address: '',
    client_designation: '',
    client_email: '',
    client_phone: '',
    client_mobile: '',
    country_code: '',
    company_country_code: '',
    // Optional fields
    project_completed: 'no' as 'yes' | 'no',
    project_completed_date: '',
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';


  const dummyManagers = [
    { name: 'John Doe' },
    { name: 'Jane Smith' },
  ];

  // Reset form when modal closes (only if not editing)
  useEffect(() => {
    if (!isOpen && !projectUpdateId && !editingProject) {
      if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.logoPreview);
      }
      setFormData({
        project_name: '',
        address: '',
        own_project_or_contractor: '',
        planned_start_date: '',
        planned_end_date: '',
        companies_id: '',
        tag_member: [],
        logo: null,
        logoPreview: null,
        client_name: '',
        client_address: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_phone: '',
        client_mobile: '',
        country_code: '',
        company_country_code: '',
        project_completed: 'no',
        project_completed_date: '',
      });
    }
  }, [isOpen, projectUpdateId, editingProject]);

  useEffect(() => {
    return () => {
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
    };
  }, [formData.logoPreview]);

  // Fetch companies when modal opens - show all companies from company-list API
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!isOpen) return;
      
      setIsLoadingCompanies(true);
      try {
        console.log('🔵 Fetching companies for project creation from /companies-list...');
        
        const fetchedCompanies = await masterDataAPI.getCompanies();
        console.log('✅ Companies fetched from API:', fetchedCompanies);
        console.log('Number of companies:', fetchedCompanies?.length || 0);
        
        // Show all companies from the API (no filtering)
        setCompanies(fetchedCompanies || []);
        
        if (fetchedCompanies && fetchedCompanies.length > 0) {
          console.log('Companies available in dropdown:');
          fetchedCompanies.forEach((company: any, index: number) => {
            console.log(`  ${index + 1}. ${company.registration_name || company.name} (ID: ${company.id || company.uuid})`);
          });
        } else {
          console.warn('⚠️ No companies returned from API');
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch companies:', error);
        toast.showError(error.message || 'Failed to load companies');
        setCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [isOpen]);

  // Populate form when editingProject is provided
  useEffect(() => {
    if (isOpen && editingProject && companies.length > 0) {
      console.log('📝 Populating form with editing project data:', editingProject);
      console.log('📋 Available companies:', companies.length);
      
      // Extract company ID - try multiple possible field names
      // The API returns companies_id as numeric ID, but we might receive it in different formats
      let companyId = (editingProject as any).companies_id || 
                     (editingProject as any).company_id || 
                     editingProject.companyId || 
                     '';
      
      // Convert to string and ensure we have a valid match
      companyId = String(companyId).trim();
      
      // Try to find matching company in the dropdown list
      // Match by numeric ID (companies_id is numeric)
      const matchedCompany = companies.find((c: any) => {
        const cId = String(c.numericId || c.id || '');
        return cId === companyId || String(c.id) === companyId;
      });
      
      if (matchedCompany) {
        // Use the numeric ID from the matched company
        companyId = String(matchedCompany.numericId || matchedCompany.id);
        console.log('✅ Found matching company:', {
          companyName: matchedCompany.registration_name || matchedCompany.name,
          companyId: companyId,
          matchedCompanyId: matchedCompany.numericId || matchedCompany.id
        });
      } else if (companyId) {
        console.warn('⚠️ Company ID not found in companies list:', companyId);
        console.warn('Available company IDs:', companies.map((c: any) => ({
          id: c.id,
          numericId: c.numericId,
          uuid: c.uuid,
          name: c.registration_name || c.name
        })));
      }
      
      console.log('🏢 Final Company ID for form:', companyId, 'Type:', typeof companyId);
      
      // Populate ALL form fields from editingProject to preserve all previously filled data
      // Extract own_project_or_contractor from API response directly, or derive from isContractor
      const ownProjectOrContractor = (editingProject as any).own_project_or_contractor || 
                                     (editingProject.isContractor ? 'yes' : (editingProject.isContractor === false ? 'no' : ''));
      
      setFormData(prev => ({
        ...prev,
        project_name: editingProject.name || '',
        address: editingProject.location || '',
        own_project_or_contractor: ownProjectOrContractor,
        planned_start_date: editingProject.startDate || '',
        planned_end_date: editingProject.endDate || '',
        companies_id: companyId, // Use matched company ID
        tag_member: (editingProject as any).tag_member || [], // Populate tag_member if available
        logo: null, // Reset file input (user can upload new logo if needed)
        logoPreview: editingProject.logo || null, // Show existing logo as preview
        // Client fields - populate ALL fields from editingProject
        client_name: (editingProject as any).client_name || '',
        client_address: (editingProject as any).client_address || '',
        client_company_name: (editingProject as any).client_company_name || '',
        client_company_address: (editingProject as any).client_company_address || '',
        client_designation: (editingProject as any).client_designation || '',
        client_email: (editingProject as any).client_email || '',
        client_phone: (editingProject as any).client_phone || '',
        client_mobile: (editingProject as any).client_mobile || '',
        country_code: (editingProject as any).country_code || '',
        company_country_code: (editingProject as any).company_country_code || '',
        project_completed: (editingProject as any).project_completed || 'no',
        project_completed_date: (editingProject as any).project_completed_date || '',
      }));
      
      console.log('✅ Form fully populated with all fields:', {
        project_name: editingProject.name,
        address: editingProject.location,
        own_project_or_contractor: editingProject.isContractor ? 'yes' : (editingProject.isContractor === false ? 'no' : ''),
        companies_id: companyId,
        planned_start_date: editingProject.startDate,
        planned_end_date: editingProject.endDate,
        client_name: (editingProject as any).client_name,
        tag_member: (editingProject as any).tag_member,
        allFields: Object.keys(editingProject)
      });
    } else if (isOpen && editingProject && companies.length === 0) {
      // Wait for companies to load before populating
      console.log('⏳ Waiting for companies to load before populating form...');
    } else if (isOpen && !editingProject && !projectUpdateId) {
      // Reset form for new project (only if not editing)
      console.log('🆕 Resetting form for new project');
    }
  }, [isOpen, editingProject, projectUpdateId, companies]);

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

  const handleRadioChange = (value: 'yes' | 'no') => {
    if (formData.own_project_or_contractor === value) {
      // If clicking the same option, unselect it
      setFormData({
        ...formData,
        own_project_or_contractor: '',
        client_name: '',
        client_address: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_phone: '',
        client_mobile: '',
        country_code: '',
        company_country_code: '',
      });
    } else if (value === 'no') {
      // If selecting 'no', clear client fields
      setFormData({
        ...formData,
        own_project_or_contractor: value,
        client_name: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_phone: '',
        client_mobile: '',
        country_code: '',
        company_country_code: '',
      });
    } else {
      // If selecting 'yes', keep the value but don't clear client fields (user might have entered data)
      setFormData({
        ...formData,
        own_project_or_contractor: value
      });
    }
  };

  const handleMemberToggle = (memberId: number) => {
    setFormData({
      ...formData,
      tag_member: formData.tag_member.includes(memberId)
        ? formData.tag_member.filter(id => id !== memberId)
        : [...formData.tag_member, memberId]
    });
  };

  const handleCreateProject = async () => {
    // 1. Validate required fields
    const missingFields: string[] = [];
    
    if (!formData.project_name.trim()) missingFields.push('Project Name');
    if (!formData.address.trim()) missingFields.push('Address');
    if (!formData.own_project_or_contractor) missingFields.push('Are you contractor for this project?');
    if (!formData.planned_start_date) missingFields.push('Planned Start Date');
    if (!formData.companies_id) missingFields.push('Tag Company');
    
    // 2. Validate client fields if own_project_or_contractor = 'yes'
    if (formData.own_project_or_contractor === 'yes') {
      if (!formData.client_name.trim()) missingFields.push('Client Name');
      if (!formData.client_company_name.trim()) missingFields.push('Client Company Name');
      if (!formData.client_company_address.trim()) missingFields.push('Client Company Address');
      if (!formData.client_designation.trim()) missingFields.push('Client Designation');
      if (!formData.client_email.trim()) missingFields.push('Client Email');
      if (!formData.client_phone.trim()) missingFields.push('Client Phone');
    }
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare FormData matching Laravel backend requirements
      const projectFormData = new FormData();
      
      // Required fields
      projectFormData.append('project_name', formData.project_name.trim());
      projectFormData.append('address', formData.address.trim());
      projectFormData.append('planned_start_date', formData.planned_start_date);
      projectFormData.append('companies_id', formData.companies_id);
      projectFormData.append('own_project_or_contractor', formData.own_project_or_contractor);
      
      // Optional fields
      if (formData.planned_end_date) {
        projectFormData.append('planned_end_date', formData.planned_end_date);
      }
      if (formData.project_completed_date) {
        projectFormData.append('project_completed_date', formData.project_completed_date);
      }
      // project_completed is optional, default is "no"
      if (formData.project_completed) {
        projectFormData.append('project_completed', formData.project_completed);
      }
      
      // Logo file
      if (formData.logo) {
        projectFormData.append('logo', formData.logo);
      }
      
      // Team members (tag_member) - send as array
      if (formData.tag_member.length > 0) {
        formData.tag_member.forEach((memberId, index) => {
          projectFormData.append(`tag_member[${index}]`, String(memberId));
        });
      }
      
      // Client data (required if own_project_or_contractor = 'yes')
      if (formData.own_project_or_contractor === 'yes') {
        projectFormData.append('client_name', formData.client_name.trim());
        projectFormData.append('client_company_name', formData.client_company_name.trim());
        projectFormData.append('client_company_address', formData.client_company_address.trim());
        projectFormData.append('client_designation', formData.client_designation.trim());
        projectFormData.append('client_email', formData.client_email.trim().toLowerCase());
        projectFormData.append('client_phone', formData.client_phone.trim());
        
        if (formData.client_mobile) {
          projectFormData.append('client_mobile', formData.client_mobile.trim());
        }
        if (formData.country_code) {
          projectFormData.append('country_code', formData.country_code);
        }
        if (formData.company_country_code) {
          projectFormData.append('company_country_code', formData.company_country_code);
        }
      }
      
      // 3. If projectUpdateId exists → UPDATE, else CREATE
      // POST /api/project-add handles both create and update
      let response;
      if (projectUpdateId) {
        // Update existing project - include projectUpdateId and optionally clientId
        projectFormData.append('projectUpdateId', String(projectUpdateId));
        if (clientId) {
          projectFormData.append('clientId', String(clientId));
        }
        response = await masterDataAPI.createProject(projectFormData); // Uses same endpoint
        console.log('✅ Project update response:', response);
        
        toast.showSuccess('Project updated successfully!');
        
        // Call onSuccess to refresh the project list
        if (onSuccess) {
          onSuccess();
        }
        
        // Close the modal
        onClose();
      } else {
        // Create new project
        console.log('📝 Creating new project...');
        console.log('Project FormData being sent:', {
          project_name: formData.project_name,
          companies_id: formData.companies_id,
          own_project_or_contractor: formData.own_project_or_contractor,
          planned_start_date: formData.planned_start_date,
        });
        response = await masterDataAPI.createProject(projectFormData);
        console.log('✅ Project creation response:', response);
        
        toast.showSuccess(response?.message || 'Project created successfully!');
        
        // Reset form
        setFormData({
          project_name: '',
          address: '',
          own_project_or_contractor: '',
          planned_start_date: '',
          planned_end_date: '',
          companies_id: '',
          tag_member: [],
          logo: null,
          logoPreview: null,
          client_name: '',
          client_address: '',
          client_company_name: '',
          client_company_address: '',
          client_designation: '',
          client_email: '',
          client_phone: '',
          client_mobile: '',
          country_code: '',
          company_country_code: '',
          project_completed: 'no',
          project_completed_date: '',
        });
        
        // Call onSuccess to refresh the project list
        if (onSuccess) {
          onSuccess();
        }
        
        // Close the modal
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to save project:', error);
      toast.showError(error.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {projectUpdateId ? 'Edit Project' : 'Add New Project'}
            </h2>
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
              name="project_name"
              value={formData.project_name}
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
                  name="own_project_or_contractor"
                  value="yes"
                  checked={formData.own_project_or_contractor === 'yes'}
                  onChange={() => handleRadioChange('yes')}
                  className={`w-4 h-4 text-[#C2D642] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#C2D642]`}
                />
                <span className={`text-sm font-bold ${textPrimary}`}>Yes</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer`}>
                <input
                  type="radio"
                  name="own_project_or_contractor"
                  value="no"
                  checked={formData.own_project_or_contractor === 'no'}
                  onChange={() => handleRadioChange('no')}
                  className={`w-4 h-4 text-[#C2D642] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'} border focus:ring-[#C2D642]`}
                />
                <span className={`text-sm font-bold ${textPrimary}`}>No</span>
              </label>
            </div>
          </div>

          {/* Client Information Fields - Shown when own_project_or_contractor is 'yes' */}
          {formData.own_project_or_contractor === 'yes' && (
            <>
              {/* Client Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleInputChange}
                  placeholder="Enter Client Name"
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
                <textarea
                  name="client_address"
                  value={formData.client_address}
                  onChange={handleInputChange}
                  placeholder="Enter Client Address"
                  rows={2}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all resize-none ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Client Company Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Client Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="client_company_name"
                  value={formData.client_company_name}
                  onChange={handleInputChange}
                  placeholder="Enter Client Company Name"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
              
              {/* Client Company Address */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Client Company Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="client_company_address"
                  value={formData.client_company_address}
                  onChange={handleInputChange}
                  placeholder="Enter Client Company Address"
                  rows={2}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all resize-none ${
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
                        name="client_name"
                        value={formData.client_name}
                        onChange={handleInputChange}
                        placeholder="Enter Client Contact Name"
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
                        name="client_email"
                        value={formData.client_email}
                        onChange={handleInputChange}
                        placeholder="Enter Client Email"
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
                        name="client_mobile"
                        value={formData.client_mobile}
                        onChange={handleInputChange}
                        placeholder="Enter Client Mobile Number"
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
                        name="client_designation"
                        value={formData.client_designation}
                        onChange={handleInputChange}
                        placeholder="Enter Client Designation"
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
                        name="client_phone"
                        value={formData.client_phone}
                        onChange={handleInputChange}
                        placeholder="Enter Client Phone Number"
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
              name="planned_start_date"
              value={formData.planned_start_date}
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
              name="planned_end_date"
              value={formData.planned_end_date}
              onChange={handleInputChange}
              min={formData.planned_start_date}
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
              name="companies_id"
              value={formData.companies_id}
              onChange={handleInputChange}
              disabled={isLoadingCompanies}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">{isLoadingCompanies ? 'Loading companies...' : '-- Select Company --'}</option>
              {companies.map((company: any) => {
                // Use numeric ID for companies_id matching
                // Backend expects numeric ID in companies_id field
                // Companies have: id (numeric), uuid (UUID), numericId (numeric)
                const companyValue = company.numericId || company.id || company.uuid;
                console.log('Company dropdown option:', {
                  id: company.id,
                  numericId: company.numericId,
                  uuid: company.uuid,
                  value: companyValue,
                  name: company.registration_name || company.name
                });
                // Prioritize registration_name for display (as per API response structure)
                const companyDisplayName = company.registration_name || company.name || '';
                
                return (
                  <option key={company.uuid || company.id} value={String(companyValue)}>
                    {companyDisplayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tag Team Members */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Tag Team Members
            </label>
            {isLoadingUsers ? (
              <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <p className={`text-sm ${textSecondary}`}>Loading users...</p>
              </div>
            ) : users.length > 0 ? (
              <div className={`p-4 rounded-lg border max-h-48 overflow-y-auto ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-2">
                  {users.map((user: any) => (
                    <label key={user.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50`}>
                      <input
                        type="checkbox"
                        checked={formData.tag_member.includes(user.id)}
                        onChange={() => handleMemberToggle(user.id)}
                        className={`w-4 h-4 text-[#C2D642] rounded focus:ring-[#C2D642]`}
                      />
                      <span className={`text-sm font-bold ${textPrimary}`}>
                        {user.name || user.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <p className={`text-sm ${textSecondary}`}>No users available. Team members can be added later.</p>
              </div>
            )}
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
