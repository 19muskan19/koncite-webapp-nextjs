'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ImmersiveData, OutputFileMeta, TenderAnalysisResponse, TenderType } from './types';
import { downloadOutputUrl, fetchOutputFiles, getTenderApiBase, resolveTenderAssetUrl, serveOutputUrl } from './api';
import { buildImmersiveFromAnalysis } from './immersiveData';
import {
  exportBoqCsv,
  exportCategoryCsv,
  exportImmersiveHtmlReport,
  exportResourceCsv,
  exportSavingsCsv,
} from './immersiveExports';
import { fetchWorkbookAsImmersive, readXlsxFile } from './workbookParser';
import { countConf, fmt, fmtL, toL, trunc } from './utils';

const PAL = ['#f0b429', '#00c9a7', '#4fa3ff', '#f06060', '#a78bfa'];
const CONF_C: Record<string, string> = { HIGH: '#00c9a7', MEDIUM: '#f0b429', LOW: '#f06060' };
const MUTED = '#5c7a99';

type ImState = 'browser' | 'loading' | 'dash';

interface ImmersiveDashboardProps {
  open: boolean;
  onClose: () => void;
  currentAnalysis: TenderAnalysisResponse | null;
  defaultTenderType: TenderType;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function ImmersiveDashboard({
  open,
  onClose,
  currentAnalysis,
  defaultTenderType,
  showToast,
}: ImmersiveDashboardProps) {
  const [state, setState] = React.useState<ImState>('browser');
  const [imData, setImData] = React.useState<ImmersiveData | null>(null);
  const [imFile, setImFile] = React.useState<File | null>(null);
  const [serverFiles, setServerFiles] = React.useState<OutputFileMeta[]>([]);
  const [outputDir, setOutputDir] = React.useState<string>('—');
  const [selectedServerFile, setSelectedServerFile] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [loadLabel, setLoadLabel] = React.useState('');
  const [tableFilter, setTableFilter] = React.useState<'all' | 'high' | 'med' | 'low' | 'savings'>('all');

  const loadFiles = React.useCallback(async () => {
    try {
      const data = await fetchOutputFiles();
      setServerFiles(data.files ?? []);
      setOutputDir(data.output_dir ?? '—');
    } catch {
      setOutputDir('Server offline — use manual upload below');
      setServerFiles([]);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setState('browser');
      setImData(null);
      setImFile(null);
      setSelectedServerFile(null);
      setSearch('');
      loadFiles();
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open, loadFiles]);

  const filteredFiles = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return serverFiles;
    return serverFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [serverFiles, search]);

  const useCurrent = () => {
    if (!currentAnalysis) {
      showToast('No current analysis data — run an analysis first', 'error');
      return;
    }
    setImData(buildImmersiveFromAnalysis(currentAnalysis, defaultTenderType));
    setImFile(null);
    setSelectedServerFile(null);
    setState('dash');
    showToast('Loaded session data', 'success');
  };

  const resolveOpenUrl = React.useCallback((f: OutputFileMeta) => {
    if (f.download_url) return resolveTenderAssetUrl(f.download_url) ?? serveOutputUrl(f.name);
    return serveOutputUrl(f.name);
  }, []);

  const openServerFile = async (f: OutputFileMeta) => {
    const name = f.name;
    setSelectedServerFile(name);
    setState('loading');
    setLoadLabel('Fetching file from server…');
    try {
      const url = resolveOpenUrl(f);
      const data = await fetchWorkbookAsImmersive(url, name);
      setImData(data);
      setImFile(null);
      setState('dash');
      showToast('Immersive dashboard loaded ✓', 'success');
    } catch (e) {
      setState('browser');
      showToast(`Error opening file: ${e instanceof Error ? e.message : 'Unknown'}`, 'error');
    }
  };

  const parseLocal = async () => {
    if (!imFile) {
      showToast('Please select an XLSX file first', 'error');
      return;
    }
    setState('loading');
    setLoadLabel('Parsing Excel workbook…');
    try {
      const data = await readXlsxFile(imFile);
      setImData(data);
      setSelectedServerFile(null);
      setState('dash');
      showToast('Immersive dashboard loaded ✓', 'success');
    } catch (e) {
      setState('browser');
      showToast(`Error parsing file: ${e instanceof Error ? e.message : 'Unknown'}`, 'error');
    }
  };

  const filteredRows = React.useMemo(() => {
    if (!imData) return [];
    let rows = imData.boqItems;
    const c = (r: (typeof rows)[0]) => r.confidence || 'MEDIUM';
    const sav = (r: (typeof rows)[0]) => r.saving || (r.current_amount || 0) - (r.optimized_amount || 0);
    if (tableFilter === 'high') rows = rows.filter((r) => c(r) === 'HIGH');
    else if (tableFilter === 'med') rows = rows.filter((r) => c(r) === 'MEDIUM');
    else if (tableFilter === 'low') rows = rows.filter((r) => c(r) === 'LOW');
    else if (tableFilter === 'savings') rows = rows.filter((r) => sav(r) > 0);
    return rows;
  }, [imData, tableFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#060910] text-[#e2eaf5]">
      {state === 'browser' && (
        <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto px-4 py-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#5c7a99] hover:text-white"
          >
            ✕ Close
          </button>
          <div className="mx-auto w-full max-w-3xl text-center">
            <div className="mb-2 font-black uppercase leading-tight tracking-widest text-[#a78bfa] sm:text-3xl">
              IMMERSIVE
              <br />
              DASHBOARD
            </div>
            <p className="mb-6 text-sm text-[#5c7a99]">
              Select an output file from the analysis server, upload an XLSX, or use the current session.
            </p>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1018] px-3 py-2 font-mono text-xs text-[#5c7a99]">
              <span>📁</span>
              <span className="min-w-0 flex-1 truncate">{outputDir}</span>
              <button type="button" onClick={() => loadFiles()} className="shrink-0 text-[#00c9a7] hover:underline">
                ↻ Refresh
              </button>
            </div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-[#5c7a99]">
                {filteredFiles.length ? `${filteredFiles.length} file(s)` : ''}
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files…"
                className="w-full max-w-xs rounded-lg border border-white/10 bg-[#111720] px-3 py-1.5 text-xs"
              />
            </div>
            <div className="mb-8 space-y-2 text-left">
              {!filteredFiles.length ? (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-[#2a3d52]">
                  No output files found. Run an analysis on the server or upload below.
                </div>
              ) : (
                filteredFiles.map((f) => (
                  <div
                    key={f.name}
                    className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
                      selectedServerFile === f.name ? 'border-[#a78bfa]/50 bg-[#a78bfa]/10' : 'border-white/[0.06] bg-[#0c1018]'
                    }`}
                  >
                    <span>📊</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs">{f.name}</div>
                      <div className="text-[10px] text-[#2a3d52]">{f.modified}</div>
                    </div>
                    <span className="text-[10px] text-[#5c7a99]">
                      {f.size_kb != null && f.size_kb < 1000 ? `${f.size_kb} KB` : `${f.size_mb ?? '?'} MB`}
                    </span>
                    <button
                      type="button"
                      onClick={() => void openServerFile(f)}
                      className="rounded-lg border border-[#a78bfa]/40 px-2 py-1 text-[11px] text-[#a78bfa]"
                    >
                      🔮 Open
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#5c7a99]">or upload manually</div>
            <label className="mb-4 block cursor-pointer rounded-xl border-2 border-dashed border-white/10 bg-[#111720] px-4 py-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setImFile(f ?? null);
                  setSelectedServerFile(null);
                }}
              />
              <div className="text-2xl">📤</div>
              <div className="mt-1 text-sm">Drop any Koncite XLSX here</div>
              {imFile ? <div className="mt-2 font-mono text-xs text-[#00c9a7]">✓ {imFile.name}</div> : null}
            </label>
            <button
              type="button"
              onClick={() => parseLocal()}
              disabled={!imFile}
              className="mb-6 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#9e6e20] py-3 text-sm font-black text-[#060910] disabled:opacity-40"
            >
              ⚡ Generate Immersive Dashboard
            </button>
            <button
              type="button"
              onClick={useCurrent}
              disabled={!currentAnalysis}
              className="w-full rounded-xl border border-[#00c9a7]/30 bg-[#00c9a7]/10 py-3 text-sm font-semibold text-[#00c9a7] disabled:opacity-40"
            >
              📋 Use Current Analysis Data (this session)
            </button>
            <div className="mt-4 font-mono text-[10px] text-[#2a3d52]">API: {getTenderApiBase()}</div>
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#a78bfa]/30 border-t-[#a78bfa]" />
          <div className="text-sm text-[#e2eaf5]">{loadLabel}</div>
        </div>
      )}

      {state === 'dash' && imData && (
        <ImmersiveDashBody
          data={imData}
          selectedServerFile={selectedServerFile}
          imFile={imFile}
          resolveServerDownload={() => {
            if (!selectedServerFile) return null;
            const f = serverFiles.find((x) => x.name === selectedServerFile);
            if (f?.download_url) return resolveTenderAssetUrl(f.download_url) ?? downloadOutputUrl(selectedServerFile);
            return downloadOutputUrl(selectedServerFile);
          }}
          onBrowse={() => setState('browser')}
          onClose={onClose}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          filteredRows={filteredRows}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function ImmersiveDashBody({
  data,
  selectedServerFile,
  imFile,
  resolveServerDownload,
  onBrowse,
  onClose,
  tableFilter,
  setTableFilter,
  filteredRows,
  showToast,
}: {
  data: ImmersiveData;
  selectedServerFile: string | null;
  imFile: File | null;
  resolveServerDownload: () => string | null;
  onBrowse: () => void;
  onClose: () => void;
  tableFilter: 'all' | 'high' | 'med' | 'low' | 'savings';
  setTableFilter: (t: 'all' | 'high' | 'med' | 'low' | 'savings') => void;
  filteredRows: ImmersiveData['boqItems'];
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const catEntries = Object.entries(data.catData || {}).sort((a, b) => b[1] - a[1]);
  const catSumRaw = catEntries.reduce((s, e) => s + e[1], 0);
  const catChart = catEntries.slice(0, 10).map(([k, v], i) => ({
    name: k.replace(/_/g, ' '),
    value: v,
    fill: PAL[i % PAL.length],
  }));
  const conf = data.conf ?? countConf(data.boqItems);
  const confItemTotal = conf.HIGH + conf.MEDIUM + conf.LOW;
  const confChart = (['HIGH', 'MEDIUM', 'LOW'] as const)
    .filter((k) => conf[k] > 0)
    .map((k) => ({ name: k, value: conf[k], fill: CONF_C[k] }));

  const topBar = [...data.boqItems]
    .sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0))
    .slice(0, 15)
    .map((i) => ({
      name: trunc(i.description, 24),
      calc: toL(i.current_amount),
      opt: toL(i.optimized_amount),
    }));

  const downloadOriginal = () => {
    if (selectedServerFile) {
      const href = resolveServerDownload();
      if (href) window.open(href, '_blank');
      showToast('Downloading…', 'success');
      return;
    }
    if (!imFile) {
      showToast('No file available to download', 'error');
      return;
    }
    const url = URL.createObjectURL(imFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = imFile.name;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloading…', 'success');
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#060910]/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl">🔮</span>
          <div className="min-w-0">
            <div className="truncate font-black uppercase tracking-wide text-[#f0b429]">{data.projectName}</div>
            <div className="truncate font-mono text-[10px] text-[#5c7a99]">
              {data.totalItems} items · {data.tenderType} · {data.filename}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBrowse} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px]">
            📁 Browse Files
          </button>
          <button type="button" onClick={downloadOriginal} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px]">
            ⬇ Download XLSX
          </button>
          <button
            type="button"
            onClick={() => {
              exportImmersiveHtmlReport(data);
              showToast('HTML report downloaded', 'success');
            }}
            className="rounded-lg border border-[#f0b429]/35 bg-[#f0b429]/10 px-3 py-1.5 text-[11px] text-[#f0b429]"
          >
            📄 Export Report
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px]">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ImKpi label="BOQ Items" value={String(data.totalItems)} sub={`H:${conf.HIGH} M:${conf.MEDIUM} L:${conf.LOW}`} />
            <ImKpi label="Calc. Value" value={`₹${fmtL(data.calcValue)}`} sub="DSR/KB rate" />
            <ImKpi label="Optimized" value={`₹${fmtL(data.optValue)}`} sub="Competitive bid" />
            <ImKpi label="Saving" value={`₹${fmtL(data.saving)}`} sub={`${data.savingPct.toFixed(2)}%`} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#f06060]/20 bg-[#0c1018] p-6 text-center">
              <div className="text-[10px] uppercase text-[#5c7a99]">Current Bid</div>
              <div className="my-2 text-5xl font-black text-[#f06060]">{data.winCurr}%</div>
              <div className="text-xs text-[#5c7a99]">At ₹{fmtL(data.calcValue)}</div>
            </div>
            <div className="rounded-2xl border border-[#00c9a7]/20 bg-[#0c1018] p-6 text-center">
              <div className="text-[10px] uppercase text-[#5c7a99]">Optimized Bid</div>
              <div className="my-2 text-5xl font-black text-[#00c9a7]">{data.winOpt}%</div>
              <div className="text-xs text-[#5c7a99]">At ₹{fmtL(data.optValue)}</div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0c1018] p-5">
            <h4 className="mb-2 font-bold">⚡ Bidding Strategy</h4>
            <p className="text-sm text-[#c8d8e8]">
              Reduce bid value to <strong className="text-white">₹{fmtL(data.optValue)}</strong> — savings of{' '}
              <strong>₹{fmtL(data.saving)}</strong> ({data.savingPct.toFixed(2)}%) across {data.totalItems} items.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c1018] p-4">
              <h4 className="mb-2 text-sm font-bold">🥧 Cost Category</h4>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={catChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {catChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="#0c1018" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${fmtL(Number(v))}`, '']} contentStyle={{ background: '#111720', border: '1px solid #222' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-[#5c7a99]">
                {catChart.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: c.fill }} />
                    {c.name}{' '}
                    {catSumRaw > 0 ? <span className="text-[#c8d8e8]">{((c.value / catSumRaw) * 100).toFixed(1)}%</span> : null}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c1018] p-4">
              <h4 className="mb-2 text-sm font-bold">🎯 Confidence</h4>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={confChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                    {confChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="#0c1018" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111720', border: '1px solid #222' }}
                    formatter={(value, name) => {
                      const v = Number(value);
                      const pct = confItemTotal > 0 ? ((v / confItemTotal) * 100).toFixed(1) : '0';
                      return [`${v} (${pct}%)`, String(name)];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-[#5c7a99]">
                {confChart.map((c) => (
                  <span key={c.name} className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: c.fill }} />
                    <span className="font-semibold text-[#c8d8e8]">{c.name}</span>
                    {confItemTotal > 0 ? (
                      <>
                        {c.value} ({((c.value / confItemTotal) * 100).toFixed(1)}%)
                      </>
                    ) : (
                      c.value
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0c1018] p-4">
            <h4 className="mb-2 text-sm font-bold">💰 Top BOQ Items</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fill: MUTED }} tickFormatter={(v) => `₹${v}L`} />
                <Tooltip contentStyle={{ background: '#111720', border: '1px solid #222' }} />
                <Legend />
                <Bar dataKey="calc" name="Calculated" fill="rgba(79,163,255,0.5)" />
                <Bar dataKey="opt" name="Optimized" fill="rgba(0,201,167,0.5)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0c1018] p-4">
            <h4 className="mb-3 text-sm font-bold">⬇ Download &amp; Export</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  { label: 'BOQ Summary (CSV)', fn: () => exportBoqCsv(data) },
                  { label: 'Savings Report (CSV)', fn: () => exportSavingsCsv(data) },
                  { label: 'Category Breakdown (CSV)', fn: () => exportCategoryCsv(data) },
                  { label: 'Resource Summary (CSV)', fn: () => exportResourceCsv(data) },
                ] as const
              ).map(({ label, fn }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    fn();
                    showToast('Exported', 'success');
                  }}
                  className="rounded-xl border border-white/[0.06] px-3 py-3 text-left text-xs hover:border-[#00c9a7]/40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2 text-[10px] uppercase tracking-wider text-[#5c7a99]">Detailed BOQ</div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c1018]">
            <div className="flex flex-wrap gap-1 border-b border-white/[0.06] p-2">
              {(['all', 'high', 'med', 'low', 'savings'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTableFilter(k)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                    tableFilter === k ? 'bg-[#172030] text-white' : 'text-[#5c7a99]'
                  }`}
                >
                  {k === 'all' ? 'All' : k === 'high' ? 'High Conf' : k === 'med' ? 'Medium' : k === 'low' ? 'Low' : 'Savings'}
                </button>
              ))}
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[800px] text-left text-[10px]">
                <thead className="sticky top-0 bg-[#111720] text-[#5c7a99]">
                  <tr>
                    <th className="p-1.5">#</th>
                    <th className="p-1.5">Description</th>
                    <th className="p-1.5 text-right">Calc</th>
                    <th className="p-1.5 text-right">Opt</th>
                    <th className="p-1.5">Conf</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((it, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="p-1.5 font-mono">{it.item_no}</td>
                      <td className="max-w-[200px] p-1.5">{trunc(it.description, 48)}</td>
                      <td className="p-1.5 text-right">₹{fmt(it.current_amount)}</td>
                      <td className="p-1.5 text-right text-[#00c9a7]">₹{fmt(it.optimized_amount)}</td>
                      <td className="p-1.5">{it.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-white/[0.06] p-2 text-[10px] text-[#2a3d52]">
              Showing {filteredRows.length} of {data.boqItems.length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ImKpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c1018] p-3">
      <div className="text-[9px] uppercase text-[#5c7a99]">{label}</div>
      <div className="text-lg font-black text-[#f0b429]">{value}</div>
      <div className="text-[9px] text-[#2a3d52]">{sub}</div>
    </div>
  );
}
