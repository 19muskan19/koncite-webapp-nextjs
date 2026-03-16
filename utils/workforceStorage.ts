/**
 * Workforce - LocalStorage StorageService (SiteForce-style)
 * Keys: siteforce_workers, siteforce_attendance, siteforce_contractor, siteforce_rates, siteforce_payments
 */

export interface WorkerProfile {
  id: string;
  name: string;
  type: 'staff' | 'labor';
  role: string;
  photoUrl: string;
  projectName: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  latitude?: number;
  longitude?: number;
  photoUrl: string;
  verifiedByAi?: string;
}

export interface ContractorEntry {
  id: string;
  projectName: string;
  contractorName: string;
  contractorId?: string;
  category: string;
  headCount: number;
  unitsWorked: number;
  otHoursPerPerson: number;
  amount: number;
  date: string;
  dateKey: string;
  paid: boolean;
  createdAt: string;
}

export interface RateConfig {
  id: string;
  project: string;
  contractor: string;
  contractorId?: string;
  category: string;
  unit: 'Day' | 'Hr';
  hoursPerDay?: number;
  baseRate: number;
  otUnit: 'Day' | 'Hr';
  otRate: number;
  effectiveDate: string;
  createdAt: string;
}

export interface ContractorPayment {
  id: string;
  contractorName: string;
  contractorId?: string;
  projectName: string;
  amount: number;
  mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  reference?: string;
  entryIds: string[];
  date: string;
  createdAt: string;
}

const WORKERS_KEY = 'siteforce_workers';
const ATTENDANCE_KEY = 'siteforce_attendance';
const CONTRACTOR_KEY = 'siteforce_contractor';
const RATES_KEY = 'siteforce_rates';
const PAYMENTS_KEY = 'siteforce_payments';
const PROJECTS_KEY = 'siteforce_projects';
const VENDORS_KEY = 'siteforce_vendors';

export interface LocalProject {
  id: string;
  name: string;
}

export interface LocalVendor {
  id: string;
  name: string;
}

function getTodayString(): string {
  return new Date().toDateString();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeParse<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return defaultVal;
  }
}

function safeSet(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// Workers
export function getWorkers(): WorkerProfile[] {
  const data = safeParse<WorkerProfile[]>(WORKERS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function saveWorker(worker: Omit<WorkerProfile, 'id' | 'createdAt'>): WorkerProfile {
  const workers = getWorkers();
  const id = generateId();
  const createdAt = new Date().toISOString();
  const newWorker: WorkerProfile = { ...worker, id, createdAt };
  workers.push(newWorker);
  safeSet(WORKERS_KEY, workers);
  return newWorker;
}

// Attendance
export function getAttendanceRecords(): AttendanceRecord[] {
  const data = safeParse<AttendanceRecord[]>(ATTENDANCE_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function saveAttendanceRecord(record: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
  const records = getAttendanceRecords();
  const id = generateId();
  const newRecord: AttendanceRecord = { ...record, id };
  records.push(newRecord);
  safeSet(ATTENDANCE_KEY, records);
  return newRecord;
}

export function getWorkerStatusToday(workerId: string): 'IN' | 'OUT' | null {
  const today = getTodayString();
  const records = getAttendanceRecords();
  const todayRecords = records.filter(
    (r) => r.workerId === workerId && new Date(r.timestamp).toDateString() === today
  );
  const lastIn = todayRecords.filter((r) => r.type === 'IN').pop();
  const lastOut = todayRecords.filter((r) => r.type === 'OUT').pop();
  if (lastIn && (!lastOut || new Date(lastOut.timestamp) < new Date(lastIn.timestamp))) {
    return 'IN';
  }
  if (lastOut && (!lastIn || new Date(lastIn.timestamp) < new Date(lastOut.timestamp))) {
    return 'OUT';
  }
  return null;
}

// Contractor entries
export function getContractorEntries(): ContractorEntry[] {
  const data = safeParse<ContractorEntry[]>(CONTRACTOR_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function saveContractorEntry(
  entry: Omit<ContractorEntry, 'id' | 'amount' | 'dateKey' | 'paid' | 'createdAt'>
): ContractorEntry {
  const entries = getContractorEntries();
  const id = generateId();
  const dateKey = new Date(entry.date).toDateString();
  const amount = calculateEntryAmount(entry);
  const newEntry: ContractorEntry = {
    ...entry,
    id,
    amount,
    dateKey,
    paid: false,
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  safeSet(CONTRACTOR_KEY, entries);
  return newEntry;
}

export function deleteContractorEntry(id: string): void {
  const entries = getContractorEntries().filter((e) => e.id !== id);
  safeSet(CONTRACTOR_KEY, entries);
}

export function markEntriesAsPaid(entryIds: string[]): void {
  const entries = getContractorEntries();
  const set = new Set(entryIds);
  entries.forEach((e) => {
    if (set.has(e.id)) e.paid = true;
  });
  safeSet(CONTRACTOR_KEY, entries);
}

// Rate resolution: project+contractor+category -> contractor+category (Standard) -> Standard Rates for category
export function getRateForDate(
  project: string,
  contractor: string,
  category: string,
  date: string
): { baseRate: number; otRate: number; unit: 'Day' | 'Hr'; hoursPerDay?: number; otUnit: 'Day' | 'Hr' } {
  const rates = getRates();
  const d = new Date(date);
  const candidates = rates.filter((r) => r.category === category);
  // 1. project + contractor + category
  let match = candidates.find(
    (r) =>
      r.project === project &&
      r.contractor === contractor &&
      new Date(r.effectiveDate) <= d
  );
  if (match) {
    return {
      baseRate: match.baseRate,
      otRate: match.otRate,
      unit: match.unit,
      hoursPerDay: match.hoursPerDay,
      otUnit: match.otUnit,
    };
  }
  // 2. contractor + category (Standard project)
  match = candidates.find(
    (r) =>
      r.project === 'Standard' &&
      r.contractor === contractor &&
      new Date(r.effectiveDate) <= d
  );
  if (match) {
    return {
      baseRate: match.baseRate,
      otRate: match.otRate,
      unit: match.unit,
      hoursPerDay: match.hoursPerDay,
      otUnit: match.otUnit,
    };
  }
  // 3. Standard Rates for category (project=Standard, contractor=Standard)
  match = candidates
    .filter((r) => r.project === 'Standard' && r.contractor === 'Standard')
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];
  if (match && new Date(match.effectiveDate) <= d) {
    return {
      baseRate: match.baseRate,
      otRate: match.otRate,
      unit: match.unit,
      hoursPerDay: match.hoursPerDay,
      otUnit: match.otUnit,
    };
  }
  // Default
  const defaults: Record<string, { base: number; ot: number }> = {
    Mason: { base: 800, ot: 100 },
    Carpenter: { base: 800, ot: 100 },
    Fitter: { base: 800, ot: 100 },
    Helper: { base: 500, ot: 75 },
    Electrician: { base: 800, ot: 100 },
    Plumber: { base: 800, ot: 100 },
    Other: { base: 600, ot: 80 },
  };
  const d2 = defaults[category] ?? defaults.Other;
  return { baseRate: d2.base, otRate: d2.ot, unit: 'Day', hoursPerDay: 8, otUnit: 'Hr' };
}

function calculateEntryAmount(entry: {
  headCount: number;
  unitsWorked: number;
  otHoursPerPerson: number;
  projectName: string;
  contractorName: string;
  category: string;
  date: string;
}): number {
  const rate = getRateForDate(
    entry.projectName,
    entry.contractorName,
    entry.category,
    entry.date
  );
  const base = entry.headCount * entry.unitsWorked * rate.baseRate;
  let ot = 0;
  if (rate.otUnit === 'Hr') {
    ot = entry.headCount * entry.otHoursPerPerson * rate.otRate;
  } else {
    const hrs = rate.hoursPerDay ?? 8;
    ot = entry.headCount * (entry.otHoursPerPerson / hrs) * rate.otRate;
  }
  return Math.round((base + ot) * 100) / 100;
}

// Rates
export function getRates(): RateConfig[] {
  const data = safeParse<RateConfig[]>(RATES_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function saveRate(
  rate: Omit<RateConfig, 'id' | 'createdAt'>
): RateConfig {
  const rates = getRates();
  const id = generateId();
  const createdAt = new Date().toISOString();
  const newRate: RateConfig = { ...rate, id, createdAt };
  rates.push(newRate);
  safeSet(RATES_KEY, rates);
  return newRate;
}

// Payments
export function getPayments(): ContractorPayment[] {
  const data = safeParse<ContractorPayment[]>(PAYMENTS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function savePayment(
  payment: Omit<ContractorPayment, 'id' | 'createdAt'>
): ContractorPayment {
  const payments = getPayments();
  const id = generateId();
  const createdAt = new Date().toISOString();
  const newPayment: ContractorPayment = { ...payment, id, createdAt };
  payments.push(newPayment);
  safeSet(PAYMENTS_KEY, payments);
  markEntriesAsPaid(payment.entryIds);
  return newPayment;
}

export function getTotalOutstanding(project?: string): number {
  const entries = getContractorEntries().filter((e) => !e.paid);
  const filtered = project
    ? entries.filter((e) => e.projectName === project)
    : entries;
  return filtered.reduce((sum, e) => sum + e.amount, 0);
}

// Projects (local)
export function getProjects(): Array<{ id: string; name: string }> {
  const data = safeParse<Array<{ id: string; name: string }>>(PROJECTS_KEY, []);
  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) {
    const fromEntries = [...new Set(getContractorEntries().map((e) => e.projectName).filter(Boolean))];
    const fromWorkers = [...new Set(getWorkers().map((w) => w.projectName).filter(Boolean))];
    const names = [...new Set([...fromEntries, ...fromWorkers])].sort();
    if (names.length > 0) {
      const seed = names.map((name) => ({ id: generateId(), name }));
      safeSet(PROJECTS_KEY, seed);
      return seed;
    }
  }
  return list;
}

export function saveProject(project: { name: string } | string): { id: string; name: string } {
  const name = typeof project === 'string' ? project : project.name;
  const projects = getProjects();
  const trimmed = name.trim();
  const exists = projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return exists;
  const proj = { id: generateId(), name: trimmed };
  projects.push(proj);
  safeSet(PROJECTS_KEY, projects);
  return proj;
}

// Vendors / Contractors (local)
export function getVendors(): Array<{ id: string; name: string }> {
  const data = safeParse<Array<{ id: string; name: string }>>(VENDORS_KEY, []);
  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) {
    const fromEntries = [...new Set(getContractorEntries().map((e) => e.contractorName).filter(Boolean))];
    const names = [...new Set(fromEntries)].sort();
    if (names.length > 0) {
      const seed = names.map((name) => ({ id: generateId(), name }));
      safeSet(VENDORS_KEY, seed);
      return seed;
    }
  }
  return list;
}

export function saveVendor(vendor: { name: string } | string): { id: string; name: string } {
  const name = typeof vendor === 'string' ? vendor : vendor.name;
  const vendors = getVendors();
  const trimmed = name.trim();
  const exists = vendors.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return exists;
  const v = { id: generateId(), name: trimmed };
  vendors.push(v);
  safeSet(VENDORS_KEY, vendors);
  return v;
}
