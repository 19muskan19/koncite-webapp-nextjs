'use client';

import AppLayout from '@/components/AppLayout';
import UserRolesPermissions from '@/components/company-users/UserRolesPermissions';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function USER_ROLES_PERMISSIONSPage() {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <UserRolesPermissions theme={theme} />
    </AppLayout>
  );
}
