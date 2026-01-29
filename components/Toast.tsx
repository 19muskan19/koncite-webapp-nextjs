'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
  isDark: boolean;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose, isDark }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: isDark
      ? 'bg-[#C2D642] border-[#C2D642] text-white'
      : 'bg-[#C2D642] border-[#a8b835] text-white',
    error: isDark
      ? 'bg-red-600 border-red-500 text-white'
      : 'bg-red-500 border-red-600 text-white',
    info: isDark
      ? 'bg-blue-600 border-blue-500 text-white'
      : 'bg-blue-500 border-blue-600 text-white',
    warning: isDark
      ? 'bg-yellow-600 border-yellow-500 text-white'
      : 'bg-yellow-500 border-yellow-600 text-white',
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl min-w-[300px] max-w-[500px] animate-slide-in ${colorClass}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-bold">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className={`flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
  isDark: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose, isDark }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} isDark={isDark} />
        </div>
      ))}
    </div>
  );
};
