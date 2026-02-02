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
  ChevronDown,
  Menu,
  Briefcase,
  CreditCard,
  UsersRound,
  FileText,
  Bot,
  Settings,
  LogOut,
  ClipboardList,
  Warehouse
} from 'lucide-react';
import { ViewType, ThemeType } from '@/types';

interface NavItemChild {
  label: string;
  id: ViewType | string;
  path?: string;
  children?: NavItemChild[];
}

interface NavItem {
  id: ViewType | string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: NavItemChild[];
}

interface SidebarProps {
  theme: ThemeType;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ theme, sidebarOpen, setSidebarOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const isDark = theme === 'dark';
  const getThemeClass = (prefix: string) => `${prefix}-${theme}`;

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  const navItems: NavItem[] = [
    { 
      id: ViewType.DASHBOARD, 
      label: 'DASHBOARD', 
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    { 
      id: 'OPERATIONS', 
      label: 'OPERATIONS', 
      icon: ClipboardList,
      children: [
        { label: 'Daily work progress', id: ViewType.DPR, path: '/work-progress-reports/dpr' },
        { label: 'Labours', id: ViewType.LABOUR_MANAGEMENT, path: '/operations/labour' },
        { label: 'Staff', id: ViewType.COMPANY_USERS, path: '/company-users/manage-teams' }
      ] 
    },
    { 
      id: ViewType.DOCUMENT_MANAGEMENT, 
      label: 'DOCUMENT', 
      icon: FileText, 
      path: '/document-management' 
    },
    { 
      id: 'SHIFT_INVENTORY', 
      label: 'INVENTORY', 
      icon: Warehouse,
      children: [
        { label: 'Purchase Requests (PR)', id: ViewType.INVENTORY_PR, path: '/inventory-reports/pr' },
        { label: 'PR Approvals', id: ViewType.PR_APPROVAL_MANAGE, path: '/pr-management/pr-approval-manage' },
        { label: 'RFQ', id: ViewType.INVENTORY_RFQ, path: '/inventory-reports/rfq' },
        { label: 'Purchase Order (PO)', id: 'PO', path: '/inventory-reports/po' },
        { label: 'PO Approvals', id: 'PO_APPROVALS', path: '/inventory-reports/po-approvals' },
        { label: 'Goods Receipt (GRN/MRN)', id: ViewType.INVENTORY_GRN_MRN_SLIP, path: '/inventory-reports/grn-mrn-slip' },
        { label: 'Goods Issue', id: ViewType.INVENTORY_ISSUE_SLIP, path: '/inventory-reports/issue-slip' },
        { label: 'Goods Returns', id: ViewType.INVENTORY_ISSUE_RETURN, path: '/inventory-reports/issue-return' }
      ] 
    },
    { 
      id: ViewType.AI_AGENTS, 
      label: 'AI HUB', 
      icon: Bot, 
      path: '/ai-agents' 
    },
    { 
      id: 'REPORTS', 
      label: 'REPORTS', 
      icon: BarChart3,
      children: [
        { 
          label: 'Work Progress Reports', 
          id: ViewType.WORK_PROGRESS_REPORTS, 
          children: [
            { label: 'Work Progress Details', id: ViewType.WORK_PROGRESS_DETAILS, path: '/work-progress-reports/work-progress-details' },
            { label: 'DPR', id: ViewType.DPR, path: '/work-progress-reports/dpr' },
            { label: 'Resources Usage from DPR', id: ViewType.RESOURCES_USAGE_FROM_DPR, path: '/work-progress-reports/resources-usage-from-dpr' },
            { label: 'Material Used vs Store Issue', id: ViewType.MATERIAL_USED_VS_STORE_ISSUE, path: '/work-progress-reports/material-used-vs-store-issue' }
          ]
        },
        { 
          label: 'Inventory Reports', 
          id: ViewType.INVENTORY_REPORTS, 
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
        }
      ] 
    },
    { 
      id: 'ADMIN', 
      label: 'ADMIN', 
      icon: ShieldCheck,
      children: [
        { 
          label: 'Masters', 
          id: ViewType.MASTERS, 
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
          label: 'User Management', 
          id: ViewType.COMPANY_USERS, 
          children: [
            { label: 'Teams', id: ViewType.MANAGE_TEAMS, path: '/company-users/manage-teams' },
            { label: 'Roles & Permissions', id: ViewType.USER_ROLES_PERMISSIONS, path: '/company-users/user-roles-permissions' },
            { label: 'Project Permissions', id: ViewType.PROJECT_PERMISSIONS, path: '/project-permissions' }
          ]
        },
        { 
          label: 'Workflow Settings', 
          id: 'WORKFLOW_SETTINGS', 
          children: [
            { label: 'PR Approval Manage', id: ViewType.PR_APPROVAL_MANAGE, path: '/pr-management/pr-approval-manage' },
            { label: 'PR', id: ViewType.PR, path: '/pr-management/pr' }
          ]
        }
      ] 
    },
    { 
      id: 'SETTINGS', 
      label: 'SETTINGS', 
      icon: Settings, 
      children: [
        { label: 'Subscriptions and Billing', id: ViewType.SUBSCRIPTION, path: '/subscription' },
        { label: 'Logout', id: 'LOGOUT', path: '#' }
      ] 
    },
  ];

  const isActive = (path?: string) => path && pathname === path;

  const toggleDropdown = (itemId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      // Find the parent of this item (if it's a nested child)
      let parentId: string | null = null;
      for (const item of navItems) {
        if (item.children) {
          const child = item.children.find(child => child.id.toString() === itemId);
          if (child) {
            parentId = item.id.toString();
            break;
          }
        }
      }
      
      if (!newSet.has(itemId)) {
        // If it's a nested child, keep parent open and add this one
        if (parentId) {
          newSet.add(parentId); // Ensure parent stays open
          newSet.add(itemId);
        } else {
          // For top-level items, clear others and add this one
          newSet.clear();
          newSet.add(itemId);
        }
      } else {
        // If clicking the same dropdown, close it
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  // Helper function to find all parent IDs for a given path
  const findParentIdsForPath = (targetPath: string): string[] => {
    const parentIds: string[] = [];
    
    for (const item of navItems) {
      if (item.children) {
        for (const child of item.children) {
          // Check if this child has the target path
          if (child.path === targetPath) {
            parentIds.push(item.id.toString());
            return parentIds;
          }
          // Check nested children
          if (child.children) {
            for (const nestedChild of child.children) {
              if (nestedChild.path === targetPath) {
                parentIds.push(item.id.toString());
                parentIds.push(child.id.toString());
                return parentIds;
              }
              // Check third level children
              if (nestedChild.children) {
                for (const thirdLevelChild of nestedChild.children) {
                  if (thirdLevelChild.path === targetPath) {
                    parentIds.push(item.id.toString());
                    parentIds.push(child.id.toString());
                    parentIds.push(nestedChild.id.toString());
                    return parentIds;
                  }
                }
              }
            }
          }
        }
      }
    }
    return parentIds;
  };

  const handleChildClick = (e: React.MouseEvent, parentId: string, childPath?: string) => {
    // Keep the parent dropdown open when clicking a child item
    e.stopPropagation();
    
    // Find all parent IDs that should stay open
    const parentIdsToKeepOpen = childPath ? findParentIdsForPath(childPath) : [parentId];
    
    // Always keep the parent dropdown open when clicking a child
    // This ensures the dropdown stays open during navigation
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      // Close other dropdowns that aren't in the parent chain
      parentIdsToKeepOpen.forEach(id => newSet.add(id));
      // Remove dropdowns that aren't in the parent chain
      const toRemove: string[] = [];
      newSet.forEach(id => {
        if (!parentIdsToKeepOpen.includes(id)) {
          toRemove.push(id);
        }
      });
        toRemove.forEach(id => newSet.delete(id));
      return newSet;
    });
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Keep dropdowns open based on current pathname - this ensures dropdowns stay open when on child pages
  useEffect(() => {
    // Find all parent IDs for the current path
    const parentIds = findParentIdsForPath(pathname);
    
    if (parentIds.length > 0) {
      setOpenDropdowns(prev => {
        const newSet = new Set(prev);
        // Add all parent IDs
        parentIds.forEach(id => newSet.add(id));
        // Remove dropdowns that aren't in the parent chain
        const toRemove: string[] = [];
        newSet.forEach(id => {
          if (!parentIds.includes(id)) {
            toRemove.push(id);
          }
        });
        toRemove.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [pathname]);

  return (
    <>
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
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#C2D642] border-2 border-inherit rounded-full"></div>
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
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer ${active ? (isDark ? 'text-slate-300 bg-slate-700/50 font-bold' : 'text-slate-700 bg-slate-100 font-bold') : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      onClick={(e) => toggleDropdown(item.id.toString(), e)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${active ? (isDark ? 'text-slate-300' : 'text-slate-700') : ''}`} />
                        {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                      </div>
                      {sidebarOpen && <ChevronDown className={`w-3 h-3 opacity-30 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
                    </div>
                {sidebarOpen && isDropdownOpen && item.children && (
                  <div className="ml-7 mt-1 border-l border-inherit pl-3 space-y-1.5 py-1">
                    {item.children.map((child) => {
                      // Handle Logout button specially
                      if (child.id === 'LOGOUT') {
                        return (
                          <button
                            key={child.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Close sidebar on mobile after logout
                              if (window.innerWidth < 1024) {
                                setSidebarOpen(false);
                              }
                              handleLogout();
                            }}
                            className={`w-full text-left text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors block opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            {child.label}
                          </button>
                        );
                      }
                      // Handle nested children (like Work Progress Reports and Inventory Reports)
                      const hasNestedChildren = child.children && child.children.length > 0;
                      const isNestedDropdownOpen = openDropdowns.has(child.id.toString());
                      
                      if (hasNestedChildren) {
                        return (
                          <div key={child.id} className="space-y-1">
                            <div
                              className={`flex items-center justify-between text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors ${isNestedDropdownOpen ? (isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-700 bg-slate-100') : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(child.id.toString(), e);
                              }}
                            >
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{child.label}</span>
                              <ChevronDown className={`w-3 h-3 opacity-30 transition-transform duration-200 ${isNestedDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isNestedDropdownOpen && child.children && (
                              <div className="ml-4 mt-1 border-l border-inherit pl-3 space-y-1">
                                {child.children.map((nestedChild) => {
                                  // Handle third level nesting (like Masters List)
                                  const hasThirdLevelChildren = nestedChild.children && nestedChild.children.length > 0;
                                  const isThirdLevelOpen = openDropdowns.has(nestedChild.id.toString());
                                  
                                  if (hasThirdLevelChildren) {
                                    return (
                                      <div key={nestedChild.id} className="space-y-1">
                                        <div
                                          className={`flex items-center justify-between text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors ${isThirdLevelOpen ? (isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-700 bg-slate-100') : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDropdown(nestedChild.id.toString(), e);
                                          }}
                                        >
                                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{nestedChild.label}</span>
                                          <ChevronDown className={`w-3 h-3 opacity-30 transition-transform duration-200 ${isThirdLevelOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isThirdLevelOpen && nestedChild.children && (
                                          <div className="ml-4 mt-1 border-l border-inherit pl-3 space-y-1">
                                            {nestedChild.children.map((thirdLevelChild) => {
                                              if (!thirdLevelChild.path) return null;
                                              return (
                                                <Link
                                                  key={thirdLevelChild.id}
                                                  href={thirdLevelChild.path}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChildClick(e, item.id.toString(), thirdLevelChild.path);
                                                  }}
                                                  className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors block ${isActive(thirdLevelChild.path) ? (isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-700 bg-slate-100') : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                >
                                                  {thirdLevelChild.label}
                                                </Link>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  // Render as Link if path exists
                                  if (nestedChild.path) {
                                    return (
                                      <Link
                                        key={nestedChild.id}
                                        href={nestedChild.path}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Keep parent dropdowns open
                                          handleChildClick(e, item.id.toString(), nestedChild.path);
                                          // Close sidebar on mobile after navigation
                                          if (window.innerWidth < 1024) {
                                            setSidebarOpen(false);
                                          }
                                        }}
                                        className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors block ${isActive(nestedChild.path) ? (isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-700 bg-slate-100') : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                      >
                                        {nestedChild.label}
                                      </Link>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (!child.path) return null;
                      return (
                        <Link
                          key={child.id}
                          href={child.path}
                          onClick={(e) => handleChildClick(e, item.id.toString(), child.path)}
                          className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors block ${isActive(child.path) ? (isDark ? 'text-slate-300 bg-slate-700/30' : 'text-slate-700 bg-slate-100') : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
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
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${active ? (isDark ? 'text-slate-300 bg-slate-700/50 font-bold' : 'text-slate-700 bg-slate-100 font-bold') : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${active ? (isDark ? 'text-slate-300' : 'text-slate-700') : ''}`} />
                      {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
