'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ThemeType } from '../types';
// Added MessageSquare to imports
import { TrendingUp, Activity, Users, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';

interface DashboardProps {
  theme: ThemeType;
}

const goalData = [
  { name: 'Mon', completion: 65, target: 80 },
  { name: 'Tue', completion: 72, target: 80 },
  { name: 'Wed', completion: 85, target: 80 },
  { name: 'Thu', completion: 78, target: 80 },
  { name: 'Fri', completion: 92, target: 80 },
  { name: 'Sat', completion: 60, target: 80 },
  { name: 'Sun', completion: 70, target: 80 },
];

const activitySplit = [
  { name: 'Strength', value: 45, color: '#6366f1' },
  { name: 'Cardio', value: 30, color: '#10b981' },
  { name: 'Mobility', value: 15, color: '#f59e0b' },
  { name: 'Rest', value: 10, color: '#64748b' },
];

const macroData = [
  { name: 'Protein', current: 145, target: 160 },
  { name: 'Carbs', current: 230, target: 250 },
  { name: 'Fats', current: 65, target: 70 },
];

const MetricCard: React.FC<{ 
  title: string; 
  value: string; 
  change: string; 
  isPositive: boolean; 
  icon: React.ElementType; 
  theme: ThemeType 
}> = ({ title, value, change, isPositive, icon: Icon, theme }) => (
  <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'card-dark' : 'card-light'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
        <Icon className="w-5 h-5 text-[#6B8E23]" />
      </div>
      <div className={`flex items-center gap-1 text-[11px] font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{change}
      </div>
    </div>
    <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.1em] mb-1">{title}</p>
    <h3 className="text-2xl font-black tracking-tight">{value}</h3>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? '#f8fafc' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight">System Performance Overview</h1>
          <p className="text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1">Real-time construction management analytics</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black opacity-40">AUTO-REFRESH IN 12S</span>
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </div>

      {/* Top Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard theme={theme} title="Total Active Users" value="2,482" change="12.5%" isPositive icon={Users} />
        <MetricCard theme={theme} title="Avg. Performance" value="94.2%" change="2.1%" isPositive icon={Activity} />
        <MetricCard theme={theme} title="Alert Frequency" value="0.4" change="15%" isPositive={false} icon={ShieldAlert} />
        <MetricCard theme={theme} title="Goal Completion" value="88.0%" change="4.2%" isPositive icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Performance Area Chart */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Cohort Goal Progress (Weekly)</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6B8E23]"></div>
                <span className="text-[10px] font-bold opacity-60">ACTUAL</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-[10px] font-bold opacity-60">BENCHMARK</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={goalData}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: textSecondary, fontSize: 10, fontWeight: 700}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: textSecondary, fontSize: 10, fontWeight: 700}}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#16161a' : '#fff', border: '1px solid ' + gridColor, borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="completion" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorComp)" />
                <Line type="step" dataKey="target" stroke={textSecondary} strokeWidth={1} strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${cardClass}`}>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-8">Intensity Distribution</h3>
          <div className="h-[240px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activitySplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {activitySplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black">94%</span>
              <span className="text-[9px] font-bold opacity-40 uppercase">Optimal</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {activitySplit.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[11px] font-bold opacity-70">{item.name}</span>
                </div>
                <span className="text-[11px] font-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        {/* Macros Bar Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${cardClass}`}>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Metabolic Efficiency (Current vs Target)</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macroData} layout="vertical" barGap={8}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: textPrimary, fontSize: 11, fontWeight: 800}}
                />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="current" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="target" fill={gridColor} radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Logs / Recent Activity */}
        <div className={`p-6 rounded-2xl border shadow-sm ${cardClass}`}>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Live Diagnostic Stream</h3>
          <div className="space-y-4">
            {[
              { time: '12:45', event: 'Biometric Sync Complete', status: 'Success', icon: CheckCircle2, color: 'text-emerald-500' },
              { time: '11:20', event: 'Heart Rate Spike Detected', status: 'Analysis', icon: Activity, color: 'text-orange-500' },
              { time: '09:15', event: 'Neural Coach Responding', status: 'Live', icon: MessageSquare, color: 'text-[#6B8E23]' },
              { time: '08:02', event: 'Goal Re-calibration', status: 'Complete', icon: TrendingUp, color: 'text-emerald-500' }
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between pb-3 border-b border-inherit last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black opacity-30 tabular-nums">{log.time}</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{log.event}</span>
                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">Diagnostic Engine</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-1 rounded bg-black/5 dark:bg-white/5 ${log.color}`}>
                  <log.icon className="w-3 h-3" /> {log.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
