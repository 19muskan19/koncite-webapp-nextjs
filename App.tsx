
import React, { useState, useEffect } from 'react';
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
  UserPlus,
  Briefcase,
  CreditCard,
  UsersRound,
  FileText,
  Bot
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Masters from './components/Masters';
import GenericView from './components/GenericView';
import HomePage from './components/HomePage';
import LoginModal from './components/LoginModal';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ViewType, ThemeType } from './types';

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState<Set<ViewType>>(new Set());

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (email: string, password: string) => {
    // Credentials are validated in LoginModal
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', email);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
  };

  const toggleDropdown = (itemId: ViewType) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <HomePage 
          onLoginClick={() => setShowLoginModal(true)} 
          onBookDemo={() => setShowLoginModal(true)}
          onNavigateToAbout={() => {
            setTimeout(() => {
              const aboutSection = document.getElementById('about');
              if (aboutSection) {
                aboutSection.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }}
        />
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      </>
    );
  }

  const navItems = [
    { 
      id: ViewType.DASHBOARD, 
      label: 'DASHBOARD', 
      icon: LayoutDashboard, 
      children: [{ label: 'Performance Summary', id: ViewType.DASHBOARD }] 
    },
    { 
      id: ViewType.MASTERS, 
      label: 'MASTER DATA', 
      icon: Database, 
      children: [
        { label: 'Companies', id: ViewType.COMPANIES },
        { label: 'Projects', id: ViewType.PROJECTS },
        { label: 'Subproject', id: ViewType.SUBPROJECT },
        { label: 'Units', id: ViewType.UNITS },
        { label: 'Warehouses', id: ViewType.WAREHOUSES },
        { label: 'Labours', id: ViewType.LABOURS },
        { label: 'Assets Equipments', id: ViewType.ASSETS_EQUIPMENTS },
        { label: 'Vendors', id: ViewType.VENDORS },
        { label: 'Activities', id: ViewType.ACTIVITIES },
        { label: 'Materials', id: ViewType.MATERIALS }
      ] 
    },
    { 
      id: ViewType.COMPANY_USERS, 
      label: 'COMPANY USERS', 
      icon: Users, 
      children: [
        { label: 'Manage Teams', id: ViewType.MANAGE_TEAMS },
        { label: 'User Roles and Permissions', id: ViewType.USER_ROLES_PERMISSIONS }
      ] 
    },
    { 
      id: ViewType.PROJECT_PERMISSIONS, 
      label: 'PROJECT PERMISSIONS', 
      icon: ShieldCheck, 
      children: [
        { label: 'Project Permissions', id: ViewType.PROJECT_PERMISSIONS }
      ] 
    },
    { 
      id: ViewType.PR_MANAGEMENT, 
      label: 'PR MANAGEMENT', 
      icon: ClipboardCheck, 
      children: [
        { label: 'PR Approval Manage', id: ViewType.PR_APPROVAL_MANAGE },
        { label: 'PR', id: ViewType.PR }
      ] 
    },
    { 
      id: ViewType.WORK_PROGRESS_REPORTS, 
      label: 'WORK PROGRESS REPORTS', 
      icon: BarChart3, 
      children: [
        { label: 'Work Progress Details', id: ViewType.WORK_PROGRESS_DETAILS },
        { label: 'DPR', id: ViewType.DPR },
        { label: 'Resources Usage from DPR', id: ViewType.RESOURCES_USAGE_FROM_DPR },
        { label: 'Material Used vs Store Issue', id: ViewType.MATERIAL_USED_VS_STORE_ISSUE }
      ] 
    },
    { 
      id: ViewType.INVENTORY_REPORTS, 
      label: 'INVENTORY REPORTS', 
      icon: BarChart3, 
      children: [
        { label: 'PR', id: ViewType.INVENTORY_PR },
        { label: 'RFQ', id: ViewType.INVENTORY_RFQ },
        { label: 'GRN(MRN) Slip', id: ViewType.INVENTORY_GRN_MRN_SLIP },
        { label: 'GRN(MRN) Details', id: ViewType.INVENTORY_GRN_MRN_DETAILS },
        { label: 'Issue Slip', id: ViewType.INVENTORY_ISSUE_SLIP },
        { label: 'Issue(Outward) Details', id: ViewType.INVENTORY_ISSUE_OUTWARD_DETAILS },
        { label: 'Issue Return', id: ViewType.INVENTORY_ISSUE_RETURN },
        { label: 'Global Stock Details', id: ViewType.INVENTORY_GLOBAL_STOCK_DETAILS },
        { label: 'Project Stock Statement', id: ViewType.INVENTORY_PROJECT_STOCK_STATEMENT }
      ] 
    },
    { id: ViewType.LABOUR_STRENGTH, label: 'LABOUR STRENGTH', icon: UsersRound },
    { id: ViewType.WORK_CONTRACTOR, label: 'WORK CONTRACTOR', icon: Briefcase },
    { id: ViewType.LABOUR_MANAGEMENT, label: 'LABOUR MANAGEMENT', icon: UserCog },
    { id: ViewType.DOCUMENT_MANAGEMENT, label: 'DOCUMENT MANAGEMENT', icon: FileText },
    { id: ViewType.AI_AGENTS, label: 'AI AGENTS', icon: Bot },
    { id: ViewType.SUBSCRIPTION, label: 'SUBSCRIPTION', icon: CreditCard },
  ];

  const getThemeClass = (prefix: string) => `${prefix}-${theme}`;

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-colors duration-500`}>
      {/* Sidebar - Pro Construction/SaaS Style */}
      <aside className={`w-64 flex flex-col transition-all duration-300 ${getThemeClass('sidebar')} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
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
            const isDropdownOpen = openDropdowns.has(item.id);
            const hasChildren = item.children && item.children.length > 0;
            
            return (
              <div key={item.id} className="mb-3">
                <div 
                  className={`flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer ${currentView === item.id && !hasChildren ? 'text-indigo-500 bg-indigo-500/10 font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) {
                      toggleDropdown(item.id);
                    } else {
                      setCurrentView(item.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${currentView === item.id && !hasChildren ? 'text-indigo-500' : ''}`} />
                    {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                  </div>
                  {sidebarOpen && hasChildren && (
                    <ChevronDown className={`w-3 h-3 opacity-30 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>
                {sidebarOpen && hasChildren && isDropdownOpen && (
                  <div className="ml-7 mt-1 border-l border-inherit pl-3 space-y-1.5 py-1">
                    {item.children.map((child, idx) => (
                      <div 
                        key={idx} 
                        className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors ${currentView === child.id ? 'text-indigo-500 bg-indigo-500/5' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentView(child.id);
                        }}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-14 flex items-center justify-between px-6 z-10 transition-all duration-500 ${getThemeClass('header')}`}>
          <div className="flex items-center gap-6">
          </div>

          <div className="flex items-center gap-4">
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

        <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${getThemeClass('theme')}`}>
          <div className="max-w-[1400px] mx-auto fade-in-premium">
            {currentView === ViewType.DASHBOARD ? (
              <Dashboard theme={theme} />
            ) : [
              ViewType.MASTERS,
              ViewType.COMPANIES,
              ViewType.PROJECTS,
              ViewType.SUBPROJECT,
              ViewType.UNITS,
              ViewType.WAREHOUSES,
              ViewType.LABOURS,
              ViewType.ASSETS_EQUIPMENTS,
              ViewType.VENDORS,
              ViewType.ACTIVITIES,
              ViewType.MATERIALS
            ].includes(currentView) ? (
              <Masters theme={theme} currentView={currentView} />
            ) : [
              ViewType.COMPANY_USERS,
              ViewType.MANAGE_TEAMS,
              ViewType.USER_ROLES_PERMISSIONS,
              ViewType.PROJECT_PERMISSIONS,
              ViewType.PR_MANAGEMENT,
              ViewType.PR_APPROVAL_MANAGE,
              ViewType.PR,
              ViewType.REPORTS,
              ViewType.WORK_PROGRESS_REPORTS,
              ViewType.WORK_PROGRESS_DETAILS,
              ViewType.DPR,
              ViewType.RESOURCES_USAGE_FROM_DPR,
              ViewType.MATERIAL_USED_VS_STORE_ISSUE,
              ViewType.INVENTORY_REPORTS,
              ViewType.INVENTORY_PR,
              ViewType.INVENTORY_RFQ,
              ViewType.INVENTORY_GRN_MRN_SLIP,
              ViewType.INVENTORY_GRN_MRN_DETAILS,
              ViewType.INVENTORY_ISSUE_SLIP,
              ViewType.INVENTORY_ISSUE_OUTWARD_DETAILS,
              ViewType.INVENTORY_ISSUE_RETURN,
              ViewType.INVENTORY_GLOBAL_STOCK_DETAILS,
              ViewType.INVENTORY_PROJECT_STOCK_STATEMENT,
              ViewType.LABOUR_STRENGTH,
              ViewType.WORK_CONTRACTOR,
              ViewType.LABOUR_MANAGEMENT,
              ViewType.DOCUMENT_MANAGEMENT,
              ViewType.AI_AGENTS,
              ViewType.SUBSCRIPTION
            ].includes(currentView) ? (
              <GenericView theme={theme} currentView={currentView} />
            ) : (
              <Dashboard theme={theme} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
