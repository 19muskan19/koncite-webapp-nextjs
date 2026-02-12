'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface UserData {
  id: string;
  profilePhoto: string;
  name: string;
  email: string;
  contactNumber: string;
  roleType: string;
  address?: string;
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

const ROLE_ID_TO_NAME: Record<string, string> = {
  '1': 'Super Admin',
  '2': 'Project Manager',
  '3': 'Site Engineer',
  '4': 'Store Keepers',
  '5': 'Supervisor',
};

function mapApiStaffToUserData(apiUser: any): UserData {
  const id = String(apiUser.id ?? apiUser.uuid ?? '');
  const profilePhoto = apiUser.profile_images
    ? (String(apiUser.profile_images).startsWith('http') ? apiUser.profile_images : apiUser.profile_images)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name || '')}&background=6B8E23&color=fff&size=128`;
  const rp = apiUser.reporting_person ?? apiUser.reportingPerson;
  const rpId = typeof rp === 'object' && rp ? (rp.id ?? null) : (rp || null);
  const rpIsObject = typeof rp === 'object' && rp;
  const roleId = String(apiUser.company_role_id ?? apiUser.company_role?.id ?? '');
  const designation = apiUser.designation || ROLE_ID_TO_NAME[roleId] || '';
  const roleType =
    apiUser.company_role?.name ??
    designation ??
    apiUser.role_type ??
    ROLE_ID_TO_NAME[roleId] ??
    'N/A';
  return {
    id,
    profilePhoto,
    name: apiUser.name || '',
    email: apiUser.email || '',
    contactNumber: apiUser.phone || apiUser.contact_number || '',
    roleType,
    address: apiUser.address,
    reporting_person_id: rpIsObject ? (rp.id ?? null) : (rp ?? null),
    reportingPerson: rpIsObject
      ? { name: rp.name || '—', role: rp.role ?? rp.designation ?? '—' }
      : { name: rpId ? '' : '—', role: rpId ? '' : '—' },
    status: apiUser.is_active !== false,
  };
}

const ManageTeams: React.FC<ManageTeamsProps> = ({ theme }) => {
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [useApiData, setUseApiData] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country_code: '91' as string,
    phone: '',
    address: '',
    company_user_role: '' as string,
    designation: '' as string,
    reporting_person: '' as string,
    password: '',
    confirmPassword: '',
    profile_images: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
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
          role: u.reportingPerson.role || '—',
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
          } catch {
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
          } catch {
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

  // Load roles (id + name) from UserRolesPermissions localStorage
  useEffect(() => {
    const loadRoles = () => {
      const defaultRoles: Array<{ id: string; name: string }> = [
        { id: '1', name: 'Super Admin' },
        { id: '2', name: 'Project Manager' },
        { id: '3', name: 'Site Engineer' },
        { id: '4', name: 'Store Keepers' },
        { id: '5', name: 'Supervisor' },
      ];
      const savedRoles = localStorage.getItem('userRoles');
      let userRoles: Array<{ id: string; name: string }> = [];
      if (savedRoles) {
        try {
          const parsed = JSON.parse(savedRoles);
          userRoles = parsed.map((r: { id?: string; name: string }) => ({ id: String(r.id ?? r.name), name: r.name }));
        } catch {
          userRoles = [];
        }
      }
      const seen = new Set<string>();
      const combined: Array<{ id: string; name: string }> = [];
      [...defaultRoles, ...userRoles].forEach((r) => {
        if (!seen.has(r.name)) {
          seen.add(r.name);
          combined.push(r);
        }
      });
      setAvailableRoles(combined);
    };
    loadRoles();
    const handleStorageChange = (e: StorageEvent) => { if (e.key === 'userRoles') loadRoles(); };
    const handleRolesUpdate = () => loadRoles();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rolesUpdated', handleRolesUpdate);
    const interval = setInterval(loadRoles, 500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rolesUpdated', handleRolesUpdate);
      clearInterval(interval);
    };
  }, []);

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData({ ...formData, profile_images: file });
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUserId(null);
    setIsSubmitting(false);
    const defaultReporting = currentUser?.id ? String(currentUser.id) : (users[0]?.id || '');
    setFormData({
      name: '',
      email: '',
      country_code: '91',
      phone: '',
      address: '',
      company_user_role: '',
      designation: '',
      reporting_person: defaultReporting,
      password: '',
      confirmPassword: '',
      profile_images: null
    });
  };

  const handleCreateUser = async () => {
    const missing: string[] = [];
    if (!formData.name?.trim()) missing.push('Name');
    if (!formData.email?.trim()) missing.push('Email');
    if (!formData.country_code) missing.push('Country code');
    if (!formData.phone?.trim()) missing.push('Phone');
    if (!formData.address?.trim()) missing.push('Address');
    if (!formData.company_user_role) missing.push('Role');
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
      const roleName = availableRoles.find((r) => r.id === formData.company_user_role)?.name || 'Staff';
      const reportingPersonId = formData.reporting_person || (currentUser?.id ? String(currentUser.id) : '') || (users[0]?.id || '');
      const fd = new FormData();
      fd.append('company_user_role', formData.company_user_role);
      fd.append('designation', roleName);
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('country_code', formData.country_code);
      fd.append('phone', formData.phone.trim());
      fd.append('address', formData.address.trim());
      fd.append('password', formData.password);
      if (reportingPersonId) fd.append('reporting_person', reportingPersonId);
      if (formData.profile_images) fd.append('profile_images', formData.profile_images);

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

  const handleEditUser = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      const roleMatch = availableRoles.find(r => r.name === user.roleType);
      setEditingUserId(userId);
      setFormData({
        name: user.name,
        email: user.email,
        country_code: '91',
        phone: user.contactNumber,
        address: user.address ?? '',
        company_user_role: roleMatch?.id ?? '',
        designation: user.roleType || '',
        reporting_person: user.reporting_person_id ? String(user.reporting_person_id) : (currentUser?.id ? String(currentUser.id) : ''),
        password: '',
        confirmPassword: '',
        profile_images: null
      });
      setShowUserModal(true);
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
    if (missing.length > 0) {
      toast.showWarning(`Required: ${missing.join(', ')}`);
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.showWarning('Passwords do not match');
      return;
    }
    if (!editingUserId) return;
    setIsSubmitting(true);
    try {
      const roleName = availableRoles.find((r) => r.id === formData.company_user_role)?.name || 'Staff';
      const reportingPersonId = formData.reporting_person || (currentUser?.id ? String(currentUser.id) : '');
      const fd = new FormData();
      fd.append('updateId', editingUserId);
      fd.append('company_user_role', formData.company_user_role);
      fd.append('designation', roleName);
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('country_code', formData.country_code);
      fd.append('phone', formData.phone.trim());
      fd.append('address', formData.address.trim());
      if (reportingPersonId) fd.append('reporting_person', reportingPersonId);
      if (formData.password) fd.append('password', formData.password);
      if (formData.profile_images) fd.append('profile_images', formData.profile_images);

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
    try {
      await teamsAPI.deleteStaff(userId);
      toast.showSuccess('User deleted successfully');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to delete user');
    }
    setDeleteConfirmId(null);
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <Users className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Manage Teams</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage company users and team assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowUserModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by name, email, contact number, role type, or reporting person..."
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
                      #
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
                {filteredAndSortedUsers.map((user, idx) => (
                  <tr key={user.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        {user.profilePhoto ? (
                          <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
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
                      <div className="flex items-center gap-2">
                        <User className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span>{user.reportingPerson.name} {user.reportingPerson.role}</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user.id)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(user.id)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-100 text-red-600'}`}
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
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h2>
              <p className={`text-sm mt-1 ${textSecondary}`}>All fields are required</p>
            </div>
            <div className="p-6 space-y-4">
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
                    placeholder="Enter Email" disabled={!!editingUserId} />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Country Code <span className="text-red-500">*</span></label>
                  <select name="country_code" value={formData.country_code} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}>
                    <option value="91">India (+91)</option>
                    <option value="971">UAE (+971)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Phone <span className="text-red-500">*</span></label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    placeholder="Enter Phone" />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Role <span className="text-red-500">*</span></label>
                  <select name="company_user_role" value={formData.company_user_role} onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}>
                    <option value="">Select Role</option>
                    {availableRoles.map((r, idx) => (
                      <option key={`${r.id}-${r.name}-${idx}`} value={r.id}>{r.name}</option>
                    ))}
                  </select>
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
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="Confirm Password" />
                    </div>
                  </>
                )}
                {editingUserId && (
                  <>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>New Password (optional)</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="Leave blank to keep current" />
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Confirm New Password</label>
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="Required if changing password" />
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Address <span className="text-red-500">*</span></label>
                <textarea name="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  placeholder="Enter Address" />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>Profile Photo (optional)</label>
                <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFileChange}
                  className={`w-full text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`} />
              </div>
            </div>
            <div className="p-6 border-t border-inherit flex items-center justify-end gap-3">
              <button onClick={handleCloseModal} disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>
                Cancel
              </button>
              <button onClick={editingUserId ? handleUpdateUser : handleCreateUser} disabled={isSubmitting}
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
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md`}>
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
    </div>
  );
};

export default ManageTeams;
