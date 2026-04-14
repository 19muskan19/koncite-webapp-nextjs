'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ThemeType } from '@/types';
import { prApprovalAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';
import type { PrDetailPayload } from './prApprovalTypes';
import {
  detailLines,
  lineActivity,
  lineDate,
  lineMaterial,
  lineMatchesSearch,
  lineQty,
  lineRemarks,
} from './prApprovalHelpers';

interface PRApprovalDetailProps {
  theme: ThemeType;
  uuid: string;
}

function nestedName(obj: unknown, ...keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '—';
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (v != null && String(v).trim()) return String(v);
  }
  return '—';
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const PRApprovalDetail: React.FC<PRApprovalDetailProps> = ({ theme, uuid }) => {
  const toast = useToast();
  const isDark = theme === 'dark';
  const [detail, setDetail] = useState<PrDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-lg';
  const thClass = isDark ? 'text-slate-200 border-slate-600' : 'text-slate-900 border-slate-200';
  const tdClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputClass = cn(
    'rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#C2D642]/40 min-w-[180px]',
    isDark ? 'bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'
  );
  const selectClass = cn(
    'rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#C2D642]/40',
    isDark ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
  );

  const load = useCallback(async () => {
    if (!uuid?.trim()) return;
    setLoading(true);
    try {
      const raw = await prApprovalAPI.details(uuid.trim());
      setDetail((raw && typeof raw === 'object' ? raw : null) as PrDetailPayload | null);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load PR details';
      toast.showError(msg);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [toast, uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const allLines = detailLines(detail);

  const filteredLines = useMemo(() => {
    return allLines.filter((line) => lineMatchesSearch(line, search));
  }, [allLines, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, allLines.length]);

  const totalFiltered = filteredLines.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);
  const pageClamped = Math.min(page, totalPages);
  const startIdx = (pageClamped - 1) * pageSize;
  const pageRows = filteredLines.slice(startIdx, startIdx + pageSize);
  const showingFrom = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + pageRows.length, totalFiltered);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const requestNo = detail?.request_id != null ? String(detail.request_id) : null;
  const statusLabel =
    detail && typeof detail.status_label === 'string' && detail.status_label.trim()
      ? detail.status_label.trim()
      : null;
  const projectName = nestedName(detail?.project, 'project_name', 'name');
  const subProjectName = nestedName(detail?.sub_project, 'name', 'sub_project_name');
  const userName = nestedName(detail?.user, 'name', 'user_name');
  const prDate =
    detail?.date != null && String(detail.date).trim()
      ? String(detail.date)
      : detail?.name != null && String(detail.name).trim()
        ? String(detail.name)
        : null;

  const exportExcel = () => {
    const rows = filteredLines;
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const header = ['Sr no', 'Material', 'Activities', 'QTY', 'Date', 'Remarks'];
    const linesCsv = rows.map((line, i) =>
      [
        i + 1,
        lineMaterial(line),
        lineActivity(line),
        lineQty(line),
        lineDate(line),
        lineRemarks(line),
      ]
        .map((c) => esc(String(c === '—' ? '' : c)))
        .join(',')
    );
    const bom = '\ufeff';
    const csv = bom + [header.join(','), ...linesCsv].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pr-${requestNo ?? 'export'}-lines.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadgeClass =
    statusLabel && /approved/i.test(statusLabel)
      ? isDark
        ? 'bg-emerald-700 text-white border border-emerald-500/50'
        : 'bg-emerald-600 text-white border border-emerald-500'
      : isDark
        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
        : 'bg-amber-50 text-amber-900 border border-amber-200';

  return (
    <div className={cn('min-h-[calc(100vh-8rem)]', isDark ? 'bg-[#0a0a0a]' : 'bg-slate-100/90')}>
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <nav className={cn('text-xs sm:text-sm mb-3', textSecondary)} aria-label="Breadcrumb">
          <span className="font-medium">Master</span>
          <span className="mx-1.5 opacity-60">/</span>
          <span className="font-medium">Purch Request</span>
          <span className="mx-1.5 opacity-60">/</span>
          <span className={cn('font-semibold', textPrimary)}>Purch Request Details</span>
        </nav>

        <Link
          href="/pr-approval"
          className={cn(
            'inline-flex items-center gap-2 text-sm font-semibold mb-5 px-3 py-2 rounded-lg border transition-colors',
            isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-800 bg-white hover:bg-slate-50'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className={cn('rounded-xl border overflow-hidden', cardClass)}>
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b',
              isDark ? 'border-slate-600' : 'border-slate-200'
            )}
          >
            <h1 className={cn('text-base sm:text-lg font-black tracking-wide uppercase', textPrimary)}>
              Purch request details
            </h1>
            {statusLabel && (
              <span className={cn('text-xs sm:text-sm font-bold px-4 py-1.5 rounded-md uppercase', statusBadgeClass)}>
                {statusLabel}
              </span>
            )}
          </div>

          <div className={cn('px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-b', isDark ? 'border-slate-600' : 'border-slate-200')}>
            <SummaryItem label="Request No." value={requestNo} textPrimary={textPrimary} textSecondary={textSecondary} />
            <SummaryItem label="Project" value={projectName} textPrimary={textPrimary} textSecondary={textSecondary} />
            <SummaryItem label="Sub project" value={subProjectName} textPrimary={textPrimary} textSecondary={textSecondary} />
            <SummaryItem label="User" value={userName} textPrimary={textPrimary} textSecondary={textSecondary} />
            <SummaryItem label="Date" value={prDate} textPrimary={textPrimary} textSecondary={textSecondary} />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#C2D642]" />
            </div>
          ) : !detail ? (
            <p className={cn('text-sm px-5 py-10', textSecondary)}>Could not load this PR.</p>
          ) : (
            <>
              <div
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-b',
                  isDark ? 'border-slate-600' : 'border-slate-200'
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-sm', textSecondary)}>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className={selectClass}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className={cn('text-sm', textSecondary)}>entries</span>
                  <button
                    type="button"
                    onClick={exportExcel}
                    disabled={filteredLines.length === 0}
                    className={cn(
                      'ml-1 text-sm font-semibold px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40',
                      isDark
                        ? 'border-slate-500 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-300 text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    Excel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="pr-detail-search" className={cn('text-sm font-semibold whitespace-nowrap', textSecondary)}>
                    Search:
                  </label>
                  <input
                    id="pr-detail-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter rows…"
                    className={inputClass}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b text-left text-xs uppercase tracking-wide', thClass)}>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Sr no</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Material</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Activities</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">QTY</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 font-bold min-w-[100px]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={cn('px-4 py-10 text-center', textSecondary)}>
                          {allLines.length === 0 ? 'No line items.' : 'No rows match your search.'}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((line, i) => {
                        const idx = startIdx + i + 1;
                        const rowKey = line.id != null ? String(line.id) : `row-${startIdx + i}`;
                        return (
                          <tr key={rowKey} className={cn('border-b', tdClass)}>
                            <td className={cn('px-4 py-3 tabular-nums', textSecondary)}>{idx}</td>
                            <td className={cn('px-4 py-3', textPrimary)}>{lineMaterial(line)}</td>
                            <td className={cn('px-4 py-3', textPrimary)}>{lineActivity(line)}</td>
                            <td className={cn('px-4 py-3 whitespace-nowrap', textPrimary)}>{lineQty(line)}</td>
                            <td className={cn('px-4 py-3 whitespace-nowrap', textSecondary)}>{lineDate(line)}</td>
                            <td className={cn('px-4 py-3 max-w-[200px]', textSecondary)}>{lineRemarks(line)}</td>
                          </tr>
                        );
                      })
                    )}
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
                  Showing {showingFrom} to {showingTo} of {totalFiltered} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pageClamped <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      'px-3 py-1 rounded-md border text-sm font-semibold disabled:opacity-40',
                      isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    Previous
                  </button>
                  <span className={cn('px-2 tabular-nums font-semibold', textPrimary)}>{pageClamped}</span>
                  <button
                    type="button"
                    disabled={pageClamped >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(
                      'px-3 py-1 rounded-md border text-sm font-semibold disabled:opacity-40',
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
      </div>
    </div>
  );
};

function SummaryItem({
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string | null;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div>
      <div className={cn('text-xs font-bold uppercase tracking-wide mb-1', textSecondary)}>{label}</div>
      <div className={cn('text-sm font-semibold break-words', textPrimary)}>{value && value !== '—' ? value : '—'}</div>
    </div>
  );
}

export default PRApprovalDetail;
