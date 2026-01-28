'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('isAuthenticated');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        router.push('/');
      }
      setIsChecking(false);
    }
  }, [router]);

  return { isAuthenticated, isChecking };
}
