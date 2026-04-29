'use client';

import React, { useState, useRef, useId } from 'react';
import { ThemeType } from '@/types';
import { X, FileSpreadsheet, Loader2, Upload, CheckCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { masterDataAPI } from '@/services/api';
import * as XLSX from 'xlsx';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv';
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface MaterialBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (importedCodes?: string[]) => void;
}

const MaterialBulkUploadModal: React.FC<MaterialBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialBulkFileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    total_rows: number;
    created: number;
    updated: number;
    message: string;
  } | null>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const resetState = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isUploading) {
      resetState();
      onClose();
    }
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

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUploading) return;
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      toast.showError(err);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const parseAndDeduplicateFile = async (file: File): Promise<{ file: File; codes: string[]; duplicatesRemoved: number }> => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as (string | number)[][];
    const headerRow = rows[0] as (string | number)[];
    const headers = (headerRow || []).map((h) => String(h || '').trim().toLowerCase());

    const nameIdx = headers.findIndex((h) => h === 'name');
    const classIdx = headers.findIndex((h) => h === 'class');
    const specIdx = headers.findIndex((h) => h === 'specification');
    const codeIdx = headers.findIndex((h) => h === 'code');

    const seen = new Set<string>();
    const deduplicatedRows: (string | number)[][] = [headerRow];
    const codes: string[] = [];
    let duplicatesRemoved = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | number)[];
      const name = (row?.[nameIdx] != null ? String(row[nameIdx]) : '').trim().toLowerCase();
      const cls = (row?.[classIdx] != null ? String(row[classIdx]) : '').trim();
      const spec = (row?.[specIdx] != null ? String(row[specIdx]) : '').trim().toLowerCase();
      const key = `${name}|${cls}|${spec}`;

      if (seen.has(key)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(key);
      deduplicatedRows.push(row);
      const code = row?.[codeIdx] != null ? String(row[codeIdx]).trim() : '';
      if (code) codes.push(code);
    }

    const ws = XLSX.utils.aoa_to_sheet(deduplicatedRows);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, ws, 'Materials');
    const buffer = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const newFile = new File([blob], file.name, { type: blob.type });

    return { file: newFile, codes, duplicatesRemoved };
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    const err = validateFile(selectedFile);
    if (err) {
      toast.showError(err);
      return;
    }
    setIsUploading(true);
    setUploadResult(null);
    try {
      const { file: deduplicatedFile, codes: importedCodes, duplicatesRemoved } = await parseAndDeduplicateFile(selectedFile);
      if (duplicatesRemoved > 0) {
        toast.showWarning(`${duplicatesRemoved} duplicate row(s) (same name, class, specification) removed. Only unique materials are imported.`);
      }
      const response = await masterDataAPI.importMaterials(deduplicatedFile);
      const data = response?.data ?? response;
      const totalRows = data?.total_rows ?? 0;
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      const msg = data?.message ?? `${created} created, ${updated} updated.`;
      setUploadResult({ total_rows: totalRows, created, updated, message: msg });
      toast.showSuccess(msg);
      onSuccess?.(importedCodes);
    } catch (error: any) {
      toast.showError(error?.message || 'Failed to import materials.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`relative ${bgPrimary} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <button
          onClick={handleClose}
          disabled={isUploading}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-6 pr-14 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Materials</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Upload Excel (.xlsx, .xls) or CSV file. Max {MAX_SIZE_MB}MB.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={`relative border-2 border-dashed rounded-xl text-center transition-colors ${
              isDark ? 'border-slate-600 hover:border-[#C2D642]/50' : 'border-slate-300 hover:border-[#C2D642]/50'
            } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={fileInputRef}
              id={materialBulkFileInputId}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
            />
            {selectedFile && !isUploading && (
              <button
                type="button"
                onClick={handleClearFile}
                className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} ${textSecondary} transition-colors`}
                title="Remove file"
                aria-label="Remove selected file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <label htmlFor={materialBulkFileInputId} className="block p-8 cursor-pointer">
              {isUploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-[#C2D642]" />
              ) : (
                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
              )}
              <p className={`text-sm font-bold ${textPrimary}`}>
                {isUploading ? 'Uploading...' : selectedFile ? selectedFile.name : 'Click to select file'}
              </p>
              <p className={`text-xs mt-1 ${textSecondary}`}>
                {selectedFile ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB` : 'Excel (.xlsx, .xls) or CSV'}
              </p>
            </label>
          </div>

          {uploadResult && (
            <div className={`rounded-lg border p-4 ${isDark ? 'bg-[#C2D642]/10 border-[#C2D642]/30' : 'bg-[#C2D642]/5 border-[#C2D642]/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-[#C2D642]" />
                <span className={`font-bold ${textPrimary}`}>Import completed</span>
              </div>
              <p className={`text-sm ${textSecondary}`}>{uploadResult.message}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <span>Total rows: <strong>{uploadResult.total_rows}</strong></span>
                <span>Created: <strong className="text-green-500">{uploadResult.created}</strong></span>
                <span>Updated: <strong className="text-blue-500">{uploadResult.updated}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-inherit flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'} disabled:opacity-50`}
          >
            {uploadResult ? 'Close' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialBulkUploadModal;
