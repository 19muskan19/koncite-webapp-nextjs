'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import { getExactErrorMessage } from '@/utils/errorUtils';
import * as XLSX from 'xlsx';

interface VendorBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

const VendorBulkUploadModal: React.FC<VendorBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ success: 0, failed: 0, total: 0 });
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

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
            rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as string[][];
          } else {
            reject(new Error('Unsupported file format. Use CSV or Excel (.xlsx, .xls)'));
            return;
          }
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      file.type === CSV_MIME || file.name?.toLowerCase().endsWith('.csv')
        ? reader.readAsText(file)
        : reader.readAsArrayBuffer(file);
    });
  };

  const safeStr = (v: unknown) => (v != null && v !== '') ? String(v).trim() : '';
  const validTypes = ['supplier', 'contractor', 'both'];
  const validCountryCodes = ['91', '971'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const DELAY_MS = 300;

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.showWarning('Please select a file first');
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
      const nameIdx = header.findIndex(h => h === 'name' || h === 'vendor name' || h === 'company name');
      const addressIdx = header.findIndex(h => h === 'address');
      const typeIdx = header.findIndex(h => h === 'type' || h === 'vendor type');
      const contactIdx = header.findIndex(h => h === 'contact person' || h === 'contact_person_name' || h === 'contact person name');
      const phoneIdx = header.findIndex(h => h === 'phone' || h === 'mobile' || h === 'contact');
      const emailIdx = header.findIndex(h => h === 'email');
      const gstIdx = header.findIndex(h => h === 'gst' || h === 'gst_no' || h === 'gst no');
      const countryCodeIdx = header.findIndex(h => h === 'country_code' || h === 'country code');

      if (nameIdx < 0) {
        toast.showError('File must contain a "name" column');
        setIsUploading(false);
        return;
      }
      if (addressIdx < 0) {
        toast.showError('File must contain an "address" column');
        setIsUploading(false);
        return;
      }
      if (contactIdx < 0) {
        toast.showError('File must contain a "contact person" column');
        setIsUploading(false);
        return;
      }
      if (phoneIdx < 0) {
        toast.showError('File must contain a "phone" column');
        setIsUploading(false);
        return;
      }
      if (emailIdx < 0) {
        toast.showError('File must contain an "email" column');
        setIsUploading(false);
        return;
      }

      let success = 0, failed = 0;
      let lastApiError: any = null;
      const log: string[] = [];
      const total = dataRows.length;

      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, dataRows.length);
        for (let i = batchStart; i < batchEnd; i++) {
          const row = dataRows[i] || [];
          const name = safeStr(row[nameIdx]);
          const address = safeStr(row[addressIdx]);
          const contactPerson = safeStr(row[contactIdx]);
          const phone = safeStr(row[phoneIdx]);
          const email = safeStr(row[emailIdx]);
          if (!name || !address || !contactPerson || !phone || !email) {
            log.push(`Row ${i + 2}: Skipped - name, address, contact person, phone, email are required`);
            failed++;
            continue;
          }
          if (!emailRegex.test(email)) {
            log.push(`Row ${i + 2} (${name}): Failed - invalid email`);
            failed++;
            continue;
          }
          let type = safeStr(typeIdx >= 0 ? row[typeIdx] : 'both').toLowerCase();
          if (!validTypes.includes(type)) type = 'both';
          let countryCode = countryCodeIdx >= 0 ? safeStr(row[countryCodeIdx]) : '91';
          if (!validCountryCodes.includes(countryCode)) countryCode = '91';

          const payload: Record<string, any> = {
            name,
            address,
            type,
            contact_person_name: contactPerson,
            country_code: countryCode,
            phone,
            email: email.toLowerCase(),
            is_active: 1
          };
          if (gstIdx >= 0 && safeStr(row[gstIdx])) payload.gst_no = safeStr(row[gstIdx]);

          try {
            if (i > batchStart) await new Promise(r => setTimeout(r, DELAY_MS));
            await masterDataAPI.createVendor(payload);
            success++;
            log.push(`Row ${i + 2} (${name}): Success`);
          } catch (err: any) {
            failed++;
            const exactMsg = getExactErrorMessage(err);
            log.push(`Row ${i + 2} (${name}): Failed - ${exactMsg}`);
            lastApiError = err;
          }
        }
        setUploadProgress({ success, failed, total });
        if (batchEnd < dataRows.length) await new Promise(r => setTimeout(r, 500));
      }
      setUploadLog(log);
      if (success > 0) {
        toast.showSuccess(`${success} vendor(s) added successfully`);
        if (onSuccess) onSuccess();
      }
      if (failed > 0 && success === 0) {
        const msg = lastApiError ? getExactErrorMessage(lastApiError) : '';
        toast.showError(msg ? `Import failed for all ${failed} row(s): ${msg}` : `Import failed for all ${failed} row(s)`);
      }
    } catch (err: any) {
      const msg = getExactErrorMessage(err);
      toast.showError(msg || 'Failed to parse file');
      setUploadLog([`Error: ${msg || 'Unknown error'}`]);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Vendors</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Upload CSV/Excel with columns: <strong>name</strong>, <strong>address</strong>, <strong>contact person</strong>, <strong>phone</strong>, <strong>email</strong>. Optional: type, gst_no, country_code.
            </p>
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
            <p className={`text-xs mt-1 ${textSecondary}`}>Supports .csv, .xlsx, .xls</p>
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

export default VendorBulkUploadModal;
