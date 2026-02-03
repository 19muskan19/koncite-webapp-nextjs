'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Loader2, Mail } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../services/api';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified?: (otp?: string) => void;
  isForgotPassword?: boolean;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  email,
  onVerified,
  isForgotPassword = false
}) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isOpen]);

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setOtp(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setIsLoading(true);

    try {
      let response;
      if (isForgotPassword) {
        response = await authAPI.verifyForgotPasswordOtp(email, otp);
      } else {
        response = await authAPI.verifyOtp(email, otp);
        
        // Store token if provided - handle Laravel response format
        const token = response.data?.token || response.token || response.access_token;
        if (token) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('isAuthenticated', 'true');
          
          // Extract user data and dispatch event
          const user = response.data?.user || response.user;
          if (user && typeof window !== 'undefined') {
            console.log('OTP Modal: Dispatching userLoggedIn event with user:', user);
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
          }
        }
      }

      toast.showSuccess(response.message || 'OTP verified successfully!');
      
      // Clear pending verification email
      localStorage.removeItem('pendingVerificationEmail');
      
      // Call onVerified callback with OTP (needed for forgot password flow)
      if (onVerified) {
        onVerified(otp);
      }
      
      // Close modal
      setOtp('');
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    setError('');

    try {
      if (isForgotPassword) {
        await authAPI.forgotEmail(email);
      } else {
        await authAPI.resendOtp(email);
      }
      
      toast.showSuccess('OTP resent successfully!');
      setCountdown(60); // 60 second countdown
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 relative border ${borderClass}`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <Shield className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl font-black ${textPrimary} mb-2`}>
            {isForgotPassword ? 'Verify OTP' : 'Verify Your Email'}
          </h2>
          <p className={`text-sm ${textSecondary} mb-2`}>
            {isForgotPassword 
              ? 'Enter the OTP sent to your email'
              : 'We\'ve sent a verification code to'
            }
          </p>
          <div className="flex items-center justify-center gap-2">
            <Mail className="w-4 h-4 text-[#C2D642]" />
            <p className={`text-sm font-semibold ${textPrimary}`}>{email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} border ${isDark ? 'border-rose-800' : 'border-rose-200'} rounded-lg`}>
              <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error}</p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Enter OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={handleOtpChange}
              className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
            <p className={`text-xs mt-1 ${textSecondary}`}>Enter the 6-digit code sent to your email</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={countdown > 0 || isResending}
              className={`text-[#C2D642] hover:underline font-semibold disabled:text-slate-400 disabled:cursor-not-allowed disabled:no-underline`}
            >
              {isResending ? (
                'Sending...'
              ) : countdown > 0 ? (
                `Resend OTP in ${countdown}s`
              ) : (
                'Resend OTP'
              )}
            </button>
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
        </form>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
