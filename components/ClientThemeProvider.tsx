'use client';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';

function ToastProviderWithTheme({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <ToastProvider isDark={theme === 'dark'}>{children}</ToastProvider>;
}

export default function ClientThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProviderWithTheme>{children}</ToastProviderWithTheme>
    </ThemeProvider>
  );
}
