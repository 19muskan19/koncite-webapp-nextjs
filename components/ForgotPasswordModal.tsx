'use client';

import React, { useState } from 'react';
import { X, Mail, Loader2, Lock, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../services/api';
import OtpVerificationModal from './OtpVerificationModal';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'email' | 'otp' | 'password';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.forgotEmail(email);
      toast.showSuccess(response.message || 'OTP sent to your email!');
      setStep('otp');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = (otp?: string) => {
    // OTP has been verified successfully
    setOtpVerified(true);
    setStep('password');
    // Clear any previous errors
    setError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: Check if password is provided
    if (!password || password.trim() === '') {
      setError('Password is required');
      return;
    }

    // Validation: Check minimum length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validation: Check if confirm password is provided
    if (!confirmPassword || confirmPassword.trim() === '') {
      setError('Please confirm your password');
      return;
    }

    // Validation: Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validation: Check if email is still available (should be from previous step)
    if (!email || email.trim() === '') {
      setError('Email is required. Please start over.');
      setStep('email');
      return;
    }

    // Validation: Check if OTP was verified
    if (!otpVerified) {
      setError('Please verify OTP first');
      setStep('otp');
      return;
    }

    setIsLoading(true);

    try {
      // Call API to update password
      const response = await authAPI.forgotPasswordUpdate(email, password);
      toast.showSuccess(response.message || 'Password updated successfully!');
      
      // Reset all fields
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setStep('email');
      setOtpVerified(false);
      
      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update password. Please try again.';
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStep('email');
    setError('');
    setOtpVerified(false);
    onClose();
  };

  return (
    <>
      {step === 'email' && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <div 
            className={`${cardClass} ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 relative border ${borderClass} z-[101]`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>

            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
                <Mail className="w-8 h-8 text-[#C2D642]" />
              </div>
              <h2 className={`text-2xl font-black ${textPrimary} mb-2`}>Forgot Password</h2>
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
            </form>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <OtpVerificationModal
          isOpen={step === 'otp'}
          onClose={() => {
            setStep('email');
            setError('');
            setOtpVerified(false);
          }}
          email={email}
          onVerified={handleOtpVerified}
          isForgotPassword={true}
        />
      )}

      {step === 'password' && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <div 
            className={`${cardClass} ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 relative border ${borderClass} z-[101]`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setStep('otp');
                setError('');
              }}
              className={`absolute top-4 left-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
            >
              <ArrowLeft className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <button
              onClick={handleClose}
              className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
            >
              <X className={`w-5 h-5 ${textSecondary}`} />
            </button>

            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
                <Lock className="w-8 h-8 text-[#C2D642]" />
              </div>
              <h2 className={`text-2xl font-black ${textPrimary} mb-2`}>Set New Password</h2>
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
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${error && !password ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                    placeholder="Enter new password (min. 6 characters)"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {password && password.length < 6 && (
                  <p className="text-xs text-amber-500 mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${error && password !== confirmPassword ? 'border-red-500' : borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                    placeholder="Confirm new password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
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
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ForgotPasswordModal;
