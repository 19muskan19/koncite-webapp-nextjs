'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType, ToastContainer } from '../components/Toast';

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string | { message?: string }, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string | { message?: string }, duration?: number) => void;
  showError: (message: string | { message?: string }, duration?: number) => void;
  showInfo: (message: string | { message?: string }, duration?: number) => void;
  showWarning: (message: string | { message?: string }, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode; isDark?: boolean }> = ({ children, isDark = false }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toMessage = useCallback((msg: unknown): string => {
    if (typeof msg === 'string') return msg;
    if (msg && typeof msg === 'object' && 'message' in msg) {
      const m = (msg as { message?: unknown }).message;
      return typeof m === 'string' ? m : String(m ?? 'An error occurred');
    }
    return String(msg ?? 'An error occurred');
  }, []);

  const showToast = useCallback(
    (message: string | { message?: string }, type: ToastType = 'info', duration: number = 3000) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: Toast = { id, message: toMessage(message), type, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    [toMessage]
  );

  const showSuccess = useCallback(
    (message: string | { message?: string }, duration?: number) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string | { message?: string }, duration?: number) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string | { message?: string }, duration?: number) => {
      showToast(message, 'info', duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string | { message?: string }, duration?: number) => {
      showToast(message, 'warning', duration);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} isDark={isDark} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
