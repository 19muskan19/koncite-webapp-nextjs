import * as XLSX from 'xlsx';

export type VendorImportStats = {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  message: string;
};

/** Normalized for equality only (lowercase/trim, digits for phone). */
export type VendorKeySnapshot = {
  name: string;
  type: string;
  address: string;
  contact_person_name: string;
  phone: string;
  email: string;
  gst_no: string;
};

function stripHeaderToKey(h: string): string {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Read cell values from a row object with flexible column titles (as in template export).
 */
function pickField(row: Record<string, unknown>, ...aliases: string[]): string {
  const entries = Object.entries(row).map(([k, v]) => [
    stripHeaderToKey(String(k)),
    v == null ? '' : String(v).trim(),
  ]) as [string, string][];
  const byNorm = new Map(entries);
  for (const a of aliases) {
    const val = byNorm.get(stripHeaderToKey(a));
    if (val !== undefined) return val;
  }
  return '';
}

function normType(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === 'supplier' || t === 'contractor' || t === 'both') return t;
  if (t.includes('both')) return 'both';
  if (t.includes('supplier') && t.includes('contractor')) return 'both';
  if (t === 's' || t === 'sup') return 'supplier';
  if (t === 'c' || t === 'cont') return 'contractor';
  if (t.includes('supplier')) return 'supplier';
  if (t.includes('contractor')) return 'contractor';
  return t;
}

function normPhone(s: string): string {
  return s.replace(/\D/g, '');
}

function toSnapshot(
  p: {
    name: string;
    type: string;
    address: string;
    contact_person_name: string;
    phone: string;
    email: string;
    gst_no: string;
  }
): VendorKeySnapshot {
  return {
    name: p.name.trim().toLowerCase(),
    type: normType(p.type),
    address: p.address.trim().toLowerCase(),
    contact_person_name: p.contact_person_name.trim().toLowerCase(),
    phone: normPhone(p.phone),
    email: p.email.trim().toLowerCase(),
    gst_no: p.gst_no.trim().toLowerCase(),
  };
}

export function vendorSnapshotsEqual(a: VendorKeySnapshot, b: VendorKeySnapshot): boolean {
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.address === b.address &&
    a.contact_person_name === b.contact_person_name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.gst_no === b.gst_no
  );
}

export function rowObjectToImportFields(obj: Record<string, unknown>): {
  name: string;
  type: string;
  address: string;
  contact_person_name: string;
  phone: string;
  email: string;
  gst_no: string;
} {
  return {
    name: pickField(obj, 'name', 'vendor name', 'Name'),
    type: pickField(obj, 'type', 'Type', 'TYPE'),
    address: pickField(obj, 'address', 'Address'),
    contact_person_name: pickField(
      obj,
      'contact person name',
      'Contact Person Name',
      'contact_person_name',
      'contact person'
    ),
    phone: pickField(obj, 'contact person phone', 'Contact Person Phone', 'phone', 'mobile', 'Phone'),
    email: pickField(obj, 'contact person email', 'Contact Person Email', 'email', 'Email'),
    gst_no: pickField(obj, 'gst no', 'Gst No', 'gst', 'gst_no', 'GST No'),
  };
}

function parseWorkbookToRowObjects(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ab = e.target?.result;
        if (!ab) {
          resolve([]);
          return;
        }
        const wb = XLSX.read(ab, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          resolve([]);
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        resolve(Array.isArray(rows) ? rows : []);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function extractUuidFromVendorPayload(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  if (typeof v !== 'object') return null;
  const u = v.uuid ?? v.data?.uuid ?? (Array.isArray(v.data) && v.data[0]?.uuid ? v.data[0].uuid : null);
  if (u != null && String(u).trim() !== '') return String(u);
  if (v.data && typeof v.data === 'object' && !Array.isArray(v.data) && v.data.uuid) {
    return String(v.data.uuid);
  }
  return null;
}

/** `uuid` null = created this import without uuid in response; same snapshot later = duplicate row, skip. */
type RegistryEntry = { snapshot: VendorKeySnapshot; uuid: string | null };

type ImportApi = {
  getVendors: () => Promise<any[]>;
  createVendor: (data: Record<string, unknown>) => Promise<any>;
  updateVendor: (uuid: string, data: Record<string, unknown>) => Promise<any>;
};

type MatchResult =
  | { kind: 'update'; uuid: string }
  | { kind: 'skip_duplicate' }
  | { kind: 'create' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * Row-by-row import: update only when **all** compared fields match an existing vendor
 * (or a row already created/updated in this run). If only the name matches, creates a new vendor.
 */
export async function runVendorImportWithFullRowMatch(
  file: File,
  api: ImportApi
): Promise<VendorImportStats> {
  const rowObjects = await parseWorkbookToRowObjects(file);
  const total_rows = rowObjects.length;

  const existing = await api.getVendors();
  const list = Array.isArray(existing) ? existing : [];

  const registry: RegistryEntry[] = list.flatMap((v) => {
    const fields = {
      name: String(v.name ?? '').trim(),
      type: String(v.type ?? '').trim(),
      address: String(v.address ?? '').trim(),
      contact_person_name: String(v.contact_person_name ?? v.contactPersonName ?? '').trim(),
      phone: String(v.phone ?? '').trim(),
      email: String(v.email ?? '').trim(),
      gst_no: String(v.gst_no ?? v.gstNo ?? '').trim(),
    };
    const uuid = String(v.uuid ?? '').trim();
    if (!uuid) return [];
    return [{ snapshot: toSnapshot(fields), uuid }];
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const resolveRow = (snap: VendorKeySnapshot): MatchResult => {
    for (const r of registry) {
      if (!vendorSnapshotsEqual(r.snapshot, snap)) continue;
      if (r.uuid) return { kind: 'update', uuid: r.uuid };
      return { kind: 'skip_duplicate' };
    }
    return { kind: 'create' };
  };

  for (let i = 0; i < rowObjects.length; i++) {
    const ro = rowObjects[i];
    const line = i + 2;
    const f = rowObjectToImportFields(ro);
    if (!f.name.trim() && !f.type.trim()) {
      skipped++;
      continue;
    }
    if (!f.name.trim() || !f.type.trim()) {
      errors.push(`Row ${line}: Name and Type are required.`);
      skipped++;
      continue;
    }
    if (!['supplier', 'contractor', 'both'].includes(normType(f.type))) {
      errors.push(
        'Row ' +
          String(line) +
          ': Type must be supplier, contractor, or both (got ' +
          JSON.stringify(f.type) +
          ').'
      );
      skipped++;
      continue;
    }
    if (f.email && !EMAIL_RE.test(f.email)) {
      errors.push(`Row ${line}: Invalid email.`);
      skipped++;
      continue;
    }

    const snap = toSnapshot(f);
    const action = resolveRow(snap);

    const basePayload: Record<string, unknown> = {
      name: f.name.trim(),
      address: f.address.trim(),
      type: normType(f.type),
      contact_person_name: f.contact_person_name.trim(),
      country_code: '91',
      phone: f.phone.replace(/\D/g, '') || f.phone.trim(),
      email: f.email.trim().toLowerCase(),
    };
    if (f.gst_no.trim()) basePayload.gst_no = f.gst_no.trim();

    if (action.kind === 'skip_duplicate') {
      skipped++;
      continue;
    }
    if (action.kind === 'update') {
      try {
        basePayload.is_active = 1;
        await api.updateVendor(action.uuid, basePayload);
        updated++;
      } catch (e: any) {
        errors.push(`Row ${line}: update failed - ${e?.message || 'Unknown error'}`);
        skipped++;
      }
      continue;
    }

    try {
      const createPayload = { is_active: 1, ...basePayload };
      const res = await api.createVendor(createPayload);
      const raw = (res as any)?.data ?? (res as any)?.vendor ?? res;
      const newUuid = extractUuidFromVendorPayload(raw) || extractUuidFromVendorPayload({ data: raw });
      registry.push({ snapshot: snap, uuid: newUuid && String(newUuid).trim() ? String(newUuid) : null });
      created++;
    } catch (e: any) {
      errors.push(`Row ${line}: create failed - ${e?.message || 'Unknown error'}`);
      skipped++;
    }
  }

  const message =
    `Processed ${total_rows} row(s): ${created} created, ${updated} updated` +
    (skipped ? `, ${skipped} skipped` : '') +
    (errors.length ? `, ${errors.length} error(s).` : '.');

  return {
    total_rows,
    created,
    updated,
    skipped,
    errors,
    message,
  };
}
