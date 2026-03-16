'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  getWorkers,
  getAttendanceRecords,
  getContractorEntries,
  getTotalOutstanding,
  getWorkerStatusToday,
} from '@/utils/workforceStorage';
import { ThemeType } from '@/types';

const getTodayString = () => new Date().toDateString();

interface WorkforceDashboardTabProps {
  theme: ThemeType;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  borderClass: string;
  projects?: Array<{ id: number | string; name: string }>;
}

export default function WorkforceDashboardTab({
  isDark,
  textPrimary,
  textSecondary,
  borderClass,
  projects = [],
}: WorkforceDashboardTabProps) {
  const [selectedProject, setSelectedProject] = useState<string>('All');

  const workers = useMemo(() => getWorkers(), []);
  const attendance = useMemo(() => getAttendanceRecords(), []);
  const entries = useMemo(() => getContractorEntries(), []);

  const today = getTodayString();
  const projectNames = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.name && set.add(p.name));
    workers.forEach((w) => w.projectName && set.add(w.projectName));
    entries.forEach((e) => e.projectName && set.add(e.projectName));
    return Array.from(set).filter(Boolean).sort();
  }, [projects, workers, entries]);

  const filterByProject = <T extends { projectName?: string }>(items: T[]) => {
    if (selectedProject === 'All') return items;
    return items.filter((i) => i.projectName === selectedProject);
  };

  const staffOnSite = useMemo(() => {
    const filtered = filterByProject(workers);
    return filtered.filter((w) => getWorkerStatusToday(w.id) === 'IN').length;
  }, [workers, selectedProject]);

  const contractorHeadToday = useMemo(() => {
    const todayEntries = entries.filter((e) => new Date(e.date).toDateString() === today);
    const filtered = selectedProject === 'All'
      ? todayEntries
      : todayEntries.filter((e) => e.projectName === selectedProject);
    return filtered.reduce((sum, e) => sum + e.headCount, 0);
  }, [entries, selectedProject, today]);

  const onSiteNow = staffOnSite + contractorHeadToday;

  const contractorBreakdown = useMemo(() => {
    const todayEntries = entries.filter((e) => new Date(e.date).toDateString() === today);
    const filtered =
      selectedProject === 'All'
        ? todayEntries
        : todayEntries.filter((e) => e.projectName === selectedProject);
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const key = e.contractorName;
      map.set(key, (map.get(key) ?? 0) + e.headCount);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [entries, selectedProject, today]);

  const pieData = useMemo(() => {
    const staff = staffOnSite;
    const contractor = contractorHeadToday;
    if (staff === 0 && contractor === 0) {
      return [{ name: 'Staff', value: 1, color: '#3b82f6' }, { name: 'Contractor', value: 1, color: '#f97316' }];
    }
    return [
      { name: 'Staff', value: staff || 0.5, color: '#3b82f6' },
      { name: 'Contractor', value: contractor || 0.5, color: '#f97316' },
    ];
  }, [staffOnSite, contractorHeadToday]);

  const liability = useMemo(
    () => getTotalOutstanding(selectedProject === 'All' ? undefined : selectedProject),
    [selectedProject]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-lg font-black ${textPrimary}`}>Site Overview</h2>
          <p className={`text-sm ${textSecondary}`}>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-sm font-bold ${textSecondary}`}>Project:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${borderClass} ${textPrimary} text-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <option value="All">All</option>
            {projectNames.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liabilities Card */}
      <div className="p-4 rounded-xl border-2 border-red-500/50 bg-red-500/10">
        <p className={`text-sm font-bold ${textSecondary} mb-1`}>Total Outstanding</p>
        <p className="text-2xl font-black text-red-600 dark:text-red-400">₹ {liability.toLocaleString('en-IN')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>On Site Now</p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">{onSiteNow}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Staff Attendance</p>
          <p className="text-xl font-black text-green-600 dark:text-green-400">{staffOnSite}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Contractor Head</p>
          <p className="text-xl font-black text-orange-600 dark:text-orange-400">{contractorHeadToday}</p>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
          <p className={`text-xs font-bold uppercase ${textSecondary} mb-1`}>Status</p>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">Normal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workforce Mix Pie */}
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <h3 className={`text-sm font-bold ${textPrimary} mb-4`}>Workforce Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined) => (v != null ? Math.round(v) : v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contractor Breakdown */}
        <div className={`p-4 rounded-xl border ${borderClass} ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
          <h3 className={`text-sm font-bold ${textPrimary} mb-4`}>Contractor Breakdown</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {contractorBreakdown.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>No contractor logs today</p>
            ) : (
              contractorBreakdown.map((c) => (
                <div
                  key={c.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass}`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary} truncate`}>{c.name}</p>
                  </div>
                  <p className={`text-sm font-bold ${textPrimary}`}>{c.count} LABOR</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
