'use client';

import React from 'react';
import type { DsrRateRow, TenderCategoriesResponse, TenderStatusResponse } from './types';
import {
  downloadOutputUrl,
  fetchDsrRates,
  fetchTenderCategories,
  fetchTenderStatus,
  resolveTenderAssetUrl,
} from './api';

interface TenderHealthIndicatorsProps {
  className?: string;
}

/** Polls GET `/api/tender/status` → browser `/api-proxy/tender/status` for header badges. */
export function TenderHealthIndicators({ className = '' }: TenderHealthIndicatorsProps) {
  const [st, setSt] = React.useState<TenderStatusResponse | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await fetchTenderStatus();
        if (!cancelled) {
          setSt(s);
          setOffline(false);
        }
      } catch {
        if (!cancelled) {
          setOffline(true);
          setSt(null);
        }
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (offline) {
    return (
      <span
        title="Tender engine unreachable — check NEXT_PUBLIC_AI_TENDER_API"
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] text-red-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Engine offline
      </span>
    );
  }

  const engineOk = st?.engine !== false;
  const dsrOk = st?.dsr_rates_loaded === true;
  const azureOk = st?.azure_openai_configured === true;

  return (
    <>
      <span
        title={st?.status ? `status: ${st.status}` : 'Engine reachable'}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] ${
          engineOk
            ? 'border-[#00c9a7]/35 bg-[#00c9a7]/10 text-[#00c9a7]'
            : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
        } ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor] ${engineOk ? 'bg-[#00c9a7]' : 'bg-amber-400'}`} />
        {engineOk ? 'Engine' : 'Engine?'}
      </span>
      <span
        title="DSR-2021 rate database"
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10px] ${
          dsrOk ? 'border-white/10 text-[#5c7a99]' : 'border-amber-500/25 text-amber-200/90'
        }`}
      >
        DSR {dsrOk ? '✓' : '…'}
      </span>
      <span
        title="Azure OpenAI"
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10px] ${
          azureOk ? 'border-white/10 text-[#5c7a99]' : 'border-amber-500/25 text-amber-200/90'
        }`}
      >
        Azure {azureOk ? '✓' : '…'}
      </span>
    </>
  );
}

interface DsrBrowseModalProps {
  open: boolean;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

/** GET `/api/tender/dsr-rates` & `/api/tender/categories` */
export function DsrBrowseModal({ open, onClose, showToast }: DsrBrowseModalProps) {
  const [tab, setTab] = React.useState<'rates' | 'categories'>('rates');
  const [q, setQ] = React.useState('');
  const [topK, setTopK] = React.useState(15);
  const [loading, setLoading] = React.useState(false);
  const [rates, setRates] = React.useState<DsrRateRow[]>([]);
  const [cats, setCats] = React.useState<TenderCategoriesResponse | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setRates([]);
    setCats(null);
  }, [open]);

  const loadCategories = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenderCategories();
      setCats(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Categories failed', 'error');
      setCats(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const goCategories = () => {
    setTab('categories');
    if (!cats) void loadCategories();
  };

  const searchRates = async () => {
    setLoading(true);
    try {
      const data = await fetchDsrRates(q, topK);
      setRates(data.rates ?? []);
      if (!(data.rates?.length)) showToast('No rates matched', 'error');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'DSR lookup failed', 'error');
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-14">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.06] bg-[#0c1018] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h4 className="font-black tracking-wide text-[#f0b429]">DSR / Categories</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('rates')}
              className={`rounded-lg px-3 py-1 text-[11px] ${tab === 'rates' ? 'bg-[#f0b429]/10 text-[#f0b429]' : 'text-[#5c7a99]'}`}
            >
              DSR rates
            </button>
            <button type="button" onClick={() => void goCategories()} className={`rounded-lg px-3 py-1 text-[11px] ${tab === 'categories' ? 'bg-[#f0b429]/10 text-[#f0b429]' : 'text-[#5c7a99]'}`}>
              Categories
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[#5c7a99]">
              ✕
            </button>
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-4">
          {tab === 'rates' ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void searchRates()}
                  placeholder="Keyword (e.g. concrete, brick)"
                  className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#111720] px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value) || 10)}
                  className="w-20 rounded-lg border border-white/10 bg-[#111720] px-2 py-2 text-sm"
                  title="top_k"
                />
                <button
                  type="button"
                  onClick={() => void searchRates()}
                  disabled={loading}
                  className="rounded-lg bg-[#f0b429]/90 px-4 py-2 text-sm font-semibold text-[#060910] disabled:opacity-50"
                >
                  {loading ? '…' : 'Search'}
                </button>
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                {rates.map((r, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-[#111720] px-3 py-2">
                    <div className="text-[#e2eaf5]">{r.description}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[#5c7a99]">
                      <span>{r.unit}</span>
                      <span className="text-[#00c9a7]">₹{r.rate}</span>
                      {r.chapter ? <span>Ch. {r.chapter}</span> : null}
                    </div>
                  </div>
                ))}
                {!rates.length && !loading ? (
                  <div className="py-8 text-center text-sm text-[#2a3d52]">Search DSR-2021 by keyword.</div>
                ) : null}
              </div>
            </>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => void loadCategories()}
                className="mb-3 text-[11px] text-[#00c9a7] hover:underline"
              >
                ↻ Refresh list
              </button>
              {cats?.categories?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {cats.categories.map((c) => (
                    <span key={c} className="rounded-full border border-white/[0.08] bg-[#111720] px-2.5 py-1 text-[11px] text-[#c8d8e8]">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-[#2a3d52]">{loading ? 'Loading…' : 'No categories'}</div>
              )}
              {cats?.total != null ? (
                <div className="mt-3 font-mono text-[10px] text-[#5c7a99]">Total: {cats.total}</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function openProcessDownload(data: { download_url?: string; output_file?: string }) {
  const fromUrl = resolveTenderAssetUrl(data.download_url);
  if (fromUrl) window.open(fromUrl, '_blank');
  else if (data.output_file) window.open(downloadOutputUrl(data.output_file), '_blank');
}
