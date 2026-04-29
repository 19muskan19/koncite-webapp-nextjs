'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeType } from '@/types';
import type { TaskFormDataUser } from '@/services/api';

export interface TaskFormData {
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  due_date: string;
  priority: string;
  status: string;
  tags: string;
}

interface TaskModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  isEditing: boolean;
  editingId: string | null;
  initialData?: Partial<TaskFormData>;
  /** Staff (company users) from GET /teams-list — assign To / By are selects only. */
  companyUsers: TaskFormDataUser[];
  /** In edit mode: if false, task is view-only (no Save). Assignee receives true from parent. */
  canSaveChanges?: boolean;
  /** Edit mode: parent is fetching GET /tasks/{uuid}. */
  isLoadingDetail?: boolean;
}

const emptyForm = (): TaskFormData => ({
  title: '',
  description: '',
  assigned_to: '',
  assigned_by: '',
  assigned_to_user_id: '',
  assigned_by_user_id: '',
  due_date: '',
  priority: 'medium',
  status: 'todo',
  tags: '',
});

/** Stable fallback so `useEffect` deps don’t change every render (default `= {}` in params does). */
const EMPTY_PARTIAL: Partial<TaskFormData> = {};

const TaskModal: React.FC<TaskModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSubmit,
  isEditing,
  editingId,
  initialData,
  companyUsers,
  canSaveChanges = true,
  isLoadingDetail = false,
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const mergedInitial = initialData ?? EMPTY_PARTIAL;

  const [form, setForm] = React.useState<TaskFormData>(() => ({ ...emptyForm(), ...mergedInitial }));

  React.useEffect(() => {
    if (!isOpen) return;
    if (isEditing && isLoadingDetail) return;
    setForm({ ...emptyForm(), ...mergedInitial });
  }, [isOpen, editingId, mergedInitial, isEditing, isLoadingDetail]);

  const setAssignToFromUserId = (idStr: string) => {
    const u = idStr ? companyUsers.find((x) => String(x.id) === idStr) : undefined;
    setForm((f) => ({
      ...f,
      assigned_to_user_id: idStr,
      assigned_to: u?.name ?? '',
    }));
  };

  const setAssignByFromUserId = (idStr: string) => {
    const u = idStr ? companyUsers.find((x) => String(x.id) === idStr) : undefined;
    setForm((f) => ({
      ...f,
      assigned_by_user_id: idStr,
      assigned_by: u?.name ?? '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && !canSaveChanges) return;
    if (isEditing) {
      onSubmit(form);
      return;
    }
    const title = form.title.trim();
    if (!title) return;
    if (!form.assigned_to_user_id || !form.assigned_by_user_id) return;
    onSubmit(form);
  };

  if (!isOpen) return null;

  const selectClass = `w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full max-w-[540px] max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto rounded-xl border p-4 sm:p-7 my-auto ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing && isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" aria-hidden />
            <p className={`text-sm ${textSecondary}`}>Loading task…</p>
          </div>
        ) : (
          <>
        <h2 className={`font-bold text-base sm:text-lg mb-4 sm:mb-5 ${textPrimary}`}>
          {isEditing ? (canSaveChanges ? 'Edit task' : 'Task details') : 'Create New Task'}
        </h2>
        {isEditing && canSaveChanges && (
          <p className={`text-xs mb-4 ${textSecondary}`}>
            Only description and status can be changed here. Other fields are read-only.
          </p>
        )}
        {isEditing && !canSaveChanges && (
          <p className={`text-xs mb-4 ${textSecondary}`}>
            You can view this task. Only the assignee can change description and status or use Update for quick status changes.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
              Task Title {isEditing ? '' : '*'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className={`${selectClass} ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
              readOnly={isEditing}
              autoFocus={!isEditing}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add more details…"
              rows={3}
              readOnly={isEditing && !canSaveChanges}
              className={`${selectClass} resize-y min-h-[72px] sm:min-h-[80px] ${isEditing && !canSaveChanges ? 'opacity-80 cursor-not-allowed' : ''}`}
            />
          </div>
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                  Assign To * <span className="normal-case font-normal text-[10px]">staff</span>
                </label>
                {companyUsers.length === 0 ? (
                  <p className={`text-xs ${textSecondary}`}>No staff loaded. Check Teams list under User Management.</p>
                ) : (
                  <select
                    value={form.assigned_to_user_id}
                    onChange={(e) => setAssignToFromUserId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="">— Select staff —</option>
                    {companyUsers.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                  Assigned By * <span className="normal-case font-normal text-[10px]">staff</span>
                </label>
                {companyUsers.length === 0 ? (
                  <p className={`text-xs ${textSecondary}`}>No staff loaded. Check Teams list under User Management.</p>
                ) : (
                  <select
                    value={form.assigned_by_user_id}
                    onChange={(e) => setAssignByFromUserId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="">— Select staff —</option>
                    {companyUsers.map((u) => (
                      <option key={`by-${u.id}`} value={String(u.id)}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isEditing && (
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className={selectClass}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}
            <div className={isEditing ? 'sm:col-span-2' : ''}>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                disabled={isEditing && !canSaveChanges}
                className={`${selectClass} ${isEditing && !canSaveChanges ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                <option value="todo">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={selectClass}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                  Tags <span className="normal-case font-normal text-[10px]">comma separated</span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="design, bug, api…"
                  className={selectClass}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {isEditing && !canSaveChanges ? 'Close' : 'Cancel'}
            </button>
            {(!isEditing || canSaveChanges) && (
              <button
                type="submit"
                disabled={!isEditing && companyUsers.length === 0}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-[#C2D642] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            )}
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskModal;
