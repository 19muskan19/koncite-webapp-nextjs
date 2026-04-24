import type { DataValidation } from 'exceljs';
import ExcelJS from 'exceljs';

const TYPE_COL = 1; // A: Type (heading | activity)
const UNITS_COL = 4; // D: Units
const DEFAULT_EXTRA_ROWS = 500;
const MAX_UNIT_VALIDATION_ROW = 10000;

/** Show dates in exported sheets as yyyy-mm-dd (ISO calendar date in local time when parsing). */
export function formatActivitySheetDate(value: unknown): string {
  if (value == null) return '';
  const s = String(value).trim();
  if (s === '') return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = new Date(s);
  if (!Number.isNaN(t.getTime())) {
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }
  return s;
}

/** Activities table: show month + year only (e.g. Apr 2026). Empty / Excel zero dates show as "-". */
export function formatActivityDateMonthYear(value: unknown): string {
  if (value == null) return '-';
  const s = String(value).trim();
  if (s === '') return '-';
  if (s.startsWith('1899-12-30') || s.startsWith('1899-12-31')) return '-';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let d: Date;
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    d = new Date(y, m, day);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

/** Build unique, non-empty unit labels from API master unit rows. */
export function collectUnitLabelsFromMasters(masters: unknown[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of masters || []) {
    const u = raw as { unit?: string; name?: string };
    const label = (u?.unit || u?.name || '').toString().trim();
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

/**
 * Build an .xlsx buffer: Activities sheet, Type column dropdown (heading | activity), and
 * optional hidden UnitList with data validation on Units (from Masters).
 */
export async function buildActivitiesWorkbook(
  headerRow: (string | number)[],
  dataRows: (string | number)[][],
  unitLabels: string[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KONCITE';

  const mainSheet = workbook.addWorksheet('Activities');

  mainSheet.addRow(headerRow);
  dataRows.forEach((row) => mainSheet.addRow(row));

  const dataRowCount = dataRows.length;
  const lastRow = Math.min(
    Math.max(2 + dataRowCount + DEFAULT_EXTRA_ROWS, 500),
    MAX_UNIT_VALIDATION_ROW
  );

  const typeValidation: DataValidation = {
    type: 'list',
    allowBlank: true,
    showInputMessage: true,
    promptTitle: 'Type',
    prompt: 'Select heading or activity.',
    showErrorMessage: true,
    errorStyle: 'warning',
    errorTitle: 'Type',
    error: 'Choose heading or activity from the list.',
    formulae: ['"heading,activity"'],
  };

  for (let r = 2; r <= lastRow; r++) {
    mainSheet.getRow(r).getCell(TYPE_COL).dataValidation = typeValidation;
  }

  if (unitLabels.length > 0) {
    const unitSheet = workbook.addWorksheet('UnitList', { state: 'hidden' });
    unitLabels.forEach((label, idx) => {
      unitSheet.getCell(idx + 1, 1).value = label;
    });

    const n = unitLabels.length;
    const listFormula = `UnitList!$A$1:$A$${n}`;

    const unitDataValidation: DataValidation = {
      type: 'list',
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Unit',
      prompt: 'Select a unit from the list (Masters > Units).',
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Unit',
      error: 'Pick a value from the list, or clear the cell.',
      formulae: [listFormula],
    };

    for (let r = 2; r <= lastRow; r++) {
      mainSheet.getRow(r).getCell(UNITS_COL).dataValidation = unitDataValidation;
    }
  }

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
