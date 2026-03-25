'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeType } from '../../types';
import { 
  ClipboardCheck,
  Plus,
  Edit,
  Search,
  X,
  Loader2,
  ChevronDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Layers,
  Activity,
  ArrowRight,
  Boxes,
  Upload,
  Image as ImageIcon,
  Trash2,
  Users,
  Download,
  CheckCircle,
  Eye
} from 'lucide-react';
import CreateProjectModal from '../masters/Modals/CreateProjectModal';
import CreateSubprojectModal from '../masters/Modals/CreateSubprojectModal';
import CreateActivityModal from '../masters/Modals/CreateActivityModal';
import CreateMaterialModal from '../masters/Modals/CreateMaterialModal';
import CreateLabourModal from '../masters/Modals/CreateLabourModal';
import CreateAssetEquipmentModal from '../masters/Modals/CreateAssetEquipmentModal';
import TeamMembersDropdown from './TeamMembersDropdown';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { masterDataAPI, teamsAPI, safetyAPI, hinderanceAPI, dprAPI, activitiesHistoryAPI, labourHistoryAPI, materialsHistoryAPI, assetsHistoryAPI } from '../../services/api';
import { getLogoUrl } from '@/utils/imageUtils';

interface Project {
  id: string;
  numericId?: number; // Backend APIs often expect numeric project ID
  name: string;
  logo: string;
  code?: string;
  company?: string;
  location?: string;
}

interface Subproject {
  id: string;
  numericId?: number;
  name: string;
  code: string;
  project: string;
  manager?: string;
  status: string;
  progress?: number;
  startDate: string;
  endDate: string;
}

interface ActivityItem {
  id: string;
  numericId?: number;
  name: string;
  project: string;
  subproject: string;
  type: 'heading' | 'activity' | 'activites';
  unit?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  heading?: number;
  parent_id?: number;
}

interface SelectedActivity {
  id: string;
  numericId?: number;
  name: string;
  unit?: string;
  quantity: number;
  contractor?: string;
  images?: string[];
  remarks?: string;
}

interface Contractor {
  id: string;
  numericId?: number;
  name: string;
  type: 'contractor' | 'supplier' | 'both';
}

interface Labour {
  id: string;
  numericId?: number;
  name: string;
  type: string;
  category: string;
  unit: string;
  createdAt?: string;
}

interface Material {
  id: string;
  numericId?: number;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
  openingQty?: number;
}

interface SelectedMaterial {
  id: string;
  numericId?: number;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  activity?: string;
  remarks?: string;
}

interface AssetEquipment {
  id: string;
  numericId?: number;
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface SelectedAsset {
  id: string;
  numericId?: number;
  code: string;
  name: string;
  quantity: number;
  activity?: string;
  contractor?: string;
  ratePerUnit: number;
  remarks?: string;
}

interface SafetyEntry {
  id: string;
  serverId?: string | number; // Backend id for delete API
  details?: string;
  image?: string; // legacy single - normalized to images when loading
  images?: string[];
  /** Single company user (teams pivot id) — sent as company_users_id */
  company_users_id?: string;
  /** When API returns company_users_id as object without numeric id — show name/phone in UI */
  companyUserDisplay?: { name: string; email?: string; phone?: string };
  remarks?: string;
}

interface TeamMember {
  /** company_users_id for API (not user uuid) */
  id: string;
  name: string;
  email: string;
}

interface HindranceEntry {
  id: string;
  serverId?: number; // ID from API for edit/delete
  details?: string;
  image?: string; // legacy single - normalized to images when loading
  images?: string[];
  company_users_id?: string;
  companyUserDisplay?: { name: string; email?: string; phone?: string };
  remarks?: string;
}

interface SelectedLabour {
  id: string;
  numericId?: number;
  type: string;
  category: string;
  quantity: number;
  overtimeQuantity: number;
  activity?: string;
  contractor?: string;
  ratePerUnit: number;
  remarks?: string;
}

interface DPRProps {
  theme: ThemeType;
}

const PAGE_SIZE = 10;

const DPR_BASE = '/work-progress-reports';

/** DB column `company_users_id` is INT (pivot id). UUIDs must not be sent — they truncate / fail in MySQL. */
function normalizeNumericCompanyUsersId(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  return /^\d+$/.test(s) ? s : '';
}

/**
 * teams-list often exposes the company_users row as numeric `id` (see WorkforceManagement mapping).
 * Prefer explicit company_users_* fields, then fall back to `id` only when it is numeric (never UUID).
 */
function resolveTeamsListCompanyUsersId(u: any): string {
  const candidates = [
    u?.company_users_id,
    u?.company_user_id,
    u?.company_users?.id,
    u?.company_user?.id,
    u?.pivot?.company_users_id,
    u?.pivot?.id,
    u?.id,
  ];
  for (const c of candidates) {
    const n = normalizeNumericCompanyUsersId(c);
    if (n) return n;
  }
  return '';
}

/** API may return company_users_id as a nested user object — extract numeric pivot id */
function normalizeCompanyUsersIdField(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return normalizeNumericCompanyUsersId(o.id ?? o.company_users_id ?? o.company_user_id);
  }
  return normalizeNumericCompanyUsersId(raw);
}

function teamMemberFromApiNestedUser(obj: unknown): TeamMember | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  const id = normalizeNumericCompanyUsersId(o.id ?? o.company_users_id ?? o.company_user_id);
  if (!id) return null;
  const name = String(o.name ?? '').trim();
  if (!name) return null;
  const email = String(o.email ?? o.phone ?? o.contact_number ?? '').trim();
  return { id, name, email: email || '—' };
}

function mergeTeamMembersFromApiRows(rows: any[], prev: TeamMember[]): TeamMember[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  rows.forEach((item) => {
    const tm = teamMemberFromApiNestedUser(item?.company_users_id);
    if (tm && !byId.has(tm.id)) byId.set(tm.id, tm);
  });
  return Array.from(byId.values());
}

/** Cache for DPR list - instant display on remount, project names, throttle */
const DPR_LIST_CACHE = {
  projects: null as { data: any[]; ts: number } | null,
  dprList: null as { data: any[]; projMap: Record<string, string>; subMap: Record<string, string>; ts: number } | null,
  TTL_MS: 3 * 60 * 1000,
  DPR_LIST_TTL_MS: 30 * 1000,
  VISIBILITY_THROTTLE_MS: 30 * 1000,
};

const DPR: React.FC<DPRProps> = ({ theme }) => {
  const { isAuthenticated } = useUser();
  const toast = useToast();
  const { sidebarWidth } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [showProjectSelection, setShowProjectSelection] = useState<boolean>(false);
  const [showSubprojectSelection, setShowSubprojectSelection] = useState<boolean>(false);
  const [showActivitySelection, setShowActivitySelection] = useState<boolean>(false);
  const [showMaterialSelection, setShowMaterialSelection] = useState<boolean>(false);
  const [showLabourSelection, setShowLabourSelection] = useState<boolean>(false);
  const [showAssetSelection, setShowAssetSelection] = useState<boolean>(false);
  const [showSafetySelection, setShowSafetySelection] = useState<boolean>(false);
  const [showHindranceSelection, setShowHindranceSelection] = useState<boolean>(false);
  const [showDPRComplete, setShowDPRComplete] = useState<boolean>(false);
  const [viewingDpr, setViewingDpr] = useState<any>(null);
  const [dprDetails, setDprDetails] = useState<any>(null);
  const [dprListError, setDprListError] = useState<string | null>(null);
  const [dprToDelete, setDprToDelete] = useState<any>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState<boolean>(false);
  const [showCreateSubprojectModal, setShowCreateSubprojectModal] = useState<boolean>(false);
  const [showCreateActivityModal, setShowCreateActivityModal] = useState<boolean>(false);
  const [showCreateMaterialModal, setShowCreateMaterialModal] = useState<boolean>(false);
  const [showCreateLabourModal, setShowCreateLabourModal] = useState<boolean>(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState<boolean>(false);
  const projectModalScrollRef = useRef<HTMLDivElement>(null);
  const projectModalHeaderRef = useRef<HTMLDivElement>(null);
  const subprojectModalScrollRef = useRef<HTMLDivElement>(null);
  const subprojectModalHeaderRef = useRef<HTMLDivElement>(null);
  const activityModalScrollRef = useRef<HTMLDivElement>(null);
  const activityModalHeaderRef = useRef<HTMLDivElement>(null);
  const editModeActivityRecordsRef = useRef<any[]>([]);
  const materialModalScrollRef = useRef<HTMLDivElement>(null);
  const materialModalHeaderRef = useRef<HTMLDivElement>(null);
  const labourModalScrollRef = useRef<HTMLDivElement>(null);
  const labourModalHeaderRef = useRef<HTMLDivElement>(null);
  const assetModalScrollRef = useRef<HTMLDivElement>(null);
  const assetModalHeaderRef = useRef<HTMLDivElement>(null);
  const safetyModalScrollRef = useRef<HTMLDivElement>(null);
  const safetyModalHeaderRef = useRef<HTMLDivElement>(null);
  const hindranceModalScrollRef = useRef<HTMLDivElement>(null);
  const hindranceModalHeaderRef = useRef<HTMLDivElement>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [subprojectSearchQuery, setSubprojectSearchQuery] = useState<string>('');
  const [projectsSearchResults, setProjectsSearchResults] = useState<Project[]>([]);
  const [isSearchingProjects, setIsSearchingProjects] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dprIdRes, setDprIdRes] = useState<number | string | null>(null);
  const [editingDprId, setEditingDprId] = useState<string | number | null>(null);
  const [isCreatingDpr, setIsCreatingDpr] = useState<boolean>(false);
  const [activitiesIdRes, setActivitiesIdRes] = useState<(number | string)[]>([]);
  const [isSubmittingActivities, setIsSubmittingActivities] = useState(false);
  const [materialsIdRes, setMaterialsIdRes] = useState<(number | string)[]>([]);
  const [isSubmittingMaterials, setIsSubmittingMaterials] = useState(false);
  const [labourIdRes, setLabourIdRes] = useState<(number | string)[]>([]);
  const [isSubmittingLabour, setIsSubmittingLabour] = useState(false);
  const [assetsIdRes, setAssetsIdRes] = useState<(number | string)[]>([]);
  const [isSubmittingAssets, setIsSubmittingAssets] = useState(false);
  const [isSubmittingSafety, setIsSubmittingSafety] = useState(false);
  const [isSubmittingHindrance, setIsSubmittingHindrance] = useState(false);
  const [completedDprId, setCompletedDprId] = useState<number | string | null>(null);
  const [completedPdfUrl, setCompletedPdfUrl] = useState<string | null>(null);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [assets, setAssets] = useState<AssetEquipment[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSubproject, setSelectedSubproject] = useState<Subproject | null>(null);
  // DPR report values (quantity, contractor, remarks, images) - local only, never sync to masters
  const [selectedActivities, setSelectedActivities] = useState<Map<string, SelectedActivity>>(new Map());
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectedMaterial>>(new Map());
  const [selectedLabours, setSelectedLabours] = useState<Map<string, SelectedLabour>>(new Map());
  const [selectedAssets, setSelectedAssets] = useState<Map<string, SelectedAsset>>(new Map());
  useEffect(() => {
    const ids = Array.from(selectedActivities.values()).map((a) => a.numericId ?? a.id);
    setActivitiesIdRes(ids);
  }, [selectedActivities]);
  useEffect(() => {
    const ids = Array.from(selectedMaterials.values()).map((m) => m.numericId ?? m.id);
    setMaterialsIdRes(ids);
  }, [selectedMaterials]);
  useEffect(() => {
    const ids = Array.from(selectedLabours.values()).map((l) => l.numericId ?? l.id);
    setLabourIdRes(ids);
  }, [selectedLabours]);
  useEffect(() => {
    const ids = Array.from(selectedAssets.values()).map((a) => a.numericId ?? a.id);
    setAssetsIdRes(ids);
  }, [selectedAssets]);
  const [hindranceEntries, setHindranceEntries] = useState<HindranceEntry[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [labourSearchQuery, setLabourSearchQuery] = useState<string>('');
  const [safetyEntries, setSafetyEntries] = useState<SafetyEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingSafety, setIsLoadingSafety] = useState<boolean>(false);
  const [isLoadingHindrance, setIsLoadingHindrance] = useState<boolean>(false);
  const [dprList, setDprList] = useState<any[]>([]);
  const [isLoadingDprList, setIsLoadingDprList] = useState<boolean>(false);
  const [projectsMapForDprList, setProjectsMapForDprList] = useState<Record<string, string>>({});
  const [subprojectsMapForDprList, setSubprojectsMapForDprList] = useState<Record<string, string>>({});
  const [projectRefreshKey, setProjectRefreshKey] = useState(0); // Increment to trigger project refetch after create

  // Pagination state per sector (reset when modal/search changes)
  const [projectPage, setProjectPage] = useState(1);
  const [subprojectPage, setSubprojectPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [laboursPage, setLaboursPage] = useState(1);
  const [assetPage, setAssetPage] = useState(1);
  const [safetyPage, setSafetyPage] = useState(1);
  const [hindrancePage, setHindrancePage] = useState(1);
  const [dprListPage, setDprListPage] = useState(1);

  // When focused and value is 0, show empty so user can type without deleting
  const [focusedQuantityField, setFocusedQuantityField] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  /** Format DPR date for list display. Uses dpr.date | dpr.name | dpr.dpr_date. Extracts YYYY-MM-DD from ISO strings to avoid timezone shifts. */
  const formatDprListDate = (dpr: any): string => {
    const val = dpr?.date ?? dpr?.name ?? dpr?.dpr_date;
    if (val == null || val === '') return '-';
    const s = String(val).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
    } catch { /* ignore */ }
    return s;
  };

  // Reusable pagination controls
  const PaginationBar = ({ currentPage, totalItems, onPageChange }: { currentPage: number; totalItems: number; onPageChange: (page: number) => void }) => {
    if (totalItems === 0) return null;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalItems);
    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 px-4 sm:px-6 pt-4 pb-6 sm:pb-6 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
        <span className={`text-xs sm:text-sm ${textSecondary}`}>
          Showing {start}–{end} of {totalItems}
        </span>
        <div className="flex items-center justify-center sm:justify-end gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
          >
            <ChevronsLeft className={`w-4 h-4 ${textSecondary}`} />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
          >
            <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
          </button>
          <span className={`px-3 py-1 text-sm font-bold ${textPrimary}`}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
          >
            <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
          >
            <ChevronsRight className={`w-4 h-4 ${textSecondary}`} />
          </button>
        </div>
      </div>
    );
  };

  // When project modal opens, scroll so list starts at top (header above scrolls out of view)
  useLayoutEffect(() => {
    if (!showProjectSelection || !projectModalScrollRef.current) return;
    projectModalScrollRef.current.scrollTop = 0;
  }, [showProjectSelection]);

  // When modals open (via Back/Next), show content from top (header first)
  useLayoutEffect(() => {
    if (!showSubprojectSelection || !subprojectModalScrollRef.current) return;
    subprojectModalScrollRef.current.scrollTop = 0;
  }, [showSubprojectSelection]);

  useLayoutEffect(() => {
    if (!showActivitySelection || !activityModalScrollRef.current) return;
    activityModalScrollRef.current.scrollTop = 0;
  }, [showActivitySelection]);

  useLayoutEffect(() => {
    if (!showMaterialSelection || !materialModalScrollRef.current) return;
    materialModalScrollRef.current.scrollTop = 0;
  }, [showMaterialSelection]);

  useLayoutEffect(() => {
    if (!showLabourSelection || !labourModalScrollRef.current) return;
    labourModalScrollRef.current.scrollTop = 0;
  }, [showLabourSelection]);

  useLayoutEffect(() => {
    if (!showAssetSelection || !assetModalScrollRef.current) return;
    assetModalScrollRef.current.scrollTop = 0;
  }, [showAssetSelection]);

  useLayoutEffect(() => {
    if (!showSafetySelection || !safetyModalScrollRef.current) return;
    safetyModalScrollRef.current.scrollTop = 0;
  }, [showSafetySelection]);

  useLayoutEffect(() => {
    if (!showHindranceSelection || !hindranceModalScrollRef.current) return;
    hindranceModalScrollRef.current.scrollTop = 0;
  }, [showHindranceSelection]);

  // Step 1 SelectprojectForDPR: project-list GET when screen loads
  // Deferred: only fetch when project selection modal opens (not on initial page load)
  useEffect(() => {
    if (!showProjectSelection) return;
    const fetchProjects = async () => {
      // Check token directly instead of isAuthenticated to avoid dependency array issues
      if (typeof window !== 'undefined') {
        const { getCookie } = require('../../utils/cookies');
        const token = getCookie('auth_token') || localStorage.getItem('auth_token');
        const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
        
        if (!token || !authFlag) {
          console.warn('⚠️ Not authenticated, clearing projects');
          setProjects([]);
          setIsLoadingProjects(false);
          return;
        }
      } else {
        setProjects([]);
        setIsLoadingProjects(false);
        return;
      }

      setIsLoadingProjects(true);
      try {
        console.log('📡 Fetching projects from GET /project-list...');
        const fetchedProjects = await masterDataAPI.getProjectsList();
        const arr = Array.isArray(fetchedProjects) ? fetchedProjects : ((fetchedProjects as any)?.data ?? (fetchedProjects as any)?.projects ?? []);
        console.log('✅ Fetched projects from API:', arr?.length || 0);

        if (!Array.isArray(arr)) {
          console.error('❌ API did not return an array:', fetchedProjects);
          setProjects([]);
          return;
        }

        // Transform API response to match DPR Project interface
        // Backend activities-project-search expects numeric project_id; ensure we capture it
        const transformedProjects: Project[] = arr.map((p: any) => {
          const rawId = p.id ?? p.project_id ?? p.projects_id;
          const numericId = Number.isFinite(Number(rawId)) ? Number(rawId) : undefined;
          const uuid = p.uuid;
          const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
          
          return {
            id: uuid || String(rawId),
            numericId,
            name: p.project_name || p.name || '',
            logo: getLogoUrl(p.logo, p.project_name || p.name || '', 'C2D642'),
            code: p.code || '',
            company: companyName,
            location: p.address || p.location || ''
          };
        });

        console.log('✅ Transformed projects for DPR:', transformedProjects.length);
        setProjects(transformedProjects);
      } catch (error: any) {
        console.error('❌ Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();

    // Listen for auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'isAuthenticated') {
        fetchProjects();
      }
    };

    const handleUserLoggedIn = () => {
      fetchProjects();
    };

    const handleUserLoggedOut = () => {
      setProjects([]);
      setIsLoadingProjects(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
    };
  }, [showProjectSelection, projectRefreshKey]); // Fetch when project modal opens or after creating project

  // Sync step visibility with URL path
  useEffect(() => {
    const p = pathname?.replace(/\/$/, '') || '';
    const base = DPR_BASE.replace(/\/$/, '');
    if (p === base + '/add-project') {
      setShowCreateProjectModal(true);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/projects') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(true);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/subprojects') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(true);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/activities' || p === base + '/add-activity') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(true);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
      setShowCreateActivityModal(p === base + '/add-activity');
    } else if (p === base + '/materials') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(true);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/labour') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(true);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/assets') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(true);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/safety') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(true);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    } else if (p === base + '/hindrance') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(true);
      setShowDPRComplete(false);
    } else if (p === base || p === base + '') {
      setShowCreateProjectModal(false);
      setShowProjectSelection(false);
      setShowSubprojectSelection(false);
      setShowActivitySelection(false);
      setShowMaterialSelection(false);
      setShowLabourSelection(false);
      setShowAssetSelection(false);
      setShowSafetySelection(false);
      setShowHindranceSelection(false);
      setShowDPRComplete(false);
    }
  }, [pathname]);

  // DPR subprojects - fetched via API when project is selected
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState<boolean>(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [isLoadingLabours, setIsLoadingLabours] = useState<boolean>(false);
  const [laboursRefreshKey, setLaboursRefreshKey] = useState(0);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);
  const [subprojectsSearchResults, setSubprojectsSearchResults] = useState<Subproject[]>([]); // Results from projectWiseSubprojectSearch when searching
  const [subprojectRefreshKey, setSubprojectRefreshKey] = useState(0); // Increment to trigger subproject refetch
  const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0); // Increment to trigger materials refetch

  // Transform API subproject response to DPR Subproject interface
  // Backend activities-project-search expects numeric subproject_id; ensure we capture it
  const transformSubproject = (sub: any, projectName: string): Subproject => {
    const rawId = sub.id ?? sub.subproject_id ?? sub.sub_projects_id;
    const numericId = Number.isFinite(Number(rawId)) ? Number(rawId) : undefined;
    return {
    id: sub.uuid || String(rawId),
    numericId,
    name: sub.name || sub.subproject_name || '',
    code: sub.code || `SUB${String(sub.id || '').padStart(3, '0')}`,
    project: projectName,
    manager: sub.manager || sub.project_manager || '',
    status: sub.status || 'Pending',
    progress: sub.progress || 0,
    startDate: sub.start_date || sub.planned_start_date || sub.startDate || '',
    endDate: sub.end_date || sub.planned_end_date || sub.endDate || ''
  };
  };

  // Cache subprojects by project ID - avoid refetch on Strict Mode double-mount or quick remount
  const subprojectsCacheRef = useRef<{ projectId: string | number; data: Subproject[]; ts: number } | null>(null);
  const SUBPROJECTS_CACHE_TTL = 60 * 1000;

  // Fetch subprojects when SelectSubprojectForDPR loads - POST project-subproject { project_id }
  useEffect(() => {
    if (!selectedProject) {
      setSubprojects([]);
      return;
    }

    const projectId = selectedProject.numericId ?? selectedProject.id;
    const cacheKey = `${projectId}-${subprojectRefreshKey}`;
    const cached = subprojectsCacheRef.current && subprojectsCacheRef.current.projectId === cacheKey
      && Date.now() - subprojectsCacheRef.current.ts < SUBPROJECTS_CACHE_TTL;
    if (cached && subprojectsCacheRef.current) {
      setSubprojects(subprojectsCacheRef.current.data);
      setIsLoadingSubprojects(false);
      return;
    }

    const ac = new AbortController();
    const fetchSubprojects = async () => {
      setIsLoadingSubprojects(true);
      setSubprojectSearchQuery('');
      try {
        const result = await masterDataAPI.getProjectSubprojects(projectId);
        if (ac.signal.aborted) return;
        const res = result as any;
        const list = Array.isArray(result) ? result : res?.subProject ?? res?.data ?? [];
        const transformed = list.map((sub: any) => transformSubproject(sub, selectedProject.name));
        subprojectsCacheRef.current = { projectId: `${projectId}-${subprojectRefreshKey}`, data: transformed, ts: Date.now() };
        setSubprojects(transformed);
      } catch (e) {
        if (!ac.signal.aborted) setSubprojects([]);
      } finally {
        if (!ac.signal.aborted) setIsLoadingSubprojects(false);
      }
    };

    fetchSubprojects();
    return () => { ac.abort(); };
  }, [selectedProject, subprojectRefreshKey]);

  // Search subprojects when user types - POST /sub-project-search
  useEffect(() => {
    if (!selectedProject || !subprojectSearchQuery.trim()) {
      setSubprojectsSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const projectId = selectedProject.numericId ?? selectedProject.id;
        const result = await masterDataAPI.searchSubprojects(subprojectSearchQuery.trim(), projectId);
        const list = Array.isArray(result) ? result : [];
        const transformed = list.map((sub: any) => transformSubproject(sub, selectedProject.name));
        setSubprojectsSearchResults(transformed);
      } catch (e) {
        setSubprojectsSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedProject, subprojectSearchQuery]);

  // Search projects via POST project-search when user types
  useEffect(() => {
    if (!showProjectSelection) return;
    if (!projectSearchQuery.trim()) {
      setProjectsSearchResults([]);
      setIsSearchingProjects(false);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setIsSearchingProjects(true);
      try {
        const result = await masterDataAPI.searchProjects(projectSearchQuery.trim());
        const arr = Array.isArray(result) ? result : ((result as any)?.data ?? []);
        const transformed: Project[] = arr.map((p: any) => {
          const rawId = p.id ?? p.project_id ?? p.projects_id;
          const numericId = Number.isFinite(Number(rawId)) ? Number(rawId) : undefined;
          const uuid = p.uuid;
          const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
          return {
            id: uuid || String(rawId),
            numericId,
            name: p.project_name || p.name || '',
            logo: getLogoUrl(p.logo, p.project_name || p.name || '', 'C2D642'),
            code: p.code || '',
            company: companyName,
            location: p.address || p.location || ''
          };
        });
        setProjectsSearchResults(transformed);
      } catch (e) {
        setProjectsSearchResults([]);
      } finally {
        setIsSearchingProjects(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [showProjectSelection, projectSearchQuery]);

  // Filter projects: use search API results when searching, else use projects from projects-list
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    return projectsSearchResults;
  }, [projects, projectsSearchResults, projectSearchQuery]);

  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, projectPage]);

  // Filter subprojects: use search API results when searching, else use fetched subprojects
  const filteredSubprojects = useMemo(() => {
    if (!selectedProject) return [];
    if (subprojectSearchQuery.trim()) {
      return subprojectsSearchResults;
    }
    return subprojects;
  }, [subprojects, subprojectsSearchResults, selectedProject, subprojectSearchQuery]);

  const paginatedSubprojects = useMemo(() => {
    const start = (subprojectPage - 1) * PAGE_SIZE;
    return filteredSubprojects.slice(start, start + PAGE_SIZE);
  }, [filteredSubprojects, subprojectPage]);

  const handleCreateNewDPR = () => {
    // Reset all DPR state so we create a fresh DPR instead of updating the previous one
    setEditingDprId(null);
    setDprIdRes(null);
    setActivitiesIdRes([]);
    setMaterialsIdRes([]);
    setLabourIdRes([]);
    setAssetsIdRes([]);
    setCompletedDprId(null);
    setCompletedPdfUrl(null);
    setSelectedProject(null);
    setSelectedSubproject(null);
    setSelectedActivities(new Map());
    setSelectedMaterials(new Map());
    setSelectedLabours(new Map());
    setSelectedAssets(new Map());
    setSafetyEntries([]);
    setHindranceEntries([]);
    setProjectSearchQuery('');
    setSubprojectSearchQuery('');
    setAssetSearchQuery('');
    setActivitySearchQuery('');
    setMaterialSearchQuery('');
    setLabourSearchQuery('');
    setProjectPage(1);
    setSubprojectPage(1);
    setActivityPage(1);
    setMaterialsPage(1);
    setLaboursPage(1);
    setAssetPage(1);
    setSafetyPage(1);
    setHindrancePage(1);
    setActivities([]);
    setMaterials([]);
    setLabours([]);
    setAssets([]);
    router.push(`${DPR_BASE}/projects`);
  };

  const handleSelectProject = (project: Project) => {
    setEditingDprId(null);
    setDprIdRes(null);
    setSelectedProject(project);
    setProjectSearchQuery('');
    setSubprojectSearchQuery('');
    router.push(`${DPR_BASE}/subprojects`);
  };

  const handleSubprojectStatusChange = (subprojectId: string, newStatus: string) => {
    setSubprojects(prev => prev.map(s => s.id === subprojectId ? { ...s, status: newStatus } : s));
    setSubprojectsSearchResults(prev => prev.map(s => s.id === subprojectId ? { ...s, status: newStatus } : s));
  };

  // Step 3: Tap Next (subproject selected/skipped) -> dpr-add + activities prefetch in parallel, then navigate with data ready
  const handleSubprojectSelected = async (subproject: Subproject | null) => {
    if (!selectedProject) return;
    setEditingDprId(null);
    setSelectedSubproject(subproject);
    setSubprojectSearchQuery('');
    setIsCreatingDpr(true);
    const projectId = selectedProject.numericId ?? Number(selectedProject.id);
    const subprojectId = subproject ? (subproject.numericId ?? Number(subproject.id)) : null;
    const dprName = new Date().toLocaleDateString('en-CA') || new Date().toISOString().slice(0, 10) || 'DPR';

    try {
      const [res, rawActivities] = await Promise.all([
        dprAPI.add({
          name: dprName,
          projects_id: projectId,
          sub_projects_id: subprojectId ?? '',
          staps: '7',
        }),
        activitiesHistoryAPI.projectSearch(projectId, subprojectId ?? null, undefined),
      ]);
      const created = res?.dpr ?? res?.data?.dpr ?? res?.data ?? res;
      const dprId = created?.id ?? created?.dpr_id ?? res?.data?.id ?? res?.data?.dpr_id ?? res?.id ?? res?.dpr_id ?? null;
      if (dprId != null) setDprIdRes(dprId);

      const getUnitName = (a: any) => {
        const u = a.unit_id ?? a.units ?? a.unit;
        const fromApi = (u?.unit ?? u?.name ?? (typeof a.unit === 'string' ? a.unit : '')) ?? '';
        return typeof fromApi === 'string' ? fromApi : '';
      };
      const transformed: ActivityItem[] = (Array.isArray(rawActivities) ? rawActivities : []).map((a: any) => {
        const actType = (a.type ?? a.activity_type ?? '').toString().toLowerCase();
        const type: 'heading' | 'activity' = actType === 'heading' ? 'heading' : 'activity';
        return {
          id: a.uuid || String(a.id),
          numericId: a.id,
          name: a.activities || a.name || '',
          project: selectedProject.name,
          subproject: subproject?.name || '',
          type,
          unit: getUnitName(a),
          qty: a.qty ?? a.quantity,
          rate: a.rate,
          amount: a.amount,
          startDate: a.start_date ?? a.startDate,
          endDate: a.end_date ?? a.endDate,
          createdAt: a.created_at ?? a.createdAt,
          heading: a.heading ?? a.parent_id,
          parent_id: a.parent_id ?? a.heading
        };
      });
      const cacheKey = `${projectId}-${subprojectId ?? 'none'}-${''}-${activitiesRefreshKey}`;
      activitiesCacheRef.current = { key: cacheKey, data: transformed, ts: Date.now() };
      setActivities(transformed);
      setShowActivitySelection(true);
      setShowSubprojectSelection(false);
      router.replace(`${DPR_BASE}/activities`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to create DPR');
    } finally {
      setIsCreatingDpr(false);
    }
  };

  const handleSelectSubproject = (subproject: Subproject) => {
    handleSubprojectSelected(subproject);
  };

  const handleSkipSubproject = () => {
    handleSubprojectSelected(null);
  };

  const resetDPRForm = () => {
    setShowDPRComplete(false);
    router.push(DPR_BASE);
    setEditingDprId(null);
    setDprIdRes(null);
    setActivitiesIdRes([]);
    setMaterialsIdRes([]);
    setLabourIdRes([]);
    setAssetsIdRes([]);
    setCompletedDprId(null);
    setCompletedPdfUrl(null);
    setSelectedProject(null);
    setSelectedSubproject(null);
    setSelectedActivities(new Map());
    setSelectedMaterials(new Map());
    setSelectedLabours(new Map());
    setSelectedAssets(new Map());
    setSafetyEntries([]);
    setHindranceEntries([]);
    setProjectSearchQuery('');
    setSubprojectSearchQuery('');
    setAssetSearchQuery('');
    setActivitySearchQuery('');
    setMaterialSearchQuery('');
    setLabourSearchQuery('');
    setProjectPage(1);
    setSubprojectPage(1);
    setActivityPage(1);
    setMaterialsPage(1);
    setLaboursPage(1);
    setAssetPage(1);
    setSafetyPage(1);
    setHindrancePage(1);
    setActivities([]);
    setMaterials([]);
    setLabours([]);
    setAssets([]);
  };

  // ActivitiesDetailsDPR: supplier-contractor-list POST { type: 'contractor' } when screen loads
  const contractorsLoadedRef = useRef(false);
  useEffect(() => {
    const needsContractors = showActivitySelection || showLabourSelection || showAssetSelection;
    if (!needsContractors || !isAuthenticated || contractorsLoadedRef.current) return;

    contractorsLoadedRef.current = true;
    const fetchContractors = async () => {
      try {
        let data: any[] = [];
        try {
          data = await masterDataAPI.getVendorTypeWiseList('contractor');
        } catch (e) {
          data = await masterDataAPI.getSupplierContractorList('contractor');
        }
        const list = Array.isArray(data) ? data : [];
        const contractorList: Contractor[] = list.map((v: any) => ({
          id: v.uuid || String(v.id),
          numericId: v.id != null ? Number(v.id) : undefined,
          name: v.name || '',
          type: v.type || 'contractor'
        }));
        setContractors(contractorList);
      } catch (err) {
        contractorsLoadedRef.current = false;
        setContractors([]);
      }
    };
    fetchContractors();
  }, [showActivitySelection, showLabourSelection, showAssetSelection, isAuthenticated]);

  // Load activities via activities-project-search (DPR activities API)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesRefreshKey, setActivitiesRefreshKey] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchDprListAt = useRef<number>(0);

  const activitiesAbortRef = useRef<AbortController | null>(null);
  const activitiesCacheRef = useRef<{ key: string; data: ActivityItem[]; ts: number } | null>(null);
  const ACTIVITIES_CACHE_TTL = 20 * 1000;

  useEffect(() => {
    if (!showActivitySelection || !selectedProject) {
      setActivities([]);
      return;
    }

    activitiesAbortRef.current?.abort();
    const ac = new AbortController();
    activitiesAbortRef.current = ac;
    const cancelled = () => ac.signal.aborted;

    const rawProjectId = selectedProject.numericId ?? selectedProject.id;
    const rawSubprojectId = selectedSubproject?.numericId ?? selectedSubproject?.id;
    const projectId = Number.isFinite(Number(rawProjectId)) ? Number(rawProjectId) : rawProjectId;
    const subprojectId = rawSubprojectId != null && rawSubprojectId !== '' && Number.isFinite(Number(rawSubprojectId))
      ? Number(rawSubprojectId) : (rawSubprojectId ?? null);
    const kw = activitySearchQuery.trim();
    const cacheKey = `${projectId}-${subprojectId ?? 'none'}-${kw}-${activitiesRefreshKey}`;
    const cached = activitiesCacheRef.current
      && activitiesCacheRef.current.key === cacheKey
      && Date.now() - activitiesCacheRef.current.ts < ACTIVITIES_CACHE_TTL;
    if (cached && activitiesCacheRef.current) {
      setActivities(activitiesCacheRef.current.data);
      return () => { ac.abort(); };
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const doFetch = async () => {
      setIsLoadingActivities(true);
      try {
        const getUnitName = (a: any) => {
          const u = a.unit_id ?? a.units ?? a.unit;
          const fromApi = (u?.unit ?? u?.name ?? (typeof a.unit === 'string' ? a.unit : '')) ?? '';
          return typeof fromApi === 'string' ? fromApi : '';
        };
        const raw = await activitiesHistoryAPI.projectSearch(projectId, subprojectId ?? null, kw || undefined);
        if (cancelled()) return;
        const transformed: ActivityItem[] = (Array.isArray(raw) ? raw : []).map((a: any) => {
          const actType = (a.type ?? a.activity_type ?? '').toString().toLowerCase();
          const type: 'heading' | 'activity' = actType === 'heading' ? 'heading' : 'activity';
          return {
            id: a.uuid || String(a.id),
            numericId: a.id,
            name: a.activities || a.name || '',
            project: selectedProject.name,
            subproject: selectedSubproject?.name || '',
            type,
            unit: getUnitName(a),
            qty: a.qty ?? a.quantity,
            rate: a.rate,
            amount: a.amount,
            startDate: a.start_date || a.startDate,
            endDate: a.end_date || a.endDate,
            createdAt: a.created_at || a.createdAt,
            heading: a.heading ?? a.parent_id,
            parent_id: a.parent_id ?? a.heading
          };
        });
        activitiesCacheRef.current = { key: cacheKey, data: transformed, ts: Date.now() };
        setActivities(transformed);
      } catch (e) {
        if (!cancelled()) setActivities([]);
      } finally {
        if (!cancelled()) setIsLoadingActivities(false);
      }
    };
    if (kw) {
      searchDebounceRef.current = setTimeout(doFetch, 300);
    } else {
      doFetch();
    }
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      ac.abort();
    };
  }, [showActivitySelection, selectedProject, selectedSubproject, activitiesRefreshKey, activitySearchQuery]);

  // Edit mode: fetch-dpr-history-edit returns full records (selected activities + qty, remarks, contractor, etc). Map to selectedActivities for pre-fill.
  const mapActivityRecordsToSelected = (records: any[], activitiesList: ActivityItem[]): Map<string, SelectedActivity> => {
    const getContractor = (v: any) => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      return v?.name ?? v?.registration_name ?? v?.contractor_name ?? '';
    };
    const getActivityName = (actId: string | number) => {
      const a = activitiesList.find((x) => String(x.id) === String(actId) || String(x.numericId) === String(actId));
      return a?.name ?? 'Activity';
    };
    const parseImages = (r: any): string[] => {
      const img = r?.img ?? r?.activities_history_img ?? r?.image;
      const toUrls = (val: string | string[]) => {
        const arr = Array.isArray(val) ? val.filter(Boolean) : (val && typeof val === 'string' ? [val] : []);
        return arr.map((u: string) => {
          if (!u || typeof u !== 'string') return '';
          if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
          const base = String(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api').replace(/\/$/, '');
          return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
        }).filter(Boolean);
      };
      if (Array.isArray(img)) return toUrls(img);
      if (img && typeof img === 'string') return toUrls(img);
      const imgs = r?.images;
      if (Array.isArray(imgs)) return toUrls(imgs);
      return [];
    };
    const map = new Map<string, SelectedActivity>();
    for (const r of records) {
      if (r == null) continue;
      const actId = r?.activities_id ?? r?.activities_history_activities_id ?? r?.activity_id ?? r?.id ?? (typeof r === 'number' ? r : null);
      const act = r?.activities ?? r?.activites;
      const numericActId = actId != null ? Number(actId) : NaN;
      const idStr = String(actId ?? (typeof r === 'string' && /^\d+$/.test(r) ? r : ''));
      if (!idStr || (typeof r === 'string' && r.length > 20)) continue;
      const matchedActivity = activitiesList.find((a) => String(a.id) === idStr || String(a.numericId) === idStr || (numericActId && (a.numericId === numericActId || Number(a.id) === numericActId)));
      const id = matchedActivity ? String(matchedActivity.id) : idStr;
      const name = act?.activities ?? act?.name ?? r?.activity_name ?? r?.activities_name ?? getActivityName(idStr);
      const qty = r?.qty ?? r?.activities_history_qty ?? r?.quantity ?? r?.activities_history_quantity ?? 0;
      const remarks = r?.remarkes ?? r?.activities_history_remarkes ?? r?.remarks ?? '';
      const contractor = getContractor(r?.vendors ?? r?.vendor ?? r?.vendors_id ?? r?.vendors ?? r?.contractor);
      map.set(id, {
        id,
        numericId: Number.isFinite(numericActId) ? numericActId : undefined,
        name: String(name || 'Activity'),
        unit: r?.unit ?? act?.unit ?? (matchedActivity?.unit ?? ''),
        quantity: Number(qty) || 0,
        contractor: contractor || undefined,
        remarks: remarks || undefined,
        images: parseImages(r)
      });
    }
    return map;
  };

  // ActivitiesDetailsDPR: fetch-dpr-history-edit or dpr-details fallback, then activities-history-edit for full records
  useEffect(() => {
    if (!showActivitySelection || !editingDprId || !selectedProject) return;
    let cancelled = false;
    const extractActivities = (res: any): any[] => {
      let data = res?.data ?? res;
      if (data && !Array.isArray(data)) {
        data = data?.activites ?? data?.activities ?? data?.activities_history ?? (Array.isArray(data?.data) ? data.data : []);
      }
      return Array.isArray(data) ? data : [];
    };
    const load = async () => {
      let records: any[] = [];
      try {
        let res: any = null;
        try {
          res = await dprAPI.dprHistoryEdit({ type: 'activites', dprId: Number(editingDprId) });
        } catch {
          res = null;
        }
        let arr = extractActivities(res ?? {});
        // Fallback: dpr-details may contain activities when fetch-dpr-history-edit returns blank
        if (arr.length === 0) {
          try {
            const details = await dprAPI.getDetails(editingDprId);
            arr = extractActivities(details);
          } catch { /* ignore */ }
        }
        const ids = arr.map((e: any) => e?.activities_id ?? e?.activities_history_activities_id ?? e?.activity_id ?? e?.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            records = await activitiesHistoryAPI.edit(editingDprId, ids);
          } catch {
            records = arr;
          }
        } else if (arr.length > 0) {
          records = arr;
        }
      } catch {
        records = [];
      }
      if (cancelled) return;
      const map = mapActivityRecordsToSelected(records, activities);
      setSelectedActivities(map);
      editModeActivityRecordsRef.current = records;
      if (records.length === 0 && !cancelled) toast.showWarning('Could not load previous activities—you can add them manually');
    };
    load();
    return () => { cancelled = true; };
  }, [showActivitySelection, editingDprId, selectedProject, activities]);

  // MaterialsDetailsDPR: fetch-dpr-history-edit (Edit mode only) + materials-history-edit (on load) → materials-history-add (on update)
  useEffect(() => {
    if (!showMaterialSelection || !editingDprId || !selectedProject) return; // Edit mode only for loading existing materials
    let cancelled = false;
    const extractMaterials = (res: any): any[] => {
      let data = res?.data ?? res ?? [];
      if (data && !Array.isArray(data)) data = data?.materials ?? data?.material ?? data?.materials_history ?? [];
      return Array.isArray(data) ? data : [];
    };
    const load = async () => {
      let records: any[] = [];
      try {
        let res: any = null;
        try {
          res = await dprAPI.dprHistoryEdit({ type: 'material', dprId: Number(editingDprId) });
        } catch {
          res = null;
        }
        let arr = extractMaterials(res ?? {});
        if (arr.length === 0) {
          try {
            const details = await dprAPI.getDetails(editingDprId);
            arr = extractMaterials(details);
          } catch { /* ignore */ }
        }
        const ids = arr.map((e: any) => e?.materials_id ?? e?.materials_history_materials_id ?? e?.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            records = await materialsHistoryAPI.edit(editingDprId, ids);
          } catch {
            records = arr;
          }
        } else if (arr.length > 0) {
          records = arr;
        }
      } catch {
        records = [];
      }
      if (cancelled) return;
      const map = new Map<string, SelectedMaterial>();
      for (const r of records) {
        const matId = r?.materials_id ?? r?.materials_history_materials_id ?? r?.id;
        const mat = r?.materials ?? r?.material;
        const recordId = String(matId ?? r?.id ?? '');
        if (!recordId) continue;
        const matchedMaterial = materials.find((m) => String(m.id) === recordId || String(m.numericId) === recordId || (Number(matId) && (m.numericId === Number(matId) || Number(m.id) === Number(matId))));
        const id = matchedMaterial ? String(matchedMaterial.id) : recordId;
        const cls = (mat?.class ?? r?.class ?? (matchedMaterial?.class ?? 'B')) as 'A' | 'B' | 'C';
        map.set(id, {
          id,
          numericId: Number(matId) || undefined,
          class: ['A', 'B', 'C'].includes(cls) ? cls : 'B',
          code: mat?.code ?? r?.code ?? matchedMaterial?.code ?? '',
          name: mat?.name ?? r?.material_name ?? r?.materials_name ?? matchedMaterial?.name ?? '',
          specification: mat?.specification ?? r?.specification ?? matchedMaterial?.specification ?? '',
          unit: mat?.unit ?? r?.unit ?? matchedMaterial?.unit ?? '',
          quantity: Number(r?.qty ?? r?.quantity ?? 0),
          activity: r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '',
          remarks: r?.remarkes ?? r?.remarks ?? ''
        });
      }
      setSelectedMaterials(map);
      if (records.length === 0 && !cancelled) toast.showWarning('Could not load previous materials—you can add them manually');
    };
    load();
    return () => { cancelled = true; };
  }, [showMaterialSelection, editingDprId, selectedProject, materials]);

  // LabourDetailsDPR: fetch-dpr-history-edit (Edit mode only) + labour-history-edit (on load) → labour-history-add (on update)
  useEffect(() => {
    if (!showLabourSelection || !editingDprId || !selectedProject) return; // Edit mode only for loading existing labour
    let cancelled = false;
    const extractLabour = (res: any): any[] => {
      let data = res?.data ?? res ?? [];
      if (data && !Array.isArray(data)) data = data?.labour ?? data?.labours ?? data?.labour_history ?? [];
      return Array.isArray(data) ? data : [];
    };
    const load = async () => {
      let records: any[] = [];
      try {
        let res: any = null;
        try {
          res = await dprAPI.dprHistoryEdit({ type: 'labour', dprId: Number(editingDprId) });
        } catch {
          res = null;
        }
        let arr = extractLabour(res ?? {});
        if (arr.length === 0) {
          try {
            const details = await dprAPI.getDetails(editingDprId);
            arr = extractLabour(details);
          } catch { /* ignore */ }
        }
        const ids = arr.map((e: any) => e?.labours_id ?? e?.labour_id ?? e?.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            records = await labourHistoryAPI.edit(editingDprId, ids);
          } catch {
            records = arr;
          }
        } else if (arr.length > 0) {
          records = arr;
        }
      } catch {
        records = [];
      }
      if (cancelled) return;
      const getContractor = (v: any) => {
        if (!v) return '';
        if (typeof v === 'string') return v;
        return v?.name ?? v?.registration_name ?? '';
      };
      const map = new Map<string, SelectedLabour>();
      for (const r of records) {
        const labId = r?.labours_id ?? r?.labour_id ?? r?.id;
        const lab = r?.labours ?? r?.labour;
        const recordId = String(labId ?? r?.id ?? '');
        if (!recordId) continue;
        const matchedLabour = labours.find((l) => String(l.id) === recordId || String(l.numericId) === recordId || (Number(labId) && (l.numericId === Number(labId) || Number(l.id) === Number(labId))));
        const id = matchedLabour ? String(matchedLabour.id) : recordId;
        map.set(id, {
          id,
          numericId: Number(labId) || undefined,
          type: lab?.type ?? r?.type ?? matchedLabour?.type ?? '',
          category: lab?.category ?? r?.category ?? matchedLabour?.category ?? '',
          quantity: Number(r?.qty ?? r?.quantity ?? 0),
          overtimeQuantity: Number(r?.ot_qty ?? r?.overtime_qty ?? 0),
          activity: r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '',
          contractor: getContractor(r?.vendors ?? r?.vendor ?? r?.vendors_id ?? r?.contractor),
          ratePerUnit: Number(r?.rate_per_unit ?? r?.rate ?? 0),
          remarks: r?.remarkes ?? r?.remarks ?? ''
        });
      }
      setSelectedLabours(map);
      if (records.length === 0 && !cancelled) toast.showWarning('Could not load previous labour—you can add them manually');
    };
    load();
    return () => { cancelled = true; };
  }, [showLabourSelection, editingDprId, selectedProject, labours]);

  // MachineDetailsDPR: fetch-dpr-history-edit (Edit mode only) + assets-history-edit (on load) → assets-history-add (on update)
  useEffect(() => {
    if (!showAssetSelection || !editingDprId || !selectedProject) return; // Edit mode only for loading existing assets
    let cancelled = false;
    const extractAssets = (res: any): any[] => {
      let data = res?.data ?? res ?? [];
      if (data && !Array.isArray(data)) data = data?.assets ?? data?.asset ?? data?.assets_history ?? [];
      return Array.isArray(data) ? data : [];
    };
    const load = async () => {
      let records: any[] = [];
      try {
        let res: any = null;
        try {
          res = await dprAPI.dprHistoryEdit({ type: 'assets', dprId: Number(editingDprId) });
        } catch {
          res = null;
        }
        let arr = extractAssets(res ?? {});
        if (arr.length === 0) {
          try {
            const details = await dprAPI.getDetails(editingDprId);
            arr = extractAssets(details);
          } catch { /* ignore */ }
        }
        const ids = arr.map((e: any) => e?.assets_id ?? e?.assets_history_assets_id ?? e?.id).filter(Boolean);
        if (ids.length > 0) {
          try {
            records = await assetsHistoryAPI.edit(editingDprId, ids);
          } catch {
            records = arr;
          }
        } else if (arr.length > 0) {
          records = arr;
        }
      } catch {
        records = [];
      }
      if (cancelled) return;
      const getContractor = (v: any) => {
        if (!v) return '';
        if (typeof v === 'string') return v;
        return v?.name ?? v?.registration_name ?? '';
      };
      const map = new Map<string, SelectedAsset>();
      for (const r of records) {
        const assetId = r?.assets_id ?? r?.assets_history_assets_id ?? r?.id;
        const asset = r?.assets ?? r?.asset;
        const recordId = String(assetId ?? r?.id ?? '');
        if (!recordId) continue;
        const matchedAsset = assets.find((a) => String(a.id) === recordId || String(a.numericId) === recordId || (Number(assetId) && (a.numericId === Number(assetId) || Number(a.id) === Number(assetId))));
        const id = matchedAsset ? String(matchedAsset.id) : recordId;
        map.set(id, {
          id,
          numericId: Number(assetId) || undefined,
          code: asset?.code ?? r?.code ?? matchedAsset?.code ?? '',
          name: asset?.name ?? r?.asset_name ?? matchedAsset?.name ?? '',
          quantity: Number(r?.qty ?? r?.quantity ?? 0),
          activity: r?.activities?.activities ?? r?.activities?.name ?? r?.activity_name ?? '',
          contractor: getContractor(r?.vendors ?? r?.vendor ?? r?.vendors_id ?? r?.contractor),
          ratePerUnit: Number(r?.rate_per_unit ?? r?.rate ?? 0),
          remarks: r?.remarkes ?? r?.remarks ?? ''
        });
      }
      setSelectedAssets(map);
      if (records.length === 0 && !cancelled) toast.showWarning('Could not load previous assets—you can add them manually');
    };
    load();
    return () => { cancelled = true; };
  }, [showAssetSelection, editingDprId, selectedProject, assets]);

  // Build hierarchical tree like Masters > Activities (headings first, then children, srNo: 1, 1.1, 1.2, 1.3, 1.3.1)
  type ActivityTreeNode = { item: ActivityItem; srNo: string };
  const activityTreeNodes = useMemo(() => {
    const isHeading = (a: ActivityItem) => (a.type || '').toLowerCase() === 'heading';
    const headings = activities.filter(isHeading);
    const allActivities = activities.filter((a) => !isHeading(a));
    const getParentId = (a: ActivityItem) => a.parent_id ?? a.heading;
    const getNodeId = (a: ActivityItem) => a.numericId ?? (typeof a.id === 'string' && !isNaN(Number(a.id)) ? Number(a.id) : null);
    const matchesParent = (child: ActivityItem, parent: ActivityItem) => {
      const pid = getParentId(child);
      if (pid == null) return false;
      const parentNodeId = getNodeId(parent);
      return pid === parentNodeId || String(pid) === String(parent.id) || String(pid) === String((parent as any).uuid);
    };

    const result: ActivityTreeNode[] = [];
    let headingNo = 0;
    const allPlacedIds = new Set<string>();

    const addChildrenRecursive = (parent: ActivityItem, parentSrNo: string): void => {
      const kids = allActivities.filter((c) => matchesParent(c, parent));
      kids.forEach((k, idx) => {
        allPlacedIds.add(k.id);
        const srNo = `${parentSrNo}.${idx + 1}`;
        result.push({ item: k, srNo });
        addChildrenRecursive(k, srNo);
      });
    };

    for (const h of headings) {
      headingNo++;
      result.push({ item: h, srNo: String(headingNo) });
      addChildrenRecursive(h, String(headingNo));
    }
    const orphans = allActivities.filter((c) => !allPlacedIds.has(c.id));
    orphans.forEach((o) => {
      headingNo++;
      result.push({ item: o, srNo: String(headingNo) });
    });
    return result;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activitySearchQuery.trim()) return activityTreeNodes;
    const q = activitySearchQuery.toLowerCase();
    return activityTreeNodes.filter(
      (n) =>
        n.item.name.toLowerCase().includes(q) ||
        (n.item.unit && String(n.item.unit).toLowerCase().includes(q))
    );
  }, [activityTreeNodes, activitySearchQuery]);

  const paginatedActivities = useMemo(() => {
    const start = (activityPage - 1) * PAGE_SIZE;
    return filteredActivities.slice(start, start + PAGE_SIZE);
  }, [filteredActivities, activityPage]);

  useEffect(() => {
    setActivityPage(1);
  }, [selectedProject?.id, selectedSubproject?.id]);

  const handleToggleActivity = (activity: ActivityItem) => {
    if (activity.type === 'heading') return; // Headings are not selectable
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      if (newMap.has(activity.id)) {
        newMap.delete(activity.id);
      } else {
        newMap.set(activity.id, {
          id: activity.id,
          numericId: activity.numericId,
          name: activity.name,
          unit: activity.unit,
          quantity: 0
        });
      }
      return newMap;
    });
  };

  // DPR-only values (quantity, contractor, remarks, images) - stored in selectedActivities only.
  // These must NEVER be sent to master activities API - they are for the DPR report/PDF only.
  const handleQuantityChange = (activityId: string, quantity: number) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleContractorChange = (activityId: string, contractor: string) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleRemarksChange = (activityId: string, remarks: string) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleImageUpload = (activityId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      setSelectedActivities(prev => {
        const newMap = new Map(prev);
        const activity = newMap.get(activityId);
        if (activity) {
          newMap.set(activityId, { ...activity, images: [result] });
        }
        return newMap;
      });
    };
    reader.onerror = () => {
      toast.showError('Failed to add image. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (activityId: string, imageIndex: number) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity && activity.images) {
        const updatedImages = activity.images.filter((_, idx) => idx !== imageIndex);
        newMap.set(activityId, { ...activity, images: updatedImages });
      }
      return newMap;
    });
  };

  const handleActivitySelectionNext = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    }

    if (!selectedProject) {
      console.error('No project selected');
      return;
    }

    const withoutQuantity = Array.from(selectedActivities.values()).filter(
      (a) => a.quantity == null || a.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((a) => a.name).join(', ');
      toast.showWarning(
        `Quantity is required for all selected activities. Please enter quantity for: ${names}`
      );
      return;
    }

    setIsSubmittingActivities(true);
    try {
      const dprId = await ensureDprId();
      if (!dprId) {
        toast.showError('Failed to create DPR. Please try again.');
        return;
      }

      if (selectedActivities.size > 0) {
        const getVendorId = (contractorName: string | undefined): number | null => {
          if (!contractorName) return null;
          const c = contractors.find((x) => x.name === contractorName);
          const id = c?.numericId ?? c?.id;
          return id != null && id !== '' ? Number(id) : null;
        };
        /** Strip data:image/...;base64, prefix per spec - backend expects raw Base64 only */
        const toRawBase64 = (dataUrl: string) => {
          const idx = dataUrl.indexOf(',');
          return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
        };
        /** Only send activities_history_img when image is NEW (data URL from upload). Omit for API URLs to keep existing. */
        const isDataUrl = (s: string) => typeof s === 'string' && s.startsWith('data:');
        const entries = Array.from(selectedActivities.values())
          .filter((a) => (a.numericId ?? (Number.isFinite(Number(a.id)) ? Number(a.id) : null)) != null)
          .map((a) => {
            const actId = a.numericId ?? (Number.isFinite(Number(a.id)) ? Number(a.id) : null)!;
            const masterAct = activities.find((m) => m.id === a.id);
            const totalQty = masterAct?.qty ?? 0;
            const qty = Number(a.quantity ?? 0);
            const completion = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;
            const imgs = (a.images || []).filter((url): url is string => !!url && typeof url === 'string');
            const entry: {
              activities_history_activities_id: number;
              activities_history_qty: number;
              activities_history_completion?: number;
              activities_history_vendors_id?: number | null;
              activities_history_remarkes?: string;
              activities_history_img?: string;
              activities_history_dpr_id?: number | null;
            } = {
              activities_history_activities_id: actId,
              activities_history_qty: qty,
              activities_history_completion: completion,
              activities_history_dpr_id: Number(dprId),
            };
            const vendorId = getVendorId(a.contractor);
            if (vendorId != null) entry.activities_history_vendors_id = vendorId;
            if (a.remarks) entry.activities_history_remarkes = a.remarks;
            if (imgs.length > 0 && isDataUrl(imgs[0])) entry.activities_history_img = toRawBase64(imgs[0]);
            return entry;
          });
        if (entries.length > 0) {
          await activitiesHistoryAPI.add(entries);
        }
      }
      router.push(`${DPR_BASE}/materials`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save activities');
    } finally {
      setIsSubmittingActivities(false);
    }
  };

  // MaterialsListDPR: materials-list GET when screen loads
  useEffect(() => {
    if (!showMaterialSelection || !isAuthenticated) return;

    const fetchMaterials = async () => {
      setIsLoadingMaterials(true);
      try {
        const fetchedMaterials = await masterDataAPI.getMaterials();
        const raw = Array.isArray(fetchedMaterials) ? fetchedMaterials : [];
        const transformed: Material[] = raw.map((m: any) => {
          const materialClass = m.class?.value || m.class || '';
          const unitObj = m.units ?? m.unit;
          const unitLabel = unitObj?.unit || unitObj?.name || (typeof m.unit === 'string' ? m.unit : '') || '';
          return {
            id: m.uuid || String(m.id),
            numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
            class: (materialClass || 'B') as 'A' | 'B' | 'C',
            code: m.code || '',
            name: m.name || '',
            specification: m.specification ?? '',
            unit: unitLabel,
            createdAt: m.created_at || m.createdAt
          };
        });
        setMaterials(transformed);
      } catch (err: any) {
        console.error('Failed to fetch materials:', err);
        toast.showError(err.message || 'Failed to load materials');
        setMaterials([]);
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [showMaterialSelection, isAuthenticated, materialsRefreshKey]);

  const handleToggleMaterial = (material: Material) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      if (newMap.has(material.id)) {
        newMap.delete(material.id);
      } else {
        newMap.set(material.id, {
          id: material.id,
          numericId: material.numericId ?? (Number.isFinite(Number(material.id)) ? Number(material.id) : undefined),
          class: material.class,
          code: material.code,
          name: material.name,
          specification: material.specification,
          unit: material.unit,
          quantity: 0
        });
      }
      return newMap;
    });
  };

  const handleMaterialQuantityChange = (materialId: string, quantity: number) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleMaterialActivityChange = (materialId: string, activity: string) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleMaterialRemarksChange = (materialId: string, remarks: string) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const ensureDprId = async (): Promise<number | string | null> => {
    let dprId: number | string | null = dprIdRes ?? editingDprId;
    if (dprId) return dprId;
    if (!selectedProject) return null;
    const projectId = selectedProject.numericId ?? Number(selectedProject.id);
    const subprojectId = selectedSubproject ? (selectedSubproject.numericId ?? Number(selectedSubproject.id)) : null;
    try {
      const res = await dprAPI.add({
        dpr: {
          projects_id: projectId,
          sub_projects_id: subprojectId ?? '',
          name: new Date().toLocaleDateString('en-CA'),
          staps: '7',
          force_new: '1',
        },
      });
      const created = res?.dpr ?? res?.data?.dpr ?? res?.data ?? res;
      dprId = created?.id ?? created?.dpr_id ?? res?.data?.id ?? res?.data?.dpr_id ?? res?.id ?? res?.dpr_id ?? null;
      if (dprId != null) setDprIdRes(dprId);
      return dprId;
    } catch {
      return null;
    }
  };

  const handleMaterialSelectionNext = async () => {
    setIsSubmittingMaterials(true);
    try {
      const dprId = await ensureDprId();
      if (!dprId) {
        toast.showError('DPR not found. Please complete Activities first.');
        return;
      }
      if (selectedMaterials.size > 0) {
        const firstActivityId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
        const getActivityId = (activityName: string | undefined): number | null => {
          if (!activityName) return firstActivityId != null ? Number(firstActivityId) : null;
          const act = Array.from(selectedActivities.values()).find((a) => a.name === activityName);
          const id = act?.numericId ?? act?.id;
          return id != null ? Number(id) : (firstActivityId != null ? Number(firstActivityId) : null);
        };
        const entries = Array.from(selectedMaterials.values())
          .filter((m) => (m.numericId ?? Number(m.id)) != null)
          .map((m) => ({
            materials_id: Number(m.numericId ?? m.id),
            dpr_id: Number(dprId),
            activities_id: getActivityId(m.activity) ?? undefined,
            qty: Number(m.quantity ?? 0),
            remarkes: m.remarks || '',
          }));
        if (entries.length > 0) await materialsHistoryAPI.add(entries);
      }
      router.push(`${DPR_BASE}/labour`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save materials');
    } finally {
      setIsSubmittingMaterials(false);
    }
  };

  // Activity names for Tag Activity dropdown: use activities-list (per API table) merged with selected
  const [activitiesForDropdown, setActivitiesForDropdown] = useState<string[]>([]);
  useEffect(() => {
    if (!showMaterialSelection && !showLabourSelection && !showAssetSelection) return;
    if (!selectedProject) return;
    const projectId = selectedProject.numericId ?? selectedProject.id;
    const subprojectId = selectedSubproject?.numericId ?? selectedSubproject?.id;
    masterDataAPI.getActivities(projectId, subprojectId)
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const names = list.map((a: any) => a.activities ?? a.activity ?? a.name ?? '').filter(Boolean);
        const selectedNames = Array.from(selectedActivities.values()).map(a => a.name);
        setActivitiesForDropdown([...new Set([...selectedNames, ...names])]);
      })
      .catch(() => setActivitiesForDropdown(Array.from(selectedActivities.values()).map(a => a.name)));
  }, [showMaterialSelection, showLabourSelection, showAssetSelection, selectedProject, selectedSubproject, selectedActivities]);
  const selectedActivityNames = useMemo(() => {
    return activitiesForDropdown.length > 0 ? activitiesForDropdown : Array.from(selectedActivities.values()).map(act => act.name);
  }, [activitiesForDropdown, selectedActivities]);

  // SelectLabourDPR: labour-list GET when screen loads
  useEffect(() => {
    if (!showLabourSelection || !isAuthenticated) return;

    const fetchLabours = async () => {
      setIsLoadingLabours(true);
      try {
        const fetchedLabours = await masterDataAPI.getLabours();
        const raw = Array.isArray(fetchedLabours) ? fetchedLabours : [];
        const categoryMap: Record<string, string> = { skilled: 'Skilled', semiskilled: 'Semi Skilled', unskilled: 'Unskilled' };
        const transformed: Labour[] = raw.map((lab: any) => {
          const cat = (lab.category || '').toLowerCase();
          const category = categoryMap[cat] || (lab.category || '');
          const unitObj = lab.unit_id && typeof lab.unit_id === 'object' ? lab.unit_id : lab.unit;
          const unitLabel = unitObj?.unit || lab.unit?.unit || lab.unit || '';
          return {
            id: lab.uuid || String(lab.id),
            numericId: Number.isFinite(Number(lab.id)) ? Number(lab.id) : undefined,
            name: lab.name || lab.labour_name || '',
            type: lab.name || lab.type || '',
            category: category || 'Skilled',
            unit: unitLabel || 'Nos',
            createdAt: lab.created_at || lab.createdAt
          };
        });
        setLabours(transformed);
      } catch (e: any) {
        toast.showError(e?.message || 'Failed to load labours');
        setLabours([]);
      } finally {
        setIsLoadingLabours(false);
      }
    };

    fetchLabours();
  }, [showLabourSelection, isAuthenticated, laboursRefreshKey]);

  // Asset modal: contractors already loaded in Activity step. Skip duplicate fetch.

  // SelectMachineDPR: assets-list GET when screen loads
  useEffect(() => {
    if (!showAssetSelection || !isAuthenticated) return;

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const fetchedAssets = await masterDataAPI.getAssetsEquipments();
        const raw = Array.isArray(fetchedAssets) ? fetchedAssets : [];
        const transformed: AssetEquipment[] = raw.map((asset: any) => {
          const unitObj = asset.unit_id && typeof asset.unit_id === 'object' ? asset.unit_id : asset.unit;
          const unitLabel = unitObj?.unit || unitObj?.name || (typeof unitObj === 'string' ? unitObj : '') || asset.unit?.unit || asset.unit || '';
          return {
            id: asset.uuid || String(asset.id),
            numericId: Number.isFinite(Number(asset.id)) ? Number(asset.id) : undefined,
            code: asset.code || '',
            name: asset.assets || asset.name || '',
            specification: asset.specification ?? '',
            unit: unitLabel,
            createdAt: asset.created_at || asset.createdAt
          };
        });
        setAssets(transformed);
      } catch (e: any) {
        toast.showError(e?.message || 'Failed to load assets');
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [showAssetSelection, isAuthenticated, assetsRefreshKey]);

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) {
      return assets;
    }
    const query = assetSearchQuery.toLowerCase();
    return assets.filter(asset =>
      (asset.code || '').toLowerCase().includes(query) ||
      (asset.name || '').toLowerCase().includes(query) ||
      (asset.specification || '').toLowerCase().includes(query) ||
      (asset.unit || '').toLowerCase().includes(query)
    );
  }, [assets, assetSearchQuery]);

  useEffect(() => {
    setAssetPage(1);
  }, [assetSearchQuery]);

  const paginatedAssets = useMemo(() => {
    const start = (assetPage - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, assetPage]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return materials;
    const q = materialSearchQuery.toLowerCase();
    return materials.filter(m =>
      m.class.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.specification && m.specification.toLowerCase().includes(q)) ||
      m.unit.toLowerCase().includes(q)
    );
  }, [materials, materialSearchQuery]);

  const paginatedMaterials = useMemo(() => {
    const start = (materialsPage - 1) * PAGE_SIZE;
    return filteredMaterials.slice(start, start + PAGE_SIZE);
  }, [filteredMaterials, materialsPage]);

  const filteredLabours = useMemo(() => {
    if (!labourSearchQuery.trim()) return labours;
    const q = labourSearchQuery.toLowerCase();
    return labours.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.type || '').toLowerCase().includes(q) ||
      (l.category || '').toLowerCase().includes(q)
    );
  }, [labours, labourSearchQuery]);

  const paginatedLabours = useMemo(() => {
    const start = (laboursPage - 1) * PAGE_SIZE;
    return filteredLabours.slice(start, start + PAGE_SIZE);
  }, [filteredLabours, laboursPage]);

  const paginatedSafetyEntries = useMemo(() => {
    const start = (safetyPage - 1) * PAGE_SIZE;
    return safetyEntries.slice(start, start + PAGE_SIZE);
  }, [safetyEntries, safetyPage]);

  useEffect(() => {
    setMaterialsPage(1);
  }, [materialSearchQuery]);

  useEffect(() => {
    setLaboursPage(1);
  }, [labourSearchQuery]);


  const paginatedHindranceEntries = useMemo(() => {
    const start = (hindrancePage - 1) * PAGE_SIZE;
    return hindranceEntries.slice(start, start + PAGE_SIZE);
  }, [hindranceEntries, hindrancePage]);

  const paginatedDprList = useMemo(() => {
    const start = (dprListPage - 1) * PAGE_SIZE;
    return dprList.slice(start, start + PAGE_SIZE);
  }, [dprList, dprListPage]);

  const handleToggleLabour = (labour: Labour) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      if (newMap.has(labour.id)) {
        newMap.delete(labour.id);
      } else {
        newMap.set(labour.id, {
          id: labour.id,
          numericId: labour.numericId,
          type: labour.type,
          category: labour.category,
          quantity: 0,
          overtimeQuantity: 0,
          ratePerUnit: 0
        });
      }
      return newMap;
    });
  };

  const handleLabourQuantityChange = (labourId: string, quantity: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleLabourOvertimeQuantityChange = (labourId: string, overtimeQuantity: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          overtimeQuantity: overtimeQuantity
        });
      }
      return newMap;
    });
  };

  const handleLabourActivityChange = (labourId: string, activity: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleLabourContractorChange = (labourId: string, contractor: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleLabourRateChange = (labourId: string, ratePerUnit: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          ratePerUnit: ratePerUnit
        });
      }
      return newMap;
    });
  };

  const handleLabourRemarksChange = (labourId: string, remarks: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleLabourSelectionNext = async () => {
    const withoutQuantity = Array.from(selectedLabours.values()).filter(
      (l) => l.quantity == null || l.quantity <= 0
    );
    if (withoutQuantity.length > 0 && selectedLabours.size > 0) {
      const names = withoutQuantity.map((l) => l.type || l.category).join(', ');
      toast.showWarning(
        `Quantity is required for all selected labours. Please enter quantity for: ${names}`
      );
      return;
    }

    setIsSubmittingLabour(true);
    try {
      const dprId = await ensureDprId();
      if (!dprId) {
        toast.showError('DPR not found. Please complete Activities first.');
        return;
      }
      if (selectedLabours.size > 0) {
        const getVendorId = (contractorName: string | undefined): number | null => {
          if (!contractorName) return null;
          const c = contractors.find((x) => x.name === contractorName);
          const id = c?.numericId ?? c?.id;
          return id != null && id !== '' ? Number(id) : null;
        };
        const firstActId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
        const getActivityId = (name: string | undefined): number | null =>
          name ? (Array.from(selectedActivities.values()).find((a) => a.name === name)?.numericId ?? Number(Array.from(selectedActivities.values()).find((a) => a.name === name)?.id) ?? null) : Number(firstActId) || null;
        const entries = Array.from(selectedLabours.values())
          .filter((l) => (l.numericId ?? Number(l.id)) != null)
          .map((l) => {
            const e: { labours_id: number; dpr_id: number; qty: number; ot_qty: number; remarkes: string; activities_id?: number | null; vendors_id?: number | null; rate_per_unit: number } = {
              labours_id: Number(l.numericId ?? l.id),
              dpr_id: Number(dprId),
              qty: Number(l.quantity ?? 0),
              ot_qty: Number(l.overtimeQuantity ?? 0),
              remarkes: l.remarks || '',
              rate_per_unit: Number(l.ratePerUnit ?? 0),
            };
            const actId = getActivityId(l.activity);
            if (actId != null) e.activities_id = actId;
            const vendorId = getVendorId(l.contractor);
            if (vendorId != null) e.vendors_id = vendorId;
            return e;
          });
        if (entries.length > 0) await labourHistoryAPI.add(entries);
      }
      router.push(`${DPR_BASE}/assets`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save labour');
    } finally {
      setIsSubmittingLabour(false);
    }
  };

  const handleToggleAsset = (asset: AssetEquipment) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      if (newMap.has(asset.id)) {
        newMap.delete(asset.id);
      } else {
        newMap.set(asset.id, {
          id: asset.id,
          numericId: asset.numericId,
          code: asset.code,
          name: asset.name,
          quantity: 0,
          ratePerUnit: 0
        });
      }
      return newMap;
    });
  };

  const handleAssetQuantityChange = (assetId: string, quantity: number) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleAssetActivityChange = (assetId: string, activity: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleAssetContractorChange = (assetId: string, contractor: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleAssetRateChange = (assetId: string, ratePerUnit: number) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          ratePerUnit: ratePerUnit
        });
      }
      return newMap;
    });
  };

  const handleAssetRemarksChange = (assetId: string, remarks: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleAssetSelectionNext = async () => {
    const withoutQuantity = Array.from(selectedAssets.values()).filter(
      (a) => !a.quantity || a.quantity <= 0
    );
    if (withoutQuantity.length > 0 && selectedAssets.size > 0) {
      const names = withoutQuantity.map((a) => a.name || a.code).join(', ');
      toast.showWarning(
        `Quantity is required for all selected assets. Please enter quantity for: ${names}`
      );
      return;
    }

    setIsSubmittingAssets(true);
    try {
      const dprId = await ensureDprId();
      if (!dprId) {
        toast.showError('DPR not found. Please complete Activities first.');
        return;
      }
      if (selectedAssets.size > 0) {
        const getVendorId = (contractorName: string | undefined): number | null => {
          if (!contractorName) return null;
          const c = contractors.find((x) => x.name === contractorName);
          const id = c?.numericId ?? c?.id;
          return id != null && id !== '' ? Number(id) : null;
        };
        const firstActId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
        const getActivityId = (name: string | undefined): number | null =>
          name ? (Array.from(selectedActivities.values()).find((a) => a.name === name)?.numericId ?? Number(Array.from(selectedActivities.values()).find((a) => a.name === name)?.id) ?? null) : Number(firstActId) || null;
        const entries = Array.from(selectedAssets.values())
          .filter((a) => (a.numericId ?? Number(a.id)) != null)
          .map((a) => {
            const e: { assets_id: number; dpr_id: number; qty: number; remarkes: string; activities_id?: number | null; vendors_id?: number | null; rate_per_unit: number } = {
              assets_id: Number(a.numericId ?? a.id),
              dpr_id: Number(dprId),
              qty: Number(a.quantity ?? 0),
              remarkes: a.remarks || '',
              rate_per_unit: Number(a.ratePerUnit ?? 0),
            };
            const actId = getActivityId(a.activity);
            if (actId != null) e.activities_id = actId;
            const vendorId = getVendorId(a.contractor);
            if (vendorId != null) e.vendors_id = vendorId;
            return e;
          });
        if (entries.length > 0) await assetsHistoryAPI.add(entries);
      }
      router.push(`${DPR_BASE}/safety`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save assets');
    } finally {
      setIsSubmittingAssets(false);
    }
  };

  // Load team members (staff list) from Admin > User Management > Teams (GET /teams-list)
  // Deferred: only fetch when Safety or Hindrance modal opens (not on initial page load)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!showSafetySelection && !showHindranceSelection) return;
    const fetchTeamMembers = async () => {
      try {
        const staffList = await teamsAPI.getTeamsList();
        const raw = Array.isArray(staffList) ? staffList : [];
        const members: TeamMember[] = raw
          .map((u: any) => {
            const id = resolveTeamsListCompanyUsersId(u);
            if (!id) return null;
            return { id, name: u.name || '', email: u.email || '' };
          })
          .filter((m): m is TeamMember => m != null && !!m.name);
        setTeamMembers(members);
      } catch (err: any) {
        console.warn('Staff list API failed, using fallback:', err?.message);
        // Fallback: try localStorage (manageTeamsUsers from Admin > User Management > Teams, or users)
        try {
          const saved = localStorage.getItem('manageTeamsUsers') || localStorage.getItem('users');
          const parsed = saved ? JSON.parse(saved) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          const fallback: TeamMember[] = list
            .map((u: any) => {
              const id = resolveTeamsListCompanyUsersId(u);
              if (!id) return null;
              return { id, name: u.name || '', email: u.email || '' };
            })
            .filter((m): m is TeamMember => m != null && !!m.name);
          setTeamMembers(fallback);
        } catch (e) {
          setTeamMembers([]);
        }
      }
    };
    fetchTeamMembers();
  }, [isAuthenticated, showSafetySelection, showHindranceSelection]);

  /** Resolve image URL to absolute - backend may return relative paths (e.g. /storage/...) */
  const resolveImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
    const base = String(baseUrl).replace(/\/$/, '');
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  };

  /** Parse images from API item - handles image, image_url, img, images, image_paths, etc. */
  const parseImagesFromItem = (item: any): string[] => {
    const single = item?.image ?? item?.image_url ?? item?.img ?? item?.image_path ?? '';
    const arr = item?.images ?? item?.image_urls ?? item?.image_paths ?? item?.imgs;
    const combined = Array.isArray(arr) ? arr : (single ? [single] : []);
    return combined.filter(Boolean).map((u: string) => resolveImageUrl(String(u)));
  };

  const pickCompanyUsersIdFromItem = (item: any): string => {
    const fromRoot = normalizeCompanyUsersIdField(
      item?.company_users_id ?? item?.company_user_id
    );
    if (fromRoot) return fromRoot;
    const tm = item?.team_members;
    if (!Array.isArray(tm) || tm.length === 0) return '';
    const first = tm[0];
    if (first == null) return '';
    if (typeof first === 'object') {
      return normalizeCompanyUsersIdField(
        first.company_users_id ?? first.company_user_id ?? first.id ?? first
      );
    }
    return normalizeNumericCompanyUsersId(first);
  };

  /** Map API item to SafetyEntry - used by both fetch-dpr-history-edit and safety-list */
  const mapItemToSafetyEntry = (item: any) => {
    const raw = item?.company_users_id;
    let companyUserDisplay: SafetyEntry['companyUserDisplay'];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const id = normalizeCompanyUsersIdField(raw);
      if (!id && raw.name) {
        companyUserDisplay = {
          name: String(raw.name),
          email: String(raw.email ?? ''),
          phone: String(raw.phone ?? ''),
        };
      }
    }
    return {
      id: item.uuid || String(item.id),
      serverId: item.id,
      details: item.details || item.description || item.name || '',
      images: parseImagesFromItem(item),
      company_users_id: pickCompanyUsersIdFromItem(item),
      companyUserDisplay,
      remarks: item.remarks || '',
    };
  };

  // SafetyDPR: fetch-dpr-history-edit (edit mode) or safety-list when screen loads
  useEffect(() => {
    if (!showSafetySelection || !isAuthenticated) return;
    const dprId = dprIdRes ?? editingDprId;
    if (!dprId) return;
    const fetchSafetyList = async () => {
      setIsLoadingSafety(true);
      try {
        let rawList: any[] = [];
        if (editingDprId) {
          try {
            const res = await dprAPI.dprHistoryEdit({ type: 'safety', dprId: Number(editingDprId) });
            const data = res?.data ?? res;
            rawList = Array.isArray(data) ? data : (data?.safety ?? data?.safeties ?? []);
          } catch {
            rawList = [];
          }
          if (rawList.length === 0) {
            try {
              const details = await dprAPI.getDetails(editingDprId);
              const d = details?.data ?? details;
              rawList = Array.isArray(d) ? d : (d?.safety ?? d?.safeties ?? []);
            } catch { /* ignore */ }
          }
        }
        if (rawList.length === 0) {
          const params = { dprId, projects_id: selectedProject?.numericId ?? selectedProject?.id ?? '', sub_projects_id: selectedSubproject ? (selectedSubproject.numericId ?? selectedSubproject.id) : '' };
          rawList = await safetyAPI.getSafetyList(params);
        }
        const dprIdStr = String(dprId);
        const filtered = rawList.filter((item: any) => {
          const itemDprId = item.dpr_id ?? item.dprId ?? item.daily_progress_reports_id ?? item.dprs_id;
          if (itemDprId == null || itemDprId === '') return true;
          return String(itemDprId) === dprIdStr;
        });
        const seen = new Set<string>();
        const mapped: SafetyEntry[] = filtered
          .map((item: any) => mapItemToSafetyEntry(item))
          .filter((e) => {
            const key = e.id || String(e.serverId ?? '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setSafetyEntries(mapped);
        setTeamMembers((prev) => mergeTeamMembersFromApiRows(filtered, prev));
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to load safety list');
      } finally {
        setIsLoadingSafety(false);
      }
    };
    fetchSafetyList();
  }, [showSafetySelection, isAuthenticated, editingDprId, dprIdRes, selectedProject, selectedSubproject]);

  /** Map API item to HindranceEntry - used by both fetch-dpr-history-edit and hinderance-list */
  const mapItemToHindranceEntry = (item: any) => {
    const raw = item?.company_users_id;
    let companyUserDisplay: HindranceEntry['companyUserDisplay'];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const id = normalizeCompanyUsersIdField(raw);
      if (!id && raw.name) {
        companyUserDisplay = {
          name: String(raw.name),
          email: String(raw.email ?? ''),
          phone: String(raw.phone ?? ''),
        };
      }
    }
    return {
      id: item.uuid || String(item.id),
      serverId: item.id,
      details: item.details || item.description || item.name || '',
      images: parseImagesFromItem(item),
      company_users_id: pickCompanyUsersIdFromItem(item),
      companyUserDisplay,
      remarks: item.remarks || '',
    };
  };

  // HinderanceDPR: fetch-dpr-history-edit (edit mode) or hinderance-list when screen loads
  useEffect(() => {
    if (!showHindranceSelection || !isAuthenticated) return;
    const dprId = dprIdRes ?? editingDprId;
    if (!dprId) return;
    const fetchHinderanceList = async () => {
      setIsLoadingHindrance(true);
      try {
        let rawList: any[] = [];
        if (editingDprId) {
          try {
            const res = await dprAPI.dprHistoryEdit({ type: 'hindrances', dprId: Number(editingDprId) });
            const data = res?.data ?? res;
            rawList = Array.isArray(data) ? data : (data?.hindrances ?? data?.hinderances ?? data?.hinderance ?? []);
          } catch {
            rawList = [];
          }
          if (rawList.length === 0) {
            try {
              const details = await dprAPI.getDetails(editingDprId);
              const d = details?.data ?? details;
              rawList = Array.isArray(d) ? d : (d?.hindrances ?? d?.hinderances ?? d?.hinderance ?? []);
            } catch { /* ignore */ }
          }
        }
        if (rawList.length === 0) {
          const params = { dprId, projects_id: selectedProject?.numericId ?? selectedProject?.id ?? '', sub_projects_id: selectedSubproject ? (selectedSubproject.numericId ?? selectedSubproject.id) : '' };
          rawList = await hinderanceAPI.getList(params);
        }
        const dprIdStr = String(dprId);
        const filtered = rawList.filter((item: any) => {
          const itemDprId = item.dpr_id ?? item.dprId ?? item.daily_progress_reports_id ?? item.dprs_id;
          if (itemDprId == null || itemDprId === '') return true;
          return String(itemDprId) === dprIdStr;
        });
        const seen = new Set<string>();
        const mapped: HindranceEntry[] = filtered
          .map((item: any) => mapItemToHindranceEntry(item))
          .filter((e) => {
            const key = e.id || String(e.serverId ?? '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setHindranceEntries(mapped);
        setTeamMembers((prev) => mergeTeamMembersFromApiRows(filtered, prev));
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to load hinderance list');
      } finally {
        setIsLoadingHindrance(false);
      }
    };
    fetchHinderanceList();
  }, [showHindranceSelection, isAuthenticated, editingDprId, dprIdRes, selectedProject, selectedSubproject]);

  const fetchDprList = useCallback(async (opts?: { preserveOnEmpty?: boolean; force?: boolean; onFetched?: (list: any[]) => void }) => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const useCache = !opts?.force && now - lastFetchDprListAt.current < 2000;
    if (useCache) return;

    const cached = !opts?.force && DPR_LIST_CACHE.dprList && now - DPR_LIST_CACHE.dprList.ts < DPR_LIST_CACHE.DPR_LIST_TTL_MS;
    if (cached && DPR_LIST_CACHE.dprList) {
      setDprList(DPR_LIST_CACHE.dprList.data);
      setProjectsMapForDprList(DPR_LIST_CACHE.dprList.projMap);
      setSubprojectsMapForDprList(DPR_LIST_CACHE.dprList.subMap);
      setDprListPage(1);
      setIsLoadingDprList(false);
      return;
    }

    setIsLoadingDprList(true);
    setDprListError(null);
    try {
      const list = await dprAPI.getList({});
      const arr = Array.isArray(list) ? list : [];
      if (arr.length > 0 || !opts?.preserveOnEmpty) setDprList(arr);
      else setDprList(prev => prev);
      setDprListPage(1);
      opts?.onFetched?.(arr);

      // Build project and subproject name maps from dpr-list response (avoid project-subproject API)
      let projMap: Record<string, string> = {};
      let subMap: Record<string, string> = {};

      for (const d of arr) {
        // Project name from response: nested object or top-level
        const pid = d.projects_id;
        if (pid != null && typeof pid === 'object') {
          const id = pid?.id ?? pid;
          const name = pid?.project_name ?? pid?.name ?? d.project_name;
          if (id != null && name) {
            projMap[String(id)] = name;
            if (Number.isFinite(Number(id))) projMap[String(Number(id))] = name;
          }
        } else if (pid != null && (d.project_name ?? d.projects?.project_name ?? d.projects?.name)) {
          const name = d.project_name ?? d.projects?.project_name ?? d.projects?.name;
          projMap[String(pid)] = name;
          if (Number.isFinite(Number(pid))) projMap[String(Number(pid))] = name;
        }
        // Subproject name from response: nested object or top-level
        const sid = d.sub_projects_id;
        if (sid != null && typeof sid === 'object') {
          const id = sid?.id ?? sid;
          const name = sid?.name ?? d.sub_project_name ?? d.subproject_name;
          if (id != null && name) {
            subMap[String(id)] = name;
            if (Number.isFinite(Number(id))) subMap[String(Number(id))] = name;
          }
        } else if (sid != null && (d.sub_project_name ?? d.subproject_name ?? d.sub_projects?.name ?? d.subProjects?.name)) {
          const name = d.sub_project_name ?? d.subproject_name ?? d.sub_projects?.name ?? d.subProjects?.name;
          subMap[String(sid)] = name;
          if (Number.isFinite(Number(sid))) subMap[String(Number(sid))] = name;
        }
      }

      // Only call project-list for project IDs we don't have names for (no project-subproject calls)
      const missingProjectIds = [...new Set(arr.map((d: any) => {
        const pid = d.projects_id;
        if (pid == null) return null;
        const id = typeof pid === 'object' ? (pid?.id ?? pid) : pid;
        if (id == null) return null;
        return projMap[String(id)] ? null : String(id);
      }).filter(Boolean))] as string[];

      // Show list immediately - user sees data right away
      setProjectsMapForDprList(projMap);
      setSubprojectsMapForDprList(subMap);
      setIsLoadingDprList(false);
      lastFetchDprListAt.current = Date.now();
      DPR_LIST_CACHE.dprList = { data: arr, projMap: { ...projMap }, subMap: { ...subMap }, ts: Date.now() };

      // Fill missing project names in background (non-blocking)
      if (missingProjectIds.length > 0) {
        const projectsCacheValid = DPR_LIST_CACHE.projects && now - DPR_LIST_CACHE.projects.ts < DPR_LIST_CACHE.TTL_MS;
        const fetchProjects = async () => {
          try {
            let projArr: any[] = [];
            if (projectsCacheValid && !opts?.force && DPR_LIST_CACHE.projects) {
              projArr = DPR_LIST_CACHE.projects.data || [];
            } else {
              const fetched = await masterDataAPI.getProjectsList();
              projArr = Array.isArray(fetched) ? fetched : ((fetched as any)?.data ?? (fetched as any)?.projects ?? []);
              DPR_LIST_CACHE.projects = { data: projArr, ts: Date.now() };
            }
            const merged: Record<string, string> = { ...projMap };
            for (const p of projArr) {
              const rawId = p.id ?? p.project_id ?? p.projects_id;
              const name = p.project_name || p.name || '';
              if (rawId != null && name) {
                merged[String(rawId)] = name;
                if (Number.isFinite(Number(rawId))) merged[String(Number(rawId))] = name;
              }
            }
            setProjectsMapForDprList(prev => ({ ...prev, ...merged }));
          } catch {
            if (DPR_LIST_CACHE.projects) {
              const merged: Record<string, string> = { ...projMap };
              for (const p of DPR_LIST_CACHE.projects.data || []) {
                const rawId = p.id ?? p.project_id ?? p.projects_id;
                const name = p.project_name || p.name || '';
                if (rawId != null && name) {
                  merged[String(rawId)] = name;
                  if (Number.isFinite(Number(rawId))) merged[String(Number(rawId))] = name;
                }
              }
              setProjectsMapForDprList(prev => ({ ...prev, ...merged }));
            }
          }
        };
        void fetchProjects();
      }
    } catch (err: any) {
      setDprListError(err?.message || 'Failed to load DPR list');
      if (!opts?.preserveOnEmpty) setDprList([]);
      toast.showError(err?.message || 'Failed to load DPR list');
    } finally {
      setIsLoadingDprList(false);
      lastFetchDprListAt.current = Date.now();
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingDprList(true);
    fetchDprList();
  }, [isAuthenticated, fetchDprList]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFetchDprListAt.current < DPR_LIST_CACHE.VISIBILITY_THROTTLE_MS) return;
      lastFetchDprListAt.current = now;
      fetchDprList({ force: true });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, fetchDprList]);

  const handleAddSafetyEntry = () => {
    const tempId = `temp-${Date.now()}`;
    setSafetyEntries(prev => [...prev, { id: tempId }]);
  };

  const handleRemoveSafetyEntry = async (id: string) => {
    const entry = safetyEntries.find(e => e.id === id);
    if (entry?.serverId != null) {
      try {
        await safetyAPI.deleteSafety(String(entry.serverId));
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to delete safety entry');
        return;
      }
    }
    setSafetyEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleSafetyEntryDetailsChange = (id: string, details: string) => {
    setSafetyEntries(prev => prev.map(e => e.id === id ? { ...e, details } : e));
  };

  const handleSafetyEntryImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setSafetyEntries(prev => prev.map(entry =>
          entry.id === id ? { ...entry, images: [result] } : entry
        ));
      }
    };
    reader.onerror = () => toast.showError('Failed to load image');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSafetyEntryRemoveImage = (id: string, index: number) => {
    setSafetyEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const arr = e.images || (e.image ? [e.image] : []);
      const next = arr.filter((_, i) => i !== index);
      return { ...e, images: next };
    }));
  };

  const handleSafetyEntryCompanyUserChange = (entryId: string, companyUsersId: string) => {
    const cuid = normalizeNumericCompanyUsersId(companyUsersId) || undefined;
    setSafetyEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, company_users_id: cuid, companyUserDisplay: undefined } : e
      )
    );
  };

  const handleSafetyEntryRemarksChange = (id: string, remarks: string) => {
    setSafetyEntries(prev => prev.map(e => e.id === id ? { ...e, remarks } : e));
  };

  const handleSafetyNext = async () => {
    // Only save EXISTING entries via safety-add; NEW entries go in dpr-bulk-add
    const existingEntries = safetyEntries.filter(e => e.serverId != null);
    if (existingEntries.length > 0) {
      setIsSubmittingSafety(true);
      try {
        for (const entry of existingEntries) {
          const fd = buildSafetyAddFormData(entry);
          if (!fd) {
            toast.showError('Missing project or DPR. Please go back and complete project selection.');
            setIsSubmittingSafety(false);
            return;
          }
          await safetyAPI.addSafety(fd);
        }
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to save safety entries');
        setIsSubmittingSafety(false);
        return;
      }
      setIsSubmittingSafety(false);
    }
    router.push(`${DPR_BASE}/hindrance`);
  };

  const handleSafetySkip = () => {
    handleSafetyNext();
  };

  const handleAddHindranceEntry = () => {
    const tempId = `temp-hind-${Date.now()}`;
    setHindranceEntries(prev => [...prev, { id: tempId }]);
  };

  const handleRemoveHindranceEntry = async (id: string) => {
    const entry = hindranceEntries.find(e => e.id === id);
    if (entry?.serverId != null) {
      try {
        await hinderanceAPI.delete(String(entry.serverId));
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to delete hinderance entry');
        return;
      }
    }
    setHindranceEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleHindranceEntryDetailsChange = (id: string, details: string) => {
    setHindranceEntries(prev => prev.map(e => e.id === id ? { ...e, details } : e));
  };

  const handleHindranceEntryImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setHindranceEntries(prev => prev.map(entry =>
          entry.id === id ? { ...entry, images: [result] } : entry
        ));
      }
    };
    reader.onerror = () => toast.showError('Failed to load image');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleHindranceEntryRemoveImage = (id: string, index: number) => {
    setHindranceEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const arr = e.images || (e.image ? [e.image] : []);
      const next = arr.filter((_, i) => i !== index);
      return { ...e, images: next };
    }));
  };

  const handleHindranceEntryCompanyUserChange = (entryId: string, companyUsersId: string) => {
    const cuid = normalizeNumericCompanyUsersId(companyUsersId) || undefined;
    setHindranceEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, company_users_id: cuid, companyUserDisplay: undefined } : e
      )
    );
  };

  const handleHindranceEntryRemarksChange = (id: string, remarks: string) => {
    setHindranceEntries(prev => prev.map(e => e.id === id ? { ...e, remarks } : e));
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File | null => {
    try {
      if (!dataUrl || typeof dataUrl !== 'string') return null;
      const idx = dataUrl.indexOf(',');
      if (idx < 0) return null;
      const mimeMatch = dataUrl.substring(0, idx).match(/:(.*?);/);
      const mime = mimeMatch?.[1] || 'image/jpeg';
      const b64 = dataUrl.substring(idx + 1);
      if (!b64) return null;
      const bstr = atob(b64);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
      return new File([u8arr], filename, { type: mime });
    } catch (e) {
      return null;
    }
  };

  /** Build FormData for safety-add (single entry, multipart). Per spec: img for single file; id when updating. */
  const buildSafetyAddFormData = (entry: SafetyEntry): FormData | null => {
    const projectId = selectedProject?.numericId ?? selectedProject?.id;
    const subprojectId = selectedSubproject ? (selectedSubproject.numericId ?? selectedSubproject.id) : null;
    const dprId = dprIdRes ?? editingDprId;
    if (!projectId || !dprId) return null;
    const fd = new FormData();
    if (entry.serverId != null) fd.append('id', String(entry.serverId));
    fd.append('projects_id', String(projectId));
    fd.append('sub_projects_id', subprojectId != null ? String(subprojectId) : '');
    fd.append('dprId', String(dprId));
    fd.append('dpr_id', String(dprId));
    fd.append('name', (entry.details || '').substring(0, 100) || 'Safety');
    fd.append('details', entry.details || '');
    fd.append('remarks', entry.remarks || '');
    const cuid = normalizeNumericCompanyUsersId(entry.company_users_id);
    if (cuid) fd.append('company_users_id', cuid);
    const imgs = entry.images || (entry.image ? [entry.image] : []);
    const uploadableImg = imgs.find((u): u is string => typeof u === 'string' && u.startsWith('data:'));
    if (uploadableImg) {
      const f = dataURLtoFile(uploadableImg, 'safety_img.jpg');
      if (f) fd.append('img', f);
    }
    return fd;
  };

  /** Build FormData for hinderance-add (single entry, multipart). Per spec: img for single file; id when updating. */
  const buildHindranceAddFormData = (entry: HindranceEntry): FormData | null => {
    const projectId = selectedProject?.numericId ?? selectedProject?.id;
    const subprojectId = selectedSubproject ? (selectedSubproject.numericId ?? selectedSubproject.id) : null;
    const dprId = dprIdRes ?? editingDprId;
    if (!projectId || !dprId) return null;
    const fd = new FormData();
    if (entry.serverId != null) fd.append('id', String(entry.serverId));
    fd.append('projects_id', String(projectId));
    fd.append('sub_projects_id', subprojectId != null ? String(subprojectId) : '');
    fd.append('dprId', String(dprId));
    fd.append('dpr_id', String(dprId));
    fd.append('name', (entry.details || '').substring(0, 100) || 'Hindrance');
    fd.append('details', entry.details || '');
    fd.append('remarks', entry.remarks || '');
    const cuid = normalizeNumericCompanyUsersId(entry.company_users_id);
    if (cuid) fd.append('company_users_id', cuid);
    const imgs = entry.images || (entry.image ? [entry.image] : []);
    const uploadableImg = imgs.find((u): u is string => typeof u === 'string' && u.startsWith('data:'));
    if (uploadableImg) {
      const f = dataURLtoFile(uploadableImg, 'hinderance_img.jpg');
      if (f) fd.append('img', f);
    }
    return fd;
  };

  const buildDprFormData = (): FormData | null => {
    const projectId = selectedProject?.numericId ?? Number(selectedProject?.id);
    const subprojectId = selectedSubproject ? (selectedSubproject.numericId ?? Number(selectedSubproject.id)) : null;
    const dprId = dprIdRes ?? editingDprId;
    if (!projectId) return null;

    const getVendorId = (contractorName: string | undefined): number | string => {
      if (!contractorName) return '';
      const c = contractors.find((x) => x.name === contractorName);
      return c?.numericId ?? c?.id ?? '';
    };

    const formData = new FormData();
    // Send dpr as PHP array format (dpr[key]=value) so Laravel parses as array; avoids "offset on string" when backend expects array
    formData.append('dpr[projects_id]', String(projectId));
    formData.append('dpr[sub_projects_id]', subprojectId != null ? String(subprojectId) : '');
    formData.append('dpr[name]', new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in system/local timezone
    formData.append('dpr[staps]', '7');
    if (editingDprId != null) {
      formData.append('dpr[id]', String(editingDprId));
    } else if (dprId != null) {
      formData.append('dpr[id]', String(dprId)); // Use existing DPR from ensureDprId so bulk updates it (incl. safety/hinderance)
    } else {
      formData.append('dpr[force_new]', '1'); // Backend: create new when no DPR exists yet
    }

    if (selectedActivities.size > 0) {
      // Build array of valid activities (with actId) so activities and activities_images indices stay aligned
      const validActivities = Array.from(selectedActivities.values()).filter(
        (a) => (a.numericId ?? (Number.isFinite(Number(a.id)) ? Number(a.id) : null)) != null
      );
      validActivities.forEach((a, actIdx) => {
        const actId = a.numericId ?? (Number.isFinite(Number(a.id)) ? Number(a.id) : null)!;
        const masterAct = activities.find((m) => m.id === a.id);
        const totalQty = masterAct?.qty ?? 0;
        const qty = Number(a.quantity ?? 0);
        const completion = totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;
        const vendorId = getVendorId(a.contractor);
        const vendorNum = (vendorId !== '' && vendorId != null) ? Number(vendorId) : '';
        formData.append(`activities[${actIdx}][activities_history_activities_id]`, String(actId));
        formData.append(`activities[${actIdx}][activities_history_qty]`, String(qty));
        formData.append(`activities[${actIdx}][activities_history_completion]`, String(completion));
        if (vendorNum !== '') formData.append(`activities[${actIdx}][activities_history_vendors_id]`, String(vendorNum));
        formData.append(`activities[${actIdx}][remaining_qty]`, '0');
        formData.append(`activities[${actIdx}][total_qty]`, String(totalQty > 0 ? totalQty : qty));
        formData.append(`activities[${actIdx}][activities_history_remarkes]`, a.remarks || '');
      });
      // Backend expects activities_images[actIdx] = single File per activity (one img column in DB)
      validActivities.forEach((a, actIdx) => {
        const imgs = (a.images || []).filter((url): url is string => !!url && typeof url === 'string');
        const firstImg = imgs[0];
        if (firstImg) {
          const f = dataURLtoFile(firstImg, `activity_${actIdx}.jpg`);
          if (f) formData.append(`activities_images[${actIdx}]`, f);
        }
      });
    }
    if (selectedMaterials.size > 0) {
      const firstActivityId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
      const getActivityId = (activityName: string | undefined): number => {
        if (!activityName) return Number(firstActivityId) || 0;
        const act = Array.from(selectedActivities.values()).find((a) => a.name === activityName);
        return act?.numericId ?? Number(act?.id) ?? Number(firstActivityId) ?? 0;
      };
      let matIdx = 0;
      for (const m of selectedMaterials.values()) {
        if ((m.numericId ?? Number(m.id)) == null) continue;
        formData.append(`materials[${matIdx}][materials_id]`, String(m.numericId ?? Number(m.id) ?? m.id));
        formData.append(`materials[${matIdx}][activities_id]`, String(getActivityId(m.activity)));
        formData.append(`materials[${matIdx}][qty]`, String(m.quantity ?? 0));
        formData.append(`materials[${matIdx}][remarkes]`, m.remarks || '');
        matIdx++;
      }
    }
    if (selectedLabours.size > 0) {
      const firstActId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
      const getActId = (name: string | undefined): number => {
        if (!name) return Number(firstActId) || 0;
        const act = Array.from(selectedActivities.values()).find((a) => a.name === name);
        return act?.numericId ?? Number(act?.id) ?? Number(firstActId) ?? 0;
      };
      let labIdx = 0;
      for (const l of selectedLabours.values()) {
        if ((l.numericId ?? Number(l.id)) == null) continue;
        const v = getVendorId(l.contractor);
        formData.append(`labour[${labIdx}][labours_id]`, String(l.numericId ?? Number(l.id) ?? l.id));
        formData.append(`labour[${labIdx}][activities_id]`, String(getActId(l.activity)));
        formData.append(`labour[${labIdx}][qty]`, String(l.quantity ?? 0));
        formData.append(`labour[${labIdx}][ot_qty]`, String(l.overtimeQuantity ?? 0));
        formData.append(`labour[${labIdx}][rate_per_unit]`, String(l.ratePerUnit ?? 0));
        if (v !== '' && v != null) formData.append(`labour[${labIdx}][vendors_id]`, String(v));
        formData.append(`labour[${labIdx}][remarkes]`, l.remarks || '');
        labIdx++;
      }
    }
    if (selectedAssets.size > 0) {
      const firstActId = Array.from(selectedActivities.values())[0]?.numericId ?? Array.from(selectedActivities.values())[0]?.id;
      const getActId = (name: string | undefined): number => {
        if (!name) return Number(firstActId) || 0;
        const act = Array.from(selectedActivities.values()).find((a) => a.name === name);
        return act?.numericId ?? Number(act?.id) ?? Number(firstActId) ?? 0;
      };
      let astIdx = 0;
      for (const a of selectedAssets.values()) {
        if ((a.numericId ?? Number(a.id)) == null) continue;
        const v = getVendorId(a.contractor);
        formData.append(`assets[${astIdx}][assets_id]`, String(a.numericId ?? Number(a.id) ?? a.id));
        formData.append(`assets[${astIdx}][activities_id]`, String(getActId(a.activity)));
        formData.append(`assets[${astIdx}][qty]`, String(a.quantity ?? 0));
        formData.append(`assets[${astIdx}][rate_per_unit]`, String(a.ratePerUnit ?? 0));
        if (v !== '' && v != null) formData.append(`assets[${astIdx}][vendors_id]`, String(v));
        formData.append(`assets[${astIdx}][remarkes]`, a.remarks || '');
        astIdx++;
      }
    }
    // Bulk create: include NEW safety/hinderance (serverId == null) in dpr-bulk-add per spec
    const newSafetyEntries = safetyEntries.filter((e): e is SafetyEntry => e.serverId == null);
    if (newSafetyEntries.length > 0 && projectId && dprId) {
      newSafetyEntries.forEach((entry, idx) => {
        formData.append(`safety[${idx}][projects_id]`, String(projectId));
        formData.append(`safety[${idx}][sub_projects_id]`, subprojectId != null ? String(subprojectId) : '');
        formData.append(`safety[${idx}][dpr_id]`, String(dprId));
        formData.append(`safety[${idx}][name]`, (entry.details || '').substring(0, 100) || 'Safety');
        formData.append(`safety[${idx}][details]`, entry.details || '');
        formData.append(`safety[${idx}][remarks]`, entry.remarks || '');
        const scuid = normalizeNumericCompanyUsersId(entry.company_users_id);
        if (scuid) formData.append(`safety[${idx}][company_users_id]`, scuid);
      });
      newSafetyEntries.forEach((entry, idx) => {
        const imgs = entry.images || (entry.image ? [entry.image] : []);
        const firstImg = imgs.find((u): u is string => !!u && typeof u === 'string');
        if (firstImg) {
          const f = dataURLtoFile(firstImg, `safety_${idx}.jpg`);
          if (f) formData.append(`safety_images[${idx}]`, f);
        }
      });
    }
    const newHindranceEntries = hindranceEntries.filter((e): e is HindranceEntry => e.serverId == null);
    if (newHindranceEntries.length > 0 && projectId && dprId) {
      newHindranceEntries.forEach((entry, idx) => {
        formData.append(`hinderance[${idx}][projects_id]`, String(projectId));
        formData.append(`hinderance[${idx}][sub_projects_id]`, subprojectId != null ? String(subprojectId) : '');
        formData.append(`hinderance[${idx}][dpr_id]`, String(dprId));
        formData.append(`hinderance[${idx}][name]`, (entry.details || '').substring(0, 100) || 'Hindrance');
        formData.append(`hinderance[${idx}][details]`, entry.details || '');
        formData.append(`hinderance[${idx}][remarks]`, entry.remarks || '');
        const hcuid = normalizeNumericCompanyUsersId(entry.company_users_id);
        if (hcuid) formData.append(`hinderance[${idx}][company_users_id]`, hcuid);
      });
      newHindranceEntries.forEach((entry, idx) => {
        const imgs = entry.images || (entry.image ? [entry.image] : []);
        const firstImg = imgs.find((u): u is string => !!u && typeof u === 'string');
        if (firstImg) {
          const f = dataURLtoFile(firstImg, `hinderance_${idx}.jpg`);
          if (f) formData.append(`hinderance_images[${idx}]`, f);
        }
      });
    }
    return formData;
  };

  const handleHindranceNext = async () => {
    if (!selectedProject) return;
    const newSafetyCount = safetyEntries.filter(e => e.serverId == null).length;
    const newHindranceCount = hindranceEntries.filter(e => e.serverId == null).length;
    if (newSafetyCount > 0 || newHindranceCount > 0) {
      const dprId = await ensureDprId();
      if (!dprId) {
        toast.showError('DPR not found. Please complete Activities first.');
        return;
      }
    }
    setIsSubmittingHindrance(true);
    // Only save EXISTING entries via hinderance-add; NEW entries go in dpr-bulk-add
    const existingHindranceEntries = hindranceEntries.filter(e => e.serverId != null);
    try {
      for (const entry of existingHindranceEntries) {
        const fd = buildHindranceAddFormData(entry);
        if (!fd) {
          toast.showError('Missing project or DPR. Please go back and complete project selection.');
          setIsSubmittingHindrance(false);
          return;
        }
        await hinderanceAPI.add(fd);
      }
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save hindrance entries');
      setIsSubmittingHindrance(false);
      return;
    }
    const formData = buildDprFormData();
    if (!formData) {
      toast.showError('Failed to build DPR data');
      setIsSubmittingHindrance(false);
      return;
    }
    try {
      const res = await dprAPI.bulkAdd(formData);
      // Bulk returns: results with dpr_pdf.pdf_url; dpr id from dpr/results
      const created = res?.dpr ?? res?.data?.dpr ?? res?.data ?? res?.results?.dpr ?? res?.results ?? (res?.id != null ? res : null);
      const dprPdf = res?.dpr_pdf ?? res?.results?.dpr_pdf ?? res?.data?.dpr_pdf;
      const pdfUrl = dprPdf?.pdf_url ?? dprPdf?.data?.pdf_url;
      const finalDprId =
        created?.id ?? created?.dpr_id ??
        res?.data?.id ?? res?.data?.dpr_id ??
        res?.results?.dpr?.id ?? res?.results?.dpr?.dpr_id ??
        res?.results?.id ?? res?.results?.dpr_id ??
        res?.id ?? res?.dpr_id ??
        dprPdf?.dpr_id ??
        null;
      setCompletedDprId(finalDprId);
      if (pdfUrl) setCompletedPdfUrl(pdfUrl);
      setEditingDprId(null);
      setShowDPRComplete(true);
      toast.showSuccess('DPR saved successfully.');
      const optimisticId = finalDprId ?? created?.id;
      if (optimisticId != null) {
        const newItem = {
          id: optimisticId,
          dpr_no: created?.dpr_no ?? created?.dpr_number ?? `DPR-${optimisticId}`,
          date: created?.date ?? created?.dpr_date ?? new Date().toLocaleDateString('en-CA'),
          projects_id: selectedProject ? { id: selectedProject.id, name: selectedProject.name, project_name: selectedProject.name } : null,
          sub_projects_id: selectedSubproject ? { id: selectedSubproject.id, name: selectedSubproject.name } : null,
          projects: selectedProject ? { name: selectedProject.name, project_name: selectedProject.name } : created?.projects,
          sub_projects: selectedSubproject ? { name: selectedSubproject.name } : created?.sub_projects,
          subProjects: selectedSubproject ? { name: selectedSubproject.name } : created?.subProjects,
          staps: created?.staps ?? 7,
        };
        setDprList((prev) => [newItem, ...prev.filter((d: any) => String(d.id) !== String(optimisticId))]);
      }
      if (pdfUrl) window.open(pdfUrl, '_blank');
      setTimeout(() => fetchDprList({
        preserveOnEmpty: true,
        force: true,
        onFetched: (arr) => {
          setCompletedDprId((prev) => prev ?? (arr[0]?.id != null ? arr[0].id : null));
        },
      }), 800);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to save DPR');
      fetchDprList({ force: true });
    } finally {
      setIsSubmittingHindrance(false);
    }
  };

  const handleHindranceSkip = () => {
    handleHindranceNext();
  };

  // Prefetch PDF URL when Success modal loads (like mobile getPdfInfoRequest)
  useEffect(() => {
    if (!showDPRComplete || !completedDprId) return;
    dprAPI.generatePDF(completedDprId)
      .then((res: any) => {
        const url = res?.pdf_url ?? res?.data?.pdf_url;
        if (url) setCompletedPdfUrl(url);
      })
      .catch(() => {});
  }, [showDPRComplete, completedDprId]);

  const handleViewCompletedDpr = async () => {
    const dprId = completedDprId ?? dprIdRes ?? editingDprId;
    if (!dprId) {
      toast.showError('DPR ID not found. Please save the DPR first.');
      return;
    }
    if (completedPdfUrl) {
      window.open(completedPdfUrl, '_blank');
      return;
    }
    try {
      const res = await dprAPI.generatePDF(dprId);
      const url = res?.pdf_url ?? res?.data?.pdf_url;
      if (url) {
        setCompletedPdfUrl(url);
        window.open(url, '_blank');
      } else {
        toast.showError('PDF URL not found');
      }
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to generate PDF');
    }
  };

  const handleDownloadDPR = async () => {
    const dprId = completedDprId ?? dprIdRes ?? editingDprId;
    if (!dprId) {
      toast.showError('DPR ID not found. Please save the DPR first.');
      return;
    }
    let url = completedPdfUrl;
    if (!url) {
      try {
        const res = await dprAPI.generatePDF(dprId);
        url = res?.pdf_url ?? res?.data?.pdf_url;
        if (url) setCompletedPdfUrl(url);
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to generate PDF');
        return;
      }
    }
    if (!url) {
      toast.showError('PDF URL not found');
      return;
    }
    try {
      const blob = await dprAPI.downloadPdfBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `dpr_${dprId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.showSuccess('DPR downloaded');
    } catch (err: any) {
      window.open(url, '_blank');
      toast.showWarning('Download via browser opened');
    }
  };

  const handleMaterialCreated = () => {
    setMaterialsRefreshKey(k => k + 1); // Refetch materials from Masters API
  };

  const handleDeleteDpr = async () => {
    if (!dprToDelete) return;
    const deletedId = dprToDelete.id;
    setDprToDelete(null);
    try {
      await dprAPI.delete(deletedId);
      toast.showSuccess('DPR deleted.');
      setDprList(prev => prev.filter((d: any) => String(d.id) !== String(deletedId)));
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('company_id')) {
        toast.showSuccess('DPR removed.');
        setDprList(prev => prev.filter((d: any) => String(d.id) !== String(deletedId)));
      } else {
        toast.showError(msg || 'Failed to delete DPR');
      }
    }
  };

  const handleCreateNewProject = () => {
    router.push(`${DPR_BASE}/add-project`);
  };

  const handleCreateNewSubproject = () => {
    setShowCreateSubprojectModal(true);
  };

  const handleSubprojectCreated = (newSubproject: Subproject) => {
    setSubprojects(prev => [...prev, newSubproject]);
    setSubprojectSearchQuery('');
    setSubprojectRefreshKey(k => k + 1); // Trigger refetch to sync with server
  };

  const handleActivityCreated = (newActivity: ActivityItem) => {
    setActivities(prev => {
      if (prev.some(a => a.id === newActivity.id)) return prev;
      return [...prev, newActivity];
    });
    setActivitiesRefreshKey(k => k + 1); // Refetch to sync with server
  };

  const handleEditDpr = (dpr: any) => {
    const dprId = dpr.id;
    const projId = dpr.projects_id?.id ?? dpr.projects_id ?? dpr.projects?.id;
    const projName = dpr.projects_id?.project_name ?? dpr.projects_id?.name ?? dpr.projects?.project_name ?? dpr.projects?.name ?? 'Project';
    const subId = dpr.sub_projects_id?.id ?? dpr.sub_projects_id ?? dpr.sub_projects?.id;
    const subName = dpr.sub_projects_id?.name ?? dpr.sub_projects?.name ?? '';
    const proj = projects.find((p: any) => String(p.id) === String(projId) || String(p.numericId) === String(projId));
    const selectedProj = proj ?? { id: String(projId), numericId: Number(projId), name: projName, logo: '', code: '', company: '', location: '' };
    setSelectedProject(selectedProj);
    const sub = subprojects.find((s: any) => String(s.id) === String(subId) || String(s.numericId) === String(subId));
    const selectedSub = subId != null ? (sub ?? { id: String(subId), numericId: Number(subId), name: subName || 'Subproject', code: '', project: projName, manager: '', status: '', startDate: '', endDate: '' }) : null;
    setSelectedSubproject(selectedSub);
    setEditingDprId(dprId);
    setDprIdRes(null);
    editModeActivityRecordsRef.current = [];
    // Clear selections so fetch-dpr-history-edit populates them when each modal opens
    setSelectedActivities(new Map());
    setSelectedMaterials(new Map());
    setSelectedLabours(new Map());
    setSelectedAssets(new Map());
    setSafetyEntries([]);
    setHindranceEntries([]);
    setShowActivitySelection(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Daily Progress Report (DPR)</h1>
            <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Track daily work progress and activities
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 self-end sm:self-auto">
          <button
            onClick={handleCreateNewDPR}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Create a new DPR</span><span className="sm:hidden">New DPR</span>
          </button>
        </div>
      </div>

      {/* DPR List */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex flex-row items-center justify-between gap-2`}>
          <div className="min-w-0">
            <h2 className={`text-base font-black ${textPrimary}`}>DPR List</h2>
            <p className={`text-xs ${textSecondary} mt-0.5`}>Your daily progress reports</p>
          </div>
          <button
            onClick={() => fetchDprList({ force: true })}
            disabled={isLoadingDprList}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingDprList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {dprListError && (
          <div className={`mx-4 mt-2 p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{dprListError}</p>
          </div>
        )}
        <div className="overflow-x-auto">
          {isLoadingDprList ? (
            <div className={`flex items-center justify-center py-12 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading DPR list...</span>
            </div>
          ) : dprListError && dprList.length === 0 ? (
            <div className={`px-4 py-8 text-center ${textSecondary}`}>
              <p className="text-sm font-bold mb-2">{dprListError}</p>
              <button
                onClick={() => fetchDprList({ force: true })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : dprList.length === 0 ? (
            <div className={`px-4 py-8 text-center ${textSecondary}`}>
              <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">No DPRs yet</p>
              <p className="text-xs mt-1">Create your first DPR using the button above</p>
            </div>
          ) : (
            <>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}`}>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>DPR No</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Subproject</th>
                  <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {paginatedDprList.map((dpr: any, index: number) => (
                  <tr key={dpr.id != null ? `dpr-${dpr.id}-${index}` : `dpr-${index}`} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{dpr.dpr_no ?? '-'}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{formatDprListDate(dpr)}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>
                      {typeof dpr.projects_id === 'object' && dpr.projects_id
                        ? (dpr.projects_id?.project_name ?? dpr.projects_id?.name ?? '-')
                        : (dpr.project_name ?? dpr.projects?.project_name ?? dpr.projects?.name ?? (dpr.projects_id ? (projectsMapForDprList[String(dpr.projects_id)] ?? `Project #${dpr.projects_id}`) : '-'))}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>
                      {typeof dpr.sub_projects_id === 'object' && dpr.sub_projects_id
                        ? (dpr.sub_projects_id?.name ?? '-')
                        : (dpr.sub_project_name ?? dpr.subproject_name ?? dpr.sub_projects?.name ?? dpr.subProjects?.name ?? (dpr.sub_projects_id ? (subprojectsMapForDprList[String(dpr.sub_projects_id)] ?? `#${dpr.sub_projects_id}`) : '-'))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditDpr(dpr)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await dprAPI.generatePDF(dpr.id);
                              const url = res?.pdf_url ?? res?.data?.pdf_url;
                              if (url) window.open(url, '_blank');
                              else toast.showError('PDF URL not found');
                            } catch (err: any) {
                              toast.showError(err?.message || 'Failed to generate PDF');
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                          title="View"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await dprAPI.generatePDF(dpr.id);
                              const url = res?.pdf_url ?? res?.data?.pdf_url;
                              if (!url) {
                                toast.showError('PDF URL not found');
                                return;
                              }
                              try {
                                const blob = await dprAPI.downloadPdfBlob(url);
                                const blobUrl = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = `dpr_${dpr.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(blobUrl);
                                toast.showSuccess('DPR downloaded');
                              } catch {
                                window.open(url, '_blank');
                                toast.showWarning('Download via browser opened');
                              }
                            } catch (err: any) {
                              toast.showError(err?.message || 'Failed to download PDF');
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642] hover:bg-[#C2D642]/30' : 'bg-[#C2D642]/10 text-[#C2D642] hover:bg-[#C2D642]/20'}`}
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDprToDelete(dpr)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dprList.length > PAGE_SIZE && (
              <PaginationBar
                currentPage={dprListPage}
                totalItems={dprList.length}
                onPageChange={setDprListPage}
              />
            )}
            </>
          )}
        </div>
      </div>

      {/* Delete DPR Confirmation Modal */}
      {dprToDelete && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4" style={{ left: sidebarWidth }} onClick={() => setDprToDelete(null)}>
          <div
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-lg p-6 shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                <Trash2 className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-black ${textPrimary}`}>Delete DPR?</h2>
                <p className={`text-sm ${textSecondary} mt-2`}>
                  Are you sure you want to delete DPR #{dprToDelete?.dpr_no ?? dprToDelete?.dpr_number ?? dprToDelete?.id}? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDprToDelete(null)}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDpr}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DPR View Details Modal */}
      {viewingDpr && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6" style={{ left: sidebarWidth }} onClick={() => setViewingDpr(null)}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
            {/* X - sticky at top right */}
            <button
              onClick={() => { setViewingDpr(null); setDprDetails(null); setEditingDprId(null); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between p-4 pr-14 border-b border-inherit">
              <h2 className={`text-lg font-black ${textPrimary}`}>DPR #{dprDetails?.dpr_no ?? viewingDpr?.dpr_no ?? '-'} - Details</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className={textSecondary}>Date: {formatDprListDate(dprDetails)}</p>
              <p className={textSecondary}>Project: {dprDetails?.projects_id?.project_name ?? viewingDpr?.projects?.project_name ?? '-'}</p>
              <p className={textSecondary}>Subproject: {dprDetails?.sub_projects_id?.name ?? viewingDpr?.sub_projects?.name ?? '-'}</p>
              {(dprDetails?.activities?.length > 0) && <p className={textSecondary}>Activities: {dprDetails.activities.length} item(s)</p>}
              {(dprDetails?.materials?.length > 0) && <p className={textSecondary}>Materials: {dprDetails.materials.length} item(s)</p>}
              {(dprDetails?.labour?.length > 0) && <p className={textSecondary}>Labour: {dprDetails.labour.length} item(s)</p>}
              {(dprDetails?.assets?.length > 0) && <p className={textSecondary}>Assets: {dprDetails.assets.length} item(s)</p>}
              {(dprDetails?.safety?.length > 0) && <p className={textSecondary}>Safety: {dprDetails.safety.length} item(s)</p>}
              {(dprDetails?.hindrance?.length > 0) && <p className={textSecondary}>Hindrance: {dprDetails.hindrance.length} item(s)</p>}
              {viewingDpr && (
                <button
                  onClick={() => {
                    setViewingDpr(null);
                    setDprDetails(null);
                    handleEditDpr(viewingDpr);
                  }}
                  className={`mt-2 px-4 py-2 rounded-lg font-bold ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642] hover:bg-[#C2D642]/30' : 'bg-[#C2D642]/10 text-[#C2D642] hover:bg-[#C2D642]/20'}`}
                >
                  Edit
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Selection Modal */}
      {showProjectSelection && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - sticky at top right, stays visible while scrolling */}
            <button
              onClick={() => { setProjectSearchQuery(''); resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={projectModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {/* Header + Search - scrolls up with content, user scrolls to see */}
            <div ref={projectModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
              {/* Modal Header */}
              <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                <div className="min-w-0 flex-1">
                  <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select a Project</h2>
                  <p className={`text-sm ${textSecondary} mt-1`}>Choose a project to create a new DPR</p>
                </div>
              </div>
              {/* Search and Create New */}
              <div className="p-4 sm:p-6 flex flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="relative flex-1 min-w-0">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  />
                </div>
                <button
                  onClick={handleCreateNewProject}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                </button>
              </div>
            </div>

            {/* Projects Grid - starts from top, takes full space */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col min-h-0">
              {filteredProjects.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {paginatedProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`rounded-xl border ${cardClass} p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                        isDark ? 'hover:border-[#C2D642]/50' : 'hover:border-[#C2D642]/30'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 mb-3 flex-shrink-0 group-hover:border-[#C2D642]/50 transition-colors`}>
                          <img 
                            src={getLogoUrl(project.logo, project.name, 'C2D642')} 
                            alt={project.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=C2D642&color=fff&size=128`;
                            }}
                          />
                        </div>
                        <h3 className={`text-base font-black ${textPrimary} mb-1 group-hover:text-[#C2D642] transition-colors`}>{project.name}</h3>
                        {project.code && (
                          <p className={`text-xs ${textSecondary} mb-1`}>Code: {project.code}</p>
                        )}
                        {project.company && (
                          <p className={`text-xs ${textSecondary}`}>{project.company}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar currentPage={projectPage} totalItems={filteredProjects.length} onPageChange={setProjectPage} />
                </>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No projects found</h3>
                  <p className={`text-sm ${textSecondary} mb-4`}>
                    {projectSearchQuery ? 'Try a different search term' : 'Create a new project to get started'}
                  </p>
                  <button
                    onClick={handleCreateNewProject}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap mx-auto ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" /> Create New Project
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Subproject Selection Modal */}
      {showSubprojectSelection && selectedProject && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => { setSubprojectSearchQuery(''); resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div
              ref={subprojectModalScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              {/* Header + Search - scrolls up with content, user scrolls to see */}
              <div ref={subprojectModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                {/* Modal Header */}
                <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select One Subproject</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      {subprojects.length > 0
                        ? <>Please select a subproject for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span></>
                        : <>No subprojects for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>. Create one or click Next to proceed.</>
                      }
                    </p>
                  </div>
                </div>
                {/* Search and Create New */}
                <div className="p-4 sm:p-6 flex flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="relative flex-1 min-w-0">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                    <input
                      type="text"
                      placeholder="Search subprojects..."
                      value={subprojectSearchQuery}
                      onChange={(e) => setSubprojectSearchQuery(e.target.value)}
                      className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                  <button
                    onClick={handleCreateNewSubproject}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                  </button>
                </div>
              </div>

              {/* Subprojects List - starts from top, takes full space */}
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10 flex flex-col min-h-0">
              {isLoadingSubprojects ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading subprojects...</p>
                </div>
              ) : isCreatingDpr ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Creating DPR...</p>
                </div>
              ) : filteredSubprojects.length > 0 ? (
                <>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 ${isCreatingDpr ? 'pointer-events-none opacity-60' : ''}`}>
                  {paginatedSubprojects.map((subproject) => (
                    <div
                      key={subproject.id}
                      onClick={() => !isCreatingDpr && handleSelectSubproject(subproject)}
                      className={`rounded-xl border ${cardClass} p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                        isDark ? 'hover:border-[#C2D642]/50' : 'hover:border-[#C2D642]/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'} flex-shrink-0`}>
                          <Layers className={`w-5 h-5 text-[#C2D642]`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-black ${textPrimary} mb-1 group-hover:text-[#C2D642] transition-colors truncate`}>
                            {subproject.name}
                          </h3>
                          {subproject.code && (
                            <p className={`text-xs ${textSecondary} mb-2`}>Code: {subproject.code}</p>
                          )}
                          {subproject.manager && (
                            <p className={`text-xs ${textSecondary} mb-1`}>Manager: {subproject.manager}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={(subproject.status || 'pending').toLowerCase()}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSubprojectStatusChange(subproject.id, e.target.value);
                              }}
                              className={`px-2 py-1 rounded-full text-xs font-bold cursor-pointer border-0 focus:ring-1 focus:ring-[#C2D642]/50 outline-none ${
                                isDark ? 'bg-slate-700/80 text-slate-100' : 'bg-slate-200/80 text-slate-900'
                              }`}
                            >
                              <option value="closed">Closed</option>
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                              <option value="ongoing">Ongoing</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar currentPage={subprojectPage} totalItems={filteredSubprojects.length} onPageChange={setSubprojectPage} />
                </>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Layers className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No subprojects available</h3>
                  <p className={`text-sm ${textSecondary} mb-6`}>
                    {subprojectSearchQuery 
                      ? 'No subprojects found matching your search' 
                      : `There are no subprojects available for ${selectedProject.name}. You can proceed without selecting a subproject.`}
                  </p>
                  {!subprojectSearchQuery && (
                    <button
                      onClick={handleSkipSubproject}
                      disabled={isCreatingDpr}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      {isCreatingDpr ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Next
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Footer with Back and Next buttons - sticky at bottom. Next only when project has no subprojects. */}
            <div className={`${bgPrimary} flex-shrink-0 shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-4 border-t border-inherit`}>
              <button
                onClick={() => router.back()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                {'<'} Back
              </button>
              {subprojects.length === 0 ? (
                <button
                  onClick={handleSkipSubproject}
                  disabled={isCreatingDpr}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                >
                  {isCreatingDpr ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Next
                </button>
              ) : (
                <p className={`text-sm ${textSecondary}`}>Select a sub-project to proceed</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Selection Modal */}
      {showActivitySelection && selectedProject && (
        <div 
          className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
          style={{ left: sidebarWidth }}
          onClick={(e) => {
            // Prevent closing modal when clicking backdrop
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div 
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full min-w-[320px] max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X - fixed top right corner: edit mode -> DPR list; create flow -> subprojects */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            {/* Single scroll container - header scrolls away, list appears first */}
            <div
              ref={activityModalScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              {/* Header - scrolls up with content, scroll up to see */}
              <div ref={activityModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 lg:p-8 pr-14 sm:pr-16 lg:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Activities</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Activities for <span className="font-bold text-[#C2D642]">{selectedProject?.name}</span>
                      {selectedSubproject ? <><span className="text-slate-500"> – </span><span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></> : ''}
                    </p>
                  </div>
                </div>
                <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pt-6 sm:pb-6 border-b border-inherit">
                  <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        value={activitySearchQuery}
                        onChange={e => setActivitySearchQuery(e.target.value)}
                        placeholder="Search by activity name or unit..."
                        className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={() => router.push(DPR_BASE + '/add-activity')}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                    </button>
                  </div>
                </div>
              </div>

              {/* Activities Table - takes full space, appears first on open */}
              <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-6 sm:pb-8 lg:pb-10">
              {isLoadingActivities ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading activities...</p>
                </div>
              ) : filteredActivities.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px]">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`w-14 pl-4 sm:pl-6 py-3 sm:py-4 text-left ${textSecondary}`}>
                            {(() => {
                              const activitiesOnly = paginatedActivities.filter(n => n.item.type === 'activity');
                              const allActivitiesSelected = activitiesOnly.length > 0 && activitiesOnly.every(n => selectedActivities.has(n.item.id));
                              return (
                                <input
                                  type="checkbox"
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700 accent-[#C2D642]' : 'border-slate-300 bg-white accent-[#C2D642]'} cursor-pointer`}
                                  checked={allActivitiesSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const newMap = new Map(selectedActivities);
                                      activitiesOnly.forEach(n => {
                                        const act = n.item;
                                        newMap.set(act.id, { id: act.id, numericId: act.numericId, name: act.name, unit: act.unit, quantity: 0 });
                                      });
                                      setSelectedActivities(newMap);
                                    } else {
                                      const newMap = new Map(selectedActivities);
                                      activitiesOnly.forEach(n => newMap.delete(n.item.id));
                                      setSelectedActivities(newMap);
                                    }
                                  }}
                                />
                              );
                            })()}
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Activities</th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Est. Qty</th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>% Completion</th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor <span className="text-slate-400 font-normal text-[10px]">(Optional)</span></th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Upload Image <span className="text-slate-400 font-normal text-[10px]">(Optional)</span></th>
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks <span className="text-slate-400 font-normal text-[10px]">(Optional)</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {paginatedActivities.map((node, idx) => {
                          const activity = node.item;
                          const isHeading = activity.type === 'heading';
                          const isSelected = !isHeading && selectedActivities.has(activity.id);
                          const selectedActivity = selectedActivities.get(activity.id);
                          return (
                            <tr 
                              key={activity.id} 
                              onClick={() => !isHeading && handleToggleActivity(activity)}
                              className={`transition-colors cursor-pointer ${
                                isHeading
                                  ? isDark
                                    ? 'bg-[#4a5d23]'
                                    : 'bg-[#C2D642]/20'
                                  : isSelected
                                    ? isDark
                                      ? 'bg-[#C2D642]/10 hover:bg-[#C2D642]/15'
                                      : 'bg-[#C2D642]/5 hover:bg-[#C2D642]/10'
                                    : isDark
                                      ? 'bg-slate-800/50 hover:bg-slate-800/70'
                                      : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <td className="w-14 pl-6 py-4 align-middle" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-start">
                                  {isHeading ? (
                                    <span className="w-4 h-4 block" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleActivity(activity)}
                                      className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700 accent-[#C2D642]' : 'border-slate-300 bg-white accent-[#C2D642]'} cursor-pointer`}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>{node.srNo}</td>
                              <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${isHeading ? 'font-extrabold' : ''}`}>
                                <span>{activity.name}</span>
                                {isHeading && (
                                  <span className="ml-2 text-xs font-medium italic text-emerald-400">(Heading)</span>
                                )}
                              </td>
                              <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>{isHeading ? '-' : (activity.unit || '-')}</td>
                              <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>
                                {isHeading ? <span className={`text-sm ${textSecondary}`}>-</span> : (activity.qty != null ? String(activity.qty) : '-')}
                              </td>
                              <td className="px-4 py-4 align-middle" onClick={e => e.stopPropagation()}>
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `act-${activity.id}` && (selectedActivity?.quantity ?? 0) === 0 ? '' : (selectedActivity?.quantity ?? 0)}
                                    onChange={(e) => handleQuantityChange(activity.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`act-${activity.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected && (activity.qty ?? 0) > 0 ? (
                                  <span>{Math.round(((selectedActivity?.quantity ?? 0) / (activity.qty ?? 1)) * 100)}%</span>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle" onClick={e => e.stopPropagation()}>
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected ? (
                                  <select
                                    value={selectedActivity?.contractor || ''}
                                    onChange={(e) => handleContractorChange(activity.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle" onClick={e => e.stopPropagation()}>
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {selectedActivity?.images && selectedActivity.images.length > 0 && (
                                      <div key="img" className="relative group">
                                        <img
                                          src={selectedActivity.images[0]}
                                          alt="Activity"
                                          className="w-16 h-16 object-cover rounded-lg border border-inherit"
                                        />
                                        <button
                                          onClick={() => handleRemoveImage(activity.id, 0)}
                                          className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    {(!selectedActivity?.images || selectedActivity.images.length === 0) && (
                                      <label htmlFor={`image-upload-${activity.id}`} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-sm font-bold border-2 border-dashed transition-all shrink-0 ${
                                        isDark 
                                          ? 'border-slate-600 hover:border-[#C2D642] text-slate-300 hover:text-[#C2D642]' 
                                          : 'border-slate-300 hover:border-[#C2D642] text-slate-600 hover:text-[#C2D642]'
                                      }`}>
                                        <Upload className="w-4 h-4" />
                                        <span>Upload</span>
                                        <input
                                          id={`image-upload-${activity.id}`}
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            handleImageUpload(activity.id, e.target.files);
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle" onClick={e => e.stopPropagation()}>
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected ? (
                                  <textarea
                                    value={selectedActivity?.remarks || ''}
                                    onChange={(e) => handleRemarksChange(activity.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar currentPage={activityPage} totalItems={filteredActivities.length} onPageChange={setActivityPage} />
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Activity className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No activities available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {activitySearchQuery ? 'No activities found matching your search.' : `There are no activities available for ${selectedSubproject?.name ?? 'the selected subproject'}. Please create activities first.`}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex flex-row items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                type="button"
                onClick={() => router.back()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <button
                type="button"
                onClick={handleActivitySelectionNext}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                disabled={selectedActivities.size === 0 || isSubmittingActivities}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedActivities.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                {isSubmittingActivities ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Selection Modal */}
      {showMaterialSelection && selectedProject && (
        <div 
          className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden"
          style={{ left: sidebarWidth }}
          onClick={(e) => {
            if (e.target === e.currentTarget) { e.preventDefault(); e.stopPropagation(); }
          }}
        >
          <div 
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X - fixed top right corner: edit mode -> DPR list; create flow -> activities */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={materialModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={materialModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Materials Used</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select materials for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>
                      {selectedSubproject ? <><span className="text-slate-500"> - </span><span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></> : ''}
                    </p>
                  </div>
                </div>
                <div className="px-4 sm:px-6 pt-4 pb-4 sm:pt-6 sm:pb-6 border-b border-inherit">
                  <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        value={materialSearchQuery}
                        onChange={e => setMaterialSearchQuery(e.target.value)}
                        placeholder="Search by class, code, name, specification, or unit..."
                        className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateMaterialModal(true)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
              {isLoadingMaterials ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading materials from Masters...</p>
                </div>
              ) : filteredMaterials.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={paginatedMaterials.length > 0 && paginatedMaterials.every(mat => selectedMaterials.has(mat.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map(selectedMaterials);
                                  paginatedMaterials.forEach(mat => {
                                    newMap.set(mat.id, {
                                      id: mat.id,
                                      numericId: mat.numericId ?? (Number.isFinite(Number(mat.id)) ? Number(mat.id) : undefined),
                                      class: mat.class,
                                      code: mat.code,
                                      name: mat.name,
                                      specification: mat.specification,
                                      unit: mat.unit,
                                      quantity: 0
                                    });
                                  });
                                  setSelectedMaterials(newMap);
                                } else {
                                  const newMap = new Map(selectedMaterials);
                                  paginatedMaterials.forEach(mat => newMap.delete(mat.id));
                                  setSelectedMaterials(newMap);
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Class</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Material Code</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Material Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {paginatedMaterials.map((material, idx) => {
                          const isSelected = selectedMaterials.has(material.id);
                          const selectedMaterial = selectedMaterials.get(material.id);
                          return (
                            <tr 
                              key={material.id} 
                              onClick={() => handleToggleMaterial(material)}
                              className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleMaterial(material)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.class}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.code}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.specification || '-'}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.unit}</td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `mat-${material.id}` && (selectedMaterial?.quantity ?? 0) === 0 ? '' : (selectedMaterial?.quantity ?? 0)}
                                    onChange={(e) => handleMaterialQuantityChange(material.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`mat-${material.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <select
                                    value={selectedMaterial?.activity || ''}
                                    onChange={(e) => handleMaterialActivityChange(material.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <textarea
                                    value={selectedMaterial?.remarks || ''}
                                    onChange={(e) => handleMaterialRemarksChange(material.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar currentPage={materialsPage} totalItems={filteredMaterials.length} onPageChange={setMaterialsPage} />
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No materials available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {materialSearchQuery ? 'No materials found matching your search.' : 'There are no materials in Masters. Please create materials in Masters > Materials first.'}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <button
                onClick={handleMaterialSelectionNext}
                disabled={isSubmittingMaterials}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
              >
                {isSubmittingMaterials ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labour Selection Modal */}
      {showLabourSelection && selectedProject && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div             className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={labourModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={labourModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Labours</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select labours for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>
                      {selectedSubproject ? <><span className="text-slate-500"> - </span><span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></> : ''}
                    </p>
                  </div>
                </div>
                <div className="px-4 sm:px-6 pt-4 pb-4 sm:pt-6 sm:pb-6 border-b border-inherit">
                  <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        value={labourSearchQuery}
                        onChange={e => setLabourSearchQuery(e.target.value)}
                        placeholder="Search by name, type, or category..."
                        className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateLabourModal(true)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
              {isLoadingLabours ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading labours from Masters...</p>
                </div>
              ) : filteredLabours.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={paginatedLabours.length > 0 && paginatedLabours.every(lab => selectedLabours.has(lab.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map(selectedLabours);
                                  paginatedLabours.forEach(lab => {
                                    newMap.set(lab.id, {
                                      id: lab.id,
                                      numericId: lab.numericId,
                                      type: lab.type,
                                      category: lab.category,
                                      quantity: 0,
                                      overtimeQuantity: 0,
                                      ratePerUnit: 0
                                    });
                                  });
                                  setSelectedLabours(newMap);
                                } else {
                                  const newMap = new Map(selectedLabours);
                                  paginatedLabours.forEach(lab => newMap.delete(lab.id));
                                  setSelectedLabours(newMap);
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Category</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Overtime Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate Per Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {paginatedLabours.map((labour, idx) => {
                          const isSelected = selectedLabours.has(labour.id);
                          const selectedLabour = selectedLabours.get(labour.id);
                          return (
                            <tr 
                              key={labour.id} 
                              onClick={() => handleToggleLabour(labour)}
                              className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleLabour(labour)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.category}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.unit}</td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `lab-qty-${labour.id}` && (selectedLabour?.quantity ?? 0) === 0 ? '' : (selectedLabour?.quantity ?? 0)}
                                    onChange={(e) => handleLabourQuantityChange(labour.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`lab-qty-${labour.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `lab-ot-${labour.id}` && (selectedLabour?.overtimeQuantity ?? 0) === 0 ? '' : (selectedLabour?.overtimeQuantity ?? 0)}
                                    onChange={(e) => handleLabourOvertimeQuantityChange(labour.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`lab-ot-${labour.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <select
                                    value={selectedLabour?.activity || ''}
                                    onChange={(e) => handleLabourActivityChange(labour.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <select
                                    value={selectedLabour?.contractor || ''}
                                    onChange={(e) => handleLabourContractorChange(labour.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `lab-rate-${labour.id}` && (selectedLabour?.ratePerUnit ?? 0) === 0 ? '' : (selectedLabour?.ratePerUnit ?? 0)}
                                    onChange={(e) => handleLabourRateChange(labour.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`lab-rate-${labour.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <textarea
                                    value={selectedLabour?.remarks || ''}
                                    onChange={(e) => handleLabourRemarksChange(labour.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar currentPage={laboursPage} totalItems={filteredLabours.length} onPageChange={setLaboursPage} />
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No labours available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {labourSearchQuery ? 'No labours found matching your search.' : 'There are no labours available. Please create labours first.'}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <button
                onClick={handleLabourSelectionNext}
                disabled={isSubmittingLabour}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
              >
                {isSubmittingLabour ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Selection Modal */}
      {showAssetSelection && selectedProject && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={assetModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={assetModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Machines/Assets</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select machines/assets for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>
                      {selectedSubproject ? <><span className="text-slate-500"> - </span><span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></> : ''}
                    </p>
                  </div>
                </div>
                <div className="px-4 sm:px-6 pt-4 pb-4 sm:pt-6 sm:pb-6 border-b border-inherit">
                  <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        placeholder="Search by code, name, specification, or unit..."
                        className={`w-full pl-12 pr-5 py-3.5 rounded-lg text-sm font-bold border ${
                          isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                        } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateAssetModal(true)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" /> Create New
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
              {isLoadingAssets ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading assets from Masters...</p>
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={paginatedAssets.length > 0 && paginatedAssets.every(asset => selectedAssets.has(asset.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map(selectedAssets);
                                  paginatedAssets.forEach(asset => {
                                    newMap.set(asset.id, {
                                      id: asset.id,
                                      numericId: asset.numericId,
                                      code: asset.code,
                                      name: asset.name,
                                      quantity: 0,
                                      ratePerUnit: 0
                                    });
                                  });
                                  setSelectedAssets(newMap);
                                } else {
                                  const newMap = new Map(selectedAssets);
                                  paginatedAssets.forEach(asset => newMap.delete(asset.id));
                                  setSelectedAssets(newMap);
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate Per Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {paginatedAssets.map((asset) => {
                          const isSelected = selectedAssets.has(asset.id);
                          const selectedAsset = selectedAssets.get(asset.id);
                          return (
                            <tr 
                              key={asset.id} 
                              onClick={() => handleToggleAsset(asset)}
                              className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleAsset(asset)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.code}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.specification || '-'}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.unit}</td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `ast-qty-${asset.id}` && (selectedAsset?.quantity ?? 0) === 0 ? '' : (selectedAsset?.quantity ?? 0)}
                                    onChange={(e) => handleAssetQuantityChange(asset.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`ast-qty-${asset.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <select
                                    value={selectedAsset?.activity || ''}
                                    onChange={(e) => handleAssetActivityChange(asset.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <select
                                    value={selectedAsset?.contractor || ''}
                                    onChange={(e) => handleAssetContractorChange(asset.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={focusedQuantityField === `ast-rate-${asset.id}` && (selectedAsset?.ratePerUnit ?? 0) === 0 ? '' : (selectedAsset?.ratePerUnit ?? 0)}
                                    onChange={(e) => handleAssetRateChange(asset.id, parseFloat(e.target.value) || 0)}
                                    onFocus={() => setFocusedQuantityField(`ast-rate-${asset.id}`)}
                                    onBlur={() => setFocusedQuantityField(null)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder=""
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {isSelected ? (
                                  <textarea
                                    value={selectedAsset?.remarks || ''}
                                    onChange={(e) => handleAssetRemarksChange(asset.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar currentPage={assetPage} totalItems={filteredAssets.length} onPageChange={setAssetPage} />
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No assets available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {assetSearchQuery 
                      ? 'No assets found matching your search' 
                      : 'There are no assets available. Please create assets first.'}
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <button
                onClick={handleAssetSelectionNext}
                disabled={isSubmittingAssets}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
              >
                {isSubmittingAssets ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Selection Modal */}
      {showSafetySelection && selectedProject && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner: edit mode -> DPR list; create flow -> assets */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={safetyModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={safetyModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Safety</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Report safety issues and concerns for <span className="font-bold text-[#C2D642]">{selectedProject?.name}</span>
                      {selectedSubproject && <> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={handleAddSafetyEntry}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" /> Add New
                  </button>
                </div>
              </div>
              <div className="px-6 pt-6 pb-8">
              {isLoadingSafety ? (
                <div className={`flex items-center justify-center py-12 ${textSecondary}`}>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 font-bold">Loading safety list...</span>
                </div>
              ) : (
              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Safety Problem Details</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Team Member</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedSafetyEntries.map((entry, index) => (
                        <React.Fragment key={entry.id}>
                          <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{(safetyPage - 1) * PAGE_SIZE + index + 1}</td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={entry.details || ''}
                                onChange={(e) => handleSafetyEntryDetailsChange(entry.id, e.target.value)}
                                placeholder="Enter details (optional)"
                                className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                  isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'
                                } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <TeamMembersDropdown
                                mode="single"
                                teamMembers={teamMembers}
                                value={entry.company_users_id || ''}
                                onChange={(companyUsersId) => handleSafetyEntryCompanyUserChange(entry.id, companyUsersId)}
                                isDark={isDark}
                                placeholder="Select team member"
                                apiDisplay={
                                  entry.company_users_id ? null : entry.companyUserDisplay ?? null
                                }
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                value={entry.remarks || ''}
                                onChange={(e) => handleSafetyEntryRemarksChange(entry.id, e.target.value)}
                                placeholder="Remarks (optional)"
                                rows={2}
                                className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleRemoveSafetyEntry(entry.id)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`} title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          <tr className={isDark ? 'bg-slate-800/20' : 'bg-slate-50/50'}>
                            <td colSpan={5} className="px-6 py-3 border-t-0">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className={`text-xs font-bold ${textSecondary} mr-2`}>Images:</span>
                                {(entry.images || (entry.image ? [entry.image] : [])).length > 0 ? (
                                  <div className="relative flex-shrink-0">
                                    <img src={(entry.images || (entry.image ? [entry.image] : []))[0]} alt="Safety" className="w-14 h-14 object-cover rounded-lg border border-inherit" />
                                    <button onClick={() => handleSafetyEntryRemoveImage(entry.id, 0)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600" title="Remove">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer flex-shrink-0">
                                    <input type="file" accept="image/*" onChange={(e) => handleSafetyEntryImageUpload(entry.id, e)} className="hidden" />
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed w-fit ${isDark ? 'border-slate-600 hover:border-[#C2D642] text-slate-400' : 'border-slate-300 hover:border-[#C2D642] text-slate-600'}`}>
                                      <Upload className="w-4 h-4" /><span className="text-xs font-bold">Add</span>
                                    </div>
                                  </label>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {safetyEntries.length > 0 && <PaginationBar currentPage={safetyPage} totalItems={safetyEntries.length} onPageChange={setSafetyPage} />}
              </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSafetySkip}
                  disabled={isSubmittingSafety}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleSafetyNext}
                  disabled={isSubmittingSafety}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md disabled:opacity-50`}
                >
                  {isSubmittingSafety ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hindrance Selection Modal */}
      {showHindranceSelection && selectedProject && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-5rem)] max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner: edit mode -> DPR list; create flow -> safety */}
            <button
              onClick={() => { resetDPRForm(); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={hindranceModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={hindranceModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Hindrance</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Report hindrances affecting progress for <span className="font-bold text-[#C2D642]">{selectedProject?.name}</span>
                      {selectedSubproject && <> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={handleAddHindranceEntry}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 w-fit ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" /> Add New
                  </button>
                </div>
              </div>
              <div className="px-6 pt-6 pb-8">
              {isLoadingHindrance ? (
                <div className={`flex items-center gap-2 py-8 ${textSecondary}`}>
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  <span className="font-bold">Loading hinderance list...</span>
                </div>
              ) : (
              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Hindrance Problem Details</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Team Member</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedHindranceEntries.map((entry, index) => (
                        <React.Fragment key={entry.id}>
                          <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{(hindrancePage - 1) * PAGE_SIZE + index + 1}</td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={entry.details || ''}
                                onChange={(e) => handleHindranceEntryDetailsChange(entry.id, e.target.value)}
                                placeholder="Enter details (optional)"
                                className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <TeamMembersDropdown
                                mode="single"
                                teamMembers={teamMembers}
                                value={entry.company_users_id || ''}
                                onChange={(companyUsersId) => handleHindranceEntryCompanyUserChange(entry.id, companyUsersId)}
                                isDark={isDark}
                                placeholder="Select team member"
                                apiDisplay={
                                  entry.company_users_id ? null : entry.companyUserDisplay ?? null
                                }
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                value={entry.remarks || ''}
                                onChange={(e) => handleHindranceEntryRemarksChange(entry.id, e.target.value)}
                                placeholder="Remarks (optional)"
                                rows={2}
                                className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleRemoveHindranceEntry(entry.id)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`} title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          <tr className={isDark ? 'bg-slate-800/20' : 'bg-slate-50/50'}>
                            <td colSpan={5} className="px-6 py-3 border-t-0">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className={`text-xs font-bold ${textSecondary} mr-2`}>Images:</span>
                                {(entry.images || (entry.image ? [entry.image] : [])).length > 0 ? (
                                  <div className="relative flex-shrink-0">
                                    <img src={(entry.images || (entry.image ? [entry.image] : []))[0]} alt="Hindrance" className="w-14 h-14 object-cover rounded-lg border border-inherit" />
                                    <button onClick={() => handleHindranceEntryRemoveImage(entry.id, 0)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600" title="Remove">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer flex-shrink-0">
                                    <input type="file" accept="image/*" onChange={(e) => handleHindranceEntryImageUpload(entry.id, e)} className="hidden" />
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed w-fit ${isDark ? 'border-slate-600 hover:border-[#C2D642] text-slate-400' : 'border-slate-300 hover:border-[#C2D642] text-slate-600'}`}>
                                      <Upload className="w-4 h-4" /><span className="text-xs font-bold">Add</span>
                                    </div>
                                  </label>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hindranceEntries.length > 0 && <PaginationBar currentPage={hindrancePage} totalItems={hindranceEntries.length} onPageChange={setHindrancePage} />}
              </div>
              )}
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                {'<'} Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHindranceSkip}
                  disabled={isSubmittingHindrance}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleHindranceNext}
                  disabled={isSubmittingHindrance}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md disabled:opacity-50`}
                >
                  {isSubmittingHindrance ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPR Complete Modal */}
      {showDPRComplete && (
        <div className="fixed top-0 right-0 bottom-0 bg-black/50 z-[60] flex items-center justify-center p-2 sm:p-4 overflow-y-auto" style={{ left: sidebarWidth }}>
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-lg overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={resetDPRForm}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            {/* Modal Header */}
            <div className="p-6 pr-16 sm:pr-20 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>DPR Complete</h2>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
              }`}>
                <CheckCircle className={`w-12 h-12 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
              </div>
              <h3 className={`text-2xl font-black mb-3 ${textPrimary}`}>
                Your DPR is Ready!
              </h3>
              <p className={`text-sm mb-8 ${textSecondary}`}>
                Your Daily Progress Report has been successfully created. View the DPR or download the PDF.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleViewCompletedDpr}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-bold transition-all ${
                    isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  View DPR
                </button>
                <button
                  onClick={handleDownloadDPR}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-inherit">
              <button
                onClick={handleCreateNewDPR}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark ? 'bg-[#C2D642]/20 hover:bg-[#C2D642]/30 text-[#C2D642] border border-[#C2D642]/40' : 'bg-[#C2D642]/10 hover:bg-[#C2D642]/20 text-[#C2D642] border border-[#C2D642]/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                Create Another DPR
              </button>
              <button
                onClick={resetDPRForm}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Activity Modal - uses projects/subprojects for user-associated data */}
      <CreateActivityModal
        theme={theme}
        isOpen={showCreateActivityModal}
        onClose={() => {
          if (pathname?.endsWith('/add-activity')) {
            router.push(DPR_BASE + '/activities');
          } else {
            setShowCreateActivityModal(false);
          }
        }}
        onSuccess={() => {
          if (pathname?.endsWith('/add-activity')) {
            router.push(DPR_BASE + '/activities');
          } else {
            setShowCreateActivityModal(false);
          }
          setActivitiesRefreshKey(k => k + 1); // Refetch activities from API
        }}
        onActivityCreated={handleActivityCreated}
        activities={activities}
        projects={projects.map(p => ({ id: (p.numericId ?? Number(p.id)) || 0, uuid: p.id, project_name: p.name }))}
        subprojects={subprojects.map(s => ({ id: (s.numericId ?? Number(s.id)) || 0, uuid: s.id, name: s.name, project_id: selectedProject?.numericId }))}
        defaultProjectId={selectedProject?.id || ''}
        defaultSubprojectId={selectedSubproject?.id || ''}
        projectName={selectedProject?.name || ''}
        subprojectName={selectedSubproject?.name || ''}
      />

      {/* Create Material Modal */}
      <CreateMaterialModal
        theme={theme}
        isOpen={showCreateMaterialModal}
        onClose={() => setShowCreateMaterialModal(false)}
        onSuccess={() => {
          setShowCreateMaterialModal(false);
          setMaterialsRefreshKey(k => k + 1); // Refetch from Masters API
        }}
      />

      {/* Create Labour Modal */}
      <CreateLabourModal
        theme={theme}
        isOpen={showCreateLabourModal}
        onClose={() => setShowCreateLabourModal(false)}
        onSuccess={(createdLabour?: any) => {
          setShowCreateLabourModal(false);
          setLaboursRefreshKey(prev => prev + 1);
          if (createdLabour && (createdLabour.id != null || createdLabour.uuid)) {
            const cat = (createdLabour.category || '').toLowerCase();
            const categoryMap: Record<string, string> = { skilled: 'Skilled', semiskilled: 'Semi Skilled', unskilled: 'Unskilled' };
            const category = categoryMap[cat] || createdLabour.category || 'Skilled';
            const unitLabel = createdLabour.unit?.unit || createdLabour.unit || 'Nos';
            setLabours(prev => {
              const id = createdLabour.uuid || String(createdLabour.id);
              if (prev.some(l => l.id === id || String(l.numericId) === String(createdLabour.id))) return prev;
              return [{
                id,
                numericId: Number(createdLabour.id),
                name: createdLabour.name || '',
                type: createdLabour.name || '',
                category,
                unit: unitLabel,
                createdAt: createdLabour.created_at
              }, ...prev];
            });
          }
        }}
      />

      {/* Create Asset Modal */}
      <CreateAssetEquipmentModal
        theme={theme}
        isOpen={showCreateAssetModal}
        onClose={() => setShowCreateAssetModal(false)}
        onSuccess={() => {
          setShowCreateAssetModal(false);
          setAssetsRefreshKey(prev => prev + 1);
        }}
      />

      {/* Create Project Modal - stays in DPR, refreshes project list on success */}
      <CreateProjectModal
        theme={theme}
        isOpen={showCreateProjectModal}
        onClose={() => {
          if (pathname?.endsWith('/add-project')) router.push(`${DPR_BASE}/projects`);
          else setShowCreateProjectModal(false);
        }}
        onSuccess={() => {
          setProjectRefreshKey(k => k + 1);
          if (pathname?.endsWith('/add-project')) router.push(`${DPR_BASE}/projects`);
          else setShowCreateProjectModal(false);
        }}
        defaultProjects={[]}
        userProjects={[]}
      />

      {/* Create Subproject Modal - fetches user projects via API (uses auth token) */}
      <CreateSubprojectModal
        theme={theme}
        isOpen={showCreateSubprojectModal}
        onClose={() => setShowCreateSubprojectModal(false)}
        onSuccess={() => setShowCreateSubprojectModal(false)}
        onSubprojectCreated={handleSubprojectCreated}
        defaultProjectId={selectedProject?.id || ''}
        defaultProjectName={selectedProject?.name || ''}
      />
    </div>
  );
};

export default DPR;
