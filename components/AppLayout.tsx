'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Sun,
  LogOut,
  User
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { authAPI } from '@/services/api';
import Sidebar from './Sidebar';

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  
  // Initialize sidebar based on screen size - closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint (1024px)
    }
    return false; // Default closed for SSR/mobile-first
  });

  // Set initial sidebar state on mount based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    }
  }, []);

  const handleLogout = async () => {
    const { removeCookie } = require('../utils/cookies');
    try {
      // Call logout API
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear cookies and local storage
      removeCookie('auth_token');
      removeCookie('isAuthenticated');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
      // Redirect to home
      router.push('/');
    }
  };

  const getThemeClass = (prefix: string) => `${prefix}-${theme}`;

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-colors duration-500`}>
      {/* Sidebar Component */}
      <Sidebar 
        theme={theme} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className={`h-14 flex items-center justify-between px-4 sm:px-6 z-30 transition-all duration-500 ${getThemeClass('header')}`}>
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Mobile: Hamburger leftmost, then logo, then KONCITE */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              />
              <span className={`font-black text-lg sm:text-xl tracking-tight pt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                KONCITE
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

            <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 border border-white/5">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[#C2D642]" /> : <Moon className="w-5 h-5 text-[#C2D642]" />}
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10" ref={userMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5"
                >
                  <p className="text-sm font-black leading-none truncate max-w-[120px] sm:max-w-none">{user?.name || user?.email || 'User'}</p>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className={`absolute top-full right-0 mt-1 w-56 rounded-lg shadow-xl border z-50 overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="py-1">
                      <Link
                        href="/user-profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/10 transition-colors text-left ${theme === 'dark' ? 'text-slate-100 hover:bg-slate-700' : 'text-slate-900 hover:bg-slate-100'}`}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm font-semibold">User Profile</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-bold">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${getThemeClass('theme')} p-3 sm:p-4`}>
          <div className={`${
            pathname === '/ai-agents' || pathname === '/document-management' ? 'max-w-full h-full' : 'max-w-[1400px] mx-auto fade-in-premium'
          }`}>
            {children}
          </div>
        </div>
      </div>

    </div>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutContent>{children}</AppLayoutContent>;
}
