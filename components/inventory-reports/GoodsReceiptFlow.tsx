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
  const [inwardDate, setInwardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryTypeId, setEntryTypeId] = useState<string | number>('');
  const [supplierProjectStoreId, setSupplierProjectStoreId] = useState<string | number>('');
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [deliveryRefNo, setDeliveryRefNo] = useState('');
  const [deliveryRefDate, setDeliveryRefDate] = useState(() => new Date().toISOString().split('T')[0]);
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
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const projectIdForApi = () => (editProject?.numericId ?? editProject?.id ?? pNumId) || (pid && /^\d+$/.test(String(pid)) ? pid : undefined);
  const projectNameForDisplay = () => editProject?.name ?? pName;

  const [entryTypeList, setEntryTypeList] = useState<EntryType[]>([]);

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
            setInwardDate(data?.date ?? data?.name ?? new Date().toISOString().split('T')[0]);
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

  useEffect(() => {
    if (step === 'inwardsList' || step === 'details') {
      goodsReceiptAPI.getEntryTypeList().then((list: any[]) => setEntryTypeList(Array.isArray(list) ? list : []));
    }
  }, [step]);

  useEffect(() => {
    if (entryTypeId && selectedStoreIds.size > 0) {
      const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
      const typeSlug = ((t as any)?.slug ?? t?.name ?? '').toString().toLowerCase().replace(/\s+/g, '-');
      const pId = projectIdForApi();
      const storeNumericIds = Array.from(selectedStoreIds)
        .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
        .filter((x): x is string | number => x != null);
      if (pId) {
        goodsReceiptAPI.getTypeWiseList(typeSlug || String(entryTypeId), pId, storeNumericIds)
          .then((list: any[]) => setSupplierOptions(Array.isArray(list) ? list : []))
          .catch(() => setSupplierOptions([]));
      } else setSupplierOptions([]);
    } else setSupplierOptions([]);
  }, [entryTypeId, selectedStoreIds, stores, entryTypeList]);

  useEffect(() => {
    if (step !== 'inwardsList') return;
    setIsLoadingMaterials(true);
    (goodsType === 'materials' ? masterDataAPI.getMaterials() : masterDataAPI.getAssetsEquipments())
      .then((res: any[]) => {
        const list = Array.isArray(res) ? res : [];
        setMaterials(list.map((m: any) => ({
          id: m.uuid ?? m.id,
          numericId: Number.isFinite(Number(m.id)) ? Number(m.id) : undefined,
          code: m.code ?? '',
          name: m.name ?? '',
          specification: m.specification ?? '',
          unit: m.units?.unit ?? m.unit ?? '',
        })));
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
      toast.showWarning('Please select at least one store.');
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
      const name = inwardDate || new Date().toISOString().split('T')[0];
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
    const invInwardId = inwardHeader.id ?? inwardHeader.inv_inwards_id ?? inwardHeader.uuid;
    const grnNo = inwardHeader.grn_no ?? inwardHeader.name ?? inwardDate;
    const pId = projectIdForApi();
    const storeNumericIds = Array.from(selectedStoreIds)
      .map((sid) => stores.find((x) => String(x.id) === sid)?.numericId ?? stores.find((x) => String(x.id) === sid)?.id)
      .filter((x): x is string | number => x != null);
    const materialIdsArr = Array.from(selectedMaterialIds);
    if (materialIdsArr.length === 0) {
      toast.showWarning('Please select at least one material/asset.');
      return;
    }
    if (!entryTypeId) {
      toast.showWarning('Entry Type is required.');
      return;
    }
    if (!supplierProjectStoreId) {
      toast.showWarning('Supplier/Project/Store is required.');
      return;
    }
    if (!deliveryRefNo.trim()) {
      toast.showWarning('Delivery Ref Copy No is required.');
      return;
    }
    if (!deliveryRefDate) {
      toast.showWarning('Delivery Ref Copy Date is required.');
      return;
    }
    const materialNumericIds = materialIdsArr
      .map((mid) => materials.find((x) => String(x.id) === mid)?.numericId ?? materials.find((x) => String(x.id) === mid)?.id)
      .filter((x): x is string | number => x != null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('inv_inwards_id', String(invInwardId));
      formData.append('projects_id', String(pId!));
      formData.append('vendors_id', String(supplierProjectStoreId));
      formData.append('grn_no', grnNo);
      formData.append('date', inwardDate);
      formData.append('entry_type', String(entryTypeId));
      formData.append('type', goodsType);
      formData.append('delivery_ref_copy_no', deliveryRefNo);
      formData.append('delivery_ref_copy_date', deliveryRefDate);
      if (remarks) formData.append('remarkes', remarks);
      if (imageFile) formData.append('img', imageFile);
      materialNumericIds.forEach((id) => formData.append('materials_id[]', String(id)));
      const addResult = await goodsReceiptAPI.addInwardGoods(formData);
      const goodsListRaw = Array.isArray(addResult) ? addResult : addResult?.data ?? addResult?.inward_goods ?? [];
      const goodsList = Array.isArray(goodsListRaw) ? goodsListRaw : [];
      let detailItems: InwardDetailItem[];
      if (goodsList.length > 0) {
        detailItems = goodsList.map((g: any) => ({
          inward_goods_id: g.id ?? g.inward_goods_id ?? invInwardId,
          materials_id: g.materials_id ?? g.material_id ?? g.materials?.id,
          materialCode: g.materials?.code ?? g.code ?? '',
          materialName: g.materials?.name ?? g.name ?? '',
          materialUnit: g.materials?.units?.unit ?? g.unit ?? '',
          materialSpec: g.materials?.specification ?? g.specification ?? '',
          recipt_qty: g.recipt_qty ?? g.receipt_qty ?? 0,
          reject_qty: g.reject_qty ?? 0,
          accepted_qty: g.accepted_qty ?? '',
          po_qty: g.po_qty ?? '',
          price: g.price ?? g.rate ?? '',
          remarkes: g.remarkes ?? '',
          id: g.id ?? null,
        }));
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
      setExpandedDetails(new Set(detailItems.map((d) => String(d.materials_id))));
      setStep('details');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to add inward goods.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailsNext = async () => {
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
    const inwardGoodsId = inwardGoodsList?.[0]?.id ?? inwardHeader?.id ?? details?.[0]?.inward_goods_id;
    setIsSubmitting(true);
    try {
      const payload = details.map((d) => ({
        id: d.id ?? null,
        inward_goods_id: d.inward_goods_id ?? inwardGoodsId,
        projects_id: pId,
        store_warehouses_id: storeNumericIds,
        materials_id: d.materials_id,
        type: goodsType,
        recipt_qty: d.recipt_qty,
        reject_qty: d.reject_qty || 0,
        price: d.price || undefined,
        remarkes: d.remarkes || undefined,
      }));
      await goodsReceiptAPI.addInwardDetails(payload);
      setStep('success');
      const inwardHeaderId = inwardHeader?.id ?? inwardHeader?.inv_inwards_id ?? inwardHeader?.uuid ?? inwardGoodsId ?? editInwardId;
      const { pdf_url, name } = await goodsReceiptAPI.generatePdf(inwardHeaderId!);
      setPdfInfo({ url: pdf_url, name: name ?? `Inward-${inwardDate}.pdf` });
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save inward details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDetail = (materialsId: string, field: string, value: number | string) => {
    setDetails((prev) =>
      prev.map((d) => {
        if (String(d.materials_id) !== materialsId) return d;
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
  const removeDetail = (materialsId: string) => {
    setDetails((prev) => prev.filter((d) => String(d.materials_id) !== materialsId));
  };
  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleDetailExpand = (id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSupplierLabel = () => {
    const t = entryTypeList.find((x) => String(x.id) === String(entryTypeId));
    const name = (t?.name ?? '').toLowerCase();
    if (name.includes('direct')) return 'Supplier';
    if (name.includes('other project')) return 'Project';
    if (name.includes('same project') || name.includes('other store')) return 'Store';
    return 'Supplier / Project / Store';
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
          <button onClick={() => router.push('/inventory-reports/grn-mrn-slip')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Back">
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
              <div><p className={`text-sm font-bold ${textSecondary}`}>GRN/MRN no</p><p className={textPrimary}>{inwardHeader?.grn_no ?? inwardHeader?.name ?? inwardDate}</p></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Date *</label>
                <input type="date" value={inwardDate} onChange={(e) => setInwardDate(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Entry Type *</label>
                <select value={entryTypeId} onChange={(e) => { setEntryTypeId(e.target.value); setSupplierProjectStoreId(''); }} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <option value="">Select...</option>
                  {entryTypeList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {entryTypeId && (
                <div className="sm:col-span-2">
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>{getSupplierLabel()} *</label>
                  <select value={supplierProjectStoreId} onChange={(e) => setSupplierProjectStoreId(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <option value="">Select...</option>
                    {supplierOptions.map((o: any) => <option key={o.id} value={o.id}>{o.name ?? o.registration_name ?? o.project_name ?? o.store_name ?? o.id}</option>)}
                  </select>
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
                          <td className="px-4 py-3"><input type="checkbox" checked={checked} onChange={() => toggleMaterial(mid)} className="rounded" /></td>
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
              <button onClick={handleInwardsListNext} disabled={isSubmitting || selectedMaterialIds.size === 0} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold ${isSubmitting || selectedMaterialIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Details for Goods</h2>
            <div className="space-y-3 mb-6">
              {details.map((d) => {
                const key = String(d.materials_id);
                const isExpanded = expandedDetails.has(key);
                const recQty = Number(d.recipt_qty) || 0;
                const rejQty = Number(d.reject_qty) || 0;
                const accepted = Math.max(0, recQty - rejQty);
                return (
                  <div key={key} className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    <button type="button" onClick={() => toggleDetailExpand(key)} className={`w-full flex items-center justify-between p-4 text-left ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <div className="flex-1 min-w-0"><p className={`font-bold ${textPrimary}`}>{d.materialName}</p><p className={`text-sm ${textSecondary}`}>{d.materialCode} • {d.materialUnit || '-'} • {d.materialSpec || '-'}</p></div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeDetail(key); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {isExpanded && (
                      <div className={`p-4 border-t ${isDark ? 'border-slate-600 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Receipt In Qty *</label>
                            <input type="number" min={0} value={d.recipt_qty} onChange={(e) => updateDetail(key, 'recipt_qty', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                          <div>
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Reject Qty</label>
                            <input type="number" min={0} value={d.reject_qty} onChange={(e) => updateDetail(key, 'reject_qty', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
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
                            <input type="number" min={0} step="0.01" value={d.price} onChange={(e) => updateDetail(key, 'price', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Overall Remarks</label>
                            <input type="text" value={d.remarkes} onChange={(e) => updateDetail(key, 'remarkes', e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} />
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
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button onClick={() => router.push('/inventory-reports/grn-mrn-slip')} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]`}><Plus className="w-4 h-4" /> Add Another</button>
            </div>
            {pdfInfo?.url && (
              <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <p className={`text-sm font-bold mb-2 ${textSecondary}`}>PDF</p>
                <p className={`font-mono text-sm mb-3 ${textPrimary}`}>{pdfInfo.name || 'Inward.pdf'}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={() => window.open(pdfInfo.url, '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"><ExternalLink className="w-4 h-4" /> View</button>
                  <button onClick={() => navigator.share?.({ url: pdfInfo.url, title: pdfInfo.name })} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"><Share2 className="w-4 h-4" /> Share</button>
                </div>
              </div>
            )}
          </div>
        )}

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
