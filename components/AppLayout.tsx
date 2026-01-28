'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  ShieldCheck, 
  ClipboardCheck, 
  BarChart3, 
  UserCog,
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Sun,
  LogOut,
  Briefcase,
  CreditCard,
  UsersRound,
  FileText,
  Bot
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ViewType } from '@/types';

interface NavItem {
  id: ViewType | string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: { label: string; id: ViewType | string; path: string }[];
}

const AppLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  // Initialize sidebar based on screen size - closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint (1024px)
    }
    return false; // Default closed for SSR/mobile-first
  });
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  // Set initial sidebar state on mount based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  const toggleDropdown = (itemId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      // Close all other dropdowns when opening a new one
      if (!newSet.has(itemId)) {
        newSet.clear();
        newSet.add(itemId);
      } else {
        // If clicking the same dropdown, close it
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleChildClick = (e: React.MouseEvent, parentId: string) => {
    // Keep the parent dropdown open when clicking a child item
    e.stopPropagation();
    // Always keep the parent dropdown open when clicking a child
    // This ensures the dropdown stays open during navigation
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.clear(); // Close other dropdowns
      newSet.add(parentId); // Keep this dropdown open
      return newSet;
    });
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    // The useEffect will also maintain this state when pathname changes
  };

  const navItems: NavItem[] = [
    { 
      id: ViewType.DASHBOARD, 
      label: 'DASHBOARD', 
      icon: LayoutDashboard,
      path: '/dashboard',
      children: [{ label: 'Performance Summary', id: ViewType.DASHBOARD, path: '/dashboard' }] 
    },
    { 
      id: ViewType.MASTERS, 
      label: 'MASTER DATA', 
      icon: Database, 
      children: [
        { label: 'Companies', id: ViewType.COMPANIES, path: '/masters/companies' },
        { label: 'Projects', id: ViewType.PROJECTS, path: '/masters/projects' },
        { label: 'Subproject', id: ViewType.SUBPROJECT, path: '/masters/subproject' },
        { label: 'Units', id: ViewType.UNITS, path: '/masters/units' },
        { label: 'Warehouses', id: ViewType.WAREHOUSES, path: '/masters/warehouses' },
        { label: 'Labours', id: ViewType.LABOURS, path: '/masters/labours' },
        { label: 'Assets Equipments', id: ViewType.ASSETS_EQUIPMENTS, path: '/masters/assets-equipments' },
        { label: 'Vendors', id: ViewType.VENDORS, path: '/masters/vendors' },
        { label: 'Activities', id: ViewType.ACTIVITIES, path: '/masters/activities' },
        { label: 'Materials', id: ViewType.MATERIALS, path: '/masters/materials' }
      ] 
    },
    { 
      id: ViewType.COMPANY_USERS, 
      label: 'COMPANY USERS', 
      icon: Users, 
      children: [
        { label: 'Manage Teams', id: ViewType.MANAGE_TEAMS, path: '/company-users/manage-teams' },
        { label: 'User Roles and Permissions', id: ViewType.USER_ROLES_PERMISSIONS, path: '/company-users/user-roles-permissions' }
      ] 
    },
    { 
      id: ViewType.PROJECT_PERMISSIONS, 
      label: 'PROJECT PERMISSIONS', 
      icon: ShieldCheck, 
      children: [
        { label: 'Project Permissions', id: ViewType.PROJECT_PERMISSIONS, path: '/project-permissions' }
      ] 
    },
    { 
      id: ViewType.PR_MANAGEMENT, 
      label: 'PR MANAGEMENT', 
      icon: ClipboardCheck, 
      children: [
        { label: 'PR Approval Manage', id: ViewType.PR_APPROVAL_MANAGE, path: '/pr-management/pr-approval-manage' },
        { label: 'PR', id: ViewType.PR, path: '/pr-management/pr' }
      ] 
    },
    { 
      id: ViewType.WORK_PROGRESS_REPORTS, 
      label: 'WORK PROGRESS REPORTS', 
      icon: BarChart3, 
      children: [
        { label: 'Work Progress Details', id: ViewType.WORK_PROGRESS_DETAILS, path: '/work-progress-reports/work-progress-details' },
        { label: 'DPR', id: ViewType.DPR, path: '/work-progress-reports/dpr' },
        { label: 'Resources Usage from DPR', id: ViewType.RESOURCES_USAGE_FROM_DPR, path: '/work-progress-reports/resources-usage-from-dpr' },
        { label: 'Material Used vs Store Issue', id: ViewType.MATERIAL_USED_VS_STORE_ISSUE, path: '/work-progress-reports/material-used-vs-store-issue' }
      ] 
    },
    { 
      id: ViewType.INVENTORY_REPORTS, 
      label: 'INVENTORY REPORTS', 
      icon: BarChart3, 
      children: [
        { label: 'PR', id: ViewType.INVENTORY_PR, path: '/inventory-reports/pr' },
        { label: 'RFQ', id: ViewType.INVENTORY_RFQ, path: '/inventory-reports/rfq' },
        { label: 'GRN(MRN) Slip', id: ViewType.INVENTORY_GRN_MRN_SLIP, path: '/inventory-reports/grn-mrn-slip' },
        { label: 'GRN(MRN) Details', id: ViewType.INVENTORY_GRN_MRN_DETAILS, path: '/inventory-reports/grn-mrn-details' },
        { label: 'Issue Slip', id: ViewType.INVENTORY_ISSUE_SLIP, path: '/inventory-reports/issue-slip' },
        { label: 'Issue(Outward) Details', id: ViewType.INVENTORY_ISSUE_OUTWARD_DETAILS, path: '/inventory-reports/issue-outward-details' },
        { label: 'Issue Return', id: ViewType.INVENTORY_ISSUE_RETURN, path: '/inventory-reports/issue-return' },
        { label: 'Global Stock Details', id: ViewType.INVENTORY_GLOBAL_STOCK_DETAILS, path: '/inventory-reports/global-stock-details' },
        { label: 'Project Stock Statement', id: ViewType.INVENTORY_PROJECT_STOCK_STATEMENT, path: '/inventory-reports/project-stock-statement' }
      ] 
    },
    // { id: ViewType.LABOUR_STRENGTH, label: 'LABOUR STRENGTH', icon: UsersRound, path: '/labour-strength' },
    // { id: ViewType.WORK_CONTRACTOR, label: 'WORK CONTRACTOR', icon: Briefcase, path: '/work-contractor' },
    { id: ViewType.LABOUR_MANAGEMENT, label: 'LABOUR MANAGEMENT', icon: UserCog, path: '/labour-management' },
    { id: ViewType.DOCUMENT_MANAGEMENT, label: 'DOCUMENT MANAGEMENT', icon: FileText, path: '/document-management' },
    { id: ViewType.AI_AGENTS, label: 'AI AGENTS', icon: Bot, path: '/ai-agents' },
    { id: ViewType.SUBSCRIPTION, label: 'SUBSCRIPTION', icon: CreditCard, path: '/subscription' },
  ];

  const getThemeClass = (prefix: string) => `${prefix}-${theme}`;
  const isActive = (path?: string) => path && pathname === path;

  // Keep dropdowns open based on current pathname - this ensures dropdowns stay open when on child pages
  useEffect(() => {
    // Find which parent menu item has an active child
    const activeParent = navItems.find((item) => {
      if (item.children) {
        return item.children.some(child => isActive(child.path));
      }
      return false;
    });

    if (activeParent) {
      setOpenDropdowns(prev => {
        // If the correct dropdown is already open, keep it open
        if (prev.has(activeParent.id.toString())) {
          // Just ensure other dropdowns are closed
          const newSet = new Set(prev);
          if (newSet.size > 1) {
            newSet.clear();
            newSet.add(activeParent.id.toString());
            return newSet;
          }
          return prev;
        } else {
          // Open the correct dropdown and close others
          const newSet = new Set<string>();
          newSet.add(activeParent.id.toString());
          return newSet;
        }
      });
    }
  }, [pathname]);

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-colors duration-500`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} flex flex-col transition-all duration-300 ${getThemeClass('sidebar')} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${!sidebarOpen ? 'lg:border-r border-inherit' : ''} ${!sidebarOpen ? 'hidden lg:flex' : 'flex'} fixed lg:static z-50 h-full`}>
        <div className="p-4 flex flex-col gap-4 border-b border-inherit">
          <div className="flex items-center gap-3 px-1">
            <div className="relative">
              <img src="https://picsum.photos/seed/doc/100/100" alt="Avatar" className="w-10 h-10 rounded-xl border border-inherit object-cover" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-inherit rounded-full"></div>
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm truncate">Dr. Niharika V.</p>
                <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">Chief Admin</p>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors">
              <Menu className="w-4 h-4 opacity-60" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-4 space-y-1">
          {navItems.map((item) => {
            const isDropdownOpen = openDropdowns.has(item.id.toString());
            const hasChildren = item.children && item.children.length > 0;
            const itemPath = item.path || (hasChildren ? item.children![0].path : '');
            const active = isActive(itemPath) || (hasChildren && item.children?.some(child => isActive(child.path)));
            
            return (
              <div key={item.id} className="mb-3">
                {hasChildren ? (
                  <>
                    <div 
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer ${active ? 'text-indigo-500 bg-indigo-500/10 font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      onClick={(e) => toggleDropdown(item.id.toString(), e)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${active ? 'text-indigo-500' : ''}`} />
                        {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                      </div>
                      {sidebarOpen && <ChevronDown className={`w-3 h-3 opacity-30 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
                    </div>
                {sidebarOpen && isDropdownOpen && item.children && (
                  <div className="ml-7 mt-1 border-l border-inherit pl-3 space-y-1.5 py-1">
                    {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.path}
                            onClick={(e) => handleChildClick(e, item.id.toString())}
                            className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors block ${isActive(child.path) ? 'text-indigo-500 bg-indigo-500/5' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.path || '#'}
                    onClick={() => {
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${active ? 'text-indigo-500 bg-indigo-500/10 font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${active ? 'text-indigo-500' : ''}`} />
                      {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

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
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden md:block">
                <p className="text-[12px] font-black leading-none">Dr. Niharika V.</p>
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
