'use client';

import React from 'react';
import { Circle, Play, Check } from 'lucide-react';
import { ThemeType } from '@/types';
import { TaskCommentsBlock } from './TaskCommentsBlock';

/** Matches API: todo | in_progress | done */
export type WorkflowStatusKey = 'open' | 'in_progress' | 'completed';

export interface TaskStatusModalTask {
  id: string;
  title: string;
  status: string;
  /** Current description from GET /tasks/{uuid} — remark is appended on save when provided. */
  description?: string;
}

const WORKFLOW_TO_API: Record<WorkflowStatusKey, string> = {
  open: 'todo',
  in_progress: 'in_progress',
  completed: 'done',
};

export function apiStatusToWorkflow(api: string): WorkflowStatusKey {
  const s = (api || '').toLowerCase();
  if (s === 'done' || s === 'completed') return 'completed';
  if (s === 'in_progress') return 'in_progress';
  return 'open';
}

export function workflowToApiStatus(key: WorkflowStatusKey): string {
  return WORKFLOW_TO_API[key];
}

const OPTIONS: { key: WorkflowStatusKey; label: string; Icon: typeof Circle }[] = [
  { key: 'open', label: 'Open', Icon: Circle },
  { key: 'in_progress', label: 'In Progress', Icon: Play },
  { key: 'completed', label: 'Completed', Icon: Check },
];

interface TaskStatusUpdateModalProps {
  theme: ThemeType;
  isOpen: boolean;
  task: TaskStatusModalTask | null;
  onClose: () => void;
  /** Optional remark is merged into task description on the server (PATCH description + status). */
  onSave: (taskId: string, apiStatus: string, remark?: string) => Promise<void>;
}

const TaskStatusUpdateModal: React.FC<TaskStatusUpdateModalProps> = ({
  theme,
  isOpen,
  task,
  onClose,
  onSave,
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  const [selected, setSelected] = React.useState<WorkflowStatusKey>('open');
  const [remark, setRemark] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !task) return;
    setSelected(apiStatusToWorkflow(task.status));
  }, [isOpen, task?.id, task?.status]);

  React.useEffect(() => {
    if (!isOpen) return;
    setRemark('');
  }, [isOpen, task?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.id) return;
    setSaving(true);
    try {
      const trimmed = remark.trim();
      await onSave(task.id, workflowToApiStatus(selected), trimmed || undefined);
      onClose();
    } catch {
      /* parent toasts; keep modal open */
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  const selectedRing = isDark
    ? 'border-violet-500 text-violet-300 bg-violet-500/10'
    : 'border-violet-600 text-violet-700 bg-violet-50';
  const idleRow = isDark
    ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800/50'
    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50';

  const fieldClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-500 ${
    isDark ? 'bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        className={`w-full max-w-md my-auto rounded-xl border p-5 sm:p-6 ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`font-bold text-lg mb-1 ${textPrimary}`}>Update status</h2>
        <p className={`text-xs mb-4 ${textMuted}`}>{task.title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {OPTIONS.map(({ key, label, Icon }) => {
              const active = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                    active ? selectedRing : idleRow
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </div>

          <TaskCommentsBlock description={task.description} theme={theme} variant="modal" />

          <div>
            <label htmlFor="task-status-remark" className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${textMuted}`}>
              Comment <span className="normal-case font-normal text-[10px]">optional</span>
            </label>
            <textarea
              id="task-status-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add a short note about this status change…"
              rows={3}
              disabled={saving}
              className={`${fieldClass} resize-y min-h-[72px]`}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskStatusUpdateModal;
