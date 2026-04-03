'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeType } from '@/types';
import { X, Loader2 } from 'lucide-react';
import {
  SIDEBAR_PERMISSION_TREE,
  buildSubtreeIndex,
  flattenSidebarPermissionTree,
  type CrudFlags,
} from '@/constants/sidebarPermissionTree';
import {
  parseMenusTreeFromApi,
  flattenApiPermissionMenu,
  buildApiSubtreeIndex,
  crudToActions,
  buildCrudMatrixFromMenusTreeAndPermissionMap,
} from '@/utils/apiPermissionMenuTree';
import { normalizedPermissionsFromSaveResponse } from '@/utils/unwrapPermissionMatrixPayload';
import { rolePermissionsAPI, teamsAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';

const DEFAULT_STORAGE_NAMESPACE = 'manageTeamMemberPermissions';

export type TeamPermissionApiContext = {
  updateId: number;
  menusTree: unknown;
  permissionsByMenu: Record<string, string[]>;
};

type Props = {
  theme: ThemeType;
  entityLabel: string;
  entityId: string;
  storageNamespace?: string;
  onClose: () => void;
  /** When set (Teams flow), matrix uses server menus and Save calls POST add-user-permission. */
  teamPermissionApi?: TeamPermissionApiContext | null;
  /** When `company-role`, Save calls POST /add-permission instead of add-user-permission. */
  permissionSaveTarget?: 'company-user' | 'company-role';
};

const CRUD_KEYS = ['view', 'create', 'edit', 'delete'] as const;
const HEADER_LABELS: Record<(typeof CRUD_KEYS)[number], string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
};

function emptyCrud(): CrudFlags {
  return { view: false, create: false, edit: false, delete: false };
}

function storageKey(namespace: string, id: string) {
  return `${namespace}:${id}`;
}

function RowMasterCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  isDark,
  title,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  disabled: boolean;
  isDark: boolean;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className={`w-4 h-4 rounded border shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isDark ? 'border-slate-600 bg-slate-800 accent-[#6B8E23]' : 'border-slate-300 bg-white accent-[#6B8E23]'
      }`}
      title={title ?? 'Select all actions for this row and descendants'}
    />
  );
}

function subtreeCrudState(
  subtreeKeys: string[],
  field: (typeof CRUD_KEYS)[number],
  matrix: Record<string, CrudFlags>
): 'all' | 'none' | 'some' {
  let on = 0;
  for (const k of subtreeKeys) {
    if (matrix[k]?.[field]) on++;
  }
  if (on === subtreeKeys.length) return 'all';
  if (on === 0) return 'none';
  return 'some';
}

function CrudCellCheckbox({
  checked,
  indeterminate,
  onChange,
  isDark,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  isDark: boolean;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-4 h-4 rounded border cursor-pointer ${
        isDark ? 'border-slate-600 bg-slate-800 accent-[#6B8E23]' : 'border-slate-300 bg-white accent-[#6B8E23]'
      }`}
      aria-label={ariaLabel}
    />
  );
}

type MatrixRow = { key: string; label: string; depth: number };

const TeamMemberPermissionsModal: React.FC<Props> = ({
  theme,
  entityLabel,
  entityId,
  storageNamespace = DEFAULT_STORAGE_NAMESPACE,
  onClose,
  teamPermissionApi = null,
  permissionSaveTarget = 'company-user',
}) => {
  const toast = useToast();
  const { refreshAccessibleMenus } = useUser();
  const isTeamApi = teamPermissionApi != null;
  const staticRows = useMemo(() => flattenSidebarPermissionTree(SIDEBAR_PERMISSION_TREE) as MatrixRow[], []);
  const staticSubtree = useMemo(() => buildSubtreeIndex(SIDEBAR_PERMISSION_TREE), []);

  const apiRoots = useMemo(() => {
    if (!teamPermissionApi) return [];
    return parseMenusTreeFromApi(teamPermissionApi.menusTree);
  }, [teamPermissionApi]);

  const apiRows = useMemo(() => flattenApiPermissionMenu(apiRoots), [apiRoots]);
  const apiSubtree = useMemo(() => buildApiSubtreeIndex(apiRoots), [apiRoots]);

  const rows = isTeamApi ? apiRows : staticRows;
  const subtreeByKey = isTeamApi ? apiSubtree : staticSubtree;

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const borderCell = isDark ? 'border-slate-700/80' : 'border-slate-200';
  const tableHeaderRow = isDark
    ? 'bg-[#0c1222] text-slate-100 border-b border-slate-700/90'
    : 'bg-slate-100 text-slate-600 border-b border-slate-200';
  const thMenuClass = `px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.12em] ${
    isDark ? 'text-slate-200' : 'text-slate-600'
  }`;
  const thActionClass = `px-4 py-3.5 text-center text-[10px] font-black uppercase tracking-[0.12em] ${
    isDark ? 'text-slate-200' : 'text-slate-600'
  }`;
  const INDENT_PER_DEPTH = 22;
  const MENU_BASE_PAD = 8;

  const [matrix, setMatrix] = useState<Record<string, CrudFlags>>({});
  const [saving, setSaving] = useState(false);

  /** Only reset matrix when opening a different user/role (not on parent re-renders / new object refs). */
  const matrixInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const initKey =
      isTeamApi && teamPermissionApi != null
        ? `api:${teamPermissionApi.updateId}:${entityId}`
        : `local:${storageNamespace}:${entityId}`;

    if (matrixInitKeyRef.current === initKey) {
      return;
    }
    matrixInitKeyRef.current = initKey;

    if (isTeamApi && teamPermissionApi) {
      setMatrix(
        buildCrudMatrixFromMenusTreeAndPermissionMap(
          teamPermissionApi.menusTree,
          teamPermissionApi.permissionsByMenu
        )
      );
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey(storageNamespace, entityId));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CrudFlags>;
        const next: Record<string, CrudFlags> = {};
        for (const r of staticRows) {
          const v = parsed[r.key];
          next[r.key] =
            v && typeof v === 'object'
              ? {
                  view: !!v.view,
                  create: !!v.create,
                  edit: !!v.edit,
                  delete: !!v.delete,
                }
              : emptyCrud();
        }
        setMatrix(next);
        return;
      }
    } catch {
      /* ignore */
    }
    const initial: Record<string, CrudFlags> = {};
    for (const r of staticRows) initial[r.key] = emptyCrud();
    setMatrix(initial);
  }, [isTeamApi, teamPermissionApi, entityId, storageNamespace, staticRows]);

  const toggleCrud = useCallback(
    (rowKey: string, field: (typeof CRUD_KEYS)[number]) => {
      const sub = subtreeByKey[rowKey] ?? [rowKey];
      setMatrix((prev) => {
        const next = { ...prev };
        if (sub.length === 1) {
          const cur = prev[rowKey] ?? emptyCrud();
          next[rowKey] = { ...cur, [field]: !cur[field] };
          return next;
        }
        const agg = subtreeCrudState(sub, field, prev);
        const newVal = agg !== 'all';
        for (const k of sub) {
          next[k] = { ...(next[k] ?? emptyCrud()), [field]: newVal };
        }
        return next;
      });
    },
    [subtreeByKey]
  );

  const toggleRowAll = useCallback(
    (rowKey: string) => {
      const sub = subtreeByKey[rowKey] ?? [rowKey];
      setMatrix((prev) => {
        const allOn = sub.every((k) => CRUD_KEYS.every((f) => (prev[k] ?? emptyCrud())[f]));
        const nextVal = !allOn;
        const next = { ...prev };

        for (const k of sub) {
          next[k] = { view: nextVal, create: nextVal, edit: nextVal, delete: nextVal };
        }
        return next;
      });
    },
    [subtreeByKey]
  );

  const handleSave = async () => {
    if (isTeamApi && teamPermissionApi) {
      setSaving(true);
      try {
        const permission: Record<string, string[]> = {};
        for (const r of rows) {
          const actions = crudToActions(matrix[r.key] ?? emptyCrud());
          if (actions.length) permission[r.key] = actions;
        }
        let saveResponse: unknown;
        if (permissionSaveTarget === 'company-role') {
          saveResponse = await rolePermissionsAPI.addRolePermission({
            updateId: teamPermissionApi.updateId,
            permission,
          });
        } else {
          saveResponse = await teamsAPI.addUserPermission({
            updateId: teamPermissionApi.updateId,
            permission,
          });
        }
        const norm = normalizedPermissionsFromSaveResponse(saveResponse);
        if (norm) {
          setMatrix(
            buildCrudMatrixFromMenusTreeAndPermissionMap(teamPermissionApi.menusTree, norm)
          );
        }
        await refreshAccessibleMenus();
        toast.showSuccess(permissionSaveTarget === 'company-role' ? 'Role permissions saved' : 'User permissions saved');
        onClose();
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: string }).message)
            : 'Failed to save permissions';
        toast.showError(msg);
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      localStorage.setItem(storageKey(storageNamespace, entityId), JSON.stringify(matrix));
    } catch {
      /* ignore */
    }
    onClose();
  };

  const tableEmpty = rows.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div
        className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-5xl max-h-[min(90vh,900px)] flex flex-col shadow-xl`}
      >
        <div className={`p-5 border-b ${borderCell} shrink-0 flex items-start justify-between gap-4`}>
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Permissions</h2>
            <p className={`text-sm mt-1 ${textSecondary}`}>
              Menu access for <span className={`font-bold ${textPrimary}`}>{entityLabel}</span> — set view, create, edit,
              and delete per sidebar item.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`p-2 rounded-lg transition-colors shrink-0 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'} disabled:opacity-50`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex-1 overflow-auto min-h-0 ${isDark ? 'bg-[#111318]' : 'bg-slate-50/40'}`}>
          {tableEmpty ? (
            <div className={`p-10 text-center text-sm ${textSecondary}`}>No permission rows to display.</div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead className={`sticky top-0 z-10 shadow-[0_1px_0_0] ${isDark ? 'shadow-slate-800' : 'shadow-slate-200'} backdrop-blur-sm`}>
                <tr className={tableHeaderRow}>
                  <th scope="col" className={`${thMenuClass} w-[38%] min-w-[220px]`}>
                    Menu
                  </th>
                  {CRUD_KEYS.map((k) => (
                    <th key={k} scope="col" className={`${thActionClass} w-[15.5%] min-w-[4.75rem]`}>
                      {HEADER_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`${isDark ? 'divide-y divide-slate-800/90' : 'divide-y divide-slate-200/90'} ${
                  isDark ? 'bg-[#111318]' : 'bg-white'
                }`}
              >
                {rows.map((row) => {
                  const sub = subtreeByKey[row.key] ?? [row.key];
                  const allOn = sub.every((k) => CRUD_KEYS.every((f) => (matrix[k] ?? emptyCrud())[f]));
                  const anyOn = sub.some((k) => CRUD_KEYS.some((f) => (matrix[k] ?? emptyCrud())[f]));
                  const depthPad = MENU_BASE_PAD + row.depth * INDENT_PER_DEPTH;
                  const isChild = row.depth > 0;
                  return (
                    <tr
                      key={row.key}
                      className={`transition-colors ${
                        isChild
                          ? isDark
                            ? 'bg-slate-900/35 hover:bg-slate-800/50'
                            : 'bg-slate-50/70 hover:bg-slate-100/90'
                          : isDark
                            ? 'hover:bg-slate-800/35'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 pl-2 pr-4 align-middle">
                        <div className="flex items-center gap-3 min-h-[1.35rem]" style={{ paddingLeft: depthPad }}>
                          <RowMasterCheckbox
                            checked={allOn}
                            indeterminate={anyOn && !allOn}
                            onChange={() => toggleRowAll(row.key)}
                            disabled={false}
                            isDark={isDark}
                          />
                          <span className={`font-bold leading-snug ${textPrimary}`}>{row.label}</span>
                        </div>
                      </td>
                      {CRUD_KEYS.map((k) => {
                        const agg = subtreeCrudState(sub, k, matrix);
                        const cellChecked = agg === 'all';
                        const cellIndeterminate = agg === 'some';
                        return (
                          <td key={k} className="py-3 px-2 align-middle">
                            <div className="flex items-center justify-center min-h-[1.35rem] w-full">
                              <CrudCellCheckbox
                                checked={cellChecked}
                                indeterminate={cellIndeterminate}
                                onChange={() => toggleCrud(row.key, k)}
                                isDark={isDark}
                                ariaLabel={`${row.label} — ${HEADER_LABELS[k]}`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className={`p-4 border-t ${borderCell} shrink-0 flex justify-end gap-2`}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || tableEmpty}
            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-[#6B8E23] text-white hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberPermissionsModal;
