'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { 
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  X,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import CreateCompanyModal from './Modals/CreateCompanyModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface Company {
  id: string; // For display/UI purposes (can be uuid or id)
  numericId?: number | string; // Original numeric ID from database for API calls
  uuid?: string; // UUID if available
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
  updatedAt?: string;
}

interface CompaniesProps {
  theme: ThemeType;
}

const Companies: React.FC<CompaniesProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated, user } = useUser();
  const [showCompanyModal, setShowCompanyModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sortFilter, setSortFilter] = useState<'recent' | 'oldest' | 'none'>('none');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
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

  // Fetch companies from API
  const fetchCompanies = async () => {
    console.log('🔵 fetchCompanies() called');
    console.log('isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.warn('⚠️ Not authenticated, clearing companies');
      setCompanies([]);
      setIsLoadingCompanies(false);
      return;
    }
    
    console.log('✅ Authenticated, fetching companies...');
    setIsLoadingCompanies(true);
    setCompaniesError(null);
    try {
      console.log('=== FETCH COMPANIES START ===');
      console.log('User:', user);
      console.log('User ID:', user?.id);
      console.log('Is Authenticated:', isAuthenticated);
      console.log('Auth Token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');
      console.log('About to call masterDataAPI.getCompanies()...');
      
      const fetchedCompanies = await masterDataAPI.getCompanies();
      console.log('✅ masterDataAPI.getCompanies() returned:', fetchedCompanies);
      
      console.log('=== FETCH COMPANIES DEBUG ===');
      console.log('Fetched companies from API (raw):', fetchedCompanies);
      console.log('Type of fetchedCompanies:', typeof fetchedCompanies);
      console.log('Is array:', Array.isArray(fetchedCompanies));
      console.log('Number of companies fetched:', fetchedCompanies?.length || 0);
      
      // Ensure we have an array
      if (!Array.isArray(fetchedCompanies)) {
        console.error('API did not return an array:', fetchedCompanies);
        console.error('Type:', typeof fetchedCompanies);
        console.error('Value:', JSON.stringify(fetchedCompanies, null, 2));
        setCompanies([]);
        return;
      }
      
      if (fetchedCompanies.length === 0) {
        console.warn('⚠️ No companies returned from API. This might be normal if user has no companies yet.');
        console.warn('User ID:', user?.id);
        console.warn('Check if backend is filtering correctly by user_id');
      } else {
        console.log('✅ Companies found:', fetchedCompanies.length);
        fetchedCompanies.forEach((company, index) => {
          console.log(`Company ${index + 1}:`, {
            id: company.id || company.uuid,
            name: company.registration_name || company.name,
            code: company.code,
            user_id: company.user_id || company.created_by || 'not shown'
          });
        });
      }
      console.log('=============================');
      
      // Transform API response to match Company interface
      const transformedCompanies = fetchedCompanies.map((company: any) => {
        const companyName = company.registration_name || company.name || '';
        const logoUrl = company.logo || company.logo_url;
        // Use default avatar if no logo is provided
        const defaultLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=128`;
        
        // Preserve original numeric ID for API calls (backend expects numeric id)
        // API returns: { id: 107, uuid: "ecfa3c96-..." }
        const numericId = company.id; // This is the numeric ID from database (e.g., 107)
        const uuid = company.uuid; // UUID if available (e.g., "ecfa3c96-...")
        
        // Validate numericId exists and is numeric
        if (!numericId && !uuid) {
          console.warn('⚠️ Company missing both id and uuid:', company);
        }
        
        const transformed = {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store original numeric ID for API calls (MUST be numeric)
          uuid: uuid, // Store UUID if available
          name: companyName,
          code: company.code || '',
          address: company.registered_address || company.address || '',
          registrationNo: company.company_registration_no || company.registration_no || company.registrationNo || '',
          logo: logoUrl || defaultLogo,
          contact: company.phone || company.contact || '',
          email: company.email || '',
          status: company.is_active === 1 || company.is_active === true ? 'Active' : 'Inactive',
          projects: company.projects_count || company.projects || 0,
          employees: company.employees_count || company.employees || 0,
          createdAt: company.created_at || company.createdAt,
          updatedAt: company.updated_at || company.updatedAt,
        };
        console.log('Transforming company:', {
          raw: company,
          transformed: transformed,
          idFields: {
            originalId: company.id,
            originalUuid: company.uuid,
            transformedId: transformed.id,
            transformedNumericId: transformed.numericId,
            transformedUuid: transformed.uuid
          }
        });
        return transformed;
      });
      
      console.log('Transformed companies:', transformedCompanies);
      console.log('Setting companies state with', transformedCompanies.length, 'companies');
      setCompanies(transformedCompanies);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
      setCompaniesError(err.message || 'Failed to load companies');
      setCompanies([]);
      toast.showError(err.message || 'Failed to load companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  // Fetch all projects to count projects per company
  const fetchAllProjects = async () => {
    if (!isAuthenticated) {
      setAllProjects([]);
      return;
    }
    
    setIsLoadingProjects(true);
    try {
      console.log('📦 Fetching all projects for company project count...');
      const projects = await masterDataAPI.getProjects();
      console.log('✅ Fetched projects for company count:', projects?.length || 0);
      setAllProjects(projects || []);
    } catch (error: any) {
      console.error('Failed to fetch projects for company count:', error);
      setAllProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load companies from API on mount and when auth changes
  useEffect(() => {
    fetchCompanies();
    fetchAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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

  const handleCompanyCreated = async (newCompany: Company) => {
    // Refresh companies list from API
    await fetchCompanies();
    // Refresh projects to update project counts
    await fetchAllProjects();
    toast.showSuccess('Company created successfully!');
  };

  // Listen for companiesUpdated event
  useEffect(() => {
    const handleCompaniesUpdated = () => {
      const savedCompanies = localStorage.getItem('companies');
      if (savedCompanies) {
        try {
          const parsed = JSON.parse(savedCompanies);
          setCompanies(parsed);
        } catch (e) {
          setCompanies([]);
        }
      }
    };

    window.addEventListener('companiesUpdated', handleCompaniesUpdated);
    return () => {
      window.removeEventListener('companiesUpdated', handleCompaniesUpdated);
    };
  }, []);

  const handleCloseModal = () => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setShowCompanyModal(false);
    setEditingCompanyId(null);
    setViewingCompanyId(null);
    setFormData({
      registrationName: '',
      registeredAddress: '',
      companyRegistrationNo: '',
      logo: null,
      logoPreview: null
    });
  };

  useEffect(() => {
    return () => {
      if (formData.logoPreview) {
        URL.revokeObjectURL(formData.logoPreview);
      }
    };
  }, [formData.logoPreview]);

  const handleViewCompany = (company: Company) => {
    setViewingCompanyId(company.id);
    setShowCompanyModal(true);
  };

  const handleEditCompany = async (company: Company) => {
    console.log('📝 Editing company:', {
      id: company.id,
      numericId: company.numericId,
      uuid: company.uuid,
      name: company.name,
      idType: typeof company.id,
      numericIdType: typeof company.numericId
    });
    
    // Backend expects numeric ID, not UUID
    // Use numericId if available, otherwise fall back to id (which might be numeric)
    const companyId = company.numericId || company.id;
    if (!companyId) {
      toast.showError('Invalid company ID. Cannot edit company.');
      return;
    }
    
    console.log('Using company ID for API call:', companyId, 'Type:', typeof companyId);
    
    setEditingCompanyId(String(companyId)); // Store as string for consistency
    setViewingCompanyId(null);
    
    // Fetch full company details from API using GET /companies-edit/{id}
    // Backend uses where('id', $uuid) so it expects the numeric id field
    try {
      const companyData = await masterDataAPI.getCompany(String(companyId));
      console.log('✅ Fetched company data from API:', companyData);
      console.log('Company data type:', typeof companyData);
      console.log('Company data is null?', companyData === null);
      console.log('Company data keys:', companyData ? Object.keys(companyData) : 'null');
      
      // Check if companyData is null or empty
      if (!companyData || (typeof companyData === 'object' && Object.keys(companyData).length === 0)) {
        console.warn('⚠️ Company data is null or empty, using fallback data');
        // Fallback to existing company data
        setFormData({
          registrationName: company.name,
          registeredAddress: company.address,
          companyRegistrationNo: company.registrationNo,
          logo: null,
          logoPreview: company.logo || null
        });
        setShowCompanyModal(true);
        return;
      }
      
      // Safely extract data with null checks
      setFormData({
        registrationName: companyData?.registration_name || companyData?.name || company.name || '',
        registeredAddress: companyData?.registered_address || companyData?.address || company.address || '',
        companyRegistrationNo: companyData?.company_registration_no || companyData?.registration_no || company.registrationNo || '',
        logo: null,
        logoPreview: companyData?.logo || companyData?.logo_url || company.logo || null
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch company details:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Show error message to user
      const errorMsg = error.message || 'Failed to load company details from server';
      toast.showError(errorMsg);
      
      // Fallback to existing company data
      setFormData({
        registrationName: company.name || '',
        registeredAddress: company.address || '',
        companyRegistrationNo: company.registrationNo || '',
        logo: null,
        logoPreview: company.logo || null
      });
      
      // Still open the modal with cached data
      setShowCompanyModal(true);
      return;
    }
    
    setShowCompanyModal(true);
  };

  const handleUpdateCompany = async () => {
    const missingFields: string[] = [];
    
    if (!formData.registrationName.trim()) missingFields.push('Company Name');
    if (!formData.registeredAddress.trim()) missingFields.push('Reg Address');
    
    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return;
    }

    if (!editingCompanyId) {
      toast.showError('No company selected for editing.');
      return;
    }

    try {
      console.log('📝 Updating company:', {
        id: editingCompanyId,
        idType: typeof editingCompanyId,
        formData: {
          registrationName: formData.registrationName,
          registeredAddress: formData.registeredAddress,
          companyRegistrationNo: formData.companyRegistrationNo,
          hasLogo: !!formData.logo
        }
      });
      
      // Prepare FormData for API - matching database field names
      const updateData = new FormData();
      updateData.append('registration_name', formData.registrationName);
      updateData.append('registered_address', formData.registeredAddress);
      updateData.append('company_registration_no', formData.companyRegistrationNo);
      
      if (formData.logo) {
        updateData.append('logo', formData.logo);
      }

      // Use editingCompanyId which should be the numeric ID
      console.log('Updating company with ID:', editingCompanyId);
      await masterDataAPI.updateCompany(editingCompanyId, updateData);
      
      // Refresh companies list
      await fetchCompanies();
      // Refresh projects to update project counts
      await fetchAllProjects();
      handleCloseModal();
      setEditingCompanyId(null);
      toast.showSuccess('Company updated successfully!');
    } catch (error: any) {
      console.error('❌ Error updating company:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        errors: error.errors,
        fullError: error
      });
      
      // Extract error message from various possible locations
      const errorMessage = error.message || 
                          error.response?.data?.message || 
                          error.response?.data?.error ||
                          (error.errors && Object.values(error.errors).flat().join(', ')) ||
                          'Company Update/Creation Failed';
      
      toast.showError(errorMessage);
    }
  };

  const handleDeleteCompany = async (companyId: string | null) => {
    console.log('🗑️ handleDeleteCompany called with companyId:', companyId);
    console.log('🗑️ Current companies array length:', companies.length);
    
    if (!companyId) {
      console.error('❌ No companyId provided');
      toast.showError('No company selected for deletion.');
      return;
    }
    
    // Find the company to get its UUID
    console.log('🗑️ Searching for company with id:', companyId);
    console.log('🗑️ Available company IDs:', companies.map(c => ({ id: c.id, uuid: c.uuid, name: c.name })));
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      console.error('❌ Company not found:', companyId);
      console.error('❌ Available companies:', companies);
      toast.showError('Company not found. Please refresh the page and try again.');
      return;
    }
    
    console.log('✅ Company found:', company);
    
    // Backend delete function uses: where('id', $uuid)
    // Even though route parameter is named {uuid}, backend queries the numeric 'id' column
    // So we need to send the numeric ID, not the UUID
    let numericId: number | string | null = company.numericId ?? null;
    
    // Fallback: if numericId is not set, try to extract from company.id
    if (!numericId) {
      // Check if company.id is numeric (not a UUID)
      if (company.id && !isNaN(Number(company.id)) && !company.id.includes('-')) {
        numericId = Number(company.id);
        console.warn('⚠️ Using company.id as numericId:', numericId);
      } else {
        console.error('❌ No numeric ID found for company:', {
          company,
          id: company.id,
          numericId: company.numericId,
          uuid: company.uuid
        });
        toast.showError('Invalid company ID. Cannot delete company. Please refresh the page.');
        return;
      }
    }
    
    console.log('🗑️ Deleting company - Numeric ID extraction:', {
      companyId, // The ID used to find the company
      numericId, // The numeric ID to send to API
      companyName: company.name,
      numericIdType: typeof numericId,
      companyDetails: {
        id: company.id, // Display ID (UUID if available)
        uuid: company.uuid, // UUID from API response
        numericId: company.numericId, // Numeric ID from database
        name: company.name
      },
      validation: {
        hasNumericId: !!company.numericId,
        numericIdValue: company.numericId,
        extractedNumericId: numericId,
        isNumericIdValid: numericId !== null && numericId !== undefined
      }
    });
    
    if (!numericId || (typeof numericId === 'number' && isNaN(numericId))) {
      console.error('❌ Invalid numeric ID for company:', {
        company,
        extractedNumericId: numericId,
        companyNumericId: company.numericId,
        companyId: companyId
      });
      toast.showError('Invalid company ID. Cannot delete company. Please refresh the page.');
      return;
    }
    
    try {
      // Backend route: DELETE /companies-delete/{uuid}
      // But backend function uses where('id', $uuid) which queries numeric 'id' column
      // So we send the numeric ID even though route parameter is named {uuid}
      console.log('🗑️ Calling delete API with numeric ID:', numericId);
      await masterDataAPI.deleteCompany(String(numericId));
      console.log('✅ Company deleted successfully');
      
      // Refresh companies list
      await fetchCompanies();
      // Refresh projects to update project counts
      await fetchAllProjects();
      setDeleteConfirmId(null);
      if (viewingCompanyId === companyId) {
        setViewingCompanyId(null);
        setShowCompanyModal(false);
      }
      toast.showSuccess('Company deleted successfully!');
    } catch (error: any) {
      console.error('❌ Error deleting company:', error);
      console.error('Error status:', error.status);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        fullError: error
      });
      
      const errorMsg = error.message || 
                      error.response?.data?.message ||
                      error.response?.data?.error ||
                      'Failed to delete company. Please try again.';
      toast.showError(errorMsg);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-trigger')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search companies using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all companies
      await fetchCompanies();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchCompanies(query);
      // Transform API response to match Company interface - matching database field names
      const transformedCompanies = searchResults.map((company: any) => ({
        id: company.uuid || company.id,
        numericId: company.id, // Store numeric ID if available
        uuid: company.uuid, // Store UUID if available
        name: company.registration_name || company.name || '',
        code: company.code || '',
        address: company.registered_address || company.address || '',
        registrationNo: company.company_registration_no || company.registration_no || company.registrationNo || '',
        logo: company.logo || company.logo_url || '',
        contact: company.phone || company.contact || '',
        email: company.email || '',
        status: company.is_active === 1 || company.is_active === true ? 'Active' : 'Inactive',
        projects: company.projects_count || company.projects || 0,
        employees: company.employees_count || company.employees || 0,
        createdAt: company.created_at || company.createdAt,
        updatedAt: company.updated_at || company.updatedAt,
      }));
      setCompanies(transformedCompanies);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.showError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchCompanies();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Memoize sorted companies
  const sortedCompanies = useMemo(() => {
    let allCompanies = [...companies];
    
    // Client-side filtering is now optional since we're using API search
    if (searchQuery.trim() && !isSearching) {
      allCompanies = allCompanies.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortFilter === 'recent') {
      // Sort by newest: Use the most recent date between createdAt and updatedAt
      allCompanies = [...allCompanies].sort((a, b) => {
        // Get the most recent date for each company (updatedAt if available, otherwise createdAt)
        const getMostRecentDate = (company: Company): number => {
          const createdDate = company.createdAt ? new Date(company.createdAt).getTime() : 0;
          const updatedDate = company.updatedAt ? new Date(company.updatedAt).getTime() : 0;
          // Return the most recent date (larger timestamp)
          return Math.max(createdDate, updatedDate);
        };
        
        const dateA = getMostRecentDate(a);
        const dateB = getMostRecentDate(b);
        return dateB - dateA; // Descending order (newest first)
      });
    } else if (sortFilter === 'oldest') {
      // Sort by oldest: Use createdAt (oldest creation date)
      allCompanies = [...allCompanies].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB; // Ascending order (oldest first)
      });
    }
    
    return allCompanies;
  }, [companies, sortFilter, searchQuery, isSearching]);

  const viewingCompany = viewingCompanyId 
    ? companies.find(c => c.id === viewingCompanyId)
    : null;
  
  // Calculate projects count for viewing company
  // Priority: Use count from API response (company.projects), otherwise count from allProjects
  const viewingCompanyProjectsCount = useMemo(() => {
    if (!viewingCompany) {
      return 0;
    }
    
    // First priority: Use the projects count from the API response (from companies-list)
    // This is the most accurate count from the backend
    if (viewingCompany.projects !== undefined && viewingCompany.projects !== null) {
      console.log(`📊 Using API projects count for company "${viewingCompany.name}":`, viewingCompany.projects);
      return viewingCompany.projects;
    }
    
    // Fallback: Count projects where companies_id matches the company's numeric ID
    if (allProjects.length > 0 && viewingCompany.numericId) {
      const companyNumericId = viewingCompany.numericId;
      const count = allProjects.filter((project: any) => {
        // Match by numeric ID (companies_id is numeric in the database)
        const projectCompanyId = project.companies_id || project.company_id;
        return String(projectCompanyId) === String(companyNumericId);
      }).length;
      
      console.log(`📊 Calculated projects count for company "${viewingCompany.name}" (numericId: ${companyNumericId}):`, count);
      return count;
    }
    
    // If projects are still loading, return 0
    if (isLoadingProjects) {
      return 0;
    }
    
    return 0;
  }, [viewingCompany, allProjects, isLoadingProjects]);

  const handleDownloadExcel = () => {
    const headers = ['SR No', 'Company Name', 'Code', 'Address', 'Registration No', 'Contact', 'Email', 'Status', 'Projects', 'Employees'];
    const rows = sortedCompanies.map((company, idx) => [
      idx + 1,
      company.name,
      company.code,
      company.address,
      company.registrationNo,
      company.contact || '-',
      company.email || '-',
      company.status,
      company.projects?.toString() || '0',
      company.employees?.toString() || '0'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Companies');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `companies_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header: 1. Icon + Heading, 2. Description, 3. Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Companies</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage company information and details
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <button 
            onClick={handleDownloadExcel}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setSearchQuery('');
              fetchCompanies();
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Refresh Companies List"
          >
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{sortedCompanies.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{sortedCompanies.filter(c => c.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 min-w-0 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
        <div className="relative filter-dropdown">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all filter-trigger ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <Filter className="w-4 h-4" /> 
            Filter
            {sortFilter !== 'none' && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'}`}>
                {sortFilter === 'recent' ? 'Recent' : 'Oldest'}
              </span>
            )}
          </button>
          {showFilterDropdown && (
            <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg z-20 filter-dropdown ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="py-1">
                <button
                  onClick={() => {
                    setSortFilter('none');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'none'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  None
                </button>
                <button
                  onClick={() => {
                    setSortFilter('recent');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'recent'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => {
                    setSortFilter('oldest');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold transition-colors text-left ${
                    sortFilter === 'oldest'
                      ? isDark ? 'bg-[#C2D642]/20 text-[#C2D642]' : 'bg-[#C2D642]/10 text-[#C2D642]'
                      : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingCompanies && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642] mx-auto mb-4"></div>
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Companies...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your companies.</p>
        </div>
      )}

      {/* Error State */}
      {companiesError && !isLoadingCompanies && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Companies</h3>
          <p className={`text-sm ${textSecondary}`}>{companiesError}</p>
          <button 
            onClick={fetchCompanies} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Companies Bars View */}
      {!isLoadingCompanies && !companiesError && sortedCompanies.length > 0 ? (
        <div className="space-y-2">
          {sortedCompanies.map((company, idx) => (
            <div 
              key={company.id || idx} 
              onClick={() => handleViewCompany(company)}
              className={`rounded-lg border ${cardClass} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isDark ? 'hover:border-[#C2D642]/30' : 'hover:border-[#C2D642]/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className={`text-xs font-bold ${textSecondary} flex-shrink-0 w-6`}>{idx + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={company.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=6366f1&color=fff&size=128`}
                      alt={company.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <h3 className={`text-base font-black ${textPrimary} truncate`}>{company.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Companies Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first company</p>
        </div>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        onSuccess={async () => {
          console.log('=== COMPANY CREATED - REFRESHING LIST ===');
          // Clear search query to show all companies including the new one
          setSearchQuery('');
          // Small delay to ensure database transaction is committed
          console.log('Waiting 500ms for database transaction...');
          await new Promise(resolve => setTimeout(resolve, 500));
          // Reload companies from API
          console.log('Calling fetchCompanies()...');
          try {
            await fetchCompanies();
            // Refresh projects to update project counts
            await fetchAllProjects();
            console.log('fetchCompanies() completed successfully');
          } catch (error) {
            console.error('Error refreshing companies list:', error);
            toast.showError('Company created but failed to refresh list. Please refresh the page.');
          }
          // Close the modal after refresh completes
          console.log('Closing modal...');
          setShowCreateModal(false);
          console.log('=== REFRESH COMPLETE ===');
        }}
        userCompanies={companies}
        onCompanyCreated={handleCompanyCreated}
      />

      {/* Edit/View Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl border ${cardClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b border-inherit`}>
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>
                  {viewingCompanyId ? 'Company Details' : 'Edit Company'}
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  {viewingCompanyId ? 'View company information' : 'Update company details below'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>

            {/* Modal Body */}
            {viewingCompanyId && viewingCompany ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 flex-shrink-0">
                    <img 
                      src={viewingCompany.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingCompany.name)}&background=6366f1&color=fff&size=128`}
                      alt={viewingCompany.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingCompany.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-black ${textPrimary} mb-1`}>{viewingCompany.name}</h3>
                    <p className={`text-sm font-bold ${textSecondary} uppercase tracking-wider`}>Code: {viewingCompany.code}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Registration Name
                    </label>
                    <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.name}</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Registered Address
                    </label>
                    <p className={`text-sm ${textSecondary}`}>{viewingCompany.address}</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Company Registration No
                    </label>
                    <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.registrationNo}</p>
                  </div>

                  {viewingCompany.contact && (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Contact
                      </label>
                      <p className={`text-sm font-bold ${textPrimary}`}>{viewingCompany.contact}</p>
                    </div>
                  )}

                  {viewingCompany.email && (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Email
                      </label>
                      <p className={`text-sm ${textSecondary}`}>{viewingCompany.email}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-inherit">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Projects
                      </label>
                      <p className={`text-xl font-black ${textPrimary}`}>
                        {isLoadingProjects ? (
                          <span className="text-sm opacity-50">Loading...</span>
                        ) : (
                          viewingCompanyProjectsCount
                        )}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                        Employees
                      </label>
                      <p className={`text-xl font-black ${textPrimary}`}>{viewingCompany.employees || 0}</p>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                      Status
                    </label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                      viewingCompany.status === 'Active' 
                        ? 'bg-[#C2D642]/20 text-[#C2D642]' 
                        : 'bg-slate-500/20 text-slate-500'
                    }`}>
                      {viewingCompany.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : editingCompanyId ? (
              <div className="p-6 space-y-6">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Company Name <span className="text-red-500">*</span>
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

                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Reg Address <span className="text-red-500">*</span>
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

                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Reg No. (Optional)
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
                          <p className={`text-xs ${textSecondary} mt-1`}>PNG, JPG, GIF up to 10MB</p>
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
            ) : null}

            {/* Modal Footer */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
              {viewingCompanyId ? (
                <>
                  <button
                    onClick={handleCloseModal}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      isDark
                        ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                    }`}
                  >
                    Close
                  </button>
                  {viewingCompany && (
                    <>
                      <button
                        onClick={() => {
                          handleEditCompany(viewingCompany);
                        }}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          console.log('🗑️ Delete button clicked from modal for company:', viewingCompany.id);
                          setDeleteConfirmId(viewingCompany.id);
                          handleCloseModal();
                        }}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseModal}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      isDark
                        ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCompany}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642] text-white transition-all shadow-md"
                  >
                    Update
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl border ${cardClass} shadow-2xl`}>
            <div className={`p-6 border-b border-inherit`}>
              <h2 className={`text-xl font-black ${textPrimary}`}>Delete Company</h2>
              <p className={`text-sm ${textSecondary} mt-1`}>
                Are you sure you want to delete this company? This action cannot be undone.
              </p>
            </div>
            <div className={`flex items-center justify-end gap-3 p-6`}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('🗑️ Delete button clicked!');
                  console.log('deleteConfirmId:', deleteConfirmId);
                  if (deleteConfirmId) {
                    console.log('🗑️ Calling handleDeleteCompany with:', deleteConfirmId);
                    try {
                      await handleDeleteCompany(deleteConfirmId);
                    } catch (error) {
                      console.error('❌ Error in delete button onClick:', error);
                    }
                  } else {
                    console.error('❌ No deleteConfirmId set!');
                    toast.showError('No company selected for deletion.');
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
