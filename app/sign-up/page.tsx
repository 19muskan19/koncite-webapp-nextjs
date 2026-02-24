'use client';

import { useRouter } from 'next/navigation';
import SignupModal from '@/components/SignupModal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function SignUpPage() {
  usePageTitle('Sign Up');
  const router = useRouter();

  const handleSignup = (data: { email: string }) => {
    router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
  };

  return (
    <SignupModal
      isOpen={true}
      onClose={() => router.push('/')}
      onSignup={handleSignup}
      loginHref="/login"
    />
  );
}
