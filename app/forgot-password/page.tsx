'use client';

import React, { useState } from 'react';
import { Mail, Loader2, ArrowLeft, Lock, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { authAPI } from '@/services/api';
import Link from 'next/link';
import OtpVerificationModal from '@/components/OtpVerificationModal';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';
  const bgClass = isDark ? 'bg-[#0a0a0a]' : 'bg-slate-50';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.forgotEmail(email);
      toast.showSuccess(response.message || 'OTP sent to your email!');
      setShowOtpModal(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.forgotPasswordUpdate(email, password);
      toast.showSuccess(response.message || 'Password updated successfully!');
      
      // Reset and redirect
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setStep('email');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update password. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen flex items-center justify-center ${bgClass} px-4 py-12`}>
        {step === 'email' && (
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
                <Mail className="w-8 h-8 text-[#C2D642]" />
              </div>
              <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>Forgot Password</h2>
              <p className={`text-sm ${textSecondary}`}>Enter your email to receive an OTP</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {error && (
                <div className={`p-3 ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} border ${isDark ? 'border-rose-800' : 'border-rose-200'} rounded-lg`}>
                  <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Email ID
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
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send OTP
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <Link
                  href="/"
                  className={`text-sm ${textSecondary} hover:text-[#C2D642] transition-colors`}
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        )}

        {step === 'password' && (
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
                <Lock className="w-8 h-8 text-[#C2D642]" />
              </div>
              <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>Set New Password</h2>
              <p className={`text-sm ${textSecondary}`}>Enter your new password</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {error && (
                <div className={`p-3 ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} border ${isDark ? 'border-rose-800' : 'border-rose-200'} rounded-lg`}>
                  <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || password.length < 6 || password !== confirmPassword}
                className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Update Password
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <Link
                  href="/"
                  className={`text-sm ${textSecondary} hover:text-[#C2D642] transition-colors`}
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>

      {showOtpModal && (
        <OtpVerificationModal
          isOpen={showOtpModal}
          onClose={() => {
            setShowOtpModal(false);
            setStep('email');
          }}
          email={email}
          onVerified={handleOtpVerified}
          isForgotPassword={true}
        />
      )}
    </>
  );
}
