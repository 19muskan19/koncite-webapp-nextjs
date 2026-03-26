'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Trash2
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
import { masterDataAPI, teamsAPI, workforceAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';

type TabType = 'dashboard' | 'punch' | 'staff' | 'contractor' | 'pay';

interface Labour {
  id: number | string;
  uuid?: string;
  name: string;
  code?: string;
  category?: string;
  unit?: { unit: string };
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  designation: string;
  phone?: string;
  profile_images?: string;
  worker_type?: 'staff' | 'own_labor'; // staff = from teams, own_labor = from Add Profile
}

interface Vendor {
  id: number | string;
  name: string;
  uuid?: string;
}

interface LabourEntryRow {
  category: string;
  headCount: number | '';
  unitsWorked: number | string;
  otHoursPerPerson: number | string;
}

const defaultLabourRow = (): LabourEntryRow => ({ category: 'Mason', headCount: 1, unitsWorked: 1, otHoursPerPerson: 0 });

// Punch: All punch data stored in localStorage (as of now - backend may not persist)
// punchedInEmployees: who punched in today (for Punch OUT list)
// punchRecords: full punch history with photo, time, location, date
const PUNCHED_IN_STORAGE_KEY = 'punchedInEmployees';
const PUNCH_RECORDS_STORAGE_KEY = 'punchRecords';

interface PunchedInEntry {
  id: number | string;
  name: string;
  category?: string;
  date: string; // Date.toDateString() e.g. "Wed Mar 04 2025"
}

interface PunchRecord {
  labourId: number | string;
  record: string; // labour name (category)
  photoThumb: string; // base64 thumbnail for display
  time: string;
  location: string;
  latitude?: number; // geo - for future sync
  longitude?: number;
  date: string; // display date e.g. "3/4/2025"
  dateKey?: string; // for filtering: getTodayString()
  punchType: 'punch_in' | 'punch_out';
  createdAt?: string; // ISO timestamp for ordering
}

const getTodayString = () => new Date().toDateString();
const PAGINATION_PAGE_SIZE = 10;

const getPunchedInEmployees = (): PunchedInEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PUNCHED_IN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePunchedInEmployees = (entries: PunchedInEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUNCHED_IN_STORAGE_KEY, JSON.stringify(entries));
  } catch {}
};

// Clear entries if date changed (new day)
const clearPunchedInIfNewDay = () => {
  const entries = getPunchedInEmployees();
  const today = getTodayString();
  const filtered = entries.filter((e) => e.date === today);
  if (filtered.length !== entries.length) {
    savePunchedInEmployees(filtered);
  }
};

const getPunchRecords = (): PunchRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PUNCH_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePunchRecord = (record: PunchRecord) => {
  const today = getTodayString();
  const existing = getPunchRecords().filter((r) => (r as any).dateKey === today || new Date(r.date).toDateString() === today);
  const next = [...existing, record];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PUNCH_RECORDS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
};

const clearPunchRecordsIfNewDay = () => {
  const today = getTodayString();
  const all = getPunchRecords();
  const todayRecords = all.filter((r) => {
    const key = (r as any).dateKey;
    if (key) return key === today;
    try {
      return new Date(r.date).toDateString() === today;
    } catch {
      return false;
    }
  });
  if (todayRecords.length !== all.length && typeof window !== 'undefined') {
    try {
      localStorage.setItem(PUNCH_RECORDS_STORAGE_KEY, JSON.stringify(todayRecords));
    } catch {}
  }
};

interface WorkforceManagementProps {
  theme: ThemeType;
}

const WorkforceManagement: React.FC<WorkforceManagementProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';

  // === PUNCH TAB ===
  const [labours, setLabours] = useState<Labour[]>([]);
  const [isLoadingLabours, setIsLoadingLabours] = useState(false);
  const [punchedInEmployees, setPunchedInEmployees] = useState<PunchedInEntry[]>([]);
  const [punchType, setPunchType] = useState<'punch_in' | 'punch_out'>('punch_in');
  const [selectedLabourId, setSelectedLabourId] = useState<number | string | null>(null);
  const [punchSearchQuery, setPunchSearchQuery] = useState('');
  const [punchRecords, setPunchRecords] = useState<PunchRecord[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [geoLocation, setGeoLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
  } | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);
  const [showPunchSuccessModal, setShowPunchSuccessModal] = useState(false);
  const [punchSuccessData, setPunchSuccessData] = useState<{
    punch_time: string;
    punch_type: string;
    ai_verification: string;
    location: string;
  } | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [punchPage, setPunchPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // === STAFF TAB ===
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState<'staff' | 'own_labor'>('staff'); // Staff (from Teams) | Own Labour
  const [staffFilterDropdownOpen, setStaffFilterDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: number | string; name: string }>>([]);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    project_id: '',
    designation: '',
    worker_type: 'staff' as 'staff' | 'own_labor',
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
  const [ratesFormData, setRatesFormData] = useState({
    vendor_id: '',
    category: 'skilled',
    daily_rate: '',
    daily_rate_unit: 'Day' as 'Hour' | 'Day',
    overtime_rate: '',
    overtime_unit: 'Hour' as 'Hour' | 'Day',
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [rateHistory, setRateHistory] = useState<Array<{ category: string; contractor: string; effectiveFrom: string; dailyRate: string; overtimeRate: string }>>([]);
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    mode: 'Cash' as 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque',
    reference: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Reset punch page when filters change
  useEffect(() => {
    setPunchPage(1);
  }, [punchType, punchSearchQuery]);

  // Reset staff page when search or filter changes
  useEffect(() => {
    setStaffPage(1);
  }, [staffSearchQuery, staffFilter]);

  // Load punchedInEmployees and punch records from localStorage, clear if new day
  useEffect(() => {
    if (activeTab !== 'punch') return;
    clearPunchedInIfNewDay();
    clearPunchRecordsIfNewDay();
    setPunchedInEmployees(getPunchedInEmployees());
    const today = getTodayString();
    setPunchRecords(getPunchRecords().filter((r) => (r as any).dateKey === today || new Date(r.date).toDateString() === today));
  }, [activeTab]);

  // Punch IN list: labours who have NOT punched in today
  // Punch OUT list: labours who HAVE punched in today (from localStorage)
  const todayStr = getTodayString();
  const punchInList = labours.filter(
    (l) => !punchedInEmployees.some((p) => String(p.id) === String(l.id) && p.date === todayStr)
  );
  const punchOutList = punchedInEmployees
    .filter((p) => p.date === todayStr)
    .map((p) => ({ id: p.id, name: p.name, category: p.category || '', code: '' }));

  const currentPunchList = punchType === 'punch_in' ? punchInList : punchOutList;
  const filteredPunchList = punchSearchQuery.trim()
    ? currentPunchList.filter(
        (l) =>
          String(l.name || '').toLowerCase().includes(punchSearchQuery.toLowerCase()) ||
          String(l.category || '').toLowerCase().includes(punchSearchQuery.toLowerCase())
      )
    : currentPunchList;

  // When switching punch type or lists change, reset selection if current labour not in list
  useEffect(() => {
    const list = punchType === 'punch_in' ? punchInList : punchOutList;
    const inList = list.some((l) => String(l.id) === String(selectedLabourId));
    if (selectedLabourId && !inList) {
      setSelectedLabourId(null);
      setPunchSearchQuery('');
    }
  }, [punchType, punchInList, punchOutList, selectedLabourId]);

  // Fetch staff for Punch tab (page already guards auth, so fetch when tab is punch)
  useEffect(() => {
    if (activeTab !== 'punch') return;
    let cancelled = false;
    setIsLoadingLabours(true);
    teamsAPI
      .getTeamsList()
      .then((data) => {
        if (!cancelled) {
          const raw = Array.isArray(data) ? data : [];
          setLabours(raw.map((u: any) => ({
            id: u.id ?? u.uuid,
            uuid: u.uuid,
            name: u.name || '',
            category: u.designation || u.company_role?.name || '',
            code: '',
            unit: undefined,
          })));
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          toast.showError(e?.message || 'Failed to load staff');
          setLabours([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLabours(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

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

  // Fetch staff for Staff tab
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'staff') return;
    setIsLoadingStaff(true);
    teamsAPI
      .getTeamsList()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStaffList(
          list.map((u: any) => ({
            id: String(u.id ?? u.uuid ?? ''),
            name: u.name || '',
            email: u.email || '',
            designation: u.designation || u.company_role?.name || '—',
            phone: u.phone || u.contact_number || '',
            profile_images: u.profile_images,
            worker_type: (u.worker_type === 'own_labor' ? 'own_labor' : 'staff') as 'staff' | 'own_labor',
          }))
        );
      })
      .catch((e: any) => {
        toast.showError(e?.message || 'Failed to load staff');
        setStaffList([]);
      })
      .finally(() => setIsLoadingStaff(false));
  }, [isAuthenticated, activeTab]);

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

  // Load contractor data: projects and contractors from master API (for Dashboard, Logs, Pay tabs)
  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'contractor' && activeTab !== 'pay') return;
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
  }, [activeTab, dataVersion]);

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
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Camera for Punch
  useEffect(() => {
    if (!showCameraModal) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCapturedPhoto(null);
      setPhotoPreview(null);
      return;
    }
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => toast.showError('Camera access denied: ' + (e.message || 'Enable camera')));
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCameraModal]);

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;
    setIsCapturingPhoto(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedPhoto(blob);
            setPhotoPreview(URL.createObjectURL(blob));
          }
          setIsCapturingPhoto(false);
        },
        'image/jpeg',
        0.9
      );
    } else {
      setIsCapturingPhoto(false);
    }
  };

  const handlePunchSubmit = async () => {
    if (!selectedLabourId || !capturedPhoto || !geoLocation) {
      toast.showWarning('Please select labour, capture photo, and ensure location is available');
      return;
    }
    const selectedLabour = (punchType === 'punch_in' ? punchInList : punchOutList).find((l) => String(l.id) === String(selectedLabourId));
    const labourName = selectedLabour?.name ?? '';
    const labourCategory = selectedLabour?.category ?? '';
    setIsSubmittingPunch(true);
    try {
      const fd = new FormData();
      fd.append('labour_id', String(selectedLabourId));
      fd.append('punch_type', punchType);
      fd.append('photo', capturedPhoto, 'punch.jpg');
      fd.append('latitude', String(geoLocation.latitude));
      fd.append('longitude', String(geoLocation.longitude));
      if (geoLocation.accuracy != null) fd.append('accuracy', String(geoLocation.accuracy));
      if (geoLocation.altitude != null) fd.append('altitude', String(geoLocation.altitude));

      const res = await workforceAPI.punchSubmit(fd);
      setShowCameraModal(false);

      const punchTime = res?.punch_time ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const locStr = res?.location ?? `Lat: ${geoLocation.latitude.toFixed(4)}, Lng: ${geoLocation.longitude.toFixed(4)}${geoLocation.accuracy != null ? ` (±${geoLocation.accuracy.toFixed(0)}m)` : ''}`;
      const today = getTodayString();
      const punchDate = new Date().toLocaleDateString();

      // Create thumbnail for record (80x80)
      let photoThumb = '';
      try {
        const canvas = document.createElement('canvas');
        const img = new Image();
        const url = URL.createObjectURL(capturedPhoto);
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
      } catch {}

      const record: PunchRecord = {
        labourId: selectedLabourId,
        record: `${labourName} (${labourCategory || '—'})`,
        photoThumb,
        time: punchTime,
        location: locStr,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        date: punchDate,
        dateKey: today,
        punchType,
        createdAt: new Date().toISOString(),
      };
      savePunchRecord(record);
      setPunchRecords((prev) => [...prev, record]);

      setPunchSuccessData({
        punch_time: punchTime,
        punch_type: punchType,
        ai_verification: res?.ai_verification ?? 'Recorded',
        location: locStr,
      });
      setShowPunchSuccessModal(true);

      // Update localStorage (punched in/out)
      if (punchType === 'punch_in') {
        const next = [...getPunchedInEmployees().filter((e) => e.date !== today || String(e.id) !== String(selectedLabourId)), { id: selectedLabourId, name: labourName, category: labourCategory, date: today }];
        savePunchedInEmployees(next);
        setPunchedInEmployees(next);
      } else {
        const next = getPunchedInEmployees().filter((e) => !(e.date === today && String(e.id) === String(selectedLabourId)));
        savePunchedInEmployees(next);
        setPunchedInEmployees(next);
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to submit punch');
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  const openPunchFlow = async () => {
    if (!selectedLabourId) {
      toast.showWarning('Please select a labour first');
      return;
    }
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast.showWarning('Camera access is required. Please enable camera permission.');
        return;
      }

      setCapturedPhoto(null);
      setPhotoPreview(null);
      setShowCameraModal(true);
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesFilter =
      staffFilter === 'staff'
        ? (s.worker_type ?? 'staff') !== 'own_labor'
        : s.worker_type === 'own_labor';
    const matchesSearch =
      !staffSearchQuery ||
      [s.name, s.email, s.designation, s.phone].some((v) =>
        String(v || '').toLowerCase().includes(staffSearchQuery.toLowerCase())
      );
    return matchesFilter && matchesSearch;
  });

  const handleAddProfileSubmit = async () => {
    const { name, project_id, designation, worker_type, profile_images } = staffFormData;
    if (!name.trim()) {
      toast.showWarning('Full Name is required');
      return;
    }
    if (!project_id) {
      toast.showWarning('Project Name is required');
      return;
    }
    if (!designation.trim()) {
      toast.showWarning('Role/Designation is required');
      return;
    }
    if (!profile_images) {
      toast.showWarning('Profile Photo is required (camera or file upload)');
      return;
    }
    setIsSubmittingStaff(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('project_id', project_id);
      fd.append('designation', designation.trim());
      fd.append('worker_type', worker_type);
      fd.append('profile_images', profile_images);
      await workforceAPI.addWorkerProfile(fd);
      toast.showSuccess('Profile added successfully');
      setShowAddProfileModal(false);
      setStaffFormData({ name: '', project_id: '', designation: '', worker_type: 'staff', profile_images: null });
      teamsAPI.getTeamsList().then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStaffList(
          list.map((u: any) => ({
            id: String(u.id ?? u.uuid ?? ''),
            name: u.name || '',
            email: u.email || '',
            designation: u.designation || u.company_role?.name || '—',
            phone: u.phone || u.contact_number || '',
            profile_images: u.profile_images,
            worker_type: (u.worker_type === 'own_labor' ? 'own_labor' : 'staff') as 'staff' | 'own_labor',
          }))
        );
      });
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to add profile');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleAddLabourEntry = () => {
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
    if (!projectName || !contractorName) {
      toast.showWarning('Please select valid project and contractor');
      return;
    }
    const validRows = labourRows.filter(
      (r) => r.category && r.headCount !== '' && r.headCount >= 1
    );
    if (validRows.length === 0) {
      toast.showWarning('Add at least one labour type with valid head count or units');
      return;
    }
    try {
      for (const row of validRows) {
        const h = row.headCount === '' ? 1 : Math.max(1, row.headCount);
        const u = (row.unitsWorked === '' || row.unitsWorked === '.') ? 0 : Math.max(0, Number(row.unitsWorked) || 0);
        const o = (row.otHoursPerPerson === '' || row.otHoursPerPerson === '.') ? 0 : Math.max(0, Number(row.otHoursPerPerson) || 0);
        saveContractorEntry({
          projectName,
          contractorName,
          category: row.category,
          headCount: h,
          unitsWorked: u,
          otHoursPerPerson: o,
          date,
        });
      }
      toast.showSuccess(`Labour log added successfully! (${validRows.length} type${validRows.length > 1 ? 's' : ''})`);
      setShowAddLabourEntryModal(false);
      setDataVersion((v) => v + 1);
      setLabourEntryFormData({
        date: new Date().toISOString().slice(0, 10),
        project_id: '',
        contractor_id: '',
        labourRows: [defaultLabourRow()],
      });
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to add log');
    }
  };

  const handleStoreRate = async () => {
    const vendorId = ratesFormData.vendor_id;
    const dailyRate = parseFloat(ratesFormData.daily_rate);
    const contractor = vendors.find((v) => String(v.id) === String(vendorId));
    if (!vendorId) {
      toast.showWarning('Please select a contractor');
      return;
    }
    if (isNaN(dailyRate) || dailyRate < 0) {
      toast.showWarning('Valid daily rate is required');
      return;
    }
    setIsSubmittingRate(true);
    try {
      await workforceAPI.storeRate({
        vendor_id: Number(vendorId),
        category: ratesFormData.category,
        daily_rate: dailyRate,
        overtime_rate: ratesFormData.overtime_rate ? parseFloat(ratesFormData.overtime_rate) : undefined,
      });
      toast.showSuccess('Rate saved successfully');
      setRateHistory((prev) => [
        ...prev,
        {
          category: ratesFormData.category,
          contractor: contractor?.name || '',
          effectiveFrom: ratesFormData.effective_from,
          dailyRate: ratesFormData.daily_rate,
          overtimeRate: ratesFormData.overtime_rate || '0',
        },
      ]);
      setShowRatesModal(false);
      setRatesFormData({
        vendor_id: '',
        category: 'skilled',
        daily_rate: '',
        daily_rate_unit: 'Day',
        overtime_rate: '',
        overtime_unit: 'Hour',
        effective_from: new Date().toISOString().slice(0, 10),
      });
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to store rate');
    } finally {
      setIsSubmittingRate(false);
    }
  };

  const handleConfirmPayment = () => {
    const amount = parseFloat(paymentFormData.amount);
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
      setPaymentFormData({ amount: '', mode: 'Cash', reference: '' });
      setDataVersion((v) => v + 1);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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
            <WorkforceDashboardTab
              theme={theme}
              isDark={isDark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderClass={borderClass}
              projects={contractorProjects}
            />
          )}

          {/* PUNCH TAB */}
          {activeTab === 'punch' && (
            <div className="space-y-6">
              {/* Punch IN / Punch OUT heading */}
              <div>
                <h3 className={`text-sm font-bold ${textSecondary} mb-3`}>Punch Type</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPunchType('punch_in')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors ${
                      punchType === 'punch_in'
                        ? 'bg-[#6B8E23] text-white'
                        : isDark
                        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Punch IN
                  </button>
                  <button
                    onClick={() => setPunchType('punch_out')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors ${
                      punchType === 'punch_out'
                        ? 'bg-[#6B8E23] text-white'
                        : isDark
                        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Punch OUT
                  </button>
                </div>
              </div>

              {/* Staff table - below heading */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <label className={`text-sm font-bold ${textPrimary}`}>
                    {punchType === 'punch_in' ? 'Staff (who have not punched in today)' : 'Staff (who punched in today)'}
                  </label>
                  <div className="relative w-full sm:w-64">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                    <input
                      type="text"
                      placeholder="Search by name or designation..."
                      value={punchSearchQuery}
                      onChange={(e) => setPunchSearchQuery(e.target.value)}
                      disabled={isLoadingLabours}
                      className={`w-full pl-9 pr-4 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${
                        isDark ? 'bg-slate-800' : 'bg-white'
                      } focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent`}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-inherit">
                  <table className="w-full min-w-[320px]">
                    <thead>
                      <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Sr. No.</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Name</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Designation</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingLabours ? (
                        <tr>
                          <td colSpan={4} className={`py-8 text-center ${textSecondary}`}>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredPunchList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={`py-8 text-center text-sm ${textSecondary}`}>
                            {punchSearchQuery.trim() ? 'No matching staff' : punchType === 'punch_in' && labours.length > 0 ? 'All staff have punched in today' : punchType === 'punch_out' ? 'No one has punched in today yet' : 'No staff available'}
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const punchTotal = filteredPunchList.length;
                          const punchTotalPages = Math.ceil(punchTotal / PAGINATION_PAGE_SIZE) || 1;
                          const punchStart = (punchPage - 1) * PAGINATION_PAGE_SIZE;
                          const punchPaginated = filteredPunchList.slice(punchStart, punchStart + PAGINATION_PAGE_SIZE);
                          return punchPaginated.map((l, idx) => {
                            const isSelected = String(l.id) === String(selectedLabourId);
                            return (
                              <tr
                                key={l.id}
                                className={`border-b border-inherit ${isSelected ? (isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10') : ''} hover:bg-black/5 dark:hover:bg-white/5`}
                              >
                                <td className={`py-3 px-4 text-sm ${textPrimary}`}>{punchStart + idx + 1}</td>
                              <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{l.name}</td>
                              <td className={`py-3 px-4 text-sm ${textPrimary}`}>{l.category || '—'}</td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLabourId(isSelected ? null : l.id)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                    isSelected
                                      ? 'bg-[#6B8E23] text-white'
                                      : isDark
                                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'Select'}
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })() )}
                    </tbody>
                  </table>
                </div>
                {filteredPunchList.length > PAGINATION_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-sm ${textSecondary}`}>
                      Showing {((punchPage - 1) * PAGINATION_PAGE_SIZE) + 1}-{Math.min(punchPage * PAGINATION_PAGE_SIZE, filteredPunchList.length)} of {filteredPunchList.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPunchPage((p) => Math.max(1, p - 1))}
                        disabled={punchPage <= 1}
                        className={`p-2 rounded-lg border ${borderClass} disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {punchPage} / {Math.ceil(filteredPunchList.length / PAGINATION_PAGE_SIZE) || 1}
                      </span>
                      <button
                        onClick={() => setPunchPage((p) => Math.min(Math.ceil(filteredPunchList.length / PAGINATION_PAGE_SIZE), p + 1))}
                        disabled={punchPage >= Math.ceil(filteredPunchList.length / PAGINATION_PAGE_SIZE)}
                        className={`p-2 rounded-lg border ${borderClass} disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={openPunchFlow}
                    disabled={!selectedLabourId || isCheckingPermissions}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCheckingPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {isCheckingPermissions ? 'Checking...' : 'Capture Photo & Punch'}
                  </button>
                </div>
              </div>

              {/* Punch Records table */}
              <div>
                <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Punch Records (Today)</h3>
                <div className="overflow-x-auto rounded-lg border border-inherit">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Record</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Photo</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Time</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Location</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {punchRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={`py-8 text-center text-sm ${textSecondary}`}>No punch records today</td>
                        </tr>
                      ) : (
                        [...punchRecords].reverse().map((r, idx) => (
                          <tr key={idx} className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}>
                            <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{r.record}</td>
                            <td className="py-3 px-4">
                              {r.photoThumb ? (
                                <img src={r.photoThumb} alt="" className="w-12 h-12 rounded-lg object-cover" />
                              ) : (
                                <span className={`text-xs ${textSecondary}`}>—</span>
                              )}
                            </td>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{r.time}</td>
                            <td className={`py-3 px-4 text-xs ${textPrimary} max-w-[180px] truncate`} title={r.location}>{r.location}</td>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{r.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
                      <span>{staffFilter === 'staff' ? 'Staff (from Teams)' : 'Own Labour'}</span>
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
                          Staff (from Teams)
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
                  Add Profile
                </button>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className={`border-b ${borderClass}`}>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Sr. No.</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Name</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Email</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Designation</th>
                      <th className={`text-left py-3 px-2 sm:px-4 text-xs font-bold uppercase ${textSecondary}`}>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingStaff ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center ${textSecondary}`}>
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center ${textSecondary}`}>No staff found</td>
                      </tr>
                    ) : (
                      (() => {
                        const staffTotal = filteredStaff.length;
                        const staffTotalPages = Math.ceil(staffTotal / PAGINATION_PAGE_SIZE) || 1;
                        const staffStart = (staffPage - 1) * PAGINATION_PAGE_SIZE;
                        const staffPaginated = filteredStaff.slice(staffStart, staffStart + PAGINATION_PAGE_SIZE);
                        return staffPaginated.map((s, idx) => (
                          <tr key={s.id} className={`border-b ${borderClass} hover:bg-black/5 dark:hover:bg-white/5`}>
                            <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{staffStart + idx + 1}</td>
                            <td className={`py-3 px-2 sm:px-4 text-sm font-medium ${textPrimary}`}>{s.name || '—'}</td>
                            <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.email || '—'}</td>
                            <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.designation || '—'}</td>
                            <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.phone || '—'}</td>
                          </tr>
                        ));
                      })()
                    )}
                  </tbody>
                </table>
              </div>
              {filteredStaff.length > PAGINATION_PAGE_SIZE && (
                <div className={`flex flex-wrap items-center justify-between gap-2 mt-3 py-2 ${textSecondary} text-sm`}>
                  <span>
                    Showing {((staffPage - 1) * PAGINATION_PAGE_SIZE) + 1}-{Math.min(staffPage * PAGINATION_PAGE_SIZE, filteredStaff.length)} of {filteredStaff.length}
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
                      Page {staffPage} of {Math.ceil(filteredStaff.length / PAGINATION_PAGE_SIZE) || 1}
                    </span>
                    <button
                      onClick={() => setStaffPage((p) => Math.min(Math.ceil(filteredStaff.length / PAGINATION_PAGE_SIZE), p + 1))}
                      disabled={staffPage >= Math.ceil(filteredStaff.length / PAGINATION_PAGE_SIZE)}
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
                          <table className="w-full min-w-[600px]">
                            <thead>
                              <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Category</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Contractor · Project</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Head</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Units</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>OT</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Amount</th>
                                <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary} w-16`}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {byDate[dateKey].map((e) => (
                                <tr key={e.id} className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.category}</td>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>
                                    <span className="font-medium">{e.contractorName}</span>
                                    <span className={`text-xs ${textSecondary}`}> · {e.projectName}</span>
                                  </td>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.headCount}</td>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.unitsWorked} day(s)</td>
                                  <td className={`py-3 px-4 text-sm ${textPrimary}`}>{e.otHoursPerPerson} hr</td>
                                  <td className={`py-3 px-4 text-sm font-bold ${textPrimary}`}>₹{e.amount.toLocaleString('en-IN')}</td>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project</label>
                  <select
                    value={payProject}
                    onChange={(e) => setPayProject(e.target.value)}
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
                    value={payContractor}
                    onChange={(e) => setPayContractor(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="">All</option>
                    {[...new Set([
                      ...getContractorEntries().map((e) => e.contractorName),
                      ...vendors.map((v) => v.name || ''),
                    ])].filter(Boolean).sort().map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Period</label>
                  <select
                    value={payPeriodFilter}
                    onChange={(e) => setPayPeriodFilter(e.target.value as 'all' | 'weekly' | 'fortnight' | 'monthly')}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="all">All</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnight">Fortnight</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              {(() => {
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
                const totalBilled = entries.reduce((s, e) => s + e.amount, 0);
                const paidEntries = entries.filter((e) => e.paid);
                const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);
                const unpaid = entries.filter((e) => !e.paid);
                const outstanding = unpaid.reduce((s, e) => s + e.amount, 0);
                const selectedTotal = unpaid
                  .filter((e) => selectedPayEntryIds.has(e.id))
                  .reduce((s, e) => s + e.amount, 0);
                return (
                  <>
                    <div className={`grid grid-cols-3 gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                      <div>
                        <p className={`text-xs font-bold uppercase ${textSecondary}`}>Total Billed</p>
                        <p className={`text-lg font-black ${textPrimary}`}>₹{totalBilled.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase ${textSecondary}`}>Total Paid</p>
                        <p className={`text-lg font-black ${textPrimary}`}>₹{totalPaid.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase ${textSecondary}`}>Outstanding</p>
                        <p className={`text-lg font-black ${outstanding > 0 ? 'text-red-600' : 'text-green-600'} ${textPrimary}`}>
                          ₹{outstanding.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Unpaid Logs</h3>
                      <div className="flex gap-2 mb-3">
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
                      <div className="overflow-x-auto rounded-lg border border-inherit max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className={`sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <tr className={`border-b ${borderClass}`}>
                              <th className="text-left py-2 px-3 text-xs font-bold w-8"/>
                              <th className={`text-left py-2 px-3 text-xs font-bold ${textSecondary}`}>Date</th>
                              <th className={`text-left py-2 px-3 text-xs font-bold ${textSecondary}`}>Project</th>
                              <th className={`text-left py-2 px-3 text-xs font-bold ${textSecondary}`}>Contractor</th>
                              <th className={`text-left py-2 px-3 text-xs font-bold ${textSecondary}`}>Category / Labour Details</th>
                              <th className={`text-left py-2 px-3 text-xs font-bold ${textSecondary}`}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unpaid.length === 0 ? (
                              <tr><td colSpan={6} className={`py-6 text-center text-sm ${textSecondary}`}>No unpaid logs</td></tr>
                            ) : (
                              unpaid.map((e) => {
                                const rateInfo = getRateForDate(e.projectName, e.contractorName, e.category, e.date);
                                const unitLabel = rateInfo.unit === 'Hr' ? 'hrs' : 'days';
                                const otUnitLabel = rateInfo.otUnit === 'Hr' ? 'hrs' : 'days';
                                const labourDetails = `${e.category} · ${e.headCount} pax · ${e.unitsWorked} ${unitLabel} · ${e.otHoursPerPerson} ${otUnitLabel} OT`;
                                return (
                                  <tr key={e.id} className={`border-b border-inherit hover:bg-black/5`}>
                                    <td className="py-2 px-3">
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
                                    <td className={`py-2 px-3 text-sm ${textPrimary}`}>{new Date(e.date).toLocaleDateString()}</td>
                                    <td className={`py-2 px-3 text-sm ${textPrimary}`}>{e.projectName}</td>
                                    <td className={`py-2 px-3 text-sm ${textPrimary}`}>{e.contractorName}</td>
                                    <td className={`py-2 px-3 text-sm ${textPrimary}`} title={labourDetails}>
                                      <span className="font-medium">{e.category}</span>
                                      <span className={`block text-xs ${textSecondary} mt-0.5`}>
                                        {e.headCount} pax · {e.unitsWorked} {unitLabel} · {e.otHoursPerPerson} {otUnitLabel} OT
                                      </span>
                                    </td>
                                    <td className={`py-2 px-3 text-sm font-bold ${textPrimary}`}>₹{e.amount.toLocaleString('en-IN')}</td>
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
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>Capture Photo & Location</span>
              <button onClick={() => setShowCameraModal(false)} className="p-1 hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Captured" className="w-full rounded-lg object-cover" />
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      setCapturedPhoto(null);
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/60 text-white text-xs font-bold"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                </div>
              ) : (
                <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              )}
              {geoLocation && (
                <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  Lat: {geoLocation.latitude.toFixed(4)}, Lng: {geoLocation.longitude.toFixed(4)}
                  {geoLocation.accuracy != null && ` (±${geoLocation.accuracy.toFixed(0)}m)`}
                </div>
              )}
              <div className="flex gap-2">
                {!photoPreview ? (
                  <button
                    onClick={capturePhoto}
                    disabled={isCapturingPhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                  >
                    {isCapturingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    Capture
                  </button>
                ) : (
                  <button
                    onClick={handlePunchSubmit}
                    disabled={isSubmittingPunch}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                  >
                    {isSubmittingPunch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Submit Punch
                  </button>
                )}
                <button
                  onClick={() => setShowCameraModal(false)}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit hover:bg-black/5 dark:hover:bg-white/5"
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

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl overflow-hidden my-4 sm:my-8 ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>New Worker Profile</span>
              <button onClick={() => setShowAddProfileModal(false)} className="p-1 hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
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
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Role/Designation *</label>
                <input
                  type="text"
                  value={staffFormData.designation}
                  onChange={(e) => setStaffFormData((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Site Engineer, Supervisor"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
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
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Profile Photo *</label>
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
                    onClick={() => staffFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-inherit hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <Camera className="w-4 h-4" />
                    Camera or File
                  </button>
                  {staffFormData.profile_images && (
                    <span className={`text-sm ${textSecondary}`}>{staffFormData.profile_images.name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddProfileSubmit}
                  disabled={isSubmittingStaff}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingStaff ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Add Profile
                </button>
                <button
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
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
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Date *</label>
                <input
                  type="date"
                  value={labourEntryFormData.date}
                  onChange={(e) => setLabourEntryFormData((p) => ({ ...p, date: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div ref={labourEntryProjectRef} className="relative">
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Project *</label>
                <div
                  onClick={() => setLabourEntryProjectDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'} cursor-pointer min-h-[42px]`}
                >
                  <span className="flex-1 text-left truncate">
                    {labourEntryFormData.project_id
                      ? contractorProjects.find((p) => String(p.id) === String(labourEntryFormData.project_id))?.name || '— Select project —'
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
                      {contractorProjects
                        .filter((p) => !labourEntryProjectSearch.trim() || p.name.toLowerCase().includes(labourEntryProjectSearch.toLowerCase()))
                        .map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setLabourEntryFormData((prev) => ({ ...prev, project_id: String(p.id) }));
                              setLabourEntryProjectDropdownOpen(false);
                              setLabourEntryProjectSearch('');
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-[#6B8E23]/10 ${String(p.id) === String(labourEntryFormData.project_id) ? 'bg-[#6B8E23]/20' : ''} ${textPrimary}`}
                          >
                            {p.name}
                          </div>
                        ))}
                      {contractorProjects.filter((p) => !labourEntryProjectSearch.trim() || p.name.toLowerCase().includes(labourEntryProjectSearch.toLowerCase())).length === 0 && (
                        <div className={`px-4 py-3 text-sm ${textSecondary}`}>No projects found</div>
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
                      ? vendors.find((v) => String(v.id) === String(labourEntryFormData.contractor_id))?.name || '— Select contractor —'
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
                      {vendors
                        .filter((v) => !labourEntryContractorSearch.trim() || (v.name || '').toLowerCase().includes(labourEntryContractorSearch.toLowerCase()))
                        .map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setLabourEntryFormData((prev) => ({ ...prev, contractor_id: String(v.id) }));
                              setLabourEntryContractorDropdownOpen(false);
                              setLabourEntryContractorSearch('');
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-[#6B8E23]/10 ${String(v.id) === String(labourEntryFormData.contractor_id) ? 'bg-[#6B8E23]/20' : ''} ${textPrimary}`}
                          >
                            {v.name}
                          </div>
                        ))}
                      {vendors.filter((v) => !labourEntryContractorSearch.trim() || (v.name || '').toLowerCase().includes(labourEntryContractorSearch.toLowerCase())).length === 0 && (
                        <div className={`px-4 py-3 text-sm ${textSecondary}`}>No contractors found</div>
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
                    const project = contractorProjects.find((p) => String(p.id) === String(labourEntryFormData.project_id));
                    const contractor = vendors.find((v) => String(v.id) === String(labourEntryFormData.contractor_id));
                    const projectName = project?.name ?? '';
                    const contractorName = contractor?.name ?? '';
                    const rateInfo =
                      projectName && contractorName
                        ? getRateForDate(projectName, contractorName, row.category, labourEntryFormData.date)
                        : null;
                    const unitLabel = rateInfo?.unit === 'Hr' ? 'hrs' : 'days';
                    const otUnitLabel = rateInfo?.otUnit === 'Hr' ? 'hrs' : 'days';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold ${textSecondary}`}>Type {idx + 1}</span>
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
                            <label className={`block text-xs font-bold ${textPrimary} mb-1`}>Category</label>
                            <select
                              value={row.category}
                              onChange={(e) =>
                                setLabourEntryFormData((p) => ({
                                  ...p,
                                  labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r)),
                                }))
                              }
                              className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                            >
                              <option value="Mason">Mason</option>
                              <option value="Carpenter">Carpenter</option>
                              <option value="Fitter">Fitter</option>
                              <option value="Helper">Helper</option>
                              <option value="Electrician">Electrician</option>
                              <option value="Plumber">Plumber</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                Head Count <span className={textSecondary}>({unitLabel})</span>
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.headCount}
                                onFocus={() =>
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, headCount: '' } : r)),
                                  }))
                                }
                                onBlur={(e) => {
                                  const v = e.target.value.replace(/\D/g, '');
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) =>
                                      i === idx ? { ...r, headCount: v === '' ? 1 : Math.max(1, parseInt(v, 10) || 1) } : r
                                    ),
                                  }));
                                }}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, '');
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) =>
                                      i === idx
                                        ? { ...r, headCount: v === '' ? '' : Math.max(1, parseInt(v, 10) || 1) }
                                        : r
                                    ),
                                  }));
                                }}
                                className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                Units ({unitLabel})
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.unitsWorked}
                                onFocus={() =>
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, unitsWorked: '' } : r)),
                                  }))
                                }
                                onBlur={(e) => {
                                  const v = e.target.value.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '').trim();
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) =>
                                      i === idx ? { ...r, unitsWorked: v === '' || v === '.' ? 0 : Math.max(0, parseFloat(v) || 0) } : r
                                    ),
                                  }));
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const v = raw.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '');
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, unitsWorked: v === '' ? '' : v === '.' ? '.' : v } : r)),
                                  }));
                                }}
                                className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-bold ${textPrimary} mb-1`}>
                                OT (per person, {otUnitLabel})
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.otHoursPerPerson}
                                onFocus={() =>
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, otHoursPerPerson: '' } : r)),
                                  }))
                                }
                                onBlur={(e) => {
                                  const v = e.target.value.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '').trim();
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) =>
                                      i === idx
                                        ? { ...r, otHoursPerPerson: v === '' || v === '.' ? 0 : Math.max(0, parseFloat(v) || 0) }
                                        : r
                                    ),
                                  }));
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const v = raw.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '');
                                  setLabourEntryFormData((p) => ({
                                    ...p,
                                    labourRows: p.labourRows.map((r, i) => (i === idx ? { ...r, otHoursPerPerson: v === '' ? '' : v === '.' ? '.' : v } : r)),
                                  }));
                                }}
                                className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                              />
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
                  onClick={handleAddLabourEntry}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]"
                >
                  <Check className="w-5 h-5" />
                  Submit
                </button>
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
              </div>
            </div>
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
                onClick={() => setShowPaymentModal(false)}
                className="p-1 hover:opacity-70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Enter amount"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Mode</label>
                <select
                  value={paymentFormData.mode}
                  onChange={(e) => setPaymentFormData((p) => ({ ...p, mode: e.target.value as 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Reference / Notes</label>
                <input
                  type="text"
                  value={paymentFormData.reference}
                  onChange={(e) => setPaymentFormData((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Optional"
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmPayment}
                  disabled={isSubmittingPayment}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Settle
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Rates Modal (alternate entry) */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${cardClass} border ${borderClass}`}>
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold ${textPrimary}`}>Set Contractor Rate</span>
              <button onClick={() => setShowRatesModal(false)} className="p-1 hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Contractor *</label>
                <select
                  value={ratesFormData.vendor_id}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, vendor_id: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="">— Select contractor —</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Role/Category *</label>
                <select
                  value={ratesFormData.category}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, category: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="skilled">Skilled</option>
                  <option value="semiskilled">Semi-skilled</option>
                  <option value="unskilled">Unskilled</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Daily Rate *</label>
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
                    onChange={(e) => setRatesFormData((p) => ({ ...p, daily_rate_unit: e.target.value as 'Hour' | 'Day' }))}
                    className={`w-24 px-2 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="Hour">Hour</option>
                    <option value="Day">Day</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Overtime Rate</label>
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
                    onChange={(e) => setRatesFormData((p) => ({ ...p, overtime_unit: e.target.value as 'Hour' | 'Day' }))}
                    className={`w-24 px-2 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  >
                    <option value="Hour">Hour</option>
                    <option value="Day">Day</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Effective From *</label>
                <input
                  type="date"
                  value={ratesFormData.effective_from}
                  onChange={(e) => setRatesFormData((p) => ({ ...p, effective_from: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleStoreRate}
                  disabled={isSubmittingRate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-[#6B8E23] text-white disabled:opacity-50"
                >
                  {isSubmittingRate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Save Rate
                </button>
                <button
                  onClick={() => setShowRatesModal(false)}
                  className="px-4 py-2.5 rounded-lg font-bold border border-inherit"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceManagement;
