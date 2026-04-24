'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeType } from '../types';
import { ShieldCheck, Plus, Search, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectAllocationAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface ProjectPermission {
  id: number;
  project_id: number;
  project_uuid?: string;
  project_name: string;
  sub_project_id?: number | null;
  company_user_id: number;
  user_uuid?: string;
  user_name: string;
  designation: string;
}

interface ProjectOption {
  id: number;
  uuid?: string;
  project_name: string;
}

interface UserOption {
  id: number;
  uuid?: string;
  name: string;
  email?: string;
  designation: string;
}

interface ProjectPermissionsProps {
  theme: ThemeType;
}

const ProjectPermissions: React.FC<ProjectPermissionsProps> = ({ theme }) => {
  const toast = useToast();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [subprojects, setSubprojects] = useState<{ id: number; uuid?: string; sub_project_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    projectId: '' as string,
    projectUuid: '' as string,
    subProjectId: '' as string,
    selectedUserIds: [] as number[],
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await projectAllocationAPI.list();
      const rows: ProjectPermission[] = (list || []).map((item: any) => ({
        id: item.id,
        project_id: item.project_id ?? item.projects_id,
        project_uuid: item.project_uuid,
        project_name: item.project_name ?? item.project?.project_name ?? '-',
        sub_project_id: item.sub_project_id ?? null,
        company_user_id: item.company_user_id ?? item.company_user?.id,
        user_uuid: item.user_uuid,
        user_name: item.user_name ?? item.company_user?.name ?? '-',
        designation: item.designation ?? item.company_user?.designation ?? '-',
      }));
      setPermissions(rows);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load project permissions');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadAddFormData = useCallback(async () => {
    setIsFormLoading(true);
    try {
      const addFormData = await projectAllocationAPI.getProjectAllocationAddForm();
      const projList = addFormData?.projects ?? [];
      setProjects(
        (projList || []).map((p: any) => ({
          id: p.id ?? p.projects_id,
          uuid: p.uuid ?? p.project_uuid,
          project_name: p.project_name ?? p.name ?? '-',
        }))
      );
      const formUsers = Array.isArray(addFormData?.users) ? addFormData.users : [];
      setUsers(
        formUsers.map((u: any) => ({
          id: u.id ?? u.company_user_id ?? u.user_id,
          uuid: u.uuid ?? u.user_uuid,
          name: u.name ?? u.user?.name ?? u.user_name ?? u.email ?? '-',
          email: u.email,
          designation: u.designation ?? u.company_role?.name ?? u.role_type ?? '-',
        }))
      );
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to load form data');
    } finally {
      setIsFormLoading(false);
    }
  }, [toast]);

  const loadSubprojects = useCallback(
    async (projectUuid: string) => {
      if (!projectUuid) {
        setSubprojects([]);
        return;
      }
      try {
        const list = await projectAllocationAPI.getSubprojects(projectUuid);
        setSubprojects(
          (list || []).map((s: any) => ({
            id: s.id ?? s.sub_projects_id,
            uuid: s.uuid,
            sub_project_name: s.sub_project_name ?? s.name ?? '-',
          }))
        );
      } catch {
        setSubprojects([]);
      }
    },
    []
  );

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    if (showPermissionModal) {
      loadAddFormData();
    }
  }, [showPermissionModal, loadAddFormData]);

  useEffect(() => {
    const proj = projects.find(
      (p) => String(p.id) === formData.projectId || p.uuid === formData.projectUuid
    );
    if (proj?.uuid) {
      loadSubprojects(proj.uuid);
    } else {
      setSubprojects([]);
    }
  }, [formData.projectId, formData.projectUuid, projects]);

  const filteredPermissions = useMemo(
    () =>
      permissions.filter(
        (p) =>
          !searchQuery.trim() ||
          p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [permissions, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / entriesPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredPermissions.slice(start, start + entriesPerPage);
  }, [filteredPermissions, currentPage, entriesPerPage]);

  useEffect(() => setCurrentPage(1), [searchQuery]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const proj = projects.find((p) => String(p.id) === val || p.uuid === val);
    setFormData({
      ...formData,
      projectId: proj ? String(proj.id) : '',
      projectUuid: proj?.uuid ?? '',
      subProjectId: '',
      selectedUserIds: [],
    });
  };

  const handleUserToggle = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedUserIds: prev.selectedUserIds.includes(userId)
        ? prev.selectedUserIds.filter((id) => id !== userId)
        : [...prev.selectedUserIds, userId],
    }));
  };

  const handleCloseModal = () => {
    setShowPermissionModal(false);
    setDeleteConfirmId(null);
    setFormData({
      projectId: '',
      projectUuid: '',
      subProjectId: '',
      selectedUserIds: [],
    });
  };

  const handleCreatePermission = async () => {
    const proj = projects.find(
      (p) => String(p.id) === formData.projectId || p.uuid === formData.projectUuid
    );
    if (!proj) {
      toast.showError('Please select a project');
      return;
    }
    if (formData.selectedUserIds.length === 0) {
      toast.showError('Please select at least one user');
      return;
    }

    try {
      const payload: { project_id?: number; project_uuid?: string; user_allocation: number[]; sub_project_id?: number | null } = {
        user_allocation: formData.selectedUserIds,
        sub_project_id: formData.subProjectId ? Number(formData.subProjectId) : undefined,
      };
      if (formData.projectId && !isNaN(Number(formData.projectId))) {
        payload.project_id = Number(formData.projectId);
      } else if (formData.projectUuid) {
        payload.project_uuid = formData.projectUuid;
      }
      await projectAllocationAPI.add(payload);
      toast.showSuccess('Project permission(s) added successfully');
      handleCloseModal();
      loadPermissions();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to add project permission');
    }
  };

  const handleDeletePermission = async (id: number) => {
    try {
      await projectAllocationAPI.delete(id);
      toast.showSuccess('Project permission removed successfully');
      setDeleteConfirmId(null);
      loadPermissions();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to delete project permission');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <ShieldCheck className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>
              Project Permissions
            </h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage project-level access and permissions
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPermissionModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
        >
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      <div className={`flex flex-col gap-4 p-4 rounded-xl border ${cardClass}`}>
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

      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className="p-4 border-b border-inherit">
          <h2 className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}>
            PROJECT PERMISSION
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-[#6B8E23]" />
          </div>
        ) : filteredPermissions.length > 0 ? (
          <>
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
                  {paginated.map((permission, idx) => (
                    <tr
                      key={permission.id}
                      className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}
                    >
                      <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                        {(currentPage - 1) * entriesPerPage + idx + 1}
                      </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {permission.project_name}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                      {permission.user_name}
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
          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}
          >
            <div className={`text-sm ${textSecondary}`}>
              Showing {(currentPage - 1) * entriesPerPage + 1} to{' '}
              {Math.min(currentPage * entriesPerPage, filteredPermissions.length)} of{' '}
              {filteredPermissions.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm font-bold ${textPrimary}`}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border border-inherit disabled:opacity-50`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          </>
        ) : (
          <div className={`p-12 text-center ${cardClass}`}>
            <ShieldCheck className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
            <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Permissions Found</h3>
            <p className={`text-sm ${textSecondary}`}>
              Start by adding your first project permission
            </p>
          </div>
        )}
      </div>

      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6 border-b border-inherit">
              <h2 className={`text-2xl font-black text-center ${textPrimary}`}>
                Project and User Allocation
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {isFormLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-[#6B8E23]" />
                </div>
              ) : (
                <>
                  <div>
                    <label className={`block text-sm font-black mb-2 ${textPrimary}`}>
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.projectId || formData.projectUuid}
                      onChange={handleProjectChange}
                      className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.uuid || String(p.id)}>
                          {p.project_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subprojects.length > 0 && (
                    <div>
                      <label className={`block text-sm font-black mb-2 ${textPrimary}`}>
                        Sub-project
                      </label>
                      <select
                        value={formData.subProjectId}
                        onChange={(e) =>
                          setFormData({ ...formData, subProjectId: e.target.value })
                        }
                        className={`w-full px-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      >
                        <option value="">None</option>
                        {subprojects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.sub_project_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-black mb-3 ${textPrimary}`}>
                      Users <span className="text-red-500">*</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-inherit p-3">
                      {users.map((u) => (
                        <label
                          key={u.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedUserIds.includes(u.id)}
                            onChange={() => handleUserToggle(u.id)}
                            className="rounded border-slate-300 text-[#6B8E23] focus:ring-[#6B8E23]"
                          />
                          <span className={`text-sm font-medium ${textPrimary}`}>{u.name}</span>
                          <span className={`text-xs ${textSecondary}`}>({u.designation})</span>
                        </label>
                      ))}
                      {users.length === 0 && (
                        <p className={`text-sm ${textSecondary}`}>No users available</p>
                      )}
                    </div>
                  </div>
                </>
              )}
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
                disabled={isFormLoading}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId != null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-lg`}>
            <div className="p-6">
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Confirm Delete</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Are you sure you want to delete this project permission? This action cannot be
                undone.
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
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 hover:bg-red-700 text-white"
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
