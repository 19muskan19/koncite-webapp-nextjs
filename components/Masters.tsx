'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ThemeType, ViewType } from '../types';
import { 
  Database,
  Building2,
  FolderKanban,
  Layers,
  Package,
  Warehouse,
  Users,
  Wrench,
  Truck,
  Activity,
  Boxes,
  ArrowRight
} from 'lucide-react';

import Companies from './masters/Companies';
import Projects from './masters/Projects';
import Subproject from './masters/Subproject';
import Units from './masters/Units';
import Warehouses from './masters/Warehouses';
import Labours from './masters/Labours';
import AssetsEquipments from './masters/AssetsEquipments';
import Vendors from './masters/Vendors';
import Activities from './masters/Activities';
import Materials from './masters/Materials';

interface MastersProps {
  theme: ThemeType;
  currentView: ViewType;
}

const Masters: React.FC<MastersProps> = ({ theme, currentView }) => {
  const router = useRouter();
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Route to specific master component
  if (currentView === ViewType.COMPANIES) {
    return <Companies theme={theme} />;
  }
  if (currentView === ViewType.PROJECTS) {
    return <Projects theme={theme} />;
  }
  if (currentView === ViewType.SUBPROJECT) {
    return <Subproject theme={theme} />;
  }
  if (currentView === ViewType.UNITS) {
    return <Units theme={theme} />;
  }
  if (currentView === ViewType.WAREHOUSES) {
    return <Warehouses theme={theme} />;
  }
  if (currentView === ViewType.LABOURS) {
    return <Labours theme={theme} />;
  }
  if (currentView === ViewType.ASSETS_EQUIPMENTS) {
    return <AssetsEquipments theme={theme} />;
  }
  if (currentView === ViewType.VENDORS) {
    return <Vendors theme={theme} />;
  }
  if (currentView === ViewType.ACTIVITIES) {
    return <Activities theme={theme} />;
  }
  if (currentView === ViewType.MATERIALS) {
    return <Materials theme={theme} />;
  }

  // Master Data List View (MASTERS)
  const masterDataTypes = [
    { name: 'Companies', icon: Building2, path: '/masters/companies', viewType: ViewType.COMPANIES },
    { name: 'Projects', icon: FolderKanban, path: '/masters/projects', viewType: ViewType.PROJECTS },
    { name: 'Subproject', icon: Layers, path: '/masters/subproject', viewType: ViewType.SUBPROJECT },
    { name: 'Units', icon: Package, path: '/masters/units', viewType: ViewType.UNITS },
    { name: 'Warehouses', icon: Warehouse, path: '/masters/warehouses', viewType: ViewType.WAREHOUSES },
    { name: 'Labours', icon: Users, path: '/masters/labours', viewType: ViewType.LABOURS },
    { name: 'Assets Equipments', icon: Wrench, path: '/masters/assets-equipments', viewType: ViewType.ASSETS_EQUIPMENTS },
    { name: 'Vendors', icon: Truck, path: '/masters/vendors', viewType: ViewType.VENDORS },
    { name: 'Activities', icon: Activity, path: '/masters/activities', viewType: ViewType.ACTIVITIES },
    { name: 'Materials', icon: Boxes, path: '/masters/materials', viewType: ViewType.MATERIALS },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Database className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Master Data</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Select a master data category to manage
            </p>
          </div>
        </div>
      </div>

      {/* Master Data List View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masterDataTypes.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.viewType}
              onClick={() => router.push(item.path)}
              className={`rounded-xl border ${cardClass} p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                isDark ? 'hover:border-[#C2D642]/50' : 'hover:border-[#C2D642]/30'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10 group-hover:bg-[#C2D642]/20' : 'bg-[#C2D642]/5 group-hover:bg-[#C2D642]/10'} transition-colors`}>
                  <ItemIcon className="w-6 h-6 text-[#C2D642]" />
                </div>
                <h3 className={`text-lg font-black ${textPrimary} flex-1`}>{item.name}</h3>
                <ArrowRight className={`w-5 h-5 ${textSecondary} group-hover:text-[#C2D642] group-hover:translate-x-1 transition-all`} />
              </div>
              <p className={`text-sm ${textSecondary}`}>
                Manage {item.name.toLowerCase()} information and details
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Masters;
