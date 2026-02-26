'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { X, Loader2, Upload, Download } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { masterDataAPI } from '@/services/api';
import * as XLSX from 'xlsx';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv';
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface ActivityBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projects: Array<{ id: number; uuid: string; project_name: string }>;
}

interface ActivityItem {
  id: string;
  numericId?: number;
  type?: string;
  name?: string;
  activities?: string;
  unit?: string;
  qty?: number;
  quantity?: number;
  rate?: number;
  amount?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
}

const ActivityBulkUploadModal: React.FC<ActivityBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  projects,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkProjectId, setBulkProjectId] = useState<string>('');
  const [bulkSubprojectId, setBulkSubprojectId] = useState<string>('');
  const [subprojects, setSubprojects] = useState<Array<{ id: number; uuid: string; name: string }>>([]);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const canOperate = !!bulkProjectId; // Subproject is optional

  // Fetch subprojects when project selected
  useEffect(() => {
    if (!bulkProjectId || !isOpen) {
      setSubprojects([]);
      setBulkSubprojectId('');
      return;
    }
    setIsLoadingSubprojects(true);
    const project = projects.find((p) => p.uuid === bulkProjectId || String(p.id) === bulkProjectId);
    const projectIdForApi = project?.id ?? bulkProjectId;
    masterDataAPI
      .getSubprojects(projectIdForApi)
      .then((result: any) => {
        const fetched = Array.isArray(result) ? result : result?.subProject || result?.data || [];
        setSubprojects(
          fetched.map((s: any) => ({
            id: s.id,
            uuid: s.uuid || String(s.id),
            name: s.name || '',
          }))
        );
        setBulkSubprojectId('');
      })
      .catch(() => setSubprojects([]))
      .finally(() => setIsLoadingSubprojects(false));
  }, [bulkProjectId, isOpen, projects]);

  const resetOnClose = () => {
    setBulkProjectId('');
    setBulkSubprojectId('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return 'Please upload Excel (.xlsx, .xls) or CSV file only.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File size must be under ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleExport = async () => {
    if (!canOperate || isExporting) return;
    setIsExporting(true);
    try {
      const project = projects.find((p) => p.uuid === bulkProjectId || String(p.id) === bulkProjectId);
      const subproject = bulkSubprojectId ? subprojects.find((s) => s.uuid === bulkSubprojectId || String(s.id) === bulkSubprojectId) : null;
      const projectIdNum = project?.id ?? bulkProjectId;
      const subprojectIdNum = subproject?.id ?? (bulkSubprojectId || undefined);

      const result = await masterDataAPI.getActivities(projectIdNum, subprojectIdNum);
      const data = result?.data ?? result ?? [];
      const activities: ActivityItem[] = Array.isArray(data)
        ? data.map((a: any) => ({
            id: a.uuid || String(a.id),
            numericId: a.id,
            type: a.type || '',
            name: a.activities || a.name || '',
            unit: a.units?.unit || a.unit?.unit || a.unit || '',
            qty: a.qty ?? a.quantity ?? 0,
            rate: a.rate ?? 0,
            amount: a.amount ?? 0,
            startDate: a.start_date || a.startDate || '',
            endDate: a.end_date || a.endDate || '',
          }))
        : [];

      const headers = ['Type', 'SL No', 'Activities', 'Units', 'Qty', 'Rate', 'Amount', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)', 'UUID'];
      const rows = activities.map((a, idx) => [
        (a.type || '').toLowerCase() === 'heading' ? 'heading' : 'activity',
        idx + 1,
        a.name || a.activities || '',
        a.unit || '',
        a.qty ?? '',
        a.rate ?? '',
        a.amount ?? '',
        a.startDate || '',
        a.endDate || '',
        a.id || '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Activities');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activities_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.showSuccess(`Exported ${activities.length} activities.`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to export activities.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!canOperate || !selectedFile || isImporting) return;
    const err = validateFile(selectedFile);
    if (err) {
      toast.showError(err);
      return;
    }
    setIsImporting(true);
    try {
      const project = projects.find((p) => p.uuid === bulkProjectId || String(p.id) === bulkProjectId);
      const subproject = bulkSubprojectId ? subprojects.find((s) => s.uuid === bulkSubprojectId || String(s.id) === bulkSubprojectId) : null;
      const projectIdNum = project?.id ?? bulkProjectId;
      const subprojectIdNum = subproject?.id ?? (bulkSubprojectId || undefined);

      const response = await masterDataAPI.importActivities(selectedFile, projectIdNum, subprojectIdNum);
      const data = response?.data ?? response;
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      const msg = data?.message ?? `${created} created, ${updated} updated.`;
      toast.showSuccess(msg);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to import activities.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <button
          onClick={resetOnClose}
          disabled={isExporting || isImporting}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-6 pr-14 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Activities</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Select project (subproject optional), then export or import activities data
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Project & Subproject */}
          <div className={`rounded-lg border p-4 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-bold ${textPrimary} mb-3`}>Select project (subproject optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>Project</label>
                <select
                  value={bulkProjectId}
                  onChange={(e) => {
                    setBulkProjectId(e.target.value);
                    setBulkSubprojectId('');
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-bold border ${
                    isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.uuid || String(p.id)}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>Subproject (optional)</label>
                {isLoadingSubprojects ? (
                  <div className={`px-3 py-2 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <select
                    value={bulkSubprojectId}
                    onChange={(e) => setBulkSubprojectId(e.target.value)}
                    disabled={!bulkProjectId}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-bold border ${
                      isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    <option value="">-- Select Subproject --</option>
                    {subprojects.map((s) => (
                      <option key={s.id} value={s.uuid || String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Export & Import buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              disabled={!canOperate || isExporting}
              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              } disabled:opacity-50 disabled:cursor-not-allowed border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>Export Activities Data</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canOperate || isImporting}
              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                isDark ? 'bg-[#C2D642]/20 hover:bg-[#C2D642]/30 text-[#C2D642]' : 'bg-[#C2D642]/10 hover:bg-[#C2D642]/20 text-[#8B9A30]'
              } disabled:opacity-50 disabled:cursor-not-allowed border ${isDark ? 'border-[#C2D642]/40' : 'border-[#C2D642]/30'}`}
            >
              {isImporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>Import Activities Data</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const err = validateFile(file);
                if (err) toast.showError(err);
                else setSelectedFile(file);
              }
              e.target.value = '';
            }}
          />

          {!canOperate && (
            <p className={`text-xs ${textSecondary} italic`}>
              Select a project to enable export and import. Subproject is optional.
            </p>
          )}

          {selectedFile && (
            <div className={`rounded-lg border p-4 ${isDark ? 'bg-slate-800/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-sm font-bold ${textPrimary} mb-2`}>Selected file for import</p>
              <p className={`text-xs ${textSecondary} mb-2`}>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload now
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={isImporting}
                  className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-900'} hover:opacity-90 disabled:opacity-50`}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className={`rounded-lg border p-4 ${isDark ? 'bg-slate-800/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs ${textSecondary}`}>
              <strong className={textPrimary}>Export:</strong> Downloads activities for the selected project/subproject in Excel format (Type, Activities, Units, Qty, Rate, Amount, Start Date, End Date, UUID). Use as reference or edit and re-import.
            </p>
            <p className={`text-xs ${textSecondary} mt-2`}>
              <strong className={textPrimary}>Import:</strong> Upload Excel (.xlsx, .xls) or CSV file. Max {MAX_SIZE_MB}MB. Backend POST /api/activities-import must be implemented.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityBulkUploadModal;
