'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
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
  Image as ImageIcon,
} from 'lucide-react';
import { masterDataAPI, goodsReceiptAPI } from '@/services/api';
import { getTodayDateString } from '@/utils/dateUtils';
import CreateVendorModal from '@/components/masters/Modals/CreateVendorModal';
import CreateWarehouseModal from '@/components/masters/Modals/CreateWarehouseModal';
import CreateProjectModal from '@/components/masters/Modals/CreateProjectModal';
import { openPdfInNewTab, copyPdfUrl } from '@/utils/pdfUtils';

type GoodsReceiptStep = 'stores' | 'inwardsList' | 'details' | 'success';

interface GoodsReceiptFlowProps {
  mode: 'create' | 'edit';
  projectId?: string;
  projectName?: string;
  projectNumericId?: string;
  inwardId?: string;
}

interface StoreItem {
  id: string | number;
  numericId?: number;
  name: string;
  code?: string;
}

interface EntryType {
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
}

interface InwardDetailItem {
  inward_goods_id: string | number;
  materials_id: string | number;
  materialCode: string;
  materialName: string;
  materialUnit?: string;
  materialSpec?: string;
  recipt_qty: number | string;
  reject_qty: number | string;
  accepted_qty?: number | string;
  po_qty?: number | string;
  price?: number | string;
  remarkes?: string;
  id?: string | number | null;
}

export default function GoodsReceiptFlow({
  mode,
  projectId,
  projectName,
  projectNumericId,
  inwardId,
}: GoodsReceiptFlowProps) {
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
    } catch { return rawName; }
  })();
  const pNumId = projectNumericId ?? searchParams?.get('projectNumericId') ?? pid;
  const editInwardId = inwardId ?? searchParams?.get('inwardId');

  const [editProject, setEditProject] = useState<{ id: string; name: string; numericId?: string } | null>(null);
  const [editLoadedStoreIds, setEditLoadedStoreIds] = useState<(string | number)[]>([]);

  const [step, setStep] = useState<GoodsReceiptStep>('stores');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [inwardHeader, setInwardHeader] = useState<any>(null);
  const [isCreatingHeader, setIsCreatingHeader] = useState(false);
  const [inwardDate, setInwardDate] = useState(() => getTodayDateString());
  const [entryTypeId, setEntryTypeId] = useState<string | number>('');
  const [supplierProjectStoreId, setSupplierProjectStoreId] = useState<string | number>('');
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [isLoadingSupplierOptions, setIsLoadingSupplierOptions] = useState(false);
  const [deliveryRefNo, setDeliveryRefNo] = useState('');
  const [deliveryRefDate, setDeliveryRefDate] = useState(() => getTodayDateString());
  const [remarks, setRemarks] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [goodsType, setGoodsType] = useState<'materials' | 'machines'>('materials');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [inwardGoodsList, setInwardGoodsList] = useState<any[]>([]);
  const [details, setDetails] = useState<InwardDetailItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAddNewGoodsModal, setShowAddNewGoodsModal] = useState(false);
  const [addGoodsType, setAddGoodsType] = useState<'materials' | 'machines'>('materials');
  const [addGoodsForm, setAddGoodsForm] = useState({ name: '', specification: '', unit_id: '', class: 'B' });
  const [addGoodsUnits, setAddGoodsUnits] = useState<Array<{ id: number; unit: string }>>([]);
  const [isAddGoodsSubmitting, setIsAddGoodsSubmitting] = useState(false);
  const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfInfo, setPdfInfo] = useState<{ url?: string; name?: string } | null>(null);
  const [grnNoFromBackend, setGrnNoFromBackend] = useState<string | null>(null);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const detailsSubmitInProgress = React.useRef(false);

  const projectIdForApi = () => (editProject?.numericId ?? editProject?.id ?? pNumId) || (pid && /^\d+$/.test(String(pid)) ? pid : undefined);
  const projectNameForDisplay = () => editProject?.name ?? pName;

  const [entryTypeList, setEntryTypeList] = useState<EntryType[]>([]);
  const [isLoadingEntryTypes, setIsLoadingEntryTypes] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      if (!pid) {
        toast.showWarning('Project is required. Redirecting...');
        router.push('/inventory-reports/grn-mrn-slip');
        return;
      }
      setIsLoading(false);
    } else if (mode === 'edit' && editInwardId) {
      goodsReceiptAPI.edit(editInwardId)
        .then((data) => {
          const proj = data?.projects_id ?? data?.project;
          const projId = typeof proj === 'object' ? proj?.id ?? proj?.uuid : proj;
          const projName = typeof proj === 'object' ? proj?.project_name ?? proj?.name : '';
          if (projId) {
            setEditProject({ id: String(projId), name: projName || 'Project', numericId: String((proj as any)?.id ?? projId) });
            setInwardHeader(data);
            setInwardDate(data?.date ?? data?.name ?? getTodayDateString());
            setEntryTypeId(data?.entry_type ?? '');
            setSupplierProjectStoreId(data?.vendors_id ?? data?.supplier_id ?? '');
            setDeliveryRefNo(data?.delivery_ref_copy_no ?? '');
            setDeliveryRefDate(data?.delivery_ref_copy_date ?? inwardDate);
            setRemarks(data?.remarkes ?? data?.remarks ?? '');
            const storeIds = data?.store_warehouses_id ?? data?.store_warehouses ?? [];
            setEditLoadedStoreIds((Array.isArray(storeIds) ? storeIds : []).map((s: any) => s?.id ?? s));
            const detailsList = data?.details ?? data?.inward_details ?? [];
            const headerId = data?.id ?? data?.inv_inwards_id ?? data?.uuid;
            setDetails((Array.isArray(detailsList) ? detailsList : []).map((d: any) => ({
              inward_goods_id: d.inward_goods_id ?? d.inward_goods ?? headerId,
              materials_id: d.materials_id ?? d.material_id ?? d.materials?.id,
              materialCode: d.materials?.code ?? d.code ?? '',
              materialName: d.materials?.name ?? d.name ?? '',
              materialUnit: d.materials?.units?.unit ?? d.unit ?? '',
              materialSpec: d.materials?.specification ?? d.specification ?? '',
              recipt_qty: d.recipt_qty ?? d.receipt_qty ?? d.qty ?? 0,
              reject_qty: d.reject_qty ?? 0,
              accepted_qty: d.accepted_qty ?? '',
              po_qty: d.po_qty ?? '',
              price: d.price ?? d.rate ?? '',
              remarkes: d.remarkes ?? d.remarks ?? '',
              id: d.id ?? null,
            })));
            setGoodsType(data?.type === 'machines' ? 'machines' : 'materials');
          }
        })
        .catch((err: any) => {
          toast.showWarning(err?.message ?? 'Failed to load inward. Redirecting...');
          router.push('/inventory-reports/grn-mrn-slip');
        })
        .finally(() => setIsLoading(false));
    } else setIsLoading(false);
  }, [mode, editInwardId, pid]);

  useEffect(() => {
    const pId = projectIdForApi();
    if (!pId || (mode === 'edit' && !editInwardId)) return;
    setIsLoadingStores(true);
    masterDataAPI.getProjectWiseWarehouses(pId)
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        setStores(list.map((s: any) => ({
          id: s.uuid ?? s.id,
          numericId: Number.isFinite(Number(s.id)) ? Number(s.id) : undefined,
          name: s.name ?? s.store_name ?? '',
          code: s.code ?? '',
        })));
      })
      .catch(() => setStores([]))
      .finally(() => setIsLoadingStores(false));
  }, [pid, pNumId, mode, editInwardId, editProject]);

  useEffect(() => {
    if (mode === 'edit' && inwardHeader && stores.length > 0 && editLoadedStoreIds.length > 0) {
      const ids = new Set<string>();
      for (const apiId of editLoadedStoreIds) {
        const s = stores.find((x) => String(x.id) === String(apiId) || String(x.numericId) === String(apiId));
        if (s) ids.add(String(s.id));
      }
      setSelectedStoreIds(ids);
      setEditLoadedStoreIds([]);
    }
  }, [mode, inwardHeader, stores, editLoadedStoreIds]);

  // Entry types: load on focus (create) or when step inwardsList (edit mode needs list for display)
  const [entryTypesLoadAttempted, setEntryTypesLoadAttempted] = useState(false);
  useEffect(() => {
    if (mode === 'edit' && step === 'inwardsList' && !entryTypesLoadAttempted) {
      setEntryTypesLoadAttempted(true);
      setIsLoadingEntryTypes(true);
      goodsReceiptAPI
        .getEntryTypeList()
        .then((list: any[]) => setEntryTypeList(Array.isArray(list) ? list : []))
        .catch(() => setEntryTypeList([]))
        .finally(() => setIsLoadingEntryTypes(false));
    }
  }, [mode, step, entryTypesLoadAttempted]);
  const handleEntryTypeFocus = () => {
    if (entryTypesLoadAttempted) return;
    setEntryTypesLoadAttempted(true);
    setIsLoadingEntryTypes(true);
    goodsReceiptAPI
      .getEntryTypeList()
      .then((list: any[]) => setEntryTypeList(Array.isArray(list) ? list : []))
      .catch(() => setEntryTypeList([]))
      .finally(() => setIsLoadingEntryTypes(false));
  };

  // Fetch GRN/MRN no from project-to-store-list when Inward Goods step loads (like issue no, return no)
  useEffect(() => {
    if (step !== 'inwardsList') return;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    if (!pId || storeNumericIds.length === 0) {
      setGrnNoFromBackend(null);
      return;
    }
    goodsReceiptAPI
      .projectToStoreList(pId, storeNumericIds, 'inward')
      .then((data: any) => {
        const no = data?.invInwardRegNo ?? data?.grn_no ?? data?.inv_inward_reg_no;
        setGrnNoFromBackend(no ? String(no) : null);
      })
      .catch(() => setGrnNoFromBackend(null));
  }, [step, projectIdForApi(), selectedStoreIds, stores]);

  useEffect(() => {
    if (entryTypeId && selectedStoreIds.size > 0) {
      const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
      const typeSlug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase().replace(/\s+/g, '-');
      const pId = projectIdForApi();
      const storeNumericIds = Array.from(selectedStoreIds)
        .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
        .filter((x): x is string | number => x != null);
      if (pId) {
        setIsLoadingSupplierOptions(true);
        goodsReceiptAPI.getTypeWiseList(typeSlug || String(entryTypeId), pId, storeNumericIds)
          .then((list: any[]) => setSupplierOptions(Array.isArray(list) ? list : []))
          .catch(() => setSupplierOptions([]))
          .finally(() => setIsLoadingSupplierOptions(false));
      } else {
        setSupplierOptions([]);
        setIsLoadingSupplierOptions(false);
      }
    } else {
      setSupplierOptions([]);
      setIsLoadingSupplierOptions(false);
    }
  }, [entryTypeId, selectedStoreIds, stores, entryTypeList]);

  useEffect(() => {
    if (step !== 'inwardsList') return;
    setIsLoadingMaterials(true);
    (goodsType === 'materials' ? masterDataAPI.getMaterials() : masterDataAPI.getAssetsEquipments())
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        setMaterials(list.map((m: any) => {
          const name = goodsType === 'machines'
            ? (m.assets?.name ?? (typeof m.assets === 'string' ? m.assets : null) ?? m.name ?? '')
            : (m.name ?? '');
          const unitObj = m.unit_id && typeof m.unit_id === 'object' ? m.unit_id : m.units ?? m.unit;
          const unit = typeof unitObj === 'object' ? (unitObj?.unit ?? unitObj?.name) : (m.units?.unit ?? m.unit ?? unitObj ?? '');
          const numericId = goodsType === 'machines'
            ? (m.assets_id ?? m.assets?.id ?? m.id)
            : (m.id);
          return {
            id: m.uuid ?? m.id,
            numericId: Number.isFinite(Number(numericId)) ? Number(numericId) : undefined,
            code: m.code ?? '',
            name,
            specification: m.specification ?? '',
            unit,
          };
        }));
      })
      .catch(() => setMaterials([]))
      .finally(() => setIsLoadingMaterials(false));
  }, [step, goodsType, materialsRefreshKey]);

  useEffect(() => {
    if (!showAddNewGoodsModal) return;
    masterDataAPI.getUnits()
      .then((u: any[]) => setAddGoodsUnits((Array.isArray(u) ? u : []).map((x: any) => ({ id: x.id, unit: x.unit ?? x.name ?? '' }))))
      .catch(() => setAddGoodsUnits([]));
  }, [showAddNewGoodsModal]);

  // Generate PDF on success screen mount (after inward-goods-details-add saves data)
  // requestId must be inv_inwards.id per API spec (POST /api/inventory/generate-pdf)
  useEffect(() => {
    if (step !== 'success') return;
    const inwardRecordId =
      inwardHeader?.id ??
      inwardHeader?.inv_inwards_id ??
      inwardHeader?.uuid ??
      inwardGoodsList?.[0]?.inward_id ??
      inwardGoodsList?.[0]?.inv_inwards_id ??
      inwardGoodsList?.[0]?.id ??
      editInwardId;
    if (!inwardRecordId) return;
    setIsSubmitting(true);
    const inwardDetailsForPdf = details.length > 0
      ? details.map((d) => ({
          id: d.id ?? undefined,
          materials_id: d.materials_id,
          materialCode: d.materialCode,
          materialName: d.materialName,
          materialSpec: d.materialSpec,
          materialUnit: d.materialUnit,
          recipt_qty: d.recipt_qty,
          reject_qty: d.reject_qty,
        }))
      : undefined;
    goodsReceiptAPI
      .generatePdf(inwardRecordId, inwardDetailsForPdf)
      .then(({ pdf_url, name }) => setPdfInfo({ url: pdf_url, name: name ?? `Inward-${inwardDate}.pdf` }))
      .catch((err: any) => {
        setPdfInfo(null);
        const msg = err?.message ?? err?.response?.data?.error ?? 'Failed to generate PDF';
        toast.showWarning(msg);
      })
      .finally(() => setIsSubmitting(false));
  }, [step, inwardHeader?.id, inwardHeader?.inv_inwards_id, inwardHeader?.uuid, inwardGoodsList, editInwardId, inwardDate, details]);

  const handleBackClick = () => {
    if (step === 'success') setStep('details');
    else if (step === 'details') setStep('inwardsList');
    else if (step === 'inwardsList') setStep('stores');
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
    const ids = Array.from(selectedStoreIds);
    if (ids.length === 0) {
      toast.showWarning('Please Select Store to Continue');
      return;
    }
    const pId = projectIdForApi();
    if (!pId) {
      toast.showWarning('Project is required.');
      return;
    }
    const storeNumericIds = ids
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    setIsCreatingHeader(true);
    try {
      const name = inwardDate || getTodayDateString();
      if (mode === 'edit' && inwardHeader?.id) {
        setStep('inwardsList');
      } else {
        const created = await goodsReceiptAPI.createHeader({ name, projects_id: pId, store_warehouses_id: storeNumericIds });
        setInwardHeader(created);
        setStep('inwardsList');
      }
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to create inward header.');
    } finally {
      setIsCreatingHeader(false);
    }
  };

  const handleInwardsListNext = async () => {
    if (!inwardHeader) return;
    if (!inwardDate || !String(inwardDate).trim()) {
      toast.showWarning('Please Enter a Date');
      return;
    }
    if (!entryTypeId) {
      toast.showWarning('Please Select Entry Type');
      return;
    }
    if (!supplierProjectStoreId) {
      toast.showWarning(`Please select ${getSupplierLabel()}`);
      return;
    }
    if (!deliveryRefNo.trim()) {
      toast.showWarning('Please Enter Delivery Ref copy no');
      return;
    }
    if (!deliveryRefDate || !String(deliveryRefDate).trim()) {
      toast.showWarning('Please Select Delivery Ref copy Date');
      return;
    }
    const invInwardId = inwardHeader.id ?? inwardHeader.inv_inwards_id ?? inwardHeader.uuid;
    const grnNo = mode === 'edit' ? (inwardHeader.grn_no ?? inwardHeader.name ?? inwardDate) : (grnNoFromBackend ?? inwardHeader.invInwardRegNo ?? inwardHeader.name ?? inwardDate);
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    const materialIdsArr = Array.from(selectedMaterialIds);
    if (materialIdsArr.length === 0) {
      toast.showWarning('Please select at least one material/asset.');
      return;
    }
    const materialNumericIds = materialIdsArr
      .map((mid) => materials.find((x) => String(x.id) === mid)?.numericId ?? materials.find((x) => String(x.id) === mid)?.id)
      .filter((x): x is string | number => x != null);
    if (materialNumericIds.length === 0) {
      toast.showWarning('Could not resolve selected materials. Please try again.');
      return;
    }
    if (storeNumericIds.length === 0) {
      toast.showWarning('Store selection is required.');
      return;
    }
    // Spec Step 1: inventory/inward-goods-add creates header and returns item list
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('inv_inwards_id', String(invInwardId));
      formData.append('projects_id', String(pId!));
      formData.append('vendors_id', String(supplierProjectStoreId));
      formData.append('grn_no', grnNo);
      formData.append('date', inwardDate);
      formData.append('entry_type', String(entryTypeId));
      formData.append('type', goodsType === 'machines' ? 'assets' : 'materials');
      formData.append('delivery_ref_copy_no', deliveryRefNo);
      formData.append('delivery_ref_copy_date', deliveryRefDate);
      if (remarks) formData.append('remarkes', remarks);
      if (imageFile) formData.append('img', imageFile);
      storeNumericIds.forEach((id) => formData.append('store_warehouses_id[]', String(id)));
      materialNumericIds.forEach((id) => formData.append('materials_id[]', String(id)));
      const addResult = await goodsReceiptAPI.addInwardGoods(formData);
      const goodsListRaw = Array.isArray(addResult)
        ? addResult
        : addResult?.data != null
          ? (Array.isArray(addResult.data) ? addResult.data : [addResult.data])
          : Array.isArray(addResult?.inward_goods)
            ? addResult.inward_goods
            : addResult != null && typeof addResult === 'object'
              ? [addResult]
              : [];
      const goodsList = Array.isArray(goodsListRaw) ? goodsListRaw : [];
      let detailItems: InwardDetailItem[];
      // Spec: addInwardGoodsRes copied into local state; each item shown as expandable card
      if (goodsList.length > 0) {
        detailItems = goodsList.map((g: any) => {
          const unitObj = g.unit_id && typeof g.unit_id === 'object' ? g.unit_id : g.units ?? g.unit;
          const unitLabel = typeof unitObj === 'object' ? (unitObj?.unit ?? unitObj?.name) : (g.unit ?? '');
          return {
            inward_goods_id: g.inward_id ?? g.inward_goods_id ?? g.id ?? invInwardId,
            materials_id: g.id ?? g.materials_id ?? g.assets_id ?? g.material_id ?? g.materials?.id ?? g.assets?.id,
            materialCode: g.materials?.code ?? g.assets?.code ?? g.code ?? '',
            materialName: g.materials?.name ?? g.assets?.name ?? (typeof g.assets === 'string' ? g.assets : null) ?? g.name ?? '',
            materialUnit: unitLabel ?? '',
            materialSpec: g.materials?.specification ?? g.assets?.specification ?? g.specification ?? '',
            recipt_qty: g.recipt_qty ?? g.receipt_qty ?? 0,
            reject_qty: g.reject_qty ?? 0,
            accepted_qty: g.accepted_qty ?? '',
            po_qty: g.po_qty ?? '',
            price: g.price ?? g.rate ?? '',
            remarkes: g.remarkes ?? '',
            id: g.InvInwardGoodDetails_id ?? g.inv_inward_goods_details_id ?? g.id ?? null,
          };
        });
      } else {
        detailItems = materialNumericIds.map((mid) => {
          const m = materials.find((x) => String(x.numericId ?? x.id) === String(mid));
          return {
            inward_goods_id: invInwardId,
            materials_id: mid,
            materialCode: m?.code ?? '',
            materialName: m?.name ?? '',
            materialUnit: m?.unit ?? '',
            materialSpec: m?.specification ?? '',
            recipt_qty: 0,
            reject_qty: 0,
            accepted_qty: '0',
            po_qty: '0',
            price: '',
            remarkes: '',
            id: null,
          };
        });
      }
      setDetails(detailItems);
      setInwardGoodsList(goodsList);
      setExpandedDetails(new Set(detailItems.map((_, i) => `detail-${i}`)));
      setStep('details');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to add inward goods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailsNext = async () => {
    if (detailsSubmitInProgress.current) return;
    const invalid = details.filter((d) => !d.recipt_qty || Number(d.recipt_qty) <= 0);
    if (invalid.length > 0) {
      toast.showWarning('Receipt quantity is required for all items.');
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
    if (storeNumericIds.length === 0) {
      toast.showWarning('Store selection is required.');
      return;
    }
    const inwardGoodsId = inwardGoodsList?.[0]?.inward_id ?? inwardGoodsList?.[0]?.inward_goods_id ?? inwardGoodsList?.[0]?.id ?? inwardHeader?.id ?? details?.[0]?.inward_goods_id;
    // Spec: Build array per item; POST inventory/inward-goods-details-add; on success → success screen; on failure → stay
    detailsSubmitInProgress.current = true;
    setIsSubmitting(true);
    try {
      const payload = details.map((d) => ({
        id: d.id != null && d.id !== '' ? d.id : '',
        inward_goods_id: d.inward_goods_id ?? inwardGoodsId,
        materials_id: d.materials_id,
        po_qty: d.po_qty != null && d.po_qty !== '' ? d.po_qty : '',
        price: d.price != null && d.price !== '' ? Number(d.price) : 0,
        projects_id: String(pId),
        recipt_qty: Number(d.recipt_qty) || 0,
        reject_qty: Number(d.reject_qty) || 0,
        remarkes: d.remarkes ?? '',
        store_warehouses_id: storeNumericIds.map((x) => (typeof x === 'number' ? x : Number(x))),
        type: goodsType || 'materials',
      }));
      await goodsReceiptAPI.addInwardDetails(payload);
      setStep('success');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save inward details.');
    } finally {
      detailsSubmitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const updateDetail = (index: number, field: string, value: number | string) => {
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const upd = { ...d, [field]: value };
        if (field === 'recipt_qty' || field === 'reject_qty') {
          const rec = Number(field === 'recipt_qty' ? value : d.recipt_qty) || 0;
          const rej = Number(field === 'reject_qty' ? value : d.reject_qty) || 0;
          upd.accepted_qty = String(Math.max(0, rec - rej));
        }
        return upd;
      })
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
  const toggleDetailExpand = (indexKey: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(indexKey)) next.delete(indexKey);
      else next.add(indexKey);
      return next;
    });
  };

  const handleViewPdf = () => {
    if (pdfInfo?.url) openPdfInNewTab(pdfInfo.url);
    else toast.showWarning('No PDF available.');
  };

  const handleSharePdf = async () => {
    if (!pdfInfo?.url) {
      toast.showWarning('No PDF available.');
      return;
    }
    const copied = await copyPdfUrl(pdfInfo.url);
    if (copied) {
      toast.showSuccess('PDF URL copied to clipboard. Paste in browser to open.');
    } else {
      toast.showWarning('Could not copy. Open PDF in new tab and copy the URL from address bar.');
    }
  };

  const getSupplierLabel = () => {
    const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
    const name = (t?.name ?? '').toLowerCase();
    if (name.includes('from other project') || (name.includes('other project') && !name.includes('same'))) return 'Project';
    if (name.includes('same project-other stores') || name.includes('same project') || name.includes('other store')) return 'Store';
    return 'Supplier';
  };

  const getSupplierOptionDisplay = (item: any) => {
    const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
    const name = (t?.name ?? '').toLowerCase();
    if (name.includes('from other project') || (name.includes('other project') && !name.includes('same'))) {
      return item?.project_name ?? item?.name ?? item?.registration_name ?? item?.store_name ?? item?.id ?? '';
    }
    return item?.name ?? item?.registration_name ?? item?.store_name ?? item?.project_name ?? item?.id ?? '';
  };

  const isSupplierEntryType = () => getSupplierLabel() === 'Supplier';

  const refreshSupplierOptions = async () => {
    if (!entryTypeId || selectedStoreIds.size === 0) return;
    const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
    const typeSlug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase().replace(/\s+/g, '-');
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    if (!pId) return;
    try {
      const list = await goodsReceiptAPI.getTypeWiseList(typeSlug || String(entryTypeId), pId, storeNumericIds);
      setSupplierOptions(Array.isArray(list) ? list : []);
    } catch {
      setSupplierOptions([]);
    }
  };

  const refreshStores = async () => {
    const pId = projectIdForApi();
    if (!pId) return;
    setIsLoadingStores(true);
    try {
      const res = await masterDataAPI.getProjectWiseWarehouses(pId);
      const list = Array.isArray(res) ? res : [];
      setStores(list.map((s: any) => ({
        id: s.uuid ?? s.id,
        numericId: Number.isFinite(Number(s.id)) ? Number(s.id) : undefined,
        name: s.name ?? s.store_name ?? '',
        code: s.code ?? '',
      })));
    } catch {
      setStores([]);
    } finally {
      setIsLoadingStores(false);
    }
  };

  const handleAddNewGoodsOpen = () => {
    setAddGoodsType(goodsType);
    setAddGoodsForm({ name: '', specification: '', unit_id: '', class: 'B' });
    setShowAddNewGoodsModal(true);
  };

  const handleAddNewGoodsCreate = async () => {
    const { name, specification, unit_id, class: cls } = addGoodsForm;
    if (!name.trim()) {
      toast.showWarning('Name is required.');
      return;
    }
    if (!unit_id) {
      toast.showWarning('Unit is required.');
      return;
    }
    if (addGoodsType === 'materials' && !['A', 'B', 'C'].includes(cls)) {
      toast.showWarning('Class of Material is required (A, B, or C).');
      return;
    }
    setIsAddGoodsSubmitting(true);
    try {
      if (addGoodsType === 'materials') {
        await masterDataAPI.createMaterial({
          name: name.trim(),
          specification: specification.trim() || undefined,
          unit_id: Number(unit_id),
          class: cls,
          is_active: 1,
        });
        toast.showSuccess('Material created successfully!');
      } else {
        await masterDataAPI.createAssetEquipment({
          name: name.trim(),
          specification: specification.trim() || undefined,
          unit_id: Number(unit_id),
          is_active: 1,
        });
        toast.showSuccess('Asset/Machine created successfully!');
      }
      setShowAddNewGoodsModal(false);
      setAddGoodsForm({ name: '', specification: '', unit_id: '', class: 'B' });
      setMaterialsRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to create.');
    } finally {
      setIsAddGoodsSubmitting(false);
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
          <button onClick={handleBackClick} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-black ${textPrimary}`}>Goods Receipt (GRN/MRN)</h1>
            <p className={`text-sm ${textSecondary}`}>{mode === 'edit' ? 'Edit inward' : 'Create new inward'} {projectNameForDisplay() && `• ${projectNameForDisplay()}`}</p>
          </div>
          <button onClick={() => router.push('/inventory-reports/grn-mrn-slip')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'stores' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Stores *</h2>
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
            ) : stores.length === 0 ? (
              <div className="py-8 mb-6">
                <p className={`text-center mb-4 ${textSecondary}`}>No stores available for this project. Add a store to continue.</p>
                <div className="flex justify-center">
                  <button type="button" onClick={() => setShowCreateWarehouseModal(true)} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                    <Plus className="w-5 h-5" /> Add Store
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {stores.map((store) => {
                    const sid = String(store.id);
                    const isSelected = selectedStoreIds.has(sid);
                    return (
                      <button key={sid} type="button" onClick={() => toggleStore(sid)} className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center justify-between">
                          <div><p className={`font-bold ${textPrimary}`}>{store.name}</p>{store.code && <p className={`text-sm ${textSecondary}`}>{store.code}</p>}</div>
                          {isSelected && <Check className="w-5 h-5 text-[#6B8E23]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mb-4">
                  <button type="button" onClick={() => setShowCreateWarehouseModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new store">
                    <Plus className="w-4 h-4" /> Add New Store
                  </button>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <button onClick={handleStoresNext} disabled={isCreatingHeader || selectedStoreIds.size === 0} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isCreatingHeader || selectedStoreIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isCreatingHeader ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'inwardsList' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Inward Goods</h2>
            <div className={`p-4 rounded-lg mb-4 space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex justify-between items-start">
                <div><p className={`text-sm font-bold ${textSecondary}`}>Project Name</p><p className={textPrimary}>{projectNameForDisplay()}</p></div>
                <button type="button" onClick={() => setShowHelpModal(true)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Help"><HelpCircle className="w-5 h-5" /></button>
              </div>
              <div><p className={`text-sm font-bold ${textSecondary}`}>Stores</p><p className={textPrimary}>{stores.filter((s) => selectedStoreIds.has(String(s.id))).map((s) => s.name).join(', ') || '-'}</p></div>
              <div><p className={`text-sm font-bold ${textSecondary}`}>GRN/MRN no</p><p className={textPrimary}>{mode === 'edit' ? (inwardHeader?.grn_no ?? inwardHeader?.name ?? inwardDate) : (grnNoFromBackend ?? inwardHeader?.name ?? inwardDate)}</p></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Date *</label>
                <input type="date" value={inwardDate} onChange={(e) => setInwardDate(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Entry Type *</label>
                <select
                  value={entryTypeId}
                  onFocus={handleEntryTypeFocus}
                  onChange={(e) => { setEntryTypeId(e.target.value); setSupplierProjectStoreId(''); }}
                  disabled={isLoadingEntryTypes}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                >
                  <option value="">Select...</option>
                  {entryTypeList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {entryTypesLoadAttempted && !isLoadingEntryTypes && entryTypeList.length === 0 && (
                  <p className={`mt-1 text-sm ${textSecondary}`}>No Data Found</p>
                )}
              </div>
              {entryTypeId && (
                <div className="sm:col-span-2">
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>{getSupplierLabel()} *</label>
                  <div className="flex gap-2">
                    <select value={supplierProjectStoreId} onChange={(e) => setSupplierProjectStoreId(e.target.value)} disabled={isLoadingSupplierOptions} className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                      <option value="">Select...</option>
                      {supplierOptions.map((o: any) => <option key={o.id} value={o.id}>{getSupplierOptionDisplay(o)}</option>)}
                    </select>
                    {isSupplierEntryType() && (
                      <button type="button" onClick={() => setShowCreateVendorModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new supplier">
                        <Plus className="w-5 h-5" /> Add New
                      </button>
                    )}
                    {getSupplierLabel() === 'Store' && (
                      <button type="button" onClick={() => setShowCreateWarehouseModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new store">
                        <Plus className="w-5 h-5" /> Add New
                      </button>
                    )}
                    {getSupplierLabel() === 'Project' && (
                      <button type="button" onClick={() => setShowCreateProjectModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`} title="Add new project">
                        <Plus className="w-5 h-5" /> Add New
                      </button>
                    )}
                  </div>
                  {!isLoadingSupplierOptions && supplierOptions.length === 0 && (
                    <p className={`mt-1 text-sm ${textSecondary}`}>
                      No {getSupplierLabel().toLowerCase()}s found.
                      {isSupplierEntryType() && ' Add a supplier in Masters or use Add New.'}
                      {getSupplierLabel() === 'Store' && ' Add a store using the Add New button above.'}
                      {getSupplierLabel() === 'Project' && ' Add a project using the Add New button above.'}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Delivery Ref Copy No *</label>
                <input type="text" value={deliveryRefNo} onChange={(e) => setDeliveryRefNo(e.target.value)} placeholder="Delivery reference" className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Delivery Ref Copy Date *</label>
                <input type="date" value={deliveryRefDate} onChange={(e) => setDeliveryRefDate(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Remarks</label>
                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Take Photo</label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    const r = new FileReader();
                    r.onload = () => setImagePreview(r.result as string);
                    r.readAsDataURL(f);
                  }
                  e.target.value = '';
                }} />
                {imagePreview ? (
                  <div className={`relative rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg text-white"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => imageInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                    <ImageIcon className="w-5 h-5" /> Click to upload
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className={`text-sm font-bold ${textSecondary}`}>Select goods</p>
                <button
                  type="button"
                  onClick={handleAddNewGoodsOpen}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'}`}
                >
                  <Plus className="w-4 h-4" /> Create new
                </button>
              </div>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="goodsType" checked={goodsType === 'materials'} onChange={() => setGoodsType('materials')} className="rounded-full" /><span className={textPrimary}>Material</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="goodsType" checked={goodsType === 'machines'} onChange={() => setGoodsType('machines')} className="rounded-full" /><span className={textPrimary}>Machine</span></label>
              </div>
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <table className="w-full text-sm">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}></th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Code</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Name</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Specification</th>
                      <th className={`px-4 py-3 text-left ${textSecondary}`}>Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {materials.map((m) => {
                      const mid = String(m.id);
                      const checked = selectedMaterialIds.has(mid);
                      return (
                        <tr key={mid} className={`cursor-pointer ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} ${checked ? 'bg-[#6B8E23]/10' : ''}`} onClick={() => toggleMaterial(mid)}>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={checked} onChange={() => toggleMaterial(mid)} className="rounded cursor-pointer" />
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
            </div>

            <div className="flex justify-end">
              <button onClick={handleInwardsListNext} disabled={isSubmitting || (selectedMaterialIds.size === 0 && !imageFile)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting || (selectedMaterialIds.size === 0 && !imageFile) ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Details of Goods</h2>
            <div className="space-y-3 mb-6">
              {details.map((d, index) => {
                const indexKey = `detail-${index}`;
                const isExpanded = expandedDetails.has(indexKey);
                const recQty = Number(d.recipt_qty) || 0;
                const rejQty = Number(d.reject_qty) || 0;
                const accepted = Math.max(0, recQty - rejQty);
                return (
                  <div key={indexKey} className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    <button type="button" onClick={() => toggleDetailExpand(indexKey)} className={`w-full flex items-center justify-between p-4 text-left ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <div className="flex-1 min-w-0"><p className={`font-bold ${textPrimary}`}>{d.materialName}</p><p className={`text-sm ${textSecondary}`}>{d.materialCode} • {d.materialUnit || '-'} • {d.materialSpec || '-'}</p></div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeDetail(index); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {isExpanded && (
                      <div className={`p-4 border-t ${isDark ? 'border-slate-600 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Receipt In Qty *</label>
                            <input type="number" min={0} value={d.recipt_qty} onChange={(e) => updateDetail(index, 'recipt_qty', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Reject Qty</label>
                            <input type="number" min={0} value={d.reject_qty} onChange={(e) => updateDetail(index, 'reject_qty', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Accepted Qty</label>
                            <input type="text" readOnly value={accepted} className={`w-full px-4 py-2 rounded-lg border opacity-75 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-100 border-slate-200'}`} />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>PO Qty</label>
                            <input type="text" readOnly value={d.po_qty ?? '-'} className={`w-full px-4 py-2 rounded-lg border opacity-75 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-100 border-slate-200'}`} />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Rate per Unit</label>
                            <input type="number" min={0} step="0.01" value={d.price} onChange={(e) => updateDetail(index, 'price', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Overall Remarks</label>
                            <input type="text" value={d.remarkes} onChange={(e) => updateDetail(index, 'remarkes', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStep('inwardsList')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'} ${textPrimary}`}>
                <Plus className="w-4 h-4" /> Add More
              </button>
              <button onClick={handleDetailsNext} disabled={isSubmitting || details.length === 0} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting || details.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className={`rounded-xl border p-8 ${cardClass} text-center`}>
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-[#6B8E23]/20 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-[#6B8E23]" /></div>
              <h2 className={`text-xl font-black mb-2 ${textPrimary}`}>Well done !!!</h2>
              <p className={`text-base ${textSecondary}`}>Inward of Goods is ready</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <button onClick={() => router.push('/inventory-reports/grn-mrn-slip')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}><Plus className="w-4 h-4" /> Add Another</button>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <button onClick={handleViewPdf} className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"><ExternalLink className="w-4 h-4" /> View</button>
              <button onClick={handleSharePdf} className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"><Share2 className="w-4 h-4" /> Share</button>
            </div>
            {pdfInfo?.url && pdfInfo?.name && (
              <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <p className={`text-sm font-bold mb-1 ${textSecondary}`}>PDF</p>
                <p className={`font-mono text-sm ${textPrimary}`}>{pdfInfo.name || 'Inward.pdf'}</p>
              </div>
            )}
          </div>
        )}

        <CreateVendorModal
          theme={theme}
          isOpen={showCreateVendorModal}
          onClose={() => setShowCreateVendorModal(false)}
          defaultVendorType="supplier"
          onSuccess={async (createdVendor) => {
            await refreshSupplierOptions();
            const id = createdVendor?.id ?? createdVendor?.uuid ?? createdVendor?.numericId;
            if (id != null) setSupplierProjectStoreId(String(id));
          }}
        />

        <CreateWarehouseModal
          theme={theme}
          isOpen={showCreateWarehouseModal}
          onClose={() => setShowCreateWarehouseModal(false)}
          selectedProjectId={projectIdForApi() ?? undefined}
          onSuccess={async () => {
            if (step === 'stores') {
              await refreshStores();
            } else {
              await refreshSupplierOptions();
              await refreshStores();
            }
          }}
        />

        <CreateProjectModal
          theme={theme}
          isOpen={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={async () => {
            await refreshSupplierOptions();
          }}
          onProjectCreated={(project) => {
            const id = (project as any)?.id ?? (project as any)?.uuid;
            if (id != null) setSupplierProjectStoreId(String(id));
          }}
        />

        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Validation Rules</h3>
              <ul className={`text-sm space-y-2 ${textSecondary}`}>
                <li>• Project and Store: optional</li>
                <li>• Date: mandatory</li>
                <li>• Entry Type: mandatory</li>
                <li>• Supplier/Vendor: mandatory</li>
                <li>• Delivery Ref Copy Number: mandatory</li>
                <li>• Delivery Ref Copy Date: mandatory</li>
                <li>• Materials or Assets: mandatory</li>
                <li>• Quantities: mandatory</li>
                <li>• Remarks: optional</li>
                <li>• Image/Photo: optional</li>
              </ul>
              <button onClick={() => setShowHelpModal(false)} className={`mt-4 w-full py-2 rounded-lg font-bold bg-[#6B8E23] text-white`}>OK</button>
            </div>
          </div>
        )}

        {showAddNewGoodsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Add New Goods</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Material / Machine *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={addGoodsType === 'materials'} onChange={() => setAddGoodsType('materials')} className="rounded-full" /><span className={textPrimary}>Material</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={addGoodsType === 'machines'} onChange={() => setAddGoodsType('machines')} className="rounded-full" /><span className={textPrimary}>Machine</span></label>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>{addGoodsType === 'materials' ? 'Material Name' : 'Asset/equipment/Machinery names'} *</label>
                  <input type="text" value={addGoodsForm.name} onChange={(e) => setAddGoodsForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Specification</label>
                  <input type="text" value={addGoodsForm.specification} onChange={(e) => setAddGoodsForm((p) => ({ ...p, specification: e.target.value }))} placeholder="Optional" className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Unit *</label>
                  <select value={addGoodsForm.unit_id} onChange={(e) => setAddGoodsForm((p) => ({ ...p, unit_id: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <option value="">Select...</option>
                    {addGoodsUnits.map((u) => <option key={u.id} value={u.id}>{u.unit}</option>)}
                  </select>
                </div>
                {addGoodsType === 'materials' && (
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Class of Material *</label>
                    <select value={addGoodsForm.class} onChange={(e) => setAddGoodsForm((p) => ({ ...p, class: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                      <option value="A">Class A</option>
                      <option value="B">Class B</option>
                      <option value="C">Class C</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddNewGoodsModal(false)} disabled={isAddGoodsSubmitting} className={`flex-1 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600' : 'border-slate-200'} ${textPrimary}`}>Cancel</button>
                <button onClick={handleAddNewGoodsCreate} disabled={isAddGoodsSubmitting} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] disabled:opacity-50`}>
                  {isAddGoodsSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
