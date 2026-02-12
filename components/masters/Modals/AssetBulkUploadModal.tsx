'use client';

import React from 'react';
import { ThemeType } from '@/types';
import { X, FileSpreadsheet } from 'lucide-react';

interface AssetBulkUploadModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AssetBulkUploadModal: React.FC<AssetBulkUploadModalProps> = ({
  theme,
  isOpen,
  onClose
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Bulk Upload Assets/Equipments</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              Bulk upload assets/equipments from CSV or Excel file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center ${
              isDark ? 'border-slate-600' : 'border-slate-300'
            }`}
          >
            <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
            <p className={`text-sm font-bold ${textPrimary}`}>
              Bulk Upload
            </p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Select a file to upload assets/equipments in bulk
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetBulkUploadModal;
