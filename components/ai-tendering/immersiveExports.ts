import type { ImmersiveData } from './types';
import { downloadCsv, downloadHtml, fmt, fmtL } from './utils';

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function exportBoqCsv(d: ImmersiveData): void {
  const rows: (string | number)[][] = [
    ['Item No', 'Description', 'Unit', 'Quantity', 'Base Rate', 'Calc Amount', 'Confidence', 'Comp Rate', 'Opt Amount', 'Saving', 'Category'],
  ];
  for (const it of d.boqItems) {
    const s = it.saving || (it.current_amount || 0) - (it.optimized_amount || 0);
    rows.push([
      it.item_no,
      it.description,
      it.unit,
      it.quantity,
      it.base_rate,
      it.current_amount,
      it.confidence,
      it.competitive_rate,
      it.optimized_amount,
      s,
      it.category,
    ]);
  }
  downloadCsv(rows, 'Koncite_BOQ_Analysis.csv');
}

export function exportSavingsCsv(d: ImmersiveData): void {
  const savers = d.boqItems
    .filter((it) => (it.saving || (it.current_amount || 0) - (it.optimized_amount || 0)) > 0)
    .sort(
      (a, b) =>
        (b.saving || (b.current_amount || 0) - (b.optimized_amount || 0)) -
        (a.saving || (a.current_amount || 0) - (a.optimized_amount || 0))
    );
  const rows: (string | number)[][] = [['Item No', 'Description', 'Unit', 'Qty', 'Calc Amount', 'Opt Amount', 'Saving (Rs)', 'Saving %']];
  for (const it of savers) {
    const s = it.saving || (it.current_amount || 0) - (it.optimized_amount || 0);
    const pct = it.current_amount > 0 ? ((s / it.current_amount) * 100).toFixed(2) : '0';
    rows.push([it.item_no, it.description, it.unit, it.quantity, it.current_amount, it.optimized_amount, s, `${pct}%`]);
  }
  downloadCsv(rows, 'Koncite_Savings_Report.csv');
}

export function exportCategoryCsv(d: ImmersiveData): void {
  const rows: (string | number)[][] = [['Category', 'Calculated Value (Rs)', 'Value (Lakh)', '% Share']];
  const catArr = Object.entries(d.catData || {}).sort((a, b) => b[1] - a[1]);
  const total = catArr.reduce((s, e) => s + e[1], 0);
  for (const [k, v] of catArr) {
    rows.push([k.replace(/_/g, ' '), v, (v / 100_000).toFixed(2), total > 0 ? `${((v / total) * 100).toFixed(2)}%` : '0%']);
  }
  downloadCsv(rows, 'Koncite_Category_Breakdown.csv');
}

export function exportResourceCsv(d: ImmersiveData): void {
  const rows: (string | number)[][] = [['Resource Name', 'Type', 'Total Amount (Rs)', 'Amount (Lakh)']];
  const res = d.resources ?? {};
  const pushArr = (arr: Array<[string, number] | { name?: string; value?: number }>, type: string) => {
    for (const r of arr) {
      const n = Array.isArray(r) ? r[0] : r.name;
      const v = Array.isArray(r) ? r[1] : r.value || 0;
      rows.push([String(n), type, v, (v / 100_000).toFixed(2)]);
    }
  };
  pushArr(res.labour ?? [], 'Labour');
  pushArr(res.materials ?? [], 'Material');
  pushArr(res.machinery ?? [], 'Machinery');
  downloadCsv(rows, 'Koncite_Resource_Summary.csv');
}

export function exportImmersiveHtmlReport(d: ImmersiveData): void {
  const top = [...d.boqItems].sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0)).slice(0, 30);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(d.projectName)} — Koncite Report</title>
  <style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:30px;color:#1a1a2e;background:#f8f9ff}
  h1{font-size:28px;color:#1565c0;margin-bottom:5px}h2{font-size:16px;color:#555;margin:24px 0 10px}
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:#fff;border:1px solid #e0e7ff;border-radius:10px;padding:14px;text-align:center}
  .kpi-lbl{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:1px}
  .kpi-val{font-size:22px;font-weight:700;color:#1565c0;margin:4px 0 2px}
  .kpi-sub{font-size:10px;color:#aaa}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
  th{background:#1565c0;color:#fff;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:6px 10px;border-bottom:1px solid #e8ecf8}
  tr:nth-child(even){background:#f0f4ff}
  .saving{color:#00897b;font-weight:700}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e7ff;font-size:11px;color:#aaa;text-align:center}
  </style></head><body>
  <h1>${esc(d.projectName)}</h1>
  <div style="font-size:13px;color:#666;margin-bottom:20px">Koncite AI · ${new Date().toLocaleDateString('en-IN')} · ${d.tenderType}</div>
  <div class="kpi-row">
  <div class="kpi"><div class="kpi-lbl">BOQ Items</div><div class="kpi-val">${d.totalItems}</div></div>
  <div class="kpi"><div class="kpi-lbl">Calculated Value</div><div class="kpi-val">₹${fmtL(d.calcValue)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Optimized Value</div><div class="kpi-val">₹${fmtL(d.optValue)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Saving</div><div class="kpi-val" style="color:#00897b">₹${fmtL(d.saving)}</div><div class="kpi-sub">${d.savingPct.toFixed(2)}%</div></div>
  </div>
  <h2>Top BOQ Items</h2>
  <table><thead><tr><th>Item No</th><th>Description</th><th>Unit</th><th>Qty</th><th>Calc Amt</th><th>Opt Amt</th><th>Saving</th><th>Conf</th></tr></thead><tbody>
  ${top
    .map((it) => {
      const s = it.saving || (it.current_amount || 0) - (it.optimized_amount || 0);
      return `<tr><td>${esc(String(it.item_no))}</td><td style="max-width:260px">${esc((it.description || '').slice(0, 80))}</td><td>${esc(it.unit)}</td><td style="text-align:right">${fmt(it.quantity, 0)}</td><td style="text-align:right">₹${fmt(it.current_amount)}</td><td style="text-align:right">₹${fmt(it.optimized_amount)}</td><td class="${s > 0 ? 'saving' : ''}" style="text-align:right">₹${fmt(s)}</td><td>${it.confidence}</td></tr>`;
    })
    .join('')}
  </tbody></table>
  <footer>Generated by Koncite AI Tendering System v4.0 · ${new Date().toLocaleString('en-IN')}</footer></body></html>`;
  downloadHtml(html, `Koncite_Report_${d.projectName.replace(/\s+/g, '_')}.html`);
}
