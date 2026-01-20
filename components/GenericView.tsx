import React from 'react';
import { ThemeType, ViewType } from '../types';
import { 
  Users, 
  ShieldCheck, 
  ClipboardCheck, 
  BarChart3, 
  UsersRound,
  Briefcase,
  CreditCard,
  UserCog,
  FileText,
  TrendingUp,
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

interface GenericViewProps {
  theme: ThemeType;
  currentView: ViewType;
}

const GenericView: React.FC<GenericViewProps> = ({ theme, currentView }) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const getViewConfig = () => {
    switch (currentView) {
      case ViewType.COMPANY_USERS:
      case ViewType.MANAGE_TEAMS:
        return {
          title: currentView === ViewType.COMPANY_USERS ? 'Company Users' : 'Manage Teams',
          icon: Users,
          description: 'Manage company users and team assignments',
          columns: ['Name', 'Email', 'Role', 'Team', 'Status'],
          sampleData: [
            { name: 'John Doe', email: 'john.doe@company.com', role: 'Project Manager', team: 'Team Alpha', status: 'Active' },
            { name: 'Jane Smith', email: 'jane.smith@company.com', role: 'Site Engineer', team: 'Team Beta', status: 'Active' },
          ]
        };
      case ViewType.USER_ROLES_PERMISSIONS:
        return {
          title: 'User Roles and Permissions',
          icon: ShieldCheck,
          description: 'Configure user roles and their permissions',
          columns: ['Role Name', 'Description', 'Users', 'Permissions', 'Status'],
          sampleData: [
            { name: 'Admin', description: 'Full system access', users: '5', permissions: 'All', status: 'Active' },
            { name: 'Project Manager', description: 'Project management access', users: '12', permissions: 'Project, Reports', status: 'Active' },
          ]
        };
      case ViewType.PROJECT_PERMISSIONS:
        return {
          title: 'Project Permissions',
          icon: ShieldCheck,
          description: 'Manage project-level access and permissions',
          columns: ['Project', 'User/Role', 'Permission Type', 'Access Level', 'Status'],
          sampleData: [
            { project: 'Residential Complex A', userRole: 'John Doe', type: 'Read/Write', level: 'Full', status: 'Active' },
            { project: 'Commercial Tower B', userRole: 'Jane Smith', type: 'Read Only', level: 'Limited', status: 'Active' },
          ]
        };
      case ViewType.PR_MANAGEMENT:
      case ViewType.PR_APPROVAL_MANAGE:
        return {
          title: currentView === ViewType.PR_MANAGEMENT ? 'PR Management' : 'PR Approval Manage',
          icon: ClipboardCheck,
          description: 'Manage purchase requisitions and approvals',
          columns: ['PR Number', 'Requested By', 'Department', 'Amount', 'Status'],
          sampleData: [
            { prNumber: 'PR-2024-001', requestedBy: 'John Doe', department: 'Construction', amount: '$15,000', status: 'Pending Approval' },
            { prNumber: 'PR-2024-002', requestedBy: 'Jane Smith', department: 'Procurement', amount: '$8,500', status: 'Approved' },
          ]
        };
      case ViewType.PR:
        return {
          title: 'PR',
          icon: FileText,
          description: 'Purchase requisition details and management',
          columns: ['PR Number', 'Date', 'Items', 'Total Amount', 'Status'],
          sampleData: [
            { prNumber: 'PR-2024-001', date: '2024-01-15', items: '5', amount: '$15,000', status: 'Pending' },
            { prNumber: 'PR-2024-002', date: '2024-01-20', items: '3', amount: '$8,500', status: 'Approved' },
          ]
        };
      case ViewType.REPORTS:
      case ViewType.WORK_PROGRESS_REPORTS:
        return {
          title: currentView === ViewType.REPORTS ? 'Reports' : 'Work Progress Reports',
          icon: BarChart3,
          description: 'View and generate work progress reports',
          columns: ['Report Name', 'Project', 'Period', 'Progress', 'Status'],
          sampleData: [
            { reportName: 'Weekly Progress - Week 1', project: 'Residential Complex A', period: 'Jan 1-7', progress: '45%', status: 'Completed' },
            { reportName: 'Monthly Summary - January', project: 'Commercial Tower B', period: 'Jan 2024', progress: '78%', status: 'In Progress' },
          ]
        };
      case ViewType.INVENTORY_REPORTS:
        return {
          title: 'Inventory Reports',
          icon: Package,
          description: 'Generate and view inventory reports',
          columns: ['Report Name', 'Warehouse', 'Date', 'Items Count', 'Status'],
          sampleData: [
            { reportName: 'Monthly Inventory - Jan', warehouse: 'Main Warehouse', date: '2024-01-31', itemsCount: '250', status: 'Generated' },
            { reportName: 'Stock Level Report', warehouse: 'Storage Facility B', date: '2024-02-01', itemsCount: '180', status: 'Generated' },
          ]
        };
      case ViewType.LABOUR_STRENGTH:
        return {
          title: 'Labour Strength',
          icon: UsersRound,
          description: 'View labour workforce strength and statistics',
          columns: ['Trade', 'Total Workers', 'Available', 'Assigned', 'Skill Level'],
          sampleData: [
            { trade: 'Carpenters', total: '45', available: '12', assigned: '33', skillLevel: 'Mixed' },
            { trade: 'Electricians', total: '28', available: '8', assigned: '20', skillLevel: 'Expert' },
          ]
        };
      case ViewType.WORK_CONTRACTOR:
        return {
          title: 'Work Contractor',
          icon: Briefcase,
          description: 'Manage contractors and their work assignments',
          columns: ['Contractor Name', 'Code', 'Specialization', 'Projects', 'Status'],
          sampleData: [
            { name: 'ABC Contractors Ltd', code: 'CON001', specialization: 'Civil Works', projects: '3', status: 'Active' },
            { name: 'XYZ Builders Inc', code: 'CON002', specialization: 'Electrical', projects: '2', status: 'Active' },
          ]
        };
      case ViewType.SUBSCRIPTION:
        return {
          title: 'Subscription',
          icon: CreditCard,
          description: 'Manage subscription plans and billing',
          columns: ['Plan Name', 'Features', 'Price', 'Users', 'Status'],
          sampleData: [
            { planName: 'Enterprise Plan', features: 'All Features', price: '$999/month', users: 'Unlimited', status: 'Active' },
            { planName: 'Professional Plan', features: 'Standard Features', price: '$499/month', users: '50', status: 'Active' },
          ]
        };
      default:
        return {
          title: 'View',
          icon: FileText,
          description: 'View details',
          columns: [],
          sampleData: []
        };
    }
  };

  const config = getViewConfig();
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

      {/* Search and Filter Bar */}
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

      {/* Data Table */}
      {config.sampleData.length > 0 ? (
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
                {config.sampleData.map((row, rowIdx) => (
                  <tr key={rowIdx} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    {Object.values(row).map((cell, cellIdx) => (
                      <td key={cellIdx} className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                        {cell}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}>
                        <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Icon className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Data Available</h3>
          <p className={`text-sm ${textSecondary}`}>Start by adding your first entry</p>
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

export default GenericView;
