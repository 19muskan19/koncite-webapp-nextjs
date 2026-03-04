'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeType } from '@/types';
import Link from 'next/link';
import { 
  Clock, 
  Users, 
  Briefcase, 
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
  Edit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { masterDataAPI, teamsAPI, workforceAPI } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import CreateProjectModal from '@/components/masters/Modals/CreateProjectModal';
import CreateVendorModal from '@/components/masters/Modals/CreateVendorModal';

type TabType = 'punch' | 'staff' | 'contractor';

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
}

interface Vendor {
  id: number | string;
  name: string;
  uuid?: string;
}

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
  const [activeTab, setActiveTab] = useState<TabType>('punch');
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // === STAFF TAB ===
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
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

  // === CONTRACTOR TAB ===
  const [contractorLabours, setContractorLabours] = useState<Labour[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractorProjects, setContractorProjects] = useState<Array<{ id: number | string; name: string }>>([]);
  const [isLoadingContractor, setIsLoadingContractor] = useState(false);
  const [showAddLabourEntryModal, setShowAddLabourEntryModal] = useState(false);
  const [showManageRates, setShowManageRates] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [labourEntryFormData, setLabourEntryFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    project_id: '',
    contractor_id: '',
    category: 'skilled',
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
  const [contractorSearchQuery, setContractorSearchQuery] = useState('');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [labourEntryProjectDropdownOpen, setLabourEntryProjectDropdownOpen] = useState(false);
  const [labourEntryContractorDropdownOpen, setLabourEntryContractorDropdownOpen] = useState(false);
  const [labourEntryProjectSearch, setLabourEntryProjectSearch] = useState('');
  const [labourEntryContractorSearch, setLabourEntryContractorSearch] = useState('');
  const labourEntryProjectRef = useRef<HTMLDivElement>(null);
  const labourEntryContractorRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'punch' as TabType, label: 'Punch', icon: Clock },
    { id: 'staff' as TabType, label: 'Staff', icon: Users },
    { id: 'contractor' as TabType, label: 'Contractor', icon: Briefcase },
  ];

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

  // Fetch labours for Punch tab (page already guards auth, so fetch when tab is punch)
  useEffect(() => {
    if (activeTab !== 'punch') return;
    let cancelled = false;
    setIsLoadingLabours(true);
    masterDataAPI
      .getLabours({ per_page: 9999 })
      .then((data) => {
        if (!cancelled) {
          const raw = Array.isArray(data) ? data : [];
          setLabours(raw.map((l: any) => ({
            id: l.id ?? l.uuid,
            uuid: l.uuid,
            name: l.name || '',
            category: l.category || '',
            code: l.code,
            unit: l.unit_id && typeof l.unit_id === 'object' ? l.unit_id : l.unit,
          })));
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          toast.showError(e?.message || 'Failed to load labours');
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

  // Fetch contractor data: labours, vendors (contractors), projects
  useEffect(() => {
    if (activeTab !== 'contractor') return;
    setIsLoadingContractor(true);
    Promise.all([
      masterDataAPI.getLabours({ per_page: 9999 }),
      masterDataAPI.getVendorTypeWiseList('contractor'),
      masterDataAPI.getProjects(),
    ])
      .then(([labourData, vendorData, projectData]) => {
        const raw = Array.isArray(labourData) ? labourData : [];
        setContractorLabours(raw.map((l: any) => ({
          id: l.id ?? l.uuid,
          uuid: l.uuid,
          name: l.name || '',
          category: l.category || '',
          code: l.code,
          unit: l.unit_id && typeof l.unit_id === 'object' ? l.unit_id : l.unit,
          is_active: l.is_active,
        })));
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setContractorProjects(
          (Array.isArray(projectData) ? projectData : []).map((p: any) => ({ id: p.id ?? p.uuid, name: p.name || p.project_name || '' }))
        );
      })
      .catch((e: any) => {
        toast.showError(e?.message || 'Failed to load data');
        setContractorLabours([]);
        setVendors([]);
        setContractorProjects([]);
      })
      .finally(() => setIsLoadingContractor(false));
  }, [activeTab]);

  // Refresh projects and vendors (for Add Labour modal after creating project/vendor)
  const refreshContractorProjectsAndVendors = useCallback(() => {
    Promise.all([
      masterDataAPI.getVendorTypeWiseList('contractor'),
      masterDataAPI.getProjects(),
    ])
      .then(([vendorData, projectData]) => {
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setContractorProjects(
          (Array.isArray(projectData) ? projectData : []).map((p: any) => ({ id: p.id ?? p.uuid, name: p.name || p.project_name || '' }))
        );
      })
      .catch(() => {});
  }, []);

  // Close labour entry dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (labourEntryProjectRef.current && !labourEntryProjectRef.current.contains(e.target as Node)) {
        setLabourEntryProjectDropdownOpen(false);
      }
      if (labourEntryContractorRef.current && !labourEntryContractorRef.current.contains(e.target as Node)) {
        setLabourEntryContractorDropdownOpen(false);
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

  const filteredStaff = staffList.filter(
    (s) =>
      !staffSearchQuery ||
      [s.name, s.email, s.designation, s.phone].some((v) =>
        String(v || '').toLowerCase().includes(staffSearchQuery.toLowerCase())
      )
  );

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
    const { date, project_id, contractor_id, category } = labourEntryFormData;
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
    toast.showSuccess('Labor count added successfully!');
    setShowAddLabourEntryModal(false);
    setLabourEntryFormData({ date: new Date().toISOString().slice(0, 10), project_id: '', contractor_id: '', category: 'skilled' });
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
      setShowManageRates(true);
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

  const filteredContractorLabours = contractorLabours.filter(
    (l) =>
      !contractorSearchQuery ||
      [l.name, l.code, l.category].some((v) =>
        String(v || '').toLowerCase().includes(contractorSearchQuery.toLowerCase())
      )
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
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${textPrimary}`}>Workforce Management</h1>
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

              {/* Labour table - below heading */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <label className={`text-sm font-bold ${textPrimary}`}>
                    {punchType === 'punch_in' ? 'Labours (who have not punched in today)' : 'Labours (who punched in today)'}
                  </label>
                  <div className="relative w-full sm:w-64">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                    <input
                      type="text"
                      placeholder="Search by name or category..."
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
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Category</th>
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
                            {punchSearchQuery.trim() ? 'No matching labours' : punchType === 'punch_in' && labours.length > 0 ? 'All labours have punched in today' : punchType === 'punch_out' ? 'No one has punched in today yet' : 'No labours available'}
                          </td>
                        </tr>
                      ) : (
                        filteredPunchList.map((l, idx) => {
                          const isSelected = String(l.id) === String(selectedLabourId);
                          return (
                            <tr
                              key={l.id}
                              className={`border-b border-inherit ${isSelected ? (isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10') : ''} hover:bg-black/5 dark:hover:bg-white/5`}
                            >
                              <td className={`py-3 px-4 text-sm ${textPrimary}`}>{idx + 1}</td>
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
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <button
                    onClick={openPunchFlow}
                    disabled={!selectedLabourId || isCheckingPermissions}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCheckingPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {isCheckingPermissions ? 'Checking...' : 'Capture Photo with Geo Tag & Punch'}
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
                      filteredStaff.map((s, idx) => (
                        <tr key={s.id} className={`border-b ${borderClass} hover:bg-black/5 dark:hover:bg-white/5`}>
                          <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{idx + 1}</td>
                          <td className={`py-3 px-2 sm:px-4 text-sm font-medium ${textPrimary}`}>{s.name || '—'}</td>
                          <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.email || '—'}</td>
                          <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.designation || '—'}</td>
                          <td className={`py-3 px-2 sm:px-4 text-sm ${textPrimary}`}>{s.phone || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTRACTOR TAB */}
          {activeTab === 'contractor' && (
            <div className="space-y-6">
              {/* Section 1: Labour Attendance */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                  <h3 className={`text-sm font-bold ${textPrimary}`}>Labour Attendance</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:flex-initial sm:w-48">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                      <input
                        type="text"
                        placeholder="Search labour types..."
                        value={contractorSearchQuery}
                        onChange={(e) => setContractorSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${
                          isDark ? 'bg-slate-800' : 'bg-white'
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => setShowAddLabourEntryModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Add Labour Entry
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-inherit">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className={`border-b ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>#</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Name</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Code</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Category</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Units</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Status</th>
                        <th className={`text-left py-3 px-4 text-xs font-bold uppercase ${textSecondary}`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingContractor ? (
                        <tr>
                          <td colSpan={7} className={`py-8 text-center ${textSecondary}`}>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredContractorLabours.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={`py-8 text-center text-sm ${textSecondary}`}>
                            No labour types found
                          </td>
                        </tr>
                      ) : (
                        filteredContractorLabours.map((l, idx) => (
                          <tr key={l.id} className={`border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5`}>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{idx + 1}</td>
                            <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{l.name || '—'}</td>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{l.code || '—'}</td>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{l.category || '—'}</td>
                            <td className={`py-3 px-4 text-sm ${textPrimary}`}>{(l as any).unit?.unit || '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-0.5 rounded ${(l as any).is_active !== 0 ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600')}`}>
                                {(l as any).is_active !== 0 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href="/masters/labours"
                                className={`inline-flex items-center gap-1 text-xs font-bold ${isDark ? 'text-[#C2D642] hover:text-[#a8c235]' : 'text-[#6B8E23] hover:text-[#5a7a1e]'}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Rates */}
              <div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowManageRates(!showManageRates)}
                    className={`flex items-center gap-2 py-2 text-sm font-bold ${textPrimary}`}
                  >
                    Manage Rates
                    {showManageRates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowRatesModal(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30"
                  >
                    Set Rates (Modal)
                  </button>
                </div>
                {showManageRates && (
                  <div className="mt-3 space-y-4">
                    <div className={`p-4 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={handleStoreRate}
                          disabled={isSubmittingRate}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white disabled:opacity-50"
                        >
                          {isSubmittingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save Rate
                        </button>
                      </div>
                    </div>
                    {/* Rate History (client-side only) */}
                    {rateHistory.length > 0 && (
                      <div>
                        <h4 className={`text-sm font-bold ${textSecondary} mb-2`}>Rate History</h4>
                        <div className="flex flex-wrap gap-3">
                          {rateHistory.map((r, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-white'} min-w-[200px]`}
                            >
                              <p className={`text-xs font-bold uppercase ${textSecondary}`}>{r.category}</p>
                              <p className={`font-bold ${textPrimary}`}>{r.contractor}</p>
                              <p className={`text-xs ${textSecondary}`}>From: {r.effectiveFrom}</p>
                              <p className={`text-sm ${textPrimary}`}>Daily: {r.dailyRate} / OT: {r.overtimeRate}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                    onClick={() => setStaffFormData((p) => ({ ...p, worker_type: 'staff' }))}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                      staffFormData.worker_type === 'staff' ? 'bg-[#6B8E23] text-white' : 'bg-slate-100 dark:bg-slate-700'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    onClick={() => setStaffFormData((p) => ({ ...p, worker_type: 'own_labor' }))}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                      staffFormData.worker_type === 'own_labor' ? 'bg-[#6B8E23] text-white' : 'bg-slate-100 dark:bg-slate-700'
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

      {/* Create Project Modal (from Add Labour Entry) */}
      <CreateProjectModal
        theme={theme}
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onSuccess={() => {
          refreshContractorProjectsAndVendors();
        }}
      />

      {/* Create Vendor Modal (from Add Labour Entry - contractor type pre-selected) */}
      <CreateVendorModal
        theme={theme}
        isOpen={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        defaultVendorType="contractor"
        onSuccess={(createdVendor) => {
          refreshContractorProjectsAndVendors();
          if (createdVendor?.id) {
            setLabourEntryFormData((prev) => ({ ...prev, contractor_id: String(createdVendor.id) }));
          }
        }}
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
                  <div className={`absolute left-0 right-0 top-full mt-1 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-lg z-50 overflow-hidden max-h-64 flex flex-col`}>
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLabourEntryProjectDropdownOpen(false);
                          setShowAddProjectModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#6B8E23]/20 text-[#6B8E23] transition-colors"
                        title="Add project"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
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
                  <div className={`absolute left-0 right-0 top-full mt-1 rounded-lg border ${borderClass} ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-lg z-50 overflow-hidden max-h-64 flex flex-col`}>
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
              <div>
                <label className={`block text-sm font-bold ${textPrimary} mb-1`}>Category *</label>
                <select
                  value={labourEntryFormData.category}
                  onChange={(e) => setLabourEntryFormData((p) => ({ ...p, category: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${textPrimary} ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <option value="skilled">Skilled</option>
                  <option value="semiskilled">Semi-skilled</option>
                  <option value="unskilled">Unskilled</option>
                </select>
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
