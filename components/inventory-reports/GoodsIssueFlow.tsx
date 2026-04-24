'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ChevronUp,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  Share2,
  ExternalLink,
  Check,
  X,
  Eye,
  Search,
} from 'lucide-react';
import { masterDataAPI, goodsIssueAPI, teamsAPI } from '@/services/api';
import CreateWarehouseModal from '@/components/masters/Modals/CreateWarehouseModal';
import { getTodayDateString } from '@/utils/dateUtils';
import { getAuthToken } from '@/services/apiClient';
import { openPdfInNewTab, copyPdfUrl } from '@/utils/pdfUtils';
import { isInventoryQuantityZeroish } from '@/utils/inventoryQuantityInput';

type GoodsIssueStep = 'stores' | 'goodsInv' | 'details' | 'success';

interface GoodsIssueFlowProps {
  mode: 'create' | 'edit';
  projectId?: string;
  projectName?: string;
  projectNumericId?: string;
  issueId?: string;
}

interface StoreItem {
  id: string | number;
  numericId?: number;
  name: string;
  code?: string;
  location?: string;
}

interface IssueType {
  id: string | number;
  name: string;
  slug?: string;
}

/** Maps Issue to selection to where tag options are loaded from (masters vs issue-type-tag-list API). */
type IssueToTagCategory =
  | 'same-project-other-store'
  | 'other-project'
  | 'machine-asset'
  | 'contractor'
  | 'staff'
  | 'api-default';

function getIssueToTagCategory(t: IssueType | undefined): IssueToTagCategory {
  if (!t) return 'api-default';
  const slug = String((t as { slug?: string }).slug ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  const name = String(t.name ?? '').toLowerCase();

  if (
    slug.includes('same-project-other-store') ||
    slug.includes('same-project-other-stores') ||
    (name.includes('same project') && (name.includes('other store') || name.includes('other stores')))
  ) {
    return 'same-project-other-store';
  }
  if (slug.includes('other-project') || name.includes('other project')) {
    return 'other-project';
  }
  if (
    slug.includes('machine') ||
    slug.includes('asset') ||
    slug.includes('machinery') ||
    name.includes('machine') ||
    name.includes('asset') ||
    name.includes('machinery')
  ) {
    return 'machine-asset';
  }
  if (slug.includes('contractor') || name.includes('contractor')) {
    return 'contractor';
  }
  if (slug.includes('staff') || name.includes('staff')) {
    return 'staff';
  }
  return 'api-default';
}

function tagSelectLabel(cat: IssueToTagCategory): string {
  switch (cat) {
    case 'same-project-other-store':
      return 'Select store ';
    case 'other-project':
      return 'Select project ';
    case 'machine-asset':
      return 'Select machine / asset ';
    case 'contractor':
      return 'Select contractor ';
    case 'staff':
      return 'Select staff ';
    default:
      return 'Tag ';
  }
}

interface MaterialItem {
  id: string | number;
  numericId?: number;
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  stock?: string | number;
  stock_qty?: string | number;
}

interface IssueDetailItem {
  inv_issue_goods_id: string | number;
  materials_id: string | number;
  materialNumericId?: number;
  materialCode: string;
  materialName: string;
  materialUnit?: string;
  materialSpec?: string;
  issue_qty: number | string;
  stock_qty?: number | string;
  activities_id?: string | number;
  activityName?: string;
  id?: string | number | null;
}

export default function GoodsIssueFlow({
  mode,
  projectId,
  projectName,
  projectNumericId,
  issueId,
}: GoodsIssueFlowProps) {
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
  const editIssueId = issueId ?? searchParams?.get('issueId');

  const [editProject, setEditProject] = useState<{ id: string; name: string; numericId?: string } | null>(null);
  const [editLoadedStoreIds, setEditLoadedStoreIds] = useState<(string | number)[]>([]);

  const [step, setStep] = useState<GoodsIssueStep>('stores');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [issueHeader, setIssueHeader] = useState<any>(null);
  const [isCreatingHeader, setIsCreatingHeader] = useState(false);
  const [issueDate, setIssueDate] = useState(() => getTodayDateString());
  const [issueToId, setIssueToId] = useState<string | number>('');
  const [tagId, setTagId] = useState<string | number>('');
  const [tagOptions, setTagOptions] = useState<any[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [isLoadingTagOptions, setIsLoadingTagOptions] = useState(false);
  const tagComboboxRef = useRef<HTMLDivElement>(null);
  const tagSearchInputRef = useRef<HTMLInputElement>(null);
  const editTagPreloadedRef = useRef(false);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [goodsType, setGoodsType] = useState<'materials' | 'machines'>('materials');
  const [goodsSearchQuery, setGoodsSearchQuery] = useState('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [issueGoodsList, setIssueGoodsList] = useState<any[]>([]);
  const [details, setDetails] = useState<IssueDetailItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTagActivityModal, setShowTagActivityModal] = useState<number | null>(null);
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfInfo, setPdfInfo] = useState<{ url?: string; name?: string } | null>(null);
  const [issueNoFromBackend, setIssueNoFromBackend] = useState<string | null>(null);
  const [remarkes, setRemarkes] = useState<string>('');
  const [savedIssueDetailsFromApi, setSavedIssueDetailsFromApi] = useState<any[]>([]);

  const projectIdForApi = () => (editProject?.numericId ?? editProject?.id ?? pNumId) || (pid && /^\d+$/.test(String(pid)) ? pid : undefined);
  const projectNameForDisplay = () => editProject?.name ?? pName;

  const filteredMaterials = useMemo(() => {
    if (!goodsSearchQuery.trim()) return materials;
    const q = goodsSearchQuery.toLowerCase().trim();
    return materials.filter((m) => {
      const stockStr = m.stock != null && m.stock !== '' ? String(m.stock) : '';
      return (
        (m.code ?? '').toLowerCase().includes(q) ||
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.specification ?? '').toLowerCase().includes(q) ||
        (m.unit ?? '').toLowerCase().includes(q) ||
        stockStr.toLowerCase().includes(q)
      );
    });
  }, [materials, goodsSearchQuery]);

  useEffect(() => {
    if (mode === 'create') {
      if (!pid) {
        toast.showWarning('Project is required. Redirecting...');
        router.push('/inventory-reports/issue-slip');
        return;
      }
      setIsLoading(false);
    } else if (mode === 'edit' && editIssueId) {
      goodsIssueAPI
        .edit(editIssueId)
        .then((raw) => {
          // Unwrap nested data if backend returns { status, data: { data: {...} } }
          const data = raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data) && (raw.data.inv_issue != null || raw.data.inv_issue_details != null)
            ? raw.data
            : raw;
          // issue-goods-edit nests header in inv_issue; data has id (inv_issue_goods), inv_issue (header), inv_issue_details
          const header = data?.inv_issue ?? data;
          const proj = header?.projects_id ?? data?.projects_id ?? data?.project;
          const projId = typeof proj === 'object' ? proj?.id ?? proj?.uuid : proj;
          const projName = typeof proj === 'object' ? proj?.project_name ?? proj?.name : '';
          const effectiveProjId = projId ?? (pid && /^\d+$/.test(String(pid)) ? pid : undefined);
          if (effectiveProjId) {
            setEditProject({
              id: String(effectiveProjId),
              name: projName || 'Project',
              numericId: typeof proj === 'object' && proj != null ? String((proj as any).id ?? projId) : String(effectiveProjId),
            });
          }
          // Merge inv_issues_id from inv_issue when present (data.id is inv_issue_goods, inv_issue.id is header id)
          const invIssuesId = header?.id ?? header?.uuid ?? data?.inv_issue_id ?? data?.id ?? data?.uuid;
          const issueHeaderData = { ...data, inv_issues_id: invIssuesId };
          setIssueHeader(issueHeaderData);
          setIssueNoFromBackend(data?.issue_no ?? header?.issue_no ?? header?.name ?? null);
          setIssueDate(data?.date ?? header?.date ?? header?.name ?? getTodayDateString());
          setIssueToId(data?.inv_issue_lists_id?.id ?? data?.inv_issue_lists_id ?? data?.issue_to ?? data?.type ?? '');
          setTagId(data?.entry_type ?? data?.tag ?? '');
          setRemarkes(data?.remarkes ?? data?.remarks ?? header?.remarkes ?? header?.remarks ?? '');
          const storeIds = header?.store_id ?? header?.store_warehouses_id ?? data?.store_warehouses_id ?? data?.store_warehouses ?? [];
          const arr = Array.isArray(storeIds) ? storeIds : [];
          setEditLoadedStoreIds(arr.map((s: any) => s?.id ?? s));
          // Backend returns inv_issue_details (snake_case); each item has materials_id as object
          const detailsList = data?.inv_issue_details ?? data?.details ?? data?.issue_details ?? data?.issue_goods ?? [];
          const headerId = data?.id ?? data?.inv_issue_id ?? data?.uuid;
          const mapped: IssueDetailItem[] = (Array.isArray(detailsList) ? detailsList : []).map((d: any) => {
            const mat = d?.materials_id ?? d?.materials ?? d?.material ?? d?.assets ?? d;
            const matObj = typeof mat === 'object' && mat != null ? mat : {};
            return {
              inv_issue_goods_id: d.inv_issue_goods_id ?? d.inv_issue_goods ?? headerId,
              materials_id: typeof matObj?.id === 'number' || typeof matObj?.id === 'string' ? matObj.id : (d.materials_id ?? d.material_id ?? d.materials?.id),
              materialNumericId: typeof matObj?.id !== 'undefined' ? matObj.id : (d.materials?.id ?? d.materials_id),
              materialCode: matObj?.code ?? d?.code ?? '',
              materialName: matObj?.name ?? d?.name ?? '',
              materialUnit: matObj?.unit_id?.unit ?? matObj?.units?.unit ?? matObj?.unit ?? d?.unit ?? '',
              materialSpec: matObj?.specification ?? d?.specification ?? '',
              issue_qty: d.issue_qty ?? d.qty ?? 0,
              stock_qty: d.stock_qty ?? 0,
              activities_id: d.activities_id ?? d.activity_id,
              activityName: d.activities?.name ?? d.activity_name ?? '',
              id: d.id ?? null,
            };
          });
          setDetails(mapped);
          setExpandedDetails(new Set(mapped.map((_, i) => String(i)))); // Expand all in edit so user sees content
          setGoodsType(data?.type === 'machines' || data?.goods_type === 'machines' ? 'machines' : 'materials');
        })
        .catch((err: any) => {
          toast.showWarning(err?.message ?? 'Failed to load issue. Redirecting...');
          router.push('/inventory-reports/issue-slip');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [mode, editIssueId, pid]);

  // In edit mode, auto-advance to details step when data is loaded so user sees materials without clicking through
  useEffect(() => {
    if (mode === 'edit' && details.length > 0 && step === 'stores') {
      setStep('details');
    }
  }, [mode, details.length, step]);

  const [storeRefreshKey, setStoreRefreshKey] = useState(0);

  const refreshStores = () => setStoreRefreshKey((k) => k + 1);

  useEffect(() => {
    const pId = projectIdForApi();
    if (!pId) return;
    if (mode === 'edit' && !editIssueId) return;
    setIsLoadingStores(true);
    masterDataAPI
      .getProjectWiseWarehouses(pId)
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        setStores(list.map((s: any) => ({
          id: s.uuid ?? s.id,
          numericId: Number.isFinite(Number(s.id)) ? Number(s.id) : undefined,
          name: s.name ?? s.store_name ?? '',
          code: s.code ?? '',
          location: s.location ?? s.address ?? '',
        })));
      })
      .catch(() => setStores([]))
      .finally(() => setIsLoadingStores(false));
  }, [pid, pNumId, mode, editIssueId, editProject, storeRefreshKey]);

  useEffect(() => {
    if (mode === 'edit' && issueHeader && stores.length > 0 && editLoadedStoreIds.length > 0) {
      const ids = new Set<string>();
      for (const apiId of editLoadedStoreIds) {
        const s = stores.find((x) => String(x.id) === String(apiId) || String(x.numericId) === String(apiId));
        if (s) ids.add(String(s.id));
      }
      setSelectedStoreIds(ids);
      setEditLoadedStoreIds([]);
    }
  }, [mode, issueHeader, stores, editLoadedStoreIds]);

  const issueToCategory: IssueToTagCategory = useMemo(() => {
    const t = issueTypes.find((x) => String(x.id) === String(issueToId));
    return getIssueToTagCategory(t);
  }, [issueTypes, issueToId]);

  const filteredTagOptions = useMemo(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    const rowText = (opt: any) =>
      `${opt?.name ?? ''} ${opt?.tag_name ?? ''} ${opt?.label ?? ''} ${opt?.id ?? ''}`.toLowerCase();
    let list = !q
      ? tagOptions
      : tagOptions.filter((opt: any) => rowText(opt).includes(q));
    const selected = tagId
      ? tagOptions.find((o: any) => String(o.id) === String(tagId))
      : undefined;
    if (selected && !list.some((o: any) => String(o.id) === String(tagId))) {
      list = [selected, ...list];
    }
    return list;
  }, [tagOptions, tagSearchQuery, tagId]);

  const selectedTagLabel = useMemo(() => {
    if (tagId === '' || tagId == null) return '';
    const opt = tagOptions.find((o: any) => String(o.id) === String(tagId));
    return opt ? String(opt.name ?? opt.tag_name ?? opt.label ?? '') : '';
  }, [tagId, tagOptions]);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = tagComboboxRef.current;
      if (el && !el.contains(e.target as Node)) setTagDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTagDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [tagDropdownOpen]);

  useEffect(() => {
    if (tagDropdownOpen) {
      tagSearchInputRef.current?.focus();
    }
  }, [tagDropdownOpen]);

  const loadTagOptions = useCallback(async () => {
    if (!issueToId) {
      toast.showWarning('Select Issue to first.');
      return;
    }
    const t = issueTypes.find((x) => String(x.id) === String(issueToId));
    const cat = getIssueToTagCategory(t);
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);

    setIsLoadingTagOptions(true);
    setTagPanelOpen(true);
    setTagSearchQuery('');
    setTagDropdownOpen(false);
    try {
      if (cat === 'same-project-other-store') {
        if (!pId) {
          setTagOptions([]);
          toast.showWarning('Project is required.');
          return;
        }
        const res = await masterDataAPI.getProjectWiseWarehouses(pId);
        const list = Array.isArray(res) ? res : [];
        const otherStores = list.filter((s: any) => !selectedStoreIds.has(String(s.uuid ?? s.id)));
        setTagOptions(
          otherStores.map((s: any) => ({
            id: s.uuid ?? s.id,
            name: s.name ?? s.store_name ?? '',
            tag_name: s.name ?? s.store_name,
            label: s.name ?? s.store_name,
          }))
        );
        return;
      }
      if (cat === 'other-project') {
        const res = await masterDataAPI.getProjects();
        const list = Array.isArray(res) ? res : [];
        const currentPId = String(pId ?? '');
        const otherProjects = list.filter((proj: any) => String(proj.id ?? proj.uuid ?? proj.projects_id) !== currentPId);
        setTagOptions(
          otherProjects.map((proj: any) => ({
            id: proj.id ?? proj.uuid ?? proj.projects_id,
            name: proj.project_name ?? proj.name ?? '',
            tag_name: proj.project_name ?? proj.name,
            label: proj.project_name ?? proj.name,
          }))
        );
        return;
      }
      if (cat === 'machine-asset') {
        const res = await masterDataAPI.getAssetsEquipments();
        const list = Array.isArray(res) ? res : [];
        setTagOptions(
          list.map((a: any) => ({
            id: a.uuid ?? a.id,
            name: a.assets ?? a.name ?? a.code ?? '—',
            tag_name: a.assets ?? a.name,
            label: a.assets ?? a.name,
          }))
        );
        return;
      }
      if (cat === 'contractor') {
        const res = await masterDataAPI.getSupplierContractorList('contractor');
        const list = Array.isArray(res) ? res : [];
        setTagOptions(
          list.map((v: any) => ({
            id: v.id ?? v.uuid,
            name: v.vendor_name ?? v.name ?? v.company_name ?? '—',
            tag_name: v.vendor_name ?? v.name,
            label: v.vendor_name ?? v.name,
          }))
        );
        return;
      }
      if (cat === 'staff') {
        const res = await teamsAPI.getTeamsList();
        const list = Array.isArray(res) ? res : [];
        setTagOptions(
          list.map((s: any) => ({
            id: s.id ?? s.uuid,
            name: s.name ?? s.user_name ?? s.email ?? '—',
            tag_name: s.name ?? s.user_name,
            label: s.name ?? s.user_name,
          }))
        );
        return;
      }
      const typeSlug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase().replace(/\s+/g, '-');
      if (!pId) {
        setTagOptions([]);
        toast.showWarning('Project is required to load tags.');
        return;
      }
      const tags = await goodsIssueAPI.getIssueTypeTagList(typeSlug || String(issueToId), pId, storeNumericIds);
      setTagOptions(Array.isArray(tags) ? tags : []);
    } catch (e: any) {
      setTagOptions([]);
      toast.showError(e?.message ?? 'Failed to load tags.');
    } finally {
      setIsLoadingTagOptions(false);
    }
  }, [issueToId, issueTypes, projectIdForApi, selectedStoreIds, stores, toast]);

  /** Edit mode: preload tag list once so saved entry_type can display in the dropdown. */
  useEffect(() => {
    if (step !== 'goodsInv' || mode !== 'edit' || !issueToId || !tagId) {
      editTagPreloadedRef.current = false;
      return;
    }
    if (editTagPreloadedRef.current) return;
    editTagPreloadedRef.current = true;
    void loadTagOptions();
  }, [step, mode, issueToId, tagId, loadTagOptions]);

  useEffect(() => {
    const pId = projectIdForApi();
    if (!pId || step !== 'goodsInv') return;
    setIsLoadingMaterials(true);
    goodsIssueAPI.getMaterialList(pId, goodsType)
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        setMaterials(list.map((m: any) => ({
          id: m.uuid ?? m.id,
          numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
          code: m.code ?? '',
          name: m.name ?? '',
          specification: m.specification ?? '',
          unit: m.units?.unit ?? m.unit ?? '',
          stock: m.total_stk_qty ?? m.stock ?? m.stock_qty ?? m.available_stock ?? '',
        })));
      })
      .catch(() => setMaterials([]))
      .finally(() => setIsLoadingMaterials(false));
  }, [projectIdForApi(), step, goodsType]);

  useEffect(() => {
    if (step === 'goodsInv' || step === 'details') {
      const pId = projectIdForApi();
      masterDataAPI.getActivities(pId).then((res: any) => {
        const list = res?.data ?? res ?? [];
        setActivities(Array.isArray(list) ? list : []);
      }).catch(() => setActivities([]));
    }
  }, [step, pid, pNumId, editProject]);

  useEffect(() => {
    if (step !== 'goodsInv') return;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    if (!pId || storeNumericIds.length === 0) {
      setIssueNoFromBackend(null);
      return;
    }
    goodsIssueAPI
      .projectToStoreList(pId, storeNumericIds, 'issue')
      .then((data: any) => {
        const no = data?.invInwardRegNo ?? data?.issue_no ?? data?.inv_issue_reg_no;
        setIssueNoFromBackend(no ? String(no) : null);
      })
      .catch(() => setIssueNoFromBackend(null));
  }, [step, selectedStoreIds, stores]);

  // Generate PDF on success screen mount (after issue-goods-details-add saves data)
  // API expects requestId = inv_issues_id (parent InvIssue), NOT inv_issue_goods_id
  const fetchPdf = React.useCallback(() => {
    if (step !== 'success') return;
    // Use parent InvIssue id (inv_issues_id) - from issue-goods-edit: data.inv_issue.id
    const requestId =
      issueHeader?.inv_issues_id ??
      issueHeader?.id ??
      (mode === 'edit' ? editIssueId : null) ??
      issueHeader?.uuid;
    if (!requestId) return;
    setIsSubmitting(true);
    const invIssueListsId = issueGoodsList?.[0]?.id ?? details?.[0]?.inv_issue_goods_id ?? issueHeader?.id ?? requestId;
    // Use saved details from issue-goods-details-add API response when available; else map from form details
    const detailsForPdf =
      savedIssueDetailsFromApi.length > 0
        ? savedIssueDetailsFromApi
        : details.map((d) => ({
            materials_id: d.materials_id ?? d.materialNumericId,
            materialCode: d.materialCode,
            materialName: d.materialName,
            materialSpec: d.materialSpec,
            materialUnit: d.materialUnit,
            issue_qty: d.issue_qty,
            stock_qty: d.stock_qty,
            activityName: d.activityName,
          }));
    goodsIssueAPI
      .generatePdf(requestId, invIssueListsId, detailsForPdf)
      .then(({ pdf_url, name }) => setPdfInfo({ url: pdf_url, name: name ?? `Issue-${issueDate}.pdf` }))
      .catch(() => setPdfInfo(null))
      .finally(() => setIsSubmitting(false));
  }, [step, mode, savedIssueDetailsFromApi, issueHeader?.id, issueHeader?.inv_issues_id, issueHeader?.uuid, issueGoodsList, details, editIssueId, issueDate]);

  useEffect(() => {
    if (step === 'success') fetchPdf();
  }, [step, fetchPdf]);

  const handleBackClick = () => {
    if (step === 'success') setStep('details');
    else if (step === 'details') setStep('goodsInv');
    else if (step === 'goodsInv') setStep('stores');
    else router.back();
  };

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
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    setIsCreatingHeader(true);
    try {
      const name = issueDate || getTodayDateString();
      if (mode === 'edit' && issueHeader?.id) {
        setStep('goodsInv');
      } else {
        const created = await goodsIssueAPI.createHeader({ name, projects_id: pId, store_warehouses_id: storeNumericIds });
        setIssueHeader(created);
        setStep('goodsInv');
      }
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to create issue header.');
    } finally {
      setIsCreatingHeader(false);
    }
  };

  const handleGoodsInvNext = async () => {
    if (!issueHeader) return;
    const invIssueId = issueHeader.id ?? issueHeader.inv_issues_id ?? issueHeader.uuid;
    const issueNo = issueHeader.issue_no ?? issueNoFromBackend ?? issueHeader.name ?? issueDate;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    const materialIdsArr = Array.from(selectedMaterialIds);
    if (materialIdsArr.length === 0) {
      toast.showWarning('Please select at least one material/asset.');
      return;
    }
    if (!issueToId) {
      toast.showWarning('Issue to (Issue type) is required.');
      return;
    }
    const materialNumericIds = materialIdsArr
      .map((mid) => materials.find((x) => String(x.id) === mid)?.numericId ?? materials.find((x) => String(x.id) === mid)?.id)
      .filter((x): x is string | number => x != null);
    setIsSubmitting(true);
    try {
      const addResult = await goodsIssueAPI.addIssueGoods({
        id: mode === 'edit' && issueHeader?.id ? issueHeader.id : null,
        inv_issues_id: invIssueId,
        projects_id: pId!,
        store_warehouses_id: storeNumericIds,
        issue_no: issueNo,
        date: issueDate,
        entry_type: tagId || undefined,
        goods_type: goodsType,
        issue_to: issueToId,
        materials_id: materialNumericIds,
      });
      const goodsListRaw = Array.isArray(addResult) ? addResult : addResult?.data ?? addResult?.issue_goods ?? addResult;
      const goodsList = Array.isArray(goodsListRaw) ? goodsListRaw : (goodsListRaw && typeof goodsListRaw === 'object' ? [goodsListRaw] : []);
      const issueIdFromResponse = goodsList[0]?.issue_id ?? (Array.isArray(addResult) ? addResult?.[0]?.issue_id : (addResult as any)?.issue_id);
      const invIssueGoodsIdForDetails = issueIdFromResponse ?? goodsList[0]?.id ?? goodsList[0]?.inv_issue_goods_id ?? (typeof addResult === 'object' && addResult !== null ? (addResult as any).id ?? (addResult as any).inv_issue_goods_id : null) ?? invIssueId;
      const buildDetailsFromMaterials = () =>
        materialNumericIds.map((mid) => {
          const m = materials.find((x) => String(x.numericId ?? x.id) === String(mid));
          return {
            inv_issue_goods_id: invIssueGoodsIdForDetails,
            materials_id: mid,
            materialNumericId: m?.numericId,
            materialCode: m?.code ?? '',
            materialName: m?.name ?? '',
            materialUnit: m?.unit ?? '',
            materialSpec: m?.specification ?? '',
            issue_qty: 0,
            stock_qty: m?.stock ?? m?.stock_qty ?? '0',
            activities_id: undefined as string | number | undefined,
            activityName: '',
            id: null as string | number | null,
          };
        });
      let detailItems: IssueDetailItem[];
      if (goodsList.length > 0) {
        detailItems = goodsList.flatMap((g: any) => {
          const matId = g.materials_id ?? g.material_id ?? g.materials?.id;
          if (matId == null) return [];
          const item: IssueDetailItem = {
            inv_issue_goods_id: g.issue_id ?? g.inv_issue_goods_id ?? g.id ?? invIssueGoodsIdForDetails,
            materials_id: matId,
            materialNumericId: g.materials?.id ?? g.materials_id ?? matId,
            materialCode: g.materials?.code ?? g.code ?? '',
            materialName: g.materials?.name ?? g.name ?? '',
            materialUnit: g.materials?.units?.unit ?? g.unit ?? '',
            materialSpec: g.materials?.specification ?? g.specification ?? '',
            issue_qty: g.issue_qty ?? 0,
            stock_qty: g.stock_qty ?? g.stock ?? g.available_stock ?? 0,
            activities_id: g.activities_id,
            activityName: g.activities?.name ?? '',
            id: g.id ?? null,
          };
          return [item];
        });
        if (detailItems.length === 0) detailItems = buildDetailsFromMaterials();
      } else {
        detailItems = buildDetailsFromMaterials();
      }
      setDetails(detailItems);
      setIssueGoodsList(goodsList);
      setExpandedDetails(new Set(detailItems.map((_, i) => String(i))));
      setStep('details');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to add issue goods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailsNext = async () => {
    const invalid = details.filter((d) => !d.issue_qty || Number(d.issue_qty) <= 0);
    if (invalid.length > 0) {
      toast.showWarning('Issue quantity is required for all items.');
      return;
    }
    const pId = projectIdForApi();
    if (!pId) {
      toast.showWarning('Project is required.');
      return;
    }
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    const invIssuesId = issueHeader?.inv_issues_id ?? issueHeader?.id ?? editIssueId;
    const invIssueGoodsId = issueGoodsList?.[0]?.issue_id ?? issueGoodsList?.[0]?.id ?? issueHeader?.id ?? details?.[0]?.inv_issue_goods_id;
    const materialIdsFromDetails = details
      .filter((d) => d.materials_id != null || d.materialNumericId != null)
      .map((d) => d.materials_id ?? d.materialNumericId);
    const detailsPayload = details
      .filter((d) => d.materials_id != null || d.materialNumericId != null)
      .map((d) => ({
        id: d.id ?? undefined,
        inv_issue_goods_id: d.inv_issue_goods_id ?? invIssueGoodsId,
        projects_id: pId,
        store_warehouses_id: storeNumericIds,
        materials_id: d.materials_id ?? d.materialNumericId,
        type: goodsType,
        issue_qty: d.issue_qty,
        stock_qty: d.stock_qty,
        activities_id: d.activities_id || undefined,
      }));
    if (detailsPayload.length === 0) {
      toast.showWarning('No valid items to save.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Update header via issue-goods-add (edit only; create already did this in handleGoodsInvNext)
      if (mode === 'edit') {
        const headerPayload = {
          id: invIssueGoodsId,
          inv_issues_id: invIssuesId,
          projects_id: pId,
          store_warehouses_id: storeNumericIds,
          issue_no: issueHeader?.issue_no ?? issueNoFromBackend ?? issueDate,
          date: issueDate,
          entry_type: tagId || undefined,
          goods_type: goodsType,
          issue_to: issueToId,
          materials_id: materialIdsFromDetails,
          remarkes: remarkes || undefined,
        };
        await goodsIssueAPI.addIssueGoods(headerPayload);
      }
      // 2. Update line items via issue-goods-details-add
      const savedDetails = await goodsIssueAPI.addIssueDetails(detailsPayload);
      const arr = Array.isArray(savedDetails) ? savedDetails : (savedDetails?.data ?? []);
      setSavedIssueDetailsFromApi(arr);
      setPdfInfo(null); // Clear stale PDF so fresh one loads for edit
      setStep('success');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save issue details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDetailQty = (index: number, qty: number | string) => {
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, issue_qty: qty } : d)));
  };
  const updateDetailActivity = (index: number, activityId: string | number, activityName: string) => {
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, activities_id: activityId, activityName } : d)));
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

  const handleViewPdf = () => {
    if (pdfInfo?.url) openPdfInNewTab(pdfInfo.url);
    else toast.showWarning('No PDF available.');
  };

  const handleSharePdf = async () => {
    if (!pdfInfo?.url) {
      toast.showWarning('No PDF available. Generate PDF first.');
      return;
    }
    const copied = await copyPdfUrl(pdfInfo.url);
    if (copied) {
      toast.showSuccess('PDF link copied to clipboard.');
    } else {
      toast.showWarning('Could not copy to clipboard.');
    }
  };

  useEffect(() => {
    if (step === 'goodsInv' || step === 'details') {
      goodsIssueAPI.getIssueTypeList().then((list: any[]) => setIssueTypes(Array.isArray(list) ? list : []));
    }
  }, [step]);

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
          <button onClick={handleBackClick} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-black ${textPrimary}`}>Goods Issue</h1>
            <p className={`text-sm ${textSecondary}`}>{mode === 'edit' ? 'Edit issue' : 'Create new issue'} {projectNameForDisplay() && `• ${projectNameForDisplay()}`}</p>
          </div>
          <button onClick={() => router.push('/inventory-reports/issue-slip')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'stores' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Stores (optional)</h2>
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
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B8E23]" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {stores.map((store) => {
                  const sid = String(store.id);
                  const isSelected = selectedStoreIds.has(sid);
                  return (
                    <label
                      key={sid}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${isSelected ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => toggleStore(sid)} className="rounded mt-1 shrink-0" />
                      <div className="flex-1 min-w-0"><p className={`font-bold ${textPrimary}`}>{store.name}</p>{store.code && <p className={`text-sm ${textSecondary}`}>{store.code}</p>}</div>
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
              <button onClick={handleStoresNext} disabled={isCreatingHeader} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isCreatingHeader ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isCreatingHeader ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'goodsInv' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Issue Details</h2>
            <div className={`p-4 rounded-lg mb-4 space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex justify-between items-start">
                <div><p className={`text-sm font-bold ${textSecondary}`}>Project Name</p><p className={textPrimary}>{projectNameForDisplay()}</p></div>
                <button type="button" onClick={() => setShowHelpModal(true)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Help"><HelpCircle className="w-5 h-5" /></button>
              </div>
              <div><p className={`text-sm font-bold ${textSecondary}`}>Stores</p><p className={textPrimary}>{stores.filter((s) => selectedStoreIds.has(String(s.id))).map((s) => s.name).join(', ') || '-'}</p></div>
              <div><p className={`text-sm font-bold ${textSecondary}`}>Issue note no</p><p className={textPrimary}>{issueHeader?.issue_no ?? issueNoFromBackend ?? issueHeader?.name ?? issueDate}</p></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Date *</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Issue to *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={issueToId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIssueToId(v);
                      setTagId('');
                      setTagOptions([]);
                      setTagPanelOpen(false);
                      setTagSearchQuery('');
                      setTagDropdownOpen(false);
                      editTagPreloadedRef.current = false;
                    }}
                    className={`w-full flex-1 min-w-0 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                  >
                    <option value="">Select...</option>
                    {issueTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void loadTagOptions()}
                    disabled={!issueToId || isLoadingTagOptions}
                    title="Load tag list from masters (stores, projects, machines, contractors, staff) or server list"
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold shrink-0 border transition-colors ${
                      !issueToId || isLoadingTagOptions
                        ? `opacity-50 cursor-not-allowed ${isDark ? 'border-slate-600' : 'border-slate-300'}`
                        : isDark
                          ? 'border-[#6B8E23]/60 bg-[#6B8E23]/15 text-[#C2D642] hover:bg-[#6B8E23]/25'
                          : 'border-[#6B8E23]/50 bg-[#6B8E23]/10 text-[#4a6518] hover:bg-[#6B8E23]/20'
                    }`}
                  >
                    {isLoadingTagOptions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Plus className="w-4 h-4 shrink-0" aria-hidden />
                        <span>Tag</span>
                      </span>
                    )}
                  </button>
                </div>
                <p className={`text-xs mt-1.5 ${textSecondary}`}>
                  After choosing Issue to, click <span className="font-semibold">Tag</span> to load options: same-project other stores, other project, machines/assets, contractor, or staff (from masters).
                </p>
              </div>
              {tagPanelOpen && (
                <div className="sm:col-span-2 space-y-2">
                  <label className={`block text-sm font-bold ${textSecondary}`}>{tagSelectLabel(issueToCategory)}</label>
                  {isLoadingTagOptions ? (
                    <div className={`flex items-center gap-2 py-3 px-4 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                      <Loader2 className="w-5 h-5 animate-spin text-[#6B8E23]" />
                      <span className={textSecondary}>Loading tags…</span>
                    </div>
                  ) : tagOptions.length === 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <p className={`text-sm py-2 flex-1 ${textSecondary}`}>
                        {issueToCategory === 'same-project-other-store'
                          ? 'No other stores in this project.'
                          : 'No tags loaded. Click Tag to load from masters.'}
                      </p>
                      {issueToCategory === 'same-project-other-store' && (
                        <button
                          type="button"
                          onClick={() => setShowCreateWarehouseModal(true)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold border shrink-0 ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`}
                          title="Add new store"
                        >
                          <Plus className="w-4 h-4" /> Add Store
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1 min-w-0" ref={tagComboboxRef}>
                        <button
                          type="button"
                          id="goods-issue-tag-combobox"
                          aria-expanded={tagDropdownOpen}
                          aria-haspopup="listbox"
                          onClick={() => setTagDropdownOpen((o) => !o)}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg border text-left text-sm font-bold min-h-[42px] ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                        >
                          <span className={`truncate ${!selectedTagLabel ? textSecondary : ''}`}>
                            {selectedTagLabel || 'Select...'}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform ${textSecondary} ${tagDropdownOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>
                        {tagDropdownOpen && (
                          <div
                            role="listbox"
                            aria-labelledby="goods-issue-tag-combobox"
                            className={`absolute z-50 left-0 right-0 mt-1 rounded-lg border shadow-xl flex flex-col max-h-[min(55vh,280px)] overflow-hidden ${isDark ? 'bg-[#0f1419] border-slate-600' : 'bg-white border-slate-200'}`}
                          >
                            <div className={`p-2 border-b shrink-0 ${isDark ? 'border-slate-600 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
                              <div className="relative">
                                <Search
                                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textSecondary}`}
                                  aria-hidden
                                />
                                <input
                                  ref={tagSearchInputRef}
                                  type="search"
                                  autoComplete="off"
                                  placeholder="Search…"
                                  value={tagSearchQuery}
                                  onChange={(e) => setTagSearchQuery(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className={`w-full pl-9 pr-3 py-2 rounded-md border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                />
                              </div>
                            </div>
                            <ul className="overflow-y-auto min-h-0 py-1">
                              <li>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={tagId === ''}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-md mx-1 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                  onClick={() => {
                                    setTagId('');
                                    setTagDropdownOpen(false);
                                  }}
                                >
                                  — None —
                                </button>
                              </li>
                              {filteredTagOptions.length === 0 ? (
                                <li className={`px-3 py-4 text-sm text-center ${textSecondary}`}>No matches</li>
                              ) : (
                                filteredTagOptions.map((opt: any) => {
                                  const label = opt.name ?? opt.tag_name ?? opt.label;
                                  const selected = String(tagId) === String(opt.id);
                                  return (
                                    <li key={String(opt.id)}>
                                      <button
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md mx-1 flex items-center gap-2 ${
                                          selected
                                            ? isDark
                                              ? 'bg-[#6B8E23]/25 text-slate-100'
                                              : 'bg-[#6B8E23]/15 text-slate-900'
                                            : isDark
                                              ? 'hover:bg-slate-800 text-slate-200'
                                              : 'hover:bg-slate-100 text-slate-900'
                                        }`}
                                        onClick={() => {
                                          setTagId(opt.id);
                                          setTagDropdownOpen(false);
                                        }}
                                      >
                                        <span className="flex items-center gap-2 min-w-0 w-full">
                                          <span className="w-4 flex justify-center shrink-0">
                                            {selected ? <Check className="w-4 h-4 text-[#6B8E23]" aria-hidden /> : null}
                                          </span>
                                          <span className="truncate">{label}</span>
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      {issueToCategory === 'same-project-other-store' && (
                        <button
                          type="button"
                          onClick={() => setShowCreateWarehouseModal(true)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold border shrink-0 self-start sm:self-auto ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`}
                          title="Add new store"
                        >
                          <Plus className="w-4 h-4" /> Add Store
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mb-4">
              <p className={`text-sm font-bold mb-2 ${textSecondary}`}>Select goods</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-3">
                <div className="flex flex-wrap gap-4 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="goodsType" checked={goodsType === 'materials'} onChange={() => { setGoodsType('materials'); setGoodsSearchQuery(''); }} className="rounded-full" />
                    <span className={textPrimary}>Material</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="goodsType" checked={goodsType === 'machines'} onChange={() => { setGoodsType('machines'); setGoodsSearchQuery(''); }} className="rounded-full" />
                    <span className={textPrimary}>Machine</span>
                  </label>
                </div>
                <div className="relative w-full sm:max-w-md sm:flex-1 sm:min-w-[12rem]">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textSecondary}`} />
                  <input
                    type="search"
                    autoComplete="off"
                    placeholder={`Search ${goodsType === 'materials' ? 'materials' : 'machines'} by code, name, spec…`}
                    value={goodsSearchQuery}
                    onChange={(e) => setGoodsSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  />
                </div>
              </div>
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <table className="w-full text-sm">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}></th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Code</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Name</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Stock</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Spec</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {isLoadingMaterials ? (
                      <tr>
                        <td colSpan={6} className={`px-4 py-10 text-center ${textSecondary}`}>
                          <Loader2 className="w-6 h-6 animate-spin inline text-[#6B8E23] align-middle mr-2" />
                          Loading…
                        </td>
                      </tr>
                    ) : materials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`px-4 py-8 text-center ${textSecondary}`}>
                          No {goodsType === 'materials' ? 'materials' : 'machines'} available for this project.
                        </td>
                      </tr>
                    ) : filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`px-4 py-8 text-center ${textSecondary}`}>
                          No rows match your search. Try another code or name.
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((m) => {
                        const mid = String(m.id);
                        const checked = selectedMaterialIds.has(mid);
                        return (
                          <tr key={mid} className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} ${checked ? 'bg-[#6B8E23]/10' : ''}`} onClick={() => toggleMaterial(mid)}>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={checked} onChange={() => toggleMaterial(mid)} className="rounded cursor-pointer" />
                            </td>
                            <td className={`px-4 py-3 font-mono ${textPrimary}`}>{m.code}</td>
                            <td className={`px-4 py-3 ${textPrimary}`}>{m.name}</td>
                            <td className={`px-4 py-3 ${textSecondary}`}>{m.stock ?? '-'}</td>
                            <td className={`px-4 py-3 ${textSecondary}`}>{m.specification || '-'}</td>
                            <td className={`px-4 py-3 ${textSecondary}`}>{m.unit || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleGoodsInvNext} disabled={isSubmitting || selectedMaterialIds.size === 0} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting || selectedMaterialIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Details of Issue Goods</h2>
            <div className="space-y-3 mb-6">
              {details.map((d, i) => {
                const detailKey = `detail-${i}-${d.materials_id}`;
                const isExpanded = expandedDetails.has(String(i));
                return (
                  <div key={detailKey} className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleDetailExpand(i)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(i); } }}
                      className={`w-full flex items-center justify-between p-4 text-left cursor-pointer ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex-1 min-w-0"><p className={`font-bold ${textPrimary}`}>{d.materialName}</p><p className={`text-sm ${textSecondary}`}>{d.materialCode} • {d.materialUnit || '-'} • {d.materialSpec || '-'}</p></div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); removeDetail(i); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); removeDetail(i); } }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer inline-flex"
                      ><Trash2 className="w-4 h-4" /></span>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    {isExpanded && (
                      <div className={`p-4 border-t ${isDark ? 'border-slate-600 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Issue (Out) Qty *</label>
                            <input
                              type="number"
                              min={0}
                              value={d.issue_qty}
                              onChange={(e) => updateDetailQty(i, e.target.value)}
                              onFocus={() => {
                                if (isInventoryQuantityZeroish(d.issue_qty)) {
                                  updateDetailQty(i, '');
                                }
                              }}
                              className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Stock Qty</label>
                            <input type="text" readOnly value={d.stock_qty ?? ''} className={`w-full px-4 py-2 rounded-lg border opacity-75 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-100 border-slate-200'}`} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Tag activity</label>
                            <button type="button" onClick={() => setShowTagActivityModal(i)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}><Package className="w-4 h-4" />{d.activityName || 'Tag activity'}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button onClick={handleDetailsNext} disabled={isSubmitting || details.length === 0} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting || details.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {mode === 'edit' ? 'Save' : 'Next'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success modal (same as PR/RFQ/GRN) */}
        {step === 'success' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <div className={`relative ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'} rounded-xl border ${cardClass} w-full max-w-md max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
              <button
                onClick={() => router.push('/inventory-reports/issue-slip')}
                className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <div className="p-6 sm:p-8 flex flex-col items-center">
                <h2 className={`text-lg sm:text-xl font-black mb-2 ${textPrimary}`}>{mode === 'edit' ? 'Goods Issue Updated' : 'Goods Issue Created'}</h2>
                <p className={`text-sm ${textSecondary} mb-6`}>Your PDF is ready. View or share below.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleViewPdf}
                    disabled={!pdfInfo?.url}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400 disabled:opacity-50 transition-colors"
                    title="View PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSharePdf}
                    disabled={!pdfInfo?.url}
                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400 disabled:opacity-50 transition-colors"
                    title="Share PDF (copy link)"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                {!pdfInfo?.url && (
                  <button
                    onClick={() => fetchPdf()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mt-4 text-[#6B8E23] hover:bg-[#6B8E23]/10 disabled:opacity-70"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    Generate PDF
                  </button>
                )}
                <button
                  onClick={() => router.push('/inventory-reports/issue-slip')}
                  className="mt-8 flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]"
                >
                  Done — Back to List
                </button>
              </div>
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

        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Validation Rules</h3>
              <ul className={`text-sm space-y-2 ${textSecondary}`}>
                <li>• Project and Store: optional</li>
                <li>• Date: mandatory</li>
                <li>• Issue Type: mandatory</li>
                <li>• Materials or Assets: mandatory</li>
                <li>• Quantities: mandatory</li>
                <li>• Receiving location/project (Issue to): mandatory</li>
                <li>• Tag: optional</li>
                <li>• Remarks: optional</li>
              </ul>
              <button onClick={() => setShowHelpModal(false)} className={`mt-4 w-full py-2 rounded-lg font-bold bg-[#6B8E23] text-white`}>OK</button>
            </div>
          </div>
        )}

        {showTagActivityModal !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Activity</h3>
              <div className="space-y-2">
                {activities.length === 0 ? (
                  <p className={`py-4 text-center ${textSecondary}`}>No activities found</p>
                ) : (
                  activities.map((a) => (
                    <button key={a.id ?? a.uuid} type="button" onClick={() => { updateDetailActivity(showTagActivityModal, a.id ?? a.uuid, a.name ?? a.activity_name ?? ''); setShowTagActivityModal(null); }} className={`w-full text-left px-4 py-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>{a.name ?? a.activity_name ?? a.id}</button>
                  ))
                )}
              </div>
              <button onClick={() => setShowTagActivityModal(null)} className={`mt-4 w-full py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
