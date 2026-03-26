'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { authAPI } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function VerifyOtpPage() {
  usePageTitle('Verify OTP');
  const router = useRouter();
  const { isDark } = useTheme();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [flow, setFlow] = useState<'signup' | 'signin'>('signup');

  // Pre-fill email from query param or localStorage; detect flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('email');
    const flowParam = params.get('flow');
    const fromStorage = localStorage.getItem('pendingVerificationEmail');
    if (fromQuery) {
      setEmail(decodeURIComponent(fromQuery));
    } else if (fromStorage) {
      setEmail(fromStorage);
    }
    if (flowParam === 'signin') {
      setFlow('signin');
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';
  const bgClass = isDark ? 'bg-[#0a0a0a]' : 'bg-slate-50';

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOtp(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (otp.length !== 4) {
      setError('Please enter the 4-digit code');
      return;
    }

    setIsLoading(true);

    try {
      if (flow === 'signin') {
        await authAPI.signInVerifyOtp(email.trim(), otp);
        toast.showSuccess('OTP verified successfully!');
        window.location.href = '/dashboard';
      } else {
        await authAPI.verifyOtp(email.trim(), otp);
        toast.showSuccess('OTP verified successfully! Please sign in.');
        localStorage.removeItem('pendingVerificationEmail');
        router.push('/login');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    if (!email.trim()) {
      setError('Email is required to resend OTP');
      return;
    }
    // Sign-in 2FA flow: no resend endpoint - user must log in again
    if (flow === 'signin') {
      router.push('/login');
      return;
    }

    setIsResending(true);
    setError('');

    try {
      await authAPI.resendOtp(email.trim());
      toast.showSuccess('OTP resent successfully!');
      setCountdown(60);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass} px-4 py-12`}>
      <div className={`${cardClass} ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8 relative border ${borderClass}`}>
        <Link
          href="/"
          className={`absolute top-4 left-4 p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-lg transition-colors flex items-center gap-2 ${textSecondary} hover:${textPrimary}`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        <div className="text-center mb-6 mt-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <Shield className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>
            {flow === 'signin' ? 'Verify OTP to Sign In' : 'Verify Your Email'}
          </h2>
          <p className={`text-sm ${textSecondary}`}>
            {flow === 'signin'
              ? 'Enter the OTP sent to your email to complete sign in'
              : 'Enter your email and the OTP sent to verify your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {error && (
            <div className={`p-3 ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} border ${isDark ? 'border-rose-800' : 'border-rose-200'} rounded-lg`}>
              <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error}</p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your email"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              OTP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={otp}
              onChange={handleOtpChange}
              className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
              placeholder="0000"
              maxLength={4}
              required
              autoComplete="off"
            />
            <p className={`text-xs mt-1 ${textSecondary}`}>Enter the 4-digit code sent to your email</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            {flow === 'signin' ? (
              <Link href="/login" className="text-[#C2D642] hover:underline font-semibold">
                Back to login
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isResending}
                className={`text-[#C2D642] hover:underline font-semibold disabled:text-slate-400 disabled:cursor-not-allowed disabled:no-underline`}
              >
                {isResending ? 'Sending...' : countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length < 4}
            className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Verify OTP
              </>
            )}
          </button>

          <div className="text-center mt-4">
            <Link
              href="/login"
              className={`text-sm ${textSecondary} hover:text-[#C2D642] transition-colors`}
            >
              {flow === 'signin' ? 'Back to login' : 'Already verified? Sign in'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
