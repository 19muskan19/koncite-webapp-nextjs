'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { userAPI } from '@/services/api';
import { Shield, Loader2, User, Mail } from 'lucide-react';

export default function ProfilePage() {
  usePageTitle();
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const { user, refreshUser } = useUser();
  const toast = useToast();
  const [twoFactorUpdating, setTwoFactorUpdating] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const skipNextSyncRef = React.useRef(false);

  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const fromUser = (user?.two_factor_status ?? 'off').toString().toLowerCase() === 'on';
    setTwoFactorEnabled(fromUser);
  }, [user?.two_factor_status]);

  const handleTwoFactorToggle = async () => {
    if (twoFactorUpdating) return;
    const newStatus = twoFactorEnabled ? 'off' : 'on';
    setTwoFactorEnabled(!twoFactorEnabled);
    setTwoFactorUpdating(true);
    try {
      const payload: Record<string, any> = {
        two_factor_status: newStatus,
      };
      if (user?.name != null) payload.name = user.name;
      if (user?.country_code != null) payload.country_code = user.country_code;
      if (user?.phone != null) payload.phone = user.phone;
      if (user?.country != null) payload.country = user.country;
      if (user?.state != null) payload.state = user.state;
      if (user?.city != null) payload.city = user.city;
      if (user?.dob != null) payload.dob = user.dob;
      if (user?.designation != null) payload.designation = user.designation;
      await userAPI.updateProfile(payload);
      toast.showSuccess(newStatus === 'on' ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
      skipNextSyncRef.current = true;
      await refreshUser();
    } catch (err: any) {
      setTwoFactorEnabled(twoFactorEnabled);
      toast.showError(err.message || 'Failed to update two-factor authentication');
    } finally {
      setTwoFactorUpdating(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className={`text-2xl font-black mb-6 ${textPrimary}`}>User Profile</h1>

        {/* Profile info */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
            <User className="w-5 h-5" />
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Name</span>
              <p className={`mt-1 font-semibold ${textPrimary}`}>{user?.name || '—'}</p>
            </div>
            <div>
              <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Email</span>
              <p className={`mt-1 font-semibold flex items-center gap-2 ${textPrimary}`}>
                <Mail className="w-4 h-4" />
                {user?.email || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Two-factor authentication */}
        <div className={`rounded-xl border p-6 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${textSecondary}`} />
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>Two-factor authentication</h2>
                <p className={`text-sm mt-0.5 ${textSecondary}`}>
                  {twoFactorEnabled ? 'OTP will be required when signing in' : 'Require OTP when signing in'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTwoFactorToggle}
              disabled={twoFactorUpdating}
              role="switch"
              aria-checked={twoFactorEnabled}
              className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 disabled:opacity-50 flex-shrink-0 ${
                twoFactorEnabled ? 'bg-[#C2D642]' : isDark ? 'bg-slate-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1.5 left-1.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
              {twoFactorUpdating && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
