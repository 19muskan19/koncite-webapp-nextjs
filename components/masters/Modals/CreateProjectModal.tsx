'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { X, Upload, Loader2, ChevronDown, Search } from 'lucide-react';
import { sortCountryCodes, findCountryByDialCode } from '@/utils/countryCodeUtils';
import { parseClientPhonePartsFromApi } from '@/utils/clientPhoneUtils';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { masterDataAPI, teamsAPI } from '@/services/api';
import { extractProjectLogoFromApi, getLogoUrl } from '@/utils/imageUtils';

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

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

const getFlagUrl = (countryCode: string) =>
  `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;

interface CreateProjectModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProject?: any) => void;
  defaultProjects?: Project[];
  userProjects?: Project[];
  onProjectCreated?: (project: Project) => void;
  projectUpdateId?: string | number | null; // For update mode (UUID or numeric ID)
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
  const { sidebarWidth } = useSidebar();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; email?: string; roleType?: string }>>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isClientCountryDropdownOpen, setIsClientCountryDropdownOpen] = useState(false);
  const [clientCountrySearchQuery, setClientCountrySearchQuery] = useState('');
  const [formData, setFormData] = useState({
    project_name: '',
    address: '',
    own_project_or_contractor: '' as 'yes' | 'no' | '',
    planned_start_date: '',
    planned_end_date: '',
    companies_id: '',
    project_incharge: '' as string,
    logo: null as File | null,
    logoPreview: '' as string | null,
    // Client fields (required if own_project_or_contractor = 'yes')
    client_name: '',
    client_address: '',
    client_point_of_contact_name: '',
    client_company_name: '',
    client_company_address: '',
    client_designation: '',
    client_email: '',
    client_mobile: '',
    client_country_code: '',
    client_country_code_iso: '',
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
        project_incharge: '',
        logo: null,
        logoPreview: null,
        client_name: '',
        client_address: '',
        client_point_of_contact_name: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_mobile: '',
        client_country_code: '',
        client_country_code_iso: '',
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

  const parseDialCode = (c: any): string => {
    const root = (c.idd?.root || '').replace(/\+/g, '');
    const suffixes = c.idd?.suffixes || [];
    const first = suffixes[0];
    if (root === '1' || (c.cca2 === 'US' || c.cca2 === 'CA')) return '1';
    if (root === '7') return '7';
    if (first && String(first).length >= 3) return root;
    if (first) return root + String(first);
    return root;
  };

  const fetchClientCountryCodes = async () => {
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

  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountryCodes) {
      fetchClientCountryCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load staff from Admin > User Management > Teams (teams-list API; fallback to localStorage)
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingStaff(true);
    const ROLE_ID_TO_NAME: Record<string, string> = {
      '1': 'Super Admin', '2': 'Project Manager', '3': 'Site Engineer',
      '4': 'Store Keepers', '5': 'Supervisor',
    };
    const getRoleType = (u: any) =>
      u.company_role?.name ?? u.designation ?? u.role_type ?? ROLE_ID_TO_NAME[String(u.company_role_id ?? u.company_role?.id ?? '')] ?? '';
    teamsAPI.getTeamsList()
      .then((apiData) => {
        const list = Array.isArray(apiData) ? apiData : [];
        setStaff(list.map((u: any) => ({
          id: String(u.id ?? u.uuid),
          name: u.name || '',
          email: u.email,
          roleType: getRoleType(u),
        })));
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('manageTeamsUsers');
          const parsed = saved ? JSON.parse(saved) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          setStaff(list.map((u: any) => ({
            id: String(u.id ?? u.uuid),
            name: u.name || '',
            email: u.email,
            roleType: u.roleType || '',
          })));
        } catch (e) {
          setStaff([]);
        }
      })
      .finally(() => setIsLoadingStaff(false));
  }, [isOpen]);

  // Populate form when editingProject is provided (runs once per edit — no `companies` dep so
  // we don't re-apply empty fallbacks and wipe client fields when the company list loads).
  useEffect(() => {
    if (isOpen && editingProject) {
      const ep = editingProject as any;
      const cli =
        ep.client && typeof ep.client === 'object' && !Array.isArray(ep.client) ? ep.client : null;
      console.log('📝 Populating form with editing project data:', editingProject);

      // Best-effort company id from API (normalized when companies load — separate effect below)
      const companyId = String(
        ep.companies_id ?? ep.company_id ?? ep.companyId ?? ''
      ).trim();

      const ownProjectOrContractor =
        ep.own_project_or_contractor ||
        (editingProject.isContractor ? 'yes' : editingProject.isContractor === false ? 'no' : '');

      const normDate = (d: string | undefined) => {
        if (!d || typeof d !== 'string') return '';
        const s = d.trim();
        return s.length >= 10 ? s.slice(0, 10) : s;
      };

      const projectName =
        ep.project_name || editingProject.name || '';
      const address =
        ep.address || editingProject.location || '';
      const startDate = normDate(
        ep.planned_start_date || editingProject.startDate || ''
      );
      const endDate = normDate(
        ep.planned_end_date || editingProject.endDate || ''
      );

      let clientCountryCode =
        ep.client_country_code ||
        cli?.client_country_code ||
        cli?.country_code ||
        ep.country_code ||
        '';
      const clientCountryIso =
        ep.client_country_code_iso ||
        cli?.client_country_code_iso ||
        cli?.country_code_iso ||
        ep.country_code_iso ||
        '';
      const phoneParts = parseClientPhonePartsFromApi(
        clientCountryCode || undefined,
        ep.client_phone || cli?.client_phone,
        ep.client_mobile || cli?.client_mobile
      );
      clientCountryCode = phoneParts.dialCode;
      const clientMobile = phoneParts.mobile10;

      setFormData((prev) => ({
        ...prev,
        project_name: projectName,
        address,
        own_project_or_contractor: ownProjectOrContractor as 'yes' | 'no' | '',
        planned_start_date: startDate,
        planned_end_date: endDate,
        companies_id: companyId,
        project_incharge: String(ep.tag_project_incharge ?? ep.project_incharge ?? '') || '',
        logo: null,
        // Only real uploaded logo from API — not list-row placeholder (ui-avatars)
        logoPreview: (() => {
          const raw = extractProjectLogoFromApi(ep);
          if (!raw) return null;
          return getLogoUrl(raw, projectName, '6366f1');
        })(),
        client_name: ep.client_name || cli?.client_name || cli?.name || '',
        client_address:
          ep.client_address ||
          cli?.client_address ||
          cli?.address ||
          cli?.client_company_address ||
          '',
        client_point_of_contact_name:
          ep.client_point_of_contact_name ||
          ep.client_contact_name ||
          cli?.client_point_of_contact_name ||
          cli?.client_contact_name ||
          cli?.point_of_contact_name ||
          cli?.contact_name ||
          cli?.client_name ||
          ep.client_name ||
          '',
        client_company_name: ep.client_company_name || cli?.client_company_name || '',
        client_company_address: ep.client_company_address || cli?.client_company_address || '',
        client_designation: ep.client_designation || cli?.client_designation || '',
        client_email: ep.client_email || cli?.client_email || '',
        client_mobile: clientMobile,
        client_country_code: clientCountryCode,
        client_country_code_iso: clientCountryIso,
        company_country_code: ep.company_country_code || cli?.company_country_code || '',
        project_completed: ep.project_completed === 'yes' || ep.project_completed === true ? 'yes' : 'no',
        project_completed_date: normDate(ep.project_completed_date || ''),
      }));

      console.log('✅ Form populated for edit:', { project_name: projectName, companies_id: companyId });
    }
  }, [isOpen, editingProject]);

  // After companies load, normalize tag company id to match dropdown (does not touch client fields)
  useEffect(() => {
    if (!isOpen || !editingProject || companies.length === 0) return;
    const ep = editingProject as any;
    let companyId = String(ep.companies_id ?? ep.company_id ?? ep.companyId ?? '').trim();
    if (!companyId) return;
    const matchedCompany = companies.find((c: any) => {
      const cId = String(c.numericId ?? c.id ?? '');
      return cId === companyId || String(c.id) === companyId || String(c.uuid) === companyId;
    });
    if (!matchedCompany) return;
    const normalized = String(matchedCompany.numericId ?? matchedCompany.id ?? companyId);
    setFormData((prev) => (prev.companies_id === normalized ? prev : { ...prev, companies_id: normalized }));
  }, [isOpen, editingProject, companies]);

  // When RestCountries list loads, fill dial code from ISO if API only returned ISO (common for +1 / IN)
  useEffect(() => {
    if (!isOpen || !editingProject || countryCodes.length === 0) return;
    setFormData((prev) => {
      if (String(prev.client_country_code || '').trim()) return prev;
      const ep = editingProject as any;
      const cli =
        ep.client && typeof ep.client === 'object' && !Array.isArray(ep.client) ? ep.client : null;
      const iso =
        ep.client_country_code_iso ||
        cli?.client_country_code_iso ||
        cli?.country_code_iso ||
        ep.country_code_iso ||
        '';
      if (!iso || typeof iso !== 'string') return prev;
      const c = countryCodes.find((x) => x.code === iso);
      if (!c) return prev;
      return { ...prev, client_country_code: c.dialCode, client_country_code_iso: c.code };
    });
  }, [isOpen, editingProject, countryCodes]);

  // Reset form when opening for new project only (deps exclude companies — avoids wiping input when companies load)
  useEffect(() => {
    if (!isOpen || editingProject || projectUpdateId) return;
    setFormData({
      project_name: '',
      address: '',
      own_project_or_contractor: '',
      planned_start_date: '',
      planned_end_date: '',
      companies_id: '',
      project_incharge: '',
      logo: null,
      logoPreview: null,
      client_name: '',
      client_address: '',
      client_point_of_contact_name: '',
      client_company_name: '',
      client_company_address: '',
      client_designation: '',
      client_email: '',
      client_mobile: '',
      client_country_code: '',
      client_country_code_iso: '',
      company_country_code: '',
      project_completed: 'no',
      project_completed_date: '',
    });
  }, [isOpen, editingProject, projectUpdateId]);

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
    const { name, value } = e.target;
    const updates: Record<string, string> = { [name]: value };
    if (name === 'planned_start_date' && value && formData.planned_end_date) {
      if (new Date(value) > new Date(formData.planned_end_date)) {
        updates.planned_end_date = value;
      }
    }
    // Phone fields: digits only, max 10
    if (name === 'client_mobile') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      updates[name] = digitsOnly;
    }
    setFormData({ ...formData, ...updates });
  };

  const handleRadioChange = (value: 'yes' | 'no') => {
    if (formData.own_project_or_contractor === value) {
      // If clicking the same option, unselect it
      setFormData({
        ...formData,
        own_project_or_contractor: '',
        client_name: '',
        client_address: '',
        client_point_of_contact_name: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_mobile: '',
        client_country_code: '',
        client_country_code_iso: '',
        company_country_code: '',
      });
    } else if (value === 'no') {
      // If selecting 'no', clear client fields
      setFormData({
        ...formData,
        own_project_or_contractor: value,
        client_name: '',
        client_point_of_contact_name: '',
        client_company_name: '',
        client_company_address: '',
        client_designation: '',
        client_email: '',
        client_mobile: '',
        client_country_code: '',
        client_country_code_iso: '',
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

  const handleInchargeChange = (staffId: string) => {
    setFormData({
      ...formData,
      project_incharge: staffId
    });
  };

  const handleCreateProject = async () => {
    // 1. Validate required fields (Project name, Address, Plan start/end date, Tag company)
    const missingFields: string[] = [];
    
    if (!formData.project_name.trim()) missingFields.push('Project Name');
    if (!formData.address.trim()) missingFields.push('Address');
    if (!formData.own_project_or_contractor) missingFields.push('Are you contractor for this project?');
    if (!formData.planned_start_date) missingFields.push('Planned Start Date');
    if (!formData.planned_end_date) missingFields.push('Planned End Date');
    if (!formData.companies_id) missingFields.push('Tag Company');
    
    // 2. Validate client fields if own_project_or_contractor = 'yes' (Client Name, Address, Point of Contact only)
    if (formData.own_project_or_contractor === 'yes') {
      if (!formData.client_name.trim()) missingFields.push('Client Name');
      if (!formData.client_address.trim()) missingFields.push('Client Address');
      if (!formData.client_point_of_contact_name.trim()) missingFields.push('Client Point of Contact Name');
      if (!formData.client_designation.trim()) missingFields.push('Client Designation');
      if (!formData.client_email.trim()) missingFields.push('Client Email');
      if (!formData.client_country_code.trim()) missingFields.push('Client Mobile Country Code');
      if (!formData.client_mobile.trim()) missingFields.push('Client Mobile Number');
    }

    // 3. Mobile validation: 10 digits, numbers only (client_mobile required when contractor)
    const phoneRegex = /^\d{10}$/;
    if (formData.own_project_or_contractor === 'yes' && formData.client_mobile.trim()) {
      if (!phoneRegex.test(formData.client_mobile.trim())) {
        toast.showWarning('Client Mobile must be exactly 10 digits (numbers only).');
        return;
      }
    }
    
    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return;
    }

    if (formData.planned_end_date && formData.planned_start_date && new Date(formData.planned_end_date) < new Date(formData.planned_start_date)) {
      toast.showWarning('Please enter appropriate end date. End date must be greater than or equal to start date.');
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
      
      // Planned end date (required)
      projectFormData.append('planned_end_date', formData.planned_end_date);
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
      
      // Project incharge - single staff member from Operations > Staff
      if (formData.project_incharge) {
        projectFormData.append('tag_project_incharge', formData.project_incharge);
      }
      
      // Client data (only when own_project_or_contractor = 'yes'): Client Name, Address, Point of Contact. Backend may require company fields - use client name/address as fallback.
      if (formData.own_project_or_contractor === 'yes') {
        projectFormData.append('client_name', formData.client_name.trim());
        projectFormData.append('client_address', formData.client_address.trim());
        projectFormData.append('client_company_name', (formData.client_company_name || formData.client_name).trim());
        projectFormData.append('client_company_address', (formData.client_company_address || formData.client_address).trim());
        projectFormData.append('client_point_of_contact_name', formData.client_point_of_contact_name.trim());
        projectFormData.append('client_designation', formData.client_designation.trim());
        projectFormData.append('client_email', formData.client_email.trim().toLowerCase());
        // Backend requires client_phone when contractor; send full number (country_code + mobile) for compatibility
        projectFormData.append('client_phone', `${formData.client_country_code}${formData.client_mobile}`.trim());
        projectFormData.append('client_country_code', formData.client_country_code.trim());
        projectFormData.append('client_country_code_iso', formData.client_country_code_iso || '');
        projectFormData.append('client_mobile', formData.client_mobile.trim());
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
          onSuccess(response?.data?.data ?? response?.data);
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
        toast.showSuccess('Project created successfully!');
        
        // Call onSuccess with created project data (includes logo) for optimistic UI display
        const createdData = response?.data?.data ?? response?.data;
        if (onSuccess) {
          onSuccess(createdData);
        }

        // Reset form
        setFormData({
          project_name: '',
          address: '',
          own_project_or_contractor: '',
          planned_start_date: '',
          planned_end_date: '',
          companies_id: '',
          project_incharge: '',
          logo: null,
          logoPreview: null,
          client_name: '',
          client_address: '',
          client_point_of_contact_name: '',
          client_company_name: '',
          client_company_address: '',
          client_designation: '',
          client_email: '',
          client_mobile: '',
          client_country_code: '',
          client_country_code_iso: '',
          company_country_code: '',
          project_completed: 'no',
          project_completed_date: '',
        });
        
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
    <div className="fixed top-0 right-0 bottom-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ left: sidebarWidth }}>
      <div className={`relative w-full max-w-[min(92vw,1024px)] rounded-xl border ${cardClass} shadow-2xl max-h-[75vh] overflow-hidden my-6 sm:my-8 flex flex-col`}>
        {/* Close X - fixed at top right, stays visible while scrolling */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 pr-14 border-b border-inherit`}>
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {projectUpdateId ? 'Edit Project' : 'Add New Project'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter project details below</p>
          </div>
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

          {/* Planned Start Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Planned Start Date <span className="text-red-500">*</span>
            </label>
            <DatePickerInput
              name="planned_start_date"
              value={formData.planned_start_date}
              onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
              iconClassName={textSecondary}
              className={`${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border`}
            />
          </div>

          {/* Planned End Date */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Planned End Date <span className="text-red-500">*</span>
            </label>
            <DatePickerInput
              name="planned_end_date"
              value={formData.planned_end_date}
              onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
              min={formData.planned_start_date}
              iconClassName={textSecondary}
              className={`${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border`}
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

              {/* Client Point of Contact Section */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <h3 className={`text-base font-bold mb-4 ${textPrimary}`}>
                  Client Point of Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Name (contact person) */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_point_of_contact_name"
                        value={formData.client_point_of_contact_name}
                        onChange={handleInputChange}
                        placeholder="Enter Client Point of Contact Name"
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

                    {/* Mobile Number with Country Code */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-shrink-0">
                          {isLoadingCountryCodes ? (
                            <div className={`w-24 px-3 py-3 border ${isDark ? 'border-slate-700' : 'border-slate-200'} rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-white'} flex items-center justify-center`}>
                              <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setIsClientCountryDropdownOpen(!isClientCountryDropdownOpen)}
                                className={`flex items-center gap-1.5 px-2 sm:px-3 py-3 border rounded-lg focus:ring-2 focus:ring-[#C2D642]/20 outline-none min-w-[100px] hover:opacity-90 transition-colors ${
                                  isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                {formData.client_country_code && countryCodes.length > 0 ? (
                                  (() => {
                                    const sel = findCountryByDialCode(countryCodes, formData.client_country_code, formData.client_country_code_iso);
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
                                <ChevronDown className={`w-4 h-4 transition-transform ${isClientCountryDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isClientCountryDropdownOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => { setIsClientCountryDropdownOpen(false); setClientCountrySearchQuery(''); }}
                                  />
                                  <div className={`absolute top-full left-0 mt-1 z-[60] w-[min(90vw,288px)] max-h-72 overflow-hidden border rounded-lg shadow-xl flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    {countryCodes.length > 0 ? (
                                      <>
                                        <div className="p-2 border-b border-inherit flex-shrink-0">
                                          <div className="relative">
                                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                                            <input
                                              type="text"
                                              value={clientCountrySearchQuery}
                                              onChange={(e) => setClientCountrySearchQuery(e.target.value)}
                                              placeholder="Search country or code..."
                                              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                              autoFocus
                                              autoComplete="off"
                                            />
                                          </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-52 p-2">
                                          {(() => {
                                            const filtered = countryCodes.filter((cc) => {
                                              const q = clientCountrySearchQuery.trim().toLowerCase();
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
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    client_country_code: countryCode.dialCode,
                                                    client_country_code_iso: countryCode.code,
                                                  }));
                                                  setIsClientCountryDropdownOpen(false);
                                                  setClientCountrySearchQuery('');
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                                  (formData.client_country_code_iso ? formData.client_country_code_iso === countryCode.code : formData.client_country_code === countryCode.dialCode)
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
                        <input
                          type="tel"
                          name="client_mobile"
                          value={formData.client_mobile}
                          onChange={handleInputChange}
                          placeholder="Enter Client Mobile Number"
                          maxLength={10}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                            isDark
                              ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]'
                              : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                          } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${textSecondary}`}>Numbers only, 10 digits</p>
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
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tag Company & Tag Project Incharge - one line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Tag Project Incharge */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                Tag Project Incharge
              </label>
              {isLoadingStaff ? (
                <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${textSecondary}`}>Loading staff...</p>
                </div>
              ) : staff.length > 0 ? (
                <select
                  value={formData.project_incharge}
                  onChange={(e) => handleInchargeChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border font-medium ${
                    isDark
                      ? 'bg-slate-800/50 border-slate-600 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  } focus:ring-2 focus:ring-[#C2D642]/50 focus:border-[#C2D642]`}
                >
                  <option value="">Select Project Incharge</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email || s.id}{s.roleType ? ` (${s.roleType})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${textSecondary}`}>No staff available. Add staff in Admin → User Management → Teams first.</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Project Logo */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Upload Project Logo
            </label>
            <div className="space-y-4">
              {formData.logoPreview ? (
                <div className="flex items-start gap-2">
                  <img
                    src={formData.logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 rounded-xl object-cover border-2 border-[#C2D642]/20 shrink-0"
                  />
                  <button
                    onClick={() => {
                      if (formData.logoPreview) {
                        URL.revokeObjectURL(formData.logoPreview);
                      }
                      setFormData({ ...formData, logo: null, logoPreview: null });
                    }}
                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shrink-0 mt-1"
                    title="Remove logo"
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
            {projectUpdateId ? 'Update' : 'Create'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
