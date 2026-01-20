
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  ShieldCheck, 
  ClipboardCheck, 
  BarChart3, 
  UserCog,
  MessageSquare,
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Sun,
  Search,
  Zap,
  Plus
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import AICoach from './components/AICoach';
import { ViewType, ThemeType } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      children: [{ label: 'Global Health Standards', id: ViewType.MASTERS }] 
    },
    { 
      id: ViewType.USER_MANAGEMENT, 
      label: 'PATIENT PORTAL', 
      icon: Users, 
      children: [{ label: 'User Directory', id: ViewType.USER_MANAGEMENT }] 
    },
    { id: ViewType.PROJECT_PERMISSIONS, label: 'ACCESS CONTROL', icon: ShieldCheck },
    { id: ViewType.PR_MANAGEMENT, label: 'PROTOCOLS', icon: ClipboardCheck },
    { id: ViewType.REPORTS, label: 'ANALYTICS', icon: BarChart3 },
    { id: ViewType.LABOUR_MANAGEMENT, label: 'SYSTEM OPS', icon: UserCog },
    { id: ViewType.AI_COACH, label: 'PULSE AI COACH', icon: MessageSquare },
  ];

  const getThemeClass = (prefix: string) => `${prefix}-${theme}`;

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
          {navItems.map((item) => (
            <div key={item.id} className="mb-3">
              <div 
                className={`flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer ${currentView === item.id ? 'text-indigo-500 bg-indigo-500/10 font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                onClick={() => setCurrentView(item.id)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-indigo-500' : ''}`} />
                  {sidebarOpen && <span className="text-[11px] font-extrabold tracking-tight uppercase">{item.label}</span>}
                </div>
                {sidebarOpen && item.children && <ChevronDown className="w-3 h-3 opacity-30" />}
              </div>
              {sidebarOpen && item.children && (
                <div className="ml-7 mt-1 border-l border-inherit pl-3 space-y-1.5 py-1">
                  {item.children.map((child, idx) => (
                    <div 
                      key={idx} 
                      className={`text-[11px] font-bold py-1 px-2 rounded-md cursor-pointer transition-colors ${currentView === child.id ? 'text-indigo-500 bg-indigo-500/5' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      onClick={() => setCurrentView(child.id)}
                    >
                      {child.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-inherit">
           <div className={`p-4 rounded-xl border border-dashed border-inherit ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-500/5'}`}>
              <p className="text-[10px] font-bold mb-2 opacity-60 uppercase">System Status</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-black">ALL SYSTEMS NOMINAL</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-14 flex items-center justify-between px-6 z-10 transition-all duration-500 ${getThemeClass('header')}`}>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Zap className="text-white w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm tracking-tight leading-none">PULSE AI</span>
                  <span className="text-[9px] font-bold opacity-50 tracking-[0.2em] uppercase">Intelligence Platform</span>
                </div>
             </div>
             
             <div className="h-6 w-px bg-white/10 mx-2"></div>
             
             <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
              <input 
                type="text" 
                placeholder="Search metrics, reports..." 
                className="bg-white/10 border border-white/5 rounded-full px-10 py-1.5 text-xs focus:ring-2 focus:ring-white/10 outline-none w-64 placeholder:opacity-40 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-md">
              <Plus className="w-3.5 h-3.5" /> NEW ENTRY
            </button>

            <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 border border-white/5">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative border border-white/5">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1e293b]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right hidden md:block">
                <p className="text-[12px] font-black leading-none">Dr. Niharika V.</p>
                <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">System Administrator</p>
              </div>
              <ChevronDown className="w-3 h-3 opacity-30" />
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${getThemeClass('theme')}`}>
          <div className="max-w-[1400px] mx-auto fade-in-premium">
            {currentView === ViewType.DASHBOARD ? <Dashboard theme={theme} /> : <AICoach />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
