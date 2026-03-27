'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell,
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  Loader2,
  X
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';
import { MainSidebarProvider } from '@/contexts/MainSidebarContext';
import { authAPI, notificationAPI, type CompanyNotification } from '@/services/api';
import { getProfileImageUrl } from '@/utils/imageUtils';
import Sidebar from './Sidebar';

function notificationPrimaryLine(n: CompanyNotification): string {
  const t = n.title ?? n.subject;
  if (typeof t === 'string' && t.trim()) return t.trim();
  const m = n.message ?? n.body;
  if (typeof m === 'string' && m.trim()) return m.trim();
  return 'Notification';
}

function notificationSecondaryLine(n: CompanyNotification): string | null {
  const title = notificationPrimaryLine(n);
  const m = n.message ?? n.body;
  if (typeof m === 'string' && m.trim() && m.trim() !== title) return m.trim();
  return null;
}

/** Backend uses status 0 = unread; 1 = viewed (single); 2 = cleared via “view all”. */
function isUnreadNotification(n: CompanyNotification): boolean {
  const s = n.status;
  return s === 0 || s === '0';
}

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const toast = useToast();
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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CompanyNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const unreadCount = notifications.filter(isUnreadNotification).length;

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const list = await notificationAPI.fetchList();
      setNotifications(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-user-menu]')) return;
      if (target.closest('[data-notifications-panel]')) return;
      setUserMenuOpen(false);
      setNotificationsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsOpen((open) => {
      const next = !open;
      if (next) void loadNotifications();
      return next;
    });
  };

  const handleNotificationClick = async (n: CompanyNotification) => {
    if (!isUnreadNotification(n)) return;
    try {
      await notificationAPI.markViewed(n.id);
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.id) === String(n.id) ? { ...item, status: 1 } : item
        )
      );
    } catch (err: any) {
      toast.showError(err?.message || 'Could not mark notification');
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await notificationAPI.markAllViewed();
      await loadNotifications();
      toast.showSuccess('Notifications updated');
    } catch (err: any) {
      toast.showError(err?.message || 'Could not update notifications');
    }
  };

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

            <div className="relative" data-notifications-panel>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5 ${
                  notificationsOpen ? 'bg-white/10' : ''
                }`}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-0.5 flex items-center justify-center text-[10px] font-black bg-rose-500 text-white rounded-full border-2 border-[#1e293b]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  {/* Mobile: dim background + easy dismiss; avoids clipping and keeps panel in viewport */}
                  <button
                    type="button"
                    aria-label="Close notifications"
                    className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[1px] sm:hidden"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Notifications"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex flex-col overflow-hidden rounded-xl shadow-2xl z-[60] border min-h-0
                      max-sm:fixed max-sm:left-2 max-sm:right-2 max-sm:top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.375rem)]
                      max-sm:max-h-[calc(100dvh-3.85rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.75rem)]
                      max-sm:w-auto max-sm:max-w-none
                      sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[min(calc(100vw-1.5rem),380px)] sm:max-h-[min(70vh,420px)] ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'
                    }`}
                  >
                  <div
                    className={`flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 border-b shrink-0 min-w-0 ${
                      theme === 'dark' ? 'border-slate-600' : 'border-slate-200'
                    }`}
                  >
                    <span className={`text-sm font-black truncate pr-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Notifications
                    </span>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {notifications.length > 0 && unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void handleMarkAllNotifications();
                          }}
                          className="text-[11px] sm:text-xs font-bold text-[#C2D642] hover:underline px-1.5 sm:px-2 py-1 whitespace-nowrap"
                        >
                          <span className="sm:hidden">All read</span>
                          <span className="hidden sm:inline">Mark all</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void loadNotifications();
                        }}
                        className={`text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-1 rounded-lg whitespace-nowrap ${
                          theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setNotificationsOpen(false);
                        }}
                        className={`sm:hidden p-1.5 rounded-lg -mr-1 ${
                          theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0 sm:min-h-[120px] overscroll-y-contain">
                    {notificationsLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#C2D642]" />
                        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          Loading…
                        </span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className={`text-sm text-center py-10 px-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        No notifications yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-inherit">
                        {notifications.map((n) => {
                          const unread = isUnreadNotification(n);
                          const sub = notificationSecondaryLine(n);
                          const created = n.created_at
                            ? new Date(String(n.created_at)).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : null;
                          return (
                            <li key={String(n.id)}>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  void handleNotificationClick(n);
                                }}
                                className={`w-full text-left px-2.5 sm:px-3 py-2.5 sm:py-3 transition-colors ${
                                  unread
                                    ? theme === 'dark'
                                      ? 'bg-[#C2D642]/10 hover:bg-[#C2D642]/15'
                                      : 'bg-[#C2D642]/8 hover:bg-[#C2D642]/12'
                                    : theme === 'dark'
                                      ? 'hover:bg-slate-800/80'
                                      : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {unread && (
                                    <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C2D642] shrink-0" aria-hidden />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-[13px] sm:text-sm font-bold leading-snug break-words ${
                                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                                      }`}
                                    >
                                      {notificationPrimaryLine(n)}
                                    </p>
                                    {sub && (
                                      <p
                                        className={`text-xs mt-0.5 line-clamp-3 break-words ${
                                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                        }`}
                                      >
                                        {sub}
                                      </p>
                                    )}
                                    {created && (
                                      <p
                                        className={`text-[10px] font-semibold mt-1 uppercase tracking-wide ${
                                          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                        }`}
                                      >
                                        {created}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

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
