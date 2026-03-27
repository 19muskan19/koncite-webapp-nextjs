'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  LayoutList,
  LayoutGrid,
  Calendar,
  Sparkles,
  Search,
  Plus,
  Inbox,
  Send,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useMainSidebar } from '@/contexts/MainSidebarContext';
import { useUser } from '@/contexts/UserContext';
import { taskAPI, teamsAPI, type TaskFormDataUser } from '@/services/api';
import TaskModal, { TaskFormData } from './TaskModal';
import TaskStatusUpdateModal from './TaskStatusUpdateModal';
import { TaskCommentsBlock } from './TaskCommentsBlock';
import { splitDescriptionAndStatusComments } from './statusUpdateDescription';

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** Latest status / completion note from API (`remark` on PATCH response or GET task). */
  remark?: string;
  assigned_to?: string;
  assigned_by?: string;
  assigned_to_user_id?: number;
  assigned_by_user_id?: number;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  tags?: string[];
}

type ViewType = 'all' | 'assigned-to' | 'assigned-by';
type LayoutType = 'list' | 'kanban' | 'calendar' | 'ai';

const PILL_COLORS = [
  { bg: 'rgba(124,92,252,.2)', dot: '#7c5cfc' },
  { bg: 'rgba(232,86,122,.2)', dot: '#e8567a' },
  { bg: 'rgba(245,159,0,.2)', dot: '#f59f00' },
  { bg: 'rgba(56,217,169,.2)', dot: '#38d9a9' },
  { bg: 'rgba(99,180,255,.2)', dot: '#63b4ff' },
  { bg: 'rgba(255,136,80,.2)', dot: '#ff8850' },
];

const getNameColor = (() => {
  const cache: Record<string, (typeof PILL_COLORS)[0]> = {};
  let idx = 0;
  return (name: string) => {
    if (!name) return PILL_COLORS[0];
    const k = name.trim().toLowerCase();
    if (!cache[k]) cache[k] = PILL_COLORS[idx++ % PILL_COLORS.length];
    return cache[k];
  };
})();

const STATUS_LABELS: Record<string, string> = {
  todo: 'Open',
  in_progress: 'In Progress',
  done: 'Completed',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** teams-list row → task assignee picker (company_users.id) */
function mapTeamRowToFormUser(row: any): TaskFormDataUser | null {
  const raw = row?.id ?? row?.company_user_id ?? row?.user_id;
  const id = typeof raw === 'number' && Number.isFinite(raw) ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = String(row?.name || '').trim();
  if (!name) return null;
  return { id, name, email: row?.email };
}

/**
 * Whether the logged-in user is the task assignee (same rules as Laravel assignee check).
 * Prefer company_users id from profile (`company_user_id`); then match `assigned_to_company_user_id`
 * from API; if ids missing or profile id is not the pivot id, fall back to assignee display name.
 */
function taskIsAssignedToMe(t: Task, companyUserId: number | undefined, myNameNorm: string): boolean {
  if (companyUserId != null && t.assigned_to_user_id != null) {
    if (Number(t.assigned_to_user_id) === Number(companyUserId)) return true;
  }
  return myNameNorm.length > 0 && (t.assigned_to || '').trim().toLowerCase() === myNameNorm;
}

function taskIsAssignedByMe(t: Task, companyUserId: number | undefined, myNameNorm: string): boolean {
  if (companyUserId != null && t.assigned_by_user_id != null) {
    if (Number(t.assigned_by_user_id) === Number(companyUserId)) return true;
  }
  return myNameNorm.length > 0 && (t.assigned_by || '').trim().toLowerCase() === myNameNorm;
}

/** company-api user id: prefer explicit company_user_id from profile, then nested company user, then id. */
function companyUserIdFromProfile(user: { id?: number; company_user_id?: number; company_user?: { id?: number }; [k: string]: unknown } | null): number | undefined {
  if (!user) return undefined;
  const raw: unknown = user.company_user_id ?? user.company_user?.id ?? user.id;
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function mergeTaskIntoList(prev: Task[], row: Task): Task[] {
  const i = prev.findIndex((x) => x.id === row.id);
  if (i === -1) return [row, ...prev];
  const next = [...prev];
  next[i] = { ...next[i], ...row };
  return next;
}

function taskToFormDataPartial(t: Task): Partial<TaskFormData> {
  return {
    title: t.title,
    description: t.description ?? '',
    assigned_to: t.assigned_to || '',
    assigned_by: t.assigned_by || '',
    assigned_to_user_id: t.assigned_to_user_id != null ? String(t.assigned_to_user_id) : '',
    assigned_by_user_id: t.assigned_by_user_id != null ? String(t.assigned_by_user_id) : '',
    due_date: t.due_date || '',
    priority: t.priority,
    status: t.status,
    tags: (t.tags || []).join(', '),
  };
}

interface TaskManagementProps {
  theme: ThemeType;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ theme }) => {
  const toast = useToast();
  const { user } = useUser();
  const mainSidebar = useMainSidebar();
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('list');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: 'Hi! I can answer questions about tasks, workloads, deadlines, assignees, and more. What would you like to know?' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<TaskFormDataUser[]>([]);
  /** Task row from GET /tasks/{uuid} — status modal opens only after load succeeds. */
  const [statusModalTaskRow, setStatusModalTaskRow] = useState<Task | null>(null);
  /** Task row from GET /tasks/{uuid} for edit modal — form hydrates from this only. */
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const [editModalLoading, setEditModalLoading] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      if (window.innerWidth < 640) setSidebarCollapsed(true);
    };
    checkScreen();
  }, []);

  const loadTasks = useCallback(async (): Promise<Task[]> => {
    setLoading(true);
    try {
      const role =
        currentView === 'assigned-to'
          ? 'assigned_to_me'
          : currentView === 'assigned-by'
            ? 'assigned_by_me'
            : undefined;
      const tasks = await taskAPI.getTasks({ role });
      const list: Task[] = Array.isArray(tasks) ? tasks : [];
      setAllTasks(list);
      return list;
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load tasks');
      setAllTasks([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentView, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    teamsAPI
      .getTeamsList()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const users: TaskFormDataUser[] = [];
        const seen = new Set<number>();
        for (const row of list) {
          const u = mapTeamRowToFormUser(row);
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            users.push(u);
          }
        }
        users.sort((a, b) => a.name.localeCompare(b.name));
        setCompanyUsers(users);
      })
      .catch((e: any) => {
        toast.showError(e?.message || 'Failed to load staff');
        setCompanyUsers([]);
      });
  }, [toast]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const matchSearch =
        !searchQ ||
        (t.title || '').toLowerCase().includes(searchQ) ||
        (t.description || '').toLowerCase().includes(searchQ) ||
        (t.assigned_to || '').toLowerCase().includes(searchQ) ||
        (t.assigned_by || '').toLowerCase().includes(searchQ);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [allTasks, searchQ, statusFilter, priorityFilter]);

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = filteredTasks.filter((t) => t.due_date && t.due_date < todayStr && t.status !== 'done').length;

  const pageTitle = useMemo(() => {
    if (currentLayout === 'list') return currentView === 'all' ? 'All Tasks' : currentView === 'assigned-to' ? 'Assigned to Me' : 'Assigned by Me';
    if (currentLayout === 'kanban') return 'Kanban Board';
    if (currentLayout === 'calendar') return 'Calendar';
    return 'AI Assistant';
  }, [currentLayout, currentView]);

  const badgeAll = allTasks.length;
  /** Company-user id for company-api (tasks use company_users ids); name fallback when API omits id on list rows. */
  const myCompanyUserId = useMemo(() => companyUserIdFromProfile(user), [user]);
  const myNameNorm = (user?.name || '').trim().toLowerCase();
  const canCountMeBadges = myCompanyUserId != null || myNameNorm.length > 0;
  const badgeToMe = canCountMeBadges
    ? allTasks.filter((t) => taskIsAssignedToMe(t, myCompanyUserId, myNameNorm)).length
    : '—';
  const badgeByMe = canCountMeBadges
    ? allTasks.filter((t) => taskIsAssignedByMe(t, myCompanyUserId, myNameNorm)).length
    : '—';

  const openCreateModal = () => {
    setEditingId(null);
    setEditModalTask(null);
    setEditModalLoading(false);
    setModalOpen(true);
    mainSidebar?.setSidebarOpen(false);
  };

  /** GET /tasks/{uuid} then open modal — matches TaskController::show. */
  const openEditModal = async (id: string) => {
    setEditingId(id);
    setEditModalTask(null);
    setEditModalLoading(true);
    setModalOpen(true);
    mainSidebar?.setSidebarOpen(false);
    try {
      const row = (await taskAPI.getTask(id)) as Task;
      if (!row?.id) throw new Error('Invalid task response');
      setEditModalTask(row);
      setAllTasks((prev) => mergeTaskIntoList(prev, row));
    } catch (e: any) {
      toast.showError(e?.message || 'Could not load task');
      setModalOpen(false);
      setEditingId(null);
    } finally {
      setEditModalLoading(false);
    }
  };

  const openStatusUpdateModal = async (id: string) => {
    try {
      const row = (await taskAPI.getTask(id)) as Task;
      if (!row?.id) throw new Error('Invalid task response');
      const fromList = allTasks.find((x) => x.id === id);
      const rApi = row.remark?.trim() ?? '';
      const rList = fromList?.remark?.trim() ?? '';
      const mergedRow: Task = { ...row, ...(rApi || rList ? { remark: rApi || rList } : {}) };
      setAllTasks((prev) => mergeTaskIntoList(prev, mergedRow));
      setStatusModalTaskRow(mergedRow);
    } catch (e: any) {
      toast.showError(e?.message || 'Could not load task');
    }
  };

  const handleModalSubmit = async (data: TaskFormData) => {
    const payload: {
      title: string;
      description?: string;
      assigned_to?: string;
      assigned_by?: string;
      assigned_to_user_id?: number;
      assigned_by_user_id?: number;
      due_date?: string;
      priority?: string;
      status?: string;
      tags?: string[];
    } = {
      title: data.title.trim(),
      description: data.description,
      due_date: data.due_date || undefined,
      priority: data.priority,
      status: data.status,
      tags: data.tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
    const toId = data.assigned_to_user_id ? Number(data.assigned_to_user_id) : NaN;
    const byId = data.assigned_by_user_id ? Number(data.assigned_by_user_id) : NaN;
    if (!Number.isNaN(toId) && toId > 0) payload.assigned_to_user_id = toId;
    else if (data.assigned_to.trim()) payload.assigned_to = data.assigned_to.trim();
    if (!Number.isNaN(byId) && byId > 0) payload.assigned_by_user_id = byId;
    else if (data.assigned_by.trim()) payload.assigned_by = data.assigned_by.trim();
    try {
      let createdRow: Task | null = null;
      if (editingId) {
        const editingTask = editModalTask && editModalTask.id === editingId ? editModalTask : undefined;
        if (!editingTask || !taskIsAssignedToMe(editingTask, myCompanyUserId, myNameNorm)) {
          toast.showWarning('Only the assignee can save changes to this task.');
          return;
        }
        const updated = (await taskAPI.updateTask(editingId, {
          description: data.description ?? '',
          status: data.status,
        })) as Task;
        setAllTasks((prev) => mergeTaskIntoList(prev, updated));
        toast.showSuccess('Task updated');
      } else {
        const row = await taskAPI.createTask(payload);
        createdRow = row as Task;
        toast.showSuccess('Task created');
      }
      setModalOpen(false);
      const refreshed = await loadTasks();
      // List API shape/filters sometimes omit the new row immediately; ensure it appears.
      if (!editingId && createdRow?.id && !refreshed.some((t) => t.id === createdRow!.id)) {
        setAllTasks((prev) => [createdRow as Task, ...prev.filter((t) => t.id !== createdRow!.id)]);
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to save task');
    }
  };

  const modalCanSaveChanges = useMemo(() => {
    if (!editingId) return true;
    if (!editModalTask || editModalTask.id !== editingId) return false;
    return taskIsAssignedToMe(editModalTask, myCompanyUserId, myNameNorm);
  }, [editingId, editModalTask, myCompanyUserId, myNameNorm]);

  /** Edit form fields come only from GET /tasks/{uuid} (not the list cache). */
  const modalInitialData = useMemo((): Partial<TaskFormData> | undefined => {
    if (!editingId) return undefined;
    if (editModalTask && editModalTask.id === editingId) {
      return taskToFormDataPartial(editModalTask);
    }
    return undefined;
  }, [editingId, editModalTask]);

  const handleStatusUpdateSave = async (taskId: string, apiStatus: string, remark?: string) => {
    const t =
      statusModalTaskRow && statusModalTaskRow.id === taskId
        ? statusModalTaskRow
        : allTasks.find((x) => x.id === taskId);
    if (!t || !taskIsAssignedToMe(t, myCompanyUserId, myNameNorm)) {
      toast.showWarning('Only the assignee can update status.');
      throw new Error('Assignee only');
    }
    try {
      const trimmedRemark = remark?.trim() ?? '';
      const payload: { status: string; remark?: string } = { status: apiStatus };
      if (trimmedRemark) payload.remark = trimmedRemark;
      const updated = (await taskAPI.updateTask(taskId, payload)) as Task;
      const remarkForUi =
        (updated.remark && String(updated.remark).trim()) ||
        trimmedRemark ||
        (t.remark && String(t.remark).trim()) ||
        '';
      const withRemark: Task = {
        ...t,
        ...updated,
        status: (updated.status ?? apiStatus) as Task['status'],
        remark: remarkForUi || undefined,
      };
      setAllTasks((prev) => mergeTaskIntoList(prev, withRemark));
      setStatusModalTaskRow((prev) => (prev?.id === taskId ? { ...prev, ...withRemark } : prev));
      toast.showSuccess('Status updated');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to update status');
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await taskAPI.deleteTask(id);
      toast.showSuccess('Task deleted');
      loadTasks();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to delete task');
    }
  };

  /** Edit: open details for everyone. Update (status): assignee only. */
  const renderTaskActions = (t: Task, compact: boolean) => {
    const assignee = taskIsAssignedToMe(t, myCompanyUserId, myNameNorm);
    const sz = compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1.5';
    const base =
      'rounded-lg font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent';
    const neutral = isDark
      ? `${base} ${sz} border border-slate-600 text-slate-200 hover:bg-slate-700`
      : `${base} ${sz} border border-slate-200 text-slate-700 hover:bg-slate-100`;
    const accent = isDark
      ? `${base} ${sz} border border-violet-500/50 text-violet-300 hover:bg-violet-500/10`
      : `${base} ${sz} border border-violet-300 text-violet-700 hover:bg-violet-50`;
    const danger = isDark
      ? `${base} ${sz} border border-rose-500/40 text-rose-400 hover:bg-rose-500/15`
      : `${base} ${sz} border border-rose-300 text-rose-600 hover:bg-rose-50`;

    return (
      <div
        role="group"
        aria-label="Task actions"
        className={`flex flex-wrap items-center gap-1.5 shrink-0 ${compact ? 'mt-1' : 'pt-1 sm:pt-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="View task details (assignee can save changes)"
          onClick={() => openEditModal(t.id)}
          className={neutral}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={!assignee}
          title={assignee ? 'Change task status' : 'Only the assignee can update status'}
          onClick={() => openStatusUpdateModal(t.id)}
          className={accent}
        >
          Update
        </button>
        <button type="button" title="Delete this task" onClick={() => deleteTask(t.id)} className={danger}>
          Delete
        </button>
      </div>
    );
  };

  const toggleDone = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await taskAPI.updateTask(id, { status: nextStatus });
      loadTasks();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to update');
    }
  };

  const calNav = (d: number) => {
    setCalMonth((m) => {
      const next = m + d;
      if (next > 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      if (next < 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return next;
    });
  };

  const calToday = () => {
    const n = new Date();
    setCalMonth(n.getMonth());
    setCalYear(n.getFullYear());
  };

  const sendAI = async (q?: string) => {
    const query = (q ?? aiInput).trim();
    if (!query) return;
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', content: query }]);
    setAiLoading(true);
    setAiMessages((prev) => [...prev, { role: 'bot', content: '' }]);
    try {
      const res = await taskAPI.aiQuery(query, user?.name || undefined);
      const fmt = (res.response || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      setAiMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'bot', content: fmt };
        return next;
      });
    } catch {
      setAiMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'bot', content: 'Could not reach the AI backend.' };
        return next;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const NamePill: React.FC<{ name: string; label?: string }> = ({ name, label }) => {
    const col = getNameColor(name);
    const display = label ? `${label}: ${name}` : name;
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: col.bg }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.dot }} />
        {display}
      </span>
    );
  };

  const renderList = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className={`p-4 rounded-xl border ${cardClass} border-l-4 border-l-indigo-500`}>
          <div className={`text-2xl font-black ${textPrimary}`}>{filteredTasks.length}</div>
          <div className={`text-xs ${textSecondary}`}>Total Tasks</div>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass} border-l-4 border-l-amber-500`}>
          <div className={`text-2xl font-black ${textPrimary}`}>{filteredTasks.filter((t) => t.status === 'in_progress').length}</div>
          <div className={`text-xs ${textSecondary}`}>In Progress</div>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass} border-l-4 border-l-rose-500`}>
          <div className={`text-2xl font-black ${textPrimary}`}>{overdueCount}</div>
          <div className={`text-xs ${textSecondary}`}>Overdue</div>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass} border-l-4 border-l-emerald-500`}>
          <div className={`text-2xl font-black ${textPrimary}`}>{filteredTasks.filter((t) => t.status === 'done').length}</div>
          <div className={`text-xs ${textSecondary}`}>Completed</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'todo', 'in_progress', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-[#C2D642] text-white' : isDark ? 'border border-slate-600 text-slate-400 hover:bg-slate-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s] || s}
          </button>
        ))}
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
        {['urgent', 'high', 'all'].map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p === 'all' ? 'all' : p)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${priorityFilter === p ? 'bg-[#C2D642] text-white' : isDark ? 'border border-slate-600 text-slate-400 hover:bg-slate-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {p === 'all' ? 'All Priorities' : p}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className={`py-16 text-center ${textSecondary}`}>
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const assignee = taskIsAssignedToMe(t, myCompanyUserId, myNameNorm);
            const ov = t.due_date && t.due_date < todayStr && t.status !== 'done';
            const priorityBorder = { urgent: 'border-l-rose-500', high: 'border-l-amber-500', medium: 'border-l-indigo-500', low: 'border-l-emerald-500' }[t.priority] || '';
            return (
              <div
                key={t.id}
                className={`flex flex-col gap-3 p-4 rounded-xl border ${cardClass} hover:border-[#C2D642]/40 transition-all border-l-4 ${priorityBorder}`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {assignee ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDone(t.id, t.status);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : isDark ? 'border-slate-500 hover:border-emerald-500' : 'border-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {t.status === 'done' && <Check className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 pointer-events-none ${
                        t.status === 'done' ? 'bg-emerald-500/40 border-emerald-500/50 text-white' : isDark ? 'border-slate-600' : 'border-slate-300'
                      }`}
                      aria-hidden
                    >
                      {t.status === 'done' && <Check className="w-3 h-3" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg font-semibold mb-1 leading-snug ${textPrimary}`}>{t.title}</div>
                      {(() => {
                        const { body, comments } = splitDescriptionAndStatusComments(t.description);
                        const hasDesc = !!body || comments.length > 0;
                        if (!hasDesc) return null;
                        return (
                          <div className="mb-2 space-y-2">
                            {body ? <div className={`text-xs line-clamp-3 whitespace-pre-wrap ${textSecondary}`}>{body}</div> : null}
                            <TaskCommentsBlock description={t.description} theme={theme} variant="list" maxVisible={3} />
                          </div>
                        );
                      })()}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{STATUS_LABELS[t.status] || t.status}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' : t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : t.priority === 'medium' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>{t.priority}</span>
                        {t.assigned_to && <NamePill name={t.assigned_to} label="to" />}
                        {t.assigned_by && <NamePill name={t.assigned_by} label="by" />}
                        {t.due_date && (
                          <span className={`text-[10px] ${ov ? 'text-rose-500 font-medium' : textSecondary}`}>
                            {ov ? '⚠ ' : ''}{fmtDate(t.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex shrink-0 sm:self-start sm:pt-0">{renderTaskActions(t, false)}</div>
                  </div>
                </div>
                <div
                  className={`sm:hidden pt-2.5 border-t border-dashed ${isDark ? 'border-slate-600/50' : 'border-slate-200'}`}
                >
                  {renderTaskActions(t, false)}
                </div>
                {t.remark?.trim() ? (
                  <div className={`rounded-lg border px-2.5 py-2 text-xs ${isDark ? 'border-violet-500/35 bg-violet-500/10 text-slate-200' : 'border-violet-200 bg-violet-50/80 text-slate-800'}`}>
                    <div className={`font-bold uppercase tracking-wide text-[10px] mb-1 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Remark</div>
                    <p className={`whitespace-pre-wrap ${textSecondary}`}>{t.remark.trim()}</p>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const renderKanban = () => {
    const cols = [
      { key: 'todo' as const, label: 'Open', color: 'text-slate-400' },
      { key: 'in_progress' as const, label: 'In Progress', color: 'text-violet-400' },
      { key: 'done' as const, label: 'Completed', color: 'text-emerald-400' },
    ];
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cols.map((col) => {
          const ct = filteredTasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border p-4 ${cardClass}`}>
              <div className={`flex items-center gap-2 mb-3 font-bold text-sm ${col.color}`}>
                {col.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>{ct.length}</span>
              </div>
              <div className="space-y-2">
                {ct.length === 0 ? (
                  <div className={`py-8 text-center text-sm ${textSecondary}`}>No tasks</div>
                ) : (
                  ct.map((t) => {
                    const ov = t.due_date && t.due_date < todayStr && t.status !== 'done';
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'} transition-colors`}
                      >
                        <div className={`text-lg font-semibold mb-2 leading-snug ${textPrimary}`}>{t.title}</div>
                        {(() => {
                          const { body } = splitDescriptionAndStatusComments(t.description);
                          if (!body) return null;
                          return <div className={`text-[11px] mb-1 line-clamp-2 ${textSecondary}`}>{body}</div>;
                        })()}
                        <TaskCommentsBlock description={t.description} theme={theme} variant="compact" maxVisible={2} className="mb-2" />
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' : t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>{t.priority}</span>
                        </div>
                        <div className={`text-[10px] ${textSecondary} leading-relaxed`}>
                          to: {t.assigned_to || '—'}<br />by: {t.assigned_by || '—'}
                        </div>
                        {t.due_date && <div className={`text-[10px] mt-1 ${ov ? 'text-rose-500' : textSecondary}`}>Due {fmtDate(t.due_date)}</div>}
                        {renderTaskActions(t, true)}
                        {t.remark?.trim() ? (
                          <div className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${isDark ? 'border-violet-500/35 bg-violet-500/10 text-slate-200' : 'border-violet-200 bg-violet-50/80 text-slate-800'}`}>
                            <span className={`font-bold uppercase text-[9px] ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Remark · </span>
                            <span className={textSecondary}>{t.remark.trim()}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendar = () => {
    const last = new Date(calYear, calMonth + 1, 0);
    const startDay = new Date(calYear, calMonth, 1).getDay();
    const tbd: Record<string, Task[]> = {};
    allTasks.forEach((t) => {
      if (t.due_date) {
        tbd[t.due_date] = tbd[t.due_date] || [];
        tbd[t.due_date].push(t);
      }
    });
    let day = 1 - startDay;
    const rows: React.ReactNode[] = [];
    for (let row = 0; row < 6; row++) {
      const cells: React.ReactNode[] = [];
      for (let col = 0; col < 7; col++) {
        const date = new Date(calYear, calMonth, day);
        const inMonth = date.getMonth() === calMonth;
        const ds = date.toISOString().split('T')[0];
        const isToday = ds === todayStr;
        const tasks = tbd[ds] || [];
        cells.push(
          <div
            key={col}
            className={`min-h-[90px] p-2 border-r border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} ${!inMonth ? 'opacity-35' : ''} ${isToday ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5') : ''} ${inMonth ? (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50') : ''}`}
          >
            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${isToday ? 'bg-[#C2D642] text-white' : ''}`}>{date.getDate()}</div>
            {tasks.slice(0, 2).map((t) => (
              <div
                key={t.id}
                className={`mb-1 last:mb-0 rounded px-1 py-0.5 ${
                  t.priority === 'urgent' ? 'bg-rose-500/25' : t.priority === 'high' ? 'bg-amber-500/20' : 'bg-indigo-500/20'
                }`}
              >
                <div
                  className={`text-xs truncate font-semibold ${
                    t.priority === 'urgent' ? 'text-rose-400' : t.priority === 'high' ? 'text-amber-400' : 'text-indigo-400'
                  }`}
                >
                  {t.title}
                </div>
                {renderTaskActions(t, true)}
              </div>
            ))}
            {tasks.length > 2 && <div className="text-[10px] text-slate-500">+{tasks.length - 2} more</div>}
          </div>
        );
        day++;
      }
      rows.push(<div key={row} className="grid grid-cols-7">{cells}</div>);
      if (day > last.getDate() && row >= 4) break;
    }
    return (
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => calNav(-1)} className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /></button>
            <span className={`font-bold ${textPrimary}`}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => calNav(1)} className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={calToday} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}>Today</button>
        </div>
        <div className="grid grid-cols-7">
          {DOWS.map((d) => (
            <div key={d} className={`p-2 text-center text-[10px] font-semibold uppercase ${textSecondary} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>{d}</div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderAI = () => (
    <div className={`flex flex-col rounded-xl border ${cardClass} overflow-hidden`} style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="flex flex-wrap gap-2 p-4 border-b border-inherit">
        {['Tasks due today', 'Show overdue tasks', 'High priority tasks', 'Summarize all tasks', 'Who has the most tasks?', 'Tasks due this week'].map((label) => (
          <button
            key={label}
            onClick={() => sendAI(label)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {aiMessages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${m.role === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm ${m.role === 'user' ? 'bg-[#C2D642] text-white rounded-br' : isDark ? 'bg-slate-800 border border-slate-600 ' + textPrimary : 'bg-slate-100 border border-slate-200 ' + textPrimary}`}>
              {m.role === 'bot' && m.content ? <span dangerouslySetInnerHTML={{ __html: m.content }} /> : m.content}
              {m.role === 'bot' && aiLoading && !m.content && <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }} /></span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-4 border-t border-inherit">
        <textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendAI())}
          placeholder="Ask anything about your tasks…"
          rows={2}
          className={`flex-1 rounded-lg border px-3.5 py-2.5 text-sm resize-none outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
        />
        <button onClick={() => sendAI()} disabled={aiLoading} className="px-4 py-2 rounded-lg bg-[#C2D642] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50">
          {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  const navItem = (id: ViewType | LayoutType, label: string, icon: React.ReactNode, badge?: string | number) => (
    <button
      onClick={() => {
        if (['all', 'assigned-to', 'assigned-by'].includes(id)) {
          setCurrentView(id as ViewType);
          setCurrentLayout('list');
        } else {
          setCurrentLayout(id as LayoutType);
        }
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        (currentView === id || currentLayout === id) ? 'bg-[#C2D642]/15 text-[#C2D642] border border-[#C2D642]/30' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge !== '—' && <span className="ml-auto bg-[#C2D642] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <ClipboardList className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Task Management</h1>
            <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Team task manager</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 min-h-[calc(100vh-12rem)] relative">
        {/* Backdrop - close sidebar when clicking outside on mobile */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/40 z-10 max-sm:block sm:hidden"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}
        {/* Sidebar - in flow when collapsed; overlays only when expanded on small screens */}
        <aside
          className={`flex-shrink-0 transition-all overflow-hidden flex flex-col min-h-0
            ${sidebarCollapsed ? 'w-10' : 'w-56'}
            max-sm:top-0 max-sm:bottom-0 max-sm:left-0 max-sm:z-20
            ${!sidebarCollapsed ? 'max-sm:absolute max-sm:shadow-xl' : ''}`}
        >
          <div className={`flex-1 flex flex-col min-h-0 transition-all ${sidebarCollapsed ? 'rounded-none border-0 bg-transparent p-0 justify-center' : `rounded-xl border p-3 ${cardClass}`}`}>
            <div className={`flex items-center flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : 'justify-between mb-3'}`}>
              {!sidebarCollapsed && <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Views</span>}
              <button
                onClick={() => setSidebarCollapsed((s) => !s)}
                className={`p-2 rounded-lg ${sidebarCollapsed ? 'text-[#C2D642] hover:opacity-80' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {navItem('all', 'All Tasks', <LayoutList className="w-4 h-4" />, badgeAll)}
                  {navItem('assigned-to', 'Assigned to Me', <Inbox className="w-4 h-4" />, badgeToMe)}
                  {navItem('assigned-by', 'Assigned by Me', <Send className="w-4 h-4" />, badgeByMe)}
                  <div className={`h-px my-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <span className={`block text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${textSecondary}`}>Layout</span>
                  {navItem('list', 'List View', <LayoutList className="w-4 h-4" />)}
                  {navItem('kanban', 'Kanban Board', <LayoutGrid className="w-4 h-4" />)}
                  {navItem('calendar', 'Calendar', <Calendar className="w-4 h-4" />)}
                  {navItem('ai', 'AI Assistant', <Sparkles className="w-4 h-4" />)}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className={`flex flex-col sm:flex-row gap-3 mb-4 p-4 rounded-xl border ${cardClass}`}>
            <h2 className={`font-bold text-lg flex-1 ${textPrimary}`}>{pageTitle}</h2>
            <div className="flex flex-row gap-3 items-center flex-1 min-w-0 max-w-full sm:max-w-md">
              <div className="relative flex-1 min-w-0 sm:max-w-xs">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                <input
                  type="text"
                  placeholder="Search tasks…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none focus:border-[#C2D642] ${isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <button onClick={openCreateModal} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C2D642] text-white font-bold text-sm hover:opacity-90 shadow-md shrink-0">
                <Plus className="w-4 h-4" /> New Task
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`flex flex-col items-center justify-center py-20 rounded-xl border ${cardClass}`}>
              <Loader2 className="w-12 h-12 animate-spin text-[#C2D642] mb-4" />
              <p className={textSecondary}>Loading tasks…</p>
            </div>
          ) : (
            <>
              {currentLayout === 'list' && renderList()}
              {currentLayout === 'kanban' && renderKanban()}
              {currentLayout === 'calendar' && renderCalendar()}
              {currentLayout === 'ai' && renderAI()}
            </>
          )}
        </div>
      </div>

      <TaskModal
        theme={theme}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
          setEditModalTask(null);
          setEditModalLoading(false);
        }}
        onSubmit={handleModalSubmit}
        isEditing={!!editingId}
        editingId={editingId}
        initialData={modalInitialData}
        companyUsers={companyUsers}
        canSaveChanges={modalCanSaveChanges}
        isLoadingDetail={!!editingId && (editModalLoading || !editModalTask)}
      />

      <TaskStatusUpdateModal
        theme={theme}
        isOpen={!!statusModalTaskRow}
        task={
          statusModalTaskRow
            ? {
                id: statusModalTaskRow.id,
                title: statusModalTaskRow.title,
                status: statusModalTaskRow.status,
                description: statusModalTaskRow.description,
                remark: statusModalTaskRow.remark,
              }
            : null
        }
        onClose={() => setStatusModalTaskRow(null)}
        onSave={handleStatusUpdateSave}
      />
    </div>
  );
};

export default TaskManagement;
