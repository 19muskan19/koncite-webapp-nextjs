'use client';

import React from 'react';
import { ThemeType } from '@/types';

export interface TaskFormData {
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
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
  knownNames: string[];
}

const TaskModal: React.FC<TaskModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSubmit,
  isEditing,
  editingId,
  initialData = {},
  knownNames,
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const [form, setForm] = React.useState<TaskFormData>({
    title: '',
    description: '',
    assigned_to: '',
    assigned_by: '',
    due_date: '',
    priority: 'medium',
    status: 'todo',
    tags: '',
    ...initialData,
  });

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        description: '',
        assigned_to: '',
        assigned_by: '',
        due_date: '',
        priority: 'medium',
        status: 'todo',
        tags: '',
        ...initialData,
      });
    }
  }, [isOpen, editingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const assignedTo = form.assigned_to.trim();
    const assignedBy = form.assigned_by.trim();
    if (!title) return;
    if (!assignedTo) return;
    if (!assignedBy) return;
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full max-w-[540px] max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto rounded-xl border p-4 sm:p-7 my-auto ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`font-bold text-base sm:text-lg mb-4 sm:mb-5 ${textPrimary}`}>
          {isEditing ? 'Edit Task' : 'Create New Task'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
              Task Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              autoFocus
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
              className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm resize-y min-h-[72px] sm:min-h-[80px] outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Assign To * <span className="normal-case font-normal text-[10px]">type any name</span>
              </label>
              <input
                type="text"
                list="task-name-list"
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                placeholder="e.g. Sarah Connor"
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Assigned By * <span className="normal-case font-normal text-[10px]">type any name</span>
              </label>
              <input
                type="text"
                list="task-name-list"
                value={form.assigned_by}
                onChange={(e) => setForm((f) => ({ ...f, assigned_by: e.target.value }))}
                placeholder="e.g. John Doe"
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>
          <datalist id="task-name-list">
            {knownNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
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
                className={`w-full rounded-lg border px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium bg-[#C2D642] text-white hover:opacity-90`}
            >
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
