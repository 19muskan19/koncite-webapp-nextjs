'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
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
  CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import CreateSubprojectModal from '../masters/Modals/CreateSubprojectModal';
import CreateActivityModal from '../masters/Modals/CreateActivityModal';
import CreateMaterialModal from '../masters/Modals/CreateMaterialModal';
import CreateLabourModal from '../masters/Modals/CreateLabourModal';
import CreateAssetEquipmentModal from '../masters/Modals/CreateAssetEquipmentModal';
import TeamMembersDropdown from './TeamMembersDropdown';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { masterDataAPI, teamsAPI, safetyAPI, dprAPI } from '../../services/api';

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
  name: string;
  unit?: string;
  quantity: number;
  contractor?: string;
  images?: string[];
  remarks?: string;
}

interface Contractor {
  id: string;
  name: string;
  type: 'contractor' | 'supplier' | 'both';
}

interface Labour {
  id: string;
  name: string;
  type: string;
  category: string;
  createdAt?: string;
}

interface Material {
  id: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface SelectedMaterial {
  id: string;
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
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface SelectedAsset {
  id: string;
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
  teamMembers?: string[];
  remarks?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface HindranceEntry {
  id: string;
  details?: string;
  image?: string; // legacy single - normalized to images when loading
  images?: string[];
  teamMembers?: string[];
  remarks?: string;
}

interface SelectedLabour {
  id: string;
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

const DPR: React.FC<DPRProps> = ({ theme }) => {
  const { isAuthenticated } = useUser();
  const toast = useToast();
  const [showProjectSelection, setShowProjectSelection] = useState<boolean>(false);
  const [showSubprojectSelection, setShowSubprojectSelection] = useState<boolean>(false);
  const [showActivitySelection, setShowActivitySelection] = useState<boolean>(false);
  const [showMaterialSelection, setShowMaterialSelection] = useState<boolean>(false);
  const [showLabourSelection, setShowLabourSelection] = useState<boolean>(false);
  const [showAssetSelection, setShowAssetSelection] = useState<boolean>(false);
  const [showSafetySelection, setShowSafetySelection] = useState<boolean>(false);
  const [showHindranceSelection, setShowHindranceSelection] = useState<boolean>(false);
  const [showDPRComplete, setShowDPRComplete] = useState<boolean>(false);
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
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [hindranceEntries, setHindranceEntries] = useState<HindranceEntry[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [labourSearchQuery, setLabourSearchQuery] = useState<string>('');
  const [safetyEntries, setSafetyEntries] = useState<SafetyEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingSafety, setIsLoadingSafety] = useState<boolean>(false);
  const [dprList, setDprList] = useState<any[]>([]);
  const [isLoadingDprList, setIsLoadingDprList] = useState<boolean>(false);

  // Pagination state per sector (reset when modal/search changes)
  const [projectPage, setProjectPage] = useState(1);
  const [subprojectPage, setSubprojectPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [laboursPage, setLaboursPage] = useState(1);
  const [assetPage, setAssetPage] = useState(1);
  const [safetyPage, setSafetyPage] = useState(1);
  const [hindrancePage, setHindrancePage] = useState(1);

  // When focused and value is 0, show empty so user can type without deleting
  const [focusedQuantityField, setFocusedQuantityField] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Reusable pagination controls
  const PaginationBar = ({ currentPage, totalItems, onPageChange }: { currentPage: number; totalItems: number; onPageChange: (page: number) => void }) => {
    if (totalItems === 0) return null;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalItems);
    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-3 border-t border-inherit ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
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

  // Load projects from API (user-associated projects)
  useEffect(() => {
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
        console.log('📡 Fetching user-associated projects from API...');
        const fetchedProjects = await masterDataAPI.getProjects();
        console.log('✅ Fetched projects from API:', fetchedProjects?.length || 0);

        if (!Array.isArray(fetchedProjects)) {
          console.error('❌ API did not return an array:', fetchedProjects);
          setProjects([]);
          return;
        }

        // Transform API response to match DPR Project interface
        const transformedProjects: Project[] = fetchedProjects.map((p: any) => {
          const numericId = p.id;
          const uuid = p.uuid;
          const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
          
          return {
            id: uuid || String(numericId),
            numericId: Number.isFinite(Number(numericId)) ? Number(numericId) : undefined,
            name: p.project_name || p.name || '',
            logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name || p.name || '')}&background=C2D642&color=fff&size=128`,
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
  }, []); // Empty dependency array - check auth inside the effect and listen to events

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
  const transformSubproject = (sub: any, projectName: string): Subproject => ({
    id: sub.uuid || String(sub.id),
    numericId: Number.isFinite(Number(sub.id)) ? Number(sub.id) : undefined,
    name: sub.name || sub.subproject_name || '',
    code: sub.code || `SUB${String(sub.id || '').padStart(3, '0')}`,
    project: projectName,
    manager: sub.manager || sub.project_manager || '',
    status: sub.status || 'Pending',
    progress: sub.progress || 0,
    startDate: sub.start_date || sub.planned_start_date || sub.startDate || '',
    endDate: sub.end_date || sub.planned_end_date || sub.endDate || ''
  });

  // Fetch subprojects when project is selected - try numeric ID first, then UUID
  useEffect(() => {
    if (!selectedProject) {
      setSubprojects([]);
      return;
    }

    const fetchSubprojects = async () => {
      setIsLoadingSubprojects(true);
      setSubprojectSearchQuery('');
      try {
        // Prefer numeric ID - backend /project-subproject and /sub-project-list expect project_id
        const projectId = selectedProject.numericId ?? selectedProject.id;
        const result = await masterDataAPI.getSubprojects(projectId);
        const res = result as any;
        const list = Array.isArray(result) ? result : res?.subProject ?? res?.data ?? [];
        const transformed = list.map((sub: any) => transformSubproject(sub, selectedProject.name));
        setSubprojects(transformed);
      } catch {
        setSubprojects([]);
      } finally {
        setIsLoadingSubprojects(false);
      }
    };

    fetchSubprojects();
  }, [selectedProject, subprojectRefreshKey]);

  // Search subprojects when user types - POST /project-wise-subproject-search
  useEffect(() => {
    if (!selectedProject || !subprojectSearchQuery.trim()) {
      setSubprojectsSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const projectId = selectedProject.numericId ?? selectedProject.id;
        const result = await masterDataAPI.projectWiseSubprojectSearch({
          project_id: projectId,
          search_keyword: subprojectSearchQuery.trim()
        });
        const list = Array.isArray(result) ? result : [];
        const transformed = list.map((sub: any) => transformSubproject(sub, selectedProject.name));
        setSubprojectsSearchResults(transformed);
      } catch {
        setSubprojectsSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedProject, subprojectSearchQuery]);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const query = projectSearchQuery.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.code?.toLowerCase().includes(query) ||
      project.company?.toLowerCase().includes(query)
    );
  }, [projects, projectSearchQuery]);

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
    setShowProjectSelection(true);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectSelection(false);
    setShowSubprojectSelection(true);
    setProjectSearchQuery('');
    setSubprojectSearchQuery('');
  };

  const handleSubprojectStatusChange = (subprojectId: string, newStatus: string) => {
    setSubprojects(prev => prev.map(s => s.id === subprojectId ? { ...s, status: newStatus } : s));
    setSubprojectsSearchResults(prev => prev.map(s => s.id === subprojectId ? { ...s, status: newStatus } : s));
  };

  const handleSelectSubproject = (subproject: Subproject) => {
    setSelectedSubproject(subproject);
    setShowSubprojectSelection(false);
    setShowActivitySelection(true);
    setSubprojectSearchQuery('');
  };

  const handleSkipSubproject = () => {
    // Set a placeholder subproject or null to allow proceeding without subproject
    setSelectedSubproject(null);
    setShowSubprojectSelection(false);
    setShowActivitySelection(true);
    setSubprojectSearchQuery('');
  };

  const resetDPRForm = () => {
    setShowProjectSelection(false);
    setShowSubprojectSelection(false);
    setShowActivitySelection(false);
    setShowMaterialSelection(false);
    setShowLabourSelection(false);
    setShowAssetSelection(false);
    setShowSafetySelection(false);
    setShowHindranceSelection(false);
    setShowDPRComplete(false);
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

  // Load contractors from vendors API (supplierContractorList with type 'contractor')
  // Backend returns vendors where type is 'contractor' OR 'both' - associated with user's company
  useEffect(() => {
    if (!showActivitySelection || !isAuthenticated) {
      return;
    }

    const fetchContractors = async () => {
      try {
        const data = await masterDataAPI.getSupplierContractorList('contractor');
        const list = Array.isArray(data) ? data : [];
        const contractorList: Contractor[] = list.map((v: any) => ({
          id: v.uuid || String(v.id),
          name: v.name || '',
          type: v.type || 'contractor'
        }));
        setContractors(contractorList);
      } catch (err) {
        console.error('Failed to fetch contractors:', err);
        setContractors([]);
      }
    };

    fetchContractors();
  }, [showActivitySelection, isAuthenticated]);

  // Load activities from API (same as /masters/activities) when Select Activities modal opens
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesRefreshKey, setActivitiesRefreshKey] = useState(0);

  useEffect(() => {
    if (!showActivitySelection || !selectedProject) {
      setActivities([]);
      return;
    }

    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const projectId = selectedProject.numericId ?? selectedProject.id;
        const subprojectId = selectedSubproject?.numericId ?? selectedSubproject?.id;
        const { data } = await masterDataAPI.getActivities(projectId, subprojectId);
        const raw = Array.isArray(data) ? data : [];
        const getUnitName = (a: any) => {
          const fromApi = a.units?.unit || a.units?.name || a.unit?.unit || a.unit?.name || (typeof a.unit === 'string' ? a.unit : '');
          if (fromApi) return fromApi;
          return '';
        };
        const transformed: ActivityItem[] = raw.map((a: any) => {
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
        setActivities(transformed);
      } catch {
        setActivities([]);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [showActivitySelection, selectedProject, selectedSubproject, activitiesRefreshKey]);

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

    const imagePromises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(imageDataUrls => {
      setSelectedActivities(prev => {
        const newMap = new Map(prev);
        const activity = newMap.get(activityId);
        if (activity) {
          const currentImages = activity.images || [];
          newMap.set(activityId, { 
            ...activity, 
            images: [...currentImages, ...imageDataUrls]
          });
        }
        return newMap;
      });
    });
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

  const handleActivitySelectionNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent all default behavior and event propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }

    // Ensure we have required selections before proceeding
    if (!selectedProject) {
      console.error('No project selected');
      return false;
    }

    // Quantity is mandatory for all selected activities
    const withoutQuantity = Array.from(selectedActivities.values()).filter(
      (a) => a.quantity == null || a.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((a) => a.name).join(', ');
      toast.showWarning(
        `Quantity is required for all selected activities. Please enter quantity for: ${names}`
      );
      return false;
    }

    // Check if subproject is required for material selection
    // The material selection modal requires selectedSubproject to be truthy
    if (!selectedSubproject) {
      console.warn('No subproject selected - material selection requires subproject');
      // Still proceed - the modal condition will handle it
    }

    // Close activity selection and open material selection
    // React will batch these state updates automatically
    setShowActivitySelection(false);
    setShowMaterialSelection(true);
    
    return false;
  };

  // Load materials from Masters > Materials (GET /materials-list) - associated with logged-in user
  useEffect(() => {
    if (!showMaterialSelection || !isAuthenticated) {
      return;
    }

    const fetchMaterials = async () => {
      setIsLoadingMaterials(true);
      try {
        const fetchedMaterials = await masterDataAPI.getMaterials();
        const raw = Array.isArray(fetchedMaterials) ? fetchedMaterials : [];
        const transformed: Material[] = raw.map((m: any) => {
          const materialClass = m.class?.value || m.class || '';
          const unitObj = m.units || m.unit;
          const unitLabel = unitObj?.unit || unitObj?.name || (typeof m.unit === 'string' ? m.unit : '') || '';
          return {
            id: m.uuid || String(m.id),
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
        console.error('Failed to fetch materials from Masters:', err);
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

  const handleMaterialSelectionNext = () => {
    // Quantity is mandatory for all selected materials
    const withoutQuantity = Array.from(selectedMaterials.values()).filter(
      (m) => m.quantity == null || m.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((m) => m.name).join(', ');
      toast.showWarning(
        `Quantity is required for all selected materials. Please enter quantity for: ${names}`
      );
      return;
    }
    setShowMaterialSelection(false);
    setShowLabourSelection(true);
  };

  // Get selected activity names for material activity dropdown
  const selectedActivityNames = useMemo(() => {
    return Array.from(selectedActivities.values()).map(act => act.name);
  }, [selectedActivities]);

  // Load labours from Masters > Labours (GET /labour-list) - associated with logged-in user
  useEffect(() => {
    if (!showLabourSelection || !isAuthenticated) {
      return;
    }

    const fetchLabours = async () => {
      setIsLoadingLabours(true);
      try {
        const fetchedLabours = await masterDataAPI.getLabours();
        const raw = Array.isArray(fetchedLabours) ? fetchedLabours : [];
        const categoryMap: Record<string, string> = {
          skilled: 'Skilled',
          semiskilled: 'Semi Skilled',
          unskilled: 'Unskilled'
        };
        const transformed: Labour[] = raw.map((lab: any) => {
          const cat = (lab.category || '').toLowerCase();
          const category = categoryMap[cat] || (lab.category || '');
          return {
            id: lab.uuid || String(lab.id),
            name: lab.name || '',
            type: lab.name || '',
            category: category || 'Skilled',
            createdAt: lab.created_at || lab.createdAt
          };
        });
        setLabours(transformed);
      } catch (err: any) {
        console.error('Failed to fetch labours from Masters:', err);
        toast.showError(err.message || 'Failed to load labours');
        setLabours([]);
      } finally {
        setIsLoadingLabours(false);
      }
    };

    fetchLabours();
  }, [showLabourSelection, isAuthenticated, laboursRefreshKey]);

  // Load assets from Masters > Assets/Equipments (GET /assets-list) - associated with logged-in user
  useEffect(() => {
    if (!showAssetSelection || !isAuthenticated) {
      return;
    }

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const fetchedAssets = await masterDataAPI.getAssetsEquipments();
        const raw = Array.isArray(fetchedAssets) ? fetchedAssets : [];
        const transformed: AssetEquipment[] = raw.map((asset: any) => {
          const unitObj = asset.unit_id && typeof asset.unit_id === 'object' ? asset.unit_id : asset.unit;
          const unitLabel = unitObj?.unit || asset.unit?.unit || asset.unit || '';
          return {
            id: asset.uuid || String(asset.id),
            code: asset.code || '',
            name: asset.assets || asset.name || '',
            specification: asset.specification ?? '',
            unit: unitLabel,
            createdAt: asset.created_at || asset.createdAt
          };
        });
        setAssets(transformed);
      } catch (err: any) {
        console.error('Failed to fetch assets from Masters:', err);
        toast.showError(err.message || 'Failed to load assets');
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

  const handleToggleLabour = (labour: Labour) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      if (newMap.has(labour.id)) {
        newMap.delete(labour.id);
      } else {
        newMap.set(labour.id, {
          id: labour.id,
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

  const handleLabourSelectionNext = () => {
    // Quantity is mandatory for all selected labours
    const withoutQuantity = Array.from(selectedLabours.values()).filter(
      (l) => l.quantity == null || l.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((l) => l.type || l.category).join(', ');
      toast.showWarning(
        `Quantity is required for all selected labours. Please enter quantity for: ${names}`
      );
      return;
    }
    setShowLabourSelection(false);
    setShowAssetSelection(true);
  };

  const handleToggleAsset = (asset: AssetEquipment) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      if (newMap.has(asset.id)) {
        newMap.delete(asset.id);
      } else {
        newMap.set(asset.id, {
          id: asset.id,
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

  const handleAssetSelectionNext = () => {
    // Quantity is mandatory for all selected assets
    const withoutQuantity = Array.from(selectedAssets.values()).filter(
      (a) => !a.quantity || a.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((a) => a.name || a.code).join(', ');
      toast.showWarning(
        `Quantity is required for all selected assets. Please enter quantity for: ${names}`
      );
      return;
    }
    setShowAssetSelection(false);
    setShowSafetySelection(true);
  };

  // Load team members (staff list) from Masters > Operations > Staff (GET /teams-list)
  // Fetches when user is authenticated so data is ready for Safety/Hindrance modals
  // Falls back to localStorage (users or manageTeamsUsers) if API fails
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchTeamMembers = async () => {
      try {
        const staffList = await teamsAPI.getTeamsList();
        const raw = Array.isArray(staffList) ? staffList : [];
        const members: TeamMember[] = raw.map((u: any) => ({
          id: u.uuid || String(u.id),
          name: u.name || '',
          email: u.email || ''
        })).filter((m: TeamMember) => m.name);
        setTeamMembers(members);
      } catch (err: any) {
        console.warn('Staff list API failed, using fallback:', err?.message);
        // Fallback: try localStorage (manageTeamsUsers from Operations > Staff, or users)
        try {
          const saved = localStorage.getItem('manageTeamsUsers') || localStorage.getItem('users');
          const parsed = saved ? JSON.parse(saved) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          const fallback: TeamMember[] = list.map((u: any) => ({
            id: u.uuid || u.id || String(Date.now()),
            name: u.name || '',
            email: u.email || ''
          })).filter((m: TeamMember) => m.name);
          setTeamMembers(fallback);
        } catch {
          setTeamMembers([]);
        }
      }
    };
    fetchTeamMembers();
  }, [isAuthenticated]);

  // Load safety entries from API when Safety modal opens
  useEffect(() => {
    if (!showSafetySelection || !isAuthenticated) return;
    const fetchSafetyList = async () => {
      setIsLoadingSafety(true);
      try {
        const params: { project_id?: string | number; subproject_id?: string | number } = {};
        if (selectedProject) params.project_id = selectedProject.numericId ?? selectedProject.id;
        if (selectedSubproject) params.subproject_id = selectedSubproject.numericId ?? selectedSubproject.id;
        const list = await safetyAPI.getSafetyList(params);
        const mapped: SafetyEntry[] = (list || []).map((item: any) => {
          const singleImg = item.image || item.image_url || '';
          const imgArr = Array.isArray(item.images) ? item.images : (singleImg ? [singleImg] : []);
          return {
            id: item.uuid || String(item.id),
            serverId: item.id,
            details: item.details || item.description || '',
            images: imgArr.filter(Boolean),
            teamMembers: Array.isArray(item.team_members) ? item.team_members.map((m: any) => String(m?.id ?? m)) : Array.isArray(item.teamMembers) ? item.teamMembers : [],
            remarks: item.remarks || '',
          };
        });
        setSafetyEntries(mapped);
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to load safety list');
      } finally {
        setIsLoadingSafety(false);
      }
    };
    fetchSafetyList();
  }, [showSafetySelection, isAuthenticated]);

  const DPR_STORAGE_KEY = 'dpr_list';

  const fetchDprList = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DPR_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setDprList(Array.isArray(list) ? list : []);
    } catch {
      setDprList([]);
    } finally {
      setIsLoadingDprList(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingDprList(true);
    fetchDprList();
  }, [isAuthenticated, fetchDprList]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchDprList(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, fetchDprList]);

  const handleAddSafetyEntry = async () => {
    const tempId = `temp-${Date.now()}`;
    setSafetyEntries(prev => [...prev, { id: tempId }]);
    try {
      const payload: Record<string, any> = { details: '', remarks: '' };
      if (selectedProject) payload.project_id = selectedProject.numericId ?? selectedProject.id;
      if (selectedSubproject) payload.subproject_id = selectedSubproject.numericId ?? selectedSubproject.id;
      const res = await safetyAPI.addSafety(payload);
      const raw = res?.data ?? res;
      if (raw && (raw.id !== undefined || raw.uuid)) {
        setSafetyEntries(prev =>
          prev.map(e => (e.id === tempId ? {
            id: raw.uuid || String(raw.id),
            serverId: raw.id,
            details: e.details || raw.details || raw.description || '',
            images: e.images?.length ? e.images : (raw.image || raw.image_url ? [raw.image || raw.image_url] : []),
            teamMembers: e.teamMembers?.length ? e.teamMembers : Array.isArray(raw.team_members) ? raw.team_members.map((m: any) => String(m?.id ?? m)) : raw.teamMembers || [],
            remarks: e.remarks || raw.remarks || '',
          } : e))
        );
      }
    } catch {
      // Keep local row with temp id; user can still fill and use locally
    }
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
    const fileList = Array.from(files);
    const readAsDataURL = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    Promise.all(fileList.map(readAsDataURL)).then((results) => {
      setSafetyEntries(prev => prev.map(entry => {
        if (entry.id !== id) return entry;
        const current = entry.images || (entry.image ? [entry.image] : []);
        return { ...entry, images: [...current, ...results] };
      }));
    }).catch(() => toast.showError('Failed to load some images'));
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

  const handleSafetyEntryTeamMembersChange = (id: string, memberIds: string[]) => {
    setSafetyEntries(prev => prev.map(e => e.id === id ? { ...e, teamMembers: memberIds } : e));
  };

  const handleSafetyEntryRemarksChange = (id: string, remarks: string) => {
    setSafetyEntries(prev => prev.map(e => e.id === id ? { ...e, remarks } : e));
  };

  const handleSafetyNext = () => {
    setShowSafetySelection(false);
    setShowHindranceSelection(true);
  };

  const handleSafetySkip = () => {
    setShowSafetySelection(false);
    setShowHindranceSelection(true);
  };

  const handleAddHindranceEntry = () => {
    const newId = String(Date.now());
    setHindranceEntries(prev => [...prev, { id: newId }]);
  };

  const handleRemoveHindranceEntry = (id: string) => {
    setHindranceEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleHindranceEntryDetailsChange = (id: string, details: string) => {
    setHindranceEntries(prev => prev.map(e => e.id === id ? { ...e, details } : e));
  };

  const handleHindranceEntryImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const readAsDataURL = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    Promise.all(fileList.map(readAsDataURL)).then((results) => {
      setHindranceEntries(prev => prev.map(entry => {
        if (entry.id !== id) return entry;
        const current = entry.images || (entry.image ? [entry.image] : []);
        return { ...entry, images: [...current, ...results] };
      }));
    }).catch(() => toast.showError('Failed to load some images'));
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

  const handleHindranceEntryTeamMembersChange = (id: string, memberIds: string[]) => {
    setHindranceEntries(prev => prev.map(e => e.id === id ? { ...e, teamMembers: memberIds } : e));
  };

  const handleHindranceEntryRemarksChange = (id: string, remarks: string) => {
    setHindranceEntries(prev => prev.map(e => e.id === id ? { ...e, remarks } : e));
  };

  const generateDPRPDF = async (snapshotData?: { project: any; subproject: any; activities: any[]; materials: any[]; labours: any[]; assets: any[]; safety: any[]; hindrance: any[]; teamMembers: any[] }) => {
    const proj = snapshotData?.project ?? selectedProject;
    const subproj = snapshotData?.subproject ?? selectedSubproject;
    const actList = snapshotData?.activities ?? Array.from(selectedActivities.values());
    const matList = snapshotData?.materials ?? Array.from(selectedMaterials.values());
    const labList = snapshotData?.labours ?? Array.from(selectedLabours.values());
    const astList = snapshotData?.assets ?? Array.from(selectedAssets.values());
    const safeList = snapshotData?.safety ?? safetyEntries;
    const hindList = snapshotData?.hindrance ?? hindranceEntries;
    const tmList = snapshotData?.teamMembers ?? teamMembers;

    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 12;
    const rowPad = 3;

    // A4 fixed table width: full content area (width does not resize; height varies with content)
    const TABLE_CONTENT_WIDTH = pageWidth - 2 * margin;

    // Normalize column widths so total equals TABLE_CONTENT_WIDTH (fixed to A4)
    const normalizeColWidths = (colWidths: number[]): number[] => {
      const sum = colWidths.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - TABLE_CONTENT_WIDTH) < 0.5) return colWidths;
      const diff = TABLE_CONTENT_WIDTH - sum;
      const out = [...colWidths];
      out[out.length - 1] = Math.max(5, out[out.length - 1] + diff);
      return out;
    };

    // Colors (RGB 0-255)
    const colorAccent = [194, 214, 66] as [number, number, number];
    const colorHeaderBg = [224, 238, 180] as [number, number, number];
    const colorAltRow = [248, 249, 250] as [number, number, number];
    const colorMetadataBg = [240, 245, 250] as [number, number, number];
    const colorBorder = [180, 195, 210] as [number, number, number];

    const drawTableHeader = (headers: string[], colWidths: number[], startY: number) => {
      const tw = colWidths.reduce((a, b) => a + b, 0);
      doc.setDrawColor(...colorBorder);
      doc.setLineWidth(0.25);
      doc.setFillColor(...colorHeaderBg);
      doc.rect(margin, startY, tw, lineHeight + rowPad * 2, 'FD');
      doc.setTextColor(30, 45, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 2;
      headers.forEach((h, i) => {
        doc.text(h, x, startY + lineHeight + rowPad - 1);
        x += colWidths[i];
      });
      doc.setTextColor(0, 0, 0);
      return startY + lineHeight + rowPad * 2;
    };

    const drawTableRowBg = (y: number, rowHeight: number, colWidths: number[], isAlt: boolean) => {
      const tw = colWidths.reduce((a, b) => a + b, 0);
      if (isAlt) {
        doc.setFillColor(...colorAltRow);
        doc.rect(margin, y, tw, rowHeight, 'F');
      }
      doc.setDrawColor(...colorBorder);
      doc.rect(margin, y, tw, rowHeight);
      let x = margin;
      colWidths.forEach((w, i) => {
        if (i < colWidths.length - 1) {
          doc.line(x + w, y, x + w, y + rowHeight);
          x += w;
        }
      });
    };

    // Helper: draw text wrapped to cell width, return number of lines
    const drawWrappedCell = (text: string, x: number, y: number, cellWidth: number, align: 'left' | 'center' | 'right' = 'left') => {
      const lines = doc.splitTextToSize(String(text || '-'), Math.max(cellWidth - 4, 10));
      const pad = 2;
      lines.forEach((line: string, i: number) => {
        const lineY = y + rowPad + (i + 1) * lineHeight - 1;
        if (align === 'center') {
          doc.text(line, x + cellWidth / 2, lineY, { align: 'center' });
        } else if (align === 'right') {
          doc.text(line, x + cellWidth - pad, lineY, { align: 'right' });
        } else {
          doc.text(line, x + pad, lineY);
        }
      });
      return lines.length;
    };

    // Helper: draw table header with alignment (alignments: 'left'|'center'|'right' per column)
    const drawTableHeaderWithAlign = (headers: string[], colWidths: number[], startY: number, alignments?: ('left' | 'center' | 'right')[]) => {
      const tw = colWidths.reduce((a, b) => a + b, 0);
      doc.setDrawColor(...colorBorder);
      doc.setLineWidth(0.25);
      doc.setFillColor(...colorHeaderBg);
      doc.rect(margin, startY, tw, lineHeight + rowPad * 2, 'FD');
      doc.setTextColor(30, 45, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin;
      headers.forEach((h, i) => {
        const align = alignments?.[i] || 'left';
        const cellW = colWidths[i];
        const textY = startY + lineHeight + rowPad - 1;
        if (align === 'center') {
          doc.text(h, x + cellW / 2, textY, { align: 'center' });
        } else if (align === 'right') {
          doc.text(h, x + cellW - 2, textY, { align: 'right' });
        } else {
          doc.text(h, x + 2, textY);
        }
        x += cellW;
      });
      doc.setTextColor(0, 0, 0);
      return startY + lineHeight + rowPad * 2;
    };

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to add image to PDF (returns Promise)
    const addImageToPDF = (imageData: string, x: number, y: number, maxWidth: number, maxHeight: number): Promise<number> => {
      return new Promise((resolve) => {
        try {
          // Check if imageData is valid
          if (!imageData || (!imageData.startsWith('data:image/') && !imageData.startsWith('http'))) {
            console.error('Invalid image data');
            doc.text('Invalid image data', x, yPosition);
            resolve(lineHeight);
            return;
          }

          const img = new Image();
          
          img.onload = () => {
            try {
              // Calculate dimensions maintaining aspect ratio
              let imgWidth = maxWidth;
              let imgHeight = (img.height / img.width) * imgWidth;
              
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (img.width / img.height) * imgHeight;
              }
              
              // Check if image needs to be on a new page
              if (yPosition + imgHeight + 5 > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              
              // Determine image format from data URL
              let format = 'JPEG';
              if (imageData.includes('data:image/png')) {
                format = 'PNG';
              } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
                format = 'JPEG';
              }
              
              // Add image to PDF - jsPDF can handle full data URLs
              doc.addImage(imageData, format, x, yPosition, imgWidth, imgHeight);
              resolve(imgHeight + 5);
            } catch (error) {
              console.error('Error adding image to PDF:', error);
              // Try with full data URL as fallback
              try {
                let format = 'JPEG';
                if (imageData.includes('data:image/png')) {
                  format = 'PNG';
                }
                doc.addImage(imageData, format, x, yPosition, maxWidth, maxHeight);
                resolve(maxHeight + 5);
              } catch (fallbackError) {
                console.error('Fallback image add also failed:', fallbackError);
                doc.text('Image could not be loaded', x, yPosition);
                resolve(lineHeight);
              }
            }
          };
          
          img.onerror = (error) => {
            console.error('Image load error:', error);
            // Try to add image directly anyway
            try {
              let format = 'JPEG';
              if (imageData.includes('data:image/png')) {
                format = 'PNG';
              }
              doc.addImage(imageData, format, x, yPosition, maxWidth, maxHeight);
              resolve(maxHeight + 5);
            } catch (addError) {
              console.error('Direct image add failed:', addError);
              doc.text('Image could not be loaded', x, yPosition);
              resolve(lineHeight);
            }
          };
          
          // Set image source
          img.src = imageData;
          
          // If image is already loaded (cached), trigger onload immediately
          if (img.complete && img.naturalHeight !== 0) {
            img.onload(new Event('load') as any);
          }
        } catch (error) {
          console.error('Error in addImageToPDF:', error);
          doc.text('Image could not be loaded', x, yPosition);
          resolve(lineHeight);
        }
      });
    };

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorAccent);
    doc.text('Daily Progress Report (DPR)', pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 18;

    // Project Information - styled metadata box
    if (proj || subproj) {
      const metaLines = 2 + (proj ? 1 : 0) + (subproj ? 1 : 0) + (proj?.code ? 1 : 0);
      const metaBoxH = 8 + 10 + metaLines * lineHeight + 6;
      checkPageBreak(metaBoxH + 10);
      const metaBoxTop = yPosition;
      doc.setFillColor(...colorMetadataBg);
      doc.setDrawColor(...colorBorder);
      doc.setLineWidth(0.5);
      doc.rect(margin, metaBoxTop, pageWidth - 2 * margin, metaBoxH, 'FD');
      doc.rect(margin, metaBoxTop, pageWidth - 2 * margin, metaBoxH);
      yPosition = metaBoxTop + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Project Information', margin + 8, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date: ${currentDate}`, margin + 8, yPosition);
      yPosition += lineHeight;
      if (proj) { doc.text(`Project: ${proj.name}`, margin + 8, yPosition); yPosition += lineHeight; }
      if (subproj) { doc.text(`Subproject: ${subproj.name}`, margin + 8, yPosition); yPosition += lineHeight; }
      if (proj?.code) { doc.text(`Project Code: ${proj.code}`, margin + 8, yPosition); yPosition += lineHeight; }
      doc.setTextColor(0, 0, 0);
      yPosition = metaBoxTop + metaBoxH + sectionSpacing;
    }

    // Activities Section
    if (actList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Activities', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const activitiesHeaders = ['Sr No', 'Activity', 'Unit', 'Qty', 'Contractor', 'Remarks'];
      const colWidths = normalizeColWidths([12, 55, 18, 20, 35, 30]);
      const actAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'center', 'center', 'left', 'left'];
      yPosition = drawTableHeaderWithAlign(activitiesHeaders, colWidths, yPosition, actAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      for (const activity of actList) {
        const activityLines = doc.splitTextToSize(activity.name || '-', colWidths[1] - 4);
        const contractorLines = doc.splitTextToSize(activity.contractor || '-', colWidths[4] - 4);
        const remarksLines = doc.splitTextToSize(activity.remarks || '-', colWidths[5] - 4);
        const maxLines = Math.max(1, activityLines.length, contractorLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, maxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, colWidths, (srNo - 1) % 2 === 1);
        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, colWidths[0], 'center');
        xPos += colWidths[0];
        drawWrappedCell(activity.name || '-', xPos, yPosition, colWidths[1], 'left');
        xPos += colWidths[1];
        drawWrappedCell(activity.unit || '-', xPos, yPosition, colWidths[2], 'center');
        xPos += colWidths[2];
        drawWrappedCell(activity.quantity.toString(), xPos, yPosition, colWidths[3], 'center');
        xPos += colWidths[3];
        drawWrappedCell(activity.contractor || '-', xPos, yPosition, colWidths[4], 'left');
        xPos += colWidths[4];
        drawWrappedCell(activity.remarks || '-', xPos, yPosition, colWidths[5], 'left');
        yPosition += rowH;
        
        // Add images if any
        const actImages = (activity as any)?.images;
        if (actImages && actImages.length > 0) {
          yPosition += lineHeight;
          doc.setFontSize(9);
          doc.text('Images:', margin, yPosition);
          yPosition += lineHeight + 2;
          
          for (const image of actImages) {
            const imageHeight = await addImageToPDF(image, margin, yPosition, pageWidth - 2 * margin, 40);
            yPosition += imageHeight + 2;
            checkPageBreak(50);
          }
          
          doc.setFontSize(10);
        }
        
        srNo++;
      }
      yPosition += sectionSpacing;
    }

    // Materials Section
    if (matList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Materials', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const materialsHeaders = ['Sr No', 'Material', 'Unit', 'Qty', 'Activity', 'Remarks'];
      const materialColWidths = normalizeColWidths([12, 48, 18, 20, 35, 30]);
      const matAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'center', 'center', 'left', 'left'];
      yPosition = drawTableHeaderWithAlign(materialsHeaders, materialColWidths, yPosition, matAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      matList.forEach((material) => {
        const materialLines = doc.splitTextToSize(`${material.name} (${material.code})`, materialColWidths[1] - 4);
        const activityLines = doc.splitTextToSize(material.activity || '-', materialColWidths[4] - 4);
        const remarksLines = doc.splitTextToSize(material.remarks || '-', materialColWidths[5] - 4);
        const maxLines = Math.max(1, materialLines.length, activityLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, maxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, materialColWidths, (srNo - 1) % 2 === 1);
        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, materialColWidths[0], 'center');
        xPos += materialColWidths[0];
        drawWrappedCell(`${material.name} (${material.code})`, xPos, yPosition, materialColWidths[1], 'left');
        xPos += materialColWidths[1];
        drawWrappedCell(material.unit, xPos, yPosition, materialColWidths[2], 'center');
        xPos += materialColWidths[2];
        drawWrappedCell(material.quantity.toString(), xPos, yPosition, materialColWidths[3], 'center');
        xPos += materialColWidths[3];
        drawWrappedCell(material.activity || '-', xPos, yPosition, materialColWidths[4], 'left');
        xPos += materialColWidths[4];
        drawWrappedCell(material.remarks || '-', xPos, yPosition, materialColWidths[5], 'left');
        yPosition += rowH;
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Labours Section
    if (labList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Labours', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const laboursHeaders = ['Sr No', 'Labour', 'Category', 'Qty', 'OT', 'Activity', 'Contractor', 'Rate', 'Remarks'];
      const labourColWidths = normalizeColWidths([10, 28, 16, 10, 10, 24, 26, 16, 22]);
      const labAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'center', 'center', 'center', 'left', 'left', 'right', 'left'];
      yPosition = drawTableHeaderWithAlign(laboursHeaders, labourColWidths, yPosition, labAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      labList.forEach((labour) => {
        const labourLines = doc.splitTextToSize(labour.type || '-', labourColWidths[1] - 4);
        const activityLines = doc.splitTextToSize(labour.activity || '-', labourColWidths[5] - 4);
        const contractorLines = doc.splitTextToSize(labour.contractor || '-', labourColWidths[6] - 4);
        const remarksLines = doc.splitTextToSize(labour.remarks || '-', labourColWidths[8] - 4);
        const maxLines = Math.max(1, labourLines.length, activityLines.length, contractorLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, maxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, labourColWidths, (srNo - 1) % 2 === 1);
        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, labourColWidths[0], 'center');
        xPos += labourColWidths[0];
        drawWrappedCell(labour.type || '-', xPos, yPosition, labourColWidths[1], 'left');
        xPos += labourColWidths[1];
        drawWrappedCell(labour.category || '-', xPos, yPosition, labourColWidths[2], 'center');
        xPos += labourColWidths[2];
        drawWrappedCell(labour.quantity.toString(), xPos, yPosition, labourColWidths[3], 'center');
        xPos += labourColWidths[3];
        drawWrappedCell(labour.overtimeQuantity.toString(), xPos, yPosition, labourColWidths[4], 'center');
        xPos += labourColWidths[4];
        drawWrappedCell(labour.activity || '-', xPos, yPosition, labourColWidths[5], 'left');
        xPos += labourColWidths[5];
        drawWrappedCell(labour.contractor || '-', xPos, yPosition, labourColWidths[6], 'left');
        xPos += labourColWidths[6];
        drawWrappedCell(labour.ratePerUnit.toString(), xPos, yPosition, labourColWidths[7], 'right');
        xPos += labourColWidths[7];
        drawWrappedCell(labour.remarks || '-', xPos, yPosition, labourColWidths[8], 'left');
        yPosition += rowH;
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Assets Section
    if (astList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Assets & Equipments', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const assetsHeaders = ['Sr No', 'Asset', 'Qty', 'Activity', 'Contractor', 'Rate', 'Remarks'];
      const assetColWidths = normalizeColWidths([10, 45, 16, 26, 30, 16, 26]);
      const assetAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'center', 'left', 'left', 'right', 'left'];
      yPosition = drawTableHeaderWithAlign(assetsHeaders, assetColWidths, yPosition, assetAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      astList.forEach((asset) => {
        const assetLines = doc.splitTextToSize(`${asset.name || ''} (${asset.code || ''})`, assetColWidths[1] - 4);
        const activityLines = doc.splitTextToSize(asset.activity || '-', assetColWidths[3] - 4);
        const contractorLines = doc.splitTextToSize(asset.contractor || '-', assetColWidths[4] - 4);
        const remarksLines = doc.splitTextToSize(asset.remarks || '-', assetColWidths[6] - 4);
        const maxLines = Math.max(1, assetLines.length, activityLines.length, contractorLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, maxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, assetColWidths, (srNo - 1) % 2 === 1);
        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, assetColWidths[0], 'center');
        xPos += assetColWidths[0];
        drawWrappedCell(`${asset.name || ''} (${asset.code || ''})`, xPos, yPosition, assetColWidths[1], 'left');
        xPos += assetColWidths[1];
        drawWrappedCell(asset.quantity.toString(), xPos, yPosition, assetColWidths[2], 'center');
        xPos += assetColWidths[2];
        drawWrappedCell(asset.activity || '-', xPos, yPosition, assetColWidths[3], 'left');
        xPos += assetColWidths[3];
        drawWrappedCell(asset.contractor || '-', xPos, yPosition, assetColWidths[4], 'left');
        xPos += assetColWidths[4];
        drawWrappedCell(asset.ratePerUnit.toString(), xPos, yPosition, assetColWidths[5], 'right');
        xPos += assetColWidths[5];
        drawWrappedCell(asset.remarks || '-', xPos, yPosition, assetColWidths[6], 'left');
        yPosition += rowH;
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Safety Section - table structure
    if (safeList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Safety Issues', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const safetyHeaders = ['Sr No', 'Problem Details', 'Team Members', 'Remarks'];
      const safetyColWidths = normalizeColWidths([10, 60, 40, 65]);
      const safetyAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'left', 'left'];
      yPosition = drawTableHeaderWithAlign(safetyHeaders, safetyColWidths, yPosition, safetyAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      for (const entry of safeList) {
        const teamMemberNames = (entry.teamMembers || []).map((mid: string) => {
          const member = tmList.find((m: any) => m.id === mid);
          return member ? member.name : mid;
        }).join(', ');
        const detailsLines = doc.splitTextToSize(entry.details || '—', safetyColWidths[1] - 4);
        const teamLines = doc.splitTextToSize(teamMemberNames || '-', safetyColWidths[2] - 4);
        const remarksLines = doc.splitTextToSize(entry.remarks || '-', safetyColWidths[3] - 4);
        const textMaxLines = Math.max(1, detailsLines.length, teamLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, textMaxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, safetyColWidths, (srNo - 1) % 2 === 1);

        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, safetyColWidths[0], 'center');
        xPos += safetyColWidths[0];
        drawWrappedCell(entry.details || '—', xPos, yPosition, safetyColWidths[1], 'left');
        xPos += safetyColWidths[1];
        drawWrappedCell(teamMemberNames || '-', xPos, yPosition, safetyColWidths[2], 'left');
        xPos += safetyColWidths[2];
        drawWrappedCell(entry.remarks || '-', xPos, yPosition, safetyColWidths[3], 'left');
        yPosition += rowH;

        // Images below row (like Activities)
        const safetyImgs = entry.images || (entry.image ? [entry.image] : []);
        if (safetyImgs.length > 0) {
          yPosition += lineHeight;
          doc.setFontSize(9);
          doc.text('Images:', margin, yPosition);
          yPosition += lineHeight + 2;
          for (const img of safetyImgs) {
            const imageHeight = await addImageToPDF(img, margin, yPosition, pageWidth - 2 * margin, 40);
            yPosition += imageHeight + 2;
            checkPageBreak(50);
          }
          doc.setFontSize(9);
        }
        srNo++;
      }
      yPosition += sectionSpacing;
    }

    // Hindrance Section - table structure (same as Safety)
    if (hindList.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 60, 80);
      doc.text('Hindrance Issues', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight + 4;

      const hindranceHeaders = ['Sr No', 'Problem Details', 'Team Members', 'Remarks'];
      const hindranceColWidths = normalizeColWidths([10, 60, 40, 65]);
      const hindranceAlignments: ('left' | 'center' | 'right')[] = ['center', 'left', 'left', 'left'];
      yPosition = drawTableHeaderWithAlign(hindranceHeaders, hindranceColWidths, yPosition, hindranceAlignments);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let srNo = 1;
      for (const entry of hindList) {
        const teamMemberNames = (entry.teamMembers || []).map((mid: string) => {
          const member = tmList.find((m: any) => m.id === mid);
          return member ? member.name : mid;
        }).join(', ');
        const detailsLines = doc.splitTextToSize(entry.details || '—', hindranceColWidths[1] - 4);
        const teamLines = doc.splitTextToSize(teamMemberNames || '-', hindranceColWidths[2] - 4);
        const remarksLines = doc.splitTextToSize(entry.remarks || '-', hindranceColWidths[3] - 4);
        const textMaxLines = Math.max(1, detailsLines.length, teamLines.length, remarksLines.length);
        const rowH = Math.max(lineHeight + rowPad, textMaxLines * lineHeight + rowPad * 2);
        checkPageBreak(rowH + 5);
        drawTableRowBg(yPosition, rowH, hindranceColWidths, (srNo - 1) % 2 === 1);

        let xPos = margin;
        drawWrappedCell(srNo.toString(), xPos, yPosition, hindranceColWidths[0], 'center');
        xPos += hindranceColWidths[0];
        drawWrappedCell(entry.details || '—', xPos, yPosition, hindranceColWidths[1], 'left');
        xPos += hindranceColWidths[1];
        drawWrappedCell(teamMemberNames || '-', xPos, yPosition, hindranceColWidths[2], 'left');
        xPos += hindranceColWidths[2];
        drawWrappedCell(entry.remarks || '-', xPos, yPosition, hindranceColWidths[3], 'left');
        yPosition += rowH;

        // Images below row (like Activities)
        const hindranceImgs = entry.images || (entry.image ? [entry.image] : []);
        if (hindranceImgs.length > 0) {
          yPosition += lineHeight;
          doc.setFontSize(9);
          doc.text('Images:', margin, yPosition);
          yPosition += lineHeight + 2;
          for (const img of hindranceImgs) {
            const imageHeight = await addImageToPDF(img, margin, yPosition, pageWidth - 2 * margin, 40);
            yPosition += imageHeight + 2;
            checkPageBreak(50);
          }
          doc.setFontSize(9);
        }
        srNo++;
      }
      yPosition += sectionSpacing;
    }

    // Generate filename
    const projectName = proj?.name || 'DPR';
    const subprojectName = subproj?.name || '';
    const filename = `DPR_${projectName}_${subprojectName}_${new Date().toISOString().split('T')[0]}.pdf`.replace(/[^a-z0-9]/gi, '_');

    // Save PDF
    doc.save(filename);
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File | null => {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
      return new File([u8arr], filename, { type: mime });
    } catch {
      return null;
    }
  };

  const buildDprFormData = (): FormData | null => {
    const projectId = selectedProject?.numericId ?? Number(selectedProject?.id);
    const subprojectId = selectedSubproject ? (selectedSubproject.numericId ?? Number(selectedSubproject.id)) : null;
    if (!projectId) return null;

    const formData = new FormData();
    formData.append('dpr', JSON.stringify({
      projects_id: projectId,
      sub_projects_id: subprojectId,
      name: new Date().toISOString().split('T')[0],
      staps: 7,
    }));

    if (selectedActivities.size > 0) {
      const activitiesList: any[] = [];
      for (const a of selectedActivities.values()) {
        activitiesList.push({
          activities_history_activities_id: Number(a.id) || a.id,
          activities_history_qty: a.quantity,
          activities_history_completion: 0,
          activities_history_vendors_id: null,
          remaining_qty: 0,
          total_qty: a.quantity,
          activities_history_remarks: a.remarks || '',
        });
      }
      formData.append('activities', JSON.stringify(activitiesList));
      let imgIdx = 0;
      for (const a of selectedActivities.values()) {
        const imgs = a.images || [];
        imgs.forEach((dataUrl, j) => {
          if (dataUrl && typeof dataUrl === 'string') {
            const f = dataURLtoFile(dataUrl, `activity_${imgIdx}_${j}.jpg`);
            if (f) {
              formData.append(`activities_images[${imgIdx}][${j}]`, f);
            }
          }
        });
        imgIdx++;
      }
    }
    if (selectedMaterials.size > 0) {
      formData.append('materials', JSON.stringify(Array.from(selectedMaterials.values()).map(m => ({
        materials_id: Number(m.id) || m.id,
        qty: m.quantity,
        remarkes: m.remarks || '',
      }))));
    }
    if (selectedLabours.size > 0) {
      formData.append('labour', JSON.stringify(Array.from(selectedLabours.values()).map(l => ({
        labours_id: Number(l.id) || l.id,
        qty: l.quantity,
        ot_qty: l.overtimeQuantity || 0,
        rate_per_unit: l.ratePerUnit || 0,
        vendors_id: null,
        remarkes: l.remarks || '',
      }))));
    }
    if (selectedAssets.size > 0) {
      formData.append('assets', JSON.stringify(Array.from(selectedAssets.values()).map(a => ({
        assets_id: Number(a.id) || a.id,
        qty: a.quantity,
        rate_per_unit: a.ratePerUnit || 0,
        vendors_id: null,
        remarkes: a.remarks || '',
      }))));
    }
    if (safetyEntries.length > 0) {
      formData.append('safety', JSON.stringify(safetyEntries.map(s => ({
        name: (s.details || '').substring(0, 100) || 'Safety',
        details: s.details || '',
        remarks: s.remarks || '',
      }))));
      safetyEntries.forEach((s, i) => {
        const imgs = s.images || (s.image ? [s.image] : []);
        imgs.forEach((dataUrl, j) => {
          if (dataUrl && typeof dataUrl === 'string') {
            const f = dataURLtoFile(dataUrl, `safety_${i}_${j}.jpg`);
            if (f) formData.append(`safety_images[${i}][${j}]`, f);
          }
        });
      });
    }
    if (hindranceEntries.length > 0) {
      formData.append('hinderance', JSON.stringify(hindranceEntries.map(h => ({
        name: (h.details || '').substring(0, 100) || 'Hindrance',
        details: h.details || '',
        remarks: h.remarks || '',
      }))));
      hindranceEntries.forEach((h, i) => {
        const imgs = h.images || (h.image ? [h.image] : []);
        imgs.forEach((dataUrl, j) => {
          if (dataUrl && typeof dataUrl === 'string') {
            const f = dataURLtoFile(dataUrl, `hinderance_${i}_${j}.jpg`);
            if (f) formData.append(`hinderance_images[${i}][${j}]`, f);
          }
        });
      });
    }
    return formData;
  };

  const saveDprToLocalStorage = () => {
    if (!selectedProject) return;
    const dprNo = String(Date.now()).slice(-6);
    const dprSnapshot = {
      id: `local-${Date.now()}`,
      dpr_no: dprNo,
      date: new Date().toISOString().split('T')[0],
      projects_id: selectedProject.numericId ?? selectedProject.id,
      sub_projects_id: selectedSubproject ? (selectedSubproject.numericId ?? selectedSubproject.id) : null,
      projects: { project_name: selectedProject.name, name: selectedProject.name },
      sub_projects: selectedSubproject ? { name: selectedSubproject.name } : null,
      subProjects: selectedSubproject ? { name: selectedSubproject.name } : null,
      staps: 7,
      _local: true,
      snapshot: {
        project: selectedProject,
        subproject: selectedSubproject,
        activities: Array.from(selectedActivities.values()),
        materials: Array.from(selectedMaterials.values()),
        labours: Array.from(selectedLabours.values()),
        assets: Array.from(selectedAssets.values()),
        safety: [...safetyEntries],
        hindrance: [...hindranceEntries],
        teamMembers: [...teamMembers],
      },
    };
    try {
      const raw = localStorage.getItem(DPR_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(dprSnapshot);
      localStorage.setItem(DPR_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleHindranceNext = () => {
    if (!selectedProject) return;
    setShowHindranceSelection(false);
    saveDprToLocalStorage();
    setShowDPRComplete(true);
    fetchDprList();
  };

  const handleHindranceSkip = () => {
    handleHindranceNext();
  };

  const handleDownloadDPR = async () => {
    await generateDPRPDF();
  };

  const handleMaterialCreated = () => {
    setMaterialsRefreshKey(k => k + 1); // Refetch materials from Masters API
  };

  const handleCreateNewProject = () => {
    window.location.href = '/masters/projects/add';
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

  const handleEditPrevious = () => {
    // TODO: Implement edit previous DPR logic
    console.log('Edit previous DPR');
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4">
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleCreateNewDPR}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Create a new DPR</span><span className="sm:hidden">New DPR</span>
          </button>
          <button
            onClick={handleEditPrevious}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all border-2 whitespace-nowrap ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
          >
            <Edit className="w-4 h-4 flex-shrink-0" /> Edit previous
          </button>
        </div>
      </div>

      {/* DPR List */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
          <div>
            <h2 className={`text-base font-black ${textPrimary}`}>DPR List</h2>
            <p className={`text-xs ${textSecondary} mt-0.5`}>Your daily progress reports</p>
          </div>
          <button
            onClick={() => fetchDprList()}
            disabled={isLoadingDprList}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all self-start sm:self-auto ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingDprList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoadingDprList ? (
            <div className={`flex items-center justify-center py-12 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading DPR list...</span>
            </div>
          ) : dprList.length === 0 ? (
            <div className={`px-4 py-8 text-center ${textSecondary}`}>
              <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">No DPRs yet</p>
              <p className="text-xs mt-1">Create your first DPR using the button above</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}`}>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>DPR No</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Subproject</th>
                  <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {dprList.map((dpr: any) => (
                  <tr key={dpr.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{dpr.dpr_no ?? '-'}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{dpr.date ?? '-'}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{dpr.projects?.project_name ?? dpr.projects?.name ?? `Project #${dpr.projects_id}` ?? '-'}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{dpr.sub_projects?.name ?? dpr.subProjects?.name ?? (dpr.sub_projects_id ? `#${dpr.sub_projects_id}` : '-')}</td>
                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${dpr.staps === 7 ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}`}>
                        {dpr.staps === 7 ? 'Complete' : `Step ${dpr.staps ?? 0}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => {
                          if (dpr._local && dpr.snapshot) {
                            await generateDPRPDF(dpr.snapshot);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-[#C2D642]/20 text-[#C2D642] hover:bg-[#C2D642]/30' : 'bg-[#C2D642]/10 text-[#C2D642] hover:bg-[#C2D642]/20'}`}
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Project Selection Modal */}
      {showProjectSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            ref={projectModalScrollRef}
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-4xl h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-y-auto overflow-x-hidden`}
          >
            {/* X - fixed top right corner */}
            <button
              onClick={() => {
                setShowProjectSelection(false);
                setProjectSearchQuery('');
              }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
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
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  />
                </div>
                <button
                  onClick={handleCreateNewProject}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                >
                  <Plus className="w-4 h-4" /> Create New
                </button>
              </div>
            </div>

            {/* Projects Grid - starts from top, takes full space */}
            <div className="p-4 sm:p-6 flex flex-col min-h-0">
              {filteredProjects.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            src={project.logo} 
                            alt={project.name}
                            className="w-full h-full object-cover"
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4" /> Create New Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subproject Selection Modal */}
      {showSubprojectSelection && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-4xl h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => {
                setShowSubprojectSelection(false);
                setSubprojectSearchQuery('');
                setSelectedProject(null);
              }}
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
                      Please select a subproject for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>
                    </p>
                  </div>
                </div>
                {/* Search and Create New */}
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                    <input
                      type="text"
                      placeholder="Search subprojects..."
                      value={subprojectSearchQuery}
                      onChange={(e) => setSubprojectSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                  <button
                    onClick={handleCreateNewSubproject}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Create New
                  </button>
                </div>
              </div>

              {/* Subprojects List - starts from top, takes full space */}
              <div className="p-4 sm:p-6 flex flex-col min-h-0">
              {isLoadingSubprojects ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading subprojects...</p>
                </div>
              ) : filteredSubprojects.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedSubprojects.map((subproject) => (
                    <div
                      key={subproject.id}
                      onClick={() => handleSelectSubproject(subproject)}
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
                            {subproject.progress !== undefined && (
                              <span className={`text-xs font-bold ${textSecondary}`}>
                                {subproject.progress}% Complete
                              </span>
                            )}
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Footer with Back and Next buttons - sticky at bottom */}
            <div className={`${bgPrimary} flex-shrink-0 shrink-0 flex items-center justify-between px-4 py-2 sm:py-3 border-t border-inherit`}>
              <button
                onClick={() => {
                  setShowSubprojectSelection(false);
                  setShowProjectSelection(true);
                  setSubprojectSearchQuery('');
                  setSelectedProject(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSkipSubproject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Selection Modal */}
      {showActivitySelection && selectedProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onClick={(e) => {
            // Prevent closing modal when clicking backdrop
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div 
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X - fixed top right corner */}
            <button
              onClick={() => {
                setShowActivitySelection(false);
                setSelectedActivities(new Map());
              }}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Activities</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select project and subproject to load activities (like Masters &gt; Activities)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateActivityModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Create New
                  </button>
                </div>
                {/* Project and Subproject selectors - like Masters > Activities */}
                <div className="px-4 sm:px-6 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Select Project <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedProject?.id ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const proj = projects.find(p => p.id === val || String(p.numericId) === val);
                          if (proj) {
                            setSelectedProject(proj);
                            setSelectedSubproject(null);
                            setActivities([]);
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                          isDark
                            ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                      >
                        <option value="">-- Select Project --</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                        Select Subproject (Optional)
                      </label>
                      {isLoadingSubprojects ? (
                        <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                          <div className="w-4 h-4 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin" />
                          Loading subprojects...
                        </div>
                      ) : (
                        <select
                          value={selectedSubproject?.id ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              setSelectedSubproject(null);
                              return;
                            }
                            const sub = subprojects.find(s => s.id === val || String(s.numericId) === val);
                            if (sub) setSelectedSubproject(sub);
                          }}
                          disabled={!selectedProject}
                          className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                            isDark
                              ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                          } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">-- All Subprojects --</option>
                          {subprojects.map((subproject) => (
                            <option key={subproject.id} value={subproject.id}>
                              {subproject.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 pt-0 border-b border-inherit">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
                    <input
                      type="text"
                      value={activitySearchQuery}
                      onChange={e => setActivitySearchQuery(e.target.value)}
                      placeholder="Search by activity name or unit..."
                      className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Activities Table - takes full space, appears first on open */}
              <div className="p-4 sm:p-6">
              {isLoadingActivities ? (
                <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
                  <div className="w-10 h-10 border-2 border-[#C2D642] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading activities...</p>
                </div>
              ) : filteredActivities.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
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
                                        newMap.set(act.id, { id: act.id, name: act.name, unit: act.unit, quantity: 0 });
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
                          <th className={`px-4 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
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
                              className={`transition-colors ${
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
                              <td className="w-14 pl-6 py-4 align-middle">
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
                              <td className="px-4 py-4 align-middle">
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
                              <td className="px-4 py-4 align-middle">
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
                              <td className="px-4 py-4 align-middle">
                                {isHeading ? (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                ) : isSelected ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {selectedActivity?.images && selectedActivity.images.length > 0 && (
                                      <>
                                        {selectedActivity.images.map((image, imgIdx) => (
                                          <div key={imgIdx} className="relative group">
                                            <img 
                                              src={image} 
                                              alt={`Activity ${imgIdx + 1}`}
                                              className="w-16 h-16 object-cover rounded-lg border border-inherit"
                                            />
                                            <button
                                              onClick={() => handleRemoveImage(activity.id, imgIdx)}
                                              className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                        <label htmlFor={`image-upload-${activity.id}`} className={`flex items-center justify-center gap-1.5 cursor-pointer w-16 h-16 rounded-lg text-xs font-bold border-2 border-dashed shrink-0 transition-all ${
                                          isDark 
                                            ? 'border-slate-600 hover:border-[#C2D642] text-slate-400 hover:text-[#C2D642] bg-slate-800/30' 
                                            : 'border-slate-300 hover:border-[#C2D642] text-slate-500 hover:text-[#C2D642] bg-slate-50'
                                        }`}>
                                          <Upload className="w-4 h-4" />
                                          <span>Add</span>
                                          <input
                                            id={`image-upload-${activity.id}`}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleImageUpload(activity.id, e.target.files)}
                                            className="hidden"
                                          />
                                        </label>
                                      </>
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
                                          multiple
                                          onChange={(e) => handleImageUpload(activity.id, e.target.files)}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle">
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
            <div className={`${bgPrimary} flex flex-row items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                type="button"
                onClick={() => {
                  setShowActivitySelection(false);
                  setShowSubprojectSelection(true);
                  setSelectedActivities(new Map());
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleActivitySelectionNext}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                disabled={selectedActivities.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedActivities.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Selection Modal */}
      {showMaterialSelection && selectedProject && selectedSubproject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) { e.preventDefault(); e.stopPropagation(); }
          }}
        >
          <div 
            className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X - fixed top right corner */}
            <button
              onClick={() => { setShowMaterialSelection(false); setSelectedMaterials(new Map()); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={materialModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={materialModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Materials Used</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select materials for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateMaterialModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Create New
                  </button>
                </div>
                <div className="p-4 sm:p-6 pt-0 border-b border-inherit">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
                    <input
                      type="text"
                      value={materialSearchQuery}
                      onChange={e => setMaterialSearchQuery(e.target.value)}
                      placeholder="Search by class, code, name, specification, or unit..."
                      className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
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
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => {
                  setShowMaterialSelection(false);
                  setShowActivitySelection(true);
                  setSelectedMaterials(new Map());
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleMaterialSelectionNext}
                disabled={selectedMaterials.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedMaterials.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labour Selection Modal */}
      {showLabourSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => { setShowLabourSelection(false); setSelectedLabours(new Map()); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={labourModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={labourModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Labours</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select labours for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateLabourModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Create New
                  </button>
                </div>
                <div className="p-4 sm:p-6 pt-0 border-b border-inherit">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
                    <input
                      type="text"
                      value={labourSearchQuery}
                      onChange={e => setLabourSearchQuery(e.target.value)}
                      placeholder="Search by name, type, or category..."
                      className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
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
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleLabour(labour)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.category}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.name}</td>
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => {
                  setShowLabourSelection(false);
                  setShowMaterialSelection(true);
                  setSelectedLabours(new Map());
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleLabourSelectionNext}
                disabled={selectedLabours.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedLabours.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Selection Modal */}
      {showAssetSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => { setShowAssetSelection(false); setSelectedAssets(new Map()); setAssetSearchQuery(''); }}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={assetModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={assetModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Select Machines/Assets</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Select machines/assets for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateAssetModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Create New
                  </button>
                </div>
                <div className="p-4 sm:p-6 border-b border-inherit">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
                    <input
                      type="text"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      placeholder="Search by code, name, specification, or unit..."
                      className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold border ${
                        isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                      } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
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
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
                              <td className="px-6 py-4">
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
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => {
                  setShowAssetSelection(false);
                  setShowLabourSelection(true);
                  setSelectedAssets(new Map());
                  setAssetSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleAssetSelectionNext}
                disabled={selectedAssets.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedAssets.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Selection Modal */}
      {showSafetySelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => setShowSafetySelection(false)}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={safetyModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={safetyModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Safety</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Report safety issues and concerns for <span className="font-bold text-[#C2D642]">{selectedProject?.name}</span>
                      {selectedSubproject && <> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={handleAddSafetyEntry}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>
              </div>
              <div className="p-6">
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
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Team Members</th>
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
                                teamMembers={teamMembers}
                                value={entry.teamMembers || []}
                                onChange={(memberIds) => handleSafetyEntryTeamMembersChange(entry.id, memberIds)}
                                isDark={isDark}
                                placeholder="Select team members"
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
                                {(entry.images || (entry.image ? [entry.image] : [])).map((img, idx) => (
                                  <div key={idx} className="relative flex-shrink-0">
                                    <img src={img} alt={`Safety ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-inherit" />
                                    <button onClick={() => handleSafetyEntryRemoveImage(entry.id, idx)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                                <label className="cursor-pointer flex-shrink-0">
                                  <input type="file" accept="image/*" multiple onChange={(e) => handleSafetyEntryImageUpload(entry.id, e)} className="hidden" />
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed w-fit ${isDark ? 'border-slate-600 hover:border-[#C2D642] text-slate-400' : 'border-slate-300 hover:border-[#C2D642] text-slate-600'}`}>
                                    <Upload className="w-4 h-4" /><span className="text-xs font-bold">Add</span>
                                  </div>
                                </label>
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
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => {
                  setShowSafetySelection(false);
                  setShowAssetSelection(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSafetySkip}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleSafetyNext}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hindrance Selection Modal */}
      {showHindranceSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[95vw] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
            {/* X - fixed top right corner */}
            <button
              onClick={() => setShowHindranceSelection(false)}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div ref={hindranceModalScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div ref={hindranceModalHeaderRef} className={`${bgPrimary} flex-shrink-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                  <div>
                    <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Hindrance</h2>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Report hindrances affecting progress for <span className="font-bold text-[#C2D642]">{selectedProject?.name}</span>
                      {selectedSubproject && <> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={handleAddHindranceEntry}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 flex-shrink-0 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                  >
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>
              </div>
              <div className="p-6">
              <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Hindrance Problem Details</th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Team Members</th>
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
                                teamMembers={teamMembers}
                                value={entry.teamMembers || []}
                                onChange={(memberIds) => handleHindranceEntryTeamMembersChange(entry.id, memberIds)}
                                isDark={isDark}
                                placeholder="Select team members"
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
                                {(entry.images || (entry.image ? [entry.image] : [])).map((img, idx) => (
                                  <div key={idx} className="relative flex-shrink-0">
                                    <img src={img} alt={`Hindrance ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-inherit" />
                                    <button onClick={() => handleHindranceEntryRemoveImage(entry.id, idx)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                                <label className="cursor-pointer flex-shrink-0">
                                  <input type="file" accept="image/*" multiple onChange={(e) => handleHindranceEntryImageUpload(entry.id, e)} className="hidden" />
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed w-fit ${isDark ? 'border-slate-600 hover:border-[#C2D642] text-slate-400' : 'border-slate-300 hover:border-[#C2D642] text-slate-600'}`}>
                                    <Upload className="w-4 h-4" /><span className="text-xs font-bold">Add</span>
                                  </div>
                                </label>
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
              </div>
            </div>

            {/* Modal Footer - sticky at bottom */}
            <div className={`${bgPrimary} flex items-center justify-between gap-2 sm:gap-4 px-4 py-2 sm:py-3 border-t border-inherit flex-shrink-0 shrink-0`}>
              <button
                onClick={() => {
                  setShowHindranceSelection(false);
                  setShowSafetySelection(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHindranceSkip}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleHindranceNext}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPR Complete Modal */}
      {showDPRComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md overflow-hidden flex flex-col`}>
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
                Your Daily Progress Report has been successfully created and is ready to share and download.
              </p>
              <button
                onClick={handleDownloadDPR}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg text-base font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-inherit">
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
        onClose={() => setShowCreateActivityModal(false)}
        onSuccess={() => {
          setShowCreateActivityModal(false);
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
        onSuccess={() => {
          setShowCreateLabourModal(false);
          setLaboursRefreshKey(prev => prev + 1);
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
