'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeType } from '@/types';
import Link from 'next/link';
import { 
  Clock, 
  Users, 
  Camera, 
  MapPin, 
  Loader2, 
  Plus, 
  Search,
  UserPlus,
  RefreshCw,
  X,
  Check,
  UsersRound,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  HardHat,
  Settings,
  Trash2,
  SwitchCamera,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  getWorkers,
  saveWorker,
  getAttendanceRecords,
  saveAttendanceRecord,
  getWorkerStatusToday,
  getContractorEntries,
  saveContractorEntry,
  deleteContractorEntry,
  markEntriesAsPaid,
  getRates,
  getRateForDate,
  saveRate,
  getPayments,
  savePayment,
  getTotalOutstanding,
  getProjects,
  getVendors,
  type WorkerProfile,
  type ContractorEntry,
  type RateConfig,
  type ContractorPayment,
} from '@/utils/workforceStorage';
import CameraCapture from './CameraCapture';
import WorkforceDashboardTab from './WorkforceDashboardTab';
import CreateVendorModal from '@/components/masters/Modals/CreateVendorModal';
import CreateLabourModal from '@/components/masters/Modals/CreateLabourModal';
import {
  masterDataAPI,
  workforceAPI,
  faceAttendanceAPI,
  attendanceReportAPI,
  workforceProfilesAPI,
  contractorLaborRatesAPI,
  labourEntriesAPI,
  labourPaymentsAPI,
} from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { EMAIL_INVALID_MESSAGE, isValidEmailAddress } from '@/utils/emailValidation';
import { useUser } from '@/contexts/UserContext';

type TabType = 'dashboard' | 'punch' | 'staff' | 'contractor' | 'pay';

/** Labour row from Masters (for contractor rate picker) */
interface RateLabourPick {
  id: string;
  numericId: number | string;
  uuid?: string;
  name: string;
  code: string;
  category: 'skilled' | 'semiskilled' | 'unskilled';
}

function normalizeLabourCategory(raw: unknown): 'skilled' | 'semiskilled' | 'unskilled' {
  const cat = String(raw || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (cat === 'semiskilled') return 'semiskilled';
  if (cat === 'unskilled') return 'unskilled';
  return 'skilled';
}

function transformRatesLabourList(fetched: unknown): RateLabourPick[] {
  const rows = Array.isArray(fetched) ? fetched : [];
  const out: RateLabourPick[] = [];
  for (const labour of rows as any[]) {
    const numericId = labour.id;
    const uuid = labour.uuid;
    const category = normalizeLabourCategory(labour.category);
    const code = String(labour.code || labour.labour_code || '');
    const isActiveValue = labour.is_active;
    const isActive =
      isActiveValue === 1 ||
      isActiveValue === '1' ||
      isActiveValue === true ||
      isActiveValue === 'true' ||
      isActiveValue === undefined ||
      isActiveValue === null;
    if (!isActive) continue;
    const key = numericId != null && numericId !== '' ? numericId : uuid;
    if (key == null || key === '') continue;
    const name = String(labour.name || '').trim();
    if (!name) continue;
    out.push({
      id: uuid || String(numericId ?? ''),
      numericId: key,
      uuid,
      name,
      code,
      category,
    });
  }
  return out;
}

function formOptionLaboursToPicks(fetched: unknown): RateLabourPick[] {
  const rows = Array.isArray(fetched) ? fetched : [];
  return transformRatesLabourList(rows);
}

interface Vendor {
  id: number | string;
  name: string;
  uuid?: string;
}

/** Normalized row from GET /face/status-today */
interface FaceStatusRow {
  subjectType: 'company_user' | 'workforce_profile';
  subjectId: number;
  name: string;
  designation?: string;
  enrolled?: boolean;
  isIn: boolean;
  lastPunchType?: string;
  lastPunchAt?: string;
}

/** Normalized row from GET /face/attendees */
interface FaceAttendeeRow {
  subjectType: 'company_user' | 'workforce_profile';
  subjectId: number;
  name: string;
  email?: string;
  designation?: string;
  enrolled: boolean;
  raw?: Record<string, unknown>;
}

function unwrapArrayPayload(payload: unknown): any[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown>;
  const tryKeys = (obj: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      const v = obj[k];
      if (Array.isArray(v)) return v as any[];
    }
    return null;
  };
  if (Array.isArray(p.data)) return p.data as any[];
  if (Array.isArray(p.items)) return p.items as any[];
  if (Array.isArray(p.list)) return p.list as any[];
  const nestedListKeys = [
    'records',
    'rows',
    'items',
    'rates',
    'entries',
    'labour_entries',
    'unpaid_entries',
    'labour_payments',
    'payments',
    'contractor_labor_rates',
    'contractor_labor_rates_list',
    'labour_entries_list',
  ];
  const topHit = tryKeys(p, nestedListKeys);
  if (topHit) return topHit;
  if (p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    const d = p.data as Record<string, unknown>;
    const inData = tryKeys(d, nestedListKeys);
    if (inData) return inData;
    if (Array.isArray(d.records)) return d.records as any[];
    if (Array.isArray(d.rows)) return d.rows as any[];
    /** Some APIs nest again: { data: { data: [...] } } */
    if (d.data != null) return unwrapArrayPayload(d.data);
  }
  return [];
}

/**designation / title / company_role from face or user payloads */
function extractPersonDesignation(r: Record<string, any> | null | undefined): string | undefined {
  if (!r || typeof r !== 'object') return undefined;
  for (const k of ['designation', 'job_title', 'title', 'role_name', 'position', 'subject_designation']) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const role = r.company_role;
  if (role && typeof role === 'object' && !Array.isArray(role)) {
    const n = role.name;
    if (typeof n === 'string' && n.trim()) return n.trim();
  }
  for (const nestedKey of ['company_user', 'user', 'worker', 'profile']) {
    const nested = r[nestedKey];
    if (nested && typeof nested === 'object') {
      const d = extractPersonDesignation(nested);
      if (d) return d;
    }
  }
  return undefined;
}

/**
 * Face enrollment for attendance (Azure person + samples). Do not use `has_face`: APIs often set it for
 * profile photos or unrelated flags, which incorrectly marked users as “Enrolled”.
 */
function rawRowIsFaceEnrolledForAttendance(r: Record<string, unknown> | null | undefined): boolean {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, any>;
  const truthy = (v: unknown) =>
    v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
  if (truthy(x.is_enrolled)) return true;
  if (truthy(x.enrolled)) return true;
  if (truthy(x.face_enrolled)) return true;
  const fc = x.face_count ?? x.faceCount;
  if (fc != null && fc !== '' && Number.isFinite(Number(fc))) {
    return Number(fc) > 0;
  }
  return false;
}

function normalizeAttendeeListSource(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function rawRowIsWorkforceProfileMember(row: Record<string, any>): boolean {
  const st = String(row.subject_type ?? row.subjectType ?? '').toLowerCase();
  if (st === 'workforce_profile') return true;
  const ls = normalizeAttendeeListSource(row.list_source);
  return ls === 'workforce_profiles' || ls === 'workforce_profile';
}

function rawRowIsStaffAttendeeMember(row: Record<string, any>): boolean {
  if (rawRowIsWorkforceProfileMember(row)) return false;
  const st = String(row.subject_type ?? row.subjectType ?? '').toLowerCase();
  const ls = normalizeAttendeeListSource(row.list_source);
  if (ls === 'company_users' || ls === 'company_user') return true;
  return st === 'company_user' || st === '';
}

/**
 * Rows for Staff vs Own Labour from GET /face/attendees.
 * Prefers `data.company_users` / `data.workforce_profiles`; if empty, filters `data.all` by list_source / subject_type.
 */
function extractFaceAttendeeRawRowsForTab(payload: unknown, tab: 'staff' | 'own_labor'): any[] {
  const p = payload as Record<string, unknown> | null | undefined;
  const dataRoot = (p?.data ?? p) as Record<string, unknown> | undefined;
  const inner =
    dataRoot &&
    typeof dataRoot === 'object' &&
    !Array.isArray(dataRoot) &&
    dataRoot.data != null &&
    typeof dataRoot.data === 'object' &&
    !Array.isArray(dataRoot.data)
      ? (dataRoot.data as Record<string, unknown>)
      : dataRoot;

  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const cu = inner.company_users;
    const wf = inner.workforce_profiles;
    const combined = inner.all;

    if (tab === 'staff') {
      if (Array.isArray(cu) && cu.length > 0) return cu;
      if (Array.isArray(combined) && combined.length > 0) {
        return combined.filter((r) => r && typeof r === 'object' && rawRowIsStaffAttendeeMember(r as Record<string, any>));
      }
      return [];
    }
    if (Array.isArray(wf) && wf.length > 0) return wf;
    if (Array.isArray(combined) && combined.length > 0) {
      return combined.filter((r) => r && typeof r === 'object' && rawRowIsWorkforceProfileMember(r as Record<string, any>));
    }
    return [];
  }

  const flat = unwrapArrayPayload(payload);
  if (flat.length > 0) {
    return tab === 'staff'
      ? flat.filter((r) => r && typeof r === 'object' && rawRowIsStaffAttendeeMember(r as Record<string, any>))
      : flat.filter((r) => r && typeof r === 'object' && rawRowIsWorkforceProfileMember(r as Record<string, any>));
  }
  return [];
}

function rawFaceAttendeeToRow(r: any): FaceAttendeeRow {
  const stRaw = String(r.subject_type ?? r.subjectType ?? 'company_user').toLowerCase();
  const subjectType: 'company_user' | 'workforce_profile' =
    stRaw === 'workforce_profile' ? 'workforce_profile' : 'company_user';
  const subjectId = Number(r.subject_id ?? r.subjectId ?? r.id ?? 0);
  const name = String(r.subject_name ?? r.name ?? r.employee_name ?? '').trim();
  const enrolled = rawRowIsFaceEnrolledForAttendance(r);
  return {
    subjectType,
    subjectId,
    name,
    email: r.email ? String(r.email) : undefined,
    designation: extractPersonDesignation(r),
    enrolled,
    raw: r,
  };
}

function toFaceAttendeeRowsForTab(payload: unknown, tab: 'staff' | 'own_labor'): FaceAttendeeRow[] {
  return extractFaceAttendeeRawRowsForTab(payload, tab)
    .map(rawFaceAttendeeToRow)
    .filter((row) => row.name || row.subjectId > 0);
}

function mergeFaceAttendeeListsBySubject(staff: FaceAttendeeRow[], ownLabor: FaceAttendeeRow[]): FaceAttendeeRow[] {
  const map = new Map<string, FaceAttendeeRow>();
  for (const r of [...staff, ...ownLabor]) {
    const k = `${r.subjectType}:${r.subjectId}`;
    if (!map.has(k)) map.set(k, r);
  }
  return Array.from(map.values());
}

function applyFaceAttendeesApiPayload(payload: unknown): { staff: FaceAttendeeRow[]; ownLabor: FaceAttendeeRow[] } {
  return {
    staff: toFaceAttendeeRowsForTab(payload, 'staff'),
    ownLabor: toFaceAttendeeRowsForTab(payload, 'own_labor'),
  };
}

async function punchPhotoThumbDataUrl(photo: Blob): Promise<string> {
  let photoThumb = '';
  try {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(photo);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 80, 80);
          photoThumb = canvas.toDataURL('image/jpeg', 0.6);
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject();
      };
      img.src = url;
    });
  } catch {
    /* keep empty thumb */
  }
  return photoThumb;
}

function captureVideoFrameToJpegBlob(video: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!video || !video.videoWidth) {
      resolve(null);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((b) => resolve(b ?? null), 'image/jpeg', 0.9);
  });
}

/** Server returned 422 — user is already punched in; sync UI without treating as a hard failure. */
function isAlreadyPunchedIn422(e: unknown): boolean {
  const err = e as { status?: number; message?: string };
  if (err?.status !== 422) return false;
  return /already\s+punched\s+in|punch\s+out\s+first/i.test(String(err.message || ''));
}

/** e.g. {"message":"GPS accuracy is too poor (max 50m)."} — retry without geo_accuracy if backend allows. */
function isGpsAccuracyTooPoor422(e: unknown): boolean {
  const err = e as { status?: number; message?: string };
  if (err?.status !== 422) return false;
  const m = String(err.message || '').toLowerCase();
  return /accuracy.*(too\s*poor|poor)|gps.*accuracy|max\s*50\s*m/.test(m);
}

type FacePunchLogEntry = {
  uuid?: string;
  employee_name: string;
  punch_type: string;
  punch_at: string;
  location?: string;
  photoThumb?: string;
  subjectType?: 'company_user' | 'workforce_profile';
  subjectId?: number;
  designation?: string;
};

function punchLogSubjectKey(e: FacePunchLogEntry): string {
  if (e.subjectType && e.subjectId != null && Number.isFinite(e.subjectId) && e.subjectId > 0) {
    return `${e.subjectType}:${e.subjectId}`;
  }
  const n = e.employee_name.trim().toLowerCase();
  return n ? `name:${n}` : `row:${e.punch_at}:${e.location ?? ''}`;
}

/** Normalize for deduping API rows ("Punch IN") vs session rows ("punch_in"). */
function punchTypeBucket(punchType: string): 'in' | 'out' | 'other' {
  const s = String(punchType).toLowerCase();
  if (s.includes('out')) return 'out';
  if (s.includes('in')) return 'in';
  return 'other';
}

/** Dedupe server + session rows (same person, type, and second). */
function punchEventDedupeKey(e: FacePunchLogEntry): string {
  const t = Number.isFinite(Date.parse(e.punch_at)) ? Math.floor(Date.parse(e.punch_at) / 1000) : 0;
  const sub = e.subjectId != null && e.subjectId > 0 ? `id:${e.subjectId}` : `n:${e.employee_name.trim().toLowerCase()}`;
  return `${sub}|${punchTypeBucket(e.punch_type)}|${t}`;
}

/**
 * Map GET /face/status-today payload: separate data.punch_in and data.punch_out arrays
 * (username, user_type, subject_id, punch_time, punch_location { latitude, longitude, geo_accuracy }).
 */
function parseStatusTodayPunchRows(payload: unknown): {
  punchIn: FacePunchLogEntry[];
  punchOut: FacePunchLogEntry[];
  date: string | null;
} {
  if (payload == null) return { punchIn: [], punchOut: [], date: null };
  const top = payload as Record<string, unknown>;
  const data = (top?.data as Record<string, unknown> | undefined) ?? top;
  const dateRaw = data?.date;
  const date = typeof dateRaw === 'string' ? dateRaw.slice(0, 10) : null;

  const mapOne = (row: Record<string, unknown>, kind: 'punch_in' | 'punch_out'): FacePunchLogEntry | null => {
    const punchTime = row.punch_time ?? row.punch_at;
    if (punchTime == null || String(punchTime).trim() === '') return null;
    const loc = row.punch_location;
    let location: string | undefined;
    if (loc && typeof loc === 'object' && !Array.isArray(loc)) {
      const l = loc as Record<string, unknown>;
      const lat = l.latitude;
      const lng = l.longitude;
      const acc = l.geo_accuracy ?? l.accuracy;
      if (lat != null && lng != null) {
        location = `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
        if (acc != null && acc !== '') location += ` (±${acc}m)`;
      }
    }
    const ut = String(row.user_type ?? 'company_user').toLowerCase();
    const subjectType: 'company_user' | 'workforce_profile' =
      ut === 'workforce_profile' ? 'workforce_profile' : 'company_user';
    const sid = Number(row.subject_id ?? row.subjectId ?? 0);
    return {
      employee_name: String(row.username ?? row.name ?? '—').trim() || '—',
      punch_type: kind === 'punch_in' ? 'Punch IN' : 'Punch OUT',
      punch_at: String(punchTime),
      location,
      subjectType,
      subjectId: Number.isFinite(sid) && sid > 0 ? sid : undefined,
    };
  };

  const punchIn: FacePunchLogEntry[] = [];
  const punchOut: FacePunchLogEntry[] = [];
  const ins = data?.punch_in;
  const outs = data?.punch_out;
  if (Array.isArray(ins)) {
    for (const r of ins) {
      if (r && typeof r === 'object') {
        const e = mapOne(r as Record<string, unknown>, 'punch_in');
        if (e) punchIn.push(e);
      }
    }
  }
  if (Array.isArray(outs)) {
    for (const r of outs) {
      if (r && typeof r === 'object') {
        const e = mapOne(r as Record<string, unknown>, 'punch_out');
        if (e) punchOut.push(e);
      }
    }
  }
  const sortDesc = (a: FacePunchLogEntry, b: FacePunchLogEntry) =>
    new Date(b.punch_at).getTime() - new Date(a.punch_at).getTime();
  punchIn.sort(sortDesc);
  punchOut.sort(sortDesc);
  return { punchIn, punchOut, date };
}

/** Merge status-today rows for one bucket with this-session facePunchLog lines of the same type. */
function mergePunchRowsForBucket(
  serverRows: FacePunchLogEntry[],
  sessionRows: FacePunchLogEntry[],
  bucket: 'in' | 'out'
): FacePunchLogEntry[] {
  const sessionFiltered = sessionRows.filter((r) => punchTypeBucket(r.punch_type) === bucket);
  const byKey = new Map<string, FacePunchLogEntry>();
  for (const r of serverRows) {
    byKey.set(punchEventDedupeKey(r), r);
  }
  for (const r of sessionFiltered) {
    const k = punchEventDedupeKey(r);
    const existing = byKey.get(k);
    if (!existing) byKey.set(k, r);
    else if (!existing.photoThumb && r.photoThumb) byKey.set(k, r);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.punch_at).getTime() - new Date(a.punch_at).getTime()
  );
}

/** One row per person in this session; latest successful punch wins. */
function replacePunchLogEntryForSubject(prev: FacePunchLogEntry[], entry: FacePunchLogEntry): FacePunchLogEntry[] {
  const k = punchLogSubjectKey(entry);
  return [...prev.filter((p) => punchLogSubjectKey(p) !== k), entry];
}

/** Do not stack duplicate “already in” rows for the same person in one session. */
function appendPunchLogEntryIfNewSubject(prev: FacePunchLogEntry[], entry: FacePunchLogEntry): FacePunchLogEntry[] {
  const k = punchLogSubjectKey(entry);
  if (prev.some((p) => punchLogSubjectKey(p) === k)) return prev;
  return [...prev, entry];
}

function faceStatusRowFromPunchResponse(
  res: Record<string, unknown> | null | undefined,
  contextRow: FaceStatusRow | null,
  user: { id?: number; name?: string } | null,
  attendees: FaceAttendeeRow[]
): FaceStatusRow | null {
  const r = res ?? {};
  const name = String(r.employee_name ?? r.name ?? contextRow?.name ?? user?.name ?? '').trim();
  if (!name) return null;

  const stRaw = String(r.subject_type ?? r.subjectType ?? contextRow?.subjectType ?? 'company_user').toLowerCase();
  const subjectType: 'company_user' | 'workforce_profile' =
    stRaw === 'workforce_profile' ? 'workforce_profile' : 'company_user';

  let subjectId = Number(r.subject_id ?? r.subjectId ?? contextRow?.subjectId ?? 0);
  if (!Number.isFinite(subjectId) || subjectId <= 0) subjectId = Number(user?.id ?? 0);
  if (!Number.isFinite(subjectId) || subjectId <= 0) {
    const hit = attendees.find((a) => a.name.trim().toLowerCase() === name.toLowerCase());
    if (hit) subjectId = hit.subjectId;
  }
  if (!Number.isFinite(subjectId) || subjectId <= 0) return null;

  return {
    subjectType,
    subjectId,
    name,
    designation: contextRow?.designation ?? (typeof r.designation === 'string' ? r.designation : undefined),
    isIn: true,
    enrolled: true,
  };
}

/**
 * Browser `coords.accuracy` is horizontal uncertainty in meters (higher = worse). Indoors / Wi‑Fi fixes
 * often report 100–300m even when lat/lng are on the site center. Backend geo rules commonly reject
 * `geo_accuracy` above ~50–80m (“GPS accuracy too low”) regardless of fence distance.
 *
 * We still use the **real** lat/lng from the device; only the **sent** `geo_accuracy` is capped so
 * honest coordinates are not rejected solely due to coarse browser metadata. Tune cap if your API
 * documents a different maximum.
 */
const PUNCH_GEO_SAMPLE_MS = 18000;
const PUNCH_GEO_GOOD_ENOUGH_M = 100;
const PUNCH_GEO_MIN_SAMPLE_MS = 2000;
/** Must match backend rule (e.g. "max 50m"); values above this caused 422 even with correct lat/lng. */
const PUNCH_GEO_ACCURACY_SEND_CAP_M = 50;

function clampGeoAccuracyForPunchRequest(accuracyMeters: number | null | undefined): number | undefined {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return undefined;
  const r = Math.max(1, Math.round(accuracyMeters));
  return Math.min(r, PUNCH_GEO_ACCURACY_SEND_CAP_M);
}

function getFreshGeolocationForPunch(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const toResult = (pos: GeolocationPosition) => ({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      altitude: pos.coords.altitude ?? undefined,
    });

    let best: GeolocationPosition | null = null;
    const started = Date.now();
    let watchId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId != null) clearTimeout(timeoutId);
      watchId = null;
      timeoutId = null;
    };

    const consider = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;
      if (
        !best ||
        (acc != null &&
          Number.isFinite(acc) &&
          acc < (best.coords.accuracy ?? Infinity))
      ) {
        best = pos;
      }
      const elapsed = Date.now() - started;
      const bestAcc = best?.coords.accuracy;
      if (
        bestAcc != null &&
        Number.isFinite(bestAcc) &&
        bestAcc <= PUNCH_GEO_GOOD_ENOUGH_M &&
        elapsed >= PUNCH_GEO_MIN_SAMPLE_MS
      ) {
        cleanup();
        resolve(toResult(best));
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => consider(pos),
      (err) => {
        cleanup();
        if (best) resolve(toResult(best));
        else reject(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: PUNCH_GEO_SAMPLE_MS }
    );

    timeoutId = setTimeout(() => {
      cleanup();
      if (best) resolve(toResult(best));
      else reject(new Error('Location timeout'));
    }, PUNCH_GEO_SAMPLE_MS);
  });
}

/**
 * Device clock at submit (not photo EXIF / server default). Laravel can prefer `now()`, or parse
 * `client_punch_at` + `client_timezone` / `client_utc_offset_minutes` to persist wall-clock time correctly.
 */
function appendPunchClientTimeFields(fd: FormData): void {
  const now = new Date();
  fd.append('client_punch_at', now.toISOString());
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === 'string' && tz.length > 0) fd.append('client_timezone', tz);
  } catch {
    /* ignore */
  }
  fd.append('client_utc_offset_minutes', String(-now.getTimezoneOffset()));
}

/** Designation + role labels (Teams often put “Project Manager” on designation, not company_role.name). */
function userFaceRoleBlob(user: Record<string, unknown> | null): string {
  if (!user) return '';
  const u = user as any;
  return [u.designation, u.company_role?.name, u.role_name, u.role]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())
    .join(' ');
}

function userMayEnrollOthers(user: Record<string, unknown> | null): boolean {
  if (!user) return false;
  const u = user as any;
  if (u.is_manager === true || u.can_manage_attendance === true) return true;
  if (u.is_super_admin === true || u.isSuperAdmin === true) return true;
  const blob = userFaceRoleBlob(user);
  if (/\b(super[\s_-]?admin)\b/i.test(blob)) return true;
  if (/\b(project[\s_-]?manager)\b/i.test(blob)) return true;
  return /\b(admin|manager|owner|director|hr|supervisor)\b/i.test(blob);
}

/** Backend allows re-enroll for elevated roles (POST /face/re-enroll); align with who may manage others’ enrollment. */
function userMayReEnrollFace(user: Record<string, unknown> | null): boolean {
  if (!user) return false;
  const u = user as any;
  if (u.is_super_admin === true || u.isSuperAdmin === true) return true;
  if (u.is_manager === true || u.can_manage_attendance === true) return true;
  const blob = userFaceRoleBlob(user);
  if (/\b(super[\s_-]?admin)\b/i.test(blob)) return true;
  if (/\b(project[\s_-]?manager)\b/i.test(blob)) return true;
  if (/\bmanager\b/i.test(blob)) return true;
  return false;
}

/** Logged-in user is this `company_user` attendee row (first-time enroll or self re-enroll). */
function companyUserRowIsSelf(user: Record<string, unknown> | null, row: FaceAttendeeRow): boolean {
  if (!user || row.subjectType !== 'company_user') return false;
  const u = user as any;
  const candidates = [u?.company_user_id, u?.id, u?.user_id].filter((x: unknown) => x != null);
  return candidates.some((c) => Number(c) === Number(row.subjectId));
}

function canOpenEnrollForRow(
  user: Record<string, unknown> | null,
  row: FaceAttendeeRow,
  managersOk: boolean
): boolean {
  if (row.enrolled) return false;
  if (managersOk) return true;
  return companyUserRowIsSelf(user, row);
}

/** Re-enroll own face when already enrolled (POST /face/re-enroll); others only via manager/super-admin. */
function userMayReEnrollOwnEnrolledRow(user: Record<string, unknown> | null, row: FaceAttendeeRow): boolean {
  return !!row.enrolled && companyUserRowIsSelf(user, row);
}

function canReEnrollAttendanceRow(user: Record<string, unknown> | null, row: FaceAttendeeRow): boolean {
  if (!row.enrolled) return false;
  return userMayReEnrollFace(user) || userMayReEnrollOwnEnrolledRow(user, row);
}

/** True when submit must call POST /face/re-enroll (vs first-time enroll). */
function userMaySubmitReEnroll(
  user: Record<string, unknown> | null,
  row: FaceAttendeeRow,
  reEnrollRoleOk: boolean
): boolean {
  return !!row.enrolled && (reEnrollRoleOk || userMayReEnrollOwnEnrolledRow(user, row));
}

/** Normalize unit strings from API/UI to contract values */
function toApiDayHourUnit(u: string | undefined | null): 'day' | 'hour' {
  const s = String(u || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  if (s === 'hour' || s === 'hr' || s === 'h') return 'hour';
  return 'day';
}

/** Live camera enrollment: canvas data URL → File for multipart images[] */
function dataUrlToJpegFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const header = parts[0];
  const b64 = parts[1];
  if (!b64) throw new Error('Invalid image data');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function extractContractorRateFormOptions(res: unknown): {
  projects: any[];
  labours: any[];
  contractors: any[];
} {
  const r = res as Record<string, unknown>;
  const inner = (r?.data ?? r) as Record<string, unknown>;
  const projects = Array.isArray(inner?.projects)
    ? (inner.projects as any[])
    : Array.isArray((r as any)?.projects)
      ? (r as any).projects
      : [];
  const labours = Array.isArray(inner?.labours)
    ? (inner.labours as any[])
    : Array.isArray((r as any)?.labours)
      ? (r as any).labours
      : [];
  const contractors = Array.isArray(inner?.contractors)
    ? (inner.contractors as any[])
    : Array.isArray((r as any)?.contractors)
      ? (r as any).contractors
      : [];
  return { projects, labours, contractors };
}

interface LabourEntryRow {
  labourId: string;
  labourName: string;
  rateCategory: 'skilled' | 'semiskilled' | 'unskilled';
  /** API: day_labour_count (head count / persons) */
  dayLabourCount: number | '';
  /** Unit for the labour count quantity (days vs hours of work) */
  labourCountUnit: 'day' | 'hour';
  /** API: overtime_hours — interpreted per overtimeQtyUnit */
  overtimeHours: number | '';
  /** Unit for overtime quantity (hours or days) */
  overtimeQtyUnit: 'day' | 'hour';
  contractorLaborRateId?: number | null;
  dailyRate?: number | null;
  dayUnit?: 'day' | 'hour' | null;
  otRate?: number | null;
  otUnit?: 'day' | 'hour' | null;
  currencyCode?: string | null;
  hoursPerDay?: number | null;
  resolveError?: string;
  resolving?: boolean;
}

const defaultLabourRow = (): LabourEntryRow => ({
  labourId: '',
  labourName: '',
  rateCategory: 'skilled',
  dayLabourCount: 0,
  labourCountUnit: 'day',
  overtimeHours: 0,
  overtimeQtyUnit: 'hour',
  contractorLaborRateId: null,
  dailyRate: null,
  dayUnit: null,
  otRate: null,
  otUnit: null,
  currencyCode: null,
  hoursPerDay: null,
  resolveError: undefined,
  resolving: false,
});

function clearLabourRowRateFields(rows: LabourEntryRow[]): LabourEntryRow[] {
  return rows.map((r) => ({
    ...r,
    contractorLaborRateId: null,
    dailyRate: null,
    dayUnit: null,
    otRate: null,
    otUnit: null,
    resolveError: undefined,
    resolving: false,
  }));
}

const getTodayString = () => new Date().toDateString();
const PAGINATION_PAGE_SIZE = 10;

type PaymentFormMode = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';

function mapPaymentModeToApi(mode: PaymentFormMode): import('@/services/api').LabourPaymentManualMethod {
  switch (mode) {
    case 'Cash':
      return 'cash';
    case 'Bank Transfer':
      return 'bank_transfer';
    case 'UPI':
      return 'upi';
    case 'Cheque':
      return 'cheque';
    case 'Other':
    default:
      return 'other';
  }
}

function defaultPaidAtLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` value → API `YYYY-MM-DD HH:mm:ss` */
function localDatetimeToApiPaidAt(local: string): string {
  if (!local || !local.trim()) {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }
  const [datePart, timePart] = local.split('T');
  const t = (timePart || '00:00').slice(0, 5);
  const [hh, mm] = t.split(':');
  return `${datePart} ${hh || '00'}:${mm || '00'}:00`;
}

interface PayApiUnpaidRow {
  uuid: string;
  workDate: string;
  projectName: string;
  contractorName: string;
  category: string;
  headCount: number;
  labourCountUnit: 'day' | 'hour';
  otHours: number;
  overtimeQtyUnit: 'day' | 'hour';
  amount: number;
  vendorsId: number | string | null;
}

function parsePayUnpaidEntry(raw: Record<string, unknown>): PayApiUnpaidRow | null {
  const uuid = raw.uuid != null ? String(raw.uuid) : '';
  if (!uuid) return null;
  const workDate = String(raw.work_date ?? raw.date ?? '').slice(0, 10);
  const projectName = String(
    (raw.project as { project_name?: string; name?: string } | undefined)?.project_name ??
      (raw.project as { name?: string } | undefined)?.name ??
      raw.project_name ??
      '—'
  );
  const contractorName = String(
    (raw.vendor as { name?: string } | undefined)?.name ??
      (raw.contractor as { name?: string } | undefined)?.name ??
      raw.contractor_name ??
      '—'
  );
  const vid = raw.vendors_id ?? raw.vendor_id ?? (raw.vendor as { id?: unknown } | undefined)?.id ?? null;
  const vendorsId = vid != null && vid !== '' ? (typeof vid === 'number' ? vid : String(vid)) : null;

  let amount = Number(
    raw.remaining_amount ?? raw.amount_due ?? raw.outstanding ?? raw.unpaid_amount ?? raw.total_amount ?? 0
  );
  const cats =
    (raw.labour_categories as unknown[]) ?? (raw.labourCategories as unknown[]) ?? (raw.categories as unknown[]) ?? [];
  let category = '—';
  let headCount = 0;
  let labourCountUnit: 'day' | 'hour' = 'day';
  let otHours = 0;
  let overtimeQtyUnit: 'day' | 'hour' = 'hour';

  if (Array.isArray(cats) && cats.length > 0) {
    const line0 = cats[0] as Record<string, unknown>;
    const labourObj = (line0.labour ?? line0.labours) as Record<string, unknown> | undefined;
    category = String(
      (typeof labourObj?.name === 'string' ? labourObj.name : null) ??
        (typeof line0.labour_name === 'string' ? line0.labour_name : null) ??
        '—'
    );
    const hc = Number(line0.head_count ?? line0.workers_count ?? line0.manpower_count ?? 0);
    if (Number.isFinite(hc)) headCount = hc;
    const qtyU = String(line0.day_labour_count_unit ?? line0.day_unit ?? 'day').toLowerCase();
    labourCountUnit = qtyU === 'hour' || qtyU === 'hr' ? 'hour' : 'day';
    otHours = Number(line0.overtime_hours ?? line0.overtimeHours ?? line0.ot_hours ?? 0);
    if (!Number.isFinite(otHours)) otHours = 0;
    const otQtyU = String(line0.overtime_quantity_unit ?? 'hour').toLowerCase();
    overtimeQtyUnit = otQtyU === 'day' || otQtyU === 'days' ? 'day' : 'hour';

    if (!Number.isFinite(amount) || amount === 0) {
      amount = cats.reduce<number>((s, li) => {
        const line = li as Record<string, unknown>;
        const a = Number(line.line_total ?? line.amount ?? line.total ?? 0);
        return s + (Number.isFinite(a) ? a : 0);
      }, 0);
    }
  }
  if (!Number.isFinite(amount)) amount = 0;

  return {
    uuid,
    workDate,
    projectName,
    contractorName,
    category,
    headCount,
    labourCountUnit,
    otHours,
    overtimeQtyUnit,
    amount,
    vendorsId,
  };
}

/** When paying the exact outstanding total, omit per-line amounts so the backend applies full remaining per entry. */
function buildLabourEntriesManualPayload(
  selected: PayApiUnpaidRow[],
  userAmount: number
): Array<{ uuid: string; amount?: number }> {
  const sum = selected.reduce((s, r) => s + r.amount, 0);
  if (selected.length === 0) return [];
  if (!Number.isFinite(userAmount) || userAmount <= 0) return [];
  if (Math.abs(userAmount - sum) < 0.02) {
    return selected.map((r) => ({ uuid: r.uuid }));
  }
  let remaining = userAmount;
  const out: Array<{ uuid: string; amount: number }> = [];
  selected.forEach((r, i) => {
    if (i === selected.length - 1) {
      out.push({ uuid: r.uuid, amount: Math.round(remaining * 100) / 100 });
    } else {
      const share =
        sum > 0
          ? Math.round(((userAmount * r.amount) / sum) * 100) / 100
          : Math.round((userAmount / selected.length) * 100) / 100;
      out.push({ uuid: r.uuid, amount: share });
      remaining -= share;
    }
  });
  return out;
}

function pickPaySummaryNumbers(payload: unknown): {
  totalBilled: number | null;
  totalPaid: number | null;
  outstanding: number | null;
} {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { totalBilled: null, totalPaid: null, outstanding: null };
  }
  const o = payload as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const x = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return {
    totalBilled: num(o.total_billed ?? o.billed_amount ?? o.total_amount ?? o.sum_billed),
    totalPaid: num(o.total_paid ?? o.paid_amount),
    outstanding: num(o.outstanding ?? o.balance_due ?? o.amount_due ?? o.unpaid_total),
  };
}

function formatInrLabourPayment(value: unknown): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
}

function formatDateTimeDetail(value: unknown): string {
  if (value == null || value === '') return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function unwrapLabourPaymentDetail(payload: unknown): Record<string, unknown> | null {
  if (payload == null || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const inner = p.data;
  if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return p;
}

function LabourPaymentDetailContent({
  payload,
  textPrimary,
  textSecondary,
  borderClass,
  isDark,
}: {
  payload: unknown;
  textPrimary: string;
  textSecondary: string;
  borderClass: string;
  isDark: boolean;
}) {
  const d = unwrapLabourPaymentDetail(payload);
  if (d === null) {
    return <p className={textSecondary}>No data.</p>;
  }
  if (d.error != null && d.uuid == null) {
    return <p className="text-sm text-red-500 dark:text-red-400">{String(d.error)}</p>;
  }

  const contractor = d.contractor as Record<string, unknown> | undefined;
  const contractorName = contractor?.name != null ? String(contractor.name) : '—';
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];

  const statusRaw = d.status != null ? String(d.status).toLowerCase() : '';
  const statusClass =
    statusRaw === 'completed'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : statusRaw === 'pending' || statusRaw === 'processing'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
        : statusRaw === 'failed' || statusRaw === 'cancelled'
          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
          : `${isDark ? 'bg-slate-700/50' : 'bg-slate-100'} ${textSecondary} border-inherit`;

  const hasCashfree =
    d.cashfree_transfer_id != null ||
    d.cashfree_beneficiary_id != null ||
    d.cashfree_transfer_status != null ||
    d.cashfree_status_code != null;

  const subtleCard = isDark ? 'bg-slate-800/60' : 'bg-slate-50';

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border ${borderClass} p-4 ${subtleCard}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Total</p>
            <p className={`text-2xl font-black tabular-nums ${textPrimary}`}>
              {formatInrLabourPayment(d.amount_total)}
              {d.currency_code != null ? (
                <span className={`text-sm font-bold ml-2 ${textSecondary}`}>{String(d.currency_code)}</span>
              ) : null}
            </p>
          </div>
          {d.status != null ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${statusClass}`}>
              {String(d.status)}
            </span>
          ) : null}
        </div>
        <dl className="space-y-0 divide-y divide-inherit/80">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5 first:pt-0">
            <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Payment UUID</dt>
            <dd className={`text-xs font-mono break-all ${textPrimary}`}>{d.uuid != null ? String(d.uuid) : '—'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5">
            <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Idempotency key</dt>
            <dd className={`text-xs font-mono break-all ${textPrimary}`}>
              {d.idempotency_key != null ? String(d.idempotency_key) : '—'}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5">
            <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Mode</dt>
            <dd className={`text-sm ${textPrimary}`}>
              {d.payment_mode != null ? String(d.payment_mode) : '—'}
              {d.manual_method != null ? (
                <span className={`ml-2 ${textSecondary}`}>({String(d.manual_method)})</span>
              ) : null}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5">
            <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Paid at</dt>
            <dd className={`text-sm ${textPrimary}`}>{formatDateTimeDetail(d.paid_at)}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5">
            <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Recorded</dt>
            <dd className={`text-sm ${textPrimary}`}>{formatDateTimeDetail(d.created_at)}</dd>
          </div>
          {d.manual_reference != null && String(d.manual_reference).trim() !== '' ? (
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5">
              <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Reference</dt>
              <dd className={`text-sm break-all ${textPrimary}`}>{String(d.manual_reference)}</dd>
            </div>
          ) : null}
          {d.notes != null && String(d.notes).trim() !== '' ? (
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5">
              <dt className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-36 ${textSecondary}`}>Notes</dt>
              <dd className={`text-sm whitespace-pre-wrap ${textPrimary}`}>{String(d.notes)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className={`rounded-xl border ${borderClass} p-4 ${subtleCard}`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-2`}>Contractor</p>
        <p className={`text-base font-bold ${textPrimary}`}>{contractorName}</p>
        {contractor?.uuid != null ? (
          <p className={`text-xs font-mono mt-1 break-all ${textSecondary}`}>{String(contractor.uuid)}</p>
        ) : null}
      </div>

      {hasCashfree ? (
        <div className={`rounded-xl border ${borderClass} p-4 ${subtleCard}`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-3`}>Cashfree (if applicable)</p>
          <dl className="space-y-2 text-sm">
            {d.cashfree_transfer_id != null ? (
              <div className="flex justify-between gap-2">
                <span className={textSecondary}>Transfer ID</span>
                <span className={`font-mono text-xs break-all ${textPrimary}`}>{String(d.cashfree_transfer_id)}</span>
              </div>
            ) : null}
            {d.cashfree_beneficiary_id != null ? (
              <div className="flex justify-between gap-2">
                <span className={textSecondary}>Beneficiary</span>
                <span className={`font-mono text-xs break-all ${textPrimary}`}>{String(d.cashfree_beneficiary_id)}</span>
              </div>
            ) : null}
            {d.cashfree_transfer_status != null ? (
              <div className="flex justify-between gap-2">
                <span className={textSecondary}>Transfer status</span>
                <span className={textPrimary}>{String(d.cashfree_transfer_status)}</span>
              </div>
            ) : null}
            {d.cashfree_status_code != null ? (
              <div className="flex justify-between gap-2">
                <span className={textSecondary}>Status code</span>
                <span className={textPrimary}>{String(d.cashfree_status_code)}</span>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div>
        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-2`}>Line items</p>
        {items.length === 0 ? (
          <p className={`text-sm ${textSecondary}`}>No line items.</p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${borderClass}`}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className={isDark ? 'bg-slate-800/80' : 'bg-slate-100'}>
                <tr className={`border-b ${borderClass}`}>
                  <th className={`text-left py-2.5 px-3 font-bold ${textSecondary}`}>Work date</th>
                  <th className={`text-left py-2.5 px-3 font-bold ${textSecondary}`}>Project</th>
                  <th className={`text-right py-2.5 px-3 font-bold ${textSecondary}`}>Entry total</th>
                  <th className={`text-right py-2.5 px-3 font-bold ${textSecondary}`}>Allocated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => {
                  const proj = row.project as Record<string, unknown> | undefined;
                  const projectName =
                    proj?.project_name != null
                      ? String(proj.project_name)
                      : proj?.name != null
                        ? String(proj.name)
                        : row.project_name != null
                          ? String(row.project_name)
                          : '—';
                  const wid = row.labour_entry_uuid != null ? String(row.labour_entry_uuid) : '';
                  return (
                    <tr key={wid || `item-${i}`} className={`border-b ${borderClass} last:border-0`}>
                      <td className={`py-2.5 px-3 whitespace-nowrap ${textPrimary}`}>
                        {row.work_date != null ? String(row.work_date) : '—'}
                      </td>
                      <td className={`py-2.5 px-3 min-w-[140px] ${textPrimary}`}>
                        <span className="font-medium">{projectName}</span>
                        {wid ? (
                          <span className={`block text-[10px] font-mono mt-0.5 break-all ${textSecondary}`}>{wid}</span>
                        ) : null}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${textPrimary}`}>
                        {formatInrLabourPayment(row.entry_total_amount)}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums ${textPrimary}`}>
                        {formatInrLabourPayment(row.amount_allocated)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkforceManagementProps {
  theme: ThemeType;
}

const WorkforceManagement: React.FC<WorkforceManagementProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated, user } = useUser();
  const companyId = user?.company_id;
  const enrollOthersOk = userMayEnrollOthers(user as Record<string, unknown> | null);
  const reEnrollOk = userMayReEnrollFace(user as Record<string, unknown> | null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';

  // === PUNCH TAB (face attendance) ===
  const [faceSetupLoading, setFaceSetupLoading] = useState(false);
  const [faceSetupOk, setFaceSetupOk] = useState<boolean | null>(null);
  const [faceSetupError, setFaceSetupError] = useState<string | null>(null);
  const [punchType, setPunchType] = useState<'punch_in' | 'punch_out'>('punch_in');
  /** Today's face punch log (this session — e.g. photo preview from device). */
  const [facePunchLog, setFacePunchLog] = useState<FacePunchLogEntry[]>([]);
  /** Punch IN / Punch OUT rows from GET /face/status-today (separate arrays). */
  const [statusTodayPunchInRows, setStatusTodayPunchInRows] = useState<FacePunchLogEntry[]>([]);
  const [statusTodayPunchOutRows, setStatusTodayPunchOutRows] = useState<FacePunchLogEntry[]>([]);
  const [statusTodayDate, setStatusTodayDate] = useState<string | null>(null);
  const [statusTodayLoading, setStatusTodayLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  /** Punch mode when the camera modal was opened (for copy + API while modal is open). */
  const [punchModalKind, setPunchModalKind] = useState<'punch_in' | 'punch_out'>('punch_in');
  /** Punch modal: rear (environment) vs front/selfie (user). User can switch before capture. */
  const [punchCameraFacing, setPunchCameraFacing] = useState<'user' | 'environment'>('environment');
  const [geoLocation, setGeoLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
  } | null>(null);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);
  const [showPunchSuccessModal, setShowPunchSuccessModal] = useState(false);
  const [punchSuccessData, setPunchSuccessData] = useState<{
    punch_time: string;
    punch_type: string;
    employee_name?: string;
    ai_verification: string;
    location: string;
    uuid?: string;
  } | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  /** 4…1 = hold countdown, 0 = capturing / verifying, null = modal closed */
  const [punchHoldCountdown, setPunchHoldCountdown] = useState<number | null>(null);
  const performFacePunchSubmitRef = useRef<(photoBlob: Blob, kind: 'punch_in' | 'punch_out') => Promise<void>>(
    async () => {}
  );
  const [staffPage, setStaffPage] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // === STAFF TAB ===
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState<'staff' | 'own_labor'>('staff'); // Staff (company users) | Own Labour
  const [staffFilterDropdownOpen, setStaffFilterDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: number | string; name: string }>>([]);
  const [faceAttendeesStaff, setFaceAttendeesStaff] = useState<FaceAttendeeRow[]>([]);
  const [faceAttendeesOwnLabor, setFaceAttendeesOwnLabor] = useState<FaceAttendeeRow[]>([]);
  const [faceAttendeesLoading, setFaceAttendeesLoading] = useState(false);
  const faceAttendees = useMemo(
    () => mergeFaceAttendeeListsBySubject(faceAttendeesStaff, faceAttendeesOwnLabor),
    [faceAttendeesStaff, faceAttendeesOwnLabor]
  );
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<FaceAttendeeRow | null>(null);
  const [enrollImages, setEnrollImages] = useState<File[]>([]);
  const enrollCapturePreviewUrls = useMemo(
    () => enrollImages.map((f) => URL.createObjectURL(f)),
    [enrollImages]
  );
  useEffect(() => {
    return () => {
      enrollCapturePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [enrollCapturePreviewUrls]);
  const [enrollConsent, setEnrollConsent] = useState(false);
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  /** GET /face/check for subject in enroll modal */
  const [enrollFaceCheck, setEnrollFaceCheck] = useState<{
    loading: boolean;
    is_enrolled?: boolean;
    face_count?: number;
    error?: string;
  } | null>(null);
  /** GET /face/check for logged-in company user on Punch tab */
  const [punchSelfFaceCheck, setPunchSelfFaceCheck] = useState<{
    loading: boolean;
    is_enrolled?: boolean;
    face_count?: number;
  } | null>(null);
  /** GET contractor-labor-rates/{uuid} or labour-entriesDetail */
  const [apiDetailModal, setApiDetailModal] = useState<null | { kind: 'contractor_rate' | 'labour_entry'; uuid: string }>(
    null
  );
  const [apiDetailLoading, setApiDetailLoading] = useState(false);
  const [apiDetailPayload, setApiDetailPayload] = useState<unknown>(null);

  const [staffFormData, setStaffFormData] = useState({
    name: '',
    project_id: '',
    designation: '',
    worker_type: 'staff' as 'staff' | 'own_labor',
    email: '',
    mobile: '',
    profile_images: null as File | null,
  });
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const staffFileInputRef = useRef<HTMLInputElement>(null);
  const staffCameraRef = useRef<HTMLVideoElement>(null);
  const staffStreamRef = useRef<MediaStream | null>(null);
  const staffFilterDropdownRef = useRef<HTMLDivElement>(null);

  // === CONTRACTOR TAB ===
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractorProjects, setContractorProjects] = useState<Array<{ id: number | string; name: string }>>([]);
  const [contractorDataLoading, setContractorDataLoading] = useState(false);
  const [showAddLabourEntryModal, setShowAddLabourEntryModal] = useState(false);
  const [isSubmittingLabourEntry, setIsSubmittingLabourEntry] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [labourEntryFormData, setLabourEntryFormData] = useState<{
    date: string;
    project_id: string;
    contractor_id: string;
    labourRows: LabourEntryRow[];
  }>({
    date: new Date().toISOString().slice(0, 10),
    project_id: '',
    contractor_id: '',
    labourRows: [defaultLabourRow()],
  });
  const labourEntryFormRef = useRef(labourEntryFormData);
  labourEntryFormRef.current = labourEntryFormData;

  const [rateFormOptions, setRateFormOptions] = useState<{ projects: any[]; labours: any[]; contractors: any[] }>({
    projects: [],
    labours: [],
    contractors: [],
  });
  const [labourEntryFormOptions, setLabourEntryFormOptions] = useState<{
    projects: any[];
    labours: any[];
    contractors: any[];
  }>({ projects: [], labours: [], contractors: [] });

  const entryProjectList = useMemo(() => {
    if (labourEntryFormOptions.projects.length > 0) {
      return labourEntryFormOptions.projects.map((p: any) => ({
        id: p.id ?? p.uuid,
        name: String(p.project_name ?? p.name ?? ''),
      }));
    }
    return contractorProjects;
  }, [labourEntryFormOptions.projects, contractorProjects]);

  const entryContractorList = useMemo(() => {
    if (labourEntryFormOptions.contractors.length > 0) {
      return labourEntryFormOptions.contractors.map((v: any) => ({
        id: v.id ?? v.uuid,
        name: String(v.name ?? ''),
      }));
    }
    return vendors;
  }, [labourEntryFormOptions.contractors, vendors]);

  const entryLabourPicks = useMemo(
    () =>
      labourEntryFormOptions.labours.length > 0
        ? formOptionLaboursToPicks(labourEntryFormOptions.labours)
        : transformRatesLabourList([]),
    [labourEntryFormOptions.labours]
  );

  const rateLabourPicks = useMemo(
    () => formOptionLaboursToPicks(rateFormOptions.labours),
    [rateFormOptions.labours]
  );

  const [rateFormOptionsLoading, setRateFormOptionsLoading] = useState(false);
  const [labourEntryFormOptionsLoading, setLabourEntryFormOptionsLoading] = useState(false);
  const [ratesFormData, setRatesFormData] = useState({
    project_id: '',
    vendor_id: '',
    labour_id: '',
    daily_rate: '',
    daily_rate_unit: 'day' as 'day' | 'hour',
    overtime_rate: '',
    overtime_unit: 'hour' as 'day' | 'hour',
    effective_from: new Date().toISOString().slice(0, 10),
    hours_per_day: '',
    currency_code: '',
    notes: '',
  });
  const [ratesFieldErrors, setRatesFieldErrors] = useState<Record<string, string>>({});
  const [ratesLabourSearch, setRatesLabourSearch] = useState('');
  const [ratesLabourDropdownOpen, setRatesLabourDropdownOpen] = useState(false);
  const [showRatesCreateLabourModal, setShowRatesCreateLabourModal] = useState(false);
  const ratesLabourDropdownRef = useRef<HTMLDivElement>(null);
  const [rateHistory, setRateHistory] = useState<Array<{ category: string; contractor: string; effectiveFrom: string; dailyRate: string; overtimeRate: string }>>([]);
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);

  const [apiContractorRates, setApiContractorRates] = useState<any[]>([]);
  const [apiContractorRatesLoading, setApiContractorRatesLoading] = useState(false);
  const [apiContractorRatesFetchError, setApiContractorRatesFetchError] = useState<string | null>(null);
  const [apiLabourEntries, setApiLabourEntries] = useState<any[]>([]);
  const [apiLabourEntriesLoading, setApiLabourEntriesLoading] = useState(false);
  const [apiLabourEntriesFetchError, setApiLabourEntriesFetchError] = useState<string | null>(null);
  const [entriesDateFrom, setEntriesDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [entriesDateTo, setEntriesDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [labourEntryProjectDropdownOpen, setLabourEntryProjectDropdownOpen] = useState(false);
  const [labourEntryContractorDropdownOpen, setLabourEntryContractorDropdownOpen] = useState(false);
  const [labourEntryProjectSearch, setLabourEntryProjectSearch] = useState('');
  const [labourEntryContractorSearch, setLabourEntryContractorSearch] = useState('');
  const labourEntryProjectRef = useRef<HTMLDivElement>(null);
  const labourEntryContractorRef = useRef<HTMLDivElement>(null);
  const [logFilterProject, setLogFilterProject] = useState<string>('');
  const [logFilterContractor, setLogFilterContractor] = useState<string>('');
  const [logFilterDate, setLogFilterDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [logShowAllDates, setLogShowAllDates] = useState(false);

  /** One grid row per labour line — matches spreadsheet-style logs (Project, Contractor, Category, Count, Unit, OT). */
  const serverLabourLogRows = useMemo(() => {
    type Line = {
      entryUuid: string | null;
      lineKey: string;
      workDate: string;
      project: string;
      contractor: string;
      category: string;
      count: string;
      unit: string;
      ot: string;
      status: string;
    };
    const lines: Line[] = [];
    for (let ri = 0; ri < (apiLabourEntries?.length ?? 0); ri++) {
      const row = apiLabourEntries[ri] as Record<string, unknown>;
      const date = String(row.work_date ?? row.date ?? '—').slice(0, 10);
      const project = String(
        (row.project as { project_name?: string; name?: string } | undefined)?.project_name ??
          (row.project as { name?: string } | undefined)?.name ??
          row.project_name ??
          '—'
      );
      const contractor = String(
        (row.contractor as { name?: string } | undefined)?.name ??
          (row.vendor as { name?: string; registration_name?: string } | undefined)?.name ??
          (row.vendor as { registration_name?: string } | undefined)?.registration_name ??
          row.contractor_name ??
          '—'
      );
      const status =
        row.status != null && String(row.status).trim() !== ''
          ? String(row.status)
          : row.notes != null && String(row.notes).trim() !== ''
            ? String(row.notes)
            : '—';
      const cats =
        (row.labour_categories as unknown[]) ??
        (row.labourCategories as unknown[]) ??
        (row.categories as unknown[]) ??
        (Array.isArray(row.lines) ? (row.lines as unknown[]) : null);
      if (Array.isArray(cats) && cats.length > 0) {
        cats.forEach((rawLine, lineIndex) => {
          const line = rawLine as Record<string, unknown>;
          const labourObj = (line.labour ?? line.labours) as Record<string, unknown> | undefined;
          const category = String(
            (typeof labourObj?.name === 'string' ? labourObj.name : null) ??
              (typeof line.labour_name === 'string' ? line.labour_name : null) ??
              (typeof line.category_name === 'string' ? line.category_name : null) ??
              (typeof line.name === 'string' ? line.name : null) ??
              '—'
          );
          const headRaw = line.head_count ?? line.workers_count ?? line.manpower_count;
          const countStr =
            headRaw != null && headRaw !== '' && Number(headRaw) > 0 ? String(headRaw) : '—';
          const dlc = Number(line.day_labour_count ?? line.units ?? 0);
          const qtyU = String(
            line.day_labour_count_unit ?? line.day_labour_countUnit ?? line.day_unit ?? line.dayUnit ?? 'day'
          ).toLowerCase();
          const unitWord = qtyU === 'hour' || qtyU === 'hr' ? 'Hour' : 'Day';
          const unitStr =
            Number.isFinite(dlc) && dlc > 0
              ? `${dlc} ${unitWord}${dlc !== 1 ? 's' : ''}`
              : '—';
          const otN = Number(line.overtime_hours ?? line.overtimeHours ?? line.ot_hours ?? 0);
          const otQtyU = String(
            line.overtime_quantity_unit ?? line.overtimeQuantityUnit ?? 'hour'
          ).toLowerCase();
          const otIsDay = otQtyU === 'day' || otQtyU === 'days';
          const otLabel = otIsDay
            ? otN === 1
              ? 'Day'
              : 'Days'
            : otN === 1
              ? 'Hr'
              : 'Hrs';
          const otStr = Number.isFinite(otN) ? `${otN} ${otLabel}` : '—';
          const uuid = row.uuid != null ? String(row.uuid) : null;
          lines.push({
            entryUuid: uuid,
            lineKey: `${uuid ?? `row-${ri}`}-${lineIndex}`,
            workDate: date,
            project,
            contractor,
            category,
            count: countStr,
            unit: unitStr,
            ot: otStr,
            status,
          });
        });
      } else {
        const uuid = row.uuid != null ? String(row.uuid) : null;
        lines.push({
          entryUuid: uuid,
          lineKey: `${uuid ?? `row-${ri}`}-0`,
          workDate: date,
          project,
          contractor,
          category: '—',
          count: '—',
          unit: '—',
          ot: '—',
          status,
        });
      }
    }
    return lines;
  }, [apiLabourEntries]);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dash', icon: LayoutDashboard },
    { id: 'punch' as TabType, label: 'Punch', icon: Clock },
    { id: 'staff' as TabType, label: 'Staff', icon: Users },
    { id: 'contractor' as TabType, label: 'Logs', icon: HardHat },
    { id: 'pay' as TabType, label: 'Pay', icon: Wallet },
  ];

  // === DASHBOARD / PAYMENTS / REPORTS state ===
  const [dashboardProject, setDashboardProject] = useState<string>('All');
  const [payProject, setPayProject] = useState<string>('');
  const [payContractor, setPayContractor] = useState<string>('');
  const [payPeriodFilter, setPayPeriodFilter] = useState<'all' | 'weekly' | 'fortnight' | 'monthly'>('all');
  const [selectedPayEntryIds, setSelectedPayEntryIds] = useState<Set<string>>(new Set());
  /** Server labour entry UUIDs (Pay tab when logged in). */
  const [selectedPayUuids, setSelectedPayUuids] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    mode: 'Cash' as PaymentFormMode,
    reference: '',
    notes: '',
    paid_at: defaultPaidAtLocal(),
    currency_code: 'INR',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  /** Regenerated when opening the payment modal and when the amount field changes (API manual payment idempotency). */
  const paymentIdempotencyKeyRef = useRef<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [payUnpaidRows, setPayUnpaidRows] = useState<PayApiUnpaidRow[]>([]);
  const [payUnpaidLoading, setPayUnpaidLoading] = useState(false);
  const [payUnpaidError, setPayUnpaidError] = useState<string | null>(null);
  const [paySummaryPayload, setPaySummaryPayload] = useState<unknown>(null);
  const [payRecentRows, setPayRecentRows] = useState<any[]>([]);
  const [payRecentLoading, setPayRecentLoading] = useState(false);
  const [payDetailModalUuid, setPayDetailModalUuid] = useState<string | null>(null);
  const [payDetailLoading, setPayDetailLoading] = useState(false);
  const [payDetailPayload, setPayDetailPayload] = useState<unknown>(null);

  const payApiDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (payPeriodFilter === 'all') {
      return { from: undefined as string | undefined, to: undefined as string | undefined };
    }
    const days = payPeriodFilter === 'weekly' ? 7 : payPeriodFilter === 'fortnight' ? 14 : 30;
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    return { from: fmt(start), to: fmt(today) };
  }, [payPeriodFilter]);

  const payFilterProjectId = useMemo(() => {
    if (!payProject) return undefined;
    const p = contractorProjects.find((x) => x.name === payProject);
    if (p?.id == null || p.id === '') return undefined;
    const n = Number(p.id);
    return Number.isFinite(n) ? n : p.id;
  }, [payProject, contractorProjects]);

  const payFilterVendorId = useMemo(() => {
    if (!payContractor) return undefined;
    const v = vendors.find((x) => x.name === payContractor);
    if (v?.id == null || v.id === '') return undefined;
    const n = Number(v.id);
    return Number.isFinite(n) ? n : v.id;
  }, [payContractor, vendors]);

  /** Dashboard: server attendance report */
  const [attReportFrom, setAttReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [attReportTo, setAttReportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [attReportProjectId, setAttReportProjectId] = useState('');
  const [attReportRows, setAttReportRows] = useState<any[]>([]);
  const [attReportLoading, setAttReportLoading] = useState(false);

  // Reset staff page when search or filter changes
  useEffect(() => {
    setStaffPage(1);
  }, [staffSearchQuery, staffFilter]);

  const refreshFaceStatusToday = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!isAuthenticated) return;
    const quiet = opts?.quiet === true;
    if (!quiet) setStatusTodayLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (companyId != null) params.company_id = companyId;
      const raw = await faceAttendanceAPI.statusToday(params);
      const { punchIn, punchOut, date } = parseStatusTodayPunchRows(raw);
      setStatusTodayPunchInRows(punchIn);
      setStatusTodayPunchOutRows(punchOut);
      setStatusTodayDate(date);
    } catch {
      if (!quiet) {
        setStatusTodayPunchInRows([]);
        setStatusTodayPunchOutRows([]);
        setStatusTodayDate(null);
      }
    } finally {
      if (!quiet) setStatusTodayLoading(false);
    }
  }, [isAuthenticated, companyId]);

  useEffect(() => {
    if (activeTab !== 'punch' || !isAuthenticated) return;
    let cancelled = false;
    setFaceSetupLoading(true);
    setFaceSetupError(null);
    const body = companyId != null ? { company_id: companyId } : {};
    faceAttendanceAPI
      .setup(body)
      .then(() => {
        if (!cancelled) {
          setFaceSetupOk(true);
          setFaceSetupError(null);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setFaceSetupOk(false);
          setFaceSetupError(e?.message || 'Face not set up');
        }
      })
      .finally(() => {
        if (!cancelled) setFaceSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAuthenticated, companyId]);

  useEffect(() => {
    if (activeTab !== 'punch' || !isAuthenticated) return;
    void refreshFaceStatusToday({ quiet: false });
    const t = setInterval(() => void refreshFaceStatusToday({ quiet: true }), 120000);
    return () => clearInterval(t);
  }, [activeTab, isAuthenticated, refreshFaceStatusToday]);

  const recentPunchInDisplayRows = useMemo(
    () => mergePunchRowsForBucket(statusTodayPunchInRows, facePunchLog, 'in'),
    [statusTodayPunchInRows, facePunchLog]
  );
  const recentPunchOutDisplayRows = useMemo(
    () => mergePunchRowsForBucket(statusTodayPunchOutRows, facePunchLog, 'out'),
    [statusTodayPunchOutRows, facePunchLog]
  );

  /** GET /face/check — logged-in user vs PersonGroup (eligibility hint before punch). */
  useEffect(() => {
    if (activeTab !== 'punch' || !isAuthenticated || companyId == null || user?.id == null) {
      setPunchSelfFaceCheck(null);
      return;
    }
    let cancelled = false;
    setPunchSelfFaceCheck({ loading: true });
    faceAttendanceAPI
      .check({
        company_id: companyId,
        subject_type: 'company_user',
        subject_id: user.id,
      })
      .then((res) => {
        if (cancelled) return;
        const d = (res as Record<string, unknown>)?.data ?? res;
        const dr = d as Record<string, unknown>;
        setPunchSelfFaceCheck({
          loading: false,
          is_enrolled: !!(dr?.is_enrolled ?? dr?.enrolled),
          face_count: dr?.face_count != null ? Number(dr.face_count) : undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setPunchSelfFaceCheck({ loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAuthenticated, companyId, user?.id]);

  useEffect(() => {
    if ((activeTab !== 'staff' && activeTab !== 'punch') || !isAuthenticated) return;
    let cancelled = false;
    setFaceAttendeesLoading(true);
    const params = companyId != null ? { company_id: companyId } : {};
    faceAttendanceAPI
      .attendees(params)
      .then((res) => {
        if (!cancelled) {
          const { staff, ownLabor } = applyFaceAttendeesApiPayload(res);
          setFaceAttendeesStaff(staff);
          setFaceAttendeesOwnLabor(ownLabor);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFaceAttendeesStaff([]);
          setFaceAttendeesOwnLabor([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFaceAttendeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAuthenticated, companyId]);

  /** POST /face/setup before enrollment paths (safe to repeat if user never opened Punch tab). */
  useEffect(() => {
    if (!showEnrollModal || companyId == null || !isAuthenticated) return;
    faceAttendanceAPI.setup({ company_id: companyId }).catch(() => {});
  }, [showEnrollModal, companyId, isAuthenticated]);

  /** GET /face/check for the enroll / re-enroll modal target */
  useEffect(() => {
    if (!showEnrollModal || !enrollTarget || companyId == null) {
      setEnrollFaceCheck(null);
      return;
    }
    let cancelled = false;
    setEnrollFaceCheck({ loading: true });
    faceAttendanceAPI
      .check({
        company_id: companyId,
        subject_type: enrollTarget.subjectType,
        subject_id: enrollTarget.subjectId,
      })
      .then((res) => {
        if (cancelled) return;
        const d = (res as Record<string, unknown>)?.data ?? res;
        const dr = d as Record<string, unknown>;
        setEnrollFaceCheck({
          loading: false,
          is_enrolled: !!(dr?.is_enrolled ?? dr?.enrolled),
          face_count: dr?.face_count != null ? Number(dr.face_count) : undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setEnrollFaceCheck({ loading: false, error: 'Could not verify enrollment status' });
      });
    return () => {
      cancelled = true;
    };
  }, [showEnrollModal, enrollTarget, companyId]);

  const fetchAttendanceReport = useCallback(async () => {
    if (companyId == null) {
      toast.showWarning('Company is required for attendance report');
      return;
    }
    if (!attReportFrom || !attReportTo || attReportTo < attReportFrom) {
      toast.showWarning('Pick a valid date range');
      return;
    }
    setAttReportLoading(true);
    try {
      const params: {
        company_id: number;
        date_from: string;
        date_to: string;
        project_id?: string | number;
      } = {
        company_id: companyId,
        date_from: attReportFrom,
        date_to: attReportTo,
      };
      if (attReportProjectId) params.project_id = attReportProjectId;
      const res = await attendanceReportAPI.report(params);
      const rows = unwrapArrayPayload(res?.data ?? res);
      setAttReportRows(rows);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load report');
      setAttReportRows([]);
    } finally {
      setAttReportLoading(false);
    }
  }, [companyId, attReportFrom, attReportTo, attReportProjectId, toast]);

  // Get geolocation
  useEffect(() => {
    if (activeTab !== 'punch' || !showCameraModal) return;
    if (!navigator.geolocation) {
      toast.showWarning('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude ?? undefined,
        });
      },
      (err) => {
        toast.showError('Location access denied: ' + (err.message || 'Please enable location'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [activeTab, showCameraModal]);

  // Fetch projects for Add Profile
  useEffect(() => {
    if (!isAuthenticated || !showAddProfileModal) return;
    masterDataAPI
      .getProjects()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list.map((p: any) => ({ id: p.id ?? p.uuid, name: p.name || p.project_name || '' })));
      })
      .catch(() => setProjects([]));
  }, [isAuthenticated, showAddProfileModal]);

  // Load contractor data: projects and contractors from Masters API (scoped to logged-in user via Bearer token)
  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'contractor' && activeTab !== 'pay') return;
    if (!isAuthenticated) {
      setContractorProjects([]);
      setVendors([]);
      return;
    }
    setContractorDataLoading(true);
    Promise.all([
      masterDataAPI.getProjects(),
      masterDataAPI.getVendorTypeWiseList('contractor'),
    ])
      .then(([projectData, vendorData]) => {
        const projects = Array.isArray(projectData) ? projectData : [];
        const vendorsList = Array.isArray(vendorData) ? vendorData : [];
        setContractorProjects(projects.map((p: any) => ({ id: p.id ?? p.uuid, name: p.name || p.project_name || '' })));
        setVendors(vendorsList.map((v: any) => ({ id: v.id ?? v.uuid, name: v.name || v.contact_person_name || '' })));
      })
      .catch((e: any) => {
        toast.showError(e?.message || 'Failed to load data');
        setContractorProjects([]);
        setVendors([]);
      })
      .finally(() => setContractorDataLoading(false));
  }, [activeTab, dataVersion, isAuthenticated]);

  // Refresh projects and contractors from master API
  const refreshContractorProjectsAndVendors = useCallback(() => {
    Promise.all([
      masterDataAPI.getProjects(),
      masterDataAPI.getVendorTypeWiseList('contractor'),
    ])
      .then(([projectData, vendorData]) => {
        const projects = Array.isArray(projectData) ? projectData : [];
        const apiProjects = projects.map((p: any) => ({ id: p.id ?? p.uuid, name: p.name || p.project_name || '' }));
        const localProjects = getProjects();
        const apiProjectNames = new Set(apiProjects.map((p) => (p.name || '').toLowerCase()));
        const localOnlyProjects = localProjects.filter((lp) => lp.name && !apiProjectNames.has(lp.name.toLowerCase()));
        setContractorProjects([...apiProjects, ...localOnlyProjects]);

        const contractors = Array.isArray(vendorData) ? vendorData : [];
        const apiVendors = contractors.map((v: any) => ({ id: v.id ?? v.uuid, name: v.name || v.contact_person_name || '' }));
        const localVendors = getVendors();
        const apiVendorNames = new Set(apiVendors.map((v) => (v.name || '').toLowerCase()));
        const localOnlyVendors = localVendors.filter((lv) => lv.name && !apiVendorNames.has(lv.name.toLowerCase()));
        setVendors([...apiVendors, ...localOnlyVendors]);
      })
      .catch(() => {});
  }, []);

  // Close labour entry dropdowns and staff filter dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (labourEntryProjectRef.current && !labourEntryProjectRef.current.contains(e.target as Node)) {
        setLabourEntryProjectDropdownOpen(false);
      }
      if (labourEntryContractorRef.current && !labourEntryContractorRef.current.contains(e.target as Node)) {
        setLabourEntryContractorDropdownOpen(false);
      }
      if (staffFilterDropdownRef.current && !staffFilterDropdownRef.current.contains(e.target as Node)) {
        setStaffFilterDropdownOpen(false);
      }
      if (ratesLabourDropdownRef.current && !ratesLabourDropdownRef.current.contains(e.target as Node)) {
        setRatesLabourDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Single form-options payload for contractor rate modal (Project, Contractor, Labour)
  useEffect(() => {
    if (!showRatesModal || !isAuthenticated) return;
    let cancel = false;
    setRateFormOptionsLoading(true);
    setRatesFieldErrors({});
    contractorLaborRatesAPI
      .formOptions()
      .then((res) => {
        if (!cancel) setRateFormOptions(extractContractorRateFormOptions(res));
      })
      .catch(() => {
        if (!cancel) setRateFormOptions({ projects: [], labours: [], contractors: [] });
      })
      .finally(() => {
        if (!cancel) setRateFormOptionsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [showRatesModal, isAuthenticated]);

  useEffect(() => {
    if (!showAddLabourEntryModal || !isAuthenticated) return;
    let cancel = false;
    setLabourEntryFormOptionsLoading(true);
    contractorLaborRatesAPI
      .formOptions()
      .then((res) => {
        if (!cancel) setLabourEntryFormOptions(extractContractorRateFormOptions(res));
      })
      .catch(() => {
        if (!cancel) setLabourEntryFormOptions({ projects: [], labours: [], contractors: [] });
      })
      .finally(() => {
        if (!cancel) setLabourEntryFormOptionsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [showAddLabourEntryModal, isAuthenticated]);

  useEffect(() => {
    if (activeTab !== 'contractor' || !isAuthenticated) return;
    let cancel = false;
    setApiContractorRatesLoading(true);
    setApiContractorRatesFetchError(null);
    contractorLaborRatesAPI
      .list()
      .then((res) => {
        if (!cancel) {
          setApiContractorRates(unwrapArrayPayload(res?.data ?? res));
          setApiContractorRatesFetchError(null);
        }
      })
      .catch((e: any) => {
        if (!cancel) {
          setApiContractorRates([]);
          setApiContractorRatesFetchError(e?.message || 'Failed to load contractor labour rates');
        }
      })
      .finally(() => {
        if (!cancel) setApiContractorRatesLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [activeTab, isAuthenticated, dataVersion]);

  useEffect(() => {
    if (activeTab !== 'contractor' || !isAuthenticated) return;
    const from = entriesDateFrom <= entriesDateTo ? entriesDateFrom : entriesDateTo;
    const to = entriesDateFrom <= entriesDateTo ? entriesDateTo : entriesDateFrom;
    let cancel = false;
    setApiLabourEntriesLoading(true);
    setApiLabourEntriesFetchError(null);
    labourEntriesAPI
      .list({ work_date_from: from, work_date_to: to })
      .then((res) => {
        if (!cancel) {
          setApiLabourEntries(unwrapArrayPayload(res?.data ?? res));
          setApiLabourEntriesFetchError(null);
        }
      })
      .catch((e: any) => {
        if (!cancel) {
          setApiLabourEntries([]);
          setApiLabourEntriesFetchError(e?.message || 'Failed to load labour entries');
        }
      })
      .finally(() => {
        if (!cancel) setApiLabourEntriesLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [activeTab, isAuthenticated, entriesDateFrom, entriesDateTo, dataVersion]);

  useEffect(() => {
    if (!apiDetailModal) {
      setApiDetailPayload(null);
      return;
    }
    let cancelled = false;
    setApiDetailLoading(true);
    setApiDetailPayload(null);
    const req =
      apiDetailModal.kind === 'contractor_rate'
        ? contractorLaborRatesAPI.get(apiDetailModal.uuid)
        : labourEntriesAPI.get(apiDetailModal.uuid);
    req
      .then((res) => {
        if (!cancelled) setApiDetailPayload((res as Record<string, unknown>)?.data ?? res);
      })
      .catch(() => {
        if (!cancelled) setApiDetailPayload({ error: 'Failed to load detail' });
      })
      .finally(() => {
        if (!cancelled) setApiDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiDetailModal]);

  useEffect(() => {
    setSelectedPayUuids(new Set());
  }, [payProject, payContractor, payPeriodFilter]);

  useEffect(() => {
    if (activeTab !== 'pay' || !isAuthenticated) return;
    let cancelled = false;
    setPayUnpaidLoading(true);
    setPayUnpaidError(null);
    const params: {
      project_id?: number | string;
      vendors_id?: number | string;
      work_date_from?: string;
      work_date_to?: string;
    } = {};
    if (payFilterProjectId != null) params.project_id = payFilterProjectId;
    if (payFilterVendorId != null) params.vendors_id = payFilterVendorId;
    if (payApiDateRange.from) params.work_date_from = payApiDateRange.from;
    if (payApiDateRange.to) params.work_date_to = payApiDateRange.to;

    Promise.all([labourPaymentsAPI.unpaidEntries(params), labourPaymentsAPI.summary(params)])
      .then(([unpaidRes, sumRes]) => {
        if (cancelled) return;
        const raw = unwrapArrayPayload((unpaidRes as Record<string, unknown>)?.data ?? unpaidRes);
        const rows = raw
          .map((r) => parsePayUnpaidEntry(r as Record<string, unknown>))
          .filter((x): x is PayApiUnpaidRow => x != null);
        setPayUnpaidRows(rows);
        setPaySummaryPayload((sumRes as Record<string, unknown>)?.data ?? sumRes);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setPayUnpaidRows([]);
          setPaySummaryPayload(null);
          setPayUnpaidError(e?.message || 'Failed to load pay data');
        }
      })
      .finally(() => {
        if (!cancelled) setPayUnpaidLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    isAuthenticated,
    payFilterProjectId,
    payFilterVendorId,
    payApiDateRange.from,
    payApiDateRange.to,
    dataVersion,
  ]);

  useEffect(() => {
    if (activeTab !== 'pay' || !isAuthenticated) return;
    let cancelled = false;
    setPayRecentLoading(true);
    labourPaymentsAPI
      .recent({ vendors_id: payFilterVendorId, limit: 10 })
      .then((res) => {
        if (cancelled) return;
        const list = unwrapArrayPayload((res as Record<string, unknown>)?.data ?? res);
        setPayRecentRows(list);
      })
      .catch(() => {
        if (!cancelled) setPayRecentRows([]);
      })
      .finally(() => {
        if (!cancelled) setPayRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAuthenticated, payFilterVendorId, dataVersion]);

  useEffect(() => {
    if (!payDetailModalUuid || !isAuthenticated) {
      setPayDetailPayload(null);
      return;
    }
    let cancelled = false;
    setPayDetailLoading(true);
    setPayDetailPayload(null);
    labourPaymentsAPI
      .get(payDetailModalUuid)
      .then((res) => {
        if (!cancelled) setPayDetailPayload((res as Record<string, unknown>)?.data ?? res);
      })
      .catch(() => {
        if (!cancelled) setPayDetailPayload({ error: 'Failed to load payment' });
      })
      .finally(() => {
        if (!cancelled) setPayDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payDetailModalUuid, isAuthenticated]);

  // Camera for Punch
  useEffect(() => {
    if (!showCameraModal) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: punchCameraFacing } },
      })
      .then((s) => {
        stream = s;
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => toast.showError('Camera access denied: ' + (e.message || 'Enable camera')));
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCameraModal, punchCameraFacing, toast]);

  const performFacePunchSubmit = useCallback(
    async (photoBlob: Blob, kind: 'punch_in' | 'punch_out') => {
      if (!geoLocation) {
        toast.showWarning('Location is required. Please try again.');
        return;
      }
      if (companyId == null) {
        toast.showWarning('Company ID is missing from your profile');
        return;
      }
      const contextSnapshot: FaceStatusRow | null = null;
      setIsSubmittingPunch(true);
      try {
        let lat = geoLocation.latitude;
        let lng = geoLocation.longitude;
        let acc = geoLocation.accuracy;
        try {
          const fresh = await getFreshGeolocationForPunch();
          lat = fresh.latitude;
          lng = fresh.longitude;
          acc = fresh.accuracy;
        } catch {
          /* use coordinates from when punch flow opened */
        }

        const makeFacePunchFormData = (includeGeoAccuracy: boolean) => {
          const fd = new FormData();
          fd.append('company_id', String(companyId));
          fd.append('photo', photoBlob, 'punch.jpg');
          fd.append('latitude', String(lat));
          fd.append('longitude', String(lng));
          if (includeGeoAccuracy) {
            const accSend = clampGeoAccuracyForPunchRequest(acc);
            if (accSend != null) fd.append('geo_accuracy', String(accSend));
          }
          try {
            const info = `${navigator.userAgent || 'web'}`.slice(0, 500);
            fd.append('device_info', info);
          } catch {}
          appendPunchClientTimeFields(fd);
          return fd;
        };

        const postFacePunch = (fd: FormData) =>
          kind === 'punch_in' ? faceAttendanceAPI.punchIn(fd) : faceAttendanceAPI.punchOut(fd);

        let res: Awaited<ReturnType<typeof postFacePunch>>;
        try {
          res = await postFacePunch(makeFacePunchFormData(true));
        } catch (firstErr: unknown) {
          if (isGpsAccuracyTooPoor422(firstErr)) {
            try {
              res = await postFacePunch(makeFacePunchFormData(false));
            } catch (secondErr: unknown) {
              const gpsHelp =
                'Location accuracy is too uncertain for punch (server allows about 50 m or better). Move to a clearer GPS fix (e.g. outdoors), wait a few seconds, then try again—the map can look correct while the browser still reports a large uncertainty.';
              if (isGpsAccuracyTooPoor422(secondErr)) {
                toast.showWarning(gpsHelp);
                return;
              }
              throw secondErr;
            }
          } else {
            throw firstErr;
          }
        }

        setShowCameraModal(false);

        const punchAt = res?.punch_at ?? res?.punch_time ?? new Date().toISOString();
        const punchTime =
          typeof punchAt === 'string' && punchAt.includes('T')
            ? new Date(punchAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : String(punchAt);
        const employeeName = res?.employee_name ?? res?.name ?? 'Verified';
        const locStr =
          res?.location ??
          `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}${acc != null ? ` (±${Math.round(acc)}m)` : ''}`;

        const photoThumb = await punchPhotoThumbDataUrl(photoBlob);

        const rowMeta = faceStatusRowFromPunchResponse(
          res as Record<string, unknown>,
          contextSnapshot,
          user,
          faceAttendees
        );

        setFacePunchLog((prev) =>
          replacePunchLogEntryForSubject(prev, {
            uuid: res?.uuid,
            employee_name: employeeName,
            punch_type: res?.punch_type ?? kind,
            punch_at: punchAt,
            location: locStr,
            photoThumb,
            subjectType: rowMeta?.subjectType,
            subjectId: rowMeta?.subjectId,
            designation: rowMeta?.designation,
          })
        );

        setPunchSuccessData({
          punch_time: punchTime,
          punch_type: res?.punch_type ?? kind,
          employee_name: employeeName,
          ai_verification: res?.ai_verification ?? 'Face verified',
          location: locStr,
          uuid: res?.uuid,
        });
        setShowPunchSuccessModal(true);

        if (kind === 'punch_in') {
          setPunchType('punch_out');
        }

        await refreshFaceStatusToday({ quiet: true });
      } catch (e: any) {
        if (kind === 'punch_in' && isAlreadyPunchedIn422(e) && geoLocation) {
          setShowCameraModal(false);

          let lat = geoLocation.latitude;
          let lng = geoLocation.longitude;
          let acc = geoLocation.accuracy;
          try {
            const fresh = await getFreshGeolocationForPunch();
            lat = fresh.latitude;
            lng = fresh.longitude;
            acc = fresh.accuracy;
          } catch {
            /* use coordinates from punch flow */
          }

          const locStr = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}${acc != null ? ` (±${Math.round(acc)}m)` : ''}`;
          const punchAt = new Date().toISOString();
          const resolved = faceStatusRowFromPunchResponse({}, contextSnapshot, user, faceAttendees);
          if (resolved) {
            setPunchType('punch_out');
          }
          const employeeName = resolved?.name ?? user?.name ?? 'Verified';
          const photoThumb = await punchPhotoThumbDataUrl(photoBlob);
          setFacePunchLog((prev) =>
            appendPunchLogEntryIfNewSubject(prev, {
              employee_name: employeeName,
              punch_type: 'punch_in',
              punch_at: punchAt,
              location: `${locStr} · already in (synced)`,
              photoThumb,
              subjectType: resolved?.subjectType,
              subjectId: resolved?.subjectId,
              designation: resolved?.designation,
            })
          );
          toast.showInfo(e?.message || 'You are already punched in. Use Punch OUT.');
          try {
            await refreshFaceStatusToday({ quiet: true });
          } catch {
            /* ignore refresh failure */
          }
        } else if (isGpsAccuracyTooPoor422(e)) {
          toast.showWarning(
            'Location accuracy is too uncertain for punch (server allows about 50 m or better). Move to a clearer GPS fix, wait a few seconds, and try again.'
          );
        } else {
          toast.showError(e?.message || 'Failed to submit punch');
        }
      } finally {
        setIsSubmittingPunch(false);
      }
    },
    [geoLocation, companyId, user, faceAttendees, toast, refreshFaceStatusToday]
  );

  performFacePunchSubmitRef.current = performFacePunchSubmit;

  useEffect(() => {
    if (!showCameraModal) {
      setPunchHoldCountdown(null);
      return;
    }
    setPunchHoldCountdown(4);
    let cancelled = false;
    const kind = punchModalKind;
    const tick = window.setInterval(() => {
      setPunchHoldCountdown((n) => {
        if (n == null || n <= 1) return 1;
        return n - 1;
      });
    }, 1000);
    const run = window.setTimeout(async () => {
      window.clearInterval(tick);
      if (cancelled) return;
      setPunchHoldCountdown(0);
      let blob: Blob | null = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        if (cancelled) return;
        const v = videoRef.current;
        if (v && v.videoWidth > 0) {
          blob = await captureVideoFrameToJpegBlob(v);
          if (blob) break;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      if (cancelled) return;
      if (!blob) {
        toast.showError('Could not capture photo. Try again.');
        setShowCameraModal(false);
        return;
      }
      await performFacePunchSubmitRef.current(blob, kind);
    }, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(run);
      window.clearInterval(tick);
    };
  }, [showCameraModal, punchModalKind, toast]);

  const openPunchFlow = async () => {
    setPunchModalKind(punchType);
    setIsCheckingPermissions(true);
    try {
      // 1. Check location permission first
      const locationOk = await new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) {
          toast.showWarning('Geolocation is not supported by your browser');
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude ?? undefined,
            });
            resolve(true);
          },
          (err) => {
            toast.showWarning('Location access is required. Please enable location permission.');
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      if (!locationOk) return;

      // 2. Check camera permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: punchCameraFacing } },
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast.showWarning('Camera access is required. Please enable camera permission.');
        return;
      }

      setShowCameraModal(true);
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const filteredFaceAttendees = (staffFilter === 'staff' ? faceAttendeesStaff : faceAttendeesOwnLabor).filter(
    (a) =>
      !staffSearchQuery.trim() ||
      [a.name, a.email, a.designation].some((v) =>
        String(v || '').toLowerCase().includes(staffSearchQuery.toLowerCase())
      )
  );

  /** Staff tab: company users & own labour from GET /face/attendees only (no teams-list). */
  const staffTabFaceRows: FaceAttendeeRow[] = useMemo(() => filteredFaceAttendees, [filteredFaceAttendees]);

  const staffTableLoading = faceAttendeesLoading;

  const handleAddProfileSubmit = async () => {
    const { name, project_id, designation, worker_type, profile_images, email, mobile } = staffFormData;
    if (!name.trim()) {
      toast.showWarning('Full Name is required');
      return;
    }
    if (!project_id) {
      toast.showWarning('Project is required');
      return;
    }
    if (!designation.trim()) {
      toast.showWarning('Designation is required');
      return;
    }
    if (companyId == null) {
      toast.showWarning('Company ID is missing from your profile');
      return;
    }
    if (email.trim() && !isValidEmailAddress(email)) {
      toast.showWarning(EMAIL_INVALID_MESSAGE);
      return;
    }
    setIsSubmittingStaff(true);
    try {
      const fd = new FormData();
      fd.append('company_id', String(companyId));
      fd.append('name', name.trim());
      fd.append('project_id', project_id);
      fd.append('designation', designation.trim());
      fd.append('worker_type', worker_type === 'own_labor' ? 'own_labour' : 'staff');
      if (email.trim()) fd.append('email', email.trim());
      if (mobile.trim()) fd.append('mobile', mobile.trim());
      if (profile_images) fd.append('profile_photo', profile_images);
      await workforceProfilesAPI.create(fd);
      toast.showSuccess('Workforce profile created');
      setShowAddProfileModal(false);
      setStaffFormData({
        name: '',
        project_id: '',
        designation: '',
        worker_type: 'staff',
        email: '',
        mobile: '',
        profile_images: null,
      });
      const params = companyId != null ? { company_id: companyId } : {};
      faceAttendanceAPI
        .attendees(params)
        .then((res) => {
          const { staff, ownLabor } = applyFaceAttendeesApiPayload(res);
          setFaceAttendeesStaff(staff);
          setFaceAttendeesOwnLabor(ownLabor);
        })
        .catch(() => {});
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to create profile');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleEnrollSubmit = async () => {
    if (!enrollTarget || companyId == null) {
      toast.showWarning('Select a person and ensure company is set');
      return;
    }
    const mayReEnroll = userMaySubmitReEnroll(user as Record<string, unknown> | null, enrollTarget, reEnrollOk);
    const doingReEnroll = mayReEnroll;
    if (!enrollTarget.enrolled) {
      if (!canOpenEnrollForRow(user as Record<string, unknown> | null, enrollTarget, enrollOthersOk)) {
        toast.showWarning('You can only enroll your own face unless you are a manager');
        return;
      }
    } else if (!mayReEnroll) {
      toast.showWarning('Re-enrollment is only available for your own account or to a super-admin/manager.');
      return;
    }
    if (enrollImages.length < 2) {
      toast.showWarning('Capture at least 2 live frames from the camera (varying angle/light).');
      return;
    }
    setIsSubmittingEnroll(true);
    try {
      const fd = new FormData();
      fd.append('company_id', String(companyId));
      fd.append('subject_type', enrollTarget.subjectType);
      fd.append('subject_id', String(enrollTarget.subjectId));
      enrollImages.forEach((file) => fd.append('images[]', file));
      if (enrollConsent) fd.append('consent', '1');
      if (doingReEnroll) await faceAttendanceAPI.reEnroll(fd);
      else await faceAttendanceAPI.enroll(fd);
      toast.showSuccess(doingReEnroll ? 'Face re-enrolled' : 'Face enrolled');
      setShowEnrollModal(false);
      setEnrollTarget(null);
      setEnrollImages([]);
      setEnrollConsent(false);
      const params = companyId != null ? { company_id: companyId } : {};
      const res = await faceAttendanceAPI.attendees(params);
      const { staff, ownLabor } = applyFaceAttendeesApiPayload(res);
      setFaceAttendeesStaff(staff);
      setFaceAttendeesOwnLabor(ownLabor);
    } catch (e: any) {
      toast.showError(e?.message || 'Enrollment failed');
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const resolveLabourRowRate = useCallback(async (rowIndex: number, rowOverride?: Partial<LabourEntryRow>) => {
    const { date, project_id, contractor_id, labourRows } = labourEntryFormRef.current;
    const base = labourRows[rowIndex];
    if (!base) return;
    const row = { ...base, ...rowOverride };
    if (!date || !project_id || !contractor_id || !row.labourId) {
      if (rowOverride?.labourId) {
        toast.showWarning('Select project, contractor, and work date first');
      }
      return;
    }
    const merge = rowOverride ?? {};
    setLabourEntryFormData((p) => ({
      ...p,
      labourRows: p.labourRows.map((r, i) =>
        i === rowIndex ? { ...r, ...merge, resolving: true, resolveError: undefined } : r
      ),
    }));
    try {
      const res = await labourEntriesAPI.resolveRate({
        project_id: Number(project_id),
        vendors_id: Number(contractor_id),
        labours_id: Number(row.labourId),
        work_date: date,
      });
      const payload = (res as any)?.data ?? res;
      setLabourEntryFormData((p) => ({
        ...p,
        labourRows: p.labourRows.map((r, i) =>
          i === rowIndex
            ? {
                ...r,
                resolving: false,
                resolveError: undefined,
                contractorLaborRateId:
                  payload.contractor_labor_rate_id ?? payload.contractorLaborRateId ?? null,
                dailyRate: Number(payload.daily_rate ?? payload.dailyRate),
                dayUnit: toApiDayHourUnit(payload.day_unit ?? payload.dayUnit),
                otRate: Number(payload.ot_rate ?? payload.otRate ?? 0),
                otUnit: toApiDayHourUnit(payload.ot_unit ?? payload.otUnit ?? 'hour'),
                currencyCode: (payload.currency_code as string) ?? null,
                hoursPerDay:
                  payload.hours_per_day != null ? Number(payload.hours_per_day) : undefined,
              }
            : r
        ),
      }));
    } catch (e: any) {
      setLabourEntryFormData((p) => ({
        ...p,
        labourRows: p.labourRows.map((r, i) =>
          i === rowIndex
            ? {
                ...r,
                resolving: false,
                resolveError: e?.message || 'Could not resolve rate',
                contractorLaborRateId: null,
                dailyRate: null,
                dayUnit: null,
                otRate: null,
                otUnit: null,
              }
            : r
        ),
      }));
    }
  }, [toast]);

  const handleAddLabourEntry = async () => {
    const { date, project_id, contractor_id, labourRows } = labourEntryFormData;
    if (!date) {
      toast.showWarning('Date is required');
      return;
    }
    if (!project_id) {
      toast.showWarning('Project is required');
      return;
    }
    if (!contractor_id) {
      toast.showWarning('Contractor is required');
      return;
    }
    const project = contractorProjects.find((p) => String(p.id) === String(project_id));
    const contractor = vendors.find((v) => String(v.id) === String(contractor_id));
    const projectName = project?.name ?? '';
    const contractorName = contractor?.name ?? '';
    const validRows = labourRows.filter((r) => r.labourId && r.labourName.trim());
    if (validRows.length === 0) {
      toast.showWarning('Add at least one labour line');
      return;
    }
    const seen = new Set<string>();
    for (const r of validRows) {
      const k = String(r.labourId);
      if (seen.has(k)) {
        toast.showWarning('Duplicate labour category in the same submit is not allowed');
        return;
      }
      seen.add(k);
    }
    for (let i = 0; i < labourRows.length; i++) {
      const r = labourRows[i];
      if (!r.labourId) continue;
      if (r.dailyRate == null || Number.isNaN(r.dailyRate) || !r.dayUnit || r.otRate == null || !r.otUnit) {
        toast.showWarning(`Resolve rates for every line (row ${i + 1})`);
        return;
      }
      const dlc = r.dayLabourCount === '' ? 0 : Math.max(0, Math.floor(Number(r.dayLabourCount)));
      if (dlc < 0) {
        toast.showWarning(`Invalid day labour count on row ${i + 1}`);
        return;
      }
    }
    const categories = validRows.map((r) => {
      const dlc = r.dayLabourCount === '' ? 0 : Math.max(0, Math.floor(Number(r.dayLabourCount)));
      const ot =
        r.overtimeHours === ''
          ? 0
          : Math.max(0, Math.floor(Number(r.overtimeHours) || 0));
      return {
        labours_id: Number(r.labourId),
        day_labour_count: dlc,
        day_labour_count_unit: r.labourCountUnit,
        overtime_hours: ot,
        overtime_quantity_unit: r.overtimeQtyUnit,
        daily_rate: Number(r.dailyRate),
        day_unit: r.dayUnit as 'day' | 'hour',
        ot_rate: Number(r.otRate),
        ot_unit: r.otUnit as 'day' | 'hour',
        contractor_labor_rate_id: r.contractorLaborRateId ?? undefined,
      };
    });
    setIsSubmittingLabourEntry(true);
    try {
      const body: Parameters<typeof labourEntriesAPI.create>[0] = {
        work_date: date,
        project_id: Number(project_id),
        vendors_id: Number(contractor_id),
        labour_categories: categories,
      };
      const cc = validRows.find((r) => r.currencyCode)?.currencyCode;
      if (cc) body.currency_code = String(cc).slice(0, 3);
      await labourEntriesAPI.create(body);
      toast.showSuccess(`Labour entry submitted (${validRows.length} line${validRows.length > 1 ? 's' : ''})`);
      if (projectName && contractorName) {
        for (const row of validRows) {
          const dlc = row.dayLabourCount === '' ? 0 : Math.max(0, Math.floor(Number(row.dayLabourCount)));
          const ot =
            row.overtimeHours === ''
              ? 0
              : Math.max(0, Number(row.overtimeHours) || 0);
          const rate = getRateForDate(projectName, contractorName, row.rateCategory, date);
          saveContractorEntry({
            projectName,
            contractorName,
            category: row.labourName.trim(),
            rateCategory: row.rateCategory,
            headCount: Math.max(1, dlc || 1),
            labourCountUnit: row.labourCountUnit,
            unitsWorked: 1,
            otHoursPerPerson: ot,
            overtimeQtyUnit: row.overtimeQtyUnit,
            date,
          });
        }
      }
      setShowAddLabourEntryModal(false);
      setDataVersion((v) => v + 1);
      setLabourEntryFormData({
        date: new Date().toISOString().slice(0, 10),
        project_id: '',
        contractor_id: '',
        labourRows: [defaultLabourRow()],
      });
    } catch (e: any) {
      const rd = e?.responseData as any;
      const mismatch = rd?.RATE_MISMATCH_MESSAGE ?? rd?.rate_mismatch_message;
      if (mismatch) {
        toast.showError(typeof mismatch === 'string' ? mismatch : 'Rate mismatch — re-resolve lines and submit again');
      } else if (rd?.failed_labour_category_index != null) {
        toast.showError(
          `Check line ${Number(rd.failed_labour_category_index) + 1}: ${e?.message || 'Validation failed'}`
        );
      } else {
        toast.showError(e?.message || 'Failed to submit labour entry');
      }
    } finally {
      setIsSubmittingLabourEntry(false);
    }
  };

  const handleStoreRate = async () => {
    setRatesFieldErrors({});
    const projectId = ratesFormData.project_id;
    const vendorId = ratesFormData.vendor_id;
    const labourId = ratesFormData.labour_id;
    const dailyRate = parseFloat(ratesFormData.daily_rate);
    const otRaw = ratesFormData.overtime_rate.trim();
    const otAmt = otRaw ? parseFloat(otRaw) : 0;
    if (!projectId) {
      toast.showWarning('Select a project');
      return;
    }
    if (!vendorId) {
      toast.showWarning('Select a contractor');
      return;
    }
    if (!labourId) {
      toast.showWarning('Select a labour category');
      return;
    }
    if (isNaN(dailyRate) || dailyRate < 0) {
      toast.showWarning('Valid daily rate amount is required');
      return;
    }
    if (otAmt > 0 && !ratesFormData.overtime_unit) {
      toast.showWarning('Overtime unit is required when OT amount is greater than 0');
      return;
    }
    const selectedLabour = rateFormOptions.labours.find((l: any) => String(l.id ?? l.numericId) === String(labourId));
    const labourHistLabel = selectedLabour
      ? String(selectedLabour.name || selectedLabour.project_name || '')
      : '';
    const contractor = rateFormOptions.contractors.find(
      (v: any) => String(v.id ?? v.uuid) === String(vendorId)
    );
    setIsSubmittingRate(true);
    try {
      const body: Parameters<typeof contractorLaborRatesAPI.create>[0] = {
        project_id: Number(projectId),
        vendors_id: Number(vendorId),
        labours_id: Number(labourId),
        daily_rate_amount: dailyRate,
        daily_rate_unit: ratesFormData.daily_rate_unit,
        effective_from: ratesFormData.effective_from,
      };
      if (otAmt > 0) {
        body.overtime_rate_amount = otAmt;
        body.overtime_rate_unit = ratesFormData.overtime_unit;
      }
      if (ratesFormData.hours_per_day.trim()) {
        const h = parseFloat(ratesFormData.hours_per_day);
        if (!isNaN(h) && h >= 0 && h <= 24) body.hours_per_day = h;
      }
      if (ratesFormData.currency_code.trim().length >= 3) {
        body.currency_code = ratesFormData.currency_code.trim().slice(0, 3).toUpperCase();
      }
      if (ratesFormData.notes.trim()) body.notes = ratesFormData.notes.trim().slice(0, 5000);
      await contractorLaborRatesAPI.create(body);
      toast.showSuccess('Contractor labour rate saved');
      setRateHistory((prev) => [
        ...prev,
        {
          category: labourHistLabel,
          contractor: String(contractor?.name || ''),
          effectiveFrom: ratesFormData.effective_from,
          dailyRate: ratesFormData.daily_rate,
          overtimeRate: ratesFormData.overtime_rate || '0',
        },
      ]);
      setShowRatesModal(false);
      setRatesLabourDropdownOpen(false);
      setRatesLabourSearch('');
      setRatesFormData({
        project_id: '',
        vendor_id: '',
        labour_id: '',
        daily_rate: '',
        daily_rate_unit: 'day',
        overtime_rate: '',
        overtime_unit: 'hour',
        effective_from: new Date().toISOString().slice(0, 10),
        hours_per_day: '',
        currency_code: '',
        notes: '',
      });
      setDataVersion((v) => v + 1);
    } catch (e: any) {
      const errObj = e?.errors as Record<string, string[] | string> | undefined;
      if (errObj && typeof errObj === 'object') {
        const flat: Record<string, string> = {};
        Object.entries(errObj).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setRatesFieldErrors(flat);
      }
      toast.showError(e?.message || 'Failed to save rate');
    } finally {
      setIsSubmittingRate(false);
    }
  };

  const handleConfirmPayment = async () => {
    const amount = parseFloat(paymentFormData.amount);

    if (isAuthenticated) {
      const selected = payUnpaidRows.filter((e) => selectedPayUuids.has(e.uuid));
      if (selected.length === 0) {
        toast.showWarning('No entries selected');
        return;
      }
      const vendorKeys = new Set(
        selected.map((e) => (e.vendorsId != null ? String(e.vendorsId) : e.contractorName))
      );
      if (vendorKeys.size > 1) {
        toast.showWarning('All selected labour entries must belong to the same contractor');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        toast.showWarning('Enter a valid amount');
        return;
      }
      const idempotency_key =
        paymentIdempotencyKeyRef.current ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
      paymentIdempotencyKeyRef.current = idempotency_key;

      const labour_entries = buildLabourEntriesManualPayload(selected, amount);
      if (labour_entries.length === 0) {
        toast.showWarning('Could not build payment lines');
        return;
      }

      setIsSubmittingPayment(true);
      try {
        await labourPaymentsAPI.manual({
          idempotency_key,
          labour_entries,
          manual_method: mapPaymentModeToApi(paymentFormData.mode),
          manual_reference: paymentFormData.reference.trim() || undefined,
          paid_at: localDatetimeToApiPaidAt(paymentFormData.paid_at),
          currency_code: paymentFormData.currency_code.trim().slice(0, 3).toUpperCase() || 'INR',
          notes: paymentFormData.notes.trim() || undefined,
        });
        toast.showSuccess('Payment recorded successfully');
        paymentIdempotencyKeyRef.current = null;
        setShowPaymentModal(false);
        setSelectedPayUuids(new Set());
        setPaymentFormData({
          amount: '',
          mode: 'Cash',
          reference: '',
          notes: '',
          paid_at: defaultPaidAtLocal(),
          currency_code: 'INR',
        });
        setDataVersion((v) => v + 1);
      } catch (e: any) {
        toast.showError(e?.message || 'Failed to record payment');
      } finally {
        setIsSubmittingPayment(false);
      }
      return;
    }

    const entryIds = Array.from(selectedPayEntryIds);
    const unpaid = getContractorEntries().filter((e) => !e.paid && entryIds.includes(e.id));
    if (entryIds.length === 0 || unpaid.length === 0) {
      toast.showWarning('No entries selected');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.showWarning('Enter a valid amount');
      return;
    }
    const first = unpaid[0];
    setIsSubmittingPayment(true);
    try {
      savePayment({
        contractorName: first.contractorName,
        projectName: first.projectName,
        amount,
        mode: paymentFormData.mode,
        reference: paymentFormData.reference || undefined,
        entryIds,
        date: new Date().toISOString().slice(0, 10),
      });
      toast.showSuccess('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedPayEntryIds(new Set());
      setPaymentFormData({
        amount: '',
        mode: 'Cash',
        reference: '',
        notes: '',
        paid_at: defaultPaidAtLocal(),
        currency_code: 'INR',
      });
      setDataVersion((v) => v + 1);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const labourEntryFormPanel = (
                <div className="p-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Work date *</label>
                    <input
                      type="date"
                      value={labourEntryFormData.date}
                      onChange={(e) =>
                        setLabourEntryFormData((p) => ({
                          ...p,
                          date: e.target.value,
                          labourRows: clearLabourRowRateFields(p.labourRows),
                        }))
                      }
                      className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  {labourEntryFormOptionsLoading && (
                    <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading form-options…
                    </div>
                  )}
                 
                  <div ref={labourEntryProjectRef} className="relative">
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project *</label>
                    <div
                      onClick={() => setLabourEntryProjectDropdownOpen((o) => !o)}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} cursor-pointer min-h-[42px]`}
                    >
                      <span className="flex-1 text-left truncate">
                        {labourEntryFormData.project_id
                          ? entryProjectList.find((p) => String(p.id) === String(labourEntryFormData.project_id))?.name ||
                            '— Select project —'
                          : '— Select project —'}
                      </span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${labourEntryProjectDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {labourEntryProjectDropdownOpen && (
                      <div className={`absolute left-0 right-0 top-full mt-1 rounded-lg border ${borderClass} ${isDark ? 'bg-dropdown-panel' : 'bg-white'} shadow-lg z-50 overflow-hidden max-h-64 flex flex-col`}>
                        <div className="flex items-center gap-1 p-2 border-b border-inherit">
                          <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search projects..."
                            value={labourEntryProjectSearch}
                            onChange={(e) => setLabourEntryProjectSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`flex-1 min-w-0 py-1.5 px-2 rounded border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-900' : 'bg-slate-50'} text-sm`}
                          />
                        </div>
                        <div className="overflow-y-auto flex-1">
                          {entryProjectList
                            .filter((p) => !labourEntryProjectSearch.trim() || p.name.toLowerCase().includes(labourEntryProjectSearch.toLowerCase()))
                            .map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setLabourEntryFormData((prev) => ({
                                    ...prev,
                                    project_id: String(p.id),
                                    labourRows: clearLabourRowRateFields(prev.labourRows),
                                  }));
                                  setLabourEntryProjectDropdownOpen(false);
                                  setLabourEntryProjectSearch('');
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-[#6B8E23]/10 ${String(p.id) === String(labourEntryFormData.project_id) ? 'bg-[#6B8E23]/20' : ''} ${textPrimary}`}
                              >
                                {p.name}
                              </div>
                            ))}
                          {entryProjectList.filter((p) => !labourEntryProjectSearch.trim() || p.name.toLowerCase().includes(labourEntryProjectSearch.toLowerCase())).length === 0 && (
                            <div className={`px-4 py-3 text-sm ${textSecondary}`}>
                              No projects.{' '}
                              <Link href="/masters/projects" className="text-[#6B8E23] underline font-bold">
                                Masters
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={labourEntryContractorRef} className="relative">
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Contractor *</label>
                    <div
                      onClick={() => setLabourEntryContractorDropdownOpen((o) => !o)}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} cursor-pointer min-h-[42px]`}
                    >
                      <span className="flex-1 text-left truncate">
                        {labourEntryFormData.contractor_id
                          ? entryContractorList.find((v) => String(v.id) === String(labourEntryFormData.contractor_id))
                              ?.name || '— Select contractor —'
                          : '— Select contractor —'}
                      </span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${labourEntryContractorDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {labourEntryContractorDropdownOpen && (
                      <div className={`absolute left-0 right-0 top-full mt-1 rounded-lg border ${borderClass} ${isDark ? 'bg-dropdown-panel' : 'bg-white'} shadow-lg z-50 overflow-hidden max-h-64 flex flex-col`}>
                        <div className="flex items-center gap-1 p-2 border-b border-inherit">
                          <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search contractors..."
                            value={labourEntryContractorSearch}
                            onChange={(e) => setLabourEntryContractorSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`flex-1 min-w-0 py-1.5 px-2 rounded border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-900' : 'bg-slate-50'} text-sm`}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLabourEntryContractorDropdownOpen(false);
                              setShowAddVendorModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-[#6B8E23]/20 text-[#6B8E23] transition-colors"
                            title="Add contractor"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                          {entryContractorList
                            .filter((v) => !labourEntryContractorSearch.trim() || (v.name || '').toLowerCase().includes(labourEntryContractorSearch.toLowerCase()))
                            .map((v) => (
                              <div
                                key={v.id}
                                onClick={() => {
                                  setLabourEntryFormData((prev) => ({
                                    ...prev,
                                    contractor_id: String(v.id),
                                    labourRows: clearLabourRowRateFields(prev.labourRows),
                                  }));
                                  setLabourEntryContractorDropdownOpen(false);
                                  setLabourEntryContractorSearch('');
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-[#6B8E23]/10 ${String(v.id) === String(labourEntryFormData.contractor_id) ? 'bg-[#6B8E23]/20' : ''} ${textPrimary}`}
                              >
                                {v.name}
                              </div>
                            ))}
                          {entryContractorList.filter((v) => !labourEntryContractorSearch.trim() || (v.name || '').toLowerCase().includes(labourEntryContractorSearch.toLowerCase())).length === 0 && (
                            <div className={`px-4 py-3 text-sm ${textSecondary}`}>
                              No contractors.{' '}
                              <Link href="/masters/vendors" className="text-[#6B8E23] underline font-bold">
                                Create contractor in Masters
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Labour Details - multiple categories */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-sm font-bold ${textPrimary}`}>Labour Details</label>
                      <button
                        type="button"
                        onClick={() =>
                          setLabourEntryFormData((p) => ({
                            ...p,
                            labourRows: [...p.labourRows, defaultLabourRow()],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Type
                      </button>
                    </div>
                    <div className="space-y-4">
                      {labourEntryFormData.labourRows.map((row, idx) => {
                        const project = entryProjectList.find((p) => String(p.id) === String(labourEntryFormData.project_id));
                        const contractor = entryContractorList.find((v) => String(v.id) === String(labourEntryFormData.contractor_id));
                        const projectName = project?.name ?? '';
                        const contractorName = contractor?.name ?? '';
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-bold ${textSecondary}`}>Line {idx + 1}</span>
                              {labourEntryFormData.labourRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLabourEntryFormData((p) => ({
                                      ...p,
                                      labourRows: p.labourRows.filter((_, i) => i !== idx),
                                    }))
                                  }
                                  className={`text-xs ${textSecondary} hover:text-red-500`}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                  Labour category (from Masters)
                                </label>
                                <select
                                  value={row.labourId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const lab = entryLabourPicks.find((l) => String(l.numericId) === id);
                                    const category = lab?.category ?? 'skilled';
                                    setLabourEntryFormData((p) => ({
                                      ...p,
                                      labourRows: p.labourRows.map((r, i) =>
                                        i === idx
                                          ? {
                                              ...r,
                                              labourId: id,
                                              labourName: lab?.name ?? '',
                                              rateCategory: category,
                                              contractorLaborRateId: null,
                                              dailyRate: null,
                                              dayUnit: null,
                                              otRate: null,
                                              otUnit: null,
                                              resolveError: undefined,
                                              resolving: false,
                                            }
                                          : r
                                      ),
                                    }));
                                    if (id) {
                                      void resolveLabourRowRate(idx, {
                                        labourId: id,
                                        labourName: lab?.name ?? '',
                                        rateCategory: category,
                                      });
                                    }
                                  }}
                                  disabled={labourEntryFormOptionsLoading}
                                  className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'} disabled:opacity-60`}
                                >
                                  <option value="">
                                    {labourEntryFormOptionsLoading ? 'Loading…' : '— Select labour —'}
                                  </option>
                                  {entryLabourPicks.map((l) => (
                                    <option key={String(l.numericId)} value={String(l.numericId)}>
                                      {l.name}
                                    </option>
                                  ))}
                                </select>
                                {row.resolving && (
                                  <p className={`text-xs mt-1 ${textSecondary}`}>Loading contractor rate…</p>
                                )}
                                {row.resolveError && (
                                  <p className="text-xs text-red-500 mt-1">{row.resolveError}</p>
                                )}
                                {row.dailyRate != null && row.dayUnit && (
                                  <div className={`mt-2 flex flex-wrap gap-2 text-xs ${textPrimary}`}>
                                    <span className="px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-700/50">
                                      Daily: {row.dailyRate} / {row.dayUnit}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-700/50">
                                      OT: {row.otRate ?? 0} / {row.otUnit ?? 'hour'}
                                    </span>
                                    {row.contractorLaborRateId != null && (
                                      <span className="px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-700/50">
                                        Rate id: {row.contractorLaborRateId}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="min-w-0">
                                    <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                      Head count *
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={row.dayLabourCount}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '');
                                        setLabourEntryFormData((p) => ({
                                          ...p,
                                          labourRows: p.labourRows.map((r, i) =>
                                            i === idx ? { ...r, dayLabourCount: v === '' ? '' : Math.max(0, parseInt(v, 10) || 0) } : r
                                          ),
                                        }));
                                      }}
                                      className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Unit</label>
                                    <select
                                      value={row.labourCountUnit}
                                      onChange={(e) =>
                                        setLabourEntryFormData((p) => ({
                                          ...p,
                                          labourRows: p.labourRows.map((r, i) =>
                                            i === idx
                                              ? { ...r, labourCountUnit: e.target.value as 'day' | 'hour' }
                                              : r
                                          ),
                                        }))
                                      }
                                      className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                                    >
                                      <option value="day">Days</option>
                                      <option value="hour">Hrs</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="min-w-0">
                                    <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                      OT (per person, optional)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={row.overtimeHours}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '');
                                        setLabourEntryFormData((p) => ({
                                          ...p,
                                          labourRows: p.labourRows.map((r, i) =>
                                            i === idx ? { ...r, overtimeHours: v === '' ? '' : Math.max(0, parseInt(v, 10) || 0) } : r
                                          ),
                                        }));
                                      }}
                                      className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Unit</label>
                                    <select
                                      value={row.overtimeQtyUnit}
                                      onChange={(e) =>
                                        setLabourEntryFormData((p) => ({
                                          ...p,
                                          labourRows: p.labourRows.map((r, i) =>
                                            i === idx
                                              ? { ...r, overtimeQtyUnit: e.target.value as 'day' | 'hour' }
                                              : r
                                          ),
                                        }))
                                      }
                                      className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                                    >
                                      <option value="hour">Hrs</option>
                                      <option value="day">Days</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddLabourEntry()}
                      disabled={isSubmittingLabourEntry}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] disabled:opacity-50"
                    >
                      {isSubmittingLabourEntry ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Submit (POST /labour-entries)
                    </button>
                    {showAddLabourEntryModal && (
                      <button
                        onClick={() => {
                          setShowAddLabourEntryModal(false);
                          setLabourEntryProjectDropdownOpen(false);
                          setLabourEntryContractorDropdownOpen(false);
                          setLabourEntryProjectSearch('');
                          setLabourEntryContractorSearch('');
                        }}
                        className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
  );
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
              <UsersRound className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B8E23]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${textPrimary}`}>Workforce</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest ${textSecondary}`}>
            Attendance (Punch), Staff & Contractor management
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`rounded-xl border ${borderClass} overflow-hidden ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
        <div className="flex flex-wrap sm:flex-nowrap border-b border-inherit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? isDark
                    ? 'text-[#C2D642] bg-slate-700/50 border-b-2 border-[#C2D642]'
                    : 'text-[#6B8E23] bg-white border-b-2 border-[#6B8E23]'
                  : `${textSecondary} hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className={`p-4 sm:p-5 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Attendance report (API)</h3>
              
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className={`block text-xs font-bold ${textSecondary} mb-1`}>From</label>
                    <input
                      type="date"
                      value={attReportFrom}
                      onChange={(e) => setAttReportFrom(e.target.value)}
                      className={`px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold ${textSecondary} mb-1`}>To</label>
                    <input
                      type="date"
                      value={attReportTo}
                      onChange={(e) => setAttReportTo(e.target.value)}
                      className={`px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  <div className="min-w-[160px]">
                    <label className={`block text-xs font-bold ${textSecondary} mb-1`}>Project (optional)</label>
                    <select
                      value={attReportProjectId}
                      onChange={(e) => setAttReportProjectId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    >
                      <option value="">All</option>
                      {contractorProjects.map((p) => (
                        <option key={String(p.id)} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchAttendanceReport()}
                    disabled={attReportLoading || companyId == null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#6B8E23] text-white disabled:opacity-50"
                  >
                    {attReportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load report
                  </button>
                </div>
                {companyId == null && (
                  <p className={`mt-3 text-xs ${textSecondary}`}>Company ID missing from profile — report unavailable.</p>
                )}
                {attReportRows.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-inherit max-h-72 overflow-y-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className={`sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <tr className={`border-b ${borderClass}`}>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Date</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Name</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Type</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>In</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Out</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attReportRows.map((row: any, i: number) => (
                          <tr key={i} className={`border-b border-inherit ${textPrimary}`}>
                            <td className="py-2 px-2">{row.attendance_date ?? row.date ?? '—'}</td>
                            <td className="py-2 px-2">{row.subject_name ?? row.name ?? '—'}</td>
                            <td className="py-2 px-2">{row.subject_type ?? '—'}</td>
                            <td className="py-2 px-2">{row.first_punch_in ?? row.punch_in ?? '—'}</td>
                            <td className="py-2 px-2">{row.last_punch_out ?? row.punch_out ?? '—'}</td>
                            <td className="py-2 px-2">{row.total_hours ?? row.totalHours ?? (row.total_seconds != null ? `${(Number(row.total_seconds) / 3600).toFixed(2)}h` : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <WorkforceDashboardTab
                theme={theme}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderClass={borderClass}
                projects={contractorProjects}
              />
            </div>
          )}

          {/* PUNCH TAB — face verify (no labour_id); lists from status-today */}
          {activeTab === 'punch' && (
            <div className="space-y-6">
              {faceSetupLoading && (
                <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking face setup for your company…
                </div>
              )}
              {!faceSetupLoading && faceSetupOk === false && faceSetupError && (
                <div className={`p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-sm ${textPrimary}`}>
                  <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">Face attendance not ready</p>
                  <p className={textSecondary}>{faceSetupError}</p>
                  <p className={`mt-2 text-xs ${textSecondary}`}>
                    Run Azure face setup for the company first. Punch actions may return errors until setup succeeds.
                  </p>
                </div>
              )}
              {!faceSetupLoading && faceSetupOk === true && user?.id != null && companyId != null && (
                <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs ${textSecondary}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-inherit">Your face (GET /face/check):</span>
                    {punchSelfFaceCheck?.loading ? (
                      <span>Checking…</span>
                    ) : punchSelfFaceCheck?.is_enrolled ? (
                      <span>
                        Enrolled
                        {punchSelfFaceCheck.face_count != null ? ` · ${punchSelfFaceCheck.face_count} sample(s)` : ''}
                      </span>
                    ) : (
                      <>
                        {(() => {
                          const uid = Number(user.id);
                          const fromList = faceAttendees.find(
                            (row) => row.subjectType === 'company_user' && Number(row.subjectId) === uid
                          );
                          const selfTarget: FaceAttendeeRow =
                            fromList ??
                            {
                              subjectType: 'company_user',
                              subjectId: uid,
                              name:
                                String((user as Record<string, unknown>)?.name ?? 'Company user').trim() ||
                                'Company user',
                              email: (user as { email?: string })?.email,
                              designation: (user as { designation?: string })?.designation,
                              enrolled: false,
                            };
                          const canSelfFirstEnroll = canOpenEnrollForRow(
                            user as Record<string, unknown> | null,
                            selfTarget,
                            enrollOthersOk
                          );
                          return canSelfFirstEnroll ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEnrollTarget(selfTarget);
                                setEnrollImages([]);
                                setEnrollConsent(false);
                                setShowEnrollModal(true);
                              }}
                              disabled={showEnrollModal || isSubmittingEnroll}
                              className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] disabled:opacity-50 whitespace-nowrap"
                            >
                              Enroll
                            </button>
                          ) : null;
                        })()}
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Not enrolled</span>
                        <span className="text-inherit font-normal">
                          — use Staff if a manager must enroll you, or capture samples here when you have permission.
                        </span>
                      </>
                    )}
                  </div>
                  {!punchSelfFaceCheck?.loading && punchSelfFaceCheck?.is_enrolled && (
                    <button
                      type="button"
                      onClick={() => {
                        const uid = Number(user?.id);
                        const fromList = faceAttendees.find(
                          (a) => a.subjectType === 'company_user' && Number(a.subjectId) === uid
                        );
                        const selfTarget: FaceAttendeeRow =
                          fromList ??
                          {
                            subjectType: 'company_user',
                            subjectId: uid,
                            name:
                              String((user as Record<string, unknown>)?.name ?? 'Company user').trim() ||
                              'Company user',
                            email: (user as { email?: string })?.email,
                            designation: (user as { designation?: string })?.designation,
                            enrolled: true,
                          };
                        setEnrollTarget(selfTarget);
                        setEnrollImages([]);
                        setEnrollConsent(false);
                        setShowEnrollModal(true);
                      }}
                      disabled={showEnrollModal || isSubmittingEnroll}
                      className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10 disabled:opacity-50 whitespace-nowrap"
                    >
                      Re-enroll
                    </button>
                  )}
                </div>
              )}

              <div>
                <h3 className={`text-sm font-bold ${textSecondary} mb-3`}>Punch Type</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPunchType('punch_in')}
                    disabled={showCameraModal || isCheckingPermissions || isSubmittingPunch}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors ${
                      punchType === 'punch_in'
                        ? 'bg-[#6B8E23] text-white'
                        : isDark
                        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Punch IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunchType('punch_out')}
                    disabled={showCameraModal || isCheckingPermissions || isSubmittingPunch}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors ${
                      punchType === 'punch_out'
                        ? 'bg-[#6B8E23] text-white'
                        : isDark
                        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Punch OUT
                  </button>
                </div>
              </div>

              <p className={`text-sm ${textSecondary}`}>
                Choose <strong className="font-semibold">Punch IN</strong> or <strong className="font-semibold">Punch OUT</strong>, then use the button below. The camera and your location are used to verify your enrolled face and record attendance.
              </p>

              <div className="flex flex-col items-stretch sm:items-start gap-3">
                <button
                  type="button"
                  onClick={() => void openPunchFlow()}
                  disabled={showCameraModal || isCheckingPermissions || isSubmittingPunch}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-bold bg-[#6B8E23] hover:bg-[#5a7a1e] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isCheckingPermissions ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : (
                    <Camera className="w-5 h-5 shrink-0" />
                  )}
                  {punchType === 'punch_in' ? 'Punch IN' : 'Punch OUT'}
                </button>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className={`text-sm font-bold ${textPrimary}`}>
                    Recent punches
                    {statusTodayDate ? (
                      <span className={`font-normal ${textSecondary}`}> · {statusTodayDate}</span>
                    ) : null}
                  </h3>
                  {statusTodayLoading && (
                    <span className={`inline-flex items-center gap-1.5 text-xs ${textSecondary}`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading…
                    </span>
                  )}
                </div>
                <p className={`text-xs ${textSecondary} mb-4`}>
                  From <strong className="font-semibold text-inherit">status-today</strong>
                  {punchType === 'punch_in' ? (
                    <>
                      : <code className="text-[10px] opacity-80">data.punch_in</code>. Session punch-ins on this device are
                      merged below.
                    </>
                  ) : (
                    <>
                      : <code className="text-[10px] opacity-80">data.punch_out</code>. Session punch-outs on this device are
                      merged below.
                    </>
                  )}
                </p>

                <div className="space-y-6">
                  {punchType === 'punch_in' && (
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wide ${textPrimary} mb-2`}>Punch IN</h4>
                    <div className="overflow-x-auto rounded-lg border border-inherit">
                      <table className="w-full min-w-[360px]">
                        <thead>
                          <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Person</th>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>When</th>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentPunchInDisplayRows.length === 0 ? (
                            <tr>
                              <td colSpan={3} className={`py-6 text-center text-sm ${textSecondary}`}>
                                {statusTodayLoading ? (
                                  <span className="inline-flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                                  </span>
                                ) : (
                                  'No punch-in records for this date yet.'
                                )}
                              </td>
                            </tr>
                          ) : (
                            recentPunchInDisplayRows.map((r, idx) => (
                              <tr
                                key={`in-${punchEventDedupeKey(r)}-${idx}`}
                                className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}
                              >
                                <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{r.employee_name}</td>
                                <td className={`py-3 px-4 text-sm ${textPrimary}`}>
                                  {(() => {
                                    const d = new Date(r.punch_at);
                                    return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(r.punch_at);
                                  })()}
                                </td>
                                <td
                                  className={`py-3 px-4 text-xs ${textPrimary} max-w-[220px] truncate`}
                                  title={r.location}
                                >
                                  {r.location ?? '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  {punchType === 'punch_out' && (
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wide ${textPrimary} mb-2`}>Punch OUT</h4>
                    <div className="overflow-x-auto rounded-lg border border-inherit">
                      <table className="w-full min-w-[360px]">
                        <thead>
                          <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Person</th>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>When</th>
                            <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentPunchOutDisplayRows.length === 0 ? (
                            <tr>
                              <td colSpan={3} className={`py-6 text-center text-sm ${textSecondary}`}>
                                {statusTodayLoading ? (
                                  <span className="inline-flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                                  </span>
                                ) : (
                                  'No punch-out records for this date yet.'
                                )}
                              </td>
                            </tr>
                          ) : (
                            recentPunchOutDisplayRows.map((r, idx) => (
                              <tr
                                key={`out-${punchEventDedupeKey(r)}-${idx}`}
                                className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}
                              >
                                <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{r.employee_name}</td>
                                <td className={`py-3 px-4 text-sm ${textPrimary}`}>
                                  {(() => {
                                    const d = new Date(r.punch_at);
                                    return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(r.punch_at);
                                  })()}
                                </td>
                                <td
                                  className={`py-3 px-4 text-xs ${textPrimary} max-w-[220px] truncate`}
                                  title={r.location}
                                >
                                  {r.location ?? '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STAFF TAB */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Staff / Own Labour filter dropdown */}
                  <div className="relative" ref={staffFilterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setStaffFilterDropdownOpen((o) => !o)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${borderClass} ${
                        isDark ? 'bg-slate-800' : 'bg-white'
                      } ${textPrimary} text-sm font-medium min-w-[180px] justify-between`}
                    >
                      <span>{staffFilter === 'staff' ? 'Staff' : 'Own Labour'}</span>
                      {staffFilterDropdownOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>
                    {staffFilterDropdownOpen && (
                      <div
                        className={`absolute top-full left-0 mt-1 z-10 min-w-[180px] rounded-lg border ${borderClass} shadow-lg ${
                          isDark ? 'bg-slate-800' : 'bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFilter('staff');
                            setStaffFilterDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                            staffFilter === 'staff' ? 'bg-[#C2D642]/20 text-[#6B8E23] font-semibold' : ''
                          } hover:bg-black/5 dark:hover:bg-white/5`}
                        >
                          Staff
                          {staffFilter === 'staff' && <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStaffFilter('own_labor');
                            setStaffFilterDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                            staffFilter === 'own_labor' ? 'bg-[#C2D642]/20 text-[#6B8E23] font-semibold' : ''
                          } hover:bg-black/5 dark:hover:bg-white/5`}
                        >
                          Own Labour
                          {staffFilter === 'own_labor' && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1 max-w-xs sm:max-w-md">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                    <input
                      type="text"
                      placeholder="Search by name, email, designation..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${
                        isDark ? 'bg-slate-800' : 'bg-white'
                      } text-sm`}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowAddProfileModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white"
                >
                  <UserPlus className="w-4 h-4" />
                  Add field worker
                </button>
              </div>
            
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className={`border-b ${borderClass}`}>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Sr. No.</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Name</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Email</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Designation</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Face</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffTableLoading ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center ${textSecondary}`}>
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : staffTabFaceRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center ${textSecondary}`}>
                          {staffFilter === 'own_labor'
                            ? 'No own labour profiles in this filter (add field workers or check GET /face/attendees).'
                            : 'No company users in this filter.'}
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const staffStart = (staffPage - 1) * PAGINATION_PAGE_SIZE;
                        const staffPaginated = staffTabFaceRows.slice(staffStart, staffStart + PAGINATION_PAGE_SIZE);
                        return staffPaginated.map((a, idx) => {
                          const u = user as Record<string, unknown> | null;
                          const canFirstEnroll = !a.enrolled && canOpenEnrollForRow(u, a, enrollOthersOk);
                          const canReenroll = canReEnrollAttendanceRow(u, a);
                          return (
                            <tr
                              key={`${a.subjectType}-${a.subjectId}`}
                              className={`border-b ${borderClass} hover:bg-black/5 dark:hover:bg-white/5`}
                            >
                              <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{staffStart + idx + 1}</td>
                              <td className={`py-3 px-2 sm:px-4 text-sm font-medium ${textPrimary}`}>{a.name || '—'}</td>
                              <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{a.email || '—'}</td>
                              <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{a.designation || '—'}</td>
                              <td className={`py-3 px-2 sm:px-4 text-sm`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  {!a.enrolled && (
                                    <button
                                      type="button"
                                      title={
                                        canFirstEnroll
                                          ? 'First-time face enrollment (POST /face/enroll): add at least 2 live samples in the next step.'
                                          : a.subjectType === 'workforce_profile'
                                            ? 'Only managers (or users with enroll permissions) can enroll field workers.'
                                            : 'You can only enroll your own account unless you are a manager.'
                                      }
                                      onClick={() => {
                                        if (!canFirstEnroll) {
                                          toast.showWarning(
                                            a.subjectType === 'workforce_profile'
                                              ? 'Ask a manager to enroll this profile, or sign in with an account that can enroll others.'
                                              : 'You can only enroll your own face unless you are a manager.'
                                          );
                                          return;
                                        }
                                        setEnrollTarget(a);
                                        setEnrollImages([]);
                                        setEnrollConsent(false);
                                        setShowEnrollModal(true);
                                      }}
                                      className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                                        canFirstEnroll
                                          ? 'bg-[#6B8E23] text-white hover:bg-[#5a7a1e]'
                                          : 'bg-[#6B8E23]/25 text-[#6B8E23] border border-[#6B8E23]/40 hover:bg-[#6B8E23]/35'
                                      }`}
                                    >
                                      Enroll
                                    </button>
                                  )}
                                  <span
                                    className={`font-bold ${a.enrolled ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                                  >
                                    {a.enrolled ? 'Enrolled' : 'Not enrolled'}
                                  </span>
                                  {a.enrolled && (
                                    <button
                                      type="button"
                                      title={
                                        canReenroll
                                          ? 'Replace face enrollment (POST /face/re-enroll) with new live samples.'
                                          : a.subjectType === 'workforce_profile'
                                            ? 'Re-enroll for field workers requires a manager or super-admin.'
                                            : 'You can only re-enroll your own account unless you are a manager.'
                                      }
                                      onClick={() => {
                                        if (!canReenroll) {
                                          toast.showWarning(
                                            a.subjectType === 'workforce_profile'
                                              ? 'Only a super-admin or manager can re-enroll this profile. Ask someone with that access.'
                                              : 'You can only re-enroll your own face unless you are a manager.'
                                          );
                                          return;
                                        }
                                        setEnrollTarget(a);
                                        setEnrollImages([]);
                                        setEnrollConsent(false);
                                        setShowEnrollModal(true);
                                      }}
                                      className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                                        canReenroll
                                          ? 'border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10'
                                          : 'border border-[#6B8E23]/40 text-[#6B8E23] bg-[#6B8E23]/10 hover:bg-[#6B8E23]/20'
                                      }`}
                                    >
                                      Re-enroll
                                    </button>
                                  )}
                                </div>
                              </td>
                          
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
              {staffTabFaceRows.length > PAGINATION_PAGE_SIZE && (
                <div className={`flex flex-wrap items-center justify-between gap-2 mt-3 py-2 ${textSecondary} text-sm`}>
                  <span>
                    Showing {((staffPage - 1) * PAGINATION_PAGE_SIZE) + 1}-
                    {Math.min(staffPage * PAGINATION_PAGE_SIZE, staffTabFaceRows.length)} of {staffTabFaceRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                      disabled={staffPage <= 1}
                      className="p-1.5 rounded-lg border border-inherit hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-medium">
                      Page {staffPage} of {Math.ceil(staffTabFaceRows.length / PAGINATION_PAGE_SIZE) || 1}
                    </span>
                    <button
                      onClick={() =>
                        setStaffPage((p) =>
                          Math.min(Math.ceil(staffTabFaceRows.length / PAGINATION_PAGE_SIZE), p + 1)
                        )
                      }
                      disabled={staffPage >= Math.ceil(staffTabFaceRows.length / PAGINATION_PAGE_SIZE)}
                      className="p-1.5 rounded-lg border border-inherit hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTRACTOR TAB (Labor Logs) */}
          {activeTab === 'contractor' && (
            <div className="space-y-6">
              {/* Header: Labor Logs, Add Log, Rates icon */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className={`text-lg font-bold ${textPrimary}`}>Labor Logs</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRatesModal(true)}
                    className="p-2.5 rounded-lg border border-inherit hover:bg-black/5 dark:hover:bg-white/5"
                    title="Manage Rates"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowAddLabourEntryModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Log
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <h4 className={`text-sm font-bold ${textPrimary} mb-1`}>Contractor labour rates</h4>
                {apiContractorRatesFetchError && (
                  <p className={`text-sm text-amber-600 dark:text-amber-400 mb-2`}>{apiContractorRatesFetchError}</p>
                )}
                {apiContractorRatesLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#6B8E23]" />
                ) : apiContractorRates.length === 0 ? (
                  <p className={`text-sm ${textSecondary}`}>
                    No rate rows from the server. Offline rows below are not synced here until you create rates via
                    the API (or this app&apos;s rate modal) — empty GET responses are normal if none exist yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-inherit">
                    <table className="w-full min-w-[720px] text-xs">
                      <thead className={`sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <tr className={`border-b ${borderClass}`}>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Project</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Contractor</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Labour</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Daily</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>OT</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiContractorRates.map((r: any, i: number) => (
                          <tr
                            key={r.uuid ?? i}
                            className={`border-b border-inherit ${textPrimary} ${r.uuid ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                            onClick={() => r.uuid && setApiDetailModal({ kind: 'contractor_rate', uuid: String(r.uuid) })}
                            title={r.uuid ? 'View rate detail' : undefined}
                          >
                            <td className="py-2 px-2">
                              {r.project?.project_name ?? r.project?.name ?? r.project_name ?? '—'}
                            </td>
                            <td className="py-2 px-2">
                              {r.contractor?.name ?? r.vendor?.name ?? r.contractor_name ?? '—'}
                            </td>
                            <td className="py-2 px-2">
                              {r.labour?.name ?? r.labour_name ?? '—'}
                            </td>
                            <td className="py-2 px-2">
                              {r.daily_rate_amount ?? r.daily_rate ?? '—'} {r.daily_rate_unit ?? ''}
                            </td>
                            <td className="py-2 px-2">
                              {r.overtime_rate_amount ?? r.ot_rate ?? '—'} {r.overtime_rate_unit ?? r.ot_unit ?? ''}
                            </td>
                            <td className="py-2 px-2">{r.effective_from ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                <h4 className={`text-sm font-bold ${textPrimary} mb-1`}>Labour entries (server)</h4>
                <div className="flex flex-wrap gap-3 items-end mb-3">
                  <div>
                    <label className={`block text-xs font-bold ${textSecondary}`}>From</label>
                    <input
                      type="date"
                      value={entriesDateFrom}
                      onChange={(e) => setEntriesDateFrom(e.target.value)}
                      className={`px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold ${textSecondary}`}>To</label>
                    <input
                      type="date"
                      value={entriesDateTo}
                      onChange={(e) => setEntriesDateTo(e.target.value)}
                      className={`px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                </div>
                {apiLabourEntriesFetchError && (
                  <p className={`text-sm text-amber-600 dark:text-amber-400 mb-2`}>{apiLabourEntriesFetchError}</p>
                )}
                {apiLabourEntriesLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#6B8E23]" />
                ) : apiLabourEntries.length === 0 ? (
                  <p className={`text-sm ${textSecondary}`}>
                    No labour entries in this date range on the server. Local logs are browser-only; submit with
                    &quot;Add Log&quot; (POST /labour-entries) to persist to the backend.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[28rem] overflow-y-auto rounded-lg border border-inherit">
                    <table className="w-full min-w-[920px] text-xs">
                      <thead className={`sticky top-0 z-[1] ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <tr className={`border-b ${borderClass}`}>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Date</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Project</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Contractor</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Category / labour</th>
                          <th className={`text-right py-2 px-2 ${textSecondary}`}>Count</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Unit</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Over time</th>
                          <th className={`text-left py-2 px-2 ${textSecondary}`}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serverLabourLogRows.map((line) => (
                          <tr
                            key={line.lineKey}
                            className={`border-b border-inherit ${textPrimary} ${
                              line.entryUuid ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''
                            }`}
                            onClick={() =>
                              line.entryUuid && setApiDetailModal({ kind: 'labour_entry', uuid: line.entryUuid })
                            }
                            title={line.entryUuid ? 'View labour entry detail' : undefined}
                          >
                            <td className="py-2 px-2 whitespace-nowrap">{line.workDate}</td>
                            <td className="py-2 px-2">{line.project}</td>
                            <td className="py-2 px-2">{line.contractor}</td>
                            <td className="py-2 px-2 font-medium">{line.category}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{line.count}</td>
                            <td className="py-2 px-2 tabular-nums">{line.unit}</td>
                            <td className="py-2 px-2 tabular-nums">{line.ot}</td>
                            <td className="py-2 px-2 max-w-[140px] truncate" title={line.status}>
                              {line.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <h4 className={`text-sm font-bold ${textSecondary} uppercase tracking-wide`}>Local labour logs (offline)</h4>

              {/* Filters: Project, Contractor, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project</label>
                  <select
                    value={logFilterProject}
                    onChange={(e) => setLogFilterProject(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="">All</option>
                    {[...new Set([
                      ...getContractorEntries().map((e) => e.projectName),
                      ...getWorkers().map((w) => w.projectName),
                      ...contractorProjects.map((p) => p.name),
                    ])].filter(Boolean).sort().map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Contractor</label>
                  <select
                    value={logFilterContractor}
                    onChange={(e) => setLogFilterContractor(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="">All</option>
                    {[...new Set([
                      ...getContractorEntries().map((e) => e.contractorName),
                      ...vendors.map((v) => v.name),
                    ])].filter(Boolean).sort().map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={logFilterDate}
                      onChange={(e) => setLogFilterDate(e.target.value)}
                      disabled={logShowAllDates}
                      className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} disabled:opacity-50`}
                    />
                    <label className={`flex items-center gap-2 text-sm ${textSecondary} whitespace-nowrap`}>
                      <input
                        type="checkbox"
                        checked={logShowAllDates}
                        onChange={(e) => setLogShowAllDates(e.target.checked)}
                      />
                      Show All
                    </label>
                  </div>
                </div>
              </div>

              {/* Log List: grouped by date */}
              <div className="space-y-4">
                {(() => {
                  let entries = getContractorEntries();
                  if (logFilterProject) entries = entries.filter((e) => e.projectName === logFilterProject);
                  if (logFilterContractor) entries = entries.filter((e) => e.contractorName === logFilterContractor);
                  if (!logShowAllDates && logFilterDate) {
                    entries = entries.filter((e) => e.date === logFilterDate || new Date(e.date).toDateString() === new Date(logFilterDate).toDateString());
                  }
                  const byDate = entries.reduce((acc, e) => {
                    const key = e.dateKey || new Date(e.date).toDateString();
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(e);
                    return acc;
                  }, {} as Record<string, ContractorEntry[]>);
                  const dates = Object.keys(byDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                  return dates.length === 0 ? (
                    <div className={`py-12 text-center rounded-lg border ${borderClass} ${textSecondary}`}>
                      No logs found. Add a log to get started.
                    </div>
                  ) : (
                    dates.map((dateKey) => (
                      <div key={dateKey}>
                        <h4 className={`text-sm font-bold ${textPrimary} mb-2`}>
                          {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-inherit">
                          <table className="w-full min-w-[900px]">
                            <thead>
                              <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Project</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Contractor</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>
                                  Category / labour
                                </th>
                                <th className={`text-right py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Count</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Unit</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>
                                  Over time
                                </th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Amount</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary} w-16`}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {byDate[dateKey].map((e) => (
                                <tr key={e.id} className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.projectName}</td>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.contractorName}</td>
                                  <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{e.category}</td>
                                  <td className={`py-3 px-4 text-sm text-right tabular-nums ${textPrimary}`}>
                                    {e.headCount > 0 ? e.headCount : '—'}
                                  </td>
                                  <td className={`py-3 px-4 text-sm tabular-nums ${textPrimary}`}>
                                    {e.unitsWorked} {e.unitsWorked === 1 ? 'Day' : 'Days'}
                                  </td>
                                  <td className={`py-3 px-4 text-sm tabular-nums ${textPrimary}`}>
                                    {e.otHoursPerPerson} Hrs
                                  </td>
                                  <td className={`py-3 px-4 text-sm font-bold ${textPrimary}`}>
                                    ₹{e.amount.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => {
                                        deleteContractorEntry(e.id);
                                        setDataVersion((v) => v + 1);
                                        toast.showSuccess('Log deleted');
                                      }}
                                      className="p-1.5 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>
          )}

          {/* PAY TAB */}
          {activeTab === 'pay' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project</label>
                  <select
                    value={payProject}
                    onChange={(e) => setPayProject(e.target.value)}
                    disabled={contractorDataLoading}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} disabled:opacity-60`}
                  >
                    <option value="">All</option>
                    {contractorProjects
                      .filter((p) => p.name)
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <option key={String(p.id)} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Contractor</label>
                  <select
                    value={payContractor}
                    onChange={(e) => setPayContractor(e.target.value)}
                    disabled={contractorDataLoading}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} disabled:opacity-60`}
                  >
                    <option value="">All</option>
                    {vendors
                      .filter((v) => v.name)
                      .slice()
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((v) => (
                        <option key={String(v.id)} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {(() => {
                const periodPills: { id: typeof payPeriodFilter; label: string; hint: string }[] = [
                  { id: 'all', label: 'All', hint: 'All dates' },
                  { id: 'weekly', label: 'Weekly', hint: 'Last 7 days' },
                  { id: 'fortnight', label: 'Fortnight', hint: 'Last 14 days' },
                  { id: 'monthly', label: 'Monthly', hint: 'Last 30 days' },
                ];

                if (isAuthenticated) {
                  const s = pickPaySummaryNumbers(paySummaryPayload);
                  const unpaid = payUnpaidRows;
                  const unpaidOutstanding = unpaid.reduce((acc, e) => acc + e.amount, 0);
                  const totalBilled =
                    s.totalBilled ??
                    (s.totalPaid != null ? s.totalPaid + (s.outstanding ?? unpaidOutstanding) : unpaidOutstanding);
                  const totalPaid = s.totalPaid;
                  const outstanding = s.outstanding ?? unpaidOutstanding;
                  const selectedTotal = unpaid
                    .filter((e) => selectedPayUuids.has(e.uuid))
                    .reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <>
                      {payUnpaidError && (
                        <p className="text-sm text-red-500 dark:text-red-400">{payUnpaidError}</p>
                      )}
                      {payUnpaidLoading && (
                        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading unpaid entries…
                        </div>
                      )}
                      <div
                        className={`grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}
                      >
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Total billed</p>
                          <p className={`text-lg font-black ${textPrimary}`}>
                            {totalBilled != null ? `₹${totalBilled.toLocaleString('en-IN')}` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Total paid</p>
                          <p className={`text-lg font-black ${textPrimary}`}>
                            {totalPaid != null ? `₹${totalPaid.toLocaleString('en-IN')}` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Outstanding</p>
                          <p
                            className={`text-lg font-black ${
                              outstanding > 0
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            ₹{outstanding.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-2`}>
                          Period filter
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {periodPills.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPayPeriodFilter(p.id)}
                              className={`inline-flex flex-col items-start px-3 py-2 rounded-lg border text-left text-sm font-bold transition-colors ${
                                payPeriodFilter === p.id
                                  ? 'border-[#6B8E23] bg-[#6B8E23]/20 text-[#6B8E23]'
                                  : `${borderClass} ${textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
                              }`}
                            >
                              <span>{p.label}</span>
                              <span className={`text-[10px] font-normal ${textSecondary}`}>{p.hint}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Unpaid labour entries</h3>
                        <div className="flex flex-wrap gap-2 mb-3 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected =
                                unpaid.length > 0 && unpaid.every((e) => selectedPayUuids.has(e.uuid));
                              setSelectedPayUuids(allSelected ? new Set() : new Set(unpaid.map((e) => e.uuid)));
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#6B8E23]/20 text-[#6B8E23]"
                          >
                            {unpaid.length > 0 && unpaid.every((e) => selectedPayUuids.has(e.uuid))
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                          <span className={`text-sm ${textSecondary}`}>
                            Selected: ₹{selectedTotal.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const selected = unpaid.filter((e) => selectedPayUuids.has(e.uuid));
                              paymentIdempotencyKeyRef.current =
                                typeof crypto !== 'undefined' && crypto.randomUUID
                                  ? crypto.randomUUID()
                                  : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
                              setPaymentFormData((p) => ({
                                ...p,
                                amount: selected.reduce((acc, e) => acc + e.amount, 0).toFixed(2),
                                paid_at: defaultPaidAtLocal(),
                              }));
                              setShowPaymentModal(true);
                            }}
                            disabled={selectedPayUuids.size === 0}
                            className="ml-auto px-4 py-2 rounded-lg font-bold text-sm bg-[#6B8E23] text-white disabled:opacity-50"
                          >
                            Pay Selected
                          </button>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-inherit max-h-[28rem] overflow-y-auto">
                          <table className="w-full min-w-[860px]">
                            <thead className={`sticky top-0 z-[1] ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <tr className={`border-b ${borderClass}`}>
                                <th className="text-left py-2 px-2 text-xs font-bold w-8" />
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Date</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Project</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Contractor</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Category</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Head count</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Unit</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>OT</th>
                                <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>OT unit</th>
                                <th className={`text-right py-2 px-2 text-xs font-bold ${textSecondary}`}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {unpaid.length === 0 ? (
                                <tr>
                                  <td colSpan={10} className={`py-6 text-center text-sm ${textSecondary}`}>
                                    No unpaid labour entries
                                  </td>
                                </tr>
                              ) : (
                                unpaid.map((e) => (
                                  <tr
                                    key={e.uuid}
                                    className="border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <td className="py-2 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedPayUuids.has(e.uuid)}
                                        onChange={() =>
                                          setSelectedPayUuids((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(e.uuid)) next.delete(e.uuid);
                                            else next.add(e.uuid);
                                            return next;
                                          })
                                        }
                                      />
                                    </td>
                                    <td className={`py-2 px-2 text-sm whitespace-nowrap ${textPrimary}`}>
                                      {e.workDate ? new Date(e.workDate).toLocaleDateString() : '—'}
                                    </td>
                                    <td className={`py-2 px-2 text-sm ${textPrimary}`}>{e.projectName}</td>
                                    <td className={`py-2 px-2 text-sm ${textPrimary}`}>{e.contractorName}</td>
                                    <td className={`py-2 px-2 text-sm font-medium ${textPrimary}`}>{e.category}</td>
                                    <td className={`py-2 px-2 text-sm tabular-nums ${textPrimary}`}>{e.headCount}</td>
                                    <td className={`py-2 px-2 text-sm ${textSecondary}`}>
                                      {e.labourCountUnit === 'hour' ? 'Hrs' : 'Days'}
                                    </td>
                                    <td className={`py-2 px-2 text-sm tabular-nums ${textPrimary}`}>{e.otHours}</td>
                                    <td className={`py-2 px-2 text-sm ${textSecondary}`}>
                                      {e.overtimeQtyUnit === 'hour' ? 'Hrs' : 'Days'}
                                    </td>
                                    <td className={`py-2 px-2 text-sm font-bold text-right ${textPrimary}`}>
                                      ₹{e.amount.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Recent payments</h3>
                        {payRecentLoading && (
                          <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading…
                          </div>
                        )}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {payRecentRows.map((raw, idx) => {
                            const r = raw as Record<string, unknown>;
                            const rowUuid = String(r.uuid ?? r.id ?? `idx-${idx}`);
                            const amountRaw =
                              r.amount_total ?? r.amount ?? r.total_amount ?? r.paid_amount ?? 0;
                            const paidAt = r.paid_at ?? r.created_at ?? r.date;
                            const contractor = String(
                              (r.contractor as { name?: string } | undefined)?.name ??
                                (r.vendor as { name?: string } | undefined)?.name ??
                                r.contractor_name ??
                                ''
                            );
                            const mode = r.manual_method != null ? String(r.manual_method) : '';
                            return (
                              <button
                                key={rowUuid}
                                type="button"
                                onClick={() => setPayDetailModalUuid(rowUuid)}
                                className={`group flex w-full items-center gap-2 p-3 rounded-lg border ${borderClass} text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:border-[#6B8E23]/40`}
                              >
                                <span className={`flex-1 min-w-0 text-sm ${textPrimary}`}>
                                  <span className="block truncate">
                                    {paidAt ? new Date(String(paidAt)).toLocaleString() : '—'}
                                    {contractor ? ` · ${contractor}` : ''}
                                  </span>
                                  <span className={`block text-xs mt-0.5 ${textSecondary}`}>View breakdown</span>
                                </span>
                                <span className={`text-sm font-bold tabular-nums shrink-0 ${textPrimary}`}>
                                  {formatInrLabourPayment(amountRaw)}
                                  {mode ? (
                                    <span className={`font-normal ${textSecondary}`}> · {mode}</span>
                                  ) : null}
                                </span>
                                <ChevronRight className={`w-4 h-4 shrink-0 opacity-40 group-hover:opacity-80 ${textSecondary}`} />
                              </button>
                            );
                          })}
                          {!payRecentLoading && payRecentRows.length === 0 && (
                            <p className={`text-sm ${textSecondary}`}>No recent payments</p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const periodCutoff = (() => {
                  if (payPeriodFilter === 'weekly') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 7);
                    return d.getTime();
                  }
                  if (payPeriodFilter === 'fortnight') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 14);
                    return d.getTime();
                  }
                  if (payPeriodFilter === 'monthly') {
                    const d = new Date(today);
                    d.setDate(d.getDate() - 30);
                    return d.getTime();
                  }
                  return 0;
                })();
                const entries = getContractorEntries().filter((e) => {
                  const matchProject = !payProject || e.projectName === payProject;
                  const matchContractor = !payContractor || e.contractorName === payContractor;
                  const matchPeriod = periodCutoff === 0 || new Date(e.date).getTime() >= periodCutoff;
                  return matchProject && matchContractor && matchPeriod;
                });
                const paidEntries = entries.filter((e) => e.paid);
                const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);
                const unpaid = entries.filter((e) => !e.paid);
                const outstanding = unpaid.reduce((s, e) => s + e.amount, 0);
                const totalBilled = entries.reduce((s, e) => s + e.amount, 0);
                const selectedTotal = unpaid
                  .filter((e) => selectedPayEntryIds.has(e.id))
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <>
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Total billed</p>
                        <p className={`text-lg font-black ${textPrimary}`}>₹{totalBilled.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Total paid</p>
                        <p className={`text-lg font-black ${textPrimary}`}>₹{totalPaid.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary}`}>Outstanding</p>
                        <p className={`text-lg font-black ${outstanding > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ₹{outstanding.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-2`}>Period filter</p>
                      <div className="flex flex-wrap gap-2">
                        {periodPills.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPayPeriodFilter(p.id)}
                            className={`inline-flex flex-col items-start px-3 py-2 rounded-lg border text-left text-sm font-bold transition-colors ${
                              payPeriodFilter === p.id
                                ? 'border-[#6B8E23] bg-[#6B8E23]/20 text-[#6B8E23]'
                                : `${borderClass} ${textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
                            }`}
                          >
                            <span>{p.label}</span>
                            <span className={`text-[10px] font-normal ${textSecondary}`}>{p.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Unpaid Logs</h3>
                      <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <button
                          onClick={() => {
                            const allSelected = unpaid.length > 0 && unpaid.every((e) => selectedPayEntryIds.has(e.id));
                            setSelectedPayEntryIds(allSelected ? new Set() : new Set(unpaid.map((e) => e.id)));
                          }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#6B8E23]/20 text-[#6B8E23]"
                        >
                          {unpaid.length > 0 && unpaid.every((e) => selectedPayEntryIds.has(e.id)) ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className={`text-sm ${textSecondary}`}>Selected: ₹{selectedTotal.toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => {
                            const selected = unpaid.filter((e) => selectedPayEntryIds.has(e.id));
                            setPaymentFormData((p) => ({ ...p, amount: selected.reduce((s, e) => s + e.amount, 0).toFixed(2) }));
                            setShowPaymentModal(true);
                          }}
                          disabled={selectedPayEntryIds.size === 0}
                          className="ml-auto px-4 py-2 rounded-lg font-bold text-sm bg-[#6B8E23] text-white disabled:opacity-50"
                        >
                          Pay Selected
                        </button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-inherit max-h-[28rem] overflow-y-auto">
                        <table className="w-full min-w-[860px]">
                          <thead className={`sticky top-0 z-[1] ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <tr className={`border-b ${borderClass}`}>
                              <th className="text-left py-2 px-2 text-xs font-bold w-8"/>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Date</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Project</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Contractor</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Category</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Head count</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>Unit</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>OT</th>
                              <th className={`text-left py-2 px-2 text-xs font-bold ${textSecondary}`}>OT unit</th>
                              <th className={`text-right py-2 px-2 text-xs font-bold ${textSecondary}`}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unpaid.length === 0 ? (
                              <tr><td colSpan={10} className={`py-6 text-center text-sm ${textSecondary}`}>No unpaid logs</td></tr>
                            ) : (
                              unpaid.map((e) => {
                                const rateInfo = getRateForDate(
                                  e.projectName,
                                  e.contractorName,
                                  e.rateCategory || e.category,
                                  e.date
                                );
                                const headUnit: 'day' | 'hour' =
                                  e.labourCountUnit ?? (rateInfo.unit === 'Hr' ? 'hour' : 'day');
                                const otUnit: 'day' | 'hour' =
                                  e.overtimeQtyUnit ?? (rateInfo.otUnit === 'Hr' ? 'hour' : 'day');
                                return (
                                  <tr key={e.id} className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}>
                                    <td className="py-2 px-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedPayEntryIds.has(e.id)}
                                        onChange={() => setSelectedPayEntryIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(e.id)) next.delete(e.id);
                                          else next.add(e.id);
                                          return next;
                                        })}
                                      />
                                    </td>
                                    <td className={`py-2 px-2 text-sm whitespace-nowrap ${textPrimary}`}>{new Date(e.date).toLocaleDateString()}</td>
                                    <td className={`py-2 px-2 text-sm ${textPrimary}`}>{e.projectName}</td>
                                    <td className={`py-2 px-2 text-sm ${textPrimary}`}>{e.contractorName}</td>
                                    <td className={`py-2 px-2 text-sm font-medium ${textPrimary}`}>{e.category}</td>
                                    <td className={`py-2 px-2 text-sm tabular-nums ${textPrimary}`}>{e.headCount}</td>
                                    <td className={`py-2 px-2 text-sm ${textSecondary}`}>{headUnit === 'hour' ? 'Hrs' : 'Days'}</td>
                                    <td className={`py-2 px-2 text-sm tabular-nums ${textPrimary}`}>{e.otHoursPerPerson}</td>
                                    <td className={`py-2 px-2 text-sm ${textSecondary}`}>{otUnit === 'hour' ? 'Hrs' : 'Days'}</td>
                                    <td className={`py-2 px-2 text-sm font-bold text-right ${textPrimary}`}>₹{e.amount.toLocaleString('en-IN')}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Recent Payments</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {getPayments()
                          .filter((p) => (!payProject || p.projectName === payProject) && (!payContractor || p.contractorName === payContractor))
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 10)
                          .map((p) => (
                            <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg border ${borderClass}`}>
                              <span className={`text-sm ${textPrimary}`}>{new Date(p.date).toLocaleDateString()} · {p.contractorName}</span>
                              <span className={`text-sm font-bold ${textPrimary}`}>₹{p.amount.toLocaleString('en-IN')} · {p.mode}</span>
                            </div>
                          ))}
                        {getPayments().filter((p) => (!payProject || p.projectName === payProject) && (!payContractor || p.contractorName === payContractor)).length === 0 && (
                          <p className={`text-sm ${textSecondary}`}>No recent payments</p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* Camera Modal for Punch */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden my-auto ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className={`font-bold ${textPrimary} block`}>
                  {punchModalKind === 'punch_in' ? 'Punch IN' : 'Punch OUT'}
                </span>
                <p className={`text-xs mt-1 ${textSecondary}`}>
                  Identity is verified from your enrolled face. Location is sent with the punch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCameraModal(false)}
                disabled={isSubmittingPunch}
                className="p-1 hover:opacity-70 shrink-0 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {punchHoldCountdown != null && punchHoldCountdown > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 px-4 text-center">
                    <p className={`text-base font-bold text-white`}>
                      {punchModalKind === 'punch_in'
                        ? 'Hold your device properly for punch in'
                        : 'Hold your device properly for punch out'}
                    </p>
                    <p className="text-sm font-semibold text-white/90">{punchHoldCountdown}s</p>
                  </div>
                )}
                {punchHoldCountdown === 0 && isSubmittingPunch && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <p className={`text-sm font-bold text-white`}>Verifying punch…</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPunchCameraFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                disabled={
                  isSubmittingPunch || punchHoldCountdown !== null || isCheckingPermissions
                }
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold border ${borderClass} ${
                  isDark ? 'bg-slate-800/80 text-slate-100' : 'bg-slate-50 text-slate-800'
                } hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <SwitchCamera className="w-4 h-4 shrink-0" />
                {punchCameraFacing === 'user'
                  ? 'Using front camera — switch to rear'
                  : 'Using rear camera — switch to selfie (front)'}
              </button>
              {geoLocation && (
                <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  Lat: {geoLocation.latitude.toFixed(4)}, Lng: {geoLocation.longitude.toFixed(4)}
                  {geoLocation.accuracy != null && ` (±${geoLocation.accuracy.toFixed(0)}m)`}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(false)}
                  disabled={isSubmittingPunch}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-inherit hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Punch Success Modal */}
      {showPunchSuccessModal && punchSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#6B8E23]/20">
                  <Check className="w-8 h-8 text-[#6B8E23]" />
                </div>
                <div>
                  <h3 className={`text-lg font-black ${textPrimary}`}>Punch Successful</h3>
                  <p className={`text-sm ${textSecondary}`}>Attendance recorded</p>
                </div>
              </div>
              <div className={`space-y-2 text-sm ${textPrimary}`}>
                {punchSuccessData.employee_name && (
                  <div className="flex justify-between">
                    <span className={textSecondary}>Employee</span>
                    <span className="font-bold">{punchSuccessData.employee_name}</span>
                  </div>
                )}
                {punchSuccessData.uuid && (
                  <div className="flex justify-between">
                    <span className={textSecondary}>Record</span>
                    <span className="font-mono text-xs break-all text-right max-w-[60%]">{punchSuccessData.uuid}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className={textSecondary}>Time</span>
                  <span className="font-bold">{punchSuccessData.punch_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className={textSecondary}>Type</span>
                  <span className="font-bold capitalize">{punchSuccessData.punch_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className={textSecondary}>AI Verification</span>
                  <span className="font-bold text-[#6B8E23]">{punchSuccessData.ai_verification}</span>
                </div>
                <div className={`flex flex-col gap-1 pt-2 border-t ${borderClass}`}>
                  <span className={textSecondary}>Location</span>
                  <span className="text-xs font-medium break-words">{punchSuccessData.location}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPunchSuccessModal(false);
                  setPunchSuccessData(null);
                }}
                className="w-full py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll face — POST /face/enroll */}
      {showEnrollModal && enrollTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>
                {userMaySubmitReEnroll(user as Record<string, unknown> | null, enrollTarget, reEnrollOk)
                  ? 'Re-enroll'
                  : 'Enroll face'}{' '}
                · {enrollTarget.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollTarget(null);
                  setEnrollImages([]);
                }}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className={`text-xs ${textSecondary}`}>
                GET /face/check —{' '}
                {enrollFaceCheck?.loading
                  ? 'Verifying…'
                  : enrollFaceCheck?.error
                    ? enrollFaceCheck.error
                    : enrollFaceCheck
                      ? `enrolled: ${enrollFaceCheck.is_enrolled ? 'yes' : 'no'}${enrollFaceCheck.face_count != null ? ` · face samples: ${enrollFaceCheck.face_count}` : ''}`
                      : '—'}
              </p>
              <p className={`text-sm ${textSecondary}`}>
                {!userMaySubmitReEnroll(user as Record<string, unknown> | null, enrollTarget, reEnrollOk) && (
                  <span className="block mb-1.5">
                    Submits <span className="font-semibold text-inherit">POST /face/enroll</span> with{' '}
                    <span className="font-mono text-[11px]">company_id</span>,{' '}
                    <span className="font-mono text-[11px]">subject_type</span>,{' '}
                    <span className="font-mono text-[11px]">subject_id</span>,{' '}
                    <span className="font-mono text-[11px]">images[]</span> (≥2), optional{' '}
                    <span className="font-mono text-[11px]">consent</span>.
                  </span>
                )}
                Use the live camera: capture at least two frames (different angles work best). Same subject as{' '}
                {enrollTarget.subjectType.replace('_', ' ')} #{enrollTarget.subjectId}. Up to 8 samples.
                {userMaySubmitReEnroll(user as Record<string, unknown> | null, enrollTarget, reEnrollOk) && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    Re-enroll replaces your existing enrollment with new samples (managers can do this for any subject).
                  </span>
                )}
              </p>
              {enrollImages.length >= 8 ? (
                <p className={`text-xs ${textSecondary}`}>Maximum 8 captures. Remove one below to add another, or submit.</p>
              ) : (
                <div key={`${enrollTarget.subjectType}-${enrollTarget.subjectId}`}>
                  <CameraCapture
                    isDark={isDark}
                    label={
                      enrollImages.length === 0
                        ? 'Capture 1st frame'
                        : enrollImages.length === 1
                          ? 'Capture 2nd frame (required)'
                          : `Add frame ${enrollImages.length + 1} (optional)`
                    }
                    onCapture={(dataUrl) => {
                      try {
                        const file = dataUrlToJpegFile(dataUrl, `enroll-${Date.now()}.jpg`);
                        setEnrollImages((prev) => [...prev, file].slice(0, 8));
                      } catch {
                        toast.showWarning('Could not process capture — try again');
                      }
                    }}
                  />
                </div>
              )}
              {enrollImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-xs ${textSecondary}`}>{enrollImages.length} capture(s) — need at least 2 to submit</p>
                    <button
                      type="button"
                      className={`text-xs font-bold underline ${textPrimary}`}
                      onClick={() => setEnrollImages([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {enrollImages.map((file, idx) => (
                      <div
                        key={`${idx}-${file.name}-${file.lastModified}`}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border ${borderClass} shrink-0 group`}
                      >
                        <img
                          src={enrollCapturePreviewUrls[idx]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => setEnrollImages((p) => p.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-90 hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label className={`flex items-center gap-2 text-sm ${textPrimary}`}>
                <input type="checkbox" checked={enrollConsent} onChange={(e) => setEnrollConsent(e.target.checked)} />
                Consent to store face biometrics (optional)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEnrollSubmit}
                  disabled={isSubmittingEnroll || enrollImages.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingEnroll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Submit enrollment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollTarget(null);
                    setEnrollImages([]);
                  }}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add field worker — POST /workforce-profiles */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl overflow-hidden my-4 sm:my-8 ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>New workforce profile</span>
              <button
                type="button"
                onClick={() => {
                  setShowAddProfileModal(false);
                  setStaffFormData({
                    name: '',
                    project_id: '',
                    designation: '',
                    worker_type: 'staff',
                    email: '',
                    mobile: '',
                    profile_images: null,
                  });
                }}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className={`text-xs ${textSecondary}`}>
                Creates a field profile via POST /workforce-profiles (not a full login). Use Company Users / Teams for accounts with passwords.
              </p>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Full Name *</label>
                <input
                  type="text"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter full name"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project Name *</label>
                <select
                  value={staffFormData.project_id}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, project_id: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="">— Select project —</option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Designation *</label>
                <input
                  type="text"
                  value={staffFormData.designation}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Site Engineer, Supervisor"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Email</label>
                  <input
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData((p) => ({ ...p, email: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Mobile</label>
                  <input
                    type="tel"
                    value={staffFormData.mobile}
                    onChange={(e) => setStaffFormData((p) => ({ ...p, mobile: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Worker Type *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffFormData((p) => ({ ...p, worker_type: 'staff' }))}
                    className={`flex-1 min-w-0 py-2 rounded-lg font-bold text-sm border transition-colors ${
                      staffFormData.worker_type === 'staff'
                        ? 'bg-[#6B8E23] text-white border-[#6B8E23]'
                        : `border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600`
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFormData((p) => ({ ...p, worker_type: 'own_labor' }))}
                    className={`flex-1 min-w-0 py-2 rounded-lg font-bold text-sm border transition-colors ${
                      staffFormData.worker_type === 'own_labor'
                        ? 'bg-[#6B8E23] text-white border-[#6B8E23]'
                        : `border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600`
                    }`}
                  >
                    Own Labour
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Profile photo (optional)</label>
                <div className="flex gap-2">
                  <input
                    ref={staffFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setStaffFormData((p) => ({ ...p, profile_images: f }));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => staffFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-inherit hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <Camera className="w-4 h-4" />
                    Camera or file
                  </button>
                  {staffFormData.profile_images && (
                    <span className={`text-sm ${textSecondary}`}>{staffFormData.profile_images.name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddProfileSubmit}
                  disabled={isSubmittingStaff}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingStaff ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Create profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProfileModal(false);
                    setStaffFormData({
                      name: '',
                      project_id: '',
                      designation: '',
                      worker_type: 'staff',
                      email: '',
                      mobile: '',
                      profile_images: null,
                    });
                  }}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {apiDetailModal && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between gap-2">
              <span className={`font-bold ${textPrimary}`}>
                {apiDetailModal.kind === 'contractor_rate'
                  ? 'Contractor rate detail'
                  : 'Labour entry detail'}{' '}
                <span className="font-mono text-xs font-normal opacity-80">({apiDetailModal.uuid})</span>
              </span>
              <button
                type="button"
                onClick={() => setApiDetailModal(null)}
                className="p-1 hover:opacity-70 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {apiDetailLoading ? (
                <div className={`flex items-center gap-2 ${textSecondary}`}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <pre
                  className={`text-xs whitespace-pre-wrap break-words font-mono p-3 rounded-lg border border-inherit ${isDark ? 'bg-slate-900' : 'bg-slate-100'} ${textPrimary}`}
                >
                  {JSON.stringify(apiDetailPayload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Contractor Modal - full vendor creation form (same as Masters > Vendors) */}
      <CreateVendorModal
        theme={theme}
        isOpen={showAddVendorModal}
        onClose={() => {
          setShowAddVendorModal(false);
          setLabourEntryContractorDropdownOpen(false);
        }}
        onSuccess={(createdVendor?: any, formData?: any) => {
          const vendorId = createdVendor?.id ?? createdVendor?.uuid;
          if (vendorId != null) {
            setVendors((prev) => [
              { id: vendorId, name: createdVendor?.name || formData?.name || '', uuid: createdVendor?.uuid },
              ...prev,
            ]);
            setLabourEntryFormData((prev) => ({ ...prev, contractor_id: String(vendorId) }));
            refreshContractorProjectsAndVendors();
          }
          setShowAddVendorModal(false);
          setLabourEntryContractorDropdownOpen(false);
        }}
        defaultVendorType="contractor"
      />

      {/* Add Labour Entry Modal */}
      {showAddLabourEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>Add Labor Count</span>
              <button
                onClick={() => {
                  setShowAddLabourEntryModal(false);
                  setLabourEntryProjectDropdownOpen(false);
                  setLabourEntryContractorDropdownOpen(false);
                  setLabourEntryProjectSearch('');
                  setLabourEntryContractorSearch('');
                }}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {labourEntryFormPanel}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>Confirm Payment</span>
              <button
                type="button"
                onClick={() => {
                  paymentIdempotencyKeyRef.current = null;
                  setShowPaymentModal(false);
                }}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {isAuthenticated && (
                <p className={`text-xs ${textSecondary}`}>
                  Server payments use an idempotency key: it is set when you open this dialog and refreshed when you
                  change the amount (retry the same request after a network error without changing the amount).
                </p>
              )}
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => {
                    if (isAuthenticated) {
                      paymentIdempotencyKeyRef.current =
                        typeof crypto !== 'undefined' && crypto.randomUUID
                          ? crypto.randomUUID()
                          : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
                    }
                    setPaymentFormData((p) => ({ ...p, amount: e.target.value }));
                  }}
                  placeholder="Enter amount"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Mode</label>
                <select
                  value={paymentFormData.mode}
                  onChange={(e) =>
                    setPaymentFormData((p) => ({ ...p, mode: e.target.value as PaymentFormMode }))
                  }
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Reference (e.g. UTR)</label>
                <input
                  type="text"
                  value={paymentFormData.reference}
                  onChange={(e) => setPaymentFormData((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Optional"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              {isAuthenticated && (
                <>
                  <div>
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Paid at</label>
                    <input
                      type="datetime-local"
                      value={paymentFormData.paid_at}
                      onChange={(e) => setPaymentFormData((p) => ({ ...p, paid_at: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Currency</label>
                    <input
                      type="text"
                      value={paymentFormData.currency_code}
                      onChange={(e) =>
                        setPaymentFormData((p) => ({
                          ...p,
                          currency_code: e.target.value.toUpperCase().slice(0, 3),
                        }))
                      }
                      placeholder="INR"
                      maxLength={3}
                      className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Notes</label>
                    <textarea
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Internal notes (optional)"
                      rows={2}
                      className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void handleConfirmPayment()}
                  disabled={isSubmittingPayment}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Settle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    paymentIdempotencyKeyRef.current = null;
                    setShowPaymentModal(false);
                  }}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Labour payment detail — GET /labour-payments/{uuid} */}
      {payDetailModalUuid && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl overflow-hidden ${cardClass} border ${borderClass} max-h-[92vh] flex flex-col shadow-xl`}
          >
            <div className="p-4 border-b border-inherit flex items-center justify-between shrink-0">
              <span className={`text-lg font-black ${textPrimary}`}>Payment detail</span>
              <button
                type="button"
                onClick={() => setPayDetailModalUuid(null)}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 text-sm ${textPrimary}`}>
              {payDetailLoading ? (
                <div className={`flex items-center justify-center gap-2 py-12 ${textSecondary}`}>
                  <Loader2 className="w-6 h-6 animate-spin text-[#6B8E23]" />
                  <span>Loading payment…</span>
                </div>
              ) : (
                <LabourPaymentDetailContent
                  payload={payDetailPayload}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderClass={borderClass}
                  isDark={isDark}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add contractor labour rate — GET form-options + POST contractor-labor-rates */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>Add contractor labour rate</span>
              <button
                type="button"
                onClick={() => {
                  setShowRatesModal(false);
                  setRatesLabourDropdownOpen(false);
                  setRatesLabourSearch('');
                }}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-4 space-y-4 relative ${rateFormOptionsLoading ? 'pointer-events-none opacity-60' : ''}`}>
              {rateFormOptionsLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6B8E23]" />
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project *</label>
                <select
                  value={ratesFormData.project_id}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, project_id: e.target.value }))}
                  disabled={rateFormOptionsLoading}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="">— Select project —</option>
                  {rateFormOptions.projects.map((p: any) => (
                    <option key={String(p.id ?? p.uuid)} value={String(p.id ?? p.uuid)}>
                      {p.project_name ?? p.name ?? '—'}
                    </option>
                  ))}
                </select>
                {ratesFieldErrors.project_id && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.project_id}</p>
                )}
                {!rateFormOptionsLoading && rateFormOptions.projects.length === 0 && (
                  <p className={`text-xs mt-1 ${textSecondary}`}>
                    No projects in form-options. Check allocation or contact admin.
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Contractor *</label>
                <select
                  value={ratesFormData.vendor_id}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, vendor_id: e.target.value }))}
                  disabled={rateFormOptionsLoading}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="">— Select contractor —</option>
                  {rateFormOptions.contractors.map((v: any) => (
                    <option key={String(v.id ?? v.uuid)} value={String(v.id ?? v.uuid)}>
                      {v.name ?? '—'} {v.type ? `(${v.type})` : ''}
                    </option>
                  ))}
                </select>
                {ratesFieldErrors.vendors_id && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.vendors_id}</p>
                )}
                {!rateFormOptionsLoading && rateFormOptions.contractors.length === 0 && (
                  <p className={`text-xs mt-1 ${textSecondary}`}>
                    No contractors.{' '}
                    <Link href="/masters/vendors" className="text-[#6B8E23] underline font-bold">
                      Create contractor in Masters
                    </Link>
                  </p>
                )}
              </div>
              <div ref={ratesLabourDropdownRef} className="relative">
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Labour category *</label>
                <div
                  onClick={() => !rateFormOptionsLoading && setRatesLabourDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} cursor-pointer min-h-[42px]`}
                >
                  <span className="flex-1 text-left truncate">
                    {rateFormOptionsLoading
                      ? 'Loading…'
                      : ratesFormData.labour_id
                        ? (() => {
                            const sel = rateLabourPicks.find((l) => String(l.numericId) === String(ratesFormData.labour_id));
                            return sel ? sel.name : '— Select category —';
                          })()
                        : '— Select category —'}
                  </span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${ratesLabourDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {ratesLabourDropdownOpen && (
                  <div
                    className={`absolute left-0 right-0 top-full mt-1 rounded-lg border ${borderClass} ${isDark ? 'bg-dropdown-panel' : 'bg-white'} shadow-lg z-[60] overflow-hidden max-h-72 flex flex-col`}
                  >
                    <div className="flex items-center gap-1 p-2 border-b border-inherit">
                      <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name…"
                        value={ratesLabourSearch}
                        onChange={(e) => setRatesLabourSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`flex-1 min-w-0 py-1.5 px-2 rounded border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-900' : 'bg-slate-50'} text-sm`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRatesLabourDropdownOpen(false);
                          setShowRatesCreateLabourModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#6B8E23]/20 text-[#6B8E23] transition-colors shrink-0"
                        title="Add labour"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {rateLabourPicks
                        .filter((l) => {
                          const q = ratesLabourSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (l.name || '').toLowerCase().includes(q);
                        })
                        .map((l) => (
                          <div
                            key={String(l.numericId)}
                            onClick={() => {
                              setRatesFormData((p) => ({
                                ...p,
                                labour_id: String(l.numericId),
                              }));
                              setRatesLabourDropdownOpen(false);
                              setRatesLabourSearch('');
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-[#6B8E23]/10 ${
                              String(l.numericId) === String(ratesFormData.labour_id) ? 'bg-[#6B8E23]/20' : ''
                            } ${textPrimary}`}
                          >
                            {l.name}
                          </div>
                        ))}
                      {!rateFormOptionsLoading &&
                        rateLabourPicks.filter((l) => {
                          const q = ratesLabourSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (l.name || '').toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className={`px-4 py-3 text-sm ${textSecondary}`}>
                            No labours.{' '}
                            <Link href="/masters/labours" className="text-[#6B8E23] underline font-bold">
                              Create labour in Masters
                            </Link>
                          </div>
                        )}
                    </div>
                  </div>
                )}
                {ratesFieldErrors.labours_id && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.labours_id}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Daily rate amount *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ratesFormData.daily_rate}
                    onChange={(e) => setRatesFormData((p) => ({ ...p, daily_rate: e.target.value }))}
                    placeholder="Amount"
                    className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                  <select
                    value={ratesFormData.daily_rate_unit}
                    onChange={(e) =>
                      setRatesFormData((p) => ({ ...p, daily_rate_unit: e.target.value as 'day' | 'hour' }))
                    }
                    className={`w-28 px-2 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="day">day</option>
                    <option value="hour">hour</option>
                  </select>
                </div>
                {ratesFieldErrors.daily_rate_amount && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.daily_rate_amount}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Overtime rate amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ratesFormData.overtime_rate}
                    onChange={(e) => setRatesFormData((p) => ({ ...p, overtime_rate: e.target.value }))}
                    placeholder="0"
                    className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                  <select
                    value={ratesFormData.overtime_unit}
                    onChange={(e) =>
                      setRatesFormData((p) => ({ ...p, overtime_unit: e.target.value as 'day' | 'hour' }))
                    }
                    className={`w-28 px-2 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                  </select>
                </div>
                {ratesFieldErrors.overtime_rate_amount && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.overtime_rate_amount}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Effective from *</label>
                <input
                  type="date"
                  value={ratesFormData.effective_from}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, effective_from: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
                {ratesFieldErrors.effective_from && (
                  <p className="text-xs text-red-500 mt-1">{ratesFieldErrors.effective_from}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Hours / day (0–24)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={ratesFormData.hours_per_day}
                    onChange={(e) => setRatesFormData((p) => ({ ...p, hours_per_day: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Currency (3 letters)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={ratesFormData.currency_code}
                    onChange={(e) =>
                      setRatesFormData((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))
                    }
                    placeholder="INR"
                    className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Notes (max 5000)</label>
                <textarea
                  value={ratesFormData.notes}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, notes: e.target.value.slice(0, 5000) }))}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} text-sm`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStoreRate}
                  disabled={isSubmittingRate || rateFormOptionsLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingRate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Save rate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRatesModal(false);
                    setRatesLabourDropdownOpen(false);
                    setRatesLabourSearch('');
                    setRatesFieldErrors({});
                  }}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateLabourModal
        theme={theme}
        isOpen={showRatesCreateLabourModal}
        onClose={() => setShowRatesCreateLabourModal(false)}
        labours={rateLabourPicks.map((l) => ({
          id: l.id,
          numericId: l.numericId,
          uuid: l.uuid,
          name: l.name,
          code: l.code || undefined,
          category: l.category,
        }))}
        onSuccess={(created) => {
          setShowRatesCreateLabourModal(false);
          const raw = created && typeof created === 'object' ? (created as any) : null;
          const row = raw?.id != null || raw?.uuid != null ? raw : raw?.data;
          if (row && (row.id != null || row.uuid != null)) {
            const next = transformRatesLabourList([row]);
            if (next.length) {
              const item = next[0];
              setRatesFormData((p) => ({
                ...p,
                labour_id: String(item.numericId),
              }));
            }
          }
          contractorLaborRatesAPI
            .formOptions()
            .then((res) => setRateFormOptions(extractContractorRateFormOptions(res)))
            .catch(() => {});
        }}
      />
    </div>
  );
};

export default WorkforceManagement;
