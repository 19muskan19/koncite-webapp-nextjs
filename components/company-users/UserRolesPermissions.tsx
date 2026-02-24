'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Settings,
  ChevronUp,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  isSystemRole?: boolean; // For roles that can't be edited/deleted
}

interface UserRolesPermissionsProps {
  theme: ThemeType;
}

const UserRolesPermissions: React.FC<UserRolesPermissionsProps> = ({ theme }) => {
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formData, setFormData] = useState({
    name: ''
  });
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Default roles (system roles that can't be deleted)
  const defaultRoles = useMemo(() => [
    { id: '1', name: 'Super Admin', isSystemRole: true },
    { id: '2', name: 'Project Manager', isSystemRole: false },
    { id: '3', name: 'Site Engineer', isSystemRole: false },
    { id: '4', name: 'Store Keepers', isSystemRole: false },
    { id: '5', name: 'Supervisor', isSystemRole: false },
  ], []);

  // Load roles from localStorage on mount
  useEffect(() => {
    const savedRoles = localStorage.getItem('userRoles');
    if (savedRoles) {
      try {
        const parsed = JSON.parse(savedRoles);
        setRoles(parsed);
      } catch (e) {
        setRoles([]);
      }
    } else {
      setRoles([]);
    }
  }, []);

  // Save roles to localStorage whenever roles state changes
  useEffect(() => {
    if (roles.length > 0) {
      try {
        localStorage.setItem('userRoles', JSON.stringify(roles));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('rolesUpdated'));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    } else {
      localStorage.removeItem('userRoles');
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('rolesUpdated'));
    }
  }, [roles]);

  // Combine default and user-added roles
  const allRoles = useMemo(() => {
    return [...defaultRoles, ...roles];
  }, [defaultRoles, roles]);

  // Filter and sort roles
  const filteredAndSortedRoles = useMemo(() => {
    let filtered = allRoles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Role];
        let bValue: any = b[sortConfig.key as keyof Role];

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
  }, [allRoles, searchQuery, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRoles.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedRoles = filteredAndSortedRoles.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCloseModal = () => {
    setShowRoleModal(false);
    setEditingRoleId(null);
    setFormData({
      name: ''
    });
  };

  const handleCreateRole = () => {
    if (!formData.name.trim()) {
      alert('Please enter a role name');
      return;
    }

    // Check if role already exists
    if (allRoles.some(r => r.name.toLowerCase() === formData.name.toLowerCase())) {
      alert('A role with this name already exists');
      return;
    }

    const newRole: Role = {
      id: Date.now().toString(),
      name: formData.name.trim()
    };

    setRoles(prev => [...prev, newRole]);
    handleCloseModal();
  };

  const handleEditRole = (roleId: string) => {
    const role = allRoles.find(r => r.id === roleId);
    if (role) {
      setEditingRoleId(roleId);
      setFormData({
        name: role.name
      });
      setShowRoleModal(true);
    }
  };

  const handleUpdateRole = () => {
    if (!formData.name.trim()) {
      alert('Please enter a role name');
      return;
    }

    if (editingRoleId && defaultRoles.find(r => r.id === editingRoleId)) {
      alert('Cannot edit system role');
      return;
    }

    // Check if role name already exists (excluding current role)
    if (allRoles.some(r => r.id !== editingRoleId && r.name.toLowerCase() === formData.name.toLowerCase())) {
      alert('A role with this name already exists');
      return;
    }

    setRoles(prev => prev.map(role => 
      role.id === editingRoleId 
        ? { ...role, name: formData.name.trim() }
        : role
    ));
    handleCloseModal();
  };

  const handleDeleteRole = (roleId: string) => {
    if (defaultRoles.find(r => r.id === roleId)) {
      alert('Cannot delete system role');
      return;
    }
    setRoles(prev => prev.filter(role => role.id !== roleId));
    setDeleteConfirmId(null);
    // Event will be dispatched by useEffect when roles state updates
  };

  const handleExportExcel = () => {
    // Simple CSV export
    const headers = ['#', 'Name'];
    const rows = filteredAndSortedRoles.map((role, idx) => [idx + 1, role.name]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-roles.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
            <ShieldCheck className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Roles and Permissions</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage all user roles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowRoleModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New Role
          </button>
        </div>
      </div>

      {/* List User Roles Section */}
      <div className={`rounded-xl border ${cardClass}`}>
        <div className="p-4 border-b border-inherit">
          <h2 className={`text-sm font-black uppercase tracking-wider ${textPrimary} mb-4`}>
            LIST USER ROLES
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${textSecondary}`}>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className={`text-sm font-bold ${textSecondary}`}>entries</span>
              <button
                onClick={handleExportExcel}
                className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
              >
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className={`text-sm font-bold ${textSecondary}`}>Search:</label>
              <div className="relative flex-1 sm:flex-initial">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                <input 
                  type="text" 
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        {paginatedRoles.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                      #
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
                      className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary} cursor-pointer hover:opacity-80`}
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Action
                        {getSortIcon('id')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {paginatedRoles.map((role, idx) => (
                    <tr key={role.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                      <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                        {startIndex + idx + 1}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                        {role.name}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!role.isSystemRole ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditRole(role.id)}
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
                              onClick={() => setDeleteConfirmId(role.id)}
                              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-100 text-red-600'}`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs ${textSecondary}`}>System Role</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-inherit flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className={`text-sm font-bold ${textSecondary}`}>
                Showing {filteredAndSortedRoles.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredAndSortedRoles.length)} of {filteredAndSortedRoles.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    currentPage === 1
                      ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      currentPage === page
                        ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    currentPage === totalPages
                      ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`p-12 text-center ${cardClass}`}>
            <ShieldCheck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Roles Found</h3>
            <p className={`text-sm ${textSecondary}`}>Start by adding your first role</p>
          </div>
        )}
      </div>

      {/* Add Role Modal */}
      {showRoleModal && !editingRoleId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md`}>
            <div className="p-6">
              <h2 className={`text-xl font-black mb-4 ${textPrimary}`}>
                Add New Role
              </h2>
              <div className="mb-6">
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Enter Role Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateRole();
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  placeholder="Enter role name"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
                >
                  Add New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showRoleModal && editingRoleId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md`}>
            <div className="p-6">
              <h2 className={`text-xl font-black mb-4 ${textPrimary}`}>
                Edit Role
              </h2>
              <div className="mb-6">
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Role Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateRole();
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                  placeholder="Enter role name"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
                >
                  Update
                </button>
              </div>
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
                Are you sure you want to delete this role? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRole(deleteConfirmId)}
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

export default UserRolesPermissions;
