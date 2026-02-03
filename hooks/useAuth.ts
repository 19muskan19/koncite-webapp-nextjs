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
      const token = localStorage.getItem('auth_token');
      
      // Check both authentication flag and token
      if (savedAuth === 'true' && token) {
        setIsAuthenticated(true);
      } else {
        // Clear invalid auth state
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('auth_token');
        router.push('/');
      }
      setIsChecking(false);
    }
  }, [router]);

  return { isAuthenticated, isChecking };
}
