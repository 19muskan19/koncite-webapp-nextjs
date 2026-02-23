'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from '@/components/HomePage';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication after component mounts (client-side only)
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('isAuthenticated');
      if (savedAuth === 'true') {
        router.push('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [router]);

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <HomePage 
        onLoginClick={() => router.push('/login')} 
        onBookDemo={() => router.push('/login')}
        onNavigateToAbout={() => {
          setTimeout(() => {
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
              aboutSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }}
      />
    </>
  );
}
