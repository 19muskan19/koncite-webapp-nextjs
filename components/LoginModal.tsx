'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, LogIn, Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, mergeLoginFailurePayload } from '../services/api';
import { EMAIL_INVALID_MESSAGE, isValidEmailAddress } from '../utils/emailValidation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  signUpHref?: string;
  onRequiresOtp?: (email: string) => void;
}

/** Sign-in rejected: account exists but email not verified → offer OTP (signup) flow */
function isUnverifiedEmailLoginError(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  const aboutEmail = m.includes('email') || m.includes('e-mail') || m.includes('mail id');
  if (m.includes('unverified')) return true;
  if (m.includes('not verified') && aboutEmail) return true;
  if (m.includes('not been verified')) return true;
  if (m.includes('verify') && aboutEmail) return true;
  if (m.includes('verification') && aboutEmail) return true;
  if (m.includes('must verify')) return true;
  if (m.includes('verify your account')) return true;
  if (m.includes('email verification')) return true;
  if (m.includes('pending verification')) return true;
  if (m.includes('complete verification')) return true;
  return false;
}

function firstStringFromErrors(errs: unknown): string | null {
  if (!errs || typeof errs !== 'object') return null;
  for (const key of Object.keys(errs as Record<string, unknown>)) {
    const v = (errs as Record<string, unknown>)[key];
    if (Array.isArray(v) && v[0] != null) return String(v[0]).trim();
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function normalizeApiMessage(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
  return '';
}

function getLoginFailureText(error: any): string {
  const errs = error?.errors;
  const fromBag = firstStringFromErrors(errs);
  const errData = error?.response?.data || {};
  const dataMsg = normalizeApiMessage(errData.message);
  const msg =
    dataMsg ||
    (typeof error?.message === 'string' ? error.message.trim() : '');
  const genericMessage =
    !msg ||
    /^the given data was invalid\.?$/i.test(msg) ||
    msg === 'Login failed' ||
    /^request failed with status code \d+$/i.test(msg);
  if (fromBag && genericMessage) return fromBag;
  if (msg) return msg;
  if (fromBag) return fromBag;
  return 'Login failed. Please check your credentials and try again.';
}

/** Message from a "successful" HTTP login response that may still describe a failure */
function messageFromLoginResponse(response: any): string {
  if (!response) return '';
  const direct = normalizeApiMessage(response.message);
  if (direct) return direct;
  if (response.data && typeof response.data === 'object') {
    const dm = normalizeApiMessage((response.data as { message?: unknown }).message);
    if (dm) return dm;
    const bag = firstStringFromErrors((response.data as { errors?: unknown }).errors);
    if (bag) return bag;
  }
  const topBag = firstStringFromErrors(response.errors);
  if (topBag) return topBag;
  return '';
}

function emailForOtpFromPayload(apiData: unknown, formEmail: string): string {
  if (apiData && typeof apiData === 'object' && typeof (apiData as { email?: string }).email === 'string') {
    const e = (apiData as { email: string }).email.trim();
    if (e) return e;
  }
  return formEmail.trim();
}

/** Matches Laravel sign-in payload e.g. status false + message + data.otp_verify false */
function shouldOfferEmailVerification(message: string, apiData: unknown): boolean {
  if (isUnverifiedEmailLoginError(message)) return true;
  if (apiData && typeof apiData === 'object' && (apiData as { otp_verify?: boolean }).otp_verify === false) {
    return true;
  }
  return false;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, signUpHref, onRequiresOtp }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showVerifyEmailCta, setShowVerifyEmailCta] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setShowVerifyEmailCta(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const redirectToSignupOtp = (otpEmail: string) => {
    if (typeof window === 'undefined') return;
    const trimmed = otpEmail.trim();
    if (!trimmed) return;
    localStorage.setItem('pendingVerificationEmail', trimmed);
    setPassword('');
    try {
      toast.showSuccess('Opening email verification…');
    } catch {
      /* navigation must not depend on toast */
    }
    const path = `/verify-otp?email=${encodeURIComponent(trimmed)}&flow=signup`;
    window.location.replace(new URL(path, window.location.origin).href);
  };

  const redirectToSigninOtp = (otpEmail: string) => {
    if (typeof window === 'undefined') return;
    const trimmed = otpEmail.trim();
    if (!trimmed) return;
    const path = `/verify-otp?email=${encodeURIComponent(trimmed)}&flow=signin`;
    window.location.replace(new URL(path, window.location.origin).href);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowVerifyEmailCta(false);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    if (!isValidEmailAddress(trimmedEmail)) {
      setError(EMAIL_INVALID_MESSAGE);
      toast.showWarning(EMAIL_INVALID_MESSAGE);
      return;
    }
    setIsLoading(true);

    try {
      const response = await authAPI.login(trimmedEmail, password);

      const requiresOtp = response?.data?.requires_otp_verification === true || response?.requires_otp_verification === true;
      const twoFactorEmail = response?.data?.email || response?.email || trimmedEmail;

      if (requiresOtp && twoFactorEmail) {
        toast.showSuccess(response.message || 'OTP sent to your email. Please verify to complete login.');
        if (onRequiresOtp) {
          onRequiresOtp(twoFactorEmail);
        } else {
          redirectToSigninOtp(twoFactorEmail);
        }
        setEmail('');
        setPassword('');
        setIsLoading(false);
        return;
      }

      const loginMessage = messageFromLoginResponse(response);
      const hasToken = !!(response?.data?.token || (response as { token?: string }).token);
      const payload =
        mergeLoginFailurePayload(response as unknown as Record<string, unknown>) ?? response?.data;
      const verifyEmailTarget = emailForOtpFromPayload(payload, trimmedEmail);
      if (!hasToken && !requiresOtp && shouldOfferEmailVerification(loginMessage, payload) && verifyEmailTarget) {
        setError(loginMessage || 'Please verify your email to continue.');
        setEmail(verifyEmailTarget);
        setShowVerifyEmailCta(true);
        redirectToSignupOtp(verifyEmailTarget);
        setIsLoading(false);
        return;
      }

      toast.showSuccess(response.message || 'Login successful!');
      onLogin(trimmedEmail, password);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      const errorMessage = getLoginFailureText(error);
      const payload =
        mergeLoginFailurePayload(error as unknown as Record<string, unknown>) ??
        mergeLoginFailurePayload(
          error?.response?.data && typeof error.response.data === 'object'
            ? (error.response.data as Record<string, unknown>)
            : undefined
        ) ??
        error?.data;
      const verifyEmailTarget = emailForOtpFromPayload(payload, trimmedEmail);

      if (shouldOfferEmailVerification(errorMessage, payload) && verifyEmailTarget) {
        setError(errorMessage || 'Please verify your email to continue.');
        setEmail(verifyEmailTarget);
        setShowVerifyEmailCta(true);
        redirectToSignupOtp(verifyEmailTarget);
        return;
      }

      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 relative border ${borderClass}`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 z-10 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
          title="Close"
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <LogIn className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl font-black ${textPrimary} mb-2`}>Welcome Back</h2>
          <p className={`text-sm ${textSecondary}`}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {error && (
            <div
              className={`p-3 rounded-lg space-y-3 ${
                showVerifyEmailCta
                  ? isDark
                    ? 'bg-amber-950/50 border border-amber-600/50'
                    : 'bg-amber-50 border border-amber-200'
                  : isDark
                    ? 'bg-rose-900/20 border border-rose-800'
                    : 'bg-rose-50 border border-rose-200'
              }`}
            >
              <p
                className={`text-sm ${
                  showVerifyEmailCta
                    ? isDark
                      ? 'text-amber-100'
                      : 'text-amber-900'
                    : isDark
                      ? 'text-rose-400'
                      : 'text-rose-600'
                }`}
              >
                {error}
              </p>
              {showVerifyEmailCta && (
                <button
                  type="button"
                  onClick={() => redirectToSignupOtp(email.trim())}
                  className="w-full px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-[#C2D642] text-white hover:bg-[#A8B838] shadow-md"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden />
                  Verify Email
                </button>
              )}
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setShowVerifyEmailCta(false);
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
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-12 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter your password"
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-[#C2D642] rounded" />
              <span className={textSecondary}>Remember me</span>
            </label>
            <a
              href="/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C2D642] hover:underline font-semibold cursor-pointer"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#C2D642] hover:bg-[#A8B838] disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className={`mt-6 pt-6 border-t ${borderClass}`}>
          <p className={`text-sm text-center ${textSecondary}`}>
            Don't have an account?{' '}
            {signUpHref ? (
              <Link href={signUpHref} className="text-[#C2D642] hover:underline font-semibold">
                Sign Up
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openSignupModal'));
                  }
                }}
                className="text-[#C2D642] hover:underline font-semibold"
              >
                Sign Up
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
