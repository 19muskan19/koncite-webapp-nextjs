'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell,
  Menu,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { authAPI } from '@/services/api';
import Sidebar from './Sidebar';

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
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
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">

            <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 border border-white/5">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#C2D642]" /> : <Moon className="w-4 h-4 text-[#C2D642]" />}
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden md:block">
                <p className="text-[12px] font-black leading-none">{user?.name || 'User'}</p>
                <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">System Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-bold">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${getThemeClass('theme')} p-4`}>
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
