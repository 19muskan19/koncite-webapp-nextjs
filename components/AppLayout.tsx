'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell,
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { MainSidebarProvider } from '@/contexts/MainSidebarContext';
import { authAPI } from '@/services/api';
import { getProfileImageUrl } from '@/utils/imageUtils';
import Sidebar from './Sidebar';

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  
  const SIDEBAR_PIN_KEY = 'koncite-sidebar-pinned';

  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_PIN_KEY) === 'true';
    }
    return false;
  });

  // Initialize sidebar based on screen size - closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint (1024px)
    }
    return false; // Default closed for SSR/mobile-first
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_PIN_KEY, String(sidebarPinned));
    }
  }, [sidebarPinned]);

  // Set initial sidebar state on mount based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    }
  }, []);

  // Auto-close sidebar on smaller screens when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Minimize sidebar when user navigates to AI Finance, AI Hub or Document Management (full-width experience)
  useEffect(() => {
    if (pathname?.startsWith('/ai-finance') || pathname?.startsWith('/ai-agents') || pathname?.startsWith('/document-management')) {
      setSidebarOpen(false);
    }
  }, [pathname]);

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-user-menu]')) return;
      setUserMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-colors duration-500`}>
      {/* Sidebar Component */}
      <Sidebar 
        theme={theme} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        sidebarPinned={sidebarPinned}
        setSidebarPinned={setSidebarPinned}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className={`h-14 flex items-center justify-between px-4 sm:px-6 z-30 transition-all duration-500 ${getThemeClass('header')}`}>
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Logo - always visible, leftmost, above page title row */}
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              />
              <span className={`font-black text-lg sm:text-xl tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>KONCITE</span>
            </Link>
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

            <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 border border-white/5">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[#C2D642]" /> : <Moon className="w-5 h-5 text-[#C2D642]" />}
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10 relative" data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[#C2D642]/30 bg-[#C2D642]/20 flex items-center justify-center">
                  <img
                    src={getProfileImageUrl((user as any)?.profile_image ?? (user as any)?.profile_images ?? (user as any)?.avatar ?? (user as any)?.profile_picture, user?.name || 'User')}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.onerror = null;
                      el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=C2D642&color=fff&size=64`;
                    }}
                  />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-black leading-none">{user?.name || 'User'}</p>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className={`absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-lg shadow-xl z-50 ${
                  theme === 'dark' ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'
                }`}>
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 ${
                      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold hover:bg-white/10 ${
                      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${getThemeClass('theme')} p-3 sm:p-4`}>
          <MainSidebarProvider setSidebarOpen={setSidebarOpen}>
            <div className={`${
              pathname?.startsWith('/ai-finance') || pathname?.startsWith('/ai-agents') || pathname?.startsWith('/document-management') ? 'max-w-full h-full' : 'max-w-[1400px] mx-auto fade-in-premium'
            }`}>
              {children}
            </div>
          </MainSidebarProvider>
        </div>
      </div>
    </div>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutContent>{children}</AppLayoutContent>;
}
