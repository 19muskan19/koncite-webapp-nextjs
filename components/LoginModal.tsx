import React, { useState } from 'react';
import { X, LogIn, Mail, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hardcoded credentials: email = "abc", password = "abc"
    if (email === 'abc' && password === 'abc') {
      onLogin(email, password);
      setEmail('');
      setPassword('');
      onClose();
    } else {
      setError('Invalid email or password. Please use email: abc and password: abc');
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
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10'} rounded-full mb-4`}>
            <LogIn className="w-8 h-8 text-[#6B8E23]" />
          </div>
          <h2 className={`text-2xl font-black ${textPrimary} mb-2`}>Welcome Back</h2>
          <p className={`text-sm ${textSecondary}`}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'} border ${isDark ? 'border-rose-800' : 'border-rose-200'} rounded-lg`}>
              <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error}</p>
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
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent outline-none`}
                placeholder="Enter your email"
                required
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent outline-none`}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-[#6B8E23] rounded" />
              <span className={textSecondary}>Remember me</span>
            </label>
            <button type="button" className="text-[#6B8E23] hover:underline font-semibold">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-[#6B8E23] hover:bg-[#5a7a1d] text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </button>
        </form>

        <div className={`mt-6 pt-6 border-t ${borderClass}`}>
          <p className={`text-xs text-center ${textSecondary}`}>
            Demo credentials: email: <span className="font-mono font-bold">abc</span>, password: <span className="font-mono font-bold">abc</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
