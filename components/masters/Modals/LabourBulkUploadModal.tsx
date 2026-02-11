'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import * as XLSX from 'xlsx';

interface LabourBulkUploadModalProps {
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
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      value += char;
    } else if (char === ',' || char === '\t') {
      current.push(value.trim());
      value = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      current.push(value.trim());
      value = '';
      if (current.some(c => c)) rows.push(current);
      current = [];
    } else {
      value += char;
    }
  }
  current.push(value.trim());
  if (current.some(c => c)) rows.push(current);
  return rows;
};

const LabourBulkUploadModal: React.FC<LabourBulkUploadModalProps> = ({
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
  const [units, setUnits] = useState<Array<{ id: number; unit: string }>>([]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  useEffect(() => {
    if (isOpen) {
      const fetchUnits = async () => {
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
      fetchUnits();
    }
  }, [isOpen]);

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
          if (!data) {
            reject(new Error('Failed to read file'));
            return;
          }
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
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      if (file.type === CSV_MIME || file.name?.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const findUnitId = (unitStr: string): number | undefined => {
    const u = (unitStr || '').toString().trim().toLowerCase();
    const match = units.find(x => (x.unit || '').toLowerCase() === u);
    if (match) return match.id;
    const num = parseInt(unitStr, 10);
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

  const BATCH_SIZE = 50; // Process 50 rows per batch to keep UI responsive for large files

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

      const header = rows[0].map((h: string) => (h || '').toString().trim().toLowerCase());
      const dataRows = rows.slice(1);
      const nameIdx = header.findIndex(h => h === 'name' || h === 'labour name' || h === 'labour_type');
      const codeIdx = header.findIndex(h => h === 'code' || h === 'labour code');
      const categoryIdx = header.findIndex(h => h === 'category' || h === 'type');
      const unitIdx = header.findIndex(h => h === 'unit' || h === 'units' || h === 'unit_id' || h === 'unit id');

      if (nameIdx < 0) {
        toast.showError('File must contain a "name" column');
        setIsUploading(false);
        return;
      }

      const validCategories = ['skilled', 'semiskilled', 'unskilled'];
      let success = 0;
      let failed = 0;
      const log: string[] = [];
      const total = dataRows.length;

      // Process in batches to support large files - keeps UI responsive
      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, dataRows.length);
        for (let i = batchStart; i < batchEnd; i++) {
          const row = dataRows[i];
          const name = (row[nameIdx] || '').toString().trim();
          if (!name) {
            log.push(`Row ${i + 2}: Skipped (empty name)`);
            failed++;
            continue;
          }

          let category = (categoryIdx >= 0 ? row[categoryIdx] : 'skilled').toString().trim().toLowerCase();
          if (!validCategories.includes(category)) {
            category = 'skilled';
          }

          const unitVal = unitIdx >= 0 ? row[unitIdx] : '';
          let unitId = findUnitId(unitVal ? unitVal.toString() : '');
          if (!unitId && unitVal) {
            const num = parseInt(unitVal.toString(), 10);
            if (!isNaN(num)) unitId = num;
          }
          if (!unitId && units.length > 0) {
            log.push(`Row ${i + 2} (${name}): Failed - Unit "${unitVal}" not found. Add unit first or use a valid unit name.`);
            failed++;
            continue;
          }

          const payload: Record<string, any> = {
            name,
            category,
            is_active: 1
          };
          if (codeIdx >= 0 && row[codeIdx]) payload.code = row[codeIdx].toString().trim();
          if (unitId) payload.unit_id = unitId;

          try {
            await masterDataAPI.createLabour(payload);
            success++;
            log.push(`Row ${i + 2} (${name}): Success`);
          } catch (err: any) {
            failed++;
            log.push(`Row ${i + 2} (${name}): Failed - ${err.message || 'API error'}`);
          }
        }
        // Update progress after each batch so UI stays responsive (don't update full log to avoid lag)
        setUploadProgress({ success, failed, total });
        // Yield to browser between batches for large files
        if (batchEnd < dataRows.length) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setUploadProgress({ success, failed, total });
      setUploadLog(log);

      if (success > 0) {
        toast.showSuccess(`${success} labour(s) added successfully`);
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
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Labours</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Upload CSV or Excel file. Required columns: <strong>name</strong>, <strong>category</strong> (skilled/semiskilled/unskilled), <strong>units</strong> (or unit/unit_id).
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors disabled:opacity-50"
          >
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
            <p className={`text-sm font-bold ${textPrimary}`}>
              {selectedFile ? selectedFile.name : 'Click to choose file'}
            </p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Supports .csv, .xlsx, .xls — Large files supported
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              selectedFile && !isUploading
                ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
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
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {uploadProgress.success} succeeded
                </span>
                <span className={`flex items-center gap-1 text-sm ${textPrimary}`}>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {uploadProgress.failed} failed
                </span>
              </div>
              <div className={`max-h-60 overflow-y-auto text-xs font-mono ${textSecondary}`}>
                {uploadLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabourBulkUploadModal;
