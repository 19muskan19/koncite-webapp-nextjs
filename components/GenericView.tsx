'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType, ViewType } from '../types';
import { 
  Users, 
  ShieldCheck, 
  ClipboardCheck, 
  BarChart3, 
  UsersRound,
  Briefcase,
  CreditCard,
  UserCog,
  FileText,
  TrendingUp,
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  X,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Eye,
  Share2
} from 'lucide-react';
import { masterDataAPI, materialRequestAPI, rfqAPI, goodsReturnAPI, goodsIssueAPI, goodsReceiptAPI } from '../services/api';
import { getLogoUrl } from '@/utils/imageUtils';
import { copyPdfUrl } from '@/utils/pdfUtils';
import { useRouter } from 'next/navigation';
import { useToast } from '../contexts/ToastContext';
import CreateProjectModal from './masters/Modals/CreateProjectModal';
import CreateSubprojectModal from './masters/Modals/CreateSubprojectModal';
import CreateMaterialModal from './masters/Modals/CreateMaterialModal';

interface GenericViewProps {
  theme: ThemeType;
  currentView: ViewType;
}

interface PRProject {
  id: string;
  numericId?: number;
  name: string;
  logo: string;
  code?: string;
  company?: string;
  location?: string;
}

interface PRSubproject {
  id: string;
  numericId?: number;
  name: string;
  code: string;
  project: string;
  manager?: string;
  status: string;
}

interface PRMaterial {
  id: string;
  numericId?: number;
  class: string;
  code: string;
  name: string;
  specification?: string;
  unit?: string;
}

interface PRActivity {
  id: string;
  numericId?: number;
  name: string;
}

interface PRSelectedMaterial {
  materialId: string;
  materialNumericId?: number;
  materialName: string;
  quantity: number;
  requiredDate: string;
  activityId: string;
  activityName: string;
  remark: string;
}

const PROJECT_PAGE_SIZE = 10;
const SUBPROJECT_PAGE_SIZE = 10;
const MATERIAL_PAGE_SIZE = 10;
const INVENTORY_LIST_PAGE_SIZE = 10;
const RFQ_PAGE_SIZE = 10;
const PR_PAGE_SIZE = 10;

const INVENTORY_SECTION_VIEWS: ViewType[] = [
  ViewType.INVENTORY_PR,
  ViewType.INVENTORY_RFQ,
  ViewType.INVENTORY_GRN_MRN_SLIP,
  ViewType.INVENTORY_GRN_MRN_DETAILS,
  ViewType.INVENTORY_ISSUE_SLIP,
  ViewType.INVENTORY_ISSUE_OUTWARD_DETAILS,
  ViewType.INVENTORY_ISSUE_RETURN,
  ViewType.INVENTORY_GLOBAL_STOCK_DETAILS,
  ViewType.INVENTORY_PROJECT_STOCK_STATEMENT,
];
const isInventorySection = (v: ViewType) => INVENTORY_SECTION_VIEWS.includes(v);

interface ViewConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  columns: string[];
  sampleData: Array<Record<string, string>>;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
}

const GenericView: React.FC<GenericViewProps> = ({ theme, currentView }) => {
  const toast = useToast();
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Inventory PR - wizard step: 'project' | 'subproject' | 'materials' | 'success'
  const [prStep, setPrStep] = useState<'project' | 'subproject' | 'materials' | 'success'>('project');
  const [prPdfUrl, setPrPdfUrl] = useState<string | null>(null);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateSubprojectModal, setShowCreateSubprojectModal] = useState(false);
  const [showCreateMaterialModal, setShowCreateMaterialModal] = useState(false);
  const [prProjects, setPrProjects] = useState<PRProject[]>([]);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [prSelectedProject, setPrSelectedProject] = useState<PRProject | null>(null);
  const [prSubprojects, setPrSubprojects] = useState<PRSubproject[]>([]);
  const [subprojectSearchQuery, setSubprojectSearchQuery] = useState('');
  const [subprojectPage, setSubprojectPage] = useState(1);
  const [prSelectedSubproject, setPrSelectedSubproject] = useState<PRSubproject | null>(null);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false);
  const [prMaterials, setPrMaterials] = useState<PRMaterial[]>([]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialPage, setMaterialPage] = useState(1);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [prReqNo, setPrReqNo] = useState('');
  const [prSelectedMaterials, setPrSelectedMaterials] = useState<Map<string, PRSelectedMaterial>>(new Map());
  const [prActivities, setPrActivities] = useState<PRActivity[]>([]);
  const [isSubmittingPR, setIsSubmittingPR] = useState(false);
  const [prList, setPrList] = useState<any[]>([]);
  const [isLoadingPrList, setIsLoadingPrList] = useState(false);
  const [prSearchQuery, setPrSearchQuery] = useState('');
  const [prListPage, setPrListPage] = useState(1);
  const [rfqListPage, setRfqListPage] = useState(1);
  const [grnListPage, setGrnListPage] = useState(1);
  const [returnListPage, setReturnListPage] = useState(1);
  const [issueListPage, setIssueListPage] = useState(1);
  const [prEditModalPage, setPrEditModalPage] = useState(1);
  const [rfqEditModalPage, setRfqEditModalPage] = useState(1);
  const [returnEditModalPage, setReturnEditModalPage] = useState(1);
  const [grnEditModalPage, setGrnEditModalPage] = useState(1);
  const [issueEditModalPage, setIssueEditModalPage] = useState(1);
  const [showEditPreviousModal, setShowEditPreviousModal] = useState(false);
  const [prEditingId, setPrEditingId] = useState<number | string | null>(null);
  const [prIsEditMode, setPrIsEditMode] = useState(false); // true = editing existing PR, false = creating new PR
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingPr, setViewingPr] = useState<any>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingEditPr, setIsLoadingEditPr] = useState(false);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [rfqList, setRfqList] = useState<any[]>([]);
  const [isLoadingRfqList, setIsLoadingRfqList] = useState(false);
  const [showEditPreviousRfqModal, setShowEditPreviousRfqModal] = useState(false);
  const [returnList, setReturnList] = useState<any[]>([]);
  const [isLoadingReturnList, setIsLoadingReturnList] = useState(false);
  const [showEditPreviousReturnModal, setShowEditPreviousReturnModal] = useState(false);
  const [issueList, setIssueList] = useState<any[]>([]);
  const [isLoadingIssueList, setIsLoadingIssueList] = useState(false);
  const [showEditPreviousIssueModal, setShowEditPreviousIssueModal] = useState(false);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [isLoadingGrnList, setIsLoadingGrnList] = useState(false);
  const [showEditPreviousGrnModal, setShowEditPreviousGrnModal] = useState(false);
  const [inventoryEntriesPerPage, setInventoryEntriesPerPage] = useState(25);
  const router = useRouter();

  // Fetch projects when project selection modal opens for any inventory section
  useEffect(() => {
    if (!showProjectSelection || !isInventorySection(currentView)) return;
    const token = typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1] : null;
    const authFlag = typeof localStorage !== 'undefined' ? localStorage.getItem('isAuthenticated') === 'true' : false;
    if (!token || !authFlag) {
      setPrProjects([]);
      setIsLoadingProjects(false);
      return;
    }
    setIsLoadingProjects(true);
    masterDataAPI.getProjects()
      .then((fetched: any[]) => {
        const transformed: PRProject[] = (Array.isArray(fetched) ? fetched : []).map((p: any) => {
          const numId = Number.isFinite(Number(p.id)) ? Number(p.id) : Number.isFinite(Number(p.projects_id)) ? Number(p.projects_id) : Number.isFinite(Number(p.project_id)) ? Number(p.project_id) : undefined;
          return {
            id: p.uuid || String(p.id),
            numericId: numId,
            name: p.project_name || p.name || '',
            logo: getLogoUrl(p.logo, p.project_name || p.name || '', '6B8E23'),
            code: p.code || '',
            company: p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '',
            location: p.address || p.location || ''
          };
        });
        setPrProjects(transformed);
      })
      .catch(() => setPrProjects([]))
      .finally(() => setIsLoadingProjects(false));
  }, [showProjectSelection, currentView]);

  // Fetch subprojects when on subproject step with selected project (project-subproject POST per requirements)
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'subproject' || !prSelectedProject) {
      setPrSubprojects([]);
      return;
    }
    setIsLoadingSubprojects(true);
    const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
    masterDataAPI.getProjectSubprojects(projectId)
      .then((result: any) => {
        const list = Array.isArray(result) ? result : result?.subProject ?? result?.data ?? [];
        const transformed: PRSubproject[] = list.map((sub: any) => ({
          id: sub.uuid || String(sub.id),
          numericId: Number.isFinite(Number(sub.id)) ? Number(sub.id) : undefined,
          name: sub.name || sub.subproject_name || '',
          code: sub.code || `SUB${String(sub.id || '').padStart(3, '0')}`,
          project: prSelectedProject.name,
          manager: sub.manager || sub.project_manager || '',
          status: sub.status || 'pending'
        }));
        setPrSubprojects(transformed);
      })
      .catch(() => setPrSubprojects([]))
      .finally(() => setIsLoadingSubprojects(false));
  }, [currentView, prStep, prSelectedProject]);

  // Fetch materials when on materials step (materials-list GET per requirements)
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'materials') return;
    setIsLoadingMaterials(true);
    masterDataAPI.getMaterials()
      .then((fetched: any[]) => {
        const list = Array.isArray(fetched) ? fetched : [];
        const transformed: PRMaterial[] = list.map((m: any) => {
          const materialClass = m.class?.value || m.class || '';
          const unitObj = m.units || m.unit;
          const unitLabel = unitObj?.unit || unitObj?.name || (typeof m.unit === 'string' ? m.unit : '') || '';
          return {
            id: m.uuid || String(m.id),
            numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
            class: materialClass || 'B',
            code: m.code || '',
            name: m.name || '',
            specification: m.specification ?? '',
            unit: unitLabel
          };
        });
        setPrMaterials(transformed);
      })
      .catch(() => setPrMaterials([]))
      .finally(() => setIsLoadingMaterials(false));
  }, [currentView, prStep]);

  // Fetch project-to-store-list when Materials step loads - Req No comes from backend response
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'materials' || !prSelectedProject) return;
    const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
    const inventoryId = prEditingId ?? undefined;
    materialRequestAPI.projectToStoreList(projectId, [], 'material_request', inventoryId)
      .then((res: any) => {
        const reqNo = res?.request_no ?? res?.request_id ?? res?.req_no ?? res?.data?.request_no ?? res?.data?.request_id ?? res?.data?.req_no;
        if (reqNo != null && String(reqNo).trim()) setPrReqNo(String(reqNo).trim());
      })
      .catch(() => { /* optional, ignore errors */ });
  }, [currentView, prStep, prSelectedProject, prEditingId]);

  // Fetch all activities for Tag Activity dropdown (activities-list or project-wise-activities per requirements)
  // Activities are project-scoped: pass project/subproject IDs so backend returns the correct list
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'materials') return;
    if (!prSelectedProject) return; // Need project to fetch activities
    setIsLoadingActivities(true);
    const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
    const subprojectId = prSelectedSubproject ? (prSelectedSubproject.numericId ?? prSelectedSubproject.id) : undefined;
    masterDataAPI.getActivities(projectId, subprojectId)
      .then((res) => {
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        const transformed: PRActivity[] = (Array.isArray(list) ? list : []).map((a: any) => ({
          id: a.uuid || String(a.id),
          numericId: Number.isFinite(Number(a.id)) ? Number(a.id) : undefined,
          name: a.name || a.activity_name || a.activities || ''
        })).filter((a: PRActivity) => a.name);
        setPrActivities(transformed);
      })
      .catch(() => setPrActivities([]))
      .finally(() => setIsLoadingActivities(false));
  }, [currentView, prStep, prSelectedProject, prSelectedSubproject, prEditingId]);

  // Fetch Material Requests list for INVENTORY_PR main view
  const fetchPrList = () => {
    if (currentView !== ViewType.INVENTORY_PR) return;
    setIsLoadingPrList(true);
    materialRequestAPI.list()
      .then((data) => setPrList(Array.isArray(data) ? data : []))
      .catch(() => setPrList([]))
      .finally(() => setIsLoadingPrList(false));
  };

  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR) return;
    fetchPrList();
  }, [currentView]);

  const fetchRfqList = () => {
    if (currentView !== ViewType.INVENTORY_RFQ) return;
    setIsLoadingRfqList(true);
    rfqAPI.list()
      .then((data) => setRfqList(Array.isArray(data) ? data : []))
      .catch(() => setRfqList([]))
      .finally(() => setIsLoadingRfqList(false));
  };

  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_RFQ) return;
    fetchRfqList();
  }, [currentView]);

  const fetchReturnList = () => {
    if (currentView !== ViewType.INVENTORY_ISSUE_RETURN) return;
    setIsLoadingReturnList(true);
    goodsReturnAPI.list()
      .then((data) => setReturnList(Array.isArray(data) ? data : []))
      .catch(() => setReturnList([]))
      .finally(() => setIsLoadingReturnList(false));
  };

  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_ISSUE_RETURN) return;
    fetchReturnList();
  }, [currentView]);

  const fetchIssueList = () => {
    if (currentView !== ViewType.INVENTORY_ISSUE_SLIP) return;
    setIsLoadingIssueList(true);
    goodsIssueAPI.list()
      .then((data) => setIssueList(Array.isArray(data) ? data : []))
      .catch(() => setIssueList([]))
      .finally(() => setIsLoadingIssueList(false));
  };

  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_ISSUE_SLIP) return;
    fetchIssueList();
  }, [currentView]);

  const fetchGrnList = () => {
    if (currentView !== ViewType.INVENTORY_GRN_MRN_SLIP) return;
    setIsLoadingGrnList(true);
    goodsReceiptAPI.list()
      .then((data) => setGrnList(Array.isArray(data) ? data : []))
      .catch(() => setGrnList([]))
      .finally(() => setIsLoadingGrnList(false));
  };

  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_GRN_MRN_SLIP) return;
    fetchGrnList();
  }, [currentView]);

  const filteredRfqList = useMemo(() => {
    if (!inventorySearchQuery.trim() || currentView !== ViewType.INVENTORY_RFQ) return rfqList;
    const q = inventorySearchQuery.toLowerCase();
    return rfqList.filter(
      (r: any) =>
        (r.rfq_no ?? r.request_no ?? r.id ?? '').toString().toLowerCase().includes(q) ||
        (r.date ?? '').toLowerCase().includes(q) ||
        (r.projects_id?.project_name ?? r.project_name ?? '').toLowerCase().includes(q)
    );
  }, [rfqList, inventorySearchQuery, currentView]);

  const filteredReturnList = useMemo(() => {
    if (!inventorySearchQuery.trim() || currentView !== ViewType.INVENTORY_ISSUE_RETURN) return returnList;
    const q = inventorySearchQuery.toLowerCase();
    return returnList.filter(
      (r: any) =>
        (r.code ?? r.return_no ?? r.name ?? r.id ?? '').toString().toLowerCase().includes(q) ||
        (r.date ?? '').toLowerCase().includes(q) ||
        (r.projects_id?.project_name ?? r.project_name ?? '').toLowerCase().includes(q)
    );
  }, [returnList, inventorySearchQuery, currentView]);

  const filteredIssueList = useMemo(() => {
    if (!inventorySearchQuery.trim() || currentView !== ViewType.INVENTORY_ISSUE_SLIP) return issueList;
    const q = inventorySearchQuery.toLowerCase();
    return issueList.filter(
      (r: any) =>
        (r.issue_no ?? r.name ?? r.id ?? '').toString().toLowerCase().includes(q) ||
        (r.date ?? '').toLowerCase().includes(q) ||
        (r.projects_id?.project_name ?? r.project_name ?? '').toLowerCase().includes(q)
    );
  }, [issueList, inventorySearchQuery, currentView]);

  const filteredGrnList = useMemo(() => {
    if (!inventorySearchQuery.trim() || currentView !== ViewType.INVENTORY_GRN_MRN_SLIP) return grnList;
    const q = inventorySearchQuery.toLowerCase();
    return grnList.filter(
      (r: any) =>
        (r.grn_no ?? r.name ?? r.id ?? '').toString().toLowerCase().includes(q) ||
        (r.date ?? '').toLowerCase().includes(q) ||
        (r.projects_id?.project_name ?? r.project_name ?? '').toLowerCase().includes(q)
    );
  }, [grnList, inventorySearchQuery, currentView]);

  const filteredPrList = useMemo(() => {
    if (!prSearchQuery.trim()) return prList;
    const q = prSearchQuery.toLowerCase();
    return prList.filter(
      (pr: any) =>
        (pr.request_no ?? pr.request_id ?? '').toString().toLowerCase().includes(q) ||
        (pr.date ?? pr.name ?? '').toLowerCase().includes(q) ||
        (pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? pr.projects?.name ?? '').toLowerCase().includes(q) ||
        (pr.sub_projects?.name ?? pr.subproject?.name ?? '').toLowerCase().includes(q) ||
        (pr.users?.name ?? pr.created_by ?? pr.user?.name ?? '').toLowerCase().includes(q)
    );
  }, [prList, prSearchQuery]);

  const paginatedPrList = useMemo(() => {
    const start = (prListPage - 1) * PR_PAGE_SIZE;
    return filteredPrList.slice(start, start + PR_PAGE_SIZE);
  }, [filteredPrList, prListPage]);
  const paginatedRfqList = useMemo(() => {
    const start = (rfqListPage - 1) * RFQ_PAGE_SIZE;
    return filteredRfqList.slice(start, start + RFQ_PAGE_SIZE);
  }, [filteredRfqList, rfqListPage]);
  const paginatedGrnList = useMemo(() => {
    const start = (grnListPage - 1) * inventoryEntriesPerPage;
    return filteredGrnList.slice(start, start + inventoryEntriesPerPage);
  }, [filteredGrnList, grnListPage, inventoryEntriesPerPage]);
  const paginatedReturnList = useMemo(() => {
    const start = (returnListPage - 1) * inventoryEntriesPerPage;
    return filteredReturnList.slice(start, start + inventoryEntriesPerPage);
  }, [filteredReturnList, returnListPage, inventoryEntriesPerPage]);
  const paginatedIssueList = useMemo(() => {
    const start = (issueListPage - 1) * inventoryEntriesPerPage;
    return filteredIssueList.slice(start, start + inventoryEntriesPerPage);
  }, [filteredIssueList, issueListPage, inventoryEntriesPerPage]);

  const paginatedPrEditModal = useMemo(() => {
    const start = (prEditModalPage - 1) * INVENTORY_LIST_PAGE_SIZE;
    return filteredPrList.slice(start, start + INVENTORY_LIST_PAGE_SIZE);
  }, [filteredPrList, prEditModalPage]);
  const paginatedRfqEditModal = useMemo(() => {
    const start = (rfqEditModalPage - 1) * INVENTORY_LIST_PAGE_SIZE;
    return filteredRfqList.slice(start, start + INVENTORY_LIST_PAGE_SIZE);
  }, [filteredRfqList, rfqEditModalPage]);
  const paginatedReturnEditModal = useMemo(() => {
    const start = (returnEditModalPage - 1) * INVENTORY_LIST_PAGE_SIZE;
    return filteredReturnList.slice(start, start + INVENTORY_LIST_PAGE_SIZE);
  }, [filteredReturnList, returnEditModalPage]);
  const paginatedGrnEditModal = useMemo(() => {
    const start = (grnEditModalPage - 1) * INVENTORY_LIST_PAGE_SIZE;
    return filteredGrnList.slice(start, start + INVENTORY_LIST_PAGE_SIZE);
  }, [filteredGrnList, grnEditModalPage]);
  const paginatedIssueEditModal = useMemo(() => {
    const start = (issueEditModalPage - 1) * INVENTORY_LIST_PAGE_SIZE;
    return filteredIssueList.slice(start, start + INVENTORY_LIST_PAGE_SIZE);
  }, [filteredIssueList, issueEditModalPage]);

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return prProjects;
    const q = projectSearchQuery.toLowerCase();
    return prProjects.filter(
      p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q)
    );
  }, [prProjects, projectSearchQuery]);

  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * PROJECT_PAGE_SIZE;
    return filteredProjects.slice(start, start + PROJECT_PAGE_SIZE);
  }, [filteredProjects, projectPage]);

  const filteredSubprojects = useMemo(() => {
    if (!subprojectSearchQuery.trim()) return prSubprojects;
    const q = subprojectSearchQuery.toLowerCase();
    return prSubprojects.filter(
      s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.manager || '').toLowerCase().includes(q)
    );
  }, [prSubprojects, subprojectSearchQuery]);

  const paginatedSubprojects = useMemo(() => {
    const start = (subprojectPage - 1) * SUBPROJECT_PAGE_SIZE;
    return filteredSubprojects.slice(start, start + SUBPROJECT_PAGE_SIZE);
  }, [filteredSubprojects, subprojectPage]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return prMaterials;
    const q = materialSearchQuery.toLowerCase();
    return prMaterials.filter(
      m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.code || '').toLowerCase().includes(q) ||
        (m.class || '').toLowerCase().includes(q) ||
        (m.specification || '').toLowerCase().includes(q) ||
        (m.unit || '').toLowerCase().includes(q)
    );
  }, [prMaterials, materialSearchQuery]);

  const paginatedMaterials = useMemo(() => {
    const start = (materialPage - 1) * MATERIAL_PAGE_SIZE;
    return filteredMaterials.slice(start, start + MATERIAL_PAGE_SIZE);
  }, [filteredMaterials, materialPage]);

  const getPRCreationDate = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const handlePRCreateNew = () => {
    setPrEditingId(null);
    setPrIsEditMode(false);
    setPrSelectedMaterials(new Map());
    setPrMaterials([]);
    setPrReqNo(`PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`);
    setShowProjectSelection(true);
    setPrStep('project');
    setPrSelectedProject(null);
    setPrSelectedSubproject(null);
    setProjectSearchQuery('');
    setProjectPage(1);
  };

  const handleInventoryCreateNew = () => {
    setPrStep('project');
    setPrSelectedProject(null);
    setProjectSearchQuery('');
    setProjectPage(1);
    setShowProjectSelection(true);
  };

  const handlePRSelectProject = (project: PRProject) => {
    setPrSelectedProject(project);
  };

  const handlePRProjectStepNext = (projectOverride?: PRProject) => {
    const project = projectOverride ?? prSelectedProject;
    if (!project) return;
    if (projectOverride) setPrSelectedProject(project);
    if (currentView === ViewType.INVENTORY_RFQ) {
      handlePRCloseModal();
      const numericId = project.numericId != null ? String(project.numericId) : '';
      const projectId = String(project.id ?? project.numericId);
      const params = new URLSearchParams({ projectId, projectName: project.name });
      if (numericId) params.set('projectNumericId', numericId);
      router.push(`/inventory-reports/rfq/create?${params.toString()}`);
      return;
    }
    if (currentView === ViewType.INVENTORY_ISSUE_RETURN) {
      handlePRCloseModal();
      const numericId = project.numericId != null ? String(project.numericId) : '';
      const projectId = String(project.id ?? project.numericId);
      const params = new URLSearchParams({ projectId, projectName: project.name });
      if (numericId) params.set('projectNumericId', numericId);
      router.push(`/inventory-reports/issue-return/create?${params.toString()}`);
      return;
    }
    if (currentView === ViewType.INVENTORY_ISSUE_SLIP) {
      handlePRCloseModal();
      const numericId = project.numericId != null ? String(project.numericId) : '';
      const projectId = String(project.id ?? project.numericId);
      const params = new URLSearchParams({ projectId, projectName: project.name });
      if (numericId) params.set('projectNumericId', numericId);
      router.push(`/inventory-reports/issue-slip/create?${params.toString()}`);
      return;
    }
    if (currentView === ViewType.INVENTORY_GRN_MRN_SLIP) {
      handlePRCloseModal();
      const numericId = project.numericId != null ? String(project.numericId) : '';
      const projectId = String(project.id ?? project.numericId);
      const params = new URLSearchParams({ projectId, projectName: project.name });
      if (numericId) params.set('projectNumericId', numericId);
      router.push(`/inventory-reports/grn-mrn-slip/create?${params.toString()}`);
      return;
    }
    if (currentView !== ViewType.INVENTORY_PR) {
      handlePRCloseModal();
      toast.showSuccess(`Project "${project.name}" selected. Create flow for this section coming soon.`);
      return;
    }
    setPrStep('subproject');
  };

  const handlePRCloseModal = () => {
    setShowProjectSelection(false);
    setPrStep('project');
    setPrPdfUrl(null);
    setPrSelectedProject(null);
    setPrSelectedSubproject(null);
    setPrSelectedMaterials(new Map());
    setPrEditingId(null);
    setPrIsEditMode(false);
    setPrReqNo('');
    setProjectSearchQuery('');
    setProjectPage(1);
    setMaterialSearchQuery('');
    setMaterialPage(1);
  };

  const handlePRProjectStepBack = () => handlePRCloseModal();

  const handlePRSubprojectStepBack = () => {
    setPrStep('project');
    setPrSelectedProject(null);
    setPrSelectedSubproject(null);
    setPrSubprojects([]);
    setSubprojectSearchQuery('');
    setSubprojectPage(1);
  };

  const handlePRSubprojectStepNext = async (subprojectOverride?: PRSubproject) => {
    if (!prSelectedProject) return;
    const subproject = subprojectOverride ?? prSelectedSubproject;
    if (prSubprojects.length > 0 && !subproject) {
      toast.showWarning('Please select a subproject to continue. Subproject selection is mandatory when the project has subprojects.');
      return;
    }
    if (subprojectOverride) setPrSelectedSubproject(subprojectOverride);
    const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
    const subprojectId = subproject ? (subproject.numericId ?? subproject.id) : undefined;
    if (!prEditingId) {
      try {
        setIsSubmittingPR(true);
        const headerData: { projects_id: string | number; sub_projects_id?: string | number } = { projects_id: projectId };
        if (subprojectId) headerData.sub_projects_id = subprojectId;
        const header = await materialRequestAPI.add(headerData);
        const materialRequestId = header?.id ?? header?.data?.id;
        if (!materialRequestId) throw new Error('Failed to create PR header: no ID returned');
        setPrEditingId(materialRequestId);
        setPrIsEditMode(false); // Create flow: show Submit
        // Req No comes from project-to-store-list when Materials step loads
      } catch (error: any) {
        toast.showError(error?.message || 'Failed to create purchase request.');
        return;
      } finally {
        setIsSubmittingPR(false);
      }
    }
    setPrStep('materials');
    setMaterialSearchQuery('');
    setMaterialPage(1);
  };

  const handlePRMaterialsStepBack = () => {
    setPrStep('subproject');
    setMaterialSearchQuery('');
    setMaterialPage(1);
    if (!prEditingId) setPrSelectedMaterials(new Map()); // Don't clear when editing - preserve loaded data
  };

  const handlePRToggleMaterial = (mat: PRMaterial) => {
    setPrSelectedMaterials(prev => {
      const newMap = new Map(prev);
      if (newMap.has(mat.id)) {
        newMap.delete(mat.id);
      } else {
        newMap.set(mat.id, {
          materialId: mat.id,
          materialNumericId: mat.numericId,
          materialName: mat.name,
          quantity: 0,
          requiredDate: '',
          activityId: '',
          activityName: '',
          remark: ''
        });
      }
      return newMap;
    });
  };

  const handlePRMaterialQuantityChange = (materialId: string, quantity: number) => {
    setPrSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const m = newMap.get(materialId);
      if (m) newMap.set(materialId, { ...m, quantity });
      return newMap;
    });
  };

  const handlePRMaterialRequiredDateChange = (materialId: string, requiredDate: string) => {
    setPrSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const m = newMap.get(materialId);
      if (m) newMap.set(materialId, { ...m, requiredDate });
      return newMap;
    });
  };

  const handlePRMaterialActivityChange = (materialId: string, activityId: string, activityName: string) => {
    setPrSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const m = newMap.get(materialId);
      if (m) newMap.set(materialId, { ...m, activityId, activityName });
      return newMap;
    });
  };

  const handlePRMaterialRemarkChange = (materialId: string, remark: string) => {
    setPrSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const m = newMap.get(materialId);
      if (m) newMap.set(materialId, { ...m, remark });
      return newMap;
    });
  };

  const handlePRMaterialsStepNext = async () => {
    const withoutQuantity = Array.from(prSelectedMaterials.values()).filter(
      (m) => m.quantity == null || m.quantity <= 0
    );
    if (withoutQuantity.length > 0) {
      const names = withoutQuantity.map((m) => m.materialName).join(', ');
      toast.showWarning(`Quantity is required for all selected materials. Please enter quantity for: ${names}`);
      return;
    }
    const withoutDate = Array.from(prSelectedMaterials.values()).filter(
      (m) => !m.requiredDate || !String(m.requiredDate).trim()
    );
    if (withoutDate.length > 0) {
      const names = withoutDate.map((m) => m.materialName).join(', ');
      toast.showWarning(`Required date is mandatory. Please select date for: ${names}`);
      return;
    }
    if (prSelectedMaterials.size === 0) {
      toast.showWarning('Please select at least one material for the purchase request.');
      return;
    }
    if (!prSelectedProject) return;
    if (!prEditingId) {
      toast.showError('Purchase request header not found. Please go back and try again.');
      return;
    }
    setIsSubmittingPR(true);
    try {
      const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
      const subprojectId = prSelectedSubproject ? (prSelectedSubproject.numericId ?? prSelectedSubproject.id) : undefined;
      const details = Array.from(prSelectedMaterials.values()).map((m) => ({
        inventoryId: prEditingId,
        material_id: m.materialNumericId ?? m.materialId,
        projects_id: projectId,
        qty: m.quantity,
        ...(subprojectId ? { sub_projects_id: subprojectId } : {}),
        ...(m.activityId ? { activities_id: m.activityId } : {}),
        ...(m.requiredDate ? { date: String(m.requiredDate).replace(/-/g, '/') } : {}), // YYYY/MM/DD per requirements
        ...(m.remark ? { remarks: m.remark } : {}),
      }));
      await materialRequestAPI.detailsAdd(details);
      toast.showSuccess(prEditingId ? 'Purchase request updated successfully.' : 'Purchase request created successfully.');
      try {
        const { pdf_url } = await materialRequestAPI.generatePdf(prEditingId);
        const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
        setPrPdfUrl(fullUrl);
        setPrStep('success');
      } catch {
        setPrPdfUrl(null);
        setPrStep('success');
      }
      fetchPrList();
    } catch (error: any) {
      toast.showError(error?.message || 'Failed to create purchase request');
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handlePROpenCreateProject = () => setShowCreateProjectModal(true);
  const handlePROpenCreateSubproject = () => setShowCreateSubprojectModal(true);
  const handlePRSubprojectCreated = (newSub: any) => {
    setPrSubprojects(prev => [...prev, {
      id: newSub.id || String(Date.now()),
      numericId: newSub.numericId ?? newSub.id,
      name: newSub.name || newSub.subproject_name || '',
      code: newSub.code || '',
      project: prSelectedProject?.name || '',
      manager: newSub.manager || '',
      status: newSub.status || 'pending'
    }]);
    setShowCreateSubprojectModal(false);
  };
  const handlePRProjectCreated = (newProject: any) => {
    setPrProjects(prev => [...prev, {
      id: newProject.id || newProject.uuid || String(Date.now()),
      numericId: newProject.numericId ?? newProject.id,
      name: newProject.name || newProject.project_name || '',
      logo: getLogoUrl(newProject.logo, newProject.name || newProject.project_name || '', '6B8E23'),
      code: newProject.code || '',
      company: newProject.company || '',
      location: newProject.location || ''
    }]);
    setShowCreateProjectModal(false);
  };

  const getFullPdfUrl = (url: string) => {
    if (!url) return '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
    return url.startsWith('http') ? url : apiBase.replace(/\/api\/?$/, '') + (url.startsWith('/') ? url : '/' + url);
  };

  const handlePRViewClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      const { pdf_url } = await materialRequestAPI.generatePdf(prId);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF opened in new tab.' : 'PDF generated.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load PDF.');
    }
  };

  /** Build quotes_details for RFQ PDF (same as SubmitQuotes success modal) */
  const buildRfqQuotesDetailsForPdf = (details: any[], mats: any[]) => {
    return details.map((row: any) => {
      const matId = row.materials?.id ?? row.materials_id ?? row.material_id ?? row.material?.id;
      const materials = row.materials ?? row.materials_request_details?.materials ?? row.material;
      const matched = matId != null && mats.length > 0 ? mats.find((m: any) => String(m.id ?? m.uuid ?? m.materials_id) === String(matId)) : null;
      return {
        id: row.id,
        materials_id: matId,
        materialCode: materials?.code ?? matched?.code ?? '',
        materialName: materials?.name ?? materials?.material_name ?? matched?.name ?? matched?.material_name ?? '',
        materialSpec: materials?.specification ?? matched?.specification ?? '',
        materialUnit: materials?.unit ?? materials?.units ?? matched?.unit ?? matched?.units ?? '',
        qty: row.qty ?? row.request_qty,
        request_qty: row.request_qty ?? row.qty,
        date: typeof (row.date ?? '') === 'string' && (row.date ?? '').includes('T') ? (row.date as string).split('T')[0] : (row.date ?? ''),
        price: row.price,
      };
    });
  };

  const generateRfqPdfWithDetails = async (rfqId: string, projId?: string) => {
    const [quoteData, mats] = await Promise.all([
      rfqAPI.get(rfqId, projId ?? undefined),
      masterDataAPI.getMaterials().then((m: any) => Array.isArray(m) ? m : []),
    ]);
    const inner = quoteData?.data ?? quoteData;
    const details = inner?.quotesdetails ?? inner?.quotes_details ?? inner?.details ?? inner?.quote_details ?? quoteData?.quotesdetails ?? quoteData?.quotes_details ?? quoteData?.details ?? quoteData?.quote_details ?? (Array.isArray(quoteData) ? quoteData : []);
    const arr = Array.isArray(details) ? details : [];
    const materialsLookup = Array.isArray(mats) ? mats : [];
    const quotesDetailsForPdf = arr.length > 0 ? buildRfqQuotesDetailsForPdf(arr, materialsLookup) : undefined;
    return rfqAPI.generatePdf(rfqId, quotesDetailsForPdf);
  };

  const handleRfqViewClick = async (rfq: any) => {
    const rfqId = rfq.id ?? rfq.uuid;
    if (!rfqId) return;
    try {
      const projId = rfq.projects_id != null ? (typeof rfq.projects_id === 'object' ? (rfq.projects_id as any)?.id : rfq.projects_id) : rfq.projects?.id;
      const { pdf_url } = await generateRfqPdfWithDetails(String(rfqId), projId ?? undefined);
      if (!pdf_url) throw new Error('No PDF URL returned');
      const fullUrl = getFullPdfUrl(pdf_url) || (pdf_url.startsWith('http') ? pdf_url : '');
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF opened in new tab.' : 'PDF generated.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleRfqShareClick = async (rfq: any) => {
    const rfqId = rfq.id ?? rfq.uuid;
    if (!rfqId) return;
    try {
      const projId = rfq.projects_id != null ? (typeof rfq.projects_id === 'object' ? (rfq.projects_id as any)?.id : rfq.projects_id) : rfq.projects?.id;
      const { pdf_url } = await generateRfqPdfWithDetails(String(rfqId), projId ?? undefined);
      if (!pdf_url) throw new Error('No PDF URL returned');
      const copied = await copyPdfUrl(pdf_url);
      if (copied) {
        toast.showSuccess('PDF link copied to clipboard.');
      } else {
        toast.showError('Could not copy to clipboard.');
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to share PDF.');
    }
  };

  /** Generate GRN PDF with details (same as success modal) */
  const generateGrnPdfWithDetails = async (grn: any) => {
    const grnId = grn?.id ?? grn?.uuid ?? grn?.inv_inwards_id;
    if (!grnId) throw new Error('No GRN ID');
    const editData = await goodsReceiptAPI.edit(grnId);
    const invInwardsId = typeof editData?.inv_inwards_id === 'object' && editData?.inv_inwards_id != null
      ? (editData.inv_inwards_id as any)?.id ?? (editData.inv_inwards_id as any)?.uuid
      : editData?.inv_inwards_id;
    const requestId = invInwardsId ?? editData?.id ?? grnId;
    const detailsList = editData?.InvInwardGoodDetails ?? editData?.details ?? editData?.inward_details ?? editData?.inward_goods ?? [];
    const inwardDetailsForPdf = Array.isArray(detailsList) && detailsList.length > 0
      ? detailsList.map((d: any) => {
          const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d?.assets ?? d;
          const matObj = typeof mat === 'object' && mat != null ? mat : {};
          return {
            id: d.id ?? undefined,
            materials_id: typeof matObj?.id !== 'undefined' ? matObj.id : d.materials_id ?? d.material_id,
            materialCode: matObj?.code ?? d?.code ?? '',
            materialName: matObj?.name ?? d?.name ?? '',
            materialSpec: matObj?.specification ?? d?.specification ?? '',
            materialUnit: matObj?.unit_id?.unit ?? matObj?.unit ?? matObj?.units?.unit ?? d?.unit ?? '',
            recipt_qty: d.recipt_qty ?? d.receipt_qty ?? 0,
            reject_qty: d.reject_qty ?? 0,
          };
        })
      : undefined;
    return goodsReceiptAPI.generatePdf(requestId, inwardDetailsForPdf);
  };

  const handleGrnViewPdfClick = async (grn: any) => {
    try {
      const { pdf_url } = await generateGrnPdfWithDetails(grn);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF opened in new tab.' : 'PDF generated.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleGrnShareClick = async (grn: any) => {
    try {
      const { pdf_url } = await generateGrnPdfWithDetails(grn);
      if (!pdf_url) throw new Error('No PDF URL returned');
      const copied = await copyPdfUrl(pdf_url);
      if (copied) {
        toast.showSuccess('PDF link copied to clipboard.');
      } else {
        toast.showError('Could not copy to clipboard.');
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to share PDF.');
    }
  };

  /** Generate Goods Return PDF with details (same as success modal) */
  const generateReturnPdfWithDetails = async (ret: any) => {
    const returnId = ret.inv_returns_id ?? ret.id ?? ret.uuid;
    if (!returnId) throw new Error('No return ID');
    const editData = await goodsReturnAPI.edit(returnId);
    const invReturnGoodsId = editData?.id ?? editData?.inv_return_goods_id ?? editData?.uuid;
    const detailsList = editData?.inv_return_details ?? editData?.InvReturnDetails ?? editData?.details ?? [];
    const detailsForPdf = Array.isArray(detailsList) && detailsList.length > 0
      ? detailsList.map((d: any) => {
          const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d;
          const matObj = typeof mat === 'object' && mat != null ? mat : {};
          const nested = (Array.isArray(d?.inv_return_details) ? d.inv_return_details[0] : null) ?? d?.inv_return_detail ?? d;
          const returnQty = d.return_qty ?? d.recipt_qty ?? d.receipt_qty ?? nested?.return_qty ?? nested?.recipt_qty ?? 0;
          return {
            inv_return_goods_id: d.inv_return_goods_id ?? invReturnGoodsId,
            materials_id: matObj?.id ?? d.materials_id ?? d.material_id,
            materialCode: matObj?.code ?? d?.code ?? '',
            materialName: matObj?.name ?? d?.name ?? '',
            materialSpec: matObj?.specification ?? d?.specification ?? '',
            materialUnit: matObj?.unit_id?.unit ?? matObj?.unit ?? matObj?.units?.unit ?? d?.unit ?? '',
            return_qty: returnQty,
            stock_qty: d.stock_qty ?? nested?.stock_qty ?? 0,
          };
        })
      : undefined;
    return goodsReturnAPI.generatePdf(returnId, detailsForPdf);
  };

  const handleReturnViewPdfClick = async (ret: any) => {
    try {
      const { pdf_url } = await generateReturnPdfWithDetails(ret);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF opened in new tab.' : 'PDF generated.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleReturnShareClick = async (ret: any) => {
    try {
      const { pdf_url } = await generateReturnPdfWithDetails(ret);
      if (!pdf_url) throw new Error('No PDF URL returned');
      const copied = await copyPdfUrl(pdf_url);
      if (copied) {
        toast.showSuccess('PDF link copied to clipboard.');
      } else {
        toast.showError('Could not copy to clipboard.');
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to share PDF.');
    }
  };

  /** Generate Goods Issue PDF with details (same as success modal) */
  const generateIssuePdfWithDetails = async (iss: any) => {
    const issueId = iss.inv_issue?.id ?? iss.inv_issues_id ?? iss.id ?? iss.uuid;
    if (!issueId) throw new Error('No issue ID');
    const editData = await goodsIssueAPI.edit(issueId);
    const header = editData?.inv_issue ?? editData;
    const invIssuesId = header?.id ?? header?.uuid ?? editData?.inv_issue_id ?? editData?.id ?? issueId;
    const invIssueListsId = editData?.inv_issue_lists_id?.id ?? editData?.inv_issue_lists_id ?? editData?.id ?? editData?.inv_issue_goods_id ?? issueId;
    const detailsList = editData?.inv_issue_details ?? editData?.details ?? editData?.issue_details ?? [];
    const detailsForPdf = Array.isArray(detailsList) && detailsList.length > 0
      ? detailsList.map((d: any) => {
          const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d;
          const matObj = typeof mat === 'object' && mat != null ? mat : {};
          return {
            materials_id: matObj?.id ?? d.materials_id ?? d.material_id,
            materialCode: matObj?.code ?? d?.code ?? '',
            materialName: matObj?.name ?? d?.name ?? '',
            materialSpec: matObj?.specification ?? d?.specification ?? '',
            materialUnit: matObj?.unit_id?.unit ?? matObj?.unit ?? matObj?.units?.unit ?? d?.unit ?? '',
            issue_qty: d.issue_qty ?? d.qty ?? 0,
            stock_qty: d.stock_qty ?? 0,
            activityName: d.activities?.name ?? d.activity_name ?? d.activities_id?.name ?? '',
          };
        })
      : undefined;
    return goodsIssueAPI.generatePdf(invIssuesId, invIssueListsId, detailsForPdf);
  };

  const handleIssueViewPdfClick = async (iss: any) => {
    try {
      const { pdf_url } = await generateIssuePdfWithDetails(iss);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF opened in new tab.' : 'PDF generated.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleIssueShareClick = async (iss: any) => {
    try {
      const { pdf_url } = await generateIssuePdfWithDetails(iss);
      if (!pdf_url) throw new Error('No PDF URL returned');
      const copied = await copyPdfUrl(pdf_url);
      if (copied) {
        toast.showSuccess('PDF link copied to clipboard.');
      } else {
        toast.showError('Could not copy to clipboard.');
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to share PDF.');
    }
  };

  const handlePRShareClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      const { pdf_url } = await materialRequestAPI.generatePdf(prId);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      if (!fullUrl) throw new Error('No PDF URL');
      const res = await fetch(fullUrl, { mode: 'cors', credentials: 'include' });
      const blob = await res.blob();
      const file = new File([blob], `pr-${prId}.pdf`, { type: 'application/pdf' });
      const canShareFiles = 'share' in navigator && ('canShare' in navigator ? navigator.canShare({ files: [file] }) : true);
      if (canShareFiles) {
        await navigator.share({ title: 'Purchase Request', text: 'Material Request PDF', files: [file] });
        toast.showSuccess('Shared successfully.');
      } else {
        await navigator.clipboard.writeText(fullUrl);
        toast.showSuccess('PDF link copied to clipboard.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        try {
          const { pdf_url } = await materialRequestAPI.generatePdf(prId);
          const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
          if (fullUrl) { await navigator.clipboard.writeText(fullUrl); toast.showSuccess('Link copied to clipboard.'); }
        } catch {
          toast.showError(e?.message || 'Failed to share PDF.');
        }
      }
    }
  };

  const handlePREditClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      setShowEditPreviousModal(false);
      setIsLoadingEditPr(true);
      setPrEditingId(prId); // Set early so useEffects don't overwrite our loaded data
      setPrIsEditMode(true);
      setShowProjectSelection(true);
      setPrStep('materials');
      const projId = (typeof pr.projects_id === 'object' && pr.projects_id != null) ? (pr.projects_id as any).id : (pr.projects_id ?? pr.project_id ?? pr.projects?.id);
      const editResp = await materialRequestAPI.edit(prId, projId ?? undefined);
      const detailsFromEdit = Array.isArray(editResp) ? editResp : (editResp && typeof editResp === 'object' && Array.isArray((editResp as any).data) ? (editResp as any).data : []);
      const firstDetail = detailsFromEdit.length > 0 ? detailsFromEdit[0] : null;
      const projectsIdRaw = firstDetail?.projects_id ?? pr.projects_id ?? pr.projects?.id;
      const projectId = (typeof projectsIdRaw === 'object' && projectsIdRaw !== null && projectsIdRaw !== undefined && 'id' in projectsIdRaw) ? (projectsIdRaw as any).id : projectsIdRaw;
      const subProjIdRaw = firstDetail?.sub_projects_id ?? pr.sub_projects_id ?? pr.sub_projects?.id;
      const subProjId = (typeof subProjIdRaw === 'object' && subProjIdRaw !== null && subProjIdRaw !== undefined && 'id' in subProjIdRaw) ? (subProjIdRaw as any).id : subProjIdRaw;
      const [fetchedProjects, subprojResult, materialsList, detailsListResp, activitiesResp] = await Promise.all([
        masterDataAPI.getProjects(),
        projectId ? masterDataAPI.getProjectSubprojects(projectId) : Promise.resolve([]),
        masterDataAPI.getMaterials(),
        projectId ? materialRequestAPI.detailsList(projectId).catch(() => []) : Promise.resolve([]),
        masterDataAPI.getActivities(projectId, subProjId).catch(() => ({ data: [] }))
      ]);
      if (!projectId) {
        toast.showError('Purchase request has no project.');
        setPrEditingId(null);
        setPrIsEditMode(false);
        setIsLoadingEditPr(false);
        return;
      }
      const projectsList = Array.isArray(fetchedProjects) ? fetchedProjects : [];
      const p = projectsList.find((x: any) => String(x.id ?? x.uuid) === String(projectId));
      if (!p) {
        toast.showError('Project not found.');
        setPrEditingId(null);
        setPrIsEditMode(false);
        setIsLoadingEditPr(false);
        return;
      }
      const proj: PRProject = {
        id: p.uuid ?? String(p.id),
        numericId: Number.isFinite(Number(p.id)) ? Number(p.id) : undefined,
        name: p.project_name ?? p.name ?? '',
        logo: getLogoUrl(p.logo, p.project_name ?? p.name ?? '', '6B8E23'),
        code: p.code ?? '',
        company: p.companies?.registration_name ?? p.companies?.name ?? p.company ?? '',
        location: p.address ?? p.location ?? ''
      };
      const subprojList = Array.isArray(subprojResult) ? subprojResult : (subprojResult as any)?.subProject ?? (subprojResult as any)?.data ?? [];
      const sub = subProjId ? subprojList.find((s: any) => String(s.id) === String(subProjId)) : null;
      const subproj = sub ? { id: sub.uuid ?? String(sub.id), numericId: sub.id, name: sub.name ?? sub.subproject_name ?? '', code: sub.code ?? '', project: proj.name, manager: '', status: 'pending' as const } : null;
      const materials = Array.isArray(materialsList) ? materialsList : [];
      const prMats: PRMaterial[] = materials.map((m: any) => {
        const unitObj = m.units ?? m.unit;
        const unitLabel = unitObj?.unit ?? unitObj?.name ?? (typeof m.unit === 'string' ? m.unit : '') ?? '';
        return {
          id: m.uuid ?? String(m.id),
          numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
          class: (m.class?.value ?? m.class ?? 'B') as string,
          code: m.code ?? '',
          name: m.name ?? '',
          specification: m.specification ?? '',
          unit: unitLabel
        };
      });
      setPrMaterials(prMats);
      let details: any[] = [];
      if (detailsFromEdit.length > 0) {
        details = detailsFromEdit.filter((d: any) => String(d.material_requests_id ?? d.material_request_id ?? '') === String(prId));
        if (details.length === 0) details = detailsFromEdit;
      } else if (Array.isArray(detailsListResp) && detailsListResp.length > 0) {
        const mrIdKeys = ['material_requests_id', 'material_request_id', 'inventories_id', 'inventory_id', 'inventoryId'];
        details = detailsListResp.filter((d: any) => {
          const dMrId = mrIdKeys.map((k) => (d as any)[k]).find((v) => v != null) ?? (d as any).material_request?.id ?? (d as any).inventory?.id ?? (d as any).material_request_id;
          return String(dMrId ?? '') === String(prId);
        });
      } else if (detailsListResp && typeof detailsListResp === 'object') {
        const r = detailsListResp as any;
        const arr = Array.isArray(r.data) ? r.data : Array.isArray(r.details) ? r.details : Array.isArray(r.items) ? r.items : Array.isArray(r.materials) ? r.materials : [];
        const mrIdKeys = ['material_requests_id', 'material_request_id', 'inventories_id', 'inventory_id', 'inventoryId'];
        details = arr.filter((d: any) => {
          const dMrId = mrIdKeys.map((k) => (d as any)[k]).find((v) => v != null) ?? (d as any).material_request?.id ?? (d as any).inventory?.id;
          return String(dMrId ?? '') === String(prId);
        });
      }
      const selectedMap = new Map<string, PRSelectedMaterial>();
      const collectedMatIds = new Set<string | number>();
      for (const d of details) {
        const matId = d.materials_id ?? d.material_id ?? d.materials?.id ?? d.material?.id ?? (d.materials as any)?.id ?? d.id;
        if (matId != null) collectedMatIds.add(matId);
        const mat = prMats.find((m) => String(m.numericId ?? m.id) === String(matId) || String(m.id) === String(matId));
        if (!mat) continue;
        const qty = Number(d.qty ?? d.quantity ?? 0) || 0;
        const reqDate = (d.date ?? d.required_date ?? d.requiredDate ?? '') ? String(d.date ?? d.required_date ?? d.requiredDate).split('T')[0] : '';
        const actRaw = d.activities_id ?? d.activity_id;
        const actId = actRaw != null ? String(typeof actRaw === 'object' ? (actRaw as any)?.id ?? actRaw : actRaw) : '';
        const rem = d.remarks ?? d.remark ?? '';
        selectedMap.set(mat.id, {
          materialId: mat.id,
          materialNumericId: mat.numericId,
          materialName: mat.name,
          quantity: qty,
          requiredDate: reqDate,
          activityId: actId,
          activityName: '',
          remark: rem
        });
      }
      if (selectedMap.size === 0) {
        const materialIdsToFetch = collectedMatIds.size > 0
          ? Array.from(collectedMatIds)
          : prMats.map((m) => m.numericId ?? m.id).filter((v) => v != null);
        if (materialIdsToFetch.length > 0) {
          try {
            const editResp = await materialRequestAPI.detailsEdit(prId, materialIdsToFetch, projectId);
            const editData = Array.isArray(editResp) ? editResp : (editResp as any)?.data ?? (editResp as any)?.details ?? (editResp as any)?.materials ?? [];
            for (const item of editData) {
              const d = item?.materialsRequestDetails ?? item?.material_request_details ?? item?.details;
              const detail = (d && (!Array.isArray(d) || d.length > 0)) ? (Array.isArray(d) ? d[0] : d) : null;
              if (!detail && (item?.qty == null && item?.date == null)) continue;
              const matId = item?.id ?? item?.materials_id ?? item?.material_id ?? detail?.materials_id ?? detail?.material_id ?? detail?.materialId;
              const mat = prMats.find((m) => String(m.numericId ?? m.id) === String(matId ?? item?.id) || String(m.id) === String(matId ?? item?.id));
              if (!mat) continue;
              const qty = Number(detail?.qty ?? detail?.quantity ?? item?.qty ?? 0) || 0;
              const reqDate = (detail?.date ?? detail?.required_date ?? item?.date ?? '') ? String(detail?.date ?? detail?.required_date ?? item?.date ?? '').split('T')[0] : '';
              const actRaw = detail?.activities_id ?? detail?.activity_id ?? item?.activities_id;
              const actId = actRaw != null ? String(typeof actRaw === 'object' ? (actRaw as any)?.id ?? actRaw : actRaw) : '';
              const rem = detail?.remarks ?? detail?.remark ?? item?.remarks ?? '';
              selectedMap.set(mat.id, {
                materialId: mat.id,
                materialNumericId: mat.numericId,
                materialName: mat.name,
                quantity: qty,
                requiredDate: reqDate,
                activityId: actId,
                activityName: '',
                remark: rem
              });
            }
          } catch (_) { /* ignore */ }
        }
      }
      const activitiesList = Array.isArray(activitiesResp?.data ?? activitiesResp) ? (activitiesResp?.data ?? activitiesResp) : [];
      const activitiesTransformed: PRActivity[] = activitiesList.map((a: any) => ({
        id: a.uuid || String(a.id),
        numericId: Number.isFinite(Number(a.id)) ? Number(a.id) : undefined,
        name: a.name || a.activity_name || ''
      })).filter((a: PRActivity) => a.name);
      setPrActivities(activitiesTransformed);
      for (const [matId, sel] of selectedMap) {
        if (sel.activityId) {
          const act = activitiesTransformed.find((a) => String(a.numericId ?? a.id) === sel.activityId);
          if (act) sel.activityName = act.name;
        }
      }
      const subprojArr = subproj ? [subproj] : [];
      setPrSubprojects(subprojArr);
      setPrSelectedProject(proj);
      setPrSelectedSubproject(subproj);
      // Req No comes from project-to-store-list when Materials step loads
      setPrSelectedMaterials(selectedMap);
    } catch (e) {
      toast.showError('Failed to load purchase request for editing.');
      setPrEditingId(null);
      setPrIsEditMode(false);
      setShowProjectSelection(false);
    } finally {
      setIsLoadingEditPr(false);
    }
  };

  // Handle AI Agents separately - return null as it's handled by the page component
  if (currentView === ViewType.AI_AGENTS) {
    return null;
  }

  const getViewConfig = (): ViewConfig => {
    switch (currentView) {
      case ViewType.COMPANY_USERS:
      case ViewType.MANAGE_TEAMS:
        return {
          title: currentView === ViewType.COMPANY_USERS ? 'Company Users' : 'Manage Teams',
          icon: Users,
          description: 'Manage company users and team assignments',
          columns: ['Name', 'Email', 'Role', 'Team', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Users',
          emptyStateMessage: 'User data will appear here once available'
        };
      case ViewType.USER_ROLES_PERMISSIONS:
        return {
          title: 'User Roles and Permissions',
          icon: ShieldCheck,
          description: 'Configure user roles and their permissions',
          columns: ['Role Name', 'Description', 'Users', 'Permissions', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Roles',
          emptyStateMessage: 'Role data will appear here once configured'
        };
      case ViewType.PROJECT_PERMISSIONS:
        return {
          title: 'Project Permissions',
          icon: ShieldCheck,
          description: 'Manage project-level access and permissions',
          columns: ['Project', 'User/Role', 'Permission Type', 'Access Level', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Project Permissions',
          emptyStateMessage: 'Project permission data will appear here once configured'
        };
      case ViewType.PR_MANAGEMENT:
      case ViewType.PR_APPROVAL_MANAGE:
        return {
          title: currentView === ViewType.PR_MANAGEMENT ? 'PR Management' : 'PR Approval Manage',
          icon: ClipboardCheck,
          description: 'Manage purchase requisitions and approvals',
          columns: ['PR Number', 'Requested By', 'Department', 'Amount', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No PR Data',
          emptyStateMessage: 'Purchase requisition data will appear here once available'
        };
      case ViewType.PR:
        return {
          title: 'PR',
          icon: FileText,
          description: 'Purchase requisition details and management',
          columns: ['PR Number', 'Date', 'Items', 'Total Amount', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No PR Data',
          emptyStateMessage: 'Purchase requisition data will appear here once available'
        };
      case ViewType.INVENTORY_PR:
        return {
          title: 'Purchase Request',
          icon: ClipboardCheck,
          description: 'Create and manage purchase requisitions',
          columns: ['PR Number', 'Date', 'Project', 'Items', 'Total Amount', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Purchase Requests',
          emptyStateMessage: 'Create your first purchase request using the Create New button above'
        };
      case ViewType.INVENTORY_RFQ:
        return {
          title: 'RFQ',
          icon: FileText,
          description: 'Create and manage request for quotations',
          columns: ['RFQ No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No RFQs',
          emptyStateMessage: 'Create your first RFQ using the Create New button above'
        };
      case ViewType.INVENTORY_GRN_MRN_SLIP:
        return {
          title: 'Goods Receipt (GRN/MRN)',
          icon: Package,
          description: 'Create and manage goods receipt notes',
          columns: ['Slip No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Goods Receipts',
          emptyStateMessage: 'Create your first goods receipt using the Create New button above'
        };
      case ViewType.INVENTORY_GRN_MRN_DETAILS:
        return {
          title: 'GRN(MRN) Details',
          icon: Package,
          description: 'View goods receipt and material receipt details',
          columns: ['Detail No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No GRN/MRN Details',
          emptyStateMessage: 'Create your first goods receipt using the Create New button above'
        };
      case ViewType.INVENTORY_ISSUE_SLIP:
        return {
          title: 'Goods Issue',
          icon: Package,
          description: 'Create and manage goods issue slips',
          columns: ['Slip No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Goods Issue Slips',
          emptyStateMessage: 'Create your first goods issue using the Create New button above'
        };
      case ViewType.INVENTORY_ISSUE_OUTWARD_DETAILS:
        return {
          title: 'Issue (Outward) Details',
          icon: Package,
          description: 'View goods issue outward details',
          columns: ['Detail No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Issue Outward Details',
          emptyStateMessage: 'Create your first goods issue using the Create New button above'
        };
      case ViewType.INVENTORY_ISSUE_RETURN:
        return {
          title: 'Goods Returns',
          icon: Package,
          description: 'Create and manage goods returns',
          columns: ['Return No', 'Date', 'Project', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Goods Returns',
          emptyStateMessage: 'Create your first goods return using the Create New button above'
        };
      case ViewType.INVENTORY_GLOBAL_STOCK_DETAILS:
        return {
          title: 'Global Stock Details',
          icon: Package,
          description: 'View global stock levels and details',
          columns: ['Material', 'Quantity', 'Location', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Stock Data',
          emptyStateMessage: 'Stock details will appear here once records are available'
        };
      case ViewType.INVENTORY_PROJECT_STOCK_STATEMENT:
        return {
          title: 'Project Stock Statement',
          icon: Package,
          description: 'View project-wise stock statements',
          columns: ['Project', 'Material', 'Quantity', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Project Stock Statements',
          emptyStateMessage: 'Project stock data will appear here once available'
        };
      case ViewType.REPORTS:
      case ViewType.WORK_PROGRESS_REPORTS:
        return {
          title: currentView === ViewType.REPORTS ? 'Reports' : 'Work Progress Reports',
          icon: BarChart3,
          description: 'View and generate work progress reports',
          columns: ['Report Name', 'Project', 'Period', 'Progress', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Reports',
          emptyStateMessage: 'Report data will appear here once generated'
        };
      case ViewType.INVENTORY_REPORTS:
        return {
          title: 'Inventory Reports',
          icon: Package,
          description: 'Generate and view inventory reports',
          columns: ['Report Name', 'Warehouse', 'Date', 'Items Count', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Inventory Reports',
          emptyStateMessage: 'Use the sidebar to navigate to specific report pages'
        };
      case ViewType.WORKFORCE_MANAGEMENT:
        return {
          title: 'Workforce Management',
          icon: UsersRound,
          description: 'Manage workforce, labour, and staff assignments',
          columns: ['Name', 'Role', 'Project', 'Status', 'Availability'],
          sampleData: [],
          emptyStateTitle: 'No Workforce Data',
          emptyStateMessage: 'Workforce data will appear here once available'
        };
      case ViewType.LABOUR_STRENGTH:
        return {
          title: 'Labour Strength',
          icon: UsersRound,
          description: 'View labour workforce strength and statistics',
          columns: ['Trade', 'Total Workers', 'Available', 'Assigned', 'Skill Level'],
          sampleData: [],
          emptyStateTitle: 'No Labour Data',
          emptyStateMessage: 'Labour strength data will appear here once available'
        };
      case ViewType.WORK_CONTRACTOR:
        return {
          title: 'Work Contractor',
          icon: Briefcase,
          description: 'Manage contractors and their work assignments',
          columns: ['Contractor Name', 'Code', 'Specialization', 'Projects', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Contractor Data',
          emptyStateMessage: 'Contractor data will appear here once available'
        };
      case ViewType.SUBSCRIPTION:
        return {
          title: 'Subscription',
          icon: CreditCard,
          description: 'Manage subscription plans and billing',
          columns: ['Plan Name', 'Features', 'Price', 'Users', 'Status'],
          sampleData: [],
          emptyStateTitle: 'No Subscription Data',
          emptyStateMessage: 'Subscription data will appear here once configured'
        };
      default:
        return {
          title: 'View',
          icon: FileText,
          description: 'View details',
          columns: [],
          sampleData: []
        };
    }
  };

  const config = getViewConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* Header - title left, buttons right; on small screens stack and wrap for responsiveness */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B8E23]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>{config.title}</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest ${textSecondary}`}>
            {config.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {isInventorySection(currentView) ? (
            <>
              <button
                onClick={currentView === ViewType.INVENTORY_PR ? handlePRCreateNew : handleInventoryCreateNew}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
              >
                <Plus className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Create New</span><span className="sm:hidden">Create</span>
              </button>
              <button
                onClick={() => {
                  if (currentView === ViewType.INVENTORY_PR) { setShowEditPreviousModal(true); setPrEditModalPage(1); }
                  else if (currentView === ViewType.INVENTORY_RFQ) { setShowEditPreviousRfqModal(true); setRfqEditModalPage(1); }
                  else if (currentView === ViewType.INVENTORY_ISSUE_RETURN) { setShowEditPreviousReturnModal(true); setReturnEditModalPage(1); }
                  else if (currentView === ViewType.INVENTORY_ISSUE_SLIP) { setShowEditPreviousIssueModal(true); setIssueEditModalPage(1); }
                  else if (currentView === ViewType.INVENTORY_GRN_MRN_SLIP) { setShowEditPreviousGrnModal(true); setGrnEditModalPage(1); }
                  else toast.showInfo('Edit previous – coming soon for this section');
                }}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all border-2 ${isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10'}`}
              >
                <Edit className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Edit previous</span><span className="sm:hidden">Edit</span>
              </button>
            </>
          ) : (
            <button className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}>
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards - for all inventory sections */}
      {isInventorySection(currentView) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
            <p className={`text-2xl font-black ${textPrimary}`}>{currentView === ViewType.INVENTORY_PR ? filteredPrList.length : currentView === ViewType.INVENTORY_RFQ ? filteredRfqList.length : currentView === ViewType.INVENTORY_ISSUE_RETURN ? filteredReturnList.length : currentView === ViewType.INVENTORY_ISSUE_SLIP ? filteredIssueList.length : currentView === ViewType.INVENTORY_GRN_MRN_SLIP ? filteredGrnList.length : 0}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>{currentView === ViewType.INVENTORY_PR ? 'Approved' : 'Active'}</p>
            <p className={`text-2xl font-black text-[#C2D642]`}>{currentView === ViewType.INVENTORY_PR ? filteredPrList.filter((p: any) => p.status === 1).length : currentView === ViewType.INVENTORY_RFQ ? filteredRfqList.length : currentView === ViewType.INVENTORY_ISSUE_RETURN ? filteredReturnList.length : currentView === ViewType.INVENTORY_ISSUE_SLIP ? filteredIssueList.length : currentView === ViewType.INVENTORY_GRN_MRN_SLIP ? filteredGrnList.length : 0}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
            <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative min-w-0">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder={isInventorySection(currentView) ? (currentView === ViewType.INVENTORY_PR ? "Search by Req No, project, subproject, created by..." : currentView === ViewType.INVENTORY_ISSUE_RETURN ? "Search by return no, project, date..." : currentView === ViewType.INVENTORY_ISSUE_SLIP ? "Search by issue no, project, date..." : currentView === ViewType.INVENTORY_GRN_MRN_SLIP ? "Search by GRN no, project, date..." : "Search by project, reference no...") : "Search..."} 
            value={isInventorySection(currentView) ? (currentView === ViewType.INVENTORY_PR ? prSearchQuery : inventorySearchQuery) : ''}
            onChange={(e) => {
              if (currentView === ViewType.INVENTORY_PR) { setPrSearchQuery(e.target.value); setPrListPage(1); }
              else if (currentView === ViewType.INVENTORY_RFQ) { setInventorySearchQuery(e.target.value); setRfqListPage(1); }
              else if (currentView === ViewType.INVENTORY_GRN_MRN_SLIP) { setInventorySearchQuery(e.target.value); setGrnListPage(1); }
              else if (currentView === ViewType.INVENTORY_ISSUE_RETURN) { setInventorySearchQuery(e.target.value); setReturnListPage(1); }
              else if (currentView === ViewType.INVENTORY_ISSUE_SLIP) { setInventorySearchQuery(e.target.value); setIssueListPage(1); }
              else if (isInventorySection(currentView)) setInventorySearchQuery(e.target.value);
            }}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
        {isInventorySection(currentView) ? (
          <button 
            onClick={() => {
              if (currentView === ViewType.INVENTORY_PR) { setPrSearchQuery(''); fetchPrList(); }
              else if (currentView === ViewType.INVENTORY_RFQ) { setInventorySearchQuery(''); fetchRfqList(); }
              else if (currentView === ViewType.INVENTORY_ISSUE_RETURN) { setInventorySearchQuery(''); fetchReturnList(); }
              else if (currentView === ViewType.INVENTORY_ISSUE_SLIP) { setInventorySearchQuery(''); fetchIssueList(); }
              else if (currentView === ViewType.INVENTORY_GRN_MRN_SLIP) { setInventorySearchQuery(''); fetchGrnList(); }
              else setInventorySearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'} shadow-sm`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        ) : (
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <Filter className="w-4 h-4" /> Filter
          </button>
        )}
      </div>

      {/* Data Table */}
      {currentView === ViewType.INVENTORY_PR ? (
        <>
          {isLoadingPrList ? (
            <div className={`flex items-center justify-center py-16 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading purchase requests...</span>
            </div>
          ) : filteredPrList.length > 0 ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Req No</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project Name</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Created By</th>
                      <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {paginatedPrList.map((pr: any) => (
                      <tr key={pr.id || pr.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{pr.request_no ?? pr.request_id ?? pr.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.date ?? pr.name ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? pr.projects?.name ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.users?.name ?? pr.created_by ?? pr.user?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePRViewClick(pr)} className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30" title="View PDF (opens in new tab)">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePRShareClick(pr)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30" title="Share PDF">
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePREditClick(pr)} className="p-2 rounded-lg bg-slate-500/20 text-slate-600 hover:bg-slate-500/30 transition-colors dark:bg-slate-500/20 dark:text-slate-400 dark:hover:bg-slate-500/30" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-6 py-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-xs sm:text-sm ${textSecondary}`}>
                  Page {prListPage} of {Math.max(1, Math.ceil(filteredPrList.length / PR_PAGE_SIZE))}
                  {filteredPrList.length > 0 && (
                    <span className="ml-2">
                      ({(prListPage - 1) * PR_PAGE_SIZE + 1}-{Math.min(prListPage * PR_PAGE_SIZE, filteredPrList.length)} of {filteredPrList.length}, 10 per page)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPrListPage(1)} disabled={prListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                  <button onClick={() => setPrListPage(p => Math.max(1, p - 1))} disabled={prListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                  <select value={prListPage} onChange={(e) => setPrListPage(Number(e.target.value))} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                    {Array.from({ length: Math.max(1, Math.ceil(filteredPrList.length / PR_PAGE_SIZE)) }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button onClick={() => setPrListPage(p => Math.min(Math.ceil(filteredPrList.length / PR_PAGE_SIZE), p + 1))} disabled={prListPage >= Math.ceil(filteredPrList.length / PR_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                  <button onClick={() => setPrListPage(Math.max(1, Math.ceil(filteredPrList.length / PR_PAGE_SIZE)))} disabled={prListPage >= Math.ceil(filteredPrList.length / PR_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
              <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Purchase Requests</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first purchase request using the Create New button above</p>
            </div>
          )}
        </>
      ) : currentView === ViewType.INVENTORY_RFQ ? (
        <>
          {isLoadingRfqList ? (
            <div className={`flex items-center justify-center py-16 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading RFQs...</span>
            </div>
          ) : filteredRfqList.length > 0 ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>RFQ No</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                      <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {paginatedRfqList.map((rfq: any) => (
                      <tr key={rfq.id || rfq.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{rfq.rfq_no ?? rfq.request_no ?? rfq.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{rfq.date ?? rfq.created_at ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{rfq.projects_id?.project_name ?? rfq.project_name ?? rfq.projects?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRfqViewClick(rfq)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRfqShareClick(rfq)}
                              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                              title="Share PDF"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const rfqId = rfq.id ?? rfq.uuid;
                                const projId = rfq.projects_id != null ? (typeof rfq.projects_id === 'object' ? (rfq.projects_id as any)?.id : rfq.projects_id) : rfq.projects?.id;
                                const mrId = (rfq as any).material_requests_id ?? (rfq as any).material_request_id ?? (typeof (rfq as any).material_requests === 'object' ? (rfq as any).material_requests?.id : undefined);
                                const sp = new URLSearchParams();
                                if (projId != null) { sp.set('projectId', String(projId)); sp.set('projectNumericId', String(projId)); }
                                if (mrId != null && mrId !== '') sp.set('mrId', String(mrId));
                                const reqNo = (rfq as any).request_no ?? (rfq as any).request_id;
                                if (reqNo != null && reqNo !== '') sp.set('mrRequestNo', String(reqNo));
                                const params = sp.toString() ? `?${sp.toString()}` : '';
                                router.push(`/inventory-reports/rfq/${rfqId}/submit-quotes${params}`);
                              }}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                              title="Edit"
                            >
                              <Edit className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-6 py-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-xs sm:text-sm ${textSecondary}`}>
                  Page {rfqListPage} of {Math.max(1, Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE))}
                  {filteredRfqList.length > 0 && (
                    <span className="ml-2">
                      ({(rfqListPage - 1) * RFQ_PAGE_SIZE + 1}-{Math.min(rfqListPage * RFQ_PAGE_SIZE, filteredRfqList.length)} of {filteredRfqList.length}, 10 per page)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setRfqListPage(1)} disabled={rfqListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                  <button onClick={() => setRfqListPage(p => Math.max(1, p - 1))} disabled={rfqListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                  <select value={rfqListPage} onChange={(e) => setRfqListPage(Number(e.target.value))} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                    {Array.from({ length: Math.max(1, Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE)) }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button onClick={() => setRfqListPage(p => Math.min(Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE), p + 1))} disabled={rfqListPage >= Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                  <button onClick={() => setRfqListPage(Math.max(1, Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE)))} disabled={rfqListPage >= Math.ceil(filteredRfqList.length / RFQ_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
              <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No RFQs</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first RFQ using the Create New button above</p>
            </div>
          )}
        </>
      ) : currentView === ViewType.INVENTORY_GRN_MRN_SLIP ? (
        <>
          {isLoadingGrnList ? (
            <div className={`flex justify-center items-center py-16 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading goods receipts...</span>
            </div>
          ) : filteredGrnList.length > 0 ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>GRN/MRN No</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                      <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {paginatedGrnList.map((grn: any) => (
                      <tr key={grn.id ?? grn.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{grn.grn_no ?? grn.name ?? grn.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{grn.date ?? grn.created_at ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{grn.projects_id?.project_name ?? grn.project_name ?? grn.projects?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleGrnViewPdfClick(grn)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGrnShareClick(grn)}
                              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                              title="Share PDF (copy link)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/inventory-reports/grn-mrn-slip/${grn.id ?? grn.uuid ?? grn.inv_inwards_id}`)}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                              title="Edit"
                            >
                              <Edit className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-6 py-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-xs sm:text-sm ${textSecondary}`}>
                  Page {grnListPage} of {Math.max(1, Math.ceil(filteredGrnList.length / inventoryEntriesPerPage))}
                  {filteredGrnList.length > 0 && (
                    <span className="ml-2">
                      ({(grnListPage - 1) * inventoryEntriesPerPage + 1}-{Math.min(grnListPage * inventoryEntriesPerPage, filteredGrnList.length)} of {filteredGrnList.length})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setGrnListPage(1)} disabled={grnListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setGrnListPage(p => Math.max(1, p - 1))} disabled={grnListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <select value={grnListPage} onChange={(e) => setGrnListPage(Number(e.target.value))} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      {Array.from({ length: Math.max(1, Math.ceil(filteredGrnList.length / inventoryEntriesPerPage)) }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button onClick={() => setGrnListPage(p => Math.min(Math.ceil(filteredGrnList.length / inventoryEntriesPerPage), p + 1))} disabled={grnListPage >= Math.ceil(filteredGrnList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setGrnListPage(Math.max(1, Math.ceil(filteredGrnList.length / inventoryEntriesPerPage)))} disabled={grnListPage >= Math.ceil(filteredGrnList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                  </div>
                  <div className={`h-6 w-px hidden sm:block ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${textSecondary}`}>Rows:</span>
                    <select value={inventoryEntriesPerPage} onChange={(e) => { setInventoryEntriesPerPage(Number(e.target.value)); setGrnListPage(1); }} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
              <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Goods Receipts</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first goods receipt using the Create New button above</p>
            </div>
          )}
        </>
      ) : currentView === ViewType.INVENTORY_ISSUE_RETURN ? (
        <>
          {isLoadingReturnList ? (
            <div className={`flex justify-center items-center py-16 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading returns...</span>
            </div>
          ) : filteredReturnList.length > 0 ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Return No</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                      <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {paginatedReturnList.map((ret: any) => (
                      <tr key={ret.id ?? ret.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{ret.code ?? ret.return_no ?? ret.name ?? ret.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{ret.date ?? ret.created_at ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{ret.projects_id?.project_name ?? ret.project_name ?? ret.projects?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleReturnViewPdfClick(ret)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReturnShareClick(ret)}
                              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                              title="Share PDF (copy link)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                              const projId = ret.projects_id?.id ?? ret.projects_id ?? ret.project_id;
                              const projName = ret.projects_id?.project_name ?? ret.project_name ?? ret.projects?.name ?? '';
                              const params = new URLSearchParams();
                              if (projId != null && projId !== '') params.set('projectId', String(projId));
                              if (projName) params.set('projectName', projName);
                              const qs = params.toString();
                              router.push(`/inventory-reports/issue-return/${ret.inv_returns_id ?? ret.id ?? ret.uuid}${qs ? `?${qs}` : ''}`);
                            }}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                              title="Edit"
                            >
                              <Edit className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-6 py-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-xs sm:text-sm ${textSecondary}`}>
                  Page {returnListPage} of {Math.max(1, Math.ceil(filteredReturnList.length / inventoryEntriesPerPage))}
                  {filteredReturnList.length > 0 && (
                    <span className="ml-2">
                      ({(returnListPage - 1) * inventoryEntriesPerPage + 1}-{Math.min(returnListPage * inventoryEntriesPerPage, filteredReturnList.length)} of {filteredReturnList.length})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setReturnListPage(1)} disabled={returnListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setReturnListPage(p => Math.max(1, p - 1))} disabled={returnListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <select value={returnListPage} onChange={(e) => setReturnListPage(Number(e.target.value))} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      {Array.from({ length: Math.max(1, Math.ceil(filteredReturnList.length / inventoryEntriesPerPage)) }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button onClick={() => setReturnListPage(p => Math.min(Math.ceil(filteredReturnList.length / inventoryEntriesPerPage), p + 1))} disabled={returnListPage >= Math.ceil(filteredReturnList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setReturnListPage(Math.max(1, Math.ceil(filteredReturnList.length / inventoryEntriesPerPage)))} disabled={returnListPage >= Math.ceil(filteredReturnList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                  </div>
                  <div className={`h-6 w-px hidden sm:block ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${textSecondary}`}>Rows:</span>
                    <select value={inventoryEntriesPerPage} onChange={(e) => { setInventoryEntriesPerPage(Number(e.target.value)); setReturnListPage(1); }} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
              <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Goods Returns</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first goods return using the Create New button above</p>
            </div>
          )}
        </>
      ) : currentView === ViewType.INVENTORY_ISSUE_SLIP ? (
        <>
          {isLoadingIssueList ? (
            <div className={`flex justify-center items-center py-16 ${textSecondary}`}>
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2 font-bold">Loading issues...</span>
            </div>
          ) : filteredIssueList.length > 0 ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Issue No</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                      <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                      <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {paginatedIssueList.map((iss: any) => (
                      <tr key={iss.id ?? iss.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{iss.issue_no ?? iss.name ?? iss.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{iss.date ?? iss.created_at ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{iss.projects_id?.project_name ?? iss.project_name ?? iss.projects?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleIssueViewPdfClick(iss)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIssueShareClick(iss)}
                              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                              title="Share PDF (copy link)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                              const editId = iss.inv_issue?.id ?? iss.inv_issues_id ?? iss.id ?? iss.uuid;
                              router.push(`/inventory-reports/issue-slip/${editId}`);
                            }}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                              title="Edit"
                            >
                              <Edit className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-6 py-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-xs sm:text-sm ${textSecondary}`}>
                  Page {issueListPage} of {Math.max(1, Math.ceil(filteredIssueList.length / inventoryEntriesPerPage))}
                  {filteredIssueList.length > 0 && (
                    <span className="ml-2">
                      ({(issueListPage - 1) * inventoryEntriesPerPage + 1}-{Math.min(issueListPage * inventoryEntriesPerPage, filteredIssueList.length)} of {filteredIssueList.length})
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setIssueListPage(1)} disabled={issueListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setIssueListPage(p => Math.max(1, p - 1))} disabled={issueListPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                    <select value={issueListPage} onChange={(e) => setIssueListPage(Number(e.target.value))} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      {Array.from({ length: Math.max(1, Math.ceil(filteredIssueList.length / inventoryEntriesPerPage)) }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button onClick={() => setIssueListPage(p => Math.min(Math.ceil(filteredIssueList.length / inventoryEntriesPerPage), p + 1))} disabled={issueListPage >= Math.ceil(filteredIssueList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                    <button onClick={() => setIssueListPage(Math.max(1, Math.ceil(filteredIssueList.length / inventoryEntriesPerPage)))} disabled={issueListPage >= Math.ceil(filteredIssueList.length / inventoryEntriesPerPage)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                  </div>
                  <div className={`h-6 w-px hidden sm:block ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${textSecondary}`}>Rows:</span>
                    <select value={inventoryEntriesPerPage} onChange={(e) => { setInventoryEntriesPerPage(Number(e.target.value)); setIssueListPage(1); }} className={`px-2 py-1 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
              <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Goods Issues</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first goods issue using the Create New button above</p>
            </div>
          )}
        </>
      ) : config.sampleData.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  {config.columns.map((col, idx) => (
                    <th key={idx} className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                      {col}
                    </th>
                  ))}
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {config.sampleData.map((row, rowIdx) => (
                  <tr key={rowIdx} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    {Object.values(row).map((cell, cellIdx) => (
                      <td key={cellIdx} className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                        {cell}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                        <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>{config.emptyStateTitle ?? 'No Data Available'}</h3>
          <p className={`text-sm ${textSecondary}`}>{config.emptyStateMessage ?? 'Start by adding your first entry'}</p>
        </div>
      )}

      {/* Inventory - Project Selection Modal (multi-step for PR, Step 1 only for other inventory) */}
      {isInventorySection(currentView) && showProjectSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full my-auto overflow-hidden flex flex-col ${
            prStep === 'success' && currentView === ViewType.INVENTORY_PR
              ? 'max-w-md h-auto max-h-[85vh]'
              : 'max-w-[min(92vw,1100px)] h-[calc(100vh-2rem)] max-h-[90vh]'
          }`}>
            <button
              onClick={handlePRCloseModal}
              className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              title="Close"
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {/* Step 1: Project Selection */}
            {prStep === 'project' && (
              <>
                <div className={`${bgPrimary} flex-shrink-0`}>
                  <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Step 1: Select a Project</h2>
                      <p className={`text-sm ${textSecondary} mt-1`}>Choose a project for your {currentView === ViewType.INVENTORY_PR ? 'purchase request' : config.title.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearchQuery}
                        onChange={(e) => {
                          setProjectSearchQuery(e.target.value);
                          setProjectPage(1);
                        }}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={handlePROpenCreateProject}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10'}`}
                    >
                      <Plus className="w-4 h-4" /> Create New
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 flex flex-col min-h-0">
                  {isLoadingProjects ? (
                    <div className={`flex items-center justify-center py-16 ${textSecondary}`}>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="ml-2 font-bold">Loading projects...</span>
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedProjects.map((project) => {
                          const isSelected = prSelectedProject?.id === project.id;
                          return (
                            <div
                              key={project.id}
                              onClick={() => handlePRSelectProject(project)}
                              onDoubleClick={() => handlePRProjectStepNext(project)}
                              className={`rounded-xl border p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                                isSelected
                                  ? isDark ? 'border-[#6B8E23] bg-[#6B8E23]/10' : 'border-[#6B8E23] bg-[#6B8E23]/5'
                                  : `${cardClass} ${isDark ? 'hover:border-[#6B8E23]/50' : 'hover:border-[#6B8E23]/30'}`
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 mb-3 flex-shrink-0 group-hover:border-[#6B8E23]/50 transition-colors ${isSelected ? 'border-[#6B8E23]' : 'border-[#6B8E23]/20'}`}>
                                  <img
                                    src={getLogoUrl(project.logo, project.name, '6B8E23')}
                                    alt={project.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=6B8E23&color=fff&size=128`;
                                    }}
                                  />
                                </div>
                                <h3 className={`text-base font-black ${textPrimary} mb-1 group-hover:text-[#6B8E23] transition-colors`}>{project.name}</h3>
                                {project.code && <p className={`text-xs ${textSecondary} mb-1`}>Code: {project.code}</p>}
                                {project.company && <p className={`text-xs ${textSecondary}`}>{project.company}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {filteredProjects.length > PROJECT_PAGE_SIZE && (
                        <div className={`flex items-center justify-between gap-2 mt-4 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <span className={`text-xs sm:text-sm ${textSecondary}`}>
                            Page {projectPage} of {Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setProjectPage(1)} disabled={projectPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                              <ChevronsLeft className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                            <button onClick={() => setProjectPage(p => Math.max(1, p - 1))} disabled={projectPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                              <ChevronLeft className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                            <button onClick={() => setProjectPage(p => Math.min(Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE), p + 1))} disabled={projectPage >= Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                              <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                            <button onClick={() => setProjectPage(Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE))} disabled={projectPage >= Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                              <ChevronsRight className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                      <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                      <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No projects found</h3>
                      <p className={`text-sm ${textSecondary} mb-4`}>
                        {projectSearchQuery ? 'Try a different search term' : 'Create a new project to get started'}
                      </p>
                      <button onClick={handlePROpenCreateProject} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}>
                        <Plus className="w-4 h-4" /> Create New Project
                      </button>
                    </div>
                  )}
                  {/* Back & Next - Project step */}
                  <div className={`flex items-center justify-between gap-4 mt-6 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button onClick={handlePRProjectStepBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800/50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={() => handlePRProjectStepNext()} disabled={!prSelectedProject} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${prSelectedProject ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-slate-400 text-white cursor-not-allowed'} shadow-md`}>
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Subproject Selection - mandatory when project has subprojects, skippable when none */}
            {prStep === 'subproject' && prSelectedProject && (
              <>
                <div className={`${bgPrimary} flex-shrink-0`}>
                  <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>
                        Step 2: Subproject {prSubprojects.length > 0 ? '(Required)' : '(Optional)'}
                      </h2>
                      <p className={`text-sm ${textSecondary} mt-1`}>
                        {prSubprojects.length > 0
                          ? <>Select a subproject for <span className="font-bold text-[#6B8E23]">{prSelectedProject.name}</span> — selection is mandatory</>
                          : <>This project has no subprojects. Click Next to continue or Create New to add one.</>}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        placeholder="Search subprojects..."
                        value={subprojectSearchQuery}
                        onChange={(e) => {
                          setSubprojectSearchQuery(e.target.value);
                          setSubprojectPage(1);
                        }}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      />
                    </div>
                    <button onClick={handlePROpenCreateSubproject} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10'}`}>
                      <Plus className="w-4 h-4" /> Create New
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 flex flex-col min-h-0">
                  {isLoadingSubprojects ? (
                    <div className={`flex items-center justify-center py-16 ${textSecondary}`}>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="ml-2 font-bold">Loading subprojects...</span>
                    </div>
                  ) : filteredSubprojects.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedSubprojects.map((subproject) => {
                          const isSelected = prSelectedSubproject?.id === subproject.id;
                          return (
                            <div
                              key={subproject.id}
                              onClick={() => setPrSelectedSubproject(isSelected ? null : subproject)}
                              onDoubleClick={() => handlePRSubprojectStepNext(subproject)}
                              className={`rounded-xl border p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group flex items-start gap-4 ${
                                isSelected ? isDark ? 'border-[#6B8E23] bg-[#6B8E23]/10' : 'border-[#6B8E23] bg-[#6B8E23]/5' : cardClass
                              }`}
                            >
                              <div className={`p-3 rounded-lg flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
                                <Layers className={`w-5 h-5 text-[#6B8E23]`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-black ${textPrimary} mb-1 truncate`}>{subproject.name}</h3>
                                {subproject.code && <p className={`text-xs ${textSecondary} mb-1`}>Code: {subproject.code}</p>}
                                {subproject.manager && <p className={`text-xs ${textSecondary}`}>Manager: {subproject.manager}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {filteredSubprojects.length > SUBPROJECT_PAGE_SIZE && (
                        <div className={`flex items-center justify-between gap-2 mt-4 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <span className={`text-xs sm:text-sm ${textSecondary}`}>
                            Page {subprojectPage} of {Math.ceil(filteredSubprojects.length / SUBPROJECT_PAGE_SIZE)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSubprojectPage(1)} disabled={subprojectPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setSubprojectPage(p => Math.max(1, p - 1))} disabled={subprojectPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setSubprojectPage(p => Math.min(Math.ceil(filteredSubprojects.length / SUBPROJECT_PAGE_SIZE), p + 1))} disabled={subprojectPage >= Math.ceil(filteredSubprojects.length / SUBPROJECT_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setSubprojectPage(Math.ceil(filteredSubprojects.length / SUBPROJECT_PAGE_SIZE))} disabled={subprojectPage >= Math.ceil(filteredSubprojects.length / SUBPROJECT_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                      <Layers className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                      <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No subprojects found</h3>
                      <p className={`text-sm ${textSecondary} mb-4`}>
                        {subprojectSearchQuery ? 'Try a different search term' : 'This project has no subprojects. Click Next to continue or Create New to add one.'}
                      </p>
                      <button onClick={handlePROpenCreateSubproject} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}>
                        <Plus className="w-4 h-4" /> Create New Subproject
                      </button>
                    </div>
                  )}
                  {/* Back & Next - Subproject step */}
                  <div className={`flex items-center justify-between gap-4 mt-6 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button onClick={handlePRSubprojectStepBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800/50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={() => handlePRSubprojectStepNext()}
                      disabled={isSubmittingPR || isLoadingSubprojects || (prSubprojects.length > 0 && !prSelectedSubproject)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSubmittingPR || isLoadingSubprojects || (prSubprojects.length > 0 && !prSelectedSubproject) ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md disabled:opacity-70`}
                    >
                      {isSubmittingPR ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Next <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: PR Details & Materials */}
            {prStep === 'materials' && (prSelectedProject || isLoadingEditPr) && (
              <>
                <div className={`${bgPrimary} flex-shrink-0`}>
                  <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Step 3: Purchase Request Details</h2>
                      <p className={`text-sm ${textSecondary} mt-1`}>Review details and add materials from Masters</p>
                    </div>
                  </div>
                  {/* PR summary: Project, Subproject, Req No, Creation Date */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-3 rounded-lg border ${cardClass}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Project</p>
                      <p className={`text-sm font-black ${textPrimary}`}>{prSelectedProject?.name ?? '-'}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${cardClass}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Subproject</p>
                      <p className={`text-sm font-black ${textPrimary}`}>{prSelectedSubproject?.name || 'None'}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${cardClass}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Req No</p>
                      <input
                        type="text"
                        value={prReqNo}
                        onChange={(e) => setPrReqNo(e.target.value)}
                        placeholder="PR-YYYYMMDD-001"
                        className={`w-full text-sm font-bold bg-transparent border-0 outline-none focus:ring-0 ${textPrimary}`}
                      />
                    </div>
                    <div className={`p-3 rounded-lg border ${cardClass}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Creation Date</p>
                      <p className={`text-sm font-black ${textPrimary}`}>{getPRCreationDate()}</p>
                    </div>
                  </div>
                  {/* Search and Create New - Materials */}
                  <div className="px-4 sm:px-6 pb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                      <input
                        type="text"
                        placeholder="Search materials..."
                        value={materialSearchQuery}
                        onChange={(e) => {
                          setMaterialSearchQuery(e.target.value);
                          setMaterialPage(1);
                        }}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateMaterialModal(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 shrink-0 ${isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10'}`}
                    >
                      <Plus className="w-4 h-4" /> Create New
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 flex flex-col min-h-0">
                  {(isLoadingMaterials || isLoadingEditPr) ? (
                    <div className={`flex items-center justify-center py-16 ${textSecondary}`}>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="ml-2 font-bold">{isLoadingEditPr ? 'Loading purchase request...' : 'Loading materials...'}</span>
                    </div>
                  ) : filteredMaterials.length > 0 ? (
                    <>
                      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}></th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Class</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity <span className="text-red-500">*</span></th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Required Date <span className="text-red-500">*</span></th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remark</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                              {paginatedMaterials.map((mat) => {
                                const isSelected = prSelectedMaterials.has(mat.id);
                                const sel = prSelectedMaterials.get(mat.id);
                                return (
                                  <tr
                                    key={mat.id}
                                    onClick={() => handlePRToggleMaterial(mat)}
                                    className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} ${isSelected ? (isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5') : ''}`}
                                  >
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handlePRToggleMaterial(mat)}
                                        className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'}`}
                                      />
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{mat.class}</td>
                                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{mat.code}</td>
                                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{mat.name}</td>
                                    <td className={`px-4 py-3 text-sm ${textPrimary}`}>{mat.specification || '-'}</td>
                                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{mat.unit || '-'}</td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      {isSelected ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sel?.quantity ?? ''}
                                          onChange={(e) => handlePRMaterialQuantityChange(mat.id, parseFloat(e.target.value) || 0)}
                                          onFocus={(e) => e.target.select()}
                                          placeholder="Qty"
                                          className={`w-20 px-2 py-1.5 rounded text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                                        />
                                      ) : (
                                        <span className={`text-sm ${textSecondary}`}>-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      {isSelected ? (
                                        <input
                                          type="date"
                                          value={sel?.requiredDate ?? ''}
                                          onChange={(e) => handlePRMaterialRequiredDateChange(mat.id, e.target.value)}
                                          className={`w-36 px-2 py-1.5 rounded text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                                        />
                                      ) : (
                                        <span className={`text-sm ${textSecondary}`}>-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      {isSelected ? (
                                        <select
                                          value={sel?.activityId ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const act = prActivities.find((a) => String(a.numericId ?? a.id) === val);
                                            handlePRMaterialActivityChange(mat.id, val, act?.name ?? '');
                                          }}
                                          className={`w-full min-w-[140px] px-2 py-1.5 rounded text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
                                        >
                                          <option value="">Select Activity</option>
                                          {prActivities.map((a) => (
                                            <option key={a.id} value={String(a.numericId ?? a.id)}>{a.name}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className={`text-sm ${textSecondary}`}>-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      {isSelected ? (
                                        <input
                                          type="text"
                                          value={sel?.remark ?? ''}
                                          onChange={(e) => handlePRMaterialRemarkChange(mat.id, e.target.value)}
                                          placeholder="Remark"
                                          className={`w-full min-w-[120px] px-2 py-1.5 rounded text-sm font-bold border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      </div>
                      {filteredMaterials.length > MATERIAL_PAGE_SIZE && (
                        <div className={`flex items-center justify-between gap-2 mt-4 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <span className={`text-xs sm:text-sm ${textSecondary}`}>
                            Page {materialPage} of {Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setMaterialPage(1)} disabled={materialPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setMaterialPage(p => Math.max(1, p - 1))} disabled={materialPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setMaterialPage(p => Math.min(Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE), p + 1))} disabled={materialPage >= Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                            <button onClick={() => setMaterialPage(Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE))} disabled={materialPage >= Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                      <Package className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                      <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No materials found</h3>
                      <p className={`text-sm ${textSecondary}`}>
                        {materialSearchQuery ? 'Try a different search term.' : 'No materials in Masters. Add materials in Masters > Materials before creating a purchase request.'}
                      </p>
                    </div>
                  )}
                  {/* Back & Next - Materials step */}
                  <div className={`flex items-center justify-between gap-4 mt-6 pt-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button onClick={handlePRMaterialsStepBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800/50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={handlePRMaterialsStepNext} disabled={isSubmittingPR || isLoadingEditPr} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSubmittingPR || isLoadingEditPr ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#6B8E23] hover:bg-[#5a7a1e]'} text-white shadow-md disabled:opacity-70`}>
                      {isSubmittingPR ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      {isSubmittingPR ? (prIsEditMode ? 'Updating...' : 'Submitting...') : (prIsEditMode ? 'Update' : 'Submit')}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: PR Success - View, Share (same as main list) */}
            {prStep === 'success' && currentView === ViewType.INVENTORY_PR && (
              <div className="p-6 sm:p-8 flex flex-col items-center">
                <h2 className={`text-lg sm:text-xl font-black mb-2 ${textPrimary}`}>Purchase Request Created</h2>
                <p className={`text-sm ${textSecondary} mb-6`}>Your PDF is ready. View or share below.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => prPdfUrl && window.open(getFullPdfUrl(prPdfUrl) || prPdfUrl, '_blank')}
                    disabled={!prPdfUrl}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400 disabled:opacity-50 transition-colors"
                    title="View PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!prPdfUrl) return;
                      const copied = await copyPdfUrl(prPdfUrl);
                      if (copied) toast.showSuccess('PDF link copied to clipboard.');
                      else toast.showError('Could not copy to clipboard.');
                    }}
                    disabled={!prPdfUrl}
                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400 disabled:opacity-50 transition-colors"
                    title="Share PDF (copy link)"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handlePRCloseModal}
                  className="mt-8 flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]"
                >
                  Done — Back to List
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory PR - Edit Previous Modal (list of PRs: date, project, created by) */}
      {currentView === ViewType.INVENTORY_PR && showEditPreviousModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Edit Previous Purchase Request</h2>
              <button
                onClick={() => setShowEditPreviousModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filteredPrList.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Created By</th>
                        <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedPrEditModal.map((pr: any) => (
                        <tr key={pr.id ?? pr.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{pr.date ?? pr.name ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? pr.projects?.name ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{pr.users?.name ?? pr.created_by ?? pr.user?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handlePRViewClick(pr)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handlePRShareClick(pr)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" title="Share">
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePREditClick(pr)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPrList.length > INVENTORY_LIST_PAGE_SIZE && (
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Page {prEditModalPage} of {Math.ceil(filteredPrList.length / INVENTORY_LIST_PAGE_SIZE)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPrEditModalPage(1)} disabled={prEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setPrEditModalPage(p => Math.max(1, p - 1))} disabled={prEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setPrEditModalPage(p => Math.min(Math.ceil(filteredPrList.length / INVENTORY_LIST_PAGE_SIZE), p + 1))} disabled={prEditModalPage >= Math.ceil(filteredPrList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setPrEditModalPage(Math.ceil(filteredPrList.length / INVENTORY_LIST_PAGE_SIZE))} disabled={prEditModalPage >= Math.ceil(filteredPrList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <p className={`text-sm ${textSecondary}`}>No purchase requests found. Create one using the Create New button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory RFQ - Edit Previous Modal */}
      {currentView === ViewType.INVENTORY_RFQ && showEditPreviousRfqModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Edit Previous RFQ</h2>
              <button
                onClick={() => setShowEditPreviousRfqModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filteredRfqList.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>RFQ No</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                        <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedRfqEditModal.map((rfq: any) => (
                        <tr key={rfq.id ?? rfq.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{rfq.rfq_no ?? rfq.request_no ?? rfq.id ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{rfq.date ?? rfq.created_at ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{rfq.projects_id?.project_name ?? rfq.project_name ?? rfq.projects?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleRfqViewClick(rfq)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400"
                                title="View PDF"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              <button
                                onClick={() => handleRfqShareClick(rfq)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                title="Share PDF"
                              >
                                <Share2 className="w-3.5 h-3.5" /> Share
                              </button>
                              <button
                                onClick={() => {
                                  setShowEditPreviousRfqModal(false);
                                  const rfqId = rfq.id ?? rfq.uuid;
                                  const projId = rfq.projects_id != null ? (typeof rfq.projects_id === 'object' ? (rfq.projects_id as any)?.id : rfq.projects_id) : rfq.projects?.id;
                                  const mrId = (rfq as any).material_requests_id ?? (rfq as any).material_request_id ?? (typeof (rfq as any).material_requests === 'object' ? (rfq as any).material_requests?.id : undefined);
                                  const sp = new URLSearchParams();
                                  if (projId != null) { sp.set('projectId', String(projId)); sp.set('projectNumericId', String(projId)); }
                                  if (mrId != null && mrId !== '') sp.set('mrId', String(mrId));
                                  const reqNo = (rfq as any).request_no ?? (rfq as any).request_id;
                                  if (reqNo != null && reqNo !== '') sp.set('mrRequestNo', String(reqNo));
                                  const params = sp.toString() ? `?${sp.toString()}` : '';
                                  router.push(`/inventory-reports/rfq/${rfqId}/submit-quotes${params}`);
                                }}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRfqList.length > INVENTORY_LIST_PAGE_SIZE && (
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Page {rfqEditModalPage} of {Math.ceil(filteredRfqList.length / INVENTORY_LIST_PAGE_SIZE)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setRfqEditModalPage(1)} disabled={rfqEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setRfqEditModalPage(p => Math.max(1, p - 1))} disabled={rfqEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setRfqEditModalPage(p => Math.min(Math.ceil(filteredRfqList.length / INVENTORY_LIST_PAGE_SIZE), p + 1))} disabled={rfqEditModalPage >= Math.ceil(filteredRfqList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setRfqEditModalPage(Math.ceil(filteredRfqList.length / INVENTORY_LIST_PAGE_SIZE))} disabled={rfqEditModalPage >= Math.ceil(filteredRfqList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <p className={`text-sm ${textSecondary}`}>No RFQs found. Create one using the Create New button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Goods Return - Edit Previous Modal */}
      {currentView === ViewType.INVENTORY_ISSUE_RETURN && showEditPreviousReturnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Edit Previous Return</h2>
              <button
                onClick={() => setShowEditPreviousReturnModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filteredReturnList.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Return No</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                        <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedReturnEditModal.map((ret: any) => (
                        <tr key={ret.id ?? ret.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{ret.code ?? ret.return_no ?? ret.name ?? ret.id ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{ret.date ?? ret.created_at ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{ret.projects_id?.project_name ?? ret.project_name ?? ret.projects?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setShowEditPreviousReturnModal(false);
                                const projId = ret.projects_id?.id ?? ret.projects_id ?? ret.project_id;
                                const projName = ret.projects_id?.project_name ?? ret.project_name ?? ret.projects?.name ?? '';
                                const params = new URLSearchParams();
                                if (projId != null && projId !== '') params.set('projectId', String(projId));
                                if (projName) params.set('projectName', projName);
                                const qs = params.toString();
                                router.push(`/inventory-reports/issue-return/${ret.inv_returns_id ?? ret.id ?? ret.uuid}${qs ? `?${qs}` : ''}`);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredReturnList.length > INVENTORY_LIST_PAGE_SIZE && (
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Page {returnEditModalPage} of {Math.ceil(filteredReturnList.length / INVENTORY_LIST_PAGE_SIZE)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setReturnEditModalPage(1)} disabled={returnEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setReturnEditModalPage(p => Math.max(1, p - 1))} disabled={returnEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setReturnEditModalPage(p => Math.min(Math.ceil(filteredReturnList.length / INVENTORY_LIST_PAGE_SIZE), p + 1))} disabled={returnEditModalPage >= Math.ceil(filteredReturnList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setReturnEditModalPage(Math.ceil(filteredReturnList.length / INVENTORY_LIST_PAGE_SIZE))} disabled={returnEditModalPage >= Math.ceil(filteredReturnList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <p className={`text-sm ${textSecondary}`}>No returns found. Create one using the Create New button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Goods Receipt (GRN/MRN) - Edit Previous Modal */}
      {currentView === ViewType.INVENTORY_GRN_MRN_SLIP && showEditPreviousGrnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Edit Previous Goods Receipt</h2>
              <button
                onClick={() => setShowEditPreviousGrnModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filteredGrnList.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>GRN/MRN No</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                        <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedGrnEditModal.map((grn: any) => (
                        <tr key={grn.id ?? grn.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{grn.grn_no ?? grn.name ?? grn.id ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{grn.date ?? grn.created_at ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{grn.projects_id?.project_name ?? grn.project_name ?? grn.projects?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setShowEditPreviousGrnModal(false);
                                router.push(`/inventory-reports/grn-mrn-slip/${grn.id ?? grn.uuid ?? grn.inv_inwards_id}`);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredGrnList.length > INVENTORY_LIST_PAGE_SIZE && (
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Page {grnEditModalPage} of {Math.ceil(filteredGrnList.length / INVENTORY_LIST_PAGE_SIZE)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setGrnEditModalPage(1)} disabled={grnEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setGrnEditModalPage(p => Math.max(1, p - 1))} disabled={grnEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setGrnEditModalPage(p => Math.min(Math.ceil(filteredGrnList.length / INVENTORY_LIST_PAGE_SIZE), p + 1))} disabled={grnEditModalPage >= Math.ceil(filteredGrnList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setGrnEditModalPage(Math.ceil(filteredGrnList.length / INVENTORY_LIST_PAGE_SIZE))} disabled={grnEditModalPage >= Math.ceil(filteredGrnList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <p className={`text-sm ${textSecondary}`}>No goods receipts found. Create one using the Create New button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Goods Issue - Edit Previous Modal */}
      {currentView === ViewType.INVENTORY_ISSUE_SLIP && showEditPreviousIssueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Edit Previous Issue</h2>
              <button onClick={() => setShowEditPreviousIssueModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`} title="Close">
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {filteredIssueList.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Issue No</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Date</th>
                        <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Project</th>
                        <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {paginatedIssueEditModal.map((iss: any) => (
                        <tr key={iss.id ?? iss.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{iss.issue_no ?? iss.name ?? iss.id ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{iss.date ?? iss.created_at ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{iss.projects_id?.project_name ?? iss.project_name ?? iss.projects?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { setShowEditPreviousIssueModal(false); router.push(`/inventory-reports/issue-slip/${iss.id ?? iss.uuid}`); }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredIssueList.length > INVENTORY_LIST_PAGE_SIZE && (
                    <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-xs sm:text-sm ${textSecondary}`}>Page {issueEditModalPage} of {Math.ceil(filteredIssueList.length / INVENTORY_LIST_PAGE_SIZE)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setIssueEditModalPage(1)} disabled={issueEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setIssueEditModalPage(p => Math.max(1, p - 1))} disabled={issueEditModalPage <= 1} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronLeft className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setIssueEditModalPage(p => Math.min(Math.ceil(filteredIssueList.length / INVENTORY_LIST_PAGE_SIZE), p + 1))} disabled={issueEditModalPage >= Math.ceil(filteredIssueList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronRight className={`w-4 h-4 ${textSecondary}`} /></button>
                        <button onClick={() => setIssueEditModalPage(Math.ceil(filteredIssueList.length / INVENTORY_LIST_PAGE_SIZE))} disabled={issueEditModalPage >= Math.ceil(filteredIssueList.length / INVENTORY_LIST_PAGE_SIZE)} className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ChevronsRight className={`w-4 h-4 ${textSecondary}`} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <p className={`text-sm ${textSecondary}`}>No issues found. Create one using the Create New button.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory PR - View Details Modal */}
      {currentView === ViewType.INVENTORY_PR && showViewModal && viewingPr && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] max-h-[85vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-inherit flex-shrink-0">
              <h2 className={`text-lg font-black ${textPrimary}`}>Purchase Request Details</h2>
              <button
                onClick={() => { setShowViewModal(false); setViewingPr(null); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${cardClass}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Req No</p>
                  <p className={`text-sm font-black ${textPrimary}`}>{viewingPr.request_no ?? viewingPr.request_id ?? viewingPr.id ?? '-'}</p>
                </div>
                <div className={`p-3 rounded-lg border ${cardClass}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Date</p>
                  <p className={`text-sm font-black ${textPrimary}`}>{viewingPr.date ?? viewingPr.name ?? '-'}</p>
                </div>
                <div className={`p-3 rounded-lg border ${cardClass}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Project</p>
                  <p className={`text-sm font-black ${textPrimary}`}>{viewingPr.project_name ?? viewingPr.projects_id?.project_name ?? viewingPr.projects?.project_name ?? '-'}</p>
                </div>
                {viewingPr.subproject_name && (
                  <div className={`p-3 rounded-lg border ${cardClass}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Sub-Project</p>
                    <p className={`text-sm font-black ${textPrimary}`}>{viewingPr.subproject_name}</p>
                  </div>
                )}
                <div className={`p-3 rounded-lg border ${cardClass}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Created By</p>
                  <p className={`text-sm font-black ${textPrimary}`}>{viewingPr.created_by ?? viewingPr.users?.name ?? '-'}</p>
                </div>
              </div>
              {viewingPr.details && viewingPr.details.length > 0 && (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider p-3 border-b border-inherit ${textSecondary}`}>Material Request Details (same as report)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Sr.No</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Code</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Materials</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Specification</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Unit</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Required Qty</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Required Date</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Required for Activities</th>
                          <th className={`px-4 py-2 text-left text-xs font-black uppercase ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                        {viewingPr.details.map((d: any, i: number) => (
                          <tr key={i}>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{i + 1}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{d.materials?.code ?? '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{d.materials?.name ?? '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{(d.materials?.specification !== null && d.materials?.specification !== 'NULL') ? d.materials.specification : '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{d.materials?.unit ?? '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{d.qty ?? d.quantity ?? '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{d.date ?? '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{(d.activites?.activities != null && d.activites?.activities !== 'NULL') ? d.activites.activities : '-'}</td>
                            <td className={`px-4 py-2 text-sm ${textPrimary}`}>{(d.remarks != null && d.remarks !== 'NULL') ? d.remarks : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory PR - Create Project Modal */}
      {currentView === ViewType.INVENTORY_PR && (
        <CreateProjectModal
          theme={theme}
          isOpen={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={() => {
            setShowCreateProjectModal(false);
            // Refresh project list when modal closes (e.g. after create)
            if (showProjectSelection) {
              masterDataAPI.getProjects().then((fetched: any[]) => {
                const transformed: PRProject[] = (Array.isArray(fetched) ? fetched : []).map((p: any) => ({
                  id: p.uuid || String(p.id),
                  numericId: Number.isFinite(Number(p.id)) ? Number(p.id) : undefined,
                  name: p.project_name || p.name || '',
                  logo: getLogoUrl(p.logo, p.project_name || p.name || '', '6B8E23'),
                  code: p.code || '',
                  company: p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '',
                  location: p.address || p.location || ''
                }));
                setPrProjects(transformed);
              });
            }
          }}
          defaultProjects={[]}
          userProjects={prProjects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code || '',
            company: p.company || '',
            companyLogo: '',
            startDate: '',
            endDate: '',
            status: 'active',
            progress: 0,
            location: p.location || '',
            logo: p.logo
          }))}
          onProjectCreated={handlePRProjectCreated}
        />
      )}

      {/* Inventory PR - Create Subproject Modal */}
      {currentView === ViewType.INVENTORY_PR && (
        <CreateSubprojectModal
          theme={theme}
          isOpen={showCreateSubprojectModal}
          onClose={() => setShowCreateSubprojectModal(false)}
          onSuccess={() => {
            setShowCreateSubprojectModal(false);
            if (prSelectedProject && prStep === 'subproject') {
              const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
              masterDataAPI.getProjectSubprojects(projectId).then((result: any) => {
                const list = Array.isArray(result) ? result : result?.subProject ?? result?.data ?? [];
                const transformed: PRSubproject[] = list.map((sub: any) => ({
                  id: sub.uuid || String(sub.id),
                  numericId: Number.isFinite(Number(sub.id)) ? Number(sub.id) : undefined,
                  name: sub.name || sub.subproject_name || '',
                  code: sub.code || `SUB${String(sub.id || '').padStart(3, '0')}`,
                  project: prSelectedProject.name,
                  manager: sub.manager || sub.project_manager || '',
                  status: sub.status || 'pending'
                }));
                setPrSubprojects(transformed);
              });
            }
          }}
          defaultProjectId={prSelectedProject?.id || ''}
          defaultProjectName={prSelectedProject?.name || ''}
          defaultSubprojects={[]}
          userSubprojects={[]}
          onSubprojectCreated={handlePRSubprojectCreated}
        />
      )}

      {/* Inventory PR - Create Material Modal (adds to Masters, then refreshes list for selection) */}
      {currentView === ViewType.INVENTORY_PR && (
        <CreateMaterialModal
          theme={theme}
          isOpen={showCreateMaterialModal}
          onClose={() => setShowCreateMaterialModal(false)}
          onSuccess={() => {
            setShowCreateMaterialModal(false);
            if (prStep === 'materials') {
              masterDataAPI.getMaterials().then((fetched: any[]) => {
                const list = Array.isArray(fetched) ? fetched : [];
                const transformed: PRMaterial[] = list.map((m: any) => {
                  const materialClass = m.class?.value || m.class || '';
                  const unitObj = m.units || m.unit;
                  const unitLabel = unitObj?.unit || unitObj?.name || (typeof m.unit === 'string' ? m.unit : '') || '';
                  return {
                    id: m.uuid || String(m.id),
                    numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
                    class: (materialClass || 'B') as string,
                    code: m.code || '',
                    name: m.name || '',
                    specification: m.specification ?? '',
                    unit: unitLabel
                  };
                });
                setPrMaterials(transformed);
              });
            }
          }}
          materials={prMaterials.map(m => ({
            id: m.id,
            class: (['A', 'B', 'C'].includes(m.class) ? m.class : 'B') as 'A' | 'B' | 'C',
            code: m.code,
            name: m.name,
            specification: m.specification,
            unit: m.unit
          }))}
        />
      )}
    </div>
  );
};

export default GenericView;
