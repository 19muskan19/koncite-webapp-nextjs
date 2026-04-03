'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ThemeType } from '../../types';
import { teamsAPI } from '../../services/api';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { 
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Settings,
  User,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { sortCountryCodes, findCountryByDialCode } from '@/utils/countryCodeUtils';
import { getProfileImageUrl, getInitialsAvatarUrl } from '@/utils/imageUtils';
import TeamMemberPermissionsModal, {
  type TeamPermissionApiContext,
} from '@/components/company-users/TeamMemberPermissionsModal';
import { unwrapPermissionMatrixPayload } from '@/utils/unwrapPermissionMatrixPayload';

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

const getFlagUrl = (countryCode: string) =>
  `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;

interface UserData {
  id: string;
  uuid?: string;
  profilePhoto: string;
  name: string;
  email: string;
  contactNumber: string;
  roleType: string;
  designation?: string;
  /** Matches select option value; prefer this over role name when opening edit */
  company_role_id?: string;
  address?: string;
  country_code?: string;
  reporting_person_id?: number | string;
  reportingPerson: {
    name: string;
    role: string;
  };
  status: boolean;
}

interface ManageTeamsProps {
  theme: ThemeType;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const ROLE_ID_TO_NAME: Record<string, string> = {
  '1': 'Super Admin',
  '2': 'Project Manager',
  '3': 'Site Engineer',
  '4': 'Store Keepers',
  '5': 'Supervisor',
};

type StaffFormFields = {
  name: string;
  email: string;
  country_code: string;
  country_code_iso: string;
  phone: string;
  address: string;
  company_user_role: string;
  designation: string;
  reporting_person: string;
  password: string;
  confirmPassword: string;
  profile_images: File | null;
  country: string;
  state: string;
  city: string;
};

const emptyStaffForm = (): StaffFormFields => ({
  name: '',
  email: '',
  country_code: '',
  country_code_iso: '',
  phone: '',
  address: '',
  company_user_role: '',
  designation: '',
  reporting_person: '',
  password: '',
  confirmPassword: '',
  profile_images: null,
  country: '',
  state: '',
  city: '',
});

/** Map GET teams-edit / TeamsResources payload into modal form (ids for country/state/city for update) */
function buildFormFromStaffApi(apiUser: any, countryCodes: CountryCode[]): StaffFormFields {
  const roleId = String(
    apiUser.company_role_id ?? apiUser.company_role?.id ?? apiUser.role_id ?? apiUser.company_user_role ?? ''
  );
  const designationTrim = (apiUser.designation && String(apiUser.designation).trim()) || '';
  const rp = apiUser.reporting_person ?? apiUser.reportingPerson;
  const rpIdExplicit = apiUser.reporting_person_id ?? apiUser.reportingPersonId;
  let reportingSelect = '';
  if (typeof rp === 'object' && rp != null && 'id' in rp && (rp as { id?: unknown }).id != null) {
    reportingSelect = String((rp as { id: unknown }).id);
  } else if (rp != null && String(rp).trim() !== '') {
    const s = String(rp).trim();
    reportingSelect = /^\d+$/.test(s) ? s : rpIdExplicit != null ? String(rpIdExplicit) : '';
  } else if (rpIdExplicit != null) {
    reportingSelect = String(rpIdExplicit);
  }
  const phoneRaw = apiUser.phone || apiUser.contact_number || '';
  const phoneDigits = String(phoneRaw).replace(/\D/g, '').slice(0, 10);
  const dial = String(apiUser.country_code ?? apiUser.countryCode ?? '')
    .replace(/^\+/, '')
    .trim();

  const countryObj = apiUser.countries ?? apiUser.country;
  const stateObj = apiUser.states ?? apiUser.state;
  const cityObj = apiUser.cities ?? apiUser.city;
  const pickId = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'object' && v !== null && 'id' in v && (v as { id: unknown }).id != null) {
      return String((v as { id: unknown }).id);
    }
    return String(v);
  };
  const countryId = pickId(countryObj);
  const stateId = pickId(stateObj);
  const cityId = pickId(cityObj);

  let country_code_iso = '';
  if (dial && countryCodes.length > 0) {
    const hit = findCountryByDialCode(countryCodes, dial, undefined);
    country_code_iso = hit?.code ?? '';
  }

  return {
    name: apiUser.name || '',
    email: apiUser.email || '',
    country_code: dial,
    country_code_iso,
    phone: phoneDigits,
    address: apiUser.address || '',
    company_user_role: roleId,
    designation: designationTrim,
    reporting_person: reportingSelect,
    password: '',
    confirmPassword: '',
    profile_images: null,
    country: countryId,
    state: stateId,
    city: cityId,
  };
}

/** When API sends reporting_person as a display name (e.g. "Stacy"), map to a user id from the current team list */
function resolveReportingPersonIdByTeamList(
  excludeUserId: string,
  currentId: string,
  nameHint: string | undefined,
  teamUsers: UserData[]
): string {
  const idTrim = String(currentId || '').trim();
  if (idTrim && /^\d+$/.test(idTrim)) return idTrim;
  const hint = nameHint?.trim();
  if (!hint || teamUsers.length === 0) return idTrim;
  const lower = hint.toLowerCase();
  const exact = teamUsers.find((u) => u.id !== excludeUserId && u.name.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const contains = teamUsers.find(
    (u) =>
      u.id !== excludeUserId &&
      (u.name.trim().toLowerCase().includes(lower) || lower.includes(u.name.trim().toLowerCase()))
  );
  return contains ? contains.id : '';
}

function mapApiStaffToUserData(apiUser: any): UserData {
  const id = String(apiUser.id ?? apiUser.uuid ?? '');
  const uuid = apiUser.uuid ? String(apiUser.uuid) : undefined;
  const profilePhoto = getProfileImageUrl(
    apiUser.profile_image ?? apiUser.profile_images ?? apiUser.avatar ?? apiUser.profile_picture,
    apiUser.name || ''
  );
  const rpRaw = apiUser.reporting_person ?? apiUser.reportingPerson;
  const rpIdExplicit =
    apiUser.reporting_person_id ?? apiUser.reporting_person_user_id ?? apiUser.reportingPersonId ?? null;

  let reporting_person_id: number | string | undefined;
  let reportingPerson: { name: string; role: string };

  if (rpRaw != null && typeof rpRaw === 'object' && !Array.isArray(rpRaw)) {
    const o = rpRaw as { id?: unknown; name?: string; role?: string; designation?: string };
    const oid = o.id != null ? String(o.id) : rpIdExplicit != null ? String(rpIdExplicit) : undefined;
    reporting_person_id = oid;
    reportingPerson = {
      name: o.name || '—',
      role: o.role ?? o.designation ?? '—',
    };
  } else if (rpRaw != null && String(rpRaw).trim() !== '') {
    const str = String(rpRaw).trim();
    const isNumericId = /^\d+$/.test(str);
    if (isNumericId) {
      reporting_person_id = str;
      const labelName =
        apiUser.reporting_person_name ?? apiUser.reportingPersonName ?? apiUser.reporting_person_label ?? '';
      reportingPerson = { name: labelName, role: '' };
    } else {
      reporting_person_id = rpIdExplicit != null ? String(rpIdExplicit) : undefined;
      reportingPerson = {
        name: str,
        role:
          apiUser.reporting_person_role ??
          apiUser.reportingPersonRole ??
          '',
      };
    }
  } else {
    reporting_person_id = rpIdExplicit != null ? String(rpIdExplicit) : undefined;
    const fallbackName =
      apiUser.reporting_person_name ?? apiUser.reportingPersonName ?? apiUser.reporting_person_label ?? '';
    reportingPerson = {
      name: fallbackName || '—',
      role: '',
    };
  }

  const roleId = String(apiUser.company_role_id ?? apiUser.company_role?.id ?? apiUser.role_id ?? '');
  const designationVal = (apiUser.designation && String(apiUser.designation).trim()) || '';
  const roleType =
    (apiUser.company_role?.name ?? apiUser.role_type ?? ROLE_ID_TO_NAME[roleId] ?? '').trim() || 'N/A';
  return {
    id,
    uuid,
    profilePhoto,
    name: apiUser.name || '',
    email: apiUser.email || '',
    contactNumber: apiUser.phone || apiUser.contact_number || '',
    roleType,
    designation: designationVal || undefined,
    company_role_id: roleId || undefined,
    address: apiUser.address,
    reporting_person_id,
    reportingPerson,
    status: apiUser.is_active !== false,
    country_code: apiUser.country_code || apiUser.countryCode || '',
  };
}

const ManageTeams: React.FC<ManageTeamsProps> = ({ theme }) => {
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserData | null>(null);
  const [teamPermissionApi, setTeamPermissionApi] = useState<TeamPermissionApiContext | null>(null);
  const [permissionsLoadingUserId, setPermissionsLoadingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [useApiData, setUseApiData] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState<StaffFormFields>(() => emptyStaffForm());
  const [isLoadingEditForm, setIsLoadingEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountryCodes, setIsLoadingCountryCodes] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Bump when closing modal so late teams-edit responses do not overwrite form */
  const editLoadGenerationRef = useRef(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  /** Raw profile path/URL from API while editing (shown until user picks a new file) */
  const [existingProfilePhotoRaw, setExistingProfilePhotoRaw] = useState<string | null>(null);
  const [reportingPersonMatchNote, setReportingPersonMatchNote] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (formData.profile_images) {
      const url = URL.createObjectURL(formData.profile_images);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreviewUrl(null);
  }, [formData.profile_images]);
  const { user: currentUser } = useUser();
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default users
  const defaultUsers = useMemo((): UserData[] => [
    { 
      id: '1',
      profilePhoto: 'https://ui-avatars.com/api/?name=test&background=6B8E23&color=fff&size=128',
      name: 'test',
      email: 'testsouma@koncit.com',
      contactNumber: '2365480111',
      roleType: 'Project Manager',
      designation: '',
      address: '',
      reporting_person_id: undefined,
      reportingPerson: {
        name: 'Rahul Rao S',
        role: 'Manager'
      },
      status: true
    },
  ], []);

  const resolveReportingPersonNames = (list: UserData[]): UserData[] => {
    const byId = new Map(list.map((u) => [u.id, u]));
    return list.map((u) => {
      const rpId = u.reporting_person_id;
      if (rpId) {
        const rpUser = byId.get(String(rpId));
        if (rpUser) {
          return {
            ...u,
            reportingPerson: { name: rpUser.name, role: rpUser.roleType },
          };
        }
      }
      return {
        ...u,
        reportingPerson: {
          name: u.reportingPerson.name || '—',
          role: u.reportingPerson.role ?? '',
        },
      };
    });
  };

  const fetchStaffList = () => {
    setIsLoadingUsers(true);
    teamsAPI.getTeamsList()
      .then((apiData) => {
        const mapped = (Array.isArray(apiData) ? apiData : []).map(mapApiStaffToUserData);
        const resolved = resolveReportingPersonNames(mapped);
        setUsers(resolved);
        setUseApiData(true);
      })
      .catch(() => {
        const savedUsers = localStorage.getItem('manageTeamsUsers');
        if (savedUsers) {
          try {
            setUsers(JSON.parse(savedUsers));
          } catch (e) {
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
        setUseApiData(false);
      })
      .finally(() => setIsLoadingUsers(false));
  };

  // Load staff from API on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoadingUsers(true);
    teamsAPI.getTeamsList()
      .then((apiData) => {
        if (cancelled) return;
        const mapped = (Array.isArray(apiData) ? apiData : []).map(mapApiStaffToUserData);
        const resolved = resolveReportingPersonNames(mapped);
        setUsers(resolved);
        setUseApiData(true);
      })
      .catch(() => {
        if (cancelled) return;
        const savedUsers = localStorage.getItem('manageTeamsUsers');
        if (savedUsers) {
          try {
            setUsers(JSON.parse(savedUsers));
          } catch (e) {
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
        setUseApiData(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Load roles from GET /role-list (company-scoped)
  const fetchRoleList = useCallback(() => {
    teamsAPI
      .getRoleList()
      .then((list) => {
        const mapped = (Array.isArray(list) ? list : []).map((r) => ({
          id: String(r.id),
          name: r.name || 'Role',
        }));
        setAvailableRoles(mapped);
      })
      .catch(() => {
        setAvailableRoles([]);
      });
  }, []);

  useEffect(() => {
    fetchRoleList();
    const handleRolesUpdate = () => fetchRoleList();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRoles') fetchRoleList();
    };
    window.addEventListener('rolesUpdated', handleRolesUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('rolesUpdated', handleRolesUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchRoleList]);

  useEffect(() => {
    if (showUserModal) fetchRoleList();
  }, [showUserModal, fetchRoleList]);

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

  const fetchCountryCodes = async () => {
    setIsLoadingCountryCodes(true);
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();
      const fromApi: CountryCode[] = data
        .filter((c: any) => c.idd?.root && c.cca2)
        .map((c: any) => ({
          code: c.cca2,
          dialCode: parseDialCode(c),
          name: c.name?.common || c.name?.official || '',
          flag: c.flags?.png || getFlagUrl(c.cca2),
        }))
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
    if (showUserModal && countryCodes.length === 0 && !isLoadingCountryCodes) {
      fetchCountryCodes();
    }
  }, [showUserModal]);

  /** When country list loads after edit form is filled, resolve flag dropdown ISO from dial code once */
  useEffect(() => {
    if (!showUserModal || !editingUserId || countryCodes.length === 0) return;
    setFormData((prev) => {
      if (!prev.country_code || prev.country_code_iso) return prev;
      const hit = findCountryByDialCode(countryCodes, prev.country_code, undefined);
      if (!hit) return prev;
      return { ...prev, country_code_iso: hit.code };
    });
  }, [showUserModal, editingUserId, countryCodes]);

  const roleSelectOptions = useMemo(() => {
    const base = [...availableRoles];
    if (
      editingUserId &&
      formData.company_user_role &&
      !base.some((r) => r.id === formData.company_user_role)
    ) {
      base.push({
        id: formData.company_user_role,
        name: `Role (${formData.company_user_role})`,
      });
    }
    return base;
  }, [availableRoles, editingUserId, formData.company_user_role]);

  // Save users to localStorage only when using local data (not API)
  useEffect(() => {
    if (useApiData) return;
    const defaultIds = ['1'];
    const userUsers = users.filter(u => !defaultIds.includes(u.id));
    if (userUsers.length > 0) {
      try {
        localStorage.setItem('manageTeamsUsers', JSON.stringify(userUsers));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    } else {
      localStorage.removeItem('manageTeamsUsers');
    }
  }, [users, useApiData]);

  // Combine default and user-added users (only when using localStorage fallback)
  const allUsers = useMemo(() => {
    return useApiData ? users : [...defaultUsers, ...users];
  }, [defaultUsers, users, useApiData]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = allUsers.filter(user =>
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.contactNumber || '').includes(searchQuery) ||
      (user.roleType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.reportingPerson?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = (a as unknown as Record<string, unknown>)[sortConfig.key];
        let bValue: any = (b as unknown as Record<string, unknown>)[sortConfig.key];

        if (sortConfig.key === 'reportingPerson') {
          aValue = a.reportingPerson.name;
          bValue = b.reportingPerson.name;
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allUsers, searchQuery, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, profile_images: file }));
  };

  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, profile_images: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => {
    editLoadGenerationRef.current += 1;
    setShowUserModal(false);
    setEditingUserId(null);
    setIsSubmitting(false);
    setIsLoadingEditForm(false);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');
    setExistingProfilePhotoRaw(null);
    setReportingPersonMatchNote(null);
    setFormData(emptyStaffForm());
  };

  const handleOpenAddModal = () => {
    editLoadGenerationRef.current += 1;
    setEditingUserId(null);
    setIsLoadingEditForm(false);
    setExistingProfilePhotoRaw(null);
    setReportingPersonMatchNote(null);
    setFormData(emptyStaffForm());
    setShowUserModal(true);
  };

  const handleCreateUser = async () => {
    const missing: string[] = [];
    if (!formData.name?.trim()) missing.push('Name');
    if (!formData.email?.trim()) missing.push('Email');
    if (!formData.country_code) missing.push('Country code');
    if (!formData.phone?.trim()) missing.push('Phone');
    else if (!/^\d{10}$/.test(formData.phone)) {
      toast.showWarning('Phone must be exactly 10 digits (numbers only)');
      return;
    }
    if (!formData.address?.trim()) missing.push('Address');
    if (!formData.company_user_role) missing.push('Role');
    if (!formData.designation?.trim()) missing.push('Designation');
    if (!formData.password?.trim()) missing.push('Password');
    if (missing.length > 0) {
      toast.showWarning(`Required: ${missing.join(', ')}`);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.showWarning('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      toast.showWarning('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const reportingPersonId = formData.reporting_person || (currentUser?.id ? String(currentUser.id) : '') || (users[0]?.id || '');
      const fd = new FormData();
      fd.append('role_id', formData.company_user_role);
      fd.append('company_user_role', formData.company_user_role);
      fd.append('designation', formData.designation.trim());
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('country_code', formData.country_code);
      fd.append('phone', formData.phone.trim());
      fd.append('address', formData.address.trim());
      fd.append('password', formData.password);
      if (reportingPersonId) fd.append('reporting_person', reportingPersonId);
      if (formData.profile_images) fd.append('profile_images', formData.profile_images);
      if (formData.country) fd.append('country', formData.country);
      if (formData.state) fd.append('state', formData.state);
      if (formData.city) fd.append('city', formData.city);

      await teamsAPI.createOrUpdateStaff(fd);
      toast.showSuccess('User created successfully');
      handleCloseModal();
      fetchStaffList();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (userId: string) => {
    if (defaultUsers.find((u) => u.id === userId)) {
      toast.showWarning('Cannot edit default user');
      return;
    }
    const loadGen = ++editLoadGenerationRef.current;
    setEditingUserId(userId);
    setShowUserModal(true);
    setIsLoadingEditForm(true);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');
    try {
      const apiUser = await teamsAPI.getStaff(userId);
      if (loadGen !== editLoadGenerationRef.current) return;
      if (!apiUser || typeof apiUser !== 'object') {
        throw new Error('Invalid response');
      }
      const base = buildFormFromStaffApi(apiUser, countryCodes);
      const rpRaw = apiUser.reporting_person ?? apiUser.reportingPerson;
      const nameHint =
        typeof rpRaw === 'string' && rpRaw.trim() ? String(rpRaw).trim() : undefined;
      const resolvedRp = resolveReportingPersonIdByTeamList(
        userId,
        base.reporting_person,
        nameHint,
        allUsers.filter((u) => u.id !== userId)
      );
      setReportingPersonMatchNote(
        nameHint && !resolvedRp
          ? `Could not match “${nameHint}” to a user in this list. Select a reporting person below.`
          : null
      );
      const rawPhoto =
        typeof apiUser.profile_images === 'string' && apiUser.profile_images.trim()
          ? apiUser.profile_images.trim()
          : typeof apiUser.profile_image === 'string' && apiUser.profile_image.trim()
            ? apiUser.profile_image.trim()
            : null;
      setExistingProfilePhotoRaw(rawPhoto);
      setFormData({
        ...base,
        reporting_person: resolvedRp || base.reporting_person,
      });
    } catch {
      if (loadGen !== editLoadGenerationRef.current) return;
      const user = allUsers.find((u) => u.id === userId);
      if (user) {
        const roleMatch = availableRoles.find((r) => r.name === user.roleType);
        const phoneDigits = String(user.contactNumber || '').replace(/\D/g, '').slice(0, 10);
        const dial = String(user.country_code || '').replace(/^\+/, '').trim();
        let iso = '';
        if (dial && countryCodes.length > 0) {
          iso = findCountryByDialCode(countryCodes, dial, undefined)?.code ?? '';
        }
        const nameHintRp =
          user.reportingPerson?.name && user.reportingPerson.name !== '—'
            ? user.reportingPerson.name.trim()
            : undefined;
        const resolvedRp = resolveReportingPersonIdByTeamList(
          userId,
          user.reporting_person_id ? String(user.reporting_person_id) : '',
          nameHintRp,
          allUsers.filter((u) => u.id !== userId)
        );
        setReportingPersonMatchNote(
          nameHintRp && !resolvedRp
            ? `Could not match “${nameHintRp}” to a user in this list. Select a reporting person below.`
            : null
        );
        const photoRaw =
          user.profilePhoto && !user.profilePhoto.includes('ui-avatars.com')
            ? user.profilePhoto
            : null;
        setExistingProfilePhotoRaw(photoRaw);
        setFormData({
          name: user.name,
          email: user.email,
          country_code: dial,
          country_code_iso: iso,
          phone: phoneDigits,
          address: user.address ?? '',
          company_user_role: user.company_role_id ?? roleMatch?.id ?? '',
          designation: user.designation ?? '',
          reporting_person: resolvedRp || (user.reporting_person_id ? String(user.reporting_person_id) : ''),
          password: '',
          confirmPassword: '',
          profile_images: null,
          country: '',
          state: '',
          city: '',
        });
        toast.showWarning('Loaded from list; some fields may be incomplete until the server is reachable.');
      } else {
        toast.showError('Could not load user for editing');
        handleCloseModal();
      }
    } finally {
      if (loadGen === editLoadGenerationRef.current) {
        setIsLoadingEditForm(false);
      }
    }
  };

  const handleUpdateUser = async () => {
    if (editingUserId && defaultUsers.find(u => u.id === editingUserId)) {
      toast.showWarning('Cannot edit default user');
      return;
    }
    const missing: string[] = [];
    if (!formData.name?.trim()) missing.push('Name');
    if (!formData.email?.trim()) missing.push('Email');
    if (!formData.country_code) missing.push('Country code');
    if (!formData.phone?.trim()) missing.push('Phone');
    if (!formData.address?.trim()) missing.push('Address');
    if (!formData.company_user_role) missing.push('Role');
    if (!formData.designation?.trim()) missing.push('Designation');
    if (missing.length > 0) {
      toast.showWarning(`Required: ${missing.join(', ')}`);
      return;
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      toast.showWarning('Phone must be exactly 10 digits (numbers only)');
      return;
    }
    if (!editingUserId) return;
    setIsSubmitting(true);
    try {
      const reportingPersonId = formData.reporting_person || (currentUser?.id ? String(currentUser.id) : '');
      const fd = new FormData();
      fd.append('updateId', editingUserId);
      fd.append('role_id', formData.company_user_role);
      fd.append('company_user_role', formData.company_user_role);
      fd.append('designation', formData.designation.trim());
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('country_code', formData.country_code);
      fd.append('phone', formData.phone.trim());
      fd.append('address', formData.address.trim());
      if (reportingPersonId) fd.append('reporting_person', reportingPersonId);
      if (formData.profile_images) fd.append('profile_images', formData.profile_images);
      if (formData.country) fd.append('country', formData.country);
      if (formData.state) fd.append('state', formData.state);
      if (formData.city) fd.append('city', formData.city);

      await teamsAPI.createOrUpdateStaff(fd);
      toast.showSuccess('User updated successfully');
      handleCloseModal();
      fetchStaffList();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (defaultUsers.find(u => u.id === userId)) {
      toast.showWarning('Cannot delete default user');
      return;
    }
    setDeleteConfirmId(null);
    try {
      await teamsAPI.deleteStaff(userId);
      toast.showSuccess('User deleted successfully');
      await fetchStaffList();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to delete user');
    }
  };

  const handleOpenTeamPermissions = async (user: UserData) => {
    if (!user.status) return;
    const uuid =
      user.uuid != null && String(user.uuid).trim() !== '' ? String(user.uuid).trim() : user.id;
    setPermissionsLoadingUserId(user.id);
    try {
      const data = await teamsAPI.getUserPermission(uuid);
      const unwrapped = unwrapPermissionMatrixPayload(data);
      if (!unwrapped || !Array.isArray(unwrapped.menusTree) || unwrapped.menusTree.length === 0) {
        toast.showError('No permission menus returned from server');
        return;
      }
      setTeamPermissionApi({
        updateId: Number(user.id),
        menusTree: unwrapped.menusTree,
        permissionsByMenu: unwrapped.permissionsByMenu,
      });
      setPermissionsUser(user);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to load user permissions';
      toast.showError(msg);
    } finally {
      setPermissionsLoadingUserId(null);
    }
  };

  const handleClosePermissionsModal = () => {
    setPermissionsUser(null);
    setTeamPermissionApi(null);
  };

  const handleToggleStatus = (userId: string) => {
    if (defaultUsers.find(u => u.id === userId)) {
      // Update default user status in state (won't persist)
      return;
    }
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: !user.status } : user
    ));
  };

  const handleDownloadExcel = () => {
    const headers = ['Sr No', 'Name', 'Email', 'Contact Number', 'Role Type', 'Designation', 'Reporting Person', 'Status'];
    const rows = filteredAndSortedUsers.map((user, idx) => [
      idx + 1,
      user.name,
      user.email,
      user.contactNumber,
      user.roleType,
      user.designation ?? '—',
      `${user.reportingPerson?.name || ''} ${user.reportingPerson?.role || ''}`.trim() || '—',
      user.status ? 'Active' : 'Inactive'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronUp className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B8E23]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight whitespace-nowrap ${textPrimary}`}>Manage Teams</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage company users and team assignments
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
              fetchStaffList();
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Refresh Staff List"
          >
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by name, email, contact number, role, designation, or reporting person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {/* Users Table */}
      {isLoadingUsers ? (
        <div className={`rounded-xl border p-12 text-center ${cardClass}`}>
          <p className={`text-sm font-medium ${textSecondary}`}>Loading staff list...</p>
        </div>
      ) : filteredAndSortedUsers.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      Sr No
                      {getSortIcon('id')}
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Profile Photo
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('contactNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Contact Number
                      {getSortIcon('contactNumber')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('roleType')}
                  >
                    <div className="flex items-center gap-2">
                      Role Type
                      {getSortIcon('roleType')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('designation')}
                  >
                    <div className="flex items-center gap-2">
                      Designation
                      {getSortIcon('designation')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                    onClick={() => handleSort('reportingPerson')}
                  >
                    <div className="flex items-center gap-2">
                      Reporting Person
                      {getSortIcon('reportingPerson')}
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedUsers.map((user, idx) => (
                  <tr key={user.id} className={`${!user.status ? 'opacity-60' : ''} ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        {user.profilePhoto ? (
                          <img
                            src={user.profilePhoto}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=6B8E23&color=fff&size=128`;
                            }}
                          />
                        ) : (
                          <User className={`w-5 h-5 ${textSecondary}`} />
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {user.name}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {user.email}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {user.contactNumber}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {user.roleType}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {user.designation?.trim() ? user.designation : '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      <div className="flex items-center gap-2">
                        <User className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span>
                          {[
                            user.reportingPerson.name,
                            user.reportingPerson.role && String(user.reportingPerson.role).trim() !== '—'
                              ? user.reportingPerson.role
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          user.status 
                            ? 'bg-blue-600' 
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            user.status ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-2 ${!user.status ? 'pointer-events-none' : ''}`}>
                        <button
                          onClick={() => user.status && handleEditUser(user.id)}
                          disabled={!user.status}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => user.status && void handleOpenTeamPermissions(user)}
                          disabled={!user.status || permissionsLoadingUserId === user.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                          title="Permissions"
                        >
                          {permissionsLoadingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => user.status && setDeleteConfirmId(user.id)}
                          disabled={!user.status}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-100 text-red-600'}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAndSortedUsers.length > 0 && (
            <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${textSecondary}`}>
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textSecondary}`}>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className={`text-sm rounded-lg border px-2 py-1 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="First page"
                >
                  <ChevronsLeft className={`w-4 h-4 ${textSecondary}`} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Previous page"
                >
                  <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
                </button>
                <span className={`px-3 py-1 text-sm font-bold ${textPrimary}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Next page"
                >
                  <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Last page"
                >
                  <ChevronsRight className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Users Found</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first user</p>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h2>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                {editingUserId ? 'Update fields as needed. Email and other values stay as you type until you save.' : 'All fields are required'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {isLoadingEditForm ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6B8E23]" />
                  <p className={`text-sm font-medium ${textSecondary}`}>Loading user details…</p>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    placeholder="Enter Name" />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Email <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    placeholder="Enter Email" />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Country Code <span className="text-red-500">*</span></label>
                  <div className="relative">
                    {isLoadingCountryCodes ? (
                      <div className={`w-full px-4 py-2.5 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} flex items-center justify-center min-h-[42px]`}>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none hover:opacity-90 transition-opacity`}
                        >
                          {formData.country_code && countryCodes.length > 0 ? (
                            (() => {
                              const sel = findCountryByDialCode(countryCodes, formData.country_code, formData.country_code_iso || undefined);
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
                                  <span className="flex-1 text-left">+{sel.dialCode} {sel.name}</span>
                                </>
                              ) : (
                                <span className={`flex-1 text-left ${textSecondary}`}>Select country</span>
                              );
                            })()
                          ) : (
                            <span className={`flex-1 text-left ${textSecondary}`}>Select country</span>
                          )}
                          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isCountryDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => { setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }}
                            />
                            <div className={`absolute top-full left-0 right-0 mt-1 z-[60] max-h-72 overflow-hidden ${isDark ? 'bg-dropdown-panel' : 'bg-white'} border ${isDark ? 'border-slate-700' : 'border-slate-200'} rounded-lg shadow-xl flex flex-col`}>
                              <div className="p-2 border-b border-inherit flex-shrink-0">
                                <div className="relative">
                                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                                  <input
                                    type="text"
                                    value={countrySearchQuery}
                                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                                    placeholder="Search country or code..."
                                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white'} ${textPrimary} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto max-h-52 p-2">
                                {countryCodes.filter((cc) => {
                                  const q = countrySearchQuery.trim().toLowerCase();
                                  if (!q) return true;
                                  return cc.name.toLowerCase().includes(q) || cc.code.toLowerCase().includes(q) || cc.dialCode.includes(q);
                                }).length === 0 ? (
                                  <div className={`p-4 text-center text-sm ${textSecondary}`}>No countries found</div>
                                ) : (
                                  countryCodes
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
                                          setFormData((prev) => ({ ...prev, country_code: cc.dialCode, country_code_iso: cc.code }));
                                          setIsCountryDropdownOpen(false);
                                          setCountrySearchQuery('');
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                                          (formData.country_code_iso ? formData.country_code_iso === cc.code : formData.country_code === cc.dialCode)
                                            ? isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
                                            : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                        }`}
                                      >
                                        <img
                                          src={cc.flag || getFlagUrl(cc.code)}
                                          alt=""
                                          className="w-6 h-4 object-cover rounded border border-slate-300"
                                          loading="lazy"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = getFlagUrl(cc.code);
                                          }}
                                        />
                                        <span className={`flex-1 text-sm ${textPrimary}`}>{cc.name}</span>
                                        <span className={`text-sm ${textSecondary}`}>+{cc.dialCode}</span>
                                      </button>
                                    ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Phone <span className="text-red-500">*</span></label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    placeholder="10 digits only" />
                  <p className={`text-xs mt-1 ${textSecondary}`}>Numbers only, 10 digits</p>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Role <span className="text-red-500">*</span></label>
                  <select name="company_user_role" value={formData.company_user_role} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}>
                    <option value="">Select Role</option>
                    {roleSelectOptions.map((r, idx) => (
                      <option key={`${r.id}-${r.name}-${idx}`} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Designation <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    placeholder="e.g. Senior Site Engineer"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Reporting Person <span className="text-red-500">*</span></label>
                  <select name="reporting_person" value={formData.reporting_person} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}>
                    <option value="">Select Reporting Person</option>
                    {allUsers.filter((u) => u.id !== editingUserId).map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.roleType})</option>
                    ))}
                  </select>
                  {reportingPersonMatchNote && (
                    <p className={`text-xs mt-1.5 font-medium text-amber-600 ${isDark ? 'text-amber-400' : ''}`}>
                      {reportingPersonMatchNote}
                    </p>
                  )}
                </div>
                {!editingUserId && (
                  <>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Password <span className="text-red-500">*</span></label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="Min 8 characters" />
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Confirm Password <span className="text-red-500">*</span></label>
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : ''} ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="Confirm Password" />
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Address <span className="text-red-500">*</span></label>
                <textarea name="address" value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  placeholder="Enter Address" />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Profile Photo (optional)</label>
                {formData.profile_images && imagePreviewUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative inline-block">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-300"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md"
                        title="Remove new image selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`text-sm ${textSecondary}`}>{formData.profile_images.name}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingUserId && existingProfilePhotoRaw ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={getProfileImageUrl(existingProfilePhotoRaw, formData.name)}
                          alt=""
                          className="w-16 h-16 rounded-full object-cover border-2 border-slate-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = getInitialsAvatarUrl(formData.name || 'User', '6B8E23');
                          }}
                        />
                        <div>
                          <p className={`text-sm font-bold ${textPrimary}`}>Current profile photo</p>
                          <p className={`text-xs ${textSecondary}`}>Choose a file below to replace it.</p>
                        </div>
                      </div>
                    ) : editingUserId ? (
                      <p className={`text-xs ${textSecondary}`}>No photo on file — upload one below if you want.</p>
                    ) : null}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileChange}
                      className={`w-full text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                    />
                  </div>
                )}
              </div>
              </>
              )}
            </div>
            <div className="p-6 border-t border-inherit flex items-center justify-end gap-3">
              <button onClick={handleCloseModal} disabled={isSubmitting || isLoadingEditForm}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>
                Cancel
              </button>
              <button onClick={editingUserId ? handleUpdateUser : handleCreateUser} disabled={isSubmitting || isLoadingEditForm}
                className={`px-4 py-2 rounded-lg text-sm font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white shadow-md disabled:opacity-50`}>
                {isSubmitting ? 'Saving...' : (editingUserId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-lg`}>
            <div className="p-6">
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Confirm Delete</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirmId)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 hover:bg-red-700 text-white`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {permissionsUser && teamPermissionApi && (
        <TeamMemberPermissionsModal
          theme={theme}
          entityId={permissionsUser.id}
          entityLabel={permissionsUser.name}
          teamPermissionApi={teamPermissionApi}
          onClose={handleClosePermissionsModal}
        />
      )}
    </div>
  );
};

export default ManageTeams;
