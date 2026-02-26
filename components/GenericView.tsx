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
  Download
} from 'lucide-react';
import { masterDataAPI, materialRequestAPI } from '../services/api';
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

interface ViewConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  columns: string[];
  sampleData: Array<Record<string, string>>;
}

const GenericView: React.FC<GenericViewProps> = ({ theme, currentView }) => {
  const toast = useToast();
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Inventory PR - wizard step: 'project' | 'subproject' | 'materials'
  const [prStep, setPrStep] = useState<'project' | 'subproject' | 'materials'>('project');
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
  const [showEditPreviousModal, setShowEditPreviousModal] = useState(false);
  const [prEditingId, setPrEditingId] = useState<number | string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingPr, setViewingPr] = useState<any>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingEditPr, setIsLoadingEditPr] = useState(false);

  // Fetch projects when project selection modal opens for INVENTORY_PR
  useEffect(() => {
    if (!showProjectSelection || currentView !== ViewType.INVENTORY_PR) return;
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
        const transformed: PRProject[] = (Array.isArray(fetched) ? fetched : []).map((p: any) => ({
          id: p.uuid || String(p.id),
          numericId: Number.isFinite(Number(p.id)) ? Number(p.id) : undefined,
          name: p.project_name || p.name || '',
          logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name || p.name || '')}&background=6B8E23&color=fff&size=128`,
          code: p.code || '',
          company: p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '',
          location: p.address || p.location || ''
        }));
        setPrProjects(transformed);
      })
      .catch(() => setPrProjects([]))
      .finally(() => setIsLoadingProjects(false));
  }, [showProjectSelection, currentView]);

  // Fetch subprojects when on subproject step with selected project
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'subproject' || !prSelectedProject) {
      setPrSubprojects([]);
      return;
    }
    setIsLoadingSubprojects(true);
    const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
    masterDataAPI.getSubprojects(projectId)
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

  // Fetch materials when on materials step (skip when editing - we load in handlePREditClick)
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'materials') return;
    if (prEditingId) return; // Editing: materials already loaded in handlePREditClick
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
  }, [currentView, prStep, prEditingId]);

  // Fetch all activities for Tag Activity dropdown (activities-list) - skip when editing (loaded in handlePREditClick)
  useEffect(() => {
    if (currentView !== ViewType.INVENTORY_PR || prStep !== 'materials') return;
    if (prEditingId) return;
    setIsLoadingActivities(true);
    masterDataAPI.getActivities()
      .then((res) => {
        const list = res?.data ?? [];
        const transformed: PRActivity[] = (Array.isArray(list) ? list : []).map((a: any) => ({
          id: a.uuid || String(a.id),
          numericId: Number.isFinite(Number(a.id)) ? Number(a.id) : undefined,
          name: a.name || a.activity_name || ''
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

  const handlePRSelectProject = (project: PRProject) => {
    setPrSelectedProject(project);
  };

  const handlePRProjectStepNext = () => {
    if (prSelectedProject) setPrStep('subproject');
  };

  const handlePRCloseModal = () => {
    setShowProjectSelection(false);
    setPrStep('project');
    setPrSelectedProject(null);
    setPrSelectedSubproject(null);
    setPrSelectedMaterials(new Map());
    setPrEditingId(null);
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

  const handlePRSubprojectStepNext = () => {
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
    setIsSubmittingPR(true);
    try {
      const projectId = prSelectedProject.numericId ?? prSelectedProject.id;
      const subprojectId = prSelectedSubproject ? (prSelectedSubproject.numericId ?? prSelectedSubproject.id) : undefined;
      const headerData: { projects_id: string | number; sub_projects_id?: string | number; id?: string | number; request_id?: string } = { projects_id: projectId };
      if (subprojectId) headerData.sub_projects_id = subprojectId;
      if (prEditingId) {
        headerData.id = prEditingId;
        if (prReqNo.trim()) headerData.request_id = prReqNo.trim();
      }
      const header = await materialRequestAPI.add(headerData);
      const materialRequestId = header?.id ?? header?.data?.id ?? prEditingId;
      if (!materialRequestId) {
        throw new Error('Failed to create/update material request: no ID returned');
      }
      const details = Array.from(prSelectedMaterials.values()).map((m) => ({
        inventoryId: materialRequestId,
        material_id: m.materialNumericId ?? m.materialId,
        projects_id: projectId,
        qty: m.quantity,
        ...(subprojectId ? { sub_projects_id: subprojectId } : {}),
        ...(m.activityId ? { activities_id: m.activityId } : {}),
        ...(m.requiredDate ? { date: m.requiredDate } : {}),
        ...(m.remark ? { remarks: m.remark } : {}),
      }));
      await materialRequestAPI.detailsAdd(details);
      toast.showSuccess(prEditingId ? 'Purchase request updated successfully.' : 'Purchase request created successfully.');
      handlePRCloseModal();
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
      logo: newProject.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(newProject.name || newProject.project_name || '')}&background=6B8E23&color=fff&size=128`,
      code: newProject.code || '',
      company: newProject.company || '',
      location: newProject.location || ''
    }]);
    setShowCreateProjectModal(false);
  };

  const handlePRViewClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      const editResp = await materialRequestAPI.edit(prId);
      const detailsFromEdit = Array.isArray(editResp) ? editResp : (editResp && typeof editResp === 'object' && Array.isArray((editResp as any).data) ? (editResp as any).data : []);
      const materialIds = detailsFromEdit.map((d: any) => d.materials_id).filter((v: any) => v != null);
      let enrichedDetails = detailsFromEdit;
      if (materialIds.length > 0) {
        try {
          const editResp2 = await materialRequestAPI.detailsEdit(prId, materialIds);
          const editData = Array.isArray(editResp2) ? editResp2 : (editResp2 as any)?.data ?? [];
          if (editData.length > 0) {
            const editByMatId = new Map<string, any>();
            for (const item of editData) {
              const mid = String(item?.id ?? item?.materials_id ?? '');
              if (mid) editByMatId.set(mid, item);
            }
            enrichedDetails = detailsFromEdit.map((d: any) => {
              const item = editByMatId.get(String(d.materials_id));
              if (!item) return { materials: null, materials_id: d.materials_id, qty: d.qty, date: d.date, remarks: d.remarks, activites: null };
              const rel = item?.materialsRequestDetails ?? item?.material_request_details ?? item?.details;
              const det = (rel && (!Array.isArray(rel) || rel.length > 0)) ? (Array.isArray(rel) ? rel[0] : rel) : null;
              const actRaw = det?.activities_id ?? det?.activity_id ?? item?.activities_id;
              const actName = typeof actRaw === 'object' && actRaw != null ? (actRaw as any)?.activities ?? (actRaw as any)?.name ?? '' : '';
              const unitObj = item?.units ?? item?.unit_id ?? item?.unit;
              const unitLabel = typeof unitObj === 'object' && unitObj != null ? ((unitObj as any)?.unit ?? (unitObj as any)?.name ?? '') : (typeof unitObj === 'string' ? unitObj : '');
              return {
                materials: { code: item?.code ?? '', name: item?.name ?? '', specification: item?.specification ?? '', unit: unitLabel },
                materials_id: item?.id ?? item?.materials_id,
                qty: det?.qty ?? item?.qty ?? 0,
                date: det?.date ?? item?.date ?? '',
                remarks: det?.remarks ?? item?.remarks ?? '',
                activites: actName ? { activities: actName } : null
              };
            });
          }
        } catch (_) {
          const [mats, acts] = await Promise.all([masterDataAPI.getMaterials().catch(() => []), masterDataAPI.getActivities().catch(() => ({ data: [] }))]);
          const materialsList = Array.isArray(mats) ? mats : [];
          const activitiesList = Array.isArray(acts?.data ?? acts) ? (acts?.data ?? acts) : [];
          enrichedDetails = detailsFromEdit.map((d: any) => {
            const m = materialsList.find((x: any) => String(x.id) === String(d.materials_id));
            const a = activitiesList.find((x: any) => String(x.id) === String(d.activities_id));
            const unitObj = m?.units ?? m?.unit_id ?? m?.unit;
            const unitLabel = typeof unitObj === 'object' && unitObj != null ? ((unitObj as any)?.unit ?? (unitObj as any)?.name ?? '') : (typeof unitObj === 'string' ? unitObj : '');
            return {
              materials: m ? { code: m.code ?? '', name: m.name ?? '', specification: m.specification ?? '', unit: unitLabel } : null,
              materials_id: d.materials_id,
              qty: d.qty,
              date: d.date,
              remarks: d.remarks,
              activites: a ? { activities: a.activities ?? a.name ?? a.activity_name ?? '' } : null
            };
          });
        }
      }
      setViewingPr({
        request_no: pr.request_no ?? pr.request_id ?? '',
        date: pr.date ?? pr.name ?? '',
        project_name: pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? '',
        subproject_name: pr.sub_projects_id?.name ?? pr.subprojects?.name ?? pr.subprojects?.subproject_name ?? '',
        created_by: pr.users?.name ?? pr.created_by ?? '',
        details: enrichedDetails
      });
      setShowViewModal(true);
    } catch (e) {
      toast.showError('Failed to load purchase request details.');
    }
  };

  const handlePRDownloadClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      const { pdf_url } = await materialRequestAPI.generatePdf(prId);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const fullUrl = pdf_url.startsWith('http') ? pdf_url : apiBase.replace(/\/api\/?$/, '') + (pdf_url.startsWith('/') ? pdf_url : '/' + pdf_url);
      window.open(fullUrl, '_blank');
      toast.showSuccess('PDF opened in new tab.');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to generate PDF.');
    }
  };

  const handlePREditClick = async (pr: any) => {
    const prId = pr.id ?? pr.uuid;
    if (!prId) return;
    try {
      setShowEditPreviousModal(false);
      setIsLoadingEditPr(true);
      setPrEditingId(prId); // Set early so useEffects don't overwrite our loaded data
      setShowProjectSelection(true);
      setPrStep('materials');
      const editResp = await materialRequestAPI.edit(prId);
      const detailsFromEdit = Array.isArray(editResp) ? editResp : (editResp && typeof editResp === 'object' && Array.isArray((editResp as any).data) ? (editResp as any).data : []);
      const firstDetail = detailsFromEdit.length > 0 ? detailsFromEdit[0] : null;
      const projectsIdRaw = firstDetail?.projects_id ?? pr.projects_id ?? pr.projects?.id;
      const projectId = (typeof projectsIdRaw === 'object' && projectsIdRaw !== null && projectsIdRaw !== undefined && 'id' in projectsIdRaw) ? (projectsIdRaw as any).id : projectsIdRaw;
      const subProjIdRaw = firstDetail?.sub_projects_id ?? pr.sub_projects_id ?? pr.sub_projects?.id;
      const subProjId = (typeof subProjIdRaw === 'object' && subProjIdRaw !== null && subProjIdRaw !== undefined && 'id' in subProjIdRaw) ? (subProjIdRaw as any).id : subProjIdRaw;
      const [fetchedProjects, subprojResult, materialsList, detailsListResp, activitiesResp] = await Promise.all([
        masterDataAPI.getProjects(),
        projectId ? masterDataAPI.getSubprojects(projectId) : Promise.resolve([]),
        masterDataAPI.getMaterials(),
        projectId ? materialRequestAPI.detailsList(projectId).catch(() => []) : Promise.resolve([]),
        masterDataAPI.getActivities().catch(() => ({ data: [] }))
      ]);
      if (!projectId) {
        toast.showError('Purchase request has no project.');
        setPrEditingId(null);
        setIsLoadingEditPr(false);
        return;
      }
      const projectsList = Array.isArray(fetchedProjects) ? fetchedProjects : [];
      const p = projectsList.find((x: any) => String(x.id ?? x.uuid) === String(projectId));
      if (!p) {
        toast.showError('Project not found.');
        setPrEditingId(null);
        setIsLoadingEditPr(false);
        return;
      }
      const proj: PRProject = {
        id: p.uuid ?? String(p.id),
        numericId: Number.isFinite(Number(p.id)) ? Number(p.id) : undefined,
        name: p.project_name ?? p.name ?? '',
        logo: p.logo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name ?? p.name ?? '')}&background=6B8E23&color=fff&size=128`,
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
            const editResp = await materialRequestAPI.detailsEdit(prId, materialIdsToFetch);
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
      setPrReqNo(pr.request_no ?? pr.request_id ?? firstDetail?.request_id ?? '');
      setPrSelectedMaterials(selectedMap);
    } catch (e) {
      toast.showError('Failed to load purchase request for editing.');
      setPrEditingId(null);
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
          sampleData: [
            { name: 'John Doe', email: 'john.doe@company.com', role: 'Project Manager', team: 'Team Alpha', status: 'Active' },
            { name: 'Jane Smith', email: 'jane.smith@company.com', role: 'Site Engineer', team: 'Team Beta', status: 'Active' },
          ]
        };
      case ViewType.USER_ROLES_PERMISSIONS:
        return {
          title: 'User Roles and Permissions',
          icon: ShieldCheck,
          description: 'Configure user roles and their permissions',
          columns: ['Role Name', 'Description', 'Users', 'Permissions', 'Status'],
          sampleData: [
            { name: 'Admin', description: 'Full system access', users: '5', permissions: 'All', status: 'Active' },
            { name: 'Project Manager', description: 'Project management access', users: '12', permissions: 'Project, Reports', status: 'Active' },
          ]
        };
      case ViewType.PROJECT_PERMISSIONS:
        return {
          title: 'Project Permissions',
          icon: ShieldCheck,
          description: 'Manage project-level access and permissions',
          columns: ['Project', 'User/Role', 'Permission Type', 'Access Level', 'Status'],
          sampleData: [
            { project: 'Residential Complex A', userRole: 'John Doe', type: 'Read/Write', level: 'Full', status: 'Active' },
            { project: 'Commercial Tower B', userRole: 'Jane Smith', type: 'Read Only', level: 'Limited', status: 'Active' },
          ]
        };
      case ViewType.PR_MANAGEMENT:
      case ViewType.PR_APPROVAL_MANAGE:
        return {
          title: currentView === ViewType.PR_MANAGEMENT ? 'PR Management' : 'PR Approval Manage',
          icon: ClipboardCheck,
          description: 'Manage purchase requisitions and approvals',
          columns: ['PR Number', 'Requested By', 'Department', 'Amount', 'Status'],
          sampleData: [
            { prNumber: 'PR-2024-001', requestedBy: 'John Doe', department: 'Construction', amount: '$15,000', status: 'Pending Approval' },
            { prNumber: 'PR-2024-002', requestedBy: 'Jane Smith', department: 'Procurement', amount: '$8,500', status: 'Approved' },
          ]
        };
      case ViewType.PR:
        return {
          title: 'PR',
          icon: FileText,
          description: 'Purchase requisition details and management',
          columns: ['PR Number', 'Date', 'Items', 'Total Amount', 'Status'],
          sampleData: [
            { prNumber: 'PR-2024-001', date: '2024-01-15', items: '5', amount: '$15,000', status: 'Pending' },
            { prNumber: 'PR-2024-002', date: '2024-01-20', items: '3', amount: '$8,500', status: 'Approved' },
          ]
        };
      case ViewType.INVENTORY_PR:
        return {
          title: 'Purchase Request',
          icon: ClipboardCheck,
          description: 'Create and manage purchase requisitions',
          columns: ['PR Number', 'Date', 'Project', 'Items', 'Total Amount', 'Status'],
          sampleData: []
        };
      case ViewType.REPORTS:
      case ViewType.WORK_PROGRESS_REPORTS:
        return {
          title: currentView === ViewType.REPORTS ? 'Reports' : 'Work Progress Reports',
          icon: BarChart3,
          description: 'View and generate work progress reports',
          columns: ['Report Name', 'Project', 'Period', 'Progress', 'Status'],
          sampleData: [
            { reportName: 'Weekly Progress - Week 1', project: 'Residential Complex A', period: 'Jan 1-7', progress: '45%', status: 'Completed' },
            { reportName: 'Monthly Summary - January', project: 'Commercial Tower B', period: 'Jan 2024', progress: '78%', status: 'In Progress' },
          ]
        };
      case ViewType.INVENTORY_REPORTS:
        return {
          title: 'Inventory Reports',
          icon: Package,
          description: 'Generate and view inventory reports',
          columns: ['Report Name', 'Warehouse', 'Date', 'Items Count', 'Status'],
          sampleData: [
            { reportName: 'Monthly Inventory - Jan', warehouse: 'Main Warehouse', date: '2024-01-31', itemsCount: '250', status: 'Generated' },
            { reportName: 'Stock Level Report', warehouse: 'Storage Facility B', date: '2024-02-01', itemsCount: '180', status: 'Generated' },
          ]
        };
      case ViewType.LABOUR_STRENGTH:
        return {
          title: 'Labour Strength',
          icon: UsersRound,
          description: 'View labour workforce strength and statistics',
          columns: ['Trade', 'Total Workers', 'Available', 'Assigned', 'Skill Level'],
          sampleData: [
            { trade: 'Carpenters', total: '45', available: '12', assigned: '33', skillLevel: 'Mixed' },
            { trade: 'Electricians', total: '28', available: '8', assigned: '20', skillLevel: 'Expert' },
          ]
        };
      case ViewType.WORK_CONTRACTOR:
        return {
          title: 'Work Contractor',
          icon: Briefcase,
          description: 'Manage contractors and their work assignments',
          columns: ['Contractor Name', 'Code', 'Specialization', 'Projects', 'Status'],
          sampleData: [
            { name: 'ABC Contractors Ltd', code: 'CON001', specialization: 'Civil Works', projects: '3', status: 'Active' },
            { name: 'DEF Contractors Ltd', code: 'CON002', specialization: 'Electrical', projects: '2', status: 'Active' },
          ]
        };
      case ViewType.SUBSCRIPTION:
        return {
          title: 'Subscription',
          icon: CreditCard,
          description: 'Manage subscription plans and billing',
          columns: ['Plan Name', 'Features', 'Price', 'Users', 'Status'],
          sampleData: [
            { planName: 'Enterprise Plan', features: 'All Features', price: '$999/month', users: 'Unlimited', status: 'Active' },
            { planName: 'Professional Plan', features: 'Standard Features', price: '$499/month', users: '50', status: 'Active' },
          ]
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
          {currentView === ViewType.INVENTORY_PR ? (
            <>
              <button
                onClick={handlePRCreateNew}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
              >
                <Plus className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Create New</span><span className="sm:hidden">Create</span>
              </button>
              <button
                onClick={() => setShowEditPreviousModal(true)}
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

      {/* Stats Cards - show first for INVENTORY_PR (Masters-style dashboard) */}
      {currentView === ViewType.INVENTORY_PR && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
            <p className={`text-2xl font-black ${textPrimary}`}>{filteredPrList.length}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Approved</p>
            <p className={`text-2xl font-black text-[#C2D642]`}>{filteredPrList.filter((p: any) => p.status === 1).length}</p>
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
            placeholder={currentView === ViewType.INVENTORY_PR ? "Search by Req No, project, subproject, created by..." : "Search..."} 
            value={currentView === ViewType.INVENTORY_PR ? prSearchQuery : ''}
            onChange={(e) => { if (currentView === ViewType.INVENTORY_PR) setPrSearchQuery(e.target.value); }}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
          />
        </div>
        {currentView === ViewType.INVENTORY_PR ? (
          <button 
            onClick={() => { setPrSearchQuery(''); fetchPrList(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'} shadow-sm`}
            title="Refresh Purchase Requests"
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
                    {filteredPrList.map((pr: any) => (
                      <tr key={pr.id || pr.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{pr.request_no ?? pr.request_id ?? pr.id ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.date ?? pr.name ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? pr.projects?.name ?? '-'}</td>
                        <td className={`px-6 py-4 text-sm ${textPrimary}`}>{pr.users?.name ?? pr.created_by ?? pr.user?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePRViewClick(pr)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`} title="View">
                              <Eye className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                            <button onClick={() => handlePREditClick(pr)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`} title="Edit">
                              <Edit className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                            <button onClick={() => handlePRDownloadClick(pr)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`} title="Download">
                              <Download className={`w-4 h-4 ${textSecondary}`} />
                            </button>
                          </div>
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
              <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Purchase Requests</h3>
              <p className={`text-sm ${textSecondary}`}>Create your first purchase request using the Create New button above</p>
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
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first entry</p>
        </div>
      )}

      {/* Stats Cards - for non-INVENTORY_PR views (PR stats shown above) */}
      {currentView !== ViewType.INVENTORY_PR && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
            <p className={`text-2xl font-black ${textPrimary}`}>{config.sampleData.length}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
            <p className={`text-2xl font-black text-[#C2D642]`}>{config.sampleData.length}</p>
          </div>
          <div className={`p-4 rounded-xl border ${cardClass}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
            <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
          </div>
        </div>
      )}

      {/* Inventory PR - Project & Subproject Selection Modal (multi-step) */}
      {currentView === ViewType.INVENTORY_PR && showProjectSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1100px)] h-[calc(100vh-2rem)] max-h-[90vh] my-auto overflow-hidden flex flex-col`}>
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
                      <p className={`text-sm ${textSecondary} mt-1`}>Choose a project for your purchase request</p>
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
                              className={`rounded-xl border p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                                isSelected
                                  ? isDark ? 'border-[#6B8E23] bg-[#6B8E23]/10' : 'border-[#6B8E23] bg-[#6B8E23]/5'
                                  : `${cardClass} ${isDark ? 'hover:border-[#6B8E23]/50' : 'hover:border-[#6B8E23]/30'}`
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 mb-3 flex-shrink-0 group-hover:border-[#6B8E23]/50 transition-colors ${isSelected ? 'border-[#6B8E23]' : 'border-[#6B8E23]/20'}`}>
                                  <img
                                    src={project.logo}
                                    alt={project.name}
                                    className="w-full h-full object-cover"
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
                    <button onClick={handlePRProjectStepNext} disabled={!prSelectedProject} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${prSelectedProject ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-slate-400 text-white cursor-not-allowed'} shadow-md`}>
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Subproject Selection (optional) */}
            {prStep === 'subproject' && prSelectedProject && (
              <>
                <div className={`${bgPrimary} flex-shrink-0`}>
                  <div className="flex items-start gap-4 p-4 sm:p-6 pr-16 sm:pr-20 border-b border-inherit">
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Step 2: Subproject (Optional)</h2>
                      <p className={`text-sm ${textSecondary} mt-1`}>
                        Select a subproject for <span className="font-bold text-[#6B8E23]">{prSelectedProject.name}</span>, or click Next to continue without one
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
                    <button onClick={handlePRSubprojectStepNext} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-[#6B8E23] hover:bg-[#5a7a1e] text-white shadow-md`}>
                      Next <ArrowRight className="w-4 h-4" />
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
                                  <tr key={mat.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} ${isSelected ? (isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5') : ''}`}>
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3">
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
                      {isSubmittingPR ? (prEditingId ? 'Updating...' : 'Creating...') : (prEditingId ? 'Update' : 'Create')}
                    </button>
                  </div>
                </div>
              </>
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
                      {filteredPrList.map((pr: any) => (
                        <tr key={pr.id ?? pr.uuid} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{pr.date ?? pr.name ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{pr.projects_id?.project_name ?? pr.project_name ?? pr.projects?.project_name ?? pr.projects?.name ?? '-'}</td>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{pr.users?.name ?? pr.created_by ?? pr.user?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handlePREditClick(pr)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-[#6B8E23]/20 text-[#6B8E23] hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 text-[#6B8E23] hover:bg-[#6B8E23]/20'}`}
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  logo: p.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.project_name || p.name || '')}&background=6B8E23&color=fff&size=128`,
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
              masterDataAPI.getSubprojects(projectId).then((result: any) => {
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
