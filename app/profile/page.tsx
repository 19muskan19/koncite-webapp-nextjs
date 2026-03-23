'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import UserProfileModal from '@/components/UserProfileModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUser } from '@/contexts/UserContext';
import { User, Mail, Phone, Pencil, X } from 'lucide-react';
import { getProfileImageUrl } from '@/utils/imageUtils';
import { cn } from '@/utils/cn';

export default function ProfilePage() {
  usePageTitle();
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const { user, refreshUser } = useUser();
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const profileImageUrl = getProfileImageUrl(
    (user as any)?.profile_image ?? (user as any)?.profile_images ?? (user as any)?.avatar,
    user?.name || 'User'
  );

  const handleClose = () => router.push('/dashboard');

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto relative">
        <button
          onClick={handleClose}
          className={cn('absolute top-0 right-0 p-2 rounded-lg transition-colors', isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500')}
          title="Close"
          aria-label="Close and go to dashboard"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className={`text-2xl font-black mb-6 pr-12 ${textPrimary}`}>User Profile</h1>

        {/* Profile info */}
        <div className={`rounded-xl border p-6 mb-6 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex-shrink-0">
              <img
                src={profileImageUrl}
                alt={user?.name || 'Profile'}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#C2D642]/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=C2D642&color=fff&size=96`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
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
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {user?.email || '—'}
                  </p>
                </div>
                {(user?.phone || (user as any)?.country_code) && (
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Phone</span>
                    <p className={`mt-1 font-semibold flex items-center gap-2 ${textPrimary}`}>
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {(user as any)?.country_code ? `${(user as any).country_code} ` : ''}{user?.phone || '—'}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditModalOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C2D642] text-slate-900 font-bold text-sm hover:bg-[#A8B838] transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          refreshUser();
          router.push('/dashboard');
        }}
      />
    </AppLayout>
  );
}
