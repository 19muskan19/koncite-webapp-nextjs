'use client';

import React, { useState, useRef, useId } from 'react';
import { ThemeType } from '@/types';
import { X, FileSpreadsheet, Loader2, Upload, CheckCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { masterDataAPI } from '@/services/api';
import { runVendorImportWithFullRowMatch } from '@/lib/vendorBulkImportClient';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv';
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface VendorBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const VendorBulkUploadModal: React.FC<VendorBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vendorBulkFileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    total_rows: number;
    created: number;
    updated: number;
    skipped: number;
    message: string;
    errors: string[];
  } | null>(null);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      toast.showError(err);
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
      const result = await runVendorImportWithFullRowMatch(selectedFile, {
        getVendors: () => masterDataAPI.getVendors(),
        createVendor: (d) => masterDataAPI.createVendor(d),
        updateVendor: (uuid, d) => masterDataAPI.updateVendor(uuid, d),
      });
      const errList = Array.isArray(result.errors) ? result.errors : [];
      setUploadResult({
        total_rows: result.total_rows,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped ?? 0,
        message: result.message ?? '',
        errors: errList,
      });
      if (errList.length > 0) {
        const detailsSuffix =
          errList.length > 3
            ? ' See details below.'
            : errList.length > 0
              ? ' ' + errList.slice(0, 2).join(' ')
              : '';
        toast.showWarning((result.message ?? '') + detailsSuffix);
      } else {
        toast.showSuccess(result.message ?? 'Import finished.');
      }
      onSuccess?.();
      // Clear selection + reset input so another file (or same name) can be chosen
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      const message = error?.message || 'Failed to import vendors.';
      toast.showError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`relative ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'} rounded-xl border ${cardClass} w-full max-w-[min(92vw,1024px)] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Vendors</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Upload Excel (.xlsx, .xls) or CSV file. Max {MAX_SIZE_MB}MB.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className={`rounded-lg border p-4 ${isDark ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-bold ${textPrimary} mb-2`}>Column format (row 1 = headers):</h3>
            <div className={`text-xs ${textSecondary} space-y-1 font-mono`}>
              <p><strong>Name</strong> (required) – Vendor name</p>
              <p><strong>Type</strong> (required) – supplier, contractor, or both</p>
              <p><strong>Address</strong> (optional)</p>
              <p><strong>Contact Person Name</strong> (optional)</p>
              <p><strong>Contact Person Phone</strong> (optional)</p>
              <p><strong>Contact Person Email</strong> (optional)</p>
              <p><strong>Gst No</strong> (optional) – used for matching</p>
            </div>
            <p className={`text-xs ${textPrimary} mt-2 font-bold`}>
              A row updates an existing vendor only when <strong>all</strong> of the above (including name) match. Same name
              with any other field different creates a <strong>new</strong> vendor.
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl text-center transition-colors ${
              isDark ? 'border-slate-600 hover:border-[#C2D642]/50' : 'border-slate-300 hover:border-[#C2D642]/50'
            } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={fileInputRef}
              id={vendorBulkFileInputId}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
            />
            <label htmlFor={vendorBulkFileInputId} className="block p-8 cursor-pointer">
              {isUploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-[#C2D642]" />
              ) : (
                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
              )}
              <p className={`text-sm font-bold ${textPrimary}`}>
                {isUploading ? 'Uploading...' : selectedFile ? selectedFile.name : 'Click or drag file here'}
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
                {(uploadResult.skipped ?? 0) > 0 ? (
                  <span>Skipped: <strong className="text-amber-500">{uploadResult.skipped}</strong></span>
                ) : null}
              </div>
              {(uploadResult.errors ?? []).length > 0 ? (
                <ul className="mt-2 max-h-32 overflow-y-auto text-xs list-disc pl-4 space-y-0.5 text-amber-700 dark:text-amber-400">
                  {(uploadResult.errors ?? []).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-inherit">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            } disabled:opacity-50`}
          >
            {uploadResult ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#A8B838] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBulkUploadModal;
