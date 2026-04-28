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
import type { BoqItemRow, TenderAnalysisResponse, TenderType } from './types';
import { openProcessDownload, TenderSessionChat } from './TenderAssistPanels';
import { buildCategoryBreakdownFromItems, countConf, fmt, fmtL, getFinancials, itemSaving, normalizeItems, toL, trunc } from './utils';

const PAL = ['#f0b429', '#00c9a7', '#4fa3ff', '#f06060', '#a78bfa', '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#facc15'];
const CONF_C: Record<string, string> = { HIGH: '#00c9a7', MEDIUM: '#f0b429', LOW: '#f06060' };
const MUTED = '#5c7a99';

type TableFilter = 'all' | 'high' | 'med' | 'low' | 'savings';

interface AnalysisDashboardProps {
  data: TenderAnalysisResponse;
  onBack: () => void;
  onImmersive: () => void;
  tenderType: TenderType;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function AnalysisDashboard({ data, onBack, onImmersive, tenderType, showToast }: AnalysisDashboardProps) {
  const items = React.useMemo(() => normalizeItems(data), [data]);
  const f = React.useMemo(() => getFinancials(data, items), [data, items]);
  const ttype = (data.tender_type ?? 'PRIVATE') as TenderType;
  const pi = data.project_info ?? {};
  const name = pi.name ?? data.project_name ?? 'Proposed Project';
  const parts = name.toUpperCase().split(/\s+/).filter(Boolean);
  const half = Math.ceil(parts.length / 2);
  const wp = data.win_probability ?? {};
  const cw = wp.current_win_probability ?? 45;
  const ow = wp.optimized_win_probability ?? 65;
  const catData =
    data.category_breakdown && Object.keys(data.category_breakdown).length > 0
      ? data.category_breakdown
      : buildCategoryBreakdownFromItems(items);
  const conf = countConf(items);
  const docInfo = data._docInfo ?? {};

  const topCatEntry = Object.entries(catData).sort((a, b) => b[1] - a[1])[0];
  const topCatName = topCatEntry
    ? topCatEntry[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '—';

  const saving = f.total_saving ?? 0;
  const savP = f.saving_pct ?? 0;
  const optVal = fmtL(f.total_optimized ?? f.optimized_value ?? 0);

  const summaryHtml =
    data.ai_summary ??
    data.executive_summary ??
    `Tender analysis for <strong>${name}</strong>, ${f.total_items ?? items.length} items. Analysed value <strong>₹${fmtL(f.total_current ?? f.calculated_value ?? 0)}</strong>, optimized to <strong>₹${optVal}</strong> — saving <strong>₹${fmtL(saving)}</strong>. Procurement at optimized rates recommended.`;

  const [tableFilter, setTableFilter] = React.useState<TableFilter>('all');

  const catChartData = Object.entries(catData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v], i) => ({ name: k.replace(/_/g, ' '), value: v, fill: PAL[i % PAL.length] }));

  const catSum = catChartData.reduce((s, x) => s + x.value, 0);

  const confChartData = (['HIGH', 'MEDIUM', 'LOW'] as const)
    .filter((k) => conf[k] > 0)
    .map((k) => ({ name: k, value: conf[k], fill: CONF_C[k] }));

  const confItemTotal = conf.HIGH + conf.MEDIUM + conf.LOW;

  const topBar = [...items]
    .sort((a, b) => (b.current_amount ?? 0) - (a.current_amount ?? 0))
    .slice(0, 15)
    .map((i) => ({
      name: trunc(i.description, 24),
      calc: toL(i.current_amount),
      opt: toL(i.optimized_amount),
    }));

  const savers = items
    .map((i) => ({
      name: trunc(i.description, 30),
      save: toL(itemSaving(i)),
    }))
    .filter((i) => i.save > 0)
    .sort((a, b) => b.save - a.save)
    .slice(0, 12);

  const res = data.resources ?? {};

  const filteredRows = React.useMemo(() => {
    let rows = items;
    const confOf = (r: BoqItemRow) => r.confidence || 'MEDIUM';
    if (tableFilter === 'high') rows = rows.filter((r) => confOf(r) === 'HIGH');
    else if (tableFilter === 'med') rows = rows.filter((r) => confOf(r) === 'MEDIUM');
    else if (tableFilter === 'low') rows = rows.filter((r) => confOf(r) === 'LOW');
    else if (tableFilter === 'savings') rows = rows.filter((r) => itemSaving(r) > 0);
    return rows;
  }, [items, tableFilter]);

  const soc = data.schedule_of_credit;
  const canDownloadXlsx = !!(data.download_url || data.output_file);

  return (
    <div className="relative pt-7 text-[#e2eaf5]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-black leading-tight tracking-wide text-white sm:text-4xl md:text-5xl">
            {parts.slice(0, half).join(' ')}
            <br />
            <span className="text-[#f0b429]">{parts.slice(half).join(' ')}</span>
          </div>
          <div className="mt-1.5 font-mono text-xs text-[#5c7a99]">
            {f.total_items ?? items.length} BOQ items · {ttype} Sector
            {docInfo.boq ? ` · BOQ: ${docInfo.boq}` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-white/10 bg-[#0c1018] px-4 py-2 text-xs text-[#5c7a99] hover:border-white/20 hover:text-[#e2eaf5]"
          >
            ← New Analysis
          </button>
          {canDownloadXlsx ? (
            <button
              type="button"
              onClick={() => openProcessDownload(data)}
              className="rounded-xl border border-[#00c9a7]/35 bg-[#00c9a7]/10 px-3 py-2 text-[11px] font-semibold text-[#00c9a7]"
              title="From /api/ai-tendering/process (download_url or output_file)"
            >
              ⬇ Excel output
            </button>
          ) : null}
          <button
            type="button"
            onClick={onImmersive}
            className="inline-flex items-center gap-2 rounded-xl border border-[#a78bfa]/40 bg-gradient-to-br from-[#a78bfa]/15 to-[#4fa3ff]/15 px-3 py-2 text-[11px] font-semibold text-[#a78bfa]"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#a78bfa]" />
            🔮 Immersive View
          </button>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] ${
              ttype === 'GOVERNMENT'
                ? 'border-[#2e7d32] bg-[#2e7d32]/10 text-[#66bb6a]'
                : 'border-[#1565c0] bg-[#1565c0]/10 text-[#64b5f6]'
            }`}
          >
            {ttype}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <Kpi
          label="BOQ Items"
          value={fmt(f.total_items ?? items.length, 0)}
          sub={`H:${conf.HIGH} · M:${conf.MEDIUM} · L:${conf.LOW}`}
          icon="📋"
          style={{ ['--kc' as string]: '#f0b429' }}
        />
        <Kpi
          label="Calculated Value"
          value={`₹${fmtL(f.total_current ?? f.calculated_value ?? 0)}`}
          sub="DSR / KB matched rate"
          icon="💰"
          style={{ ['--kc' as string]: '#4fa3ff' }}
        />
        <Kpi
          label="Optimized Value"
          value={`₹${fmtL(f.total_optimized ?? f.optimized_value ?? 0)}`}
          sub="After competitive optimization"
          icon="⚡"
          style={{ ['--kc' as string]: '#00c9a7' }}
        />
        <Kpi
          label="Potential Saving"
          value={`₹${fmtL(saving)}`}
          sub={`${(savP ?? 0).toFixed(2)}% identified`}
          icon="📉"
          style={{ ['--kc' as string]: '#00c9a7' }}
        />
        <Kpi label="Top Category" value={topCatName.slice(0, 18)} sub="Highest cost bucket" icon="🏆" style={{ ['--kc' as string]: '#f0b429' }} />
        <Kpi
          label={ttype === 'GOVERNMENT' ? 'Est. Cost (Govt)' : 'Tender Type'}
          value={ttype === 'GOVERNMENT' ? (f.estimated_cost ? `₹${fmtL(f.estimated_cost)}` : '—') : ttype}
          sub={ttype === 'GOVERNMENT' ? 'From tender docs' : 'Analysis mode'}
          icon={ttype === 'GOVERNMENT' ? '🏛️' : '🏗️'}
          style={{ ['--kc' as string]: '#a78bfa' }}
        />
      </div>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Win Probability</div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="rounded-[18px] border border-[#f06060]/20 bg-[#0c1018] p-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Current Bid — Calculated Value</div>
          <div className="font-mono text-5xl font-black tracking-wide text-[#f06060]">{cw}%</div>
          <div className="mt-1 text-[11px] text-[#5c7a99]">At calculated value of ₹{fmtL(f.total_current ?? f.calculated_value ?? 0)}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#172030]">
            <div className="h-full rounded bg-[#f06060] transition-all duration-1000" style={{ width: `${cw}%` }} />
          </div>
        </div>
        <div className="rounded-[18px] border border-[#00c9a7]/20 bg-[#0c1018] p-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Optimized Bid — Competitive Value</div>
          <div className="font-mono text-5xl font-black tracking-wide text-[#00c9a7]">{ow}%</div>
          <div className="mt-1 text-[11px] text-[#5c7a99]">
            At optimized value of ₹{fmtL(f.total_optimized ?? f.optimized_value ?? 0)} — recommended bid
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#172030]">
            <div
              className="h-full rounded bg-[#00c9a7] shadow-[0_0_10px_rgba(0,201,167,0.4)] transition-all duration-1000"
              style={{ width: `${ow}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[18px] border-l-4 border-[#f0b429] bg-[#0c1018] p-5">
        <h3 className="mb-2 text-lg font-bold">⚡ Bidding Strategy</h3>
        <p className="text-sm leading-relaxed text-[#c8d8e8]">
          Reduce bid value to <strong className="text-white">₹{optVal}</strong> to enhance competitiveness. The {savP.toFixed(2)}%
          reduction across {f.total_items ?? items.length} items demonstrates analytical rigour. Use DSR-2021 / KB benchmarks to justify
          rates during technical evaluation.
        </p>
      </div>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Cost Analysis</div>
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="🥧 Cost Category Breakdown" badge="optimized value">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={catChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {catChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="#0c1018" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#111720', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(v) => [`₹${fmtL(Number(v))}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5c7a99]">
            {catChartData.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.fill }} />
                {c.name}{' '}
                {catSum > 0 ? (
                  <span className="text-[#c8d8e8]">{((c.value / catSum) * 100).toFixed(1)}%</span>
                ) : null}
              </span>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="🎯 Rate Confidence Distribution" badge="KB match quality">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={confChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {confChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="#0c1018" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#111720', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value, name) => {
                  const v = Number(value);
                  const pct = confItemTotal > 0 ? ((v / confItemTotal) * 100).toFixed(1) : '0';
                  return [`${v} items (${pct}%)`, String(name)];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5c7a99]">
            {confChartData.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.fill }} />
                <span className="font-semibold text-[#c8d8e8]">{c.name}</span>
                {confItemTotal > 0 ? (
                  <>
                    : {c.value} ({((c.value / confItemTotal) * 100).toFixed(1)}%)
                  </>
                ) : (
                  `: ${c.value}`
                )}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="💰 Top BOQ Items — Calculated vs Optimized" badge="₹ Lakh">
        <div className="mb-2 flex gap-3 text-[10px] text-[#5c7a99]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-[#4fa3ff]" /> Calculated
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-[#00c9a7]" /> Optimized
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topBar} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} angle={-35} textAnchor="end" height={70} />
            <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v) => `₹${v}L`} />
            <Tooltip
              contentStyle={{ background: '#111720', border: '1px solid rgba(255,255,255,0.1)' }}
              formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')} L`, '']}
            />
            <Legend />
            <Bar dataKey="calc" name="Calculated" fill="rgba(79,163,255,0.5)" stroke="#4fa3ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opt" name="Optimized" fill="rgba(0,201,167,0.5)" stroke="#00c9a7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {savers.length > 0 ? (
        <ChartCard title="📊 Saving by Item — Top Savers" badge="₹ Lakh">
          <ResponsiveContainer width="100%" height={Math.max(220, savers.length * 40 + 70)}>
            <BarChart data={savers} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v) => `₹${v}L`} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fill: MUTED, fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#111720', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')} L`, 'Saving']}
              />
              <Bar dataKey="save" fill="rgba(0,201,167,0.45)" stroke="#00c9a7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      <div className="mb-2 mt-6 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Resource Breakdown</div>
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ResourceChart title="👷 Labour" data={res.labour ?? []} color="#f0b429" />
        <ResourceChart title="🧱 Top Materials" data={(res.materials ?? []).slice(0, 8)} color="#4fa3ff" />
        <ResourceChart title="⚙️ Machinery" data={res.machinery ?? []} color="#a78bfa" />
      </div>

      <div className="mb-6 rounded-[18px] border border-white/[0.06] bg-[#0c1018] p-5">
        <h3 className="mb-2 text-lg font-bold">🤖 AI Executive Summary</h3>
        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[#c8d8e8]" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
      </div>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">Detailed BOQ Rate Table</div>
      <div className="mb-6 overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#0c1018]">
        <div className="flex flex-wrap gap-1 border-b border-white/[0.06] p-2">
          {(
            [
              ['all', 'All Items'],
              ['high', 'High Confidence'],
              ['med', 'Medium'],
              ['low', 'Low'],
              ['savings', 'Has Savings'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTableFilter(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tableFilter === k ? 'bg-[#172030] text-[#e2eaf5]' : 'text-[#5c7a99] hover:text-[#e2eaf5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="custom-scrollbar max-h-[480px] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 bg-[#111720] font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">
              <tr>
                <th className="p-2">Item #</th>
                <th className="p-2">Description</th>
                <th className="p-2">Unit</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Base Rate</th>
                <th className="p-2 text-right">Calc Amt (₹)</th>
                <th className="p-2 text-right">Opt Rate</th>
                <th className="p-2 text-right">Opt Amt (₹)</th>
                <th className="p-2 text-right">Saving (₹)</th>
                <th className="p-2">Conf</th>
                <th className="p-2">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((it, idx) => {
                const s = itemSaving(it);
                const cn = it.confidence || 'MEDIUM';
                return (
                  <tr key={idx} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-2 font-mono text-[#5c7a99]">{it.item_no}</td>
                    <td className="max-w-[240px] whitespace-normal p-2 leading-snug text-[#c8d8e8]">{it.description}</td>
                    <td className="p-2 font-mono text-[#5c7a99]">{it.unit}</td>
                    <td className="p-2 text-right font-mono text-[#5c7a99]">{fmt(it.quantity, 0)}</td>
                    <td className="p-2 text-right font-mono">₹{fmt(it.base_rate)}</td>
                    <td className="p-2 text-right font-semibold">₹{fmt(it.current_amount)}</td>
                    <td className="p-2 text-right font-mono text-[#00c9a7]">₹{fmt(it.competitive_rate)}</td>
                    <td className="p-2 text-right font-semibold text-[#00c9a7]">₹{fmt(it.optimized_amount)}</td>
                    <td className={`p-2 text-right ${s > 0 ? 'font-semibold text-[#00c9a7]' : ''}`}>₹{fmt(s)}</td>
                    <td className="p-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          cn === 'HIGH'
                            ? 'bg-[#00c9a7]/15 text-[#00c9a7]'
                            : cn === 'LOW'
                              ? 'bg-[#f06060]/15 text-[#f06060]'
                              : 'bg-[#f0b429]/15 text-[#f0b429]'
                        }`}
                      >
                        {cn}
                      </span>
                    </td>
                    <td className="p-2 text-[10px] text-[#5c7a99]">{(it.category || '').replace(/_/g, ' ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/[0.06] p-2 font-mono text-[11px] text-[#2a3d52]">Showing {filteredRows.length} items</div>
      </div>

      {soc && soc.length > 0 ? (
        <div className="mb-10 overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#0c1018]">
          <h3 className="border-b border-white/[0.06] p-4 text-sm font-bold">
            🏛️ Schedule of Credit <span className="ml-2 rounded border border-[#2e7d32]/30 bg-[#2e7d32]/10 px-2 py-0.5 text-[10px] text-[#66bb6a]">Government Tender</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-[11px]">
              <thead className="bg-[#111720] font-mono text-[10px] uppercase text-[#5c7a99]">
                <tr>
                  <th className="p-2">Sr</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {soc.map((row, i) => (
                  <tr key={i} className="border-t border-white/[0.04]">
                    <td className="p-2 font-mono">{row.sr}</td>
                    <td className="p-2">{row.description}</td>
                    <td className="p-2 font-mono">{row.unit}</td>
                    <td className="p-2 text-right font-mono">{fmt(row.quantity)}</td>
                    <td className="p-2 text-right">₹{fmt(row.rate)}</td>
                    <td className="p-2 text-right font-semibold text-[#00c9a7]">₹{fmt(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <TenderSessionChat sessionId={data.session_id} tenderType={tenderType} showToast={showToast} />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  style,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent?: string;
  style?: React.CSSProperties;
}) {
  const kc = (style as { ['--kc']?: string })?.['--kc'] ?? '#f0b429';
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c1018] p-[18px] transition hover:-translate-y-0.5 hover:border-white/10"
      style={style}
    >
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: kc }} />
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c7a99]">{label}</div>
      <div className="text-[26px] font-black leading-none tracking-wide" style={{ color: kc }}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] text-[#2a3d52]">{sub}</div>
      <div className="absolute right-3.5 top-3.5 text-lg opacity-10">{icon}</div>
    </div>
  );
}

function ChartCard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-[#0c1018] p-5">
      <h3 className="mb-3 text-sm font-bold">
        {title}{' '}
        <span className="ml-2 rounded border border-white/10 px-2 py-0.5 text-[10px] font-normal text-[#5c7a99]">{badge}</span>
      </h3>
      {children}
    </div>
  );
}

function ResourceChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Array<[string, number] | { name?: string; value?: number }>;
  color: string;
}) {
  const rows = data.map((r) => {
    if (Array.isArray(r)) return { name: r[0], v: toL(r[1]) };
    return { name: String(r.name ?? ''), v: toL(r.value) };
  });
  if (!rows.length) {
    return (
      <div className="rounded-[18px] border border-white/[0.06] bg-[#0c1018] p-5">
        <h3 className="mb-2 text-sm font-bold">{title}</h3>
        <p className="text-xs text-[#5c7a99]">No data</p>
      </div>
    );
  }
  const h = Math.max(200, rows.length * 34 + 55);
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-[#0c1018] p-5">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v) => `₹${v}L`} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fill: MUTED, fontSize: 9 }} />
          <Tooltip
            contentStyle={{ background: '#111720', border: '1px solid rgba(255,255,255,0.1)' }}
            formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')} L`, '']}
          />
          <Bar dataKey="v" fill={`${color}44`} stroke={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
