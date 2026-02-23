'use client';

import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Login');
  const router = useRouter();

  const handleLogin = (email: string, password: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', email);
      router.push('/dashboard');
    }
  };

  return (
    <LoginModal
      isOpen={true}
      onClose={() => router.push('/')}
      onLogin={handleLogin}
      signUpHref="/sign-up"
    />
  );
}
