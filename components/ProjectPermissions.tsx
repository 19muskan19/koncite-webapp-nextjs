'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../types';
import { 
  ShieldCheck,
  Plus,
  Search,
  Trash2
} from 'lucide-react';

interface ProjectPermission {
  id: string;
  project: string;
  assignedUser: string;
  designation: string;
}

interface ProjectPermissionsProps {
  theme: ThemeType;
}

const ProjectPermissions: React.FC<ProjectPermissionsProps> = ({ theme }) => {
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ name: string; designation: string }>>([]);
  const [formData, setFormData] = useState({
    project: '',
    users: [{ assignedUser: '', designation: '' }] as Array<{ assignedUser: string; designation: string }>
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default permissions matching the image
  const defaultPermissions = useMemo(() => [
    { 
      id: '1',
      project: 'Lakeshire',
      assignedUser: 'test',
      designation: 'Project Manager'
    },
    { 
      id: '2',
      project: 'Demo Data',
      assignedUser: 'Maruti Patil',
      designation: 'Supervisor'
    },
  ], []);

  // Load permissions from localStorage on mount
  useEffect(() => {
    const savedPermissions = localStorage.getItem('projectPermissions');
    if (savedPermissions) {
      try {
        const parsed = JSON.parse(savedPermissions);
        setPermissions(parsed);
      } catch (e) {
        setPermissions([]);
      }
    } else {
      setPermissions([]);
    }
  }, []);

  // Save permissions to localStorage whenever permissions state changes
  useEffect(() => {
    const defaultIds = ['1', '2'];
    const userPermissions = permissions.filter(p => !defaultIds.includes(p.id));
    if (userPermissions.length > 0) {
      try {
        localStorage.setItem('projectPermissions', JSON.stringify(userPermissions));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    } else {
      localStorage.removeItem('projectPermissions');
    }
  }, [permissions]);

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    const loadProjects = () => {
      // Default projects from Projects component
      const defaultProjectNames = [
        'Residential Complex A',
        'Commercial Tower B',
        'Infrastructure Project C',
        'Urban Development D'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectNames: string[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectNames = parsed.map((project: { name: string }) => project.name);
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      // Combine default and user-added projects, plus the ones from default permissions
      const permissionProjects = ['Lakeshire', 'Demo Data'];
      const allProjects = [...new Set([...defaultProjectNames, ...permissionProjects, ...userProjectNames])];
      setAvailableProjects(allProjects);
    };

    loadProjects();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    // Listen for custom event when projects are updated in same tab
    const handleProjectsUpdate = () => {
      loadProjects();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', handleProjectsUpdate);
    const interval = setInterval(loadProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', handleProjectsUpdate);
      clearInterval(interval);
    };
  }, []);

  // Load users from ManageTeams component (localStorage)
  useEffect(() => {
    const loadUsers = () => {
      const savedUsers = localStorage.getItem('manageTeamsUsers');
      let users: Array<{ name: string; designation: string }> = [];
      
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          users = parsed.map((user: { name: string; roleType: string }) => ({
            name: user.name,
            designation: user.roleType
          }));
        } catch (e) {
          console.error('Error parsing users:', e);
        }
      }

      // Add default users
      const defaultUsers = [
        { name: 'test', designation: 'Project Manager' },
        { name: 'Maruti Patil', designation: 'Supervisor' }
      ];
      
      const allUsers = [...defaultUsers, ...users];
      // Remove duplicates based on name
      const uniqueUsers = Array.from(
        new Map(allUsers.map(user => [user.name, user])).values()
      );
      setAvailableUsers(uniqueUsers);
    };

    loadUsers();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'manageTeamsUsers') {
        loadUsers();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('usersUpdated', loadUsers);
    const interval = setInterval(loadUsers, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usersUpdated', loadUsers);
      clearInterval(interval);
    };
  }, []);

  // Combine default and user-added permissions
  const allPermissions = useMemo(() => {
    return [...defaultPermissions, ...permissions];
  }, [defaultPermissions, permissions]);

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return allPermissions;
    
    return allPermissions.filter(permission =>
      permission.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.assignedUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.designation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPermissions, searchQuery]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      project: e.target.value
    });
  };

  const handleUserChange = (index: number, field: 'assignedUser' | 'designation', value: string) => {
    const updatedUsers = [...formData.users];
    updatedUsers[index] = {
      ...updatedUsers[index],
      [field]: value
    };

    // Auto-fill designation when user is selected
    if (field === 'assignedUser') {
      const selectedUser = availableUsers.find(u => u.name === value);
      if (selectedUser) {
        updatedUsers[index].designation = selectedUser.designation;
      }
    }

    setFormData({
      ...formData,
      users: updatedUsers
    });
  };

  const handleAddMoreUsers = () => {
    setFormData({
      ...formData,
      users: [...formData.users, { assignedUser: '', designation: '' }]
    });
  };

  const handleRemoveUser = (index: number) => {
    if (formData.users.length > 1) {
      const updatedUsers = formData.users.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        users: updatedUsers
      });
    }
  };

  const handleCloseModal = () => {
    setShowPermissionModal(false);
    setFormData({
      project: '',
      users: [{ assignedUser: '', designation: '' }]
    });
  };

  const handleCreatePermission = () => {
    if (!formData.project) {
      alert('Please select a project');
      return;
    }

    // Validate all users
    const validUsers = formData.users.filter(u => u.assignedUser && u.designation);
    if (validUsers.length === 0) {
      alert('Please add at least one user with designation');
      return;
    }

    // Check for duplicates in form
    const userNames = validUsers.map(u => u.assignedUser);
    if (new Set(userNames).size !== userNames.length) {
      alert('Duplicate users found. Please remove duplicates.');
      return;
    }

    // Check if any project-user combination already exists
    const existingCombinations = validUsers.filter(u => 
      allPermissions.some(p => p.project === formData.project && p.assignedUser === u.assignedUser)
    );

    if (existingCombinations.length > 0) {
      alert(`The following users are already assigned to this project: ${existingCombinations.map(u => u.assignedUser).join(', ')}`);
      return;
    }

    // Create permissions for all users
    const newPermissions: ProjectPermission[] = validUsers.map((user, index) => ({
      id: (Date.now() + index).toString(),
      project: formData.project,
      assignedUser: user.assignedUser,
      designation: user.designation
    }));

    setPermissions(prev => [...prev, ...newPermissions]);
    handleCloseModal();
  };

  const handleDeletePermission = (permissionId: string) => {
    if (defaultPermissions.find(p => p.id === permissionId)) {
      alert('Cannot delete default permission');
      return;
    }
    setPermissions(prev => prev.filter(permission => permission.id !== permissionId));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <ShieldCheck className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Project Permissions</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage project-level access and permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowPermissionModal(true)}
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
            placeholder="Search by project, assigned user, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
      </div>

      {/* PROJECT PERMISSION Table */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className="p-4 border-b border-inherit">
          <h2 className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}>
            PROJECT PERMISSION
          </h2>
        </div>
        {filteredPermissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    #
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Project
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Assigned User
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Designation
                  </th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredPermissions.map((permission, idx) => (
                  <tr key={permission.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {idx + 1}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {permission.project}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {permission.assignedUser}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {permission.designation}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(permission.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-100 text-red-600'}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`p-12 text-center ${cardClass}`}>
            <ShieldCheck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Permissions Found</h3>
            <p className={`text-sm ${textSecondary}`}>Start by adding your first project permission</p>
          </div>
        )}
      </div>

      {/* Add Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-inherit">
              <h2 className={`text-2xl font-black text-center ${textPrimary}`}>
                Project and User Allocation
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Project Selection */}
              <div>
                <label className={`block text-sm font-black mb-2 ${textPrimary}`}>
                  Project List
                </label>
                <select
                  value={formData.project}
                  onChange={handleProjectChange}
                  className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                >
                  <option value="">Select Project</option>
                  {availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>

              {/* User Selection Section */}
              <div>
                <label className={`block text-sm font-black mb-3 ${textPrimary}`}>
                  User Name
                </label>
                <div className="space-y-3">
                  {formData.users.map((user, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <select
                            value={user.assignedUser}
                            onChange={(e) => handleUserChange(index, 'assignedUser', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                          >
                            <option value="">Select User</option>
                            {availableUsers.map(availableUser => (
                              <option key={availableUser.name} value={availableUser.name}>{availableUser.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={user.designation}
                            onChange={(e) => handleUserChange(index, 'designation', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                            placeholder="Designation"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(index)}
                        disabled={formData.users.length === 1}
                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                          formData.users.length === 1
                            ? isDark ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : isDark ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        title="Remove User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddMoreUsers}
                  className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'}`}
                >
                  <Plus className="w-4 h-4" /> Add More Users
                </button>
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
                onClick={handleCreatePermission}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
              >
                Submit
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
                Are you sure you want to delete this project permission? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePermission(deleteConfirmId)}
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

export default ProjectPermissions;
