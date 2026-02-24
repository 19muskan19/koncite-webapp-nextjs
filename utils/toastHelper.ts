// Helper file for toast notifications
// This file exports a function to replace window.confirm with a custom confirm dialog
// For now, we'll keep window.confirm but replace alerts with toasts

export const showConfirm = (message: string): boolean => {
  return window.confirm(message);
};
