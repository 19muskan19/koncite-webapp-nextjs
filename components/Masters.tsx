import React, { useState } from 'react';
import { ThemeType, ViewType } from '../types';
import { 
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
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  DollarSign,
  ChevronDown
} from 'lucide-react';

interface MastersProps {
  theme: ThemeType;
  currentView: ViewType;
}

const Masters: React.FC<MastersProps> = ({ theme, currentView }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Available projects for selection
  const availableProjects = [
    { name: 'Residential Complex A', code: 'PRJ001' },
    { name: 'Commercial Tower B', code: 'PRJ002' },
    { name: 'Highway Infrastructure Project', code: 'PRJ003' },
    { name: 'Shopping Mall Development', code: 'PRJ004' },
  ];

  const getMasterDataConfig = () => {
    switch (currentView) {
      case ViewType.COMPANIES:
        return {
          title: 'Companies',
          icon: Building2,
          description: 'Manage company information and details',
          columns: ['Company Name', 'Code', 'Address', 'Contact', 'Status'],
          sampleData: [
            { 
              name: 'ABC Construction Ltd', 
              code: 'ABC001', 
              address: '123 Main Street, New York, NY 10001', 
              contact: '+1-234-567-8900',
              email: 'contact@abcconstruction.com',
              logo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=128',
              status: 'Active',
              projects: 12,
              employees: 245
            },
            { 
              name: 'XYZ Builders Inc', 
              code: 'XYZ002', 
              address: '456 Oak Avenue, Los Angeles, CA 90001',
              contact: '+1-234-567-8901',
              email: 'info@xyzbuilders.com',
              logo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=128',
              status: 'Active',
              projects: 8,
              employees: 180
            },
            { 
              name: 'Premier Infrastructure Group', 
              code: 'PIG003', 
              address: '789 Business Park, Chicago, IL 60601',
              contact: '+1-234-567-8902',
              email: 'hello@premierinfra.com',
              logo: 'https://ui-avatars.com/api/?name=Premier+Infrastructure&background=f59e0b&color=fff&size=128',
              status: 'Active',
              projects: 15,
              employees: 320
            },
            { 
              name: 'Elite Construction Solutions', 
              code: 'ECS004', 
              address: '321 Commerce Drive, Houston, TX 77001',
              contact: '+1-234-567-8903',
              email: 'contact@eliteconstruction.com',
              logo: 'https://ui-avatars.com/api/?name=Elite+Construction&background=ef4444&color=fff&size=128',
              status: 'Active',
              projects: 6,
              employees: 95
            },
          ],
          useCards: true
        };
      case ViewType.PROJECTS:
        return {
          title: 'Projects',
          icon: FolderKanban,
          description: 'Manage construction projects and their details',
          columns: ['Project Name', 'Code', 'Company', 'Start Date', 'Status'],
          sampleData: [
            { 
              name: 'Residential Complex A', 
              code: 'PRJ001', 
              company: 'ABC Construction Ltd',
              companyLogo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64',
              startDate: '2024-01-15',
              endDate: '2024-12-31',
              status: 'In Progress',
              progress: 65,
              budget: '$15,000,000',
              location: 'New York, NY',
              logo: 'https://ui-avatars.com/api/?name=Residential+Complex&background=6366f1&color=fff&size=128',
              teamSize: 45
            },
            { 
              name: 'Commercial Tower B', 
              code: 'PRJ002', 
              company: 'XYZ Builders Inc',
              companyLogo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64',
              startDate: '2024-02-20',
              endDate: '2025-06-30',
              status: 'Planning',
              progress: 15,
              budget: '$25,000,000',
              location: 'Los Angeles, CA',
              logo: 'https://ui-avatars.com/api/?name=Commercial+Tower&background=10b981&color=fff&size=128',
              teamSize: 32
            },
            { 
              name: 'Highway Infrastructure Project', 
              code: 'PRJ003', 
              company: 'Premier Infrastructure Group',
              companyLogo: 'https://ui-avatars.com/api/?name=Premier+Infrastructure&background=f59e0b&color=fff&size=64',
              startDate: '2024-03-01',
              endDate: '2025-11-15',
              status: 'In Progress',
              progress: 42,
              budget: '$45,000,000',
              location: 'Chicago, IL',
              logo: 'https://ui-avatars.com/api/?name=Highway+Infrastructure&background=f59e0b&color=fff&size=128',
              teamSize: 78
            },
            { 
              name: 'Shopping Mall Development', 
              code: 'PRJ004', 
              company: 'Elite Construction Solutions',
              companyLogo: 'https://ui-avatars.com/api/?name=Elite+Construction&background=ef4444&color=fff&size=64',
              startDate: '2024-01-10',
              endDate: '2024-10-20',
              status: 'In Progress',
              progress: 78,
              budget: '$18,500,000',
              location: 'Houston, TX',
              logo: 'https://ui-avatars.com/api/?name=Shopping+Mall&background=ef4444&color=fff&size=128',
              teamSize: 56
            },
          ],
          useCards: true
        };
      case ViewType.SUBPROJECT:
        // Filter subprojects based on selected project
        const allSubprojects = [
          { name: 'Foundation Work', code: 'SUB001', project: 'Residential Complex A', manager: 'John Doe', status: 'Active', progress: 85, startDate: '2024-01-20', endDate: '2024-03-15' },
          { name: 'Structural Framework', code: 'SUB002', project: 'Residential Complex A', manager: 'John Doe', status: 'In Progress', progress: 60, startDate: '2024-03-16', endDate: '2024-06-30' },
          { name: 'Plumbing Installation', code: 'SUB003', project: 'Residential Complex A', manager: 'Mike Johnson', status: 'Pending', progress: 0, startDate: '2024-07-01', endDate: '2024-08-15' },
          { name: 'Electrical Installation', code: 'SUB004', project: 'Commercial Tower B', manager: 'Jane Smith', status: 'In Progress', progress: 45, startDate: '2024-02-25', endDate: '2024-05-20' },
          { name: 'HVAC System', code: 'SUB005', project: 'Commercial Tower B', manager: 'Jane Smith', status: 'Pending', progress: 0, startDate: '2024-05-21', endDate: '2024-07-10' },
          { name: 'Interior Finishing', code: 'SUB006', project: 'Commercial Tower B', manager: 'Sarah Williams', status: 'Pending', progress: 0, startDate: '2024-07-11', endDate: '2024-09-30' },
          { name: 'Road Construction', code: 'SUB007', project: 'Highway Infrastructure Project', manager: 'Robert Brown', status: 'Active', progress: 70, startDate: '2024-03-05', endDate: '2024-08-31' },
          { name: 'Bridge Construction', code: 'SUB008', project: 'Highway Infrastructure Project', manager: 'Robert Brown', status: 'In Progress', progress: 35, startDate: '2024-04-01', endDate: '2024-10-15' },
          { name: 'Drainage System', code: 'SUB009', project: 'Highway Infrastructure Project', manager: 'David Lee', status: 'Pending', progress: 0, startDate: '2024-09-01', endDate: '2024-11-30' },
          { name: 'Site Preparation', code: 'SUB010', project: 'Shopping Mall Development', manager: 'Emily Davis', status: 'Completed', progress: 100, startDate: '2024-01-10', endDate: '2024-02-28' },
          { name: 'Retail Space Construction', code: 'SUB011', project: 'Shopping Mall Development', manager: 'Emily Davis', status: 'In Progress', progress: 55, startDate: '2024-03-01', endDate: '2024-07-31' },
          { name: 'Parking Structure', code: 'SUB012', project: 'Shopping Mall Development', manager: 'Chris Wilson', status: 'In Progress', progress: 40, startDate: '2024-03-15', endDate: '2024-08-20' },
        ];
        
        const filteredSubprojects = selectedProject 
          ? allSubprojects.filter(sub => sub.project === selectedProject)
          : [];

        return {
          title: 'Subproject',
          icon: Layers,
          description: 'Manage subprojects within main projects',
          columns: ['Subproject Name', 'Code', 'Project', 'Manager', 'Status'],
          sampleData: filteredSubprojects,
          allSubprojects: allSubprojects,
          selectedProject: selectedProject
        };
      case ViewType.UNITS:
        return {
          title: 'Units',
          icon: Package,
          description: 'Manage measurement units and conversions',
          columns: ['Unit Name', 'Code', 'Type', 'Base Unit', 'Conversion Factor'],
          sampleData: [
            { name: 'Meter', code: 'M', type: 'Length', baseUnit: 'Meter', factor: '1' },
            { name: 'Kilogram', code: 'KG', type: 'Weight', baseUnit: 'Gram', factor: '1000' },
          ]
        };
      case ViewType.WAREHOUSES:
        return {
          title: 'Warehouses',
          icon: Warehouse,
          description: 'Manage warehouse locations and inventory',
          columns: ['Warehouse Name', 'Code', 'Location', 'Capacity', 'Status'],
          sampleData: [
            { name: 'Main Warehouse', code: 'WH001', location: 'Site A', capacity: '5000 sqft', status: 'Active' },
            { name: 'Storage Facility B', code: 'WH002', location: 'Site B', capacity: '3000 sqft', status: 'Active' },
          ]
        };
      case ViewType.LABOURS:
        return {
          title: 'Labours',
          icon: Users,
          description: 'Manage labour workforce and assignments',
          columns: ['Name', 'ID', 'Trade', 'Skill Level', 'Status'],
          sampleData: [
            { name: 'Rajesh Kumar', id: 'LAB001', trade: 'Carpenter', skillLevel: 'Expert', status: 'Available' },
            { name: 'Mohammed Ali', id: 'LAB002', trade: 'Electrician', skillLevel: 'Intermediate', status: 'Assigned' },
          ]
        };
      case ViewType.ASSETS_EQUIPMENTS:
        return {
          title: 'Assets Equipments',
          icon: Wrench,
          description: 'Manage construction equipment and assets',
          columns: ['Equipment Name', 'Code', 'Type', 'Condition', 'Location'],
          sampleData: [
            { name: 'Excavator CAT 320', code: 'EQ001', type: 'Heavy Machinery', condition: 'Good', location: 'Site A' },
            { name: 'Crane Tower 50T', code: 'EQ002', type: 'Lifting Equipment', condition: 'Excellent', location: 'Site B' },
          ]
        };
      case ViewType.VENDORS:
        return {
          title: 'Vendors',
          icon: Truck,
          description: 'Manage vendor information and contracts',
          columns: ['Vendor Name', 'Code', 'Category', 'Contact', 'Rating'],
          sampleData: [
            { name: 'Steel Suppliers Co', code: 'VEN001', category: 'Materials', contact: '+1-234-567-8902', rating: '4.5' },
            { name: 'Equipment Rentals Ltd', code: 'VEN002', category: 'Equipment', contact: '+1-234-567-8903', rating: '4.8' },
          ]
        };
      case ViewType.ACTIVITIES:
        return {
          title: 'Activities',
          icon: Activity,
          description: 'Manage project activities and tasks',
          columns: ['Activity Name', 'Code', 'Project', 'Duration', 'Status'],
          sampleData: [
            { name: 'Site Preparation', code: 'ACT001', project: 'Residential Complex A', duration: '15 days', status: 'Completed' },
            { name: 'Foundation Pouring', code: 'ACT002', project: 'Residential Complex A', duration: '5 days', status: 'In Progress' },
          ]
        };
      case ViewType.MATERIALS:
        return {
          title: 'Materials',
          icon: Boxes,
          description: 'Manage construction materials inventory',
          columns: ['Material Name', 'Code', 'Category', 'Unit', 'Stock'],
          sampleData: [
            { name: 'Cement OPC 53', code: 'MAT001', category: 'Building Materials', unit: 'Bag', stock: '500' },
            { name: 'Steel Rebar 12mm', code: 'MAT002', category: 'Steel', unit: 'Ton', stock: '25' },
          ]
        };
      default:
        return {
          title: 'Master Data',
          icon: Building2,
          description: 'Select a master data category from the sidebar',
          columns: [],
          sampleData: []
        };
    }
  };

  const config = getMasterDataConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}>
            <Icon className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>{config.title}</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              {config.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} shadow-md`}>
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Project Selector for Subprojects */}
      {currentView === ViewType.SUBPROJECT && (
        <div className={`p-6 rounded-xl border ${cardClass}`}>
          <div className="flex items-center gap-4">
            <FolderKanban className={`w-5 h-5 ${textSecondary}`} />
            <div className="flex-1">
              <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${textSecondary}`}>
                Select Project
              </label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } border focus:ring-2 focus:ring-indigo-500/20 outline-none pr-10`}
                >
                  <option value="">-- Select a Project --</option>
                  {availableProjects.map((project, idx) => (
                    <option key={idx} value={project.name}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
              </div>
              {selectedProject && (
                <p className={`mt-3 text-sm ${textSecondary}`}>
                  Showing subprojects for <span className={`font-black ${textPrimary}`}>{selectedProject}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar - Only show for Subprojects when project is selected, or for other views */}
      {currentView === ViewType.SUBPROJECT ? (
        selectedProject && (
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input 
                type="text" 
                placeholder="Search subprojects..." 
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-indigo-500/20 outline-none`}
              />
            </div>
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        )
      ) : (
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search..." 
              className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-indigo-500/20 outline-none`}
            />
          </div>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      )}

      {/* Companies Cards View */}
      {currentView === ViewType.COMPANIES && config.sampleData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.sampleData.map((company: any, idx: number) => (
            <div 
              key={idx} 
              className={`rounded-xl border ${cardClass} p-6 hover:shadow-lg transition-all duration-300 ${isDark ? 'hover:border-indigo-500/50' : 'hover:border-indigo-300'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500/20 flex-shrink-0">
                    <img 
                      src={company.logo} 
                      alt={company.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-black ${textPrimary} mb-1 truncate`}>{company.name}</h3>
                    <p className={`text-xs font-bold ${textSecondary} uppercase tracking-wider`}>Code: {company.code}</p>
                  </div>
                </div>
                <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                  <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm ${textSecondary} line-clamp-2`}>{company.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm font-bold ${textPrimary}`}>{company.contact}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm ${textSecondary} truncate`}>{company.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-inherit">
                <div className="flex items-center gap-4">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Projects</p>
                    <p className={`text-lg font-black ${textPrimary}`}>{company.projects}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Employees</p>
                    <p className={`text-lg font-black ${textPrimary}`}>{company.employees}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  company.status === 'Active' 
                    ? 'bg-emerald-500/20 text-emerald-500' 
                    : 'bg-slate-500/20 text-slate-500'
                }`}>
                  {company.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : currentView === ViewType.PROJECTS && config.sampleData.length > 0 ? (
        /* Projects Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.sampleData.map((project: any, idx: number) => (
            <div 
              key={idx} 
              className={`rounded-xl border ${cardClass} p-6 hover:shadow-lg transition-all duration-300 ${isDark ? 'hover:border-indigo-500/50' : 'hover:border-indigo-300'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500/20 flex-shrink-0">
                    <img 
                      src={project.logo} 
                      alt={project.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=6366f1&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-black ${textPrimary} mb-1 truncate`}>{project.name}</h3>
                    <p className={`text-xs font-bold ${textSecondary} uppercase tracking-wider`}>Code: {project.code}</p>
                  </div>
                </div>
                <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                  <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <Building2 className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
                  <div className="flex items-center gap-2">
                    <img 
                      src={project.companyLogo} 
                      alt={project.company}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.company)}&background=6366f1&color=fff&size=64`;
                      }}
                    />
                    <p className={`text-sm font-bold ${textPrimary}`}>{project.company}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className={`w-4 h-4 mt-0.5 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm ${textSecondary}`}>{project.location}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm ${textSecondary}`}>
                    {project.startDate} - {project.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
                  <p className={`text-sm font-bold ${textPrimary}`}>{project.budget}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Progress</span>
                  <span className={`text-sm font-black ${textPrimary}`}>{project.progress}%</span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-inherit">
                <div className="flex items-center gap-4">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Team Size</p>
                    <p className={`text-lg font-black ${textPrimary}`}>{project.teamSize}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  project.status === 'In Progress' 
                    ? 'bg-indigo-500/20 text-indigo-500'
                    : project.status === 'Planning'
                    ? 'bg-amber-500/20 text-amber-500'
                    : project.status === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-slate-500/20 text-slate-500'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : currentView === ViewType.SUBPROJECT && !selectedProject ? (
        /* No project selected message for Subprojects */
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <FolderKanban className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Select a Project</h3>
          <p className={`text-sm ${textSecondary}`}>Please select a project from the dropdown above to view its subprojects</p>
        </div>
      ) : config.sampleData.length > 0 ? (
        /* Data Table for other views */
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  {config.columns.map((col, idx) => (
                    <th key={idx} className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                      {col}
                    </th>
                  ))}
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {config.sampleData.map((row: any, rowIdx: number) => {
                  // Map column names to row values, excluding card-specific fields
                  const getCellValue = (colName: string) => {
                    const colMap: { [key: string]: string } = {
                      'Company Name': row.name || '',
                      'Code': row.code || '',
                      'Address': row.address || '',
                      'Contact': row.contact || '',
                      'Status': row.status || '',
                      'Project Name': row.name || '',
                      'Company': row.company || '',
                      'Start Date': row.startDate || '',
                      'Subproject Name': row.name || '',
                      'Project': row.project || '',
                      'Manager': row.manager || '',
                      'Unit Name': row.name || '',
                      'Type': row.type || '',
                      'Base Unit': row.baseUnit || '',
                      'Conversion Factor': row.factor || '',
                      'Warehouse Name': row.name || '',
                      'Location': row.location || '',
                      'Capacity': row.capacity || '',
                      'Name': row.name || '',
                      'ID': row.id || '',
                      'Trade': row.trade || '',
                      'Skill Level': row.skillLevel || '',
                      'Equipment Name': row.name || '',
                      'Condition': row.condition || '',
                      'Vendor Name': row.name || '',
                      'Category': row.category || '',
                      'Rating': row.rating || '',
                      'Activity Name': row.name || '',
                      'Duration': row.duration || '',
                      'Material Name': row.name || '',
                      'Unit': row.unit || '',
                      'Stock': row.stock || ''
                    };
                    return colMap[colName] || '';
                  };
                  
                  return (
                    <tr key={rowIdx} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                      {config.columns.map((col, colIdx) => (
                        <td key={colIdx} className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                          {getCellValue(col)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : currentView === ViewType.SUBPROJECT && selectedProject && config.sampleData.length === 0 ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Layers className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Subprojects Found</h3>
          <p className={`text-sm ${textSecondary}`}>No subprojects found for <span className={`font-black ${textPrimary}`}>{selectedProject}</span></p>
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first {config.title.toLowerCase()} entry</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{config.sampleData.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-emerald-500`}>{config.sampleData.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>
    </div>
  );
};

export default Masters;
