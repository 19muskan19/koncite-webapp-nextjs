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
      rfqAPI.get(editId).then((data) => {
        setRfqData(data);
        const projId = data?.projects_id;
        const projectIdVal = typeof projId === 'object' ? (projId?.id ?? projId?.uuid) : projId;
        const projectNameVal = typeof projId === 'object' ? (projId?.project_name ?? projId?.name) : (data?.project_name ?? 'Project');
        setProject({
          id: String(projectIdVal ?? editId),
          name: projectNameVal || 'Project'
        });
        if (!hasUrlMrParams) {
          setSelectedMrId(data?.material_requests_id ? String(data.material_requests_id) : String(editId));
          setSelectedMrRequestNo(data?.request_no ?? null);
        }
        setMessage(data?.message ?? data?.remarkes ?? '');
        setQuoteImage(data?.image_url ?? null);
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
  }, [mode, editId, pid, projectName, urlMrId, urlMrRequestNo]);

  /** Fetch MR list + project context on SubmitQuotes load: materials-request-list, project-to-store-list */
  useEffect(() => {
    const projectIdToUse = getProjectsIdForApi() ?? pid ?? (mode === 'edit' && project?.id) ?? undefined;
    if (!projectIdToUse) return;
    materialRequestAPI.list({ projectId: projectIdToUse }).then(setMaterialRequests).catch(() => setMaterialRequests([]));
    rfqAPI.projectToStoreList(projectIdToUse, 'quote').catch(() => null);
  }, [pid, mode, project?.id, projectNumericId]);

  useEffect(() => {
    if (step === 'quotesDetails' && (selectedMrId || selectedMrRequestNo || urlMrId || urlMrRequestNo || rfqId || editId)) {
      const requestNo = selectedMrRequestNo ?? selectedMrId ?? urlMrRequestNo ?? urlMrId;
      const mrId = selectedMrId ?? urlMrId;
      if (requestNo || mrId) {
        rfqAPI.getMaterialsByRequestNo(requestNo ?? mrId!, mrId || undefined).then((data) => {
          const arr = Array.isArray(data) ? data : [];
          if (arr.length === 0 && mrId) {
            materialRequestAPI.edit(mrId).then((edit: any) => {
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
          if (mrId) materialRequestAPI.edit(mrId).then((edit: any) => {
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
      } else {
        const id = editId ?? rfqId;
        if (id) rfqAPI.getQuoteDetails(id).then(setQuoteDetails).catch(() => setQuoteDetails([]));
      }
    }
    if (step === 'vendorList' && (editId || rfqId)) {
      rfqAPI.getQuoteDetails(editId ?? rfqId!).then(setQuoteDetails).catch(() => setQuoteDetails([]));
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
      const payload: any = {
        projects_id: projectsIdForApi,
        material_request_id: selectedMrId || undefined,
        message: message || undefined,
        image_url: quoteImage || undefined
      };
      if (editId) payload.id = editId;
      const saved = await rfqAPI.save(payload);
      const newId = saved?.id ?? saved?.uuid ?? saved?.data?.id ?? saved?.data?.uuid ?? editId;
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
        const item: Record<string, any> = {
          id: '',
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
      const result = await rfqAPI.quoteDetailsAdd(validPayload);
      const created = Array.isArray(result) ? result : result?.data ?? (result ? [result] : []);
      const ids = created.map((r: any) => r.id ?? r.uuid).filter(Boolean);
      setQuotesDetailsIds(ids);
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
      const saved = await rfqAPI.save({ projects_id: projectsIdForApi });
      const newId = saved?.id ?? saved?.uuid;
      if (!newId) throw new Error('No quote ID returned');
      const fd = new FormData();
      fd.append('id', '');
      fd.append('projects_id', String(projectsIdForApi));
      fd.append('quotes_id', String(newId));
      fd.append('request_no', '201poiuytgfrds');
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
      router.replace(`/inventory-reports/rfq/${newId}/submit-quotes?${params.toString()}`);
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
        const { pdf_url } = await rfqAPI.generatePdf(id);
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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
    return url.startsWith('http') ? url : apiBase.replace(/\/api\/?$/, '') + (url.startsWith('/') ? url : '/' + url);
  };

  const handleGeneratePdf = async () => {
    const id = editId ?? rfqId;
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { pdf_url } = await rfqAPI.generatePdf(id);
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
        const { pdf_url } = await rfqAPI.generatePdf(id);
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
              <p className={`py-8 text-center ${textSecondary}`}>No materials. Load materials from the selected Material Request.</p>
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

        {/* Step: Doc (PDF) */}
        {step === 'doc' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Quote Document</h2>
            <div className={`p-8 rounded-lg text-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <FileText className={`w-16 h-16 mx-auto mb-4 ${textSecondary}`} />
              <p className={`mb-6 ${textSecondary}`}>
                {pdfUrl ? 'Your RFQ PDF is ready. View or share the link below.' : 'Quote sent to vendors. View or share the link below.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleViewPdf}
                  disabled={!pdfUrl}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 dark:text-blue-400 transition-colors disabled:opacity-70"
                  title="Open PDF in new tab"
                >
                  <Eye className="w-5 h-5" /> View
                </button>
                <button
                  onClick={handleSharePdf}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400 transition-colors disabled:opacity-70"
                  title="Copy share link to clipboard"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                  Share
                </button>
              </div>
              {!pdfUrl && (
                <button
                  onClick={handleGeneratePdf}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mt-4 mx-auto text-[#6B8E23] hover:bg-[#6B8E23]/10 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Generate PDF
                </button>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push('/inventory-reports/rfq')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold border-2 border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"
              >
                <ArrowLeft className="w-4 h-4" /> Back to RFQ List
              </button>
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
                    const isSelected = selectedMrId === id;
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
                        <span className={`font-medium ${textPrimary}`}>
                          {mr.request_no ?? mr.created_by ?? mr.date ?? `MR #${id}`}
                        </span>
                        {(mr.request_no || mr.created_by) && mr.date && (
                          <span className={`text-sm ${textSecondary} ml-2`}>{mr.date}</span>
                        )}
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
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
