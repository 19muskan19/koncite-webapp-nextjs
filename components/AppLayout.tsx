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
        <header className={`relative h-14 flex items-center justify-between gap-2 px-3 sm:px-6 z-40 transition-all duration-500 overflow-visible ${getThemeClass('header')}`}>
          {/* Left: Hamburger (mobile) + Logo + KONCITE */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
              <img 
                src="/logo.png" 
                alt="Koncite" 
                className="w-7 h-7 sm:w-9 sm:h-9 object-contain flex-shrink-0"
              />
              <span className={`font-black text-sm sm:text-xl tracking-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                KONCITE
              </span>
            </Link>
          </div>

          {/* Right: Theme toggle, Bell, User menu, Logout */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 min-w-0">
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5 flex-shrink-0" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#C2D642]" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#C2D642]" />}
            </button>

            <button className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5 flex-shrink-0" aria-label="Notifications">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4 border-l border-white/10 flex-shrink-0 min-w-0" ref={userMenuRef}>
              <div className="relative min-w-0">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5 min-w-0 max-w-full"
                >
                  <p className="text-xs sm:text-sm font-black leading-none truncate max-w-[95px] sm:max-w-[160px] md:max-w-none" title={user?.name || user?.email || 'User'}>
                    {user?.name || user?.email || 'User'}
                  </p>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className={`absolute top-full right-0 mt-1 w-44 rounded-lg shadow-xl border z-[100] overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="py-0.5">
                      <Link
                        href="/user-profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`w-full flex items-center gap-1.5 px-3 py-2 hover:bg-white/10 transition-colors text-left ${theme === 'dark' ? 'text-slate-100 hover:bg-slate-700' : 'text-slate-900 hover:bg-slate-100'}`}
                      >
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs font-semibold">User Profile</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-bold">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className={`relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${getThemeClass('theme')} p-3 sm:p-4 z-0`}>
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
