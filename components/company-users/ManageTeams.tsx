'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Settings,
  User,
  ChevronUp,
  ChevronDown,
  Calendar
} from 'lucide-react';

interface UserData {
  id: string;
  profilePhoto: string;
  name: string;
  email: string;
  contactNumber: string;
  roleType: string;
  reportingPerson: {
    name: string;
    role: string;
  };
  status: boolean;
}

interface ManageTeamsProps {
  theme: ThemeType;
}

const ManageTeams: React.FC<ManageTeamsProps> = ({ theme }) => {
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    aadharNo: '',
    panNo: '',
    email: '',
    mobileNo: '',
    password: '',
    confirmPassword: '',
    address: '',
    country: '',
    state: '',
    city: '',
    dateOfBirth: '',
    assignRole: '',
    reportingTo: '',
    profilePhoto: null as File | null,
    profilePhotoPreview: '' as string | null
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default users
  const defaultUsers = useMemo(() => [
    { 
      id: '1',
      profilePhoto: 'https://ui-avatars.com/api/?name=test&background=6B8E23&color=fff&size=128',
      name: 'test',
      email: 'testsouma@koncit.com',
      contactNumber: '2365480111',
      roleType: 'Project Manager',
      reportingPerson: {
        name: 'Rahul Rao S',
        role: 'Manager'
      },
      status: true
    },
  ], []);

  // Load users from localStorage on mount
  useEffect(() => {
    const savedUsers = localStorage.getItem('manageTeamsUsers');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        setUsers(parsed);
      } catch (e) {
        setUsers([]);
      }
    } else {
      setUsers([]);
    }
  }, []);

  // Load roles from UserRolesPermissions (localStorage)
  useEffect(() => {
    const loadRoles = () => {
      // Default roles from UserRolesPermissions (matching the defaultRoles in UserRolesPermissions)
      const defaultRoles = [
        'Super Admin',
        'Project Manager',
        'Site Engineer',
        'Store Keepers',
        'Supervisor'
      ];

      // Load user-added roles from localStorage
      const savedRoles = localStorage.getItem('userRoles');
      let userRoles: string[] = [];
      
      if (savedRoles) {
        try {
          const parsed = JSON.parse(savedRoles);
          userRoles = parsed.map((role: { name: string }) => role.name);
        } catch (e) {
          console.error('Error parsing roles:', e);
        }
      }

      // Combine default and user-added roles, remove duplicates
      const allRoles = [...new Set([...defaultRoles, ...userRoles])];
      setAvailableRoles(allRoles);
    };

    loadRoles();

    // Listen for storage changes to update roles when they're added/removed in UserRolesPermissions
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRoles') {
        loadRoles();
      }
    };

    // Listen for custom event when roles are updated in same tab
    const handleRolesUpdate = () => {
      loadRoles();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rolesUpdated', handleRolesUpdate);
    
    // Check periodically for changes (for same-tab updates when localStorage is modified directly)
    const interval = setInterval(() => {
      loadRoles();
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rolesUpdated', handleRolesUpdate);
      clearInterval(interval);
    };
  }, []);

  // Save users to localStorage whenever users state changes
  useEffect(() => {
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
  }, [users]);

  // Combine default and user-added users
  const allUsers = useMemo(() => {
    return [...defaultUsers, ...users];
  }, [defaultUsers, users]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = allUsers.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contactNumber.includes(searchQuery) ||
      user.roleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.reportingPerson.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof UserData];
        let bValue: any = b[sortConfig.key as keyof UserData];

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          profilePhoto: file,
          profilePhotoPreview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      designation: '',
      aadharNo: '',
      panNo: '',
      email: '',
      mobileNo: '',
      password: '',
      confirmPassword: '',
      address: '',
      country: '',
      state: '',
      city: '',
      dateOfBirth: '',
      assignRole: '',
      reportingTo: '',
      profilePhoto: null,
      profilePhotoPreview: null
    });
  };

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.mobileNo || !formData.assignRole) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const newUser: UserData = {
      id: Date.now().toString(),
      profilePhoto: formData.profilePhotoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=6B8E23&color=fff&size=128`,
      name: formData.name,
      email: formData.email,
      contactNumber: formData.mobileNo,
      roleType: formData.assignRole,
      reportingPerson: {
        name: formData.reportingTo || 'N/A',
        role: formData.designation || 'N/A'
      },
      status: true
    };

    setUsers(prev => [...prev, newUser]);
    handleCloseModal();
  };

  const handleEditUser = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setEditingUserId(userId);
      setFormData({
        name: user.name,
        designation: user.reportingPerson.role,
        aadharNo: '',
        panNo: '',
        email: user.email,
        mobileNo: user.contactNumber,
        password: '',
        confirmPassword: '',
        address: '',
        country: '',
        state: '',
        city: '',
        dateOfBirth: '',
        assignRole: user.roleType,
        reportingTo: user.reportingPerson.name,
        profilePhoto: null,
        profilePhotoPreview: user.profilePhoto
      });
      setShowUserModal(true);
    }
  };

  const handleUpdateUser = () => {
    if (!formData.name || !formData.email || !formData.mobileNo || !formData.assignRole) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingUserId && defaultUsers.find(u => u.id === editingUserId)) {
      alert('Cannot edit default user');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setUsers(prev => prev.map(user => 
      user.id === editingUserId 
        ? {
            ...user,
            name: formData.name,
            email: formData.email,
            contactNumber: formData.mobileNo,
            roleType: formData.assignRole,
            reportingPerson: {
              name: formData.reportingTo || 'N/A',
              role: formData.designation || 'N/A'
            },
            profilePhoto: formData.profilePhotoPreview || user.profilePhoto
          }
        : user
    ));
    handleCloseModal();
  };

  const handleDeleteUser = (userId: string) => {
    if (defaultUsers.find(u => u.id === userId)) {
      alert('Cannot delete default user');
      return;
    }
    setUsers(prev => prev.filter(user => user.id !== userId));
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
      {filteredAndSortedUsers.length > 0 ? (
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
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-inherit">
              <div className="flex items-center gap-3 mb-2">
                <Users className={`w-5 h-5 ${textSecondary}`} />
                <h2 className={`text-lg font-bold ${textSecondary}`}>Add New User</h2>
              </div>
              <h2 className={`text-2xl font-black ${textPrimary}`}>
                ADD YOUR TEAMS DETAILS
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Upload Photo Section */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Upload Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {formData.profilePhotoPreview ? (
                      <img src={formData.profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className={`w-10 h-10 ${textSecondary}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className={`w-full text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                    />
                  </div>
                </div>
              </div>

              {/* ADD YOUR TEAMS DETAILS Section */}
              <div>
                <h3 className={`text-lg font-black mb-4 ${textPrimary}`}>ADD YOUR TEAMS DETAILS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Name"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Designation
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Designation"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Aadhar No
                    </label>
                    <input
                      type="text"
                      name="aadharNo"
                      value={formData.aadharNo}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Aadhar No"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      PAN No
                    </label>
                    <input
                      type="text"
                      name="panNo"
                      value={formData.panNo}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter PAN No"
                    />
                  </div>
                </div>
              </div>

              {/* CONTACT DETAILS Section */}
              <div>
                <h3 className={`text-lg font-black mb-4 ${textPrimary}`}>CONTACT DETAILS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Email"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Mobile No
                    </label>
                    <input
                      type="tel"
                      name="mobileNo"
                      value={formData.mobileNo}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Mobile No"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Password"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Confirm Password"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      placeholder="Enter Address"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    >
                      <option value="">Select Country</option>
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      States
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    >
                      <option value="">Select State</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      City
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    >
                      <option value="">Select City</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Pune">Pune</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Chennai">Chennai</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                      Date of Birth
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                        placeholder="dd-mm-yyyy"
                      />
                      <Calendar className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Assign Role
                  </label>
                  <select
                    name="assignRole"
                    value={formData.assignRole}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  >
                    <option value="">---Select Assign Role---</option>
                    {availableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Reporting to
                  </label>
                  <select
                    name="reportingTo"
                    value={formData.reportingTo}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  >
                    <option value="">---Select Reporting Person---</option>
                    {allUsers.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-inherit flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
              >
                Cancel
              </button>
              <button
                onClick={editingUserId ? handleUpdateUser : handleCreateUser}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
              >
                {editingUserId ? 'Update' : 'Create'}
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
