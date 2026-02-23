'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import UserProfileModal from '@/components/UserProfileModal';
import { useAuth } from '@/hooks/useAuth';

export default function UserProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);

  const handleClose = () => {
    setModalOpen(false);
    router.back();
  };

  useEffect(() => {
    setModalOpen(true);
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/');
    return null;
  }

  return (
    <AppLayout>
      <UserProfileModal isOpen={modalOpen} onClose={handleClose} />
    </AppLayout>
  );
}
