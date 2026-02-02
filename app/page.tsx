'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from '@/components/HomePage';
import LoginModal from '@/components/LoginModal';
import SignupModal from '@/components/SignupModal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
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

  const handleLogin = (email: string, password: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', email);
      router.push('/dashboard');
    }
  };

  const handleSignup = (data: any) => {
    // Handle signup logic here
    console.log('Signup data:', data);
    // For now, just close the modal and show success message
    setShowSignupModal(false);
    // You can add actual signup API call here
    alert('Signup successful! Please check your email for verification.');
  };

  useEffect(() => {
    const handleOpenSignupModal = () => {
      setShowLoginModal(false);
      setShowSignupModal(true);
    };

    window.addEventListener('openSignupModal', handleOpenSignupModal);
    return () => {
      window.removeEventListener('openSignupModal', handleOpenSignupModal);
    };
  }, []);

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
        onLoginClick={() => setShowLoginModal(true)} 
        onBookDemo={() => setShowLoginModal(true)}
        onNavigateToAbout={() => {
          setTimeout(() => {
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
              aboutSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }}
      />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)}
        onSignup={handleSignup}
      />
    </>
  );
}
