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
  Download,
  Copy,
  Package,
  Loader2,
  X,
  Building2,
  Plus,
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

  const [project, setProject] = useState<{ id: string; name: string } | null>(
    projectId && projectName ? { id: projectId, name: projectName } : null
  );
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [selectedMrId, setSelectedMrId] = useState<string | null>(null);
  const [quoteImage, setQuoteImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [quoteDetails, setQuoteDetails] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMrSelectModal, setShowMrSelectModal] = useState(false);
  const [rfqData, setRfqData] = useState<any>(null);
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
      rfqAPI.get(editId).then((data) => {
        setRfqData(data);
        const projId = data?.projects_id;
        const projectIdVal = typeof projId === 'object' ? (projId?.id ?? projId?.uuid) : projId;
        const projectNameVal = typeof projId === 'object' ? (projId?.project_name ?? projId?.name) : (data?.project_name ?? 'Project');
        setProject({
          id: String(projectIdVal ?? editId),
          name: projectNameVal || 'Project'
        });
        setSelectedMrId(String(editId));
        setMessage(data?.message ?? '');
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
  }, [mode, editId, pid, projectName]);

  useEffect(() => {
    const projectIdToUse = pid || (mode === 'edit' && project?.id) || undefined;
    if (!projectIdToUse) return;
    materialRequestAPI.list({ projectId: projectIdToUse }).then(setMaterialRequests).catch(() => setMaterialRequests([]));
  }, [pid, mode, project?.id]);

  useEffect(() => {
    if ((step === 'quotesDetails' || step === 'vendorList') && (selectedMrId || rfqId || editId)) {
      const id = editId ?? rfqId;
      if (id) {
        rfqAPI.getQuoteDetails(id).then(setQuoteDetails).catch(() => setQuoteDetails([]));
      } else if (selectedMrId) {
        materialRequestAPI.edit(selectedMrId).then((edit: any) => {
          const details = Array.isArray(edit) ? edit : edit?.data ?? [];
          setQuoteDetails(details);
        }).catch(() => setQuoteDetails([]));
      }
    }
  }, [step, selectedMrId, rfqId, editId]);

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
        router.replace(`/inventory-reports/rfq/${newId}/submit-quotes?step=${nextStep}`);
        return;
      }
      setStep(nextStep);
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to save. Please try again.');
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
    handleSaveAndContinue('quotesDetails');
  };

  const handleImageAndSend = () => {
    if (!quoteImage && !message) {
      toast.showWarning('Please add an image or message for the quote request.');
      return;
    }
    handleSaveAndContinue('vendorList');
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
      await rfqAPI.sendToVendors(id, ids);
      toast.showSuccess('Quote sent to vendors.');
      setStep('doc');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to send to vendors.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    const id = editId ?? rfqId;
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { pdf_url } = await rfqAPI.generatePdf(id);
      window.open(pdf_url, '_blank');
      toast.showSuccess('PDF opened in new tab.');
    } catch (e: any) {
      toast.showWarning(e?.message ?? 'Failed to generate PDF.');
    } finally {
      setIsSubmitting(false);
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

  const getSelectedVendorEmails = (): string[] => {
    const ids = Array.from(selectedVendorIds);
    if (ids.length === 0) return [];
    const selectedVendors = vendors.filter((v: any) => ids.includes(String(v.id ?? v.uuid ?? '')));
    return selectedVendors
      .map((v: any) => (v.email ?? v.contact_person_email ?? v.contactPersonEmail ?? (v.contact?.email ?? '')).trim())
      .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  };

  const handleEmailToVendors = async () => {
    const ids = Array.from(selectedVendorIds);
    if (ids.length === 0) {
      toast.showWarning('Please select at least one vendor.');
      return;
    }
    const emails = getSelectedVendorEmails();
    if (emails.length === 0) {
      toast.showWarning('Selected vendors do not have valid email addresses. Add email in Masters > Vendors.');
      return;
    }
    const requestId = editId ?? rfqId;
    const emailBody = `Dear Vendor,\n\nPlease find our Request for Quotation attached.\n\nKindly submit your quote at your earliest convenience.\n\nBest regards`;

    if (requestId) {
      setIsSubmitting(true);
      try {
        const imageFilename = quoteImage
          ? `quote-image-${Date.now()}.${quoteImage.startsWith('data:image/jpeg') || quoteImage.startsWith('data:image/jpg') ? 'jpg' : quoteImage.startsWith('data:image/webp') ? 'webp' : quoteImage.startsWith('data:image/gif') ? 'gif' : 'png'}`
          : undefined;
        await rfqAPI.sendEmailToVendors(requestId, emails, emailBody, quoteImage || undefined, imageFilename);
        toast.showSuccess(`Email sent to ${emails.length} vendor(s).`);
        setStep('doc');
        return;
      } catch (e: any) {
        const is404 = e?.response?.status === 404;
        if (!is404) {
          toast.showWarning(e?.message ?? 'Failed to send email. Opening email client instead.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }

    const subject = `RFQ / Quote Request - ${project?.name ?? 'Project'}`;
    const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const a = document.createElement('a');
    a.href = mailto;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.showSuccess(`Opened email client for ${emails.length} vendor(s). Paste recipient if needed, attach PDF, and send.`);
    setStep('doc');
  };

  const handleCopyVendorEmails = () => {
    const emails = getSelectedVendorEmails();
    if (emails.length === 0) {
      toast.showWarning('Select vendors with valid emails first.');
      return;
    }
    const text = emails.join('; ');
    navigator.clipboard?.writeText(text).then(() => {
      toast.showSuccess(`Copied ${emails.length} email(s) to clipboard.`);
    }).catch(() => {
      toast.showWarning('Could not copy to clipboard.');
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

            {/* Material Request */}
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Material Request (Optional)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMrSelectModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${isDark ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/5'}`}
                >
                  <FileText className="w-4 h-4" />
                  {selectedMrId ? `MR #${selectedMrId}` : 'Select MR'}
                </button>
                {selectedMrId && (
                  <button
                    onClick={() => setSelectedMrId(null)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Image upload */}
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Image (Optional)</label>
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
                    if (result) setQuoteImage(result);
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
                      onClick={() => {
                        if (!quoteImage) return;
                        const ext = quoteImage.startsWith('data:image/jpeg') || quoteImage.startsWith('data:image/jpg') ? 'jpg' : quoteImage.startsWith('data:image/webp') ? 'webp' : quoteImage.startsWith('data:image/gif') ? 'gif' : 'png';
                        const a = document.createElement('a');
                        a.href = quoteImage;
                        a.download = `quote-image-${Date.now()}.${ext}`;
                        a.click();
                      }}
                      className={`p-2 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                      title="Download image to attach in email"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className={`p-2 rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteImage(null)}
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
                onClick={handleSelectMrAndSubmit}
                disabled={!selectedMrId || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${selectedMrId && !isSubmitting ? 'bg-[#6B8E23] text-white hover:bg-[#5a7a1e]' : 'bg-slate-400 text-white cursor-not-allowed'}`}
              >
                Select MR + Submit
              </button>
              <button
                onClick={handleImageAndSend}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold border-2 border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10"
              >
                <Send className="w-4 h-4" /> Image + Send for quote
              </button>
            </div>
          </div>
        )}

        {/* Step: Quotes Details */}
        {step === 'quotesDetails' && (
          <div className={`rounded-xl border p-6 ${cardClass}`}>
            <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Quote Details</h2>
            {quoteDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Material</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Qty</th>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${textSecondary}`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteDetails.map((row: any, i: number) => (
                      <tr key={i} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                        <td className={`px-4 py-3 text-sm ${textPrimary}`}>{row.materials?.name ?? row.material_name ?? '-'}</td>
                        <td className={`px-4 py-3 text-sm ${textPrimary}`}>{row.qty ?? row.quantity ?? '-'}</td>
                        <td className={`px-4 py-3 text-sm ${textPrimary}`}>{row.date ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`py-8 text-center ${textSecondary}`}>No quote details available.</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('submit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep('vendorList')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e]"
              >
                Continue to Vendors <ArrowRight className="w-4 h-4" />
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
                onClick={handleCopyVendorEmails}
                disabled={selectedVendorIds.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'}`}
                title="Copy selected vendor emails to clipboard"
              >
                <Copy className="w-4 h-4" /> Copy Emails
              </button>
              <button
                onClick={handleEmailToVendors}
                disabled={selectedVendorIds.size === 0 || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border-2 ${selectedVendorIds.size > 0 && !isSubmitting ? 'border-[#6B8E23] text-[#6B8E23] hover:bg-[#6B8E23]/10' : 'border-slate-400 text-slate-400 cursor-not-allowed'}`}
                title="Send email via backend, or open email client"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Email to Vendors
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
              <p className={`mb-4 ${textSecondary}`}>Generate and download the quote PDF.</p>
              <button
                onClick={handleGeneratePdf}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-[#6B8E23] text-white hover:bg-[#5a7a1e] mx-auto"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                Generate PDF
              </button>
            </div>
            <div className="mt-6">
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
                        onClick={() => setSelectedMrId(id)}
                        className={`w-full text-left p-3 rounded-lg border ${isSelected ? 'border-[#6B8E23] bg-[#6B8E23]/10' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                      >
                        <span className={`font-medium ${textPrimary}`}>{mr.request_no ?? mr.request_id ?? `MR #${id}`}</span>
                        <span className={`text-sm ${textSecondary} ml-2`}>{mr.date ?? ''}</span>
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
