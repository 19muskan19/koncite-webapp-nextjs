'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Package,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Share2,
  ExternalLink,
  Check,
  X,
  Eye,
  Search,
} from 'lucide-react';
import { masterDataAPI, goodsReturnAPI } from '@/services/api';
import CreateWarehouseModal from '@/components/masters/Modals/CreateWarehouseModal';
import { getTodayDateString } from '@/utils/dateUtils';
import { getAuthToken } from '@/services/apiClient';

type GoodsReturnStep = 'stores' | 'assetReturn' | 'details' | 'success';

interface GoodsReturnFlowProps {
  mode: 'create' | 'edit';
  projectId?: string;
  projectName?: string;
  projectNumericId?: string;
  returnId?: string;
}

interface StoreItem {
  id: string | number;
  numericId?: number;
  name: string;
  code?: string;
  location?: string;
  store_warehouses_id?: number | string;
}

interface IssueType {
  id: string | number;
  name: string;
  slug?: string;
}

interface MaterialItem {
  id: string | number;
  numericId?: number;
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  stock?: string | number;
}

interface ReturnDetailItem {
  inv_return_goods_id: string | number;
  materials_id: string | number;
  materialNumericId?: number;
  materialCode: string;
  materialName: string;
  materialUnit?: string;
  materialSpec?: string;
  return_qty: number | string;
  stock_qty?: number | string;
  remarkes?: string;
  activities_id?: string | number;
  activityName?: string;
  id?: string | number | null;
}

export default function GoodsReturnFlow({
  mode,
  projectId,
  projectName,
  projectNumericId,
  returnId,
}: GoodsReturnFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const toast = useToast();
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'card-dark' : 'card-light';

  const pid = projectId ?? searchParams?.get('projectId') ?? '';
  const rawName = projectName ?? searchParams?.get('projectName') ?? 'Project';
  const pName = (() => {
    try {
      return rawName && rawName.includes('%') ? decodeURIComponent(rawName) : rawName;
    } catch {
      return rawName;
    }
  })();
  const pNumId = projectNumericId ?? searchParams?.get('projectNumericId') ?? pid;
  const editReturnId = returnId ?? searchParams?.get('returnId');

  const [editProject, setEditProject] = useState<{ id: string; name: string; numericId?: string } | null>(null);

  const [step, setStep] = useState<GoodsReturnStep>(() => (mode === 'edit' ? 'assetReturn' : 'stores'));
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [returnHeader, setReturnHeader] = useState<any>(null);
  const [isCreatingHeader, setIsCreatingHeader] = useState(false);
  const [returnDate, setReturnDate] = useState(() => getTodayDateString());
  const [returnFrom, setReturnFrom] = useState<string>('');
  const [returnFromId, setReturnFromId] = useState<string | number>('');
  const [tagId, setTagId] = useState<string | number>('');
  const [tagOptions, setTagOptions] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [goodsType, setGoodsType] = useState<'materials' | 'machines'>('materials');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [returnGoodsList, setReturnGoodsList] = useState<any[]>([]);
  const [details, setDetails] = useState<ReturnDetailItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set()); // Start collapsed; user expands to edit
  const [activities, setActivities] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTagActivityModal, setShowTagActivityModal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfInfo, setPdfInfo] = useState<{ url?: string; name?: string } | null>(null);
  const [savedReturnDetails, setSavedReturnDetails] = useState<any[]>([]);
  const [returnNoFromBackend, setReturnNoFromBackend] = useState<string | null>(null);
  const [showProjectSelectModal, setShowProjectSelectModal] = useState(false);
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [storeRefreshKey, setStoreRefreshKey] = useState(0);
  const [projectList, setProjectList] = useState<{ id: string; numericId?: number; name: string; logo?: string }[]>([]);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<{ id: string; numericId?: number; name: string } | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [materialsSearchQuery, setMaterialsSearchQuery] = useState('');
  const [materialsPage, setMaterialsPage] = useState(1);
  const MATERIALS_PAGE_SIZE = 10;

  const projectIdForApi = () => (editProject?.numericId ?? editProject?.id ?? pNumId) || pid || undefined;
  const hasProjectForEdit = () => !!projectIdForApi();
  const projectNameForDisplay = () => editProject?.name ?? pName;

  // In edit mode, set editProject from URL immediately so Project ID shows before API response
  useEffect(() => {
    if (mode === 'edit' && pid && !editProject) {
      setEditProject({ id: String(pid), name: pName || 'Project', numericId: String(pid) });
    }
  }, [mode, pid, pName]);

  useEffect(() => {
    if (mode === 'create') {
      if (!pid) {
        toast.showWarning('Project is required. Redirecting...');
        router.push('/inventory-reports/issue-return');
        return;
      }
      setIsLoading(false);
    } else if (mode === 'edit' && editReturnId) {
      // Resolve project_id: from URL (pid) or by fetching return-list to find matching row
      const resolveProjectId = (): Promise<string | number | undefined> => {
        if (pid) return Promise.resolve(pid);
        return goodsReturnAPI.list().then((list: any[]) => {
          const arr = Array.isArray(list) ? list : [];
          const ret = arr.find((r: any) => String(r.inv_returns_id ?? r.id ?? r.uuid) === String(editReturnId));
          const proj = ret?.projects_id ?? ret?.project_id ?? ret?.projects ?? ret?.project;
          const projId = typeof proj === 'object' ? proj?.id ?? proj?.uuid : proj;
          return projId != null && projId !== '' ? projId : undefined;
        }).catch(() => undefined);
      };
      resolveProjectId().then((projectIdForEdit) => {
        goodsReturnAPI
          .edit(editReturnId, projectIdForEdit)
          .then((raw) => {
          // Unwrap nested data - API may return { data: {...} } or the inner object directly
          const inner = raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
          const hasNested = inner && (raw.data.inv_return != null || raw.data.inv_return_details != null || raw.data.inv_return_goods != null);
          const data = hasNested ? raw.data : raw;
          // return-edit: header may be in inv_return, inv_return_goods, or top-level
          const goods = data?.inv_return_goods;
          const invReturn = data?.inv_return ?? data?.return;
          const header = goods ?? invReturn ?? data;
          const storeArr = Array.isArray(header?.store_id) ? header.store_id : Array.isArray(header?.store_warehouses_id) ? header.store_warehouses_id : [];
          const firstStore = storeArr[0];
          // Project is in inv_return.projects_id (object with id, project_name) - prefer inv_return for project
          const proj = invReturn?.projects_id ?? header?.projects_id ?? header?.project_id ?? header?.projects ?? firstStore?.projects_id ?? firstStore?.projects ?? data?.projects_id ?? data?.project;
          const projId = typeof proj === 'object' ? proj?.id ?? proj?.uuid : proj;
          const projName = typeof proj === 'object' ? proj?.project_name ?? proj?.name : '';
          // Use projectIdForEdit (from return-list) when API response has no project - avoids duplicate list fetch
          const effectiveProjId = projId ?? projectIdForEdit ?? (pid ? pid : undefined);
          const displayName = projName || (pName && pName !== 'Project' ? pName : 'Project');
          // Always set editProject when we have project (from API or URL) so stores load and UI shows
          if (effectiveProjId) {
            setEditProject({
              id: String(effectiveProjId),
              name: displayName,
              numericId: typeof proj === 'object' && proj != null ? String((proj as any).id ?? projId) : String(effectiveProjId),
            });
          } else if (pid) {
            // Fallback: use projectId from URL when API doesn't return project
            setEditProject({ id: String(pid), name: pName || 'Project', numericId: String(pid) });
          } else {
            // Last resort: fetch return list and get project from matching row (Edit link may omit projectId)
            goodsReturnAPI.list().then((list: any[]) => {
              const arr = Array.isArray(list) ? list : [];
              const ret = arr.find((r: any) => {
                const rid = r.inv_returns_id ?? r.id ?? r.uuid;
                return String(rid) === String(editReturnId);
              });
              const proj = ret?.projects_id ?? ret?.project_id ?? ret?.projects;
              const projId = typeof proj === 'object' ? proj?.id ?? proj?.uuid : proj;
              const projName = typeof proj === 'object' ? proj?.project_name ?? proj?.name : '';
              if (projId != null && projId !== '') {
                setEditProject({ id: String(projId), name: projName || 'Project', numericId: String(projId) });
              }
            }).catch(() => {});
          }
          // Always set form data when we have a response (don't block on project)
          // inv_returns_id (88) = return header for inv_return_id; data.id (68) = inv_return_goods_id for return-goods-add UPDATE
          const invReturnsId = data?.inv_returns_id ?? header?.id ?? header?.uuid ?? data?.inv_return_id ?? data?.uuid;
          const invReturnGoodsId = data?.id ?? data?.inv_return_goods_id ?? data?.uuid; // inv_return_goods_id for details linking
          setReturnHeader({ ...data, inv_returns_id: invReturnsId, inv_return_goods_id: invReturnGoodsId });
          setReturnNoFromBackend(data?.return_no ?? header?.return_no ?? header?.name ?? null);
          setReturnDate(data?.date ?? header?.date ?? header?.name ?? getTodayDateString());
          const returnFromRaw = data?.inv_issue_lists_id ?? data?.type ?? data?.return_from ?? header?.inv_issue_lists_id;
          const returnFromIdVal = typeof returnFromRaw === 'object' && returnFromRaw != null ? (returnFromRaw as any)?.id ?? (returnFromRaw as any)?.uuid : returnFromRaw;
          setReturnFromId(returnFromIdVal ?? '');
          const returnFromName = typeof returnFromRaw === 'object' && returnFromRaw != null ? (returnFromRaw as any)?.name ?? (returnFromRaw as any)?.project_name ?? '' : '';
          setReturnFrom(returnFromName || '');
          setTagId(data?.issue_type_tag_id ?? data?.tag ?? header?.issue_type_tag_id ?? '');
          const storeIds = invReturn?.store_id ?? invReturn?.store_warehouses_id ?? header?.store_id ?? header?.store_warehouses_id ?? data?.store_warehouses_id ?? data?.store_warehouses ?? data?.store_id ?? [];
          const arr = Array.isArray(storeIds) ? storeIds : storeIds != null ? [storeIds] : [];
          const extractStoreId = (s: any): string | number | undefined => {
            if (s == null) return undefined;
            if (typeof s === 'object') {
              const id = s?.id ?? s?.store_id ?? s?.store_warehouses_id ?? s?.uuid;
              return typeof id === 'object' ? (id?.id ?? id?.store_warehouses_id) : id;
            }
            return s;
          };
          const loadedIds = arr.map(extractStoreId).filter((x): x is string | number => x != null && x !== '');
          setEditLoadedStoreIds(loadedIds);
          // Backend returns inv_return_details - check goods, header, data
          const detailsList = data?.inv_return_details ?? goods?.inv_return_details ?? header?.inv_return_details ?? data?.details ?? data?.return_details ?? data?.return?.inv_return_details ?? [];
          const mapped: ReturnDetailItem[] = (Array.isArray(detailsList) ? detailsList : []).map((d: any) => {
            const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d?.assets ?? d;
            const matObj = typeof mat === 'object' && mat != null ? mat : {};
            return {
              inv_return_goods_id: d.inv_return_goods_id ?? d.inv_return_goods ?? d.inv_issue_goods_id ?? invReturnGoodsId,
              materials_id: typeof matObj?.id === 'number' || typeof matObj?.id === 'string' ? matObj.id : (d.materials_id ?? d.material_id ?? d.materials?.id),
              materialNumericId: typeof matObj?.id !== 'undefined' ? matObj.id : (d.materials?.id ?? d.materials_id),
              materialCode: matObj?.code ?? d?.code ?? '',
              materialName: matObj?.name ?? d?.name ?? '',
              materialUnit: matObj?.unit_id?.unit ?? matObj?.units?.unit ?? matObj?.unit ?? d?.unit ?? '',
              materialSpec: matObj?.specification ?? d?.specification ?? '',
              return_qty: d.issue_qty ?? d.return_qty ?? d.qty ?? 0,
              stock_qty: d.stock_qty ?? d.stock ?? d.available_stock ?? d.materials?.stock_qty ?? d.materials?.stock ?? 0,
              remarkes: d.remarkes ?? d.remarks ?? '',
              activities_id: d.activities_id ?? d.activity_id,
              activityName: d.activities?.name ?? d.activity_name ?? '',
              id: d.id ?? null,
            };
          });
          setDetails(mapped);
          setExpandedDetails(new Set(mapped.map((_, i) => String(i))));
          setGoodsType(data?.type === 'machines' || data?.goods_type === 'machines' ? 'machines' : 'materials');
        })
        .catch((err: any) => {
          const msg = err?.message ?? err?.response?.data?.message ?? 'Failed to load return';
          toast.showWarning(msg);
          router.push('/inventory-reports/issue-return');
        })
        .finally(() => setIsLoading(false));
      });
    } else {
      setIsLoading(false);
    }
  }, [mode, editReturnId, pid]);

  const [editLoadedStoreIds, setEditLoadedStoreIds] = useState<(string | number)[]>([]);

  const refreshStores = () => setStoreRefreshKey((k) => k + 1);

  useEffect(() => {
    const pId = projectIdForApi();
    if (!pId) return;
    if (mode === 'edit' && !editReturnId) return;
    setIsLoadingStores(true);
    masterDataAPI
      .getProjectWiseWarehouses(pId)
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        const transformed: StoreItem[] = list.map((s: any) => {
          const swId = s?.store_warehouses_id;
          const numId = Number.isFinite(Number(s?.id)) ? Number(s.id) : Number.isFinite(Number(swId)) ? Number(swId) : (typeof swId === 'object' && swId?.id != null ? Number(swId.id) : undefined);
          return {
            id: s.uuid ?? s.id ?? (numId != null ? String(numId) : ''),
            numericId: numId,
            name: s.name ?? s.store_name ?? '',
            code: s.code ?? '',
            location: s.location ?? s.address ?? '',
            store_warehouses_id: typeof swId === 'object' ? swId?.id ?? swId?.store_warehouses_id : swId,
          };
        });
        setStores(transformed);
      })
      .catch(() => setStores([]))
      .finally(() => setIsLoadingStores(false));
  }, [pid, pNumId, mode, editReturnId, editProject, storeRefreshKey]);

  useEffect(() => {
    if (mode === 'edit' && returnHeader && stores.length > 0 && editLoadedStoreIds.length > 0) {
      const ids = new Set<string>();
      for (const apiId of editLoadedStoreIds) {
        const s = stores.find((x) =>
          String(x.id) === String(apiId) ||
          String(x.numericId) === String(apiId) ||
          String(x.store_warehouses_id) === String(apiId)
        );
        if (s) ids.add(String(s.id));
      }
      if (ids.size > 0) {
        setSelectedStoreIds(ids);
        setEditLoadedStoreIds([]);
      }
    }
  }, [mode, returnHeader, stores, editLoadedStoreIds]);

  // Auto-advance to assetReturn when edit data is loaded so user sees header form with date, return from, materials
  useEffect(() => {
    if (mode !== 'edit' || !returnHeader || step !== 'stores') return;
    // Advance once stores have loaded (selectedStoreIds will be set by then if there was a match)
    if (editProject && !isLoadingStores) {
      setStep('assetReturn');
    }
  }, [mode, returnHeader, step, editProject, isLoadingStores]);

  // Fetch issue types for Return From dropdown - fetch early in edit mode so dropdown shows when user reaches assetReturn
  useEffect(() => {
    if (mode === 'edit' && editReturnId) {
      goodsReturnAPI.getIssueTypeList().then((list: any[]) => setIssueTypes(Array.isArray(list) ? list : []));
    } else if (step === 'assetReturn' || step === 'details') {
      goodsReturnAPI.getIssueTypeList().then((list: any[]) => setIssueTypes(Array.isArray(list) ? list : []));
    }
  }, [mode, editReturnId, step]);

  useEffect(() => {
    if (!showProjectSelectModal) return;
    setIsLoadingProjects(true);
    masterDataAPI
      .getProjects()
      .then((fetched: any[]) => {
        const transformed = (Array.isArray(fetched) ? fetched : []).map((p: any) => {
          const numId = Number.isFinite(Number(p.id)) ? Number(p.id) : Number.isFinite(Number(p.projects_id)) ? Number(p.projects_id) : undefined;
          return {
            id: p.uuid ?? String(p.id),
            numericId: numId,
            name: p.project_name ?? p.name ?? '',
            logo: p.logo ?? p.profile_image ?? '',
          };
        });
        setProjectList(transformed);
      })
      .catch(() => setProjectList([]))
      .finally(() => setIsLoadingProjects(false));
  }, [showProjectSelectModal]);

  const handleBackClick = () => {
    if (mode === 'create') {
      if (step === 'stores') {
        setShowProjectSelectModal(true);
      } else if (step === 'assetReturn') {
        setStep('stores');
      } else if (step === 'details') {
        setStep('assetReturn');
      } else if (step === 'success') {
        setStep('details');
      }
    } else {
      if (step === 'assetReturn') {
        router.push('/inventory-reports/issue-return');
      } else if (step === 'details') {
        setStep('assetReturn');
      } else if (step === 'success') {
        setStep('details');
      }
    }
  };

  const handleProjectSelectNext = () => {
    if (!selectedProjectForModal) return;
    const numericId = selectedProjectForModal.numericId != null ? String(selectedProjectForModal.numericId) : '';
    const projectId = String(selectedProjectForModal.id ?? selectedProjectForModal.numericId);
    const params = new URLSearchParams({ projectId, projectName: selectedProjectForModal.name });
    if (numericId) params.set('projectNumericId', numericId);
    router.push(`/inventory-reports/issue-return/create?${params.toString()}`);
  };

  const PROJECT_PAGE_SIZE = 10;
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projectList;
    const q = projectSearchQuery.toLowerCase();
    return projectList.filter((p) => p.name.toLowerCase().includes(q));
  }, [projectList, projectSearchQuery]);
  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * PROJECT_PAGE_SIZE;
    return filteredProjects.slice(start, start + PROJECT_PAGE_SIZE);
  }, [filteredProjects, projectPage]);

  useEffect(() => {
    if (!returnFromId || (step !== 'assetReturn' && step !== 'details')) {
      setTagOptions([]);
      return;
    }
    const t = issueTypes.find((x) => String(x.id) === String(returnFromId));
    const typeSlug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase().replace(/\s+/g, '-');
    const typeName = (t?.name ?? '').toString().toLowerCase();
    const pId = projectIdForApi();
    const storeIdsArr = Array.from(selectedStoreIds);
    const storeNumericIds = storeIdsArr
      .map((sid) => {
        const s = stores.find((x) => String(x.id) === sid);
        return s?.numericId ?? s?.id;
      })
      .filter((x): x is string | number => x != null);

    // same-project-other-stores: load other stores for this project (exclude already selected)
    const isSameProjectOtherStores =
      typeSlug.includes('same-project-other-store') ||
      typeSlug.includes('same_project_other_store') ||
      typeName.includes('same project other store');
    if (isSameProjectOtherStores && pId) {
      masterDataAPI
        .getProjectWiseWarehouses(pId)
        .then((res: any[]) => {
          const list = Array.isArray(res) ? res : [];
          const otherStores = list.filter((s: any) => {
            const sid = String(s.uuid ?? s.id);
            return !selectedStoreIds.has(sid);
          });
          const opts = otherStores.map((s: any) => ({
            id: s.uuid ?? s.id,
            name: s.name ?? s.store_name ?? '',
            tag_name: s.name ?? s.store_name,
            label: s.name ?? s.store_name,
          }));
          setTagOptions(opts);
        })
        .catch(() => setTagOptions([]));
      return;
    }

    // other-project: load all projects except current
    const isOtherProject =
      typeSlug.includes('other-project') || typeSlug.includes('other_project') || typeName.includes('other project');
    if (isOtherProject) {
      masterDataAPI
        .getProjects()
        .then((res: any[]) => {
          const list = Array.isArray(res) ? res : [];
          const currentPId = String(pId ?? '');
          const otherProjects = list.filter(
            (p: any) => String(p.id ?? p.uuid ?? p.projects_id) !== currentPId
          );
          const opts = otherProjects.map((p: any) => ({
            id: p.id ?? p.uuid ?? p.projects_id,
            name: p.project_name ?? p.name ?? '',
            tag_name: p.project_name ?? p.name,
            label: p.project_name ?? p.name,
          }));
          setTagOptions(opts);
        })
        .catch(() => setTagOptions([]));
      return;
    }

    // Default: use issue-type-tag-list API
    if (pId && storeNumericIds.length > 0) {
      goodsReturnAPI
        .getIssueTypeTagList(typeSlug || String(returnFromId), pId, storeNumericIds)
        .then((tags: any[]) => setTagOptions(Array.isArray(tags) ? tags : []))
        .catch(() => setTagOptions([]));
    } else {
      setTagOptions([]);
    }
  }, [returnFromId, step, selectedStoreIds, stores, issueTypes]);

  useEffect(() => {
    const pId = projectIdForApi();
    if (!pId || step !== 'assetReturn') return;
    setIsLoadingMaterials(true);
    goodsReturnAPI
      .getMaterialList(pId, goodsType)
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        const transformed: MaterialItem[] = list.map((m: any) => ({
          id: m.uuid ?? m.id,
          numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
          code: m.code ?? '',
          name: m.name ?? '',
          specification: m.specification ?? '',
          unit: m.units?.unit ?? m.unit ?? '',
          stock: m.stock ?? m.stock_qty ?? '',
        }));
        setMaterials(transformed);
      })
      .catch(() => setMaterials([]))
      .finally(() => setIsLoadingMaterials(false));
  }, [projectIdForApi(), step, goodsType]);

  // In edit mode, pre-select materials from details when materials list has loaded on assetReturn
  useEffect(() => {
    if (mode !== 'edit' || step !== 'assetReturn' || details.length === 0 || materials.length === 0) return;
    if (selectedMaterialIds.size > 0) return; // Already selected; avoid overwriting user changes
    const ids = new Set<string>();
    for (const d of details) {
      const mid = d.materials_id ?? d.materialNumericId;
      if (mid == null) continue;
      const m = materials.find(
        (x) => String(x.id) === String(mid) || String(x.numericId ?? x.id) === String(mid)
      );
      if (m) ids.add(String(m.id));
    }
    if (ids.size > 0) setSelectedMaterialIds(ids);
  }, [mode, step, details, materials, selectedMaterialIds.size]);

  const filteredMaterials = useMemo(() => {
    if (!materialsSearchQuery.trim()) return materials;
    const q = materialsSearchQuery.toLowerCase().trim();
    return materials.filter(
      (m) =>
        (m.code ?? '').toLowerCase().includes(q) ||
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.specification ?? '').toLowerCase().includes(q) ||
        (m.unit ?? '').toLowerCase().includes(q)
    );
  }, [materials, materialsSearchQuery]);

  const paginatedMaterials = useMemo(() => {
    const start = (materialsPage - 1) * MATERIALS_PAGE_SIZE;
    return filteredMaterials.slice(start, start + MATERIALS_PAGE_SIZE);
  }, [filteredMaterials, materialsPage]);

  useEffect(() => {
    if (step === 'assetReturn' || step === 'details') {
      masterDataAPI
        .getActivities()
        .then((res: any) => {
          const list = res?.data ?? res ?? [];
          setActivities(Array.isArray(list) ? list : []);
        })
        .catch(() => setActivities([]));
    }
  }, [step]);

  // Fetch stock quantities for details step and merge into details
  useEffect(() => {
    if (step !== 'details' || details.length === 0) return;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    if (!pId) return;
    const fetchStock = async () => {
      try {
        const stockByMaterial: Record<string, number | string> = {};
        const fetchList = goodsType === 'machines'
          ? (storeId?: string | number) => masterDataAPI.getAssetsOpeningStockList(pId, storeId).catch(() => [])
          : (storeId?: string | number) => masterDataAPI.getMaterialsOpeningList(pId, storeId).catch(() => []);
        if (storeNumericIds.length > 0) {
          const results = await Promise.all(
            storeNumericIds.map((storeId) => fetchList(storeId))
          );
          const allRows = results.flat();
          for (const row of allRows) {
            const code = row.material?.code ?? row.asset?.code ?? row.code ?? row.material_code ?? row.asset_code ?? row.materials?.code ?? row.assets?.code ?? '';
            const matId = String(row.material?.id ?? row.asset?.id ?? row.materials_id ?? row.material_id ?? row.assets_id ?? row.asset_id ?? row.materials?.id ?? row.assets?.id ?? '');
            const qty = Number(row.qty ?? row.opening_qty ?? row.opening ?? row.stock_qty ?? row.stock ?? 0) || 0;
            const key = code || matId;
            if (key) {
              stockByMaterial[key] = (Number(stockByMaterial[key]) || 0) + qty;
              if (code) stockByMaterial[code] = stockByMaterial[key];
              if (matId) stockByMaterial[matId] = stockByMaterial[key];
            }
          }
        } else {
          const rows = goodsType === 'machines'
            ? await masterDataAPI.getAssetsOpeningStockList(pId).catch(() => [])
            : await masterDataAPI.getMaterialsOpeningList(pId);
          const list = Array.isArray(rows) ? rows : [];
          for (const row of list) {
            const code = row.material?.code ?? row.asset?.code ?? row.code ?? row.material_code ?? row.asset_code ?? row.materials?.code ?? row.assets?.code ?? '';
            const matId = String(row.material?.id ?? row.asset?.id ?? row.materials_id ?? row.material_id ?? row.assets_id ?? row.asset_id ?? row.materials?.id ?? row.assets?.id ?? '');
            const qty = Number(row.qty ?? row.opening_qty ?? row.opening ?? row.stock_qty ?? row.stock ?? 0) || 0;
            const key = code || matId;
            if (key) {
              stockByMaterial[key] = (Number(stockByMaterial[key]) || 0) + qty;
              if (code) stockByMaterial[code] = stockByMaterial[key];
              if (matId) stockByMaterial[matId] = stockByMaterial[key];
            }
          }
        }
        setDetails((prev) =>
          prev.map((d) => {
            // Prefer stock_qty from addReturnGoods API response when present
            const hasExistingStock = d.stock_qty !== undefined && d.stock_qty !== null && d.stock_qty !== '';
            const stock =
              hasExistingStock
                ? d.stock_qty
                : stockByMaterial[d.materialCode] ??
                  stockByMaterial[String(d.materials_id)] ??
                  stockByMaterial[String(d.materialNumericId)] ??
                  0;
            return { ...d, stock_qty: stock };
          })
        );
      } catch {
        // Keep existing stock_qty if fetch fails
      }
    };
    fetchStock();
  }, [step, details.length, projectIdForApi(), selectedStoreIds, stores, goodsType]);

  // Generate PDF on success screen mount (after return-goods-details-add saves data)
  useEffect(() => {
    if (step !== 'success') return;
    const returnHeaderId = returnHeader?.id ?? returnHeader?.inv_returns_id ?? returnHeader?.inv_return_id ?? returnHeader?.uuid ?? returnGoodsList?.[0]?.id ?? editReturnId;
    if (!returnHeaderId) return;
    setIsSubmitting(true);
    const detailsForPdf = savedReturnDetails.length > 0
      ? savedReturnDetails.map((d) => {
          const local = details.find((ld) => String(ld.materials_id ?? ld.materialNumericId) === String(d.materials_id));
          return {
            id: d.id,
            inv_return_goods_id: d.inv_return_goods_id,
            materials_id: d.materials_id,
            type: d.type ?? goodsType,
            return_qty: d.return_qty,
            stock_qty: d.stock_qty ?? local?.stock_qty,
            materialCode: local?.materialCode ?? d.material_code ?? d.code,
            materialName: local?.materialName ?? d.material_name ?? d.name,
            materialSpec: local?.materialSpec ?? d.specification,
            materialUnit: local?.materialUnit ?? d.unit,
          };
        })
      : undefined;
    goodsReturnAPI
      .generatePdf(returnHeaderId, detailsForPdf)
      .then(({ pdf_url, name }) => {
        const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
        setPdfInfo({ url: fullUrl || pdf_url, name: name ?? `Return-${returnDate}.pdf` });
      })
      .catch(() => {
        setPdfInfo(null);
      })
      .finally(() => setIsSubmitting(false));
  }, [step, returnHeader?.id, returnHeader?.inv_returns_id, returnHeader?.inv_return_id, returnHeader?.uuid, returnGoodsList, editReturnId, savedReturnDetails, goodsType, returnDate]);

  useEffect(() => {
    if (step !== 'assetReturn') return;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    if (!pId || storeNumericIds.length === 0) {
      setReturnNoFromBackend(null);
      return;
    }
    goodsReturnAPI
      .projectToStoreList(pId, storeNumericIds, 'return')
      .then((data: any) => {
        const no = data?.invInwardRegNo ?? data?.return_no ?? data?.inv_return_reg_no;
        setReturnNoFromBackend(no ? String(no) : null);
      })
      .catch(() => setReturnNoFromBackend(null));
  }, [step, projectIdForApi(), selectedStoreIds, stores]);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const handleStoresNext = async () => {
    const pId = projectIdForApi();
    if (!pId) {
      toast.showWarning('Project is required.');
      return;
    }
    const ids = Array.from(selectedStoreIds);
    const storeNumericIds = ids
      .map((sid) => {
        const s = stores.find((x) => String(x.id) === sid);
        return s?.numericId ?? s?.id;
      })
      .filter((x): x is string | number => x != null);
    setIsCreatingHeader(true);
    try {
      const name = returnDate || getTodayDateString();
      const payload = {
        name,
        projects_id: pId,
        store_warehouses_id: storeNumericIds,
      };
      if (mode === 'edit' && (returnHeader?.id ?? returnHeader?.inv_returns_id ?? returnHeader?.inv_return_goods_id)) {
        setReturnHeader(returnHeader);
        setStep('assetReturn');
      } else {
        const created = await goodsReturnAPI.createHeader(payload);
        setReturnHeader(created);
        setReturnDate(getTodayDateString()); // Ensure date is today for new return
        setStep('assetReturn');
      }
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to create return header.');
    } finally {
      setIsCreatingHeader(false);
    }
  };

  const handleAssetReturnNext = async () => {
    if (!returnHeader) return;
    if (!returnDate || returnDate.trim() === '') {
      toast.showWarning('Please Enter a Date');
      return;
    }
    if (!returnFromId) {
      toast.showWarning('Please Select Issue');
      return;
    }
    const invReturnId = returnHeader.inv_returns_id ?? returnHeader.inv_return_id ?? returnHeader.id ?? returnHeader.uuid;
    const returnNo = returnHeader.return_no ?? returnNoFromBackend ?? returnHeader.name ?? returnDate;
    const pId = projectIdForApi();
    const storeIdsArr = Array.from(selectedStoreIds);
    let storeNumericIds = storeIdsArr
      .map((sid) => {
        const s = stores.find((x) => String(x.id) === sid);
        return s?.numericId ?? s?.id ?? (sid && String(sid) !== '' ? sid : null);
      })
      .filter((x): x is string | number => x != null);
    // Edit mode: when store matching failed, use editLoadedStoreIds so save doesn't fail
    if (mode === 'edit' && storeNumericIds.length === 0 && editLoadedStoreIds.length > 0) {
      storeNumericIds = [...editLoadedStoreIds];
    }
    let materialIdsArr = Array.from(selectedMaterialIds);
    let materialNumericIds = materialIdsArr
      .map((mid) => {
        const m = materials.find((x) => String(x.id) === mid);
        return m?.numericId ?? m?.id;
      })
      .filter((x): x is string | number => x != null);
    // Edit mode: when details are pre-loaded but materials didn't match (selectedMaterialIds empty), use details
    if (mode === 'edit' && materialNumericIds.length === 0 && details.length > 0) {
      materialNumericIds = details
        .filter((d) => d.materials_id != null || d.materialNumericId != null)
        .map((d) => d.materials_id ?? d.materialNumericId) as (string | number)[];
    }
    setIsSubmitting(true);
    try {
      if (materialNumericIds.length === 0) {
        setDetails([]);
        setReturnGoodsList([]);
        setStep('details');
        return;
      }
      const addResult = await goodsReturnAPI.addReturnGoods({
        id: mode === 'edit' ? (returnHeader?.inv_return_goods_id ?? returnHeader?.id ?? null) : null,
        inv_return_id: invReturnId,
        projects_id: pId!,
        store_warehouses_id: storeNumericIds,
        return_no: returnNo,
        date: returnDate,
        type: tagId || undefined,
        goods_type: goodsType,
        return_from: returnFromId,
        materials_id: materialNumericIds,
      });
      const goodsListRaw = Array.isArray(addResult) ? addResult
        : addResult?.data ?? addResult?.return_goods ?? addResult?.materials ?? [];
      let goodsList = Array.isArray(goodsListRaw) ? goodsListRaw : [];
      if (goodsList.length === 0 && addResult && typeof addResult === 'object' && (addResult.stock_qty != null || addResult.code != null)) {
        goodsList = [addResult];
      }
      const returnIdFromResponse = goodsList?.[0]?.return_id ?? (Array.isArray(addResult) ? addResult?.[0]?.return_id : addResult?.return_id);
      const invReturnGoodsIdForDetails = returnIdFromResponse ?? invReturnId;
      const buildDetailsFromMaterials = () =>
        materialNumericIds.map((mid) => {
          const m = materials.find((x) => String(x.numericId ?? x.id) === String(mid));
          return {
            inv_return_goods_id: invReturnGoodsIdForDetails,
            materials_id: mid,
            materialNumericId: m?.numericId,
            materialCode: m?.code ?? '',
            materialName: m?.name ?? '',
            materialUnit: m?.unit ?? '',
            materialSpec: m?.specification ?? '',
            return_qty: 0,
            stock_qty: m?.stock ?? '0',
            activities_id: undefined as string | number | undefined,
            activityName: '',
            id: null as string | number | null,
          };
        });

      let detailItems: ReturnDetailItem[];
      if (goodsList.length > 0) {
        detailItems = goodsList.flatMap((g: any, idx: number): ReturnDetailItem[] => {
          const matId = g.materials_id ?? g.material_id ?? g.materials?.id ?? g.material?.id ?? materialNumericIds[idx];
          if (matId == null) return [];
          const stockVal = g.stock_qty ?? g.stockQty ?? g.stock ?? g.available_stock ?? g.opening_qty ?? g.opening
            ?? g.materials?.stock_qty ?? g.materials?.stock ?? g.material?.stock_qty ?? g.material?.stock;
          return [{
            inv_return_goods_id: g.return_id ?? g.inv_return_goods_id ?? g.id ?? invReturnGoodsIdForDetails,
            materials_id: matId,
            materialNumericId: g.materials?.id ?? g.materials_id ?? matId,
            materialCode: g.materials?.code ?? g.code ?? '',
            materialName: g.materials?.name ?? g.name ?? '',
            materialUnit: g.materials?.units?.unit ?? g.unit ?? g.unit_id?.unit ?? '',
            materialSpec: g.materials?.specification ?? g.specification ?? '',
            return_qty: g.return_qty ?? 0,
            stock_qty: stockVal !== undefined && stockVal !== null && stockVal !== '' ? stockVal : 0,
            activities_id: g.activities_id,
            activityName: g.activities?.name ?? '',
            id: g.id ?? null,
          }];
        });
        if (detailItems.length === 0) {
          detailItems = buildDetailsFromMaterials();
        }
      } else {
        detailItems = buildDetailsFromMaterials();
      }
      setDetails(detailItems);
      setReturnGoodsList(goodsList);
      setExpandedDetails(new Set(detailItems.map((_, i) => String(i))));
      setStep('details');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to add return goods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailsNext = async () => {
    const invalid = details.filter((d) => !d.return_qty || Number(d.return_qty) <= 0);
    if (invalid.length > 0) {
      toast.showWarning('Return quantity is required for all items.');
      return;
    }
    const pId = projectIdForApi();
    if (!pId) {
      toast.showWarning('Project is required.');
      return;
    }
    let storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => {
        const s = stores.find((x) => String(x.id) === sid);
        return s?.numericId ?? s?.id ?? s?.store_warehouses_id;
      })
      .filter((x): x is string | number => x != null);
    if (storeNumericIds.length === 0 && mode === 'edit' && editLoadedStoreIds.length > 0) {
      storeNumericIds = [...editLoadedStoreIds];
    }
    const invReturnGoodsId = returnGoodsList?.[0]?.return_id ?? returnGoodsList?.[0]?.id ?? returnHeader?.inv_return_goods_id ?? returnHeader?.id ?? details?.[0]?.inv_return_goods_id;
    setIsSubmitting(true);
    try {
      if (details.length === 0) {
        // Skip PDF generation when no goods - backend PDF template expects inv_issue_lists_id which is null for returns without goods
        setStep('success');
        return;
      }
      const payload = details
        .filter((d) => d.materials_id != null || d.materialNumericId != null)
        .map((d) => ({
          ...(d.id != null ? { id: d.id } : {}),
          inv_return_goods_id: d.inv_return_goods_id ?? invReturnGoodsId,
          projects_id: pId,
          store_warehouses_id: storeNumericIds,
          materials_id: d.materials_id ?? d.materialNumericId,
          type: goodsType,
          return_qty: d.return_qty,
          stock_qty: d.stock_qty,
          remarkes: d.remarkes ?? '',
          activities_id: d.activities_id || undefined,
        }));
      if (payload.length === 0) {
        toast.showWarning('No valid items to save.');
        return;
      }
      // Per API spec: in edit mode, call return-goods-add first (UPDATE header), then return-goods-details-add
      const invReturnId = returnHeader?.inv_returns_id ?? returnHeader?.inv_return_id ?? returnHeader?.uuid;
      if (mode === 'edit' && invReturnGoodsId && invReturnId) {
        const materialIds = payload.map((d) => d.materials_id);
        await goodsReturnAPI.addReturnGoods({
          id: invReturnGoodsId,
          inv_return_id: invReturnId,
          projects_id: pId,
          store_warehouses_id: storeNumericIds,
          return_no: returnHeader?.return_no ?? returnNoFromBackend ?? returnDate,
          date: returnDate,
          type: tagId || undefined,
          goods_type: goodsType,
          return_from: returnFromId,
          remarkes: returnHeader?.remarkes ?? returnHeader?.remarks ?? '',
          materials_id: materialIds,
        });
      }
      const saved = await goodsReturnAPI.addReturnDetails(payload);
      const savedArr = Array.isArray(saved) ? saved : saved != null ? [saved] : [];
      setSavedReturnDetails(savedArr);
      setStep('success');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save return details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDetailQty = (index: number, qty: number | string) => {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, return_qty: qty } : d))
    );
  };

  const updateDetailActivity = (index: number, activityId: string | number, activityName: string) => {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, activities_id: activityId, activityName } : d))
    );
  };

  const removeDetail = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDetailExpand = (index: number) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      const key = String(index);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getFullPdfUrl = (url: string) => {
    if (!url) return '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
    return url.startsWith('http') ? url : apiBase.replace(/\/api\/?$/, '') + (url.startsWith('/') ? url : '/' + url);
  };

  const handleGeneratePdf = async () => {
    const returnHeaderId = returnHeader?.id ?? returnHeader?.inv_returns_id ?? returnHeader?.uuid ?? returnHeader?.inv_return_id ?? editReturnId;
    if (!returnHeaderId) {
      toast.showWarning('Return ID not found. Cannot generate PDF.');
      return;
    }
    setIsSubmitting(true);
    try {
      const detailsForPdf =
        savedReturnDetails.length > 0
          ? savedReturnDetails.map((d) => {
              const local = details.find((ld) => String(ld.materials_id ?? ld.materialNumericId) === String(d.materials_id));
              return {
                id: d.id,
                inv_return_goods_id: d.inv_return_goods_id,
                materials_id: d.materials_id,
                type: d.type ?? goodsType,
                return_qty: d.return_qty,
                stock_qty: d.stock_qty ?? local?.stock_qty,
                materialCode: local?.materialCode ?? d.material_code ?? d.code,
                materialName: local?.materialName ?? d.material_name ?? d.name,
                materialSpec: local?.materialSpec ?? d.specification,
                materialUnit: local?.materialUnit ?? d.unit,
              };
            })
          : undefined;
      const { pdf_url, name } = await goodsReturnAPI.generatePdf(returnHeaderId, detailsForPdf);
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      setPdfInfo({ url: fullUrl || pdf_url, name: name ?? `Return-${returnDate}.pdf` });
      if (fullUrl || pdf_url) window.open(fullUrl || pdf_url, '_blank');
      toast.showSuccess(fullUrl || pdf_url ? 'PDF generated. You can View or Share below.' : 'PDF generated.');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to generate PDF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPdf = () => {
    if (pdfInfo?.url) window.open(getFullPdfUrl(pdfInfo.url) || pdfInfo.url, '_blank');
    else toast.showWarning('Generate PDF first.');
  };

  const handleSharePdf = async () => {
    if (!pdfInfo?.url) {
      toast.showWarning('Generate PDF first.');
      return;
    }
    try {
      const fullUrl = getFullPdfUrl(pdfInfo.url) || pdfInfo.url;
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: 'application/pdf' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(fullUrl, { credentials: 'include', headers });
      if (!res.ok) throw new Error('Failed to fetch PDF');
      const blob = await res.blob();
      const file = new File([blob], pdfInfo.name || 'Return.pdf', { type: 'application/pdf' });
      const canShareFiles = 'share' in navigator && ('canShare' in navigator ? navigator.canShare({ files: [file] }) : true);
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: pdfInfo.name || 'Return Report',
          text: 'Return Report',
        });
        toast.showSuccess('Shared successfully.');
      } else {
        await navigator.clipboard.writeText(fullUrl);
        toast.showSuccess('PDF link copied to clipboard.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(getFullPdfUrl(pdfInfo.url) || pdfInfo.url);
          toast.showSuccess('Link copied to clipboard.');
        } catch {
          toast.showWarning('Could not share. Open PDF in new tab and use browser Share.');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-[#6B8E23]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-black ${textPrimary}`}>Goods Return</h1>
            <p className={`text-sm ${textSecondary}`}>
              {mode === 'edit' ? 'Edit return' : 'Create new return'} {projectNameForDisplay() && `• ${projectNameForDisplay()}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/inventory-reports/issue-return')}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Stores */}
        {step === 'stores' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Stores</h2>
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <Building2 className={`w-8 h-8 ${textSecondary}`} />
                <div>
                  <p className={`font-bold ${textPrimary}`}>{projectNameForDisplay()}</p>
                  <p className={`text-sm ${textSecondary}`}>Project ID: {projectIdForApi() || pNumId || pid}</p>
                </div>
              </div>
            </div>
            {isLoadingStores ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#6B8E23]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {stores.map((store) => {
                  const sid = String(store.id);
                  const isSelected = selectedStoreIds.has(sid);
                  return (
                    <label
                      key={sid}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#6B8E23] bg-[#6B8E23]/10'
                          : isDark
                          ? 'border-slate-600 hover:border-slate-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onDoubleClick={(e) => { e.preventDefault(); setSelectedStoreIds((prev) => { const next = new Set(prev); next.add(sid); return next; }); }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStore(sid)}
                        className="rounded mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold ${textPrimary}`}>{store.name}</p>
                        {store.code && <p className={`text-sm ${textSecondary}`}>{store.code}</p>}
                      </div>
                      {isSelected && <Check className="w-5 h-5 shrink-0 text-[#6B8E23]" />}
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <button type="button" onClick={() => setShowCreateWarehouseModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new store">
                <Plus className="w-4 h-4" /> Add New Store
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleStoresNext}
                disabled={isCreatingHeader}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isCreatingHeader ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}
              >
                {isCreatingHeader ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Asset Return Inv */}
        {step === 'assetReturn' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Return Details</h2>
            <div className={`p-4 rounded-lg mb-4 space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-bold ${textSecondary}`}>Project Name</p>
                  <p className={textPrimary}>{projectNameForDisplay()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div>
                <p className={`text-sm font-bold ${textSecondary}`}>Stores</p>
                <p className={textPrimary}>
                  {stores.filter((s) => selectedStoreIds.has(String(s.id))).map((s) => s.name).join(', ') || '-'}
                </p>
              </div>
              <div>
                <p className={`text-sm font-bold ${textSecondary}`}>Issue note no</p>
                <p className={textPrimary}>{returnHeader?.return_no ?? returnNoFromBackend ?? returnHeader?.name ?? returnDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Date *</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Return from *</label>
                <select
                  value={returnFromId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setReturnFromId(v);
                    setTagId(''); // Reset tag when return-from changes
                    const t = issueTypes.find((x) => String(x.id) === v);
                    setReturnFrom(t?.name ?? '');
                  }}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select...</option>
                  {issueTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const t = issueTypes.find((x) => String(x.id) === String(returnFromId));
                const slug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase();
                const isSameProjectOtherStores =
                  slug.includes('same-project-other-store') || slug.includes('other store');
                const showTag = tagOptions.length > 0 || (returnFromId && isSameProjectOtherStores);
                if (!showTag) return null;
                const label =
                  isSameProjectOtherStores ? 'Select store (optional)' :
                  slug.includes('other-project') || slug.includes('other project') ? 'Select project (optional)' :
                  'Tag (optional)';
                return (
                  <div className="sm:col-span-2 space-y-2">
                    <label className={`block text-sm font-bold ${textSecondary}`}>{label}</label>
                    <div className="flex gap-2">
                      <select
                        value={tagId}
                        onChange={(e) => setTagId(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                      >
                        <option value="">
                          {tagOptions.length === 0 && isSameProjectOtherStores ? 'No stores available' : 'Select...'}
                        </option>
                        {tagOptions.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name ?? t.tag_name ?? t.label}
                          </option>
                        ))}
                      </select>
                      {isSameProjectOtherStores && (
                        <button type="button" onClick={() => setShowCreateWarehouseModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border shrink-0 ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new store">
                          <Plus className="w-4 h-4" /> Add Store
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mb-4">
              <p className={`text-sm font-bold mb-2 ${textSecondary}`}>Select goods</p>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="goodsType"
                    checked={goodsType === 'materials'}
                    onChange={() => { setGoodsType('materials'); setMaterialsPage(1); }}
                    className="rounded-full"
                  />
                  <span className={textPrimary}>Material</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="goodsType"
                    checked={goodsType === 'machines'}
                    onChange={() => { setGoodsType('machines'); setMaterialsPage(1); }}
                    className="rounded-full"
                  />
                  <span className={textPrimary}>Machine</span>
                </label>
              </div>
              <div className="relative mb-3">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                <input
                  type="text"
                  placeholder={`Search ${goodsType === 'materials' ? 'materials' : 'machines'} by code, name, spec, unit...`}
                  value={materialsSearchQuery}
                  onChange={(e) => { setMaterialsSearchQuery(e.target.value); setMaterialsPage(1); }}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                />
              </div>
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <table className="w-full text-sm">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}></th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Code</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Name</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Spec</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Unit</th>
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y divide-inherit"
                    onDoubleClick={() => {
                      const maxPage = Math.ceil(filteredMaterials.length / MATERIALS_PAGE_SIZE);
                      if (materialsPage < maxPage) setMaterialsPage((p) => p + 1);
                    }}
                  >
                    {paginatedMaterials.map((m) => {
                      const mid = String(m.id);
                      const checked = selectedMaterialIds.has(mid);
                      return (
                        <tr
                          key={mid}
                          className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} ${checked ? 'bg-[#6B8E23]/10' : ''}`}
                          onClick={() => toggleMaterial(mid)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMaterial(mid)}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className={`px-4 py-3 font-mono ${textPrimary}`}>{m.code}</td>
                          <td className={`px-4 py-3 ${textPrimary}`}>{m.name}</td>
                          <td className={`px-4 py-3 ${textSecondary}`}>{m.specification || '-'}</td>
                          <td className={`px-4 py-3 ${textSecondary}`}>{m.unit || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredMaterials.length > MATERIALS_PAGE_SIZE && (
                <div className={`flex items-center justify-between gap-4 mt-3 px-1 ${textSecondary}`}>
                  <span className="text-sm">
                    Showing {(materialsPage - 1) * MATERIALS_PAGE_SIZE + 1}–{Math.min(materialsPage * MATERIALS_PAGE_SIZE, filteredMaterials.length)} of {filteredMaterials.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMaterialsPage((p) => Math.max(1, p - 1))}
                      disabled={materialsPage <= 1}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium min-w-[4rem] text-center">Page {materialsPage} of {Math.ceil(filteredMaterials.length / MATERIALS_PAGE_SIZE) || 1}</span>
                    <button
                      type="button"
                      onClick={() => setMaterialsPage((p) => Math.min(Math.ceil(filteredMaterials.length / MATERIALS_PAGE_SIZE), p + 1))}
                      disabled={materialsPage >= Math.ceil(filteredMaterials.length / MATERIALS_PAGE_SIZE)}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAssetReturnNext}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Asset Return Details */}
        {step === 'details' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Details for Return Goods</h2>
            {details.length === 0 && (
              <p className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} ${textSecondary}`}>
                No materials or machines selected. You can proceed to complete the return.
              </p>
            )}
            <div className="space-y-3 mb-6">
              {details.map((d, i) => {
                const detailKey = `detail-${i}-${d.materials_id}`;
                const isExpanded = expandedDetails.has(String(i));
                return (
                  <div
                    key={detailKey}
                    className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleDetailExpand(i)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(i); } }}
                      className={`w-full flex items-center justify-between p-4 text-left cursor-pointer ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold ${textPrimary}`}>{d.materialName}</p>
                        <p className={`text-sm ${textSecondary}`}>
                          {d.materialCode} • {d.materialUnit || '-'} • {d.materialSpec || '-'}
                          {(d.stock_qty !== undefined && d.stock_qty !== null && d.stock_qty !== '') && (
                            <span className={`ml-2 font-medium ${textPrimary}`}>• Stock: {String(d.stock_qty)}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDetail(i);
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    {isExpanded && (
                      <div className={`p-4 border-t ${isDark ? 'border-slate-600 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Return (In) Qty *</label>
                            <input
                              type="number"
                              min={0}
                              value={d.return_qty}
                              onChange={(e) => updateDetailQty(i, e.target.value)}
                              onFocus={() => {
                                if (d.return_qty === 0 || d.return_qty === '0' || d.return_qty === '') {
                                  updateDetailQty(i, '');
                                }
                              }}
                              className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Stock Qty</label>
                            <input
                              type="text"
                              readOnly
                              value={d.stock_qty ?? ''}
                              className={`w-full px-4 py-2 rounded-lg border opacity-75 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-100 border-slate-200'}`}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Tag activity</label>
                            <button
                              type="button"
                              onClick={() => setShowTagActivityModal(i)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}
                            >
                              <Package className="w-4 h-4" />
                              {d.activityName || 'Tag activity'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleDetailsNext}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className={`rounded-xl border p-8 ${cardClass} text-center`}>
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-[#6B8E23]/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#6B8E23]" />
              </div>
              <h2 className={`text-xl font-black mb-2 ${textPrimary}`}>Well done !!!</h2>
              <p className={`text-base ${textSecondary}`}>Material/Asset Return to Store is ready</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button
                onClick={() => router.push('/inventory-reports/issue-return')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}
              >
                <Plus className="w-4 h-4" />
                Add Another
              </button>
            </div>
            <div className={`p-6 rounded-xl border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
              <FileText className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
              <p className={`text-sm font-bold mb-2 ${textSecondary}`}>PDF</p>
              <p className={`text-sm mb-4 ${textSecondary}`}>
                {pdfInfo?.url ? 'Your Return PDF is ready. View or share below.' : 'Generate the return PDF to view or share.'}
              </p>
              {!pdfInfo?.url && (
                <button
                  onClick={handleGeneratePdf}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] mx-auto disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                  Generate PDF
                </button>
              )}
              {pdfInfo?.url && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button
                    onClick={handleViewPdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400 transition-colors"
                    title="Open PDF in new tab"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    onClick={handleSharePdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400 transition-colors"
                    title="Share PDF"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <CreateWarehouseModal
          theme={theme}
          isOpen={showCreateWarehouseModal}
          onClose={() => setShowCreateWarehouseModal(false)}
          selectedProjectId={projectIdForApi() ?? undefined}
          onSuccess={() => {
            refreshStores();
            setShowCreateWarehouseModal(false);
          }}
        />

        {/* Select Project Modal */}
        {showProjectSelectModal && mode === 'create' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`relative ${cardClass} rounded-xl border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
              <button
                onClick={() => {
                  setShowProjectSelectModal(false);
                  setSelectedProjectForModal(null);
                  setProjectSearchQuery('');
                  setProjectPage(1);
                }}
                className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <div className="p-4 border-b border-inherit">
                <h2 className={`text-lg font-bold ${textPrimary}`}>Select Project</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Choose a project for your goods return</p>
                <div className="relative mt-4">
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
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {isLoadingProjects ? (
                  <div className={`flex justify-center py-16 ${textSecondary}`}>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2 font-bold">Loading projects...</span>
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="space-y-2">
                    {paginatedProjects.map((project) => {
                      const isSelected = selectedProjectForModal?.id === project.id;
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => setSelectedProjectForModal({ id: project.id, numericId: project.numericId, name: project.name })}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-[#6B8E23] bg-[#6B8E23]/10'
                              : isDark
                              ? 'border-slate-600 hover:border-slate-500'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-lg overflow-hidden border flex-shrink-0 ${isSelected ? 'border-[#6B8E23]' : 'border-inherit'}`}>
                              {project.logo ? (
                                <img
                                  src={project.logo}
                                  alt={project.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=6B8E23&color=fff&size=96`;
                                  }}
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <Building2 className={`w-6 h-6 ${textSecondary}`} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className={`font-bold ${textPrimary}`}>{project.name}</p>
                              {project.numericId != null && (
                                <p className={`text-xs ${textSecondary}`}>ID: {project.numericId}</p>
                              )}
                            </div>
                            {isSelected && <Check className="w-5 h-5 ml-auto text-[#6B8E23]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                    <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                    <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>No projects found</h3>
                    <p className={`text-sm ${textSecondary}`}>
                      {projectSearchQuery ? 'Try a different search term' : 'No projects available'}
                    </p>
                  </div>
                )}
              </div>
              {filteredProjects.length > PROJECT_PAGE_SIZE && (
                <div className={`flex justify-between gap-2 px-4 py-3 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className={`text-xs ${textSecondary}`}>
                    Page {projectPage} of {Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                      disabled={projectPage <= 1}
                      className={`p-2 rounded-lg disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setProjectPage((p) => Math.min(Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE), p + 1))}
                      disabled={projectPage >= Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE)}
                      className={`p-2 rounded-lg disabled:opacity-50 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className={`flex justify-between gap-4 p-4 border-t border-inherit ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <button
                  onClick={() => {
                    setShowProjectSelectModal(false);
                    setSelectedProjectForModal(null);
                    setProjectSearchQuery('');
                    setProjectPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
                >
                  <ArrowLeft className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleProjectSelectNext}
                  disabled={!selectedProjectForModal}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${selectedProjectForModal ? 'bg-[#6B8E23] text-white hover:bg-[#5a7a1e]' : 'bg-slate-400 text-white cursor-not-allowed'}`}
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Validation Rules</h3>
              <ul className={`text-sm space-y-2 ${textSecondary}`}>
                <li>• Project: mandatory; Store: optional for Return</li>
                <li>• Materials/Assets: optional</li>
                <li>• Return quantities: mandatory</li>
                <li>• Return reason: optional</li>
                <li>• Return date: mandatory</li>
                <li>• Remarks: optional</li>
              </ul>
              <button
                onClick={() => setShowHelpModal(false)}
                className={`mt-4 w-full py-2 rounded-lg font-bold bg-[#6B8E23] text-white`}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Tag Activity Modal */}
        {showTagActivityModal !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Activity</h3>
              <div className="space-y-2">
                {activities.length === 0 ? (
                  <p className={`py-4 text-center ${textSecondary}`}>No activities found</p>
                ) : (
                  activities.map((a) => (
                    <button
                      key={a.id ?? a.uuid}
                      type="button"
                      onClick={() => {
                        updateDetailActivity(showTagActivityModal, a.id ?? a.uuid, a.name ?? a.activity_name ?? '');
                        setShowTagActivityModal(null);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                    >
                      {a.name ?? a.activity_name ?? a.id}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowTagActivityModal(null)}
                className={`mt-4 w-full py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
