'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { ThemeType } from '@/types';
import { prApprovalAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';
import type { PrListRow } from './prApprovalTypes';
import {
  normalizePrListPayload,
  rowDateHint,
  rowProjectLabel,
  rowRequestNo,
  rowStatusLabel,
  rowUuid,
  rowMaterialRequestId,
  rowListKey,
  listRowMatchesSearch,
  isPrListRowPending,
} from './prApprovalHelpers';

interface PRApprovalListProps {
  theme: ThemeType;
}

const PAGE_SIZE = 10;

function statusDisplayClass(row: PrListRow, isDark: boolean): string {
  const l = rowStatusLabel(row).toLowerCase();
  if (l === 'approved')
    return isDark ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold';
  if (l === 'rejected')
    return isDark ? 'text-rose-400 font-semibold' : 'text-rose-600 font-semibold';
  if (l === 'pending') return isDark ? 'text-amber-300 font-semibold' : 'text-amber-700 font-semibold';
  return '';
}

const PRApprovalList: React.FC<PRApprovalListProps> = ({ theme }) => {
  const router = useRouter();
  const toast = useToast();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<PrListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<null | { action: 'approve' | 'reject'; materialRequestId: number }>(null);
  const [busyMaterialRequestId, setBusyMaterialRequestId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg';
  const thClass = isDark ? 'text-slate-200 border-slate-600' : 'text-slate-900 border-slate-200';
  const tdClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const rowHover = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
  const inputClass = cn(
    'w-full sm:w-64 rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C2D642]/40',
    isDark ? 'bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await prApprovalAPI.list();
      setRows(normalizePrListPayload(raw));
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load PR list';
      toast.showError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Rows with uuid (detail link) and/or material_request_id (approve/reject API). */
  const listRows = useMemo(() => rows.filter((r) => rowListKey(r) != null), [rows]);

  const filteredRows = useMemo(() => {
    return listRows.filter((r) => listRowMatchesSearch(r, search));
  }, [listRows, search]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE) || 1);
  const pageClamped = Math.min(page, totalPages);
  const startIdx = (pageClamped - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + pagedRows.length, totalFiltered);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const runDecision = async () => {
    if (!confirm) return;
    const { materialRequestId, action } = confirm;
    setBusyMaterialRequestId(materialRequestId);
    try {
      const status = action === 'approve' ? 1 : 2;
      await prApprovalAPI.updatePendingStatus(materialRequestId, status);
      toast.showSuccess(action === 'approve' ? 'Purchase request approved.' : 'Purchase request rejected.');
      setConfirm(null);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Request failed';
      toast.showError(msg);
    } finally {
      setBusyMaterialRequestId(null);
    }
  };

  return (
    <div className={cn('min-h-[calc(100vh-8rem)]', isDark ? 'bg-[#0a0a0a]' : 'bg-slate-100/90')}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className={cn('text-xl sm:text-2xl font-bold', textPrimary)}>PR Approvals</h1>
          <div className="relative w-full sm:w-auto sm:min-w-[280px]">
            <Search
              className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', textSecondary)}
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className={inputClass}
              aria-label="Search PR approvals"
              autoComplete="off"
            />
          </div>
        </div>

        <div className={cn('rounded-2xl border overflow-hidden', cardClass)}>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          ) : rows.length > 0 && listRows.length === 0 ? (
            <p className={cn('text-sm px-6 py-12 text-center', textSecondary)}>
              PRs loaded but none include a <code className="text-[11px]">uuid</code> or identifiable{' '}
              <code className="text-[11px]">material_request_id</code>. Check the API response.
            </p>
          ) : listRows.length === 0 ? (
            <p className={cn('text-sm px-6 py-12 text-center', textSecondary)}>No purchase requests found.</p>
          ) : filteredRows.length === 0 ? (
            <p className={cn('text-sm px-6 py-12 text-center', textSecondary)}>No rows match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b text-left text-xs uppercase tracking-wide', thClass)}>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Request No.</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap min-w-[200px]">Status</th>
                      <th className="px-4 py-3 font-bold min-w-[140px]">Project</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => {
                    const rowKey = rowListKey(row)!;
                    const detailUuid = rowUuid(row);
                    const materialRequestId = rowMaterialRequestId(row);
                    const pending = isPrListRowPending(row);
                    const actionsLocked = !!confirm || busyMaterialRequestId !== null;
                    const canOpenDetail = !!detailUuid;
                    return (
                      <tr
                        key={rowKey}
                        role={canOpenDetail ? 'button' : undefined}
                        tabIndex={canOpenDetail ? 0 : undefined}
                        className={cn(
                          'border-b transition-colors',
                          tdClass,
                          canOpenDetail ? cn('cursor-pointer', rowHover) : ''
                        )}
                        onClick={() => {
                          if (detailUuid) router.push(`/pr-approval/${encodeURIComponent(detailUuid)}`);
                        }}
                        onKeyDown={(e) => {
                          if (!detailUuid) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/pr-approval/${encodeURIComponent(detailUuid)}`);
                          }
                        }}
                      >
                        <td className={cn('px-4 py-3 font-semibold whitespace-nowrap', textPrimary)}>
                          {rowRequestNo(row)}
                        </td>
                        <td
                          className={cn('px-4 py-3 align-middle', textPrimary)}
                          onClick={pending ? (e) => e.stopPropagation() : undefined}
                        >
                          {pending ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <button
                                type="button"
                                disabled={actionsLocked || materialRequestId == null}
                                className={cn(
                                  'text-xs font-bold px-2.5 py-1 rounded shadow-sm transition-colors disabled:opacity-50',
                                  'bg-[#C2D642] text-slate-900 hover:bg-[#b8cc3a]'
                                )}
                                title={materialRequestId == null ? 'Missing material request id for this row' : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (materialRequestId == null) {
                                    toast.showError('Cannot approve: missing material request id.');
                                    return;
                                  }
                                  setConfirm({ action: 'approve', materialRequestId });
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionsLocked || materialRequestId == null}
                                className={cn(
                                  'text-xs font-bold px-2.5 py-1 rounded shadow-sm transition-colors disabled:opacity-50',
                                  isDark
                                    ? 'bg-rose-900 text-rose-100 hover:bg-rose-800 border border-rose-700'
                                    : 'bg-rose-700 text-white hover:bg-rose-800'
                                )}
                                title={materialRequestId == null ? 'Missing material request id for this row' : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (materialRequestId == null) {
                                    toast.showError('Cannot reject: missing material request id.');
                                    return;
                                  }
                                  setConfirm({ action: 'reject', materialRequestId });
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={cn(statusDisplayClass(row, isDark) || textPrimary)}>
                              {rowStatusLabel(row)}
                            </span>
                          )}
                        </td>
                        <td className={cn('px-4 py-3 max-w-[280px] truncate', textPrimary)} title={rowProjectLabel(row)}>
                          {rowProjectLabel(row)}
                        </td>
                        <td className={cn('px-4 py-3 whitespace-nowrap', textSecondary)}>{rowDateHint(row)}</td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
              <div
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3 text-sm border-t',
                  isDark ? 'border-slate-600' : 'border-slate-200',
                  textSecondary
                )}
              >
                <span>
                  Showing {showingFrom} to {showingTo} of {totalFiltered} entries ({PAGE_SIZE} per page)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pageClamped <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      'px-3 py-1.5 rounded-md border text-sm font-semibold disabled:opacity-40',
                      isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    Previous
                  </button>
                  <span className={cn('px-2 tabular-nums font-semibold min-w-[2.5rem] text-center', textPrimary)}>
                    {pageClamped} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pageClamped >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(
                      'px-3 py-1.5 rounded-md border text-sm font-semibold disabled:opacity-40',
                      isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className={cn('text-xs mt-4', textSecondary)}>
          Select a row with a link to open details. Pending rows use Approve / Reject (POST{' '}
          <code className="text-[11px]">inventory/pending-approval-update-status</code>
          ).
        </p>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pr-confirm-title"
          onClick={() => !busyMaterialRequestId && setConfirm(null)}
        >
          <div
            className={cn('rounded-xl border max-w-md w-full p-6 shadow-xl', cardClass)}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pr-confirm-title" className={cn('text-lg font-bold mb-2', textPrimary)}>
              Confirm
            </h2>
            <p className={cn('text-sm mb-6', textSecondary)}>
              {confirm.action === 'approve'
                ? 'Are you sure you want to approve this purchase request?'
                : 'Are you sure you want to reject this purchase request?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold border transition-colors',
                  isDark ? 'border-slate-500 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-800 hover:bg-slate-50'
                )}
                onClick={() => setConfirm(null)}
                disabled={!!busyMaterialRequestId}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busyMaterialRequestId}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50',
                  confirm.action === 'approve'
                    ? 'bg-[#C2D642] hover:bg-[#b8cc3a] text-slate-900'
                    : isDark
                      ? 'bg-rose-800 hover:bg-rose-700'
                      : 'bg-rose-700 hover:bg-rose-800'
                )}
                onClick={() => void runDecision()}
              >
                {busyMaterialRequestId != null ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Working…
                  </span>
                ) : confirm.action === 'approve' ? (
                  'Approve'
                ) : (
                  'Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRApprovalList;
