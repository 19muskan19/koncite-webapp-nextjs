import * as XLSX from 'xlsx';
import type { BoqItemRow, ImmersiveData, TenderAnalysisResponse, TenderType } from './types';
import { buildCategoryBreakdownFromItems, countConf, parseConfidence } from './utils';

export function extractDataFromWorkbook(wb: XLSX.WorkBook, filename: string): ImmersiveData {
  const sheetNames = wb.SheetNames;
  let projectName = 'Tender Analysis';
  let totalItems = 0;
  let calcValue = 0;
  let optValue = 0;
  let saving = 0;
  let savingPct = 0;
  let tenderType: TenderType = 'PRIVATE';
  let boqItems: BoqItemRow[] = [];
  const resources: {
    labour: [string, number][];
    materials: [string, number][];
    machinery: [string, number][];
  } = {
    labour: [],
    materials: [],
    machinery: [],
  };

  if (sheetNames.includes('Cover')) {
    const ws = wb.Sheets.Cover;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    for (const r of rows) {
      const k = String(r[0] ?? '').trim();
      const v = String(r[1] ?? '').trim();
      if (k === 'Project Name' && v) projectName = v;
      if (k === 'Total BOQ Items') totalItems = parseInt(v, 10) || 0;
      if (k === 'DSR/KB Calculated Value') {
        const m = v.match(/([\d,.]+)/);
        if (m) calcValue = parseFloat(m[1].replace(/,/g, '')) * 100_000;
      }
      if (k === 'Optimized Tender Value') {
        const m = v.match(/([\d,.]+)/);
        if (m) optValue = parseFloat(m[1].replace(/,/g, '')) * 100_000;
      }
      if (k === 'Potential Saving') {
        const m = v.match(/([\d,.]+)/);
        if (m) saving = parseFloat(m[1].replace(/,/g, '')) * 100_000;
        const pct = v.match(/([\d.]+)%/);
        if (pct) savingPct = parseFloat(pct[1]);
      }
      if (String(r[0]).toLowerCase().includes('government') || String(r[1]).toLowerCase().includes('government')) {
        tenderType = 'GOVERNMENT';
      }
    }
  }

  const boqSheet = sheetNames.find((s) => s.toLowerCase().includes('boq'));
  if (boqSheet) {
    const ws = wb.Sheets[boqSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    let headerRow = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const r = rows[i].map((c) => String(c).toLowerCase());
      if (
        r.some((c) => c.includes('item')) ||
        (r.some((c) => c.includes('description')) &&
          (r.some((c) => c.includes('quantity')) || r.some((c) => c.includes('unit'))))
      ) {
        headerRow = i;
        break;
      }
    }
    if (headerRow >= 0) {
      const hdr = rows[headerRow].map((c) => String(c).toLowerCase());
      const ci = {
        item: hdr.findIndex((h) => h.includes('item')),
        desc: hdr.findIndex((h) => h.includes('description')),
        unit: hdr.findIndex((h) => h.includes('unit')),
        qty: hdr.findIndex((h) => h.includes('quantit')),
        br: hdr.findIndex((h) => h.includes('base rate') || h.includes('base r')),
        ba: hdr.findIndex((h) => h.includes('base amount') || h.includes('base a')),
        conf: hdr.findIndex((h) => h.includes('confidence') || h.includes('conf')),
        cr: hdr.findIndex((h) => h.includes('comp rate') || h.includes('competitive')),
        ca: hdr.findIndex((h) => h.includes('comp amount') || h.includes('comp a')),
        sav: hdr.findIndex((h) => h.includes('saving')),
        cat: hdr.findIndex((h) => h.includes('category')),
      };
      for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i];
        const desc = String(r[ci.desc >= 0 ? ci.desc : 1] ?? '').trim();
        const ba = parseFloat(String(r[ci.ba >= 0 ? ci.ba : 5] ?? 0)) || 0;
        if (!desc || desc.startsWith('>') || desc.startsWith('BILL')) continue;
        if (desc.startsWith('Item') && ba === 0) continue;
        if (ba === 0 && (parseFloat(String(r[ci.qty >= 0 ? ci.qty : 3] ?? 0)) || 0) === 0) continue;
        boqItems.push({
          item_no: String(r[ci.item >= 0 ? ci.item : 0] ?? '').trim(),
          description: desc,
          unit: String(r[ci.unit >= 0 ? ci.unit : 2] ?? '').trim(),
          quantity: parseFloat(String(r[ci.qty >= 0 ? ci.qty : 3] ?? 0)) || 0,
          base_rate: parseFloat(String(r[ci.br >= 0 ? ci.br : 4] ?? 0)) || 0,
          current_amount: ba,
          confidence: parseConfidence(r[ci.conf >= 0 ? ci.conf : 6]),
          competitive_rate: parseFloat(String(r[ci.cr >= 0 ? ci.cr : 7] ?? 0)) || 0,
          optimized_amount: parseFloat(String(r[ci.ca >= 0 ? ci.ca : 8] ?? 0)) || 0,
          saving: parseFloat(String(r[ci.sav >= 0 ? ci.sav : 9] ?? 0)) || 0,
          category: String(r[ci.cat >= 0 ? ci.cat : 12] ?? 'general').trim() || 'general',
        });
      }
    }
    if (!totalItems) totalItems = boqItems.length;
    if (!calcValue) calcValue = boqItems.reduce((s, i) => s + i.current_amount, 0);
    if (!optValue) optValue = boqItems.reduce((s, i) => s + i.optimized_amount, 0);
    if (!saving) saving = Math.max(0, calcValue - optValue);
    if (!savingPct && calcValue > 0) savingPct = (saving / calcValue) * 100;
  }

  const resSheet = sheetNames.find((s) => s.toLowerCase().includes('resource'));
  if (resSheet) {
    const ws = wb.Sheets[resSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    let mode: 'labour' | 'materials' | 'machinery' = 'labour';
    for (const r of rows.slice(2)) {
      const name = String(r[0] ?? '').trim();
      const type = String(r[1] ?? '').trim().toLowerCase();
      const amt = parseFloat(String(r[5] ?? 0)) || 0;
      if (name.includes('LABOUR')) mode = 'labour';
      else if (name.includes('MACHINERY')) mode = 'machinery';
      else if (name.includes('MATERIAL')) mode = 'materials';
      else if (name && amt > 0) {
        if (type === 'labour') resources.labour!.push([name, amt]);
        else if (type === 'machinery') resources.machinery!.push([name, amt]);
        else if (type === 'material') resources.materials!.push([name, amt]);
      }
    }
    resources.labour!.sort((a, b) => b[1] - a[1]);
    resources.materials!.sort((a, b) => b[1] - a[1]);
    resources.materials!.splice(10);
    resources.machinery!.sort((a, b) => b[1] - a[1]);
  }

  const catData = buildCategoryBreakdownFromItems(boqItems);
  const conf = countConf(boqItems);
  const winCurr = 42;
  const winOpt = 63;

  return {
    filename,
    projectName,
    tenderType,
    totalItems,
    calcValue,
    optValue,
    saving,
    savingPct,
    boqItems,
    resources,
    catData,
    winCurr,
    winOpt,
    conf,
    sheets: sheetNames,
  };
}

export async function readXlsxFile(file: File): Promise<ImmersiveData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return extractDataFromWorkbook(wb, file.name);
}

export async function fetchWorkbookAsImmersive(url: string, filename: string): Promise<ImmersiveData> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status}: ${resp.statusText}`);
  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return extractDataFromWorkbook(wb, filename);
}
