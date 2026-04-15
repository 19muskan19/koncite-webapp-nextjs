'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { ThemeType } from '@/types';
import { projectAllocationAPI, prApprovalAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';

interface ScrollSelectOption {
  value: string;
  label: string;
}

/** Custom dropdown so the options list can scroll (`select` option lists are not styleable in most browsers). */
function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder,
  isDark,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ScrollSelectOption[];
  placeholder: string;
  isDark: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;
  const empty = !value;

  const triggerBase = isDark
    ? 'bg-slate-900 border-slate-600 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';
  const panelBase = isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-300';
  const itemHover = isDark ? 'hover:bg-slate-700/80' : 'hover:bg-slate-100';
  const itemActive = isDark ? 'bg-slate-700/90 text-[#C2D642]' : 'bg-slate-100 text-slate-900 font-semibold';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C2D642]/40',
          'flex items-center justify-between gap-2 text-left min-h-[42px]',
          triggerBase,
          empty && (isDark ? 'text-slate-400' : 'text-slate-500')
        )}
      >
        <span className="truncate flex-1 min-w-0">{display}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 opacity-70 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute left-0 right-0 z-[100] mt-1 max-h-60 overflow-y-auto custom-scrollbar rounded-lg border py-1 shadow-xl',
            panelBase
          )}
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={empty}
              className={cn('w-full px-3 py-2.5 text-left text-sm', itemHover, empty && itemActive)}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm truncate',
                  itemHover,
                  value === o.value && itemActive
                )}
                title={o.label}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ProjectOption {
  id: number;
  uuid?: string;
  project_name: string;
}

interface UserOption {
  id: number;
  name: string;
}

interface PRProjectUserAllocationProps {
  theme: ThemeType;
}

interface UserSlot {
  id: string;
  userId: string;
}

function newUserSlot(): UserSlot {
  return { id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, userId: '' };
}

const PRProjectUserAllocation: React.FC<PRProjectUserAllocationProps> = ({ theme }) => {
  const toast = useToast();
  const isDark = theme === 'dark';
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [userSlots, setUserSlots] = useState<UserSlot[]>(() => [newUserSlot()]);
  const [loadingForm, setLoadingForm] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const labelClass = isDark ? 'text-slate-200' : 'text-slate-900';
  const cardClass = isDark ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg';

  const projectOptions: ScrollSelectOption[] = projects.map((p) => ({
    value: String(p.id),
    label: p.project_name,
  }));
  const userOptions: ScrollSelectOption[] = users.map((u) => ({
    value: String(u.id),
    label: u.name,
  }));

  const loadForm = useCallback(async () => {
    setLoadingForm(true);
    try {
      const data = await projectAllocationAPI.getAddFormData();
      const projList = data?.projects ?? [];
      setProjects(
        projList.map((p: Record<string, unknown>) => ({
          id: Number(p.id ?? p.projects_id ?? 0),
          uuid: typeof p.uuid === 'string' ? p.uuid : typeof p.project_uuid === 'string' ? p.project_uuid : undefined,
          project_name: String(p.project_name ?? p.name ?? '-'),
        }))
      );
      const userList = data?.users ?? [];
      setUsers(
        userList.map((u: Record<string, unknown>) => ({
          id: Number(u.id ?? u.company_user_id ?? u.user_id ?? 0),
          name: String(u.name ?? u.user_name ?? u.email ?? '-'),
        }))
      );
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load form';
      toast.showError(msg);
    } finally {
      setLoadingForm(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  const addUserField = () => setUserSlots((prev) => [...prev, newUserSlot()]);

  const removeUserField = (slotId: string) => {
    setUserSlots((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== slotId)));
  };

  const updateUser = (slotId: string, value: string) => {
    setUserSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, userId: value } : s)));
  };

  const handleSubmit = async () => {
    const pid = Number(projectId);
    const user_allocation: number[] = [];
    for (const uidStr of userSlots.map((s) => s.userId)) {
      const uid = Number(uidStr);
      if (!uid) continue;
      if (!user_allocation.includes(uid)) user_allocation.push(uid);
    }

    if (!pid || user_allocation.length === 0) {
      toast.showWarning('Select a project and at least one user.');
      return;
    }

    setSubmitting(true);
    try {
      await prApprovalAPI.add({ project_id: pid, user_allocation });
      toast.showSuccess('Allocation submitted successfully.');
      setProjectId('');
      setUserSlots([newUserSlot()]);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Submit failed';
      toast.showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-8rem)] ${isDark ? 'bg-[#0a0a0a]' : 'bg-slate-100/90'}`}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <h1 className={`text-xl sm:text-2xl font-bold mb-6 ${textPrimary}`}>Project and User Allocation</h1>

        <div className={`rounded-2xl border p-6 sm:p-8 ${cardClass}`}>
          {loadingForm ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 sm:items-start">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${labelClass}`}>Project List</label>
                    <ScrollableSelect
                      value={projectId}
                      onChange={setProjectId}
                      options={projectOptions}
                      placeholder="Select Project"
                      isDark={isDark}
                    />
                  </div>
                  <div className="space-y-3">
                    {userSlots.map((slot) => (
                      <div key={slot.id}>
                        <label className={`block text-sm font-bold mb-2 ${labelClass}`}>User Name</label>
                        <div className="flex gap-2 items-stretch">
                          <ScrollableSelect
                            value={slot.userId}
                            onChange={(v) => updateUser(slot.id, v)}
                            options={userOptions}
                            placeholder="Select User"
                            isDark={isDark}
                            className="flex-1 min-w-0"
                          />
                          {userSlots.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeUserField(slot.id)}
                              className={`shrink-0 inline-flex items-center justify-center w-11 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/50 ${
                                isDark
                                  ? 'border-red-900/80 bg-red-950/90 text-red-200 hover:bg-red-900/80'
                                  : 'border-red-200 bg-red-600 text-white hover:bg-red-700'
                              }`}
                              aria-label="Remove user row"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={addUserField}
                        className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                          isDark
                            ? 'border-slate-500 text-slate-200 hover:bg-slate-700/80'
                            : 'border-slate-300 text-slate-800 bg-white hover:bg-slate-50'
                        }`}
                      >
                        Add More
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-4 border-t border-inherit">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="px-8 py-2.5 rounded-lg font-bold text-white bg-[#C2D642] hover:bg-[#b8cc3a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-[#C2D642]/25 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Submit
                </button>
              </div>

              <p className={`text-xs mt-4 ${textSecondary}`}>
                Add More adds another user for the selected project. Submit saves all selected users for that project.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PRProjectUserAllocation;
