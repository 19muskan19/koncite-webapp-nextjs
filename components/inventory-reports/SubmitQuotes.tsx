'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Send,
  Package,
  Loader2,
  X,
  Building2,
  Eye,
  Share2,
} from 'lucide-react';
import { masterDataAPI, materialRequestAPI, rfqAPI } from '@/services/api';

type RfqStep = 'submit' | 'quotesDetails' | 'vendorList' | 'doc';

interface SubmitQuotesProps {
  mode: 'create' | 'edit';
  projectId?: string;
  projectName?: string;
  rfqId?: string;
}

export default function SubmitQuotes({ mode, projectId, projectName, rfqId }: SubmitQuotesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const toast = useToast();
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const pid = projectId ?? searchParams?.get('projectId') ?? undefined;
  const projectNumericId = searchParams?.get('projectNumericId') ?? undefined;
  const editId = rfqId ?? searchParams?.get('rfqId');
  const stepParam = searchParams?.get('step') as RfqStep | null;
  const urlMrId = searchParams?.get('mrId') ?? undefined;
  const urlMrRequestNo = searchParams?.get('mrRequestNo') ?? undefined;
  // material_requests.projects_id expects integer - prefer projectNumericId, else pid if numeric, else project.id if numeric
  const getProjectsIdForApi = () => {
    if (projectNumericId) return projectNumericId;
    if (pid && /^\d+$/.test(String(pid))) return pid;
    if (project?.id && /^\d+$/.test(String(project.id))) return project.id;
    return undefined;
  };

  const [step, setStep] = useState<RfqStep>('submit');

  useEffect(() => {
    if (stepParam && ['submit','quotesDetails','vendorList','doc'].includes(stepParam)) {
      setStep(stepParam as RfqStep);
    }
  }, [stepParam]);

  useEffect(() => {
    if (urlMrId) setSelectedMrId(urlMrId);
    if (urlMrRequestNo) setSelectedMrRequestNo(urlMrRequestNo);
  }, [urlMrId, urlMrRequestNo]);

  const [project, setProject] = useState<{ id: string; name: string } | null>(
    projectId && projectName ? { id: projectId, name: projectName } : null
  );
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [selectedMrId, setSelectedMrId] = useState<string | null>(null);
  /** request_no from selected MR - for materials-request-no-wise-materials-list */
  const [selectedMrRequestNo, setSelectedMrRequestNo] = useState<string | null>(null);
  const [quoteImage, setQuoteImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [quoteDetails, setQuoteDetails] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMrSelectModal, setShowMrSelectModal] = useState(false);
  const [rfqData, setRfqData] = useState<any>(null);
  /** type 0 = materials path, 1 = image path - for material-request-send-to-vendor */
  const [rfqPathType, setRfqPathType] = useState<0 | 1>(1);
  /** IDs from quote-details-add (materials path) for send-to-vendor */
  const [quotesDetailsIds, setQuotesDetailsIds] = useState<(number | string)[]>([]);
  /** User-edited qty/price/date for materials path (key = material id or index) */
  const [materialsEdits, setMaterialsEdits] = useState<Record<string, { qty?: string; request_qty?: string; price?: string; date?: string }>>({});
  /** Materials master list for name lookup when row lacks nested material name */
  const [materialsMaster, setMaterialsMaster] = useState<any[]>([]);
  /** PDF URL from generate-pdf API (doc step) */
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'create' && !pid) {
      toast.showWarning('Project is required. Please select a project from the RFQ list.');
      router.push('/inventory-reports/rfq');
      return;
    }
  }, [mode, pid, router, toast]);

  useEffect(() => {
    if (mode === 'edit' && editId) {
      setIsLoading(true);
      const hasUrlMrParams = Boolean(urlMrId || urlMrRequestNo);
      const projectsIdForEdit = getProjectsIdForApi() ?? pid ?? projectNumericId;
      rfqAPI.get(editId, projectsIdForEdit ?? undefined).then((data) => {
        setRfqData(data);
        // quote-details-edit: projects_id can be at data.projects_id OR data.data.material_requests.projects_id
        const projId = data?.projects_id ?? data?.data?.projects_id ?? data?.data?.material_requests?.projects_id;
        const projectIdVal = typeof projId === 'object' ? (projId?.id ?? projId?.uuid) : projId;
        const projectNameVal = typeof projId === 'object' ? (projId?.project_name ?? projId?.name) : (data?.project_name ?? data?.data?.material_requests?.projects_id?.project_name ?? 'Project');
        // Never use editId (quotesId) as project id — use projects_id from response or URL params only
        const resolvedProjectId = projectIdVal ?? projectsIdForEdit ?? pid ?? projectNumericId ?? '';
        setProject({
          id: String(resolvedProjectId),
          name: projectNameVal || 'Project'
        });
        if (!hasUrlMrParams) {
          // quote-details-edit returns material_requests nested: data.data.material_requests or data.material_requests
          const mrObj = data?.data?.material_requests ?? data?.material_requests;
          const mrIdRaw = (typeof mrObj === 'object' && mrObj != null ? (mrObj as any)?.id : undefined)
            ?? data?.material_requests_id ?? data?.material_request_id
            ?? data?.data?.material_requests_id ?? data?.data?.material_request_id
            ?? (Array.isArray(data?.quotesdetails) && (data.quotesdetails as any[])[0] ? ((data.quotesdetails as any[])[0].material_requests_id ?? (data.quotesdetails as any[])[0].material_request_id) : undefined)
            ?? (Array.isArray(data?.quotes_details) && (data.quotes_details as any[])[0] ? ((data.quotes_details as any[])[0].material_requests_id ?? (data.quotes_details as any[])[0].material_request_id) : undefined);
          const mrRequestNo = (typeof mrObj === 'object' && mrObj != null ? (mrObj as any)?.request_no : undefined)
            ?? data?.data?.request_no ?? data?.request_no ?? null;
          setSelectedMrId(mrIdRaw != null && mrIdRaw !== '' ? String(mrIdRaw) : null);
          setSelectedMrRequestNo(mrRequestNo != null && mrRequestNo !== '' ? String(mrRequestNo) : null);
        }
        setMessage(data?.message ?? data?.remarkes ?? data?.data?.remarkes ?? '');
        // quote-details-edit returns img at data.data.img (nested), or data.img; also support image_url
        const imgUrl = data?.image_url ?? data?.data?.img ?? data?.img ?? null;
        setQuoteImage(imgUrl ? String(imgUrl).trim() : null);
      }).catch(() => {
        toast.showWarning('Failed to load RFQ. Redirecting...');
        router.push('/inventory-reports/rfq');
      }).finally(() => setIsLoading(false));
    } else if (mode === 'create' && pid) {
      setProject(prev => prev ?? { id: pid, name: projectName ?? 'Project' });
      // Skip getProject to avoid backend "Attempt to read property id on null" when project lookup fails
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [mode, editId, pid, projectName, projectNumericId, urlMrId, urlMrRequestNo]);

  /** Fetch MR list with request_no from quote-details-edit when in edit mode; preselect matching MR from response */
  useEffect(() => {
    const mrObjForProject = rfqData?.data?.material_requests ?? rfqData?.material_requests;
    const projectIdFromRfq = typeof mrObjForProject?.projects_id === 'object'
      ? (mrObjForProject?.projects_id as any)?.id ?? (mrObjForProject?.projects_id as any)?.uuid
      : mrObjForProject?.projects_id;
    const projectIdToUse = getProjectsIdForApi() ?? pid ?? (mode === 'edit' && project?.id) ?? (mode === 'edit' && projectIdFromRfq != null && projectIdFromRfq !== '' ? String(projectIdFromRfq) : undefined) ?? undefined;
    if (!projectIdToUse || String(projectIdToUse).trim() === '') return;
    const mrObj = rfqData?.data?.material_requests ?? rfqData?.material_requests;
    const requestNoToPass = typeof mrObj === 'object' && mrObj != null ? (mrObj as any)?.request_no : null;
    const mrIdFromRfq = typeof mrObj === 'object' && mrObj != null ? (mrObj as any)?.id : null;
    const filters: { projectId: string | number; subprojectId?: string | number; request_no?: string } = { projectId: projectIdToUse };
    if (mode === 'edit' && requestNoToPass && String(requestNoToPass).trim()) {
      filters.request_no = String(requestNoToPass).trim();
    }
    materialRequestAPI.list(filters).then((list) => {
      setMaterialRequests(list);
      if (mode === 'edit' && !urlMrId && !urlMrRequestNo) {
        // Prefer match by request_no (e.g. "263618"); fallback to match by id (e.g. 90)
        let matched = requestNoToPass
          ? list.find((mr: any) => String(mr?.request_no ?? '') === String(requestNoToPass))
          : null;
        if (!matched && mrIdFromRfq != null) {
          matched = list.find((mr: any) => String(mr?.id ?? mr?.uuid ?? '') === String(mrIdFromRfq));
        }
        if (matched) {
          setSelectedMrId(String(matched.id ?? matched.uuid ?? ''));
          setSelectedMrRequestNo(String(matched.request_no ?? requestNoToPass ?? ''));
        }
      } else if (urlMrRequestNo && !urlMrId) {
        // URL has mrRequestNo only (e.g. ?mrRequestNo=263618) - preselect MR by request_no
        const matched = list.find((mr: any) => String(mr?.request_no ?? '') === String(urlMrRequestNo));
        if (matched) {
          setSelectedMrId(String(matched.id ?? matched.uuid ?? ''));
          setSelectedMrRequestNo(String(matched.request_no ?? urlMrRequestNo ?? ''));
        }
      } else if (urlMrId) {
        // URL has mrId - sync to list's id format so modal isSelected matches (handles UUID vs numeric id)
        const matched = list.find((mr: any) => String(mr?.id ?? mr?.uuid ?? '') === String(urlMrId));
        if (matched) {
          setSelectedMrId(String(matched.id ?? matched.uuid ?? ''));
          setSelectedMrRequestNo((prev) => prev ?? String(matched.request_no ?? ''));
        }
      }
    }).catch(() => setMaterialRequests([]));
    rfqAPI.projectToStoreList(projectIdToUse, 'quotes', editId ?? rfqId ?? undefined).catch(() => null);
  }, [pid, mode, project?.id, projectNumericId, editId, rfqId, rfqData, urlMrId, urlMrRequestNo]);

  useEffect(() => {
    if (step === 'quotesDetails' && (selectedMrId || selectedMrRequestNo || urlMrId || urlMrRequestNo || rfqId || editId)) {
      const mrId = selectedMrId ?? urlMrId;
      const isEditMode = Boolean(editId || rfqId);
      // API expects request_no = material request id (e.g. 90), not request_no string (e.g. "263618")
      const projectIdForApi = getProjectsIdForApi() ?? undefined;
      const loadMaterialsFromMr = (requestId?: string | null) => {
        const id = requestId ?? mrId;
        if (!id) return;
        rfqAPI.getMaterialsByRequestNo(id, id, projectIdForApi).then((data) => {
          const arr = Array.isArray(data) ? data : [];
          if (arr.length === 0) {
            materialRequestAPI.edit(id, projectIdForApi ?? undefined).then((edit: any) => {
              const details = Array.isArray(edit) ? edit
                : Array.isArray(edit?.data) ? edit.data
                : Array.isArray(edit?.details) ? edit.details
                : Array.isArray(edit?.material_request_details) ? edit.material_request_details
                : Array.isArray(edit?.materialsRequestDetails) ? edit.materialsRequestDetails
                : Array.isArray(edit?.materials) ? edit.materials
                : [];
              setQuoteDetails(details);
            }).catch(() => setQuoteDetails([]));
          } else {
            setQuoteDetails(arr);
          }
        }).catch(() => {
          if (id) materialRequestAPI.edit(id, projectIdForApi ?? undefined).then((edit: any) => {
            const details = Array.isArray(edit) ? edit
              : Array.isArray(edit?.data) ? edit.data
              : Array.isArray(edit?.details) ? edit.details
              : Array.isArray(edit?.material_request_details) ? edit.material_request_details
              : Array.isArray(edit?.materialsRequestDetails) ? edit.materialsRequestDetails
              : Array.isArray(edit?.materials) ? edit.materials
              : [];
            setQuoteDetails(details);
          }).catch(() => setQuoteDetails([]));
          else setQuoteDetails([]);
        });
      };
      if (isEditMode) {
        const id = editId ?? rfqId;
        const projectsId = getProjectsIdForApi();
        if (id) {
          const effectiveMrId = mrId;
          // Load both existing quote details and MR materials, then merge so same MR updates instead of appends
          Promise.all([
            rfqAPI.getQuoteDetails(id, projectsId ?? undefined),
            effectiveMrId
              ? rfqAPI.getMaterialsByRequestNo(effectiveMrId, effectiveMrId, projectIdForApi).catch(() => [])
              : Promise.resolve([]),
          ]).then(([detailsResp, mrMaterials]) => {
            const existingDetails = Array.isArray(detailsResp) ? detailsResp : [];
            const mrMat = Array.isArray(mrMaterials) ? mrMaterials : [];
            const derivedMrId = (existingDetails[0] as any)?.material_requests_id ?? (existingDetails[0] as any)?.material_request_id;
            const resolvedMrId = effectiveMrId ?? (derivedMrId != null && derivedMrId !== '' ? String(derivedMrId) : null);
            setSelectedMrId((prev) => prev ?? resolvedMrId);

            if (!resolvedMrId) {
              setQuoteDetails(existingDetails.length > 0 ? existingDetails : []);
              return;
            }
            const existingForMr = existingDetails.filter((d: any) => String(d?.material_requests_id ?? d?.material_request_id ?? '') === String(resolvedMrId));
            if (mrMat.length === 0) {
              materialRequestAPI.edit(resolvedMrId, projectIdForApi ?? undefined).then((edit: any) => {
                const fallback = Array.isArray(edit) ? edit
                  : Array.isArray(edit?.data) ? edit.data
                  : Array.isArray(edit?.details) ? edit.details
                  : Array.isArray(edit?.material_request_details) ? edit.material_request_details
                  : Array.isArray(edit?.materialsRequestDetails) ? edit.materialsRequestDetails
                  : Array.isArray(edit?.materials) ? edit.materials
                  : [];
                if (fallback.length > 0) {
                  const merged = fallback.map((mat: any) => {
                    const matId = mat?.materials_id ?? mat?.materials?.id ?? mat?.material_id ?? mat?.id;
                    const detailId = mat?.material_request_details_id ?? mat?.material_request_detail_id ?? mat?.id;
                    const match = existingForMr.find((e: any) => {
                      const eMat = e?.materials_id ?? e?.materials?.id ?? e?.material_id;
                      const eDetail = e?.material_request_details_id ?? e?.material_request_detail_id;
                      return (matId != null && String(eMat) === String(matId)) || (detailId != null && String(eDetail) === String(detailId));
                    });
                    if (match) {
                      return { ...mat, ...match, id: match.id ?? match.quort_details_id ?? match.quotes_details_id, quort_details_id: match.quort_details_id ?? match.id, quotes_details_id: match.quotes_details_id ?? match.id };
                    }
                    return mat;
                  });
                  setQuoteDetails(merged);
                } else {
                  setQuoteDetails(existingForMr.length > 0 ? existingForMr : []);
                }
              }).catch(() => setQuoteDetails(existingForMr.length > 0 ? existingForMr : []));
              return;
            }
            // Merge MR materials with existing quote details (preserve ids for update)
            const merged = mrMat.map((mat: any) => {
              const matId = mat?.materials_id ?? mat?.materials?.id ?? mat?.material_id ?? mat?.id;
              const detailId = mat?.material_request_details_id ?? mat?.material_request_detail_id ?? mat?.id;
              const match = existingForMr.find((e: any) => {
                const eMat = e?.materials_id ?? e?.materials?.id ?? e?.material_id;
                const eDetail = e?.material_request_details_id ?? e?.material_request_detail_id;
                return (matId != null && String(eMat) === String(matId)) || (detailId != null && String(eDetail) === String(detailId));
              });
              if (match) {
                return { ...mat, ...match, id: match.id ?? match.quort_details_id ?? match.quotes_details_id, quort_details_id: match.quort_details_id ?? match.id, quotes_details_id: match.quotes_details_id ?? match.id };
              }
              return mat;
            });
            setQuoteDetails(merged);
          }).catch(() => {
            if (mrId) loadMaterialsFromMr();
            else setQuoteDetails([]);
          });
        } else if (mrId) {
          loadMaterialsFromMr();
        }
      } else if (mrId) {
        rfqAPI.getMaterialsByRequestNo(mrId, mrId, projectIdForApi).then((data) => {
          const arr = Array.isArray(data) ? data : [];
          if (arr.length === 0 && mrId) {
            materialRequestAPI.edit(mrId, projectIdForApi ?? undefined).then((edit: any) => {
              const details = Array.isArray(edit) ? edit
                : Array.isArray(edit?.data) ? edit.data
                : Array.isArray(edit?.details) ? edit.details
                : Array.isArray(edit?.material_request_details) ? edit.material_request_details
                : Array.isArray(edit?.materialsRequestDetails) ? edit.materialsRequestDetails
                : Array.isArray(edit?.materials) ? edit.materials
                : [];
              setQuoteDetails(details);
            }).catch(() => setQuoteDetails([]));
          } else {
            setQuoteDetails(arr);
          }
        }).catch(() => {
          if (mrId) materialRequestAPI.edit(mrId, projectIdForApi ?? undefined).then((edit: any) => {
            const details = Array.isArray(edit) ? edit
              : Array.isArray(edit?.data) ? edit.data
              : Array.isArray(edit?.details) ? edit.details
              : Array.isArray(edit?.material_request_details) ? edit.material_request_details
              : Array.isArray(edit?.materialsRequestDetails) ? edit.materialsRequestDetails
              : Array.isArray(edit?.materials) ? edit.materials
              : [];
            setQuoteDetails(details);
          }).catch(() => setQuoteDetails([]));
          else setQuoteDetails([]);
        });
      }
    }
    if (step === 'vendorList' && (editId || rfqId)) {
      const projectsId = getProjectsIdForApi();
      rfqAPI.getQuoteDetails(editId ?? rfqId!, projectsId ?? undefined).then(setQuoteDetails).catch(() => setQuoteDetails([]));
    }
    if (step === 'quotesDetails') {
      masterDataAPI.getMaterials().then((m) => setMaterialsMaster(Array.isArray(m) ? m : [])).catch(() => setMaterialsMaster([]));
    }
  }, [step, selectedMrId, selectedMrRequestNo, urlMrRequestNo, urlMrId, rfqId, editId, mode]);

  useEffect(() => {
    if (step === 'vendorList') {
      rfqAPI.getVendors(editId ?? rfqId!).then((v: any) => setVendors(Array.isArray(v) ? v : [])).catch(() => setVendors([]));
    }
  }, [step, rfqId, editId]);

  const handleSaveAndContinue = async (nextStep: RfqStep) => {
    if (!project) return;
    const projectsIdForApi = getProjectsIdForApi();
    if (!projectsIdForApi) {
      toast.showWarning('Project numeric ID is required. Please select a project from the RFQ list.');
      return;
    }
    setIsSubmitting(true);
    try {
      let newId: number | string | undefined;
      if (mode === 'edit' && editId) {
        newId = editId;
        setStep(nextStep);
      } else {
        const payload: any = {
          projects_id: projectsIdForApi,
          material_request_id: selectedMrId || undefined,
          message: message || undefined,
          image_url: quoteImage || undefined
        };
        const saved = await rfqAPI.save(payload);
        newId = saved?.id ?? saved?.uuid ?? saved?.data?.id ?? saved?.data?.uuid ?? editId;
        if (mode === 'create' && newId) {
          const params = new URLSearchParams();
          params.set('step', nextStep);
          if (pid) params.set('projectId', pid);
          if (projectNumericId) params.set('projectNumericId', projectNumericId);
          if (selectedMrId) params.set('mrId', selectedMrId);
          if (selectedMrRequestNo) params.set('mrRequestNo', selectedMrRequestNo);
          router.replace(`/inventory-reports/rfq/${newId}/submit-quotes?${params.toString()}`);
          return;
        }
        setStep(nextStep);
      }
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuotesDetailsContinue = async () => {
    const id = editId ?? rfqId;
    const projectsIdForApi = getProjectsIdForApi();
    if (!id || !projectsIdForApi || !selectedMrId) {
      toast.showWarning('Missing quote or project. Go back and try again.');
      return;
    }
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = quoteDetails.map((row: any, i: number) => {
        const key = String(row.id ?? row.materials?.id ?? row.material_id ?? row.material_request_details_id ?? i);
        const edits = materialsEdits[key] ?? {};
        const materialsId = row.materials?.id ?? row.material?.id ?? row.material_id ?? row.materials_id;
        const detailId = row.material_request_details_id ?? row.material_request_detail_id ?? row.materials_request_details_id ?? row.id;
        // Pass QuotesDetails id for updates so backend updates instead of creates. Backend QuotesMaterialsDetailsresources uses quort_details_id (typo); avoid row.id (may be material_requests_id).
        const existingQuoteDetailId = row.quort_details_id ?? row.quotes_details_id ?? row.quotes_detail_id ?? (row.quotes_id != null ? row.id : null);
        const quoteDetailId = existingQuoteDetailId != null && existingQuoteDetailId !== '' ? (Number(existingQuoteDetailId) || existingQuoteDetailId) : '';
        const item: Record<string, any> = {
          id: quoteDetailId,
          projects_id: Number(projectsIdForApi) || projectsIdForApi,
          quotes_id: Number(id) || id,
          materials: materialsId != null ? (Number(materialsId) || materialsId) : undefined,
          qty: edits.qty ?? row.qty ?? row.quantity ?? row.Quantity ?? '0',
          request_qty: edits.request_qty ?? row.request_qty ?? row.request_quantity ?? row.qty ?? row.quantity ?? '0',
          price: edits.price ?? row.price ?? row.unit_price ?? '0',
          material_request_details_id: detailId != null && detailId !== '' ? (Number(detailId) || detailId) : undefined,
          date: (() => {
            const d = edits.date ?? row.date ?? row.required_date ?? row.requiredDate ?? today;
            return typeof d === 'string' && d.includes('T') ? d.split('T')[0] : d || today;
          })(),
          material_requests_id: Number(selectedMrId) || selectedMrId,
        };
        Object.keys(item).forEach(k => { if (item[k] === undefined) delete item[k]; });
        return item;
      });
      const validPayload = payload.filter((p) => p.materials != null);
      if (validPayload.length === 0) {
        toast.showWarning('No valid material data. Each row must have a material.');
        setIsSubmitting(false);
        return;
      }
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[SubmitQuotes] quote-details-add payload:', JSON.stringify(validPayload, null, 2));
      }
      const result = await rfqAPI.quoteDetailsAdd(validPayload as Parameters<typeof rfqAPI.quoteDetailsAdd>[0]);
      const created = Array.isArray(result) ? result : result?.data ?? (result ? [result] : []);
      const ids = created.map((r: any) => r.id ?? r.uuid).filter(Boolean);
      setQuotesDetailsIds(ids);
      // Merge created ids back into quoteDetails so edits on re-submit update instead of create
      if (created.length > 0 && created.length === validPayload.length) {
        const quoteDetailIdFromCreated = (r: any) => r?.id ?? r?.uuid ?? r?.quort_details_id ?? r?.quotes_details_id;
        setQuoteDetails((prev) =>
          prev.map((row: any, i: number) => {
            const createdRow = created[i];
            const newId = quoteDetailIdFromCreated(createdRow);
            if (createdRow && newId) {
              return { ...row, id: newId, quort_details_id: newId, quotes_details_id: newId, quotes_id: row.quotes_id ?? id };
            }
            return row;
          })
        );
      }
      setStep('vendorList');
    } catch (e: any) {
      const res = e?.response?.data;
      const msg = res?.message ?? res?.error ?? e?.message ?? 'Failed to add quote details.';
      const errs = res?.errors;
      const detail = errs && typeof errs === 'object' ? Object.entries(errs).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' ') : '';
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('[SubmitQuotes] quote-details-add error:', { response: res, fullError: e });
      }
      toast.showWarning(detail ? `${msg} ${detail}` : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMrAndSubmit = () => {
    if (!selectedMrId) {
      toast.showWarning('Please select a Material Request.');
      return;
    }
    setShowMrSelectModal(false);
    setRfqPathType(0);
    if (step === 'quotesDetails' && (rfqId || editId)) {
      return;
    }
    handleSaveAndContinue('quotesDetails');
  };

  const handleImageAndSend = async () => {
    if (!quoteImage) {
      toast.showWarning('Please upload an image for the quote request.');
      return;
    }
    const projectsIdForApi = getProjectsIdForApi();
    if (!project || !projectsIdForApi) {
      toast.showWarning('Project numeric ID is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      let quoteId: string | number;
      let existingImageDetailId: string | number | null = null;
      if (mode === 'edit' && editId) {
        quoteId = editId;
        existingImageDetailId = rfqData?.data?.id ?? rfqData?.data?.quort_details_id ?? rfqData?.data?.quotes_details_id ?? null;
      } else {
        const saved = await rfqAPI.save({ projects_id: projectsIdForApi });
        quoteId = saved?.id ?? saved?.uuid;
        if (!quoteId) throw new Error('No quote ID returned');
      }
      const fd = new FormData();
      fd.append('id', existingImageDetailId != null && existingImageDetailId !== '' ? String(existingImageDetailId) : '');
      fd.append('projects_id', String(projectsIdForApi));
      fd.append('quotes_id', String(quoteId));
      fd.append('request_no', String(selectedMrRequestNo ?? selectedMrId ?? ''));
      fd.append('date', new Date().toISOString().split('T')[0]);
      fd.append('remarkes', message || '');
      if (quoteImage && quoteImage.startsWith('data:')) {
        const res = await fetch(quoteImage);
        const blob = await res.blob();
        const ext = quoteImage.includes('jpeg') || quoteImage.includes('jpg') ? 'jpg' : quoteImage.includes('webp') ? 'webp' : quoteImage.includes('gif') ? 'gif' : 'png';
        fd.append('img', blob, `quote.${ext}`);
      }
      await rfqAPI.quoteDetailsAdd(fd);
      setRfqPathType(1);
      const params = new URLSearchParams();
      params.set('step', 'vendorList');
      if (pid) params.set('projectId', pid);
      if (projectNumericId) params.set('projectNumericId', projectNumericId);
      router.replace(`/inventory-reports/rfq/${quoteId}/submit-quotes?${params.toString()}`);
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToVendors = async () => {
    const ids = Array.from(selectedVendorIds);
    if (ids.length === 0) {
      toast.showWarning('Please select at least one vendor.');
      return;
    }
    const id = editId ?? rfqId;
    if (!id) {
      toast.showWarning('RFQ must be saved first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const opts = rfqPathType === 0 && quotesDetailsIds.length > 0 && selectedMrId
        ? {
            type: 0 as const,
            quotesDetailsId: quotesDetailsIds,
            materialRequestDetailsId: quoteDetails.map((r: any) => r.material_request_details_id ?? r.id).filter(Boolean),
            materialRequestsId: [selectedMrId],
            materialsId: quoteDetails.map((r: any) => r.materials?.id ?? r.material_id ?? r.id).filter(Boolean),
          }
        : { type: 1 as const };
      await rfqAPI.sendToVendors(id, ids, opts);
      toast.showSuccess('Quote sent to vendors.');
      try {
        const { pdf_url } = await generatePdfWithDetails(id);
        const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
        setPdfUrl(fullUrl);
      } catch {
        setPdfUrl(null);
      }
      setStep('doc');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to send to vendors.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullPdfUrl = (url: string) => {
    if (!url) return '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
    return url.startsWith('http') ? url : apiBase.replace(/\/api\/?$/, '') + (url.startsWith('/') ? url : '/' + url);
  };

  /** Build quotes_details with material info for PDF (Code, Name, Specification, Units) when backend returns materials: null */
  const buildQuotesDetailsForPdf = (details: any[], materialsLookup: any[]) => {
    return details.map((row: any) => {
      const matId = row.materials?.id ?? row.materials_id ?? row.material_id ?? row.material?.id;
      const materials = row.materials ?? row.materials_request_details?.materials ?? row.material;
      const matched = matId != null && materialsLookup.length > 0
        ? materialsLookup.find((m: any) => String(m.id ?? m.uuid ?? m.materials_id) === String(matId))
        : null;
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

  const generatePdfWithDetails = async (id: string) => {
    const projectsId = getProjectsIdForApi();
    const [quoteData, mats] = await Promise.all([
      rfqAPI.get(id, projectsId ?? undefined),
      materialsMaster.length > 0 ? Promise.resolve(materialsMaster) : masterDataAPI.getMaterials().then((m: any[]) => Array.isArray(m) ? m : []),
    ]);
    const details = quoteData?.quotesdetails ?? quoteData?.quotes_details ?? quoteData?.details ?? quoteData?.quote_details ?? (Array.isArray(quoteData) ? quoteData : []);
    const arr = Array.isArray(details) ? details : [];
    const materialsLookup = Array.isArray(mats) ? mats : [];
    const quotesDetailsForPdf = arr.length > 0 ? buildQuotesDetailsForPdf(arr, materialsLookup) : undefined;
    return rfqAPI.generatePdf(id, quotesDetailsForPdf);
  };

  const handleGeneratePdf = async () => {
    const id = editId ?? rfqId;
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { pdf_url } = await generatePdfWithDetails(String(id));
      const fullUrl = pdf_url ? getFullPdfUrl(pdf_url) : '';
      setPdfUrl(fullUrl);
      if (fullUrl) window.open(fullUrl, '_blank');
      toast.showSuccess(fullUrl ? 'PDF generated. You can View or Share below.' : 'PDF generated.');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to generate PDF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPdf = () => {
    if (pdfUrl) window.open(pdfUrl, '_blank');
    else toast.showWarning('PDF not ready. Please try again.');
  };

  const handleSharePdf = async () => {
    let urlToShare = pdfUrl;
    if (!urlToShare) {
      const id = editId ?? rfqId;
      if (!id) {
        toast.showWarning('RFQ not found.');
        return;
      }
      setIsSubmitting(true);
      try {
        const { pdf_url } = await generatePdfWithDetails(String(id));
        urlToShare = pdf_url ? getFullPdfUrl(pdf_url) : '';
        if (urlToShare) setPdfUrl(urlToShare);
      } catch (e: any) {
        toast.showWarning(e?.message ?? 'Failed to generate share link.');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }
    if (!urlToShare) {
      toast.showWarning('Could not generate share link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(urlToShare);
      toast.showSuccess('Link copied to clipboard.');
    } catch {
      toast.showWarning('Could not copy to clipboard.');
    }
  };

  const toggleVendor = (id: string) => {
    setSelectedVendorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            onClick={() => router.push('/inventory-reports/rfq')}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-black ${textPrimary}`}>Submit Quotes</h1>
            <p className={`text-sm ${textSecondary}`}>
              {mode === 'edit' ? 'Edit RFQ and continue flow' : 'Create new RFQ'}
              {project && ` • ${project.name}`}
            </p>
          </div>
        </div>

        {/* Step: Submit (main form) */}
        {step === 'submit' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Project & Quote Info</h2>
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <Building2 className={`w-8 h-8 ${textSecondary}`} />
                <div>
                  <p className={`font-bold ${textPrimary}`}>{project?.name ?? 'Project'}</p>
                  <p className={`text-sm ${textSecondary}`}>Project ID: {project?.id ?? pid}</p>
                </div>
              </div>
            </div>

            <p className={`text-sm font-medium mb-4 ${textSecondary}`}>Choose one: select a material request or upload an image</p>

            {/* Material Request */}
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Material Request</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMrSelectModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${selectedMrId ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/5'}`}
                >
                  <FileText className="w-4 h-4" />
                  {selectedMrId ? `MR #${selectedMrId}` : 'Select MR'}
                </button>
                {selectedMrId && (
                  <button
                    onClick={() => { setSelectedMrId(null); setSelectedMrRequestNo(null); }}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className={`text-center text-sm font-bold my-4 ${textSecondary}`}>— or —</p>

            {/* Image upload */}
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Image</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    if (result) { setQuoteImage(result); setSelectedMrId(null); setSelectedMrRequestNo(null); }
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
              {quoteImage ? (
                <div className={`relative rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <img src={quoteImage} alt="Quote" className="w-full max-h-64 object-contain bg-slate-900/30" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className={`p-2 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQuoteImage(null); }}
                      className="p-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && imageInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDark ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
                >
                  <ImageIcon className={`w-12 h-12 mx-auto mb-2 ${textSecondary} opacity-50`} />
                  <p className={`text-sm ${textSecondary}`}>Click to upload image for quote request</p>
                  <p className={`text-xs ${textSecondary} mt-1`}>JPEG, PNG, WebP, GIF</p>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message for vendors..."
                rows={3}
                className={`w-full rounded-lg border px-4 py-3 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (selectedMrId) handleSelectMrAndSubmit();
                  else if (quoteImage) handleImageAndSend();
                  else toast.showWarning('Please select a Material Request or upload an image.');
                }}
                disabled={(!selectedMrId && !quoteImage) || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${(selectedMrId || quoteImage) && !isSubmitting ? 'bg-[#6B8E23] text-white hover:bg-[#5a7a1e]' : 'bg-slate-400 text-white cursor-not-allowed'}`}
              >
                <ArrowRight className="w-4 h-4" /> Next
              </button>
            </div>
          </div>
        )}

        {/* Step: Quotes Details */}
        {step === 'quotesDetails' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Quote Details — Enter qty, request qty, price, date</h2>
            {mode !== 'edit' && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className={`text-sm font-medium ${textSecondary}`}>Material Request:</span>
                <button
                  onClick={() => setShowMrSelectModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${selectedMrId ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/5'}`}
                >
                  <FileText className="w-4 h-4" />
                  {selectedMrId ? `MR #${selectedMrId}${selectedMrRequestNo ? ` (${selectedMrRequestNo})` : ''}` : 'Select Material Request'}
                </button>
                {selectedMrId && (
                  <button
                    onClick={() => { setSelectedMrId(null); setSelectedMrRequestNo(null); setQuoteDetails([]); }}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    title="Change MR"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {materialRequests.length > 0 && !selectedMrId && (
                  <span className={`text-xs ${textSecondary}`}>({materialRequests.length} available)</span>
                )}
              </div>
            )}
            {quoteDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Material</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Qty</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Request Qty</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Price</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteDetails.map((row: any, i: number) => {
                      const key = String(row.id ?? row.materials?.id ?? row.material_id ?? row.material_request_details_id ?? i);
                      const edits = materialsEdits[key] ?? {};
                      const today = new Date().toISOString().split('T')[0];
                      const rowDate = row.date ?? row.required_date ?? row.requiredDate ?? today;
                      const dateVal = (typeof rowDate === 'string' && rowDate.includes('T')) ? rowDate.split('T')[0] : rowDate || today;
                      const rowName = row.materials?.name ?? row.material?.name ?? row.name ?? row.material_name ?? row.materials_name ?? row.materials?.material_name ?? row.material?.material_name;
                      const matId = row.materials?.id ?? row.material_id ?? row.materials_id ?? row.material?.id;
                      const matchedMat = matId != null && materialsMaster.length > 0 ? materialsMaster.find((m: any) => String(m.id ?? m.uuid) === String(matId)) : null;
                      const lookupName = matchedMat ? ((matchedMat as any)?.name ?? (matchedMat as any)?.material_name) : null;
                      const materialName = rowName || lookupName || '-';
                      return (
                        <tr key={i} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                          <td className={`px-4 py-3 text-sm ${textPrimary}`}>{materialName}</td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={String(edits.qty ?? row.qty ?? row.quantity ?? row.Quantity ?? '')}
                              onChange={(e) => setMaterialsEdits(prev => ({ ...prev, [key]: { ...prev[key], qty: e.target.value } }))}
                              placeholder="Qty"
                              className={`w-20 min-w-[4rem] rounded border px-2 py-1 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={String(edits.request_qty ?? row.request_qty ?? row.request_quantity ?? row.qty ?? row.quantity ?? row.Quantity ?? '')}
                              onChange={(e) => setMaterialsEdits(prev => ({ ...prev, [key]: { ...prev[key], request_qty: e.target.value } }))}
                              placeholder="Request Qty"
                              className={`w-24 min-w-[5rem] rounded border px-2 py-1 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={String(edits.price ?? row.price ?? row.unit_price ?? row.UnitPrice ?? '')}
                              onChange={(e) => setMaterialsEdits(prev => ({ ...prev, [key]: { ...prev[key], price: e.target.value } }))}
                              placeholder="Price"
                              className={`w-24 min-w-[5rem] rounded border px-2 py-1 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={edits.date ?? dateVal ?? today}
                              onChange={(e) => setMaterialsEdits(prev => ({ ...prev, [key]: { ...prev[key], date: e.target.value } }))}
                              className={`w-36 min-w-[8rem] rounded border px-2 py-1 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`py-8 text-center ${textSecondary}`}>
                {mode !== 'edit' 
                  ? 'Select a Material Request above to load its materials, or go Back to choose from the previous step.' 
                  : 'No materials. Load materials from the selected Material Request.'}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('submit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleQuotesDetailsContinue}
                disabled={quoteDetails.length === 0 || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continue to Vendors
              </button>
            </div>
          </div>
        )}

        {/* Step: Vendor List */}
        {step === 'vendorList' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Send to Vendors</h2>
            {vendors.length > 0 ? (
              <div className="space-y-2">
                {vendors.map((v: any) => {
                  const id = String(v.id ?? v.uuid ?? '');
                  const checked = selectedVendorIds.has(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVendor(id)}
                        className="rounded border-[#6B8E23]"
                      />
                      <span className={`font-medium ${textPrimary}`}>{v.name ?? v.vendor_name ?? 'Vendor'}</span>
                      {(v.email ?? v.contact_person_email ?? v.contactPersonEmail) && (
                        <span className={`text-sm ${textSecondary}`}>
                          {v.email ?? v.contact_person_email ?? v.contactPersonEmail}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className={`py-8 text-center ${textSecondary}`}>No vendors found. Add vendors in Masters.</p>
            )}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => setStep(quoteDetails.length > 0 ? 'quotesDetails' : 'submit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSendToVendors}
                disabled={selectedVendorIds.size === 0 || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${selectedVendorIds.size > 0 && !isSubmitting ? 'bg-[#6B8E23] text-white hover:bg-[#5a7a1e]' : 'bg-slate-400 text-white cursor-not-allowed'}`}
                title="Send via backend (when available)"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to Vendors
              </button>
            </div>
          </div>
        )}

        {/* Step: Doc (PDF) - Success modal (same as PR) */}
        {step === 'doc' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md max-h-[85vh] my-auto overflow-hidden flex flex-col`}>
              <button
                onClick={() => router.push('/inventory-reports/rfq')}
                className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                title="Close"
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
              <div className="p-6 sm:p-8 flex flex-col items-center">
                <h2 className={`text-lg sm:text-xl font-black mb-2 ${textPrimary}`}>RFQ Created</h2>
                <p className={`text-sm ${textSecondary} mb-6`}>Your PDF is ready. View or share below.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleViewPdf}
                    disabled={!pdfUrl}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400 disabled:opacity-50 transition-colors"
                    title="View PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSharePdf}
                    disabled={isSubmitting || !pdfUrl}
                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400 disabled:opacity-50 transition-colors"
                    title="Share PDF (copy link)"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
                {!pdfUrl && (
                  <button
                    onClick={handleGeneratePdf}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mt-4 text-[#6B8E23] hover:bg-[#6B8E23]/10 disabled:opacity-70"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    Generate PDF
                  </button>
                )}
                <button
                  onClick={() => router.push('/inventory-reports/rfq')}
                  className="mt-8 flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]"
                >
                  Done — Back to List
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MR Select Modal */}
        {showMrSelectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${bgPrimary} rounded-xl border max-w-lg w-full p-6 ${cardClass}`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Select Material Request</h3>
              {materialRequests.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {materialRequests.map((mr: any) => {
                    const id = String(mr.id ?? mr.uuid ?? '');
                    const mrReqNo = String(mr?.request_no ?? '');
                    const isSelected = selectedMrId === id || (Boolean(selectedMrRequestNo && mrReqNo) && selectedMrRequestNo === mrReqNo);
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedMrId(id);
                          setSelectedMrRequestNo(mr.request_no ?? mr.request_id ?? id);
                          setQuoteImage(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border ${isSelected ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`font-medium ${textPrimary}`}>
                            {mr.request_no ?? `MR #${id}`}
                          </span>
                          {mr.date && (
                            <span className={`text-sm ${textSecondary}`}>{mr.date}</span>
                          )}
                          <span className={`text-sm ${textSecondary}`}>
                            • {mr.users?.name ?? mr.created_by ?? mr.user?.name ?? mr.users_id?.name ?? '-'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={`py-8 text-center ${textSecondary}`}>No material requests for this project.</p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMrSelectModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSelectMrAndSubmit}
                  disabled={!selectedMrId}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold ${selectedMrId ? 'bg-[#6B8E23] text-white' : 'bg-slate-400 text-white cursor-not-allowed'}`}
                >
                  {step === 'quotesDetails' && (rfqId || editId) ? 'Select & Load' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
