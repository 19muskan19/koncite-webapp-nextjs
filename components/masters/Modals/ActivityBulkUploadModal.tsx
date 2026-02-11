'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import * as XLSX from 'xlsx';

interface ActivityBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projects?: Array<{ id: number; uuid: string; project_name: string }>;
  subprojects?: Array<{ id: number; uuid: string; name: string; project_id?: number }>;
  selectedProjectId?: string;
  selectedSubprojectId?: string;
}

const CSV_MIME = 'text/csv';
const EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (inQuotes) value += char;
    else if (char === ',' || char === '\t') { current.push(value.trim()); value = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      current.push(value.trim());
      value = '';
      if (current.some(c => c)) rows.push(current);
      current = [];
    } else value += char;
  }
  current.push(value.trim());
  if (current.some(c => c)) rows.push(current);
  return rows;
};

const ActivityBulkUploadModal: React.FC<ActivityBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  projects: propProjects = [],
  subprojects: propSubprojects = [],
  selectedProjectId = '',
  selectedSubprojectId = ''
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ success: 0, failed: 0, total: 0 });
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; uuid: string; project_name: string }>>(propProjects);
  const [units, setUnits] = useState<Array<{ id: number; unit: string }>>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        if (propProjects && propProjects.length > 0) {
          setProjects(propProjects);
        } else {
          try {
            const fetched = await masterDataAPI.getProjects();
            setProjects((fetched || []).map((p: any) => ({
              id: p.id,
              uuid: p.uuid || String(p.id),
              project_name: p.project_name || p.name || ''
            })));
          } catch {
            setProjects([]);
          }
        }
        try {
          const fetchedUnits = await masterDataAPI.getUnits();
          setUnits((fetchedUnits || []).map((u: any) => ({
            id: u.id,
            unit: (u.unit || u.name || '').toString().trim()
          })));
        } catch {
          setUnits([]);
        }
      };
      loadData();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setUploadProgress({ success: 0, failed: 0, total: 0 });
      setUploadLog([]);
    }
  }, [isOpen]);

  const parseFile = async (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) { reject(new Error('Failed to read file')); return; }
          const ext = (file.name || '').toLowerCase();
          let rows: string[][] = [];
          if (ext.endsWith('.csv') || file.type === CSV_MIME) {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
            rows = parseCSV(text);
          } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || EXCEL_MIMES.includes(file.type)) {
            const wb = XLSX.read(data, { type: data instanceof ArrayBuffer ? 'array' : 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
          } else {
            reject(new Error('Unsupported file format. Use CSV or Excel (.xlsx, .xls)'));
            return;
          }
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      if (file.type === CSV_MIME || file.name?.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const findProjectId = (val: string): number | undefined => {
    const v = (val || '').toString().trim();
    const vLower = v.toLowerCase();
    const byUuid = projects.find(p => (p.uuid || '').toLowerCase() === vLower);
    if (byUuid) return byUuid.id;
    const byName = projects.find(p => (p.project_name || '').toLowerCase() === vLower);
    if (byName) return byName.id;
    const num = parseInt(v, 10);
    if (!isNaN(num) && projects.some(p => p.id === num)) return num;
    return undefined;
  };

  const safeStr = (v: unknown): string => (v != null && v !== '') ? String(v).trim() : '';

  const findUnitId = (val: string): number | undefined => {
    const u = (val || '').toString().trim().toLowerCase();
    const match = units.find(x => (x.unit || '').toLowerCase() === u);
    if (match) return match.id;
    const num = parseInt(val, 10);
    if (!isNaN(num) && units.some(x => x.id === num)) return num;
    return undefined;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        toast.showWarning('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      }
    }
    e.target.value = '';
  };

  const BATCH_SIZE = 20;
  const DELAY_MS_PER_REQUEST = 800;

  const resolveProjectId = (): number | null => {
    if (!selectedProjectId) return null;
    const byUuid = projects.find(p => (p.uuid || '').toLowerCase() === selectedProjectId.toLowerCase());
    if (byUuid) return byUuid.id;
    const num = parseInt(selectedProjectId, 10);
    if (!isNaN(num) && projects.some(p => p.id === num)) return num;
    return null;
  };

  const resolveSubprojectId = (): number | null => {
    if (!selectedSubprojectId || !propSubprojects?.length) return null;
    const sel = String(selectedSubprojectId).trim();
    const byUuid = propSubprojects.find(s =>
      (s.uuid && String(s.uuid).toLowerCase() === sel.toLowerCase()) ||
      (String(s.id) === sel)
    );
    if (byUuid) return byUuid.id;
    const num = parseInt(sel, 10);
    if (!isNaN(num) && propSubprojects.some(s => s.id === num)) return num;
    return null;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.showWarning('Please select a file first');
      return;
    }
    if (!selectedProjectId) {
      toast.showError('Please select a project first (above) before bulk upload.');
      return;
    }
    const resolvedProjectId = resolveProjectId();
    if (!resolvedProjectId) {
      toast.showError('Selected project not found. Please select a valid project.');
      return;
    }
    const resolvedSubprojectIdForUpload = resolveSubprojectId();
    if (selectedSubprojectId && !resolvedSubprojectIdForUpload) {
      toast.showError('Selected subproject could not be resolved. Please reselect project and subproject.');
      return;
    }

    setIsUploading(true);
    setUploadLog([]);
    setUploadProgress({ success: 0, failed: 0, total: 0 });

    try {
      const rows = await parseFile(selectedFile);
      if (rows.length < 2) {
        toast.showWarning('File must have a header row and at least one data row');
        setIsUploading(false);
        return;
      }

      const header = (rows[0] || []).map((h: unknown) => safeStr(h).toLowerCase());
      const dataRows = rows.slice(1);
      const projectIdx = header.findIndex(h => h === 'project' || h === 'project_id' || h === 'project id' || h === 'project name');
      const subprojectIdx = header.findIndex(h => h === 'subproject' || h === 'subproject_id' || h === 'subproject name');
      const typeIdx = header.findIndex(h => h === 'type');
      const nameIdx = header.findIndex(h => h === 'activity' || h === 'activities' || h === 'name');
      const headingIdx = header.findIndex(h => h === 'heading' || h === 'parent' || h === 'parent activity');
      const slNoIdx = header.findIndex(h => h.includes('sl no') || h === 'slno' || h === 'sl_no' || h === 'slno.');
      const unitIdx = header.findIndex(h => h === 'unit' || h === 'units' || h === 'unit_id');
      const qtyIdx = header.findIndex(h => h === 'quantity' || h === 'qty');
      const rateIdx = header.findIndex(h => h === 'rate');
      const amountIdx = header.findIndex(h => h === 'amount');
      const startIdx = header.findIndex(h => (h && (h.includes('start date') || h.includes('start_date'))));
      const endIdx = header.findIndex(h => (h && (h.includes('end date') || h.includes('end_date'))));

      if (nameIdx < 0) {
        toast.showError('File must contain an "activity" (or activities/name) column');
        setIsUploading(false);
        return;
      }
      if (typeIdx < 0) {
        toast.showError('File must contain a "type" column (heading or activites)');
        setIsUploading(false);
        return;
      }

      const validTypes = ['heading', 'activites'];
      const projectCache: Record<string, { subprojects: any[]; headings: any[] }> = {};
      const slNoToHeadingId: Record<number, number> = {};
      const resolvedSubprojectId = resolveSubprojectId();

      const getSubprojectsAndHeadings = async (projectId: number, subprojectId?: number | null) => {
        const cacheKey = subprojectId != null ? `${projectId}:${subprojectId}` : `${projectId}`;
        if (projectCache[cacheKey]) return projectCache[cacheKey];
        let subprojects: any[] = [];
        let headings: any[] = [];
        try {
          subprojects = await masterDataAPI.getSubprojects(projectId);
          subprojects = Array.isArray(subprojects) ? subprojects : (subprojects as any)?.data || [];
        } catch {}
        try {
          const result = await masterDataAPI.getActivities(projectId, subprojectId ?? undefined);
          const activities = Array.isArray(result) ? result : (result?.data ?? []);
          // DB distinguishes heading vs activity via `type` column - only include type='heading'
          headings = (activities || []).filter((a: any) => {
            const t = a.type ?? a.activity_type ?? '';
            return t && String(t).toLowerCase() === 'heading';
          });
        } catch {}
        projectCache[cacheKey] = { subprojects, headings };
        return projectCache[cacheKey];
      };

      const findSubprojectId = (projectId: number, val: string): number | undefined => {
        const cache = projectCache[`${projectId}`] ?? (resolvedSubprojectId != null ? projectCache[`${projectId}:${resolvedSubprojectId}`] : null) ?? Object.entries(projectCache).find(([k]) => k.startsWith(`${projectId}`))?.[1];
        if (!cache?.subprojects) return undefined;
        const v = (val || '').toString().trim();
        const vLower = v.toLowerCase();
        const byUuid = cache.subprojects.find((s: any) => (s.uuid || '').toLowerCase() === vLower || String(s.id) === v);
        if (byUuid) return byUuid.id;
        const byName = cache.subprojects.find((s: any) => (s.name || s.subproject_name || '').toLowerCase() === vLower);
        if (byName) return byName.id;
        const num = parseInt(v, 10);
        if (!isNaN(num) && cache.subprojects.some((s: any) => s.id === num)) return num;
        return undefined;
      };

      const findHeadingId = (projectId: number, subprojectId: number | null | undefined, val: string): number | undefined => {
        const ck = subprojectId != null ? `${projectId}:${subprojectId}` : `${projectId}`;
        const cache = projectCache[ck];
        if (!cache) return undefined;
        const v = (val || '').toString().trim().toLowerCase();
        const byName = cache.headings.find((h: any) => (h.activities || h.name || '').toLowerCase() === v);
        if (byName) return byName.id;
        const num = parseInt(val, 10);
        if (!isNaN(num) && cache.headings.some((h: any) => h.id === num)) return num;
        return undefined;
      };

      let success = 0;
      let failed = 0;
      const log: string[] = [];
      const total = dataRows.length;

      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, dataRows.length);

        for (let i = batchStart; i < batchEnd; i++) {
          const row = dataRows[i] || [];
          const projectId = resolvedProjectId;
          const activityName = safeStr(nameIdx >= 0 ? row[nameIdx] : '');
          let type = safeStr(typeIdx >= 0 ? row[typeIdx] : 'heading').toLowerCase();
          if (!validTypes.includes(type)) type = 'heading';

          if (!projectId) {
            log.push(`Row ${i + 2}: Skipped - Project not found`);
            failed++;
            continue;
          }
          if (!activityName) {
            log.push(`Row ${i + 2}: Skipped - Activity name is empty`);
            failed++;
            continue;
          }

          const cacheKey = resolvedSubprojectId != null ? `${projectId}:${resolvedSubprojectId}` : `${projectId}`;
          await getSubprojectsAndHeadings(projectId, resolvedSubprojectId ?? undefined);

          const payload: Record<string, any> = {
            project: projectId,
            type,
            activities: activityName
          };

          // Always use selected subproject from UI when user has chosen one
          let subprojectToAdd: number | null = resolvedSubprojectId;
          if (subprojectIdx >= 0) {
            const subVal = safeStr(row[subprojectIdx]);
            if (subVal) {
              const subId = findSubprojectId(projectId, subVal);
              if (subId) subprojectToAdd = subId;
            }
          }
          if (subprojectToAdd) {
            payload.subproject = Number(subprojectToAdd);
          }

          if (type === 'activites') {
            let headingId: number | undefined;
            const headingVal = safeStr(headingIdx >= 0 ? row[headingIdx] : '');
            if (headingVal) {
              headingId = findHeadingId(projectId, resolvedSubprojectId, headingVal);
            }
            if (!headingId && slNoIdx >= 0) {
              const slNoVal = safeStr(row[slNoIdx]);
              const slNoNum = parseFloat(slNoVal);
              if (!isNaN(slNoNum) && slNoNum % 1 !== 0) {
                const parentSlNo = Math.floor(slNoNum);
                headingId = slNoToHeadingId[parentSlNo];
              }
            }
            const unitVal = safeStr(unitIdx >= 0 ? row[unitIdx] : '');
            const unitIdVal = unitVal ? findUnitId(unitVal) : undefined;

            if (!headingId) {
              const hint = headingVal ? `Heading "${headingVal}"` : (slNoIdx >= 0 ? `Parent for SL No ${safeStr(row[slNoIdx])}` : 'Heading');
              log.push(`Row ${i + 2} (${activityName}): Failed - ${hint} not found (required for type activites)`);
              failed++;
              continue;
            }
            if (!unitIdVal) {
              log.push(`Row ${i + 2} (${activityName}): Failed - Unit is required for type activites. Add "Units" column with valid value (e.g. Sqm, Nos, Cft)`);
              failed++;
              continue;
            }
            payload.heading = headingId;
            payload.unit_id = unitIdVal;
          }

          if (qtyIdx >= 0) {
            const n = parseFloat(safeStr(row[qtyIdx]));
            if (!isNaN(n)) payload.quantity = n;
          }
          if (rateIdx >= 0) {
            const n = parseFloat(safeStr(row[rateIdx]));
            if (!isNaN(n)) payload.rate = n;
          }
          if (amountIdx >= 0) {
            const n = parseFloat(safeStr(row[amountIdx]));
            if (!isNaN(n)) payload.amount = n;
          }
          if (startIdx >= 0) {
            const s = safeStr(row[startIdx]);
            if (s) payload.start_date = s;
          }
          if (endIdx >= 0) {
            const e = safeStr(row[endIdx]);
            if (e) payload.end_date = e;
          }

          if (payload.start_date && payload.end_date && new Date(payload.end_date) < new Date(payload.start_date)) {
            log.push(`Row ${i + 2} (${activityName}): Skipped - End date must be >= start date`);
            failed++;
            continue;
          }

          try {
            await new Promise(r => setTimeout(r, DELAY_MS_PER_REQUEST));
            const res = await masterDataAPI.createActivity(payload);
            success++;
            log.push(`Row ${i + 2} (${activityName}): Success`);
            // Add newly created heading to cache so child activities in same file can find it
            if (type === 'heading') {
              const created = res?.data ?? res;
              const newId = created?.id ?? created?.uuid;
              if (newId != null) {
                const cache = projectCache[cacheKey];
                if (cache) {
                  cache.headings = cache.headings || [];
                  cache.headings.push({ id: newId, activities: activityName, name: activityName });
                }
                if (slNoIdx >= 0) {
                  const slNoVal = safeStr(row[slNoIdx]);
                  const slNoNum = parseFloat(slNoVal);
                  if (!isNaN(slNoNum)) {
                    const slNoInt = Math.floor(slNoNum);
                    const numId = typeof newId === 'number' ? newId : parseInt(String(newId), 10);
                    if (!isNaN(numId)) slNoToHeadingId[slNoInt] = numId;
                  }
                }
              } else {
                delete projectCache[cacheKey];
              }
            }
          } catch (err: any) {
            const is429 = err?.response?.status === 429 || String(err?.message || '').includes('429');
            if (is429) {
              log.push(`Row ${i + 2} (${activityName}): Rate limited - waiting 30s and retrying...`);
              await new Promise(r => setTimeout(r, 30000));
              try {
                const res = await masterDataAPI.createActivity(payload);
                success++;
                log.push(`Row ${i + 2} (${activityName}): Success (after retry)`);
                if (type === 'heading') {
                  const created = res?.data ?? res;
                  const newId = created?.id ?? created?.uuid;
                  if (newId != null) {
                    const cache = projectCache[cacheKey];
                    if (cache) {
                      cache.headings = cache.headings || [];
                      cache.headings.push({ id: newId, activities: activityName, name: activityName });
                    }
                    if (slNoIdx >= 0) {
                      const slNoVal = safeStr(row[slNoIdx]);
                      const slNoNum = parseFloat(slNoVal);
                      if (!isNaN(slNoNum)) {
                        const slNoInt = Math.floor(slNoNum);
                        const numId = typeof newId === 'number' ? newId : parseInt(String(newId), 10);
                        if (!isNaN(numId)) slNoToHeadingId[slNoInt] = numId;
                      }
                    }
                  }
                }
              } catch (retryErr: any) {
                failed++;
                log.push(`Row ${i + 2} (${activityName}): Failed - Rate limit exceeded. Please try again with fewer rows or wait a few minutes.`);
              }
            } else {
              failed++;
              log.push(`Row ${i + 2} (${activityName}): Failed - ${err.message || 'API error'}`);
            }
          }
        }
        setUploadProgress({ success, failed, total });
        if (batchEnd < dataRows.length) await new Promise(r => setTimeout(r, 1500));
      }

      setUploadProgress({ success, failed, total });
      setUploadLog(log);

      if (success > 0) {
        toast.showSuccess(`${success} activity(ies) added successfully`);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      toast.showError(err.message || 'Failed to parse file');
      setUploadLog([`Error: ${err.message || 'Unknown error'}`]);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Activities</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Select project & subproject above, then upload CSV/Excel. Required: <strong>type</strong> (heading/activites), <strong>activities</strong>.
              For type=activites: use <strong>heading</strong> (parent name) <em>or</em> <strong>SL No</strong> (e.g. 1.1 → parent 1). <strong>Units</strong> optional.
            </p>
            {selectedProjectId && (
              <p className={`text-xs mt-2 ${textSecondary}`}>
                Using: <span className={`font-bold ${textPrimary}`}>
                  {projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId)?.project_name || 'Project'}
                  {selectedSubprojectId && ` → ${propSubprojects.find(s => s.uuid === selectedSubprojectId || String(s.id) === selectedSubprojectId)?.name || 'Subproject'}`}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} disabled={isUploading} className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors disabled:opacity-50">
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDark ? 'border-slate-600 hover:border-[#C2D642]/50' : 'border-slate-300 hover:border-[#C2D642]/50'
            } ${selectedFile ? 'border-[#C2D642]/50' : ''}`}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
            <p className={`text-sm font-bold ${textPrimary}`}>{selectedFile ? selectedFile.name : 'Click to choose file'}</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>Supports .csv, .xlsx, .xls — Large files supported</p>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              selectedFile && !isUploading ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading... {uploadProgress.total > 0 && `(${uploadProgress.success + uploadProgress.failed}/${uploadProgress.total})`}
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload & Add to Database
              </>
            )}
          </button>

          {(uploadProgress.total > 0 || uploadLog.length > 0) && (
            <div className={`rounded-xl border ${cardClass} p-4 space-y-3`}>
              <div className="flex items-center gap-4">
                <span className={`flex items-center gap-1 text-sm ${textPrimary}`}>
                  <CheckCircle className="w-4 h-4 text-green-500" />{uploadProgress.success} succeeded
                </span>
                <span className={`flex items-center gap-1 text-sm ${textPrimary}`}>
                  <AlertCircle className="w-4 h-4 text-red-500" />{uploadProgress.failed} failed
                </span>
              </div>
              <div className={`max-h-60 overflow-y-auto text-xs font-mono ${textSecondary}`}>
                {uploadLog.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityBulkUploadModal;
