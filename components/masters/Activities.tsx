'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Activity, Download, Plus, Trash2, Loader2, Edit, Search, RefreshCw, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CreateActivityModal from './Modals/CreateActivityModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import * as XLSX from 'xlsx';

interface ActivityItem {
  id: string;
  numericId?: number; // DB id for parent-child matching
  uuid?: string;
  name?: string;
  activities?: string; // API field name
  project?: string;
  project_id?: number;
  subproject?: string;
  subproject_id?: number;
  type: 'heading' | 'activity' | 'activites'; // API uses "activites" (with typo)
  unit?: string;
  unit_id?: number;
  qty?: number;
  quantity?: number; // API field name
  rate?: number;
  amount?: number;
  startDate?: string;
  start_date?: string; // API field name
  endDate?: string;
  end_date?: string; // API field name
  heading?: number; // Parent activity ID
  parent_id?: number;
  createdAt?: string;
}

interface ActivitiesProps {
  theme: ThemeType;
}

const CheckboxCell: React.FC<{
  row: ActivityItem;
  childIds?: string[];
  selectedIds: Set<string>;
  isDark: boolean;
  onToggle: () => void;
}> = ({ row, childIds, selectedIds, isDark, onToggle }) => {
  const isHeading = (row.type || '').toLowerCase() === 'heading';
  const getState = (): 'checked' | 'indeterminate' | 'unchecked' => {
    if (!isHeading || !childIds?.length) return selectedIds.has(row.id) ? 'checked' : 'unchecked';
    const headingSel = selectedIds.has(row.id);
    const childCount = childIds.filter((id) => selectedIds.has(id)).length;
    if (headingSel && childCount === childIds.length) return 'checked';
    if (childCount > 0) return 'indeterminate';
    return 'unchecked';
  };
  const state = getState();
  const checked = isHeading ? state === 'checked' : selectedIds.has(row.id);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current && isHeading) ref.current.indeterminate = state === 'indeterminate';
  }, [state, isHeading]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-slate-600 bg-slate-700 accent-[#C2D642]' : 'border-slate-300 bg-white accent-[#C2D642]'}`}
    />
  );
};

const Activities: React.FC<ActivitiesProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [addUnderHeadingId, setAddUnderHeadingId] = useState<string | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [units, setUnits] = useState<Array<{ id: number; unit: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: number; uuid: string; project_name: string }>>([]);
  const [subprojects, setSubprojects] = useState<Array<{ id: number; uuid: string; name: string; project_id?: number }>>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState<boolean>(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activitiesEmptyMessage, setActivitiesEmptyMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch units for unit_id -> unit name lookup when API returns only unit_id
  useEffect(() => {
    const fetchUnits = async () => {
      if (!isAuthenticated) return;
      try {
        const fetched = await masterDataAPI.getUnits();
        setUnits((fetched || []).map((u: any) => ({ id: u.id, unit: (u.unit || u.name || '').toString().trim() })));
      } catch {
        setUnits([]);
      }
    };
    fetchUnits();
  }, [isAuthenticated]);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isAuthenticated) {
        setProjects([]);
        return;
      }
      
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await masterDataAPI.getProjects();
        setProjects(fetchedProjects.map((p: any) => ({
          id: p.id,
          uuid: p.uuid || String(p.id),
          project_name: p.project_name || p.name || ''
        })));
      } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        toast.showError('Failed to load projects');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated]);

  // Fetch subprojects when project is selected
  useEffect(() => {
    const fetchSubprojects = async () => {
      if (!isAuthenticated || !selectedProjectId) {
        setSubprojects([]);
        return;
      }
      
      // Backend expects numeric project_id - resolve from selected value (may be uuid or id)
      const project = projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId);
      const projectIdForApi = project?.id ?? selectedProjectId;

      setIsLoadingSubprojects(true);
      try {
        const result = await masterDataAPI.getSubprojects(projectIdForApi);
        const fetchedSubprojects = Array.isArray(result) ? result : (result as any)?.subProject || (result as any)?.data || [];
        setSubprojects(fetchedSubprojects.map((s: any) => ({
          id: s.id,
          uuid: s.uuid || String(s.id),
          name: s.name || '',
          project_id: s.project_id || s.tag_project
        })));
      } catch (error: any) {
        console.error('Failed to fetch subprojects:', error);
        toast.showError('Failed to load subprojects');
      } finally {
        setIsLoadingSubprojects(false);
      }
    };

    fetchSubprojects();
  }, [selectedProjectId, isAuthenticated]);

  // Fetch activities from API based on selected project/subproject
  const fetchActivities = async () => {
    if (!isAuthenticated || !selectedProjectId) {
      setActivities([]);
      setIsLoadingActivities(false);
      return;
    }
    
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const projectIdNum = projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId)?.id;
      const subprojectIdNum = selectedSubprojectId 
        ? subprojects.find(s => s.uuid === selectedSubprojectId || String(s.id) === selectedSubprojectId)?.id
        : undefined;

      // Fetch activities and units in parallel (units needed to resolve unit_id -> unit name)
      const [result, fetchedUnits] = await Promise.all([
        masterDataAPI.getActivities(projectIdNum || selectedProjectId, subprojectIdNum),
        units.length > 0 ? Promise.resolve(units) : masterDataAPI.getUnits().then((u: any[]) => u || []).catch(() => [])
      ]);
      const unitsList = units.length > 0 ? units : (fetchedUnits || []).map((u: any) => ({ id: u.id, unit: (u.unit || u.name || '').toString().trim() }));
      if (unitsList.length > 0 && units.length === 0) setUnits(unitsList);

      const fetchedActivities = Array.isArray(result) ? result : (result?.data ?? []);
      setActivitiesEmptyMessage(fetchedActivities.length === 0 && (result as any)?.message ? (result as any).message : null);

      const getUnitName = (activity: any) => {
        const fromApi = activity.units?.unit || activity.units?.name || activity.unit?.unit || activity.unit?.name || (typeof activity.unit === 'string' ? activity.unit : '');
        if (fromApi) return fromApi;
        const uid = activity.unit_id || activity.unit?.id || activity.units?.id;
        if (uid != null) {
          const u = unitsList.find((x: { id: number }) => x.id === Number(uid) || String(x.id) === String(uid));
          return u?.unit || '';
        }
        return '';
      };

      // Transform API response to match ActivityItem interface
      const transformedActivities = fetchedActivities.map((activity: any) => ({
        id: activity.uuid || String(activity.id),
        numericId: activity.id,
        uuid: activity.uuid,
        name: activity.activities || activity.name || '',
        activities: activity.activities || '',
        project: activity.project?.project_name || activity.project_name || '',
        project_id: activity.project_id || activity.project?.id,
        subproject: activity.subproject?.name || activity.subproject_name || '',
        subproject_id: activity.subproject_id || activity.subproject?.id,
        type: activity.type || '',
        unit: getUnitName(activity),
        unit_id: activity.unit_id || activity.unit?.id || activity.units?.id,
        qty: activity.qty || activity.quantity || 0,
        quantity: activity.quantity || activity.qty || 0,
        rate: activity.rate || 0,
        amount: activity.amount || 0,
        startDate: activity.start_date || activity.startDate || '',
        start_date: activity.start_date || '',
        endDate: activity.end_date || activity.endDate || '',
        end_date: activity.end_date || '',
        heading: activity.heading || activity.parent_id,
        parent_id: activity.parent_id || activity.heading,
        createdAt: activity.created_at || activity.createdAt,
      }));
      setActivities(transformedActivities);
      if (fetchedActivities.length > 0) setActivitiesEmptyMessage(null);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setActivitiesError(err.message || 'Failed to load activities');
      setActivities([]);
      setActivitiesEmptyMessage(null);
      toast.showError(err.message || 'Failed to load activities');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Load activities when project/subproject changes
  useEffect(() => {
    if (selectedProjectId && !searchQuery.trim()) {
      fetchActivities();
    }
  }, [selectedProjectId, selectedSubprojectId]);

  // Search activities using API
  const handleSearch = async (query: string) => {
    if (!query.trim() || !selectedProjectId) {
      if (selectedProjectId) {
        await fetchActivities();
      }
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const projectIdNum = projects.find(p => p.uuid === selectedProjectId || String(p.id) === selectedProjectId)?.id;
      const [searchResults, unitsForSearch] = await Promise.all([
        masterDataAPI.searchActivities(query, projectIdNum || selectedProjectId),
        units.length > 0 ? Promise.resolve(units) : masterDataAPI.getUnits().then((u: any[]) => (u || []).map((x: any) => ({ id: x.id, unit: (x.unit || x.name || '').toString().trim() }))).catch(() => [])
      ]);
      const unitsList = units.length > 0 ? units : unitsForSearch || [];
      if (unitsList.length > 0 && units.length === 0) setUnits(unitsList);

      const getUnitName = (activity: any) => {
        const fromApi = activity.units?.unit || activity.units?.name || activity.unit?.unit || activity.unit?.name || (typeof activity.unit === 'string' ? activity.unit : '');
        if (fromApi) return fromApi;
        const uid = activity.unit_id || activity.unit?.id || activity.units?.id;
        if (uid != null) {
          const u = unitsList.find((x: { id: number }) => x.id === Number(uid) || String(x.id) === String(uid));
          return u?.unit || '';
        }
        return '';
      };

      // Transform API response
      const transformedActivities = searchResults.map((activity: any) => ({
        id: activity.uuid || String(activity.id),
        numericId: activity.id,
        uuid: activity.uuid,
        name: activity.activities || activity.name || '',
        activities: activity.activities || '',
        project: activity.project?.project_name || activity.project_name || '',
        project_id: activity.project_id || activity.project?.id,
        subproject: activity.subproject?.name || activity.subproject_name || '',
        subproject_id: activity.subproject_id || activity.subproject?.id,
        type: activity.type || '',
        unit: getUnitName(activity),
        unit_id: activity.unit_id || activity.unit?.id || activity.units?.id,
        qty: activity.qty || activity.quantity || 0,
        quantity: activity.quantity || activity.qty || 0,
        rate: activity.rate || 0,
        amount: activity.amount || 0,
        startDate: activity.start_date || activity.startDate || '',
        start_date: activity.start_date || '',
        endDate: activity.end_date || activity.endDate || '',
        end_date: activity.end_date || '',
        heading: activity.heading || activity.parent_id,
        parent_id: activity.parent_id || activity.heading,
        createdAt: activity.created_at || activity.createdAt,
      }));
      setActivities(transformedActivities);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.showError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && selectedProjectId) {
        handleSearch(searchQuery);
      } else if (selectedProjectId) {
        fetchActivities();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Build tree/hierarchy: recursive - headings first, then their descendants (activities under headings, activities under activities)
  type TreeNode =
    | { type: 'row'; item: ActivityItem; depth: number; srNo: string; groupIndex: number; isNewGroup: boolean; childIds?: string[] }
    | { type: 'add'; parentHeading: ActivityItem; groupIndex: number };
  const treeNodes = useMemo(() => {
    const isHeading = (a: ActivityItem) => (a.type || '').toLowerCase() === 'heading';
    const headings = activities.filter(isHeading);
    const allActivities = activities.filter((a) => !isHeading(a));
    const getParentId = (a: ActivityItem) => a.parent_id ?? a.heading;
    const getNodeId = (a: ActivityItem) => a.numericId ?? (typeof a.id === 'string' && !isNaN(Number(a.id)) ? Number(a.id) : null);
    const matchesParent = (child: ActivityItem, parent: ActivityItem) => {
      const pid = getParentId(child);
      if (pid == null) return false;
      const parentNodeId = getNodeId(parent);
      return pid === parentNodeId || String(pid) === String(parent.id) || String(pid) === String(parent.uuid);
    };

    const result: TreeNode[] = [];
    let headingNo = 0;
    let groupIdx = 0;
    const allPlacedIds = new Set<string>();

    const addChildrenRecursive = (parent: ActivityItem, parentSrNo: string, depth: number, groupIdxVal: number): { ids: string[]; nodes: Extract<TreeNode, { type: 'row' }>[] } => {
      const kids = allActivities.filter((c) => matchesParent(c, parent));
      const allDescendantIds: string[] = [];
      const nodes: Extract<TreeNode, { type: 'row' }>[] = [];
      kids.forEach((k, idx) => {
        allPlacedIds.add(k.id);
        allDescendantIds.push(k.id);
        const srNo = `${parentSrNo}.${idx + 1}`;
        const nested = addChildrenRecursive(k, srNo, depth + 1, groupIdxVal);
        allDescendantIds.push(...nested.ids);
        nodes.push({ type: 'row', item: k, depth, srNo, groupIndex: groupIdxVal, isNewGroup: false, childIds: nested.ids.length ? nested.ids : undefined });
        nodes.push(...nested.nodes);
      });
      return { ids: allDescendantIds, nodes };
    };

    for (const h of headings) {
      headingNo++;
      const { ids: allChildIds, nodes: childRows } = addChildrenRecursive(h, String(headingNo), 1, groupIdx);
      result.push({ type: 'row', item: h, depth: 0, srNo: String(headingNo), groupIndex: groupIdx, isNewGroup: true, childIds: allChildIds.length ? allChildIds : undefined });
      result.push({ type: 'add', parentHeading: h, groupIndex: groupIdx });
      result.push(...childRows);
      groupIdx++;
    }
    // Orphan activities (no matching parent in our set) - list at end with own SR
    const orphans = allActivities.filter((c) => !allPlacedIds.has(c.id));
    orphans.forEach((o) => {
      headingNo++;
      result.push({ type: 'row', item: o, depth: 1, srNo: String(headingNo), groupIndex: groupIdx, isNewGroup: true });
      groupIdx++;
    });
    return result;
  }, [activities]);

  const filteredActivities: TreeNode[] = treeNodes;
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesPerPage, selectedProjectId, selectedSubprojectId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedProjectId, selectedSubprojectId]);

  const toggleSelection = (row: ActivityItem, childIds?: string[]) => {
    const isHeading = (row.type || '').toLowerCase() === 'heading';
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const idsToToggle = isHeading && childIds ? [row.id, ...childIds] : [row.id];
      const allSelected = idsToToggle.every((id) => next.has(id));
      idsToToggle.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const isRowSelected = (rowId: string) => selectedIds.has(rowId);

  const getHeadingCheckState = (row: ActivityItem, childIds?: string[]): 'checked' | 'indeterminate' | 'unchecked' => {
    if (!childIds?.length) return isRowSelected(row.id) ? 'checked' : 'unchecked';
    const headingSel = selectedIds.has(row.id);
    const childCount = childIds.filter((id) => selectedIds.has(id)).length;
    if (headingSel && childCount === childIds.length) return 'checked';
    if (childCount > 0) return 'indeterminate';
    return 'unchecked';
  };

  const handleEditActivity = async (activity: ActivityItem) => {
    try {
      const idForApi = String(activity.numericId ?? activity.id);
      await masterDataAPI.getActivity(idForApi);
      setEditingActivityId(idForApi);
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('Failed to fetch activity details:', error);
      toast.showError(error.message || 'Failed to load activity details');
    }
  };

  const handleDeleteActivity = async (activity: ActivityItem) => {
    const typeLabel = (activity.type || '').toLowerCase() === 'heading' ? 'heading' : 'activity';
    if (!window.confirm(`Are you sure you want to delete this ${typeLabel}?`)) return;
    try {
      const idForApi = String(activity.numericId ?? activity.id);
      await masterDataAPI.deleteActivity(idForApi);
      toast.showSuccess(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} deleted successfully`);
      await fetchActivities();
    } catch (error: any) {
      console.error('Failed to delete:', error);
      toast.showError(error.message || 'Failed to delete');
    }
  };

  const handleActivityCreated = async () => {
    // Refresh activities list after create/update
    await fetchActivities();
  };

  const handleDownloadExcel = () => {
    const headers = ['Type', 'SL No', 'Activities', 'Units', 'Qty', 'Rate', 'Amount', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)'];
    const rows = treeNodes
      .filter((n): n is Extract<typeof n, { type: 'row' }> => n.type === 'row')
      .map(({ item, srNo }) => {
        const type = (item.type || '').toLowerCase() === 'heading' ? 'heading' : 'activity';
        return [
          type,
          srNo,
          item.name || item.activities || '',
          item.unit || '',
          item.qty ?? '',
          item.rate ?? '',
          item.amount ?? '',
          item.startDate || item.start_date || '',
          item.endDate || item.end_date || ''
        ];
      });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activities');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activities_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>Activities</h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-widest text-center sm:text-left ${textSecondary}`}>
            Manage project activities and tasks
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <button 
            onClick={handleDownloadExcel}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          {selectedProjectId && (
            <button 
              onClick={async () => {
                console.log('🔄 Manual refresh triggered');
                setSearchQuery('');
                await fetchActivities();
              }}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                  : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
              } shadow-sm`}
              title="Refresh Activities List"
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          <button 
            disabled
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all opacity-50 cursor-not-allowed ${
              isDark ? 'bg-slate-700 text-slate-100 border border-slate-600' : 'bg-white text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Bulk Upload"
          >
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Bulk Upload</span><span className="sm:hidden">Bulk</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create New</span><span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Project and Subproject Selectors */}
      <div className={`p-6 rounded-xl border ${cardClass}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Project <span className="text-red-500">*</span>
            </label>
            {isLoadingProjects ? (
              <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedSubprojectId(''); // Reset subproject when project changes
                  setActivities([]); // Clear activities
                }}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              >
                <option value="">-- Select Project --</option>
                {projects.map((project) => (
                  <option key={project.uuid || project.id} value={project.uuid || String(project.id)}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Subproject (Optional)
            </label>
            {isLoadingSubprojects ? (
              <div className={`w-full px-4 py-3 rounded-lg text-sm ${textSecondary} flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subprojects...
              </div>
            ) : (
              <select
                value={selectedSubprojectId}
                onChange={(e) => {
                  setSelectedSubprojectId(e.target.value);
                  // Refetch activities when subproject changes
                  if (selectedProjectId) {
                    fetchActivities();
                  }
                }}
                disabled={!selectedProjectId}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!selectedProjectId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">-- All Subprojects --</option>
                {subprojects.map((subproject) => (
                  <option key={subproject.uuid || subproject.id} value={subproject.uuid || String(subproject.id)}>
                    {subproject.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
              <p className={`text-2xl font-black ${textPrimary}`}>{filteredActivities.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
              <p className={`text-2xl font-black text-[#C2D642]`}>{filteredActivities.filter(a => a.type === 'row' && (a.item as any)?.status === 'Active').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${cardClass}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
              <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Search Activities
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search by activity name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!selectedProjectId || isSearching}
                className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100' 
                    : 'bg-white border-slate-200 text-slate-900'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C2D642]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingActivities && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Activities...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your activities</p>
        </div>
      )}

      {/* Error State */}
      {activitiesError && !isLoadingActivities && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Activities</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{activitiesError}</p>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Activities Table */}
      {!isLoadingActivities && !activitiesError && selectedProjectId && filteredActivities.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`pl-6 py-4 text-left min-w-[80px] ${textSecondary}`}></th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sr No</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Activities</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Units</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Qty</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Amount</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Start Date</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>End Date</th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {paginatedActivities.map((node, idx) => {
                  if (node.type === 'add') {
                    const parentId = String(node.parentHeading.numericId ?? node.parentHeading.id);
                    const addIndentPx = 24 + 24; // depth 1 level - under heading
                    return (
                      <tr
                        key={`add-${node.parentHeading.id}-${idx}`}
                        className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}
                      >
                        <td className="py-2 align-middle" style={{ paddingLeft: addIndentPx, minWidth: 56 }} />
                        <td className="px-4 py-2 align-middle" />
                        <td className="py-2 align-middle" style={{ paddingLeft: addIndentPx }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddUnderHeadingId(parentId);
                              setEditingActivityId(null);
                              setShowCreateModal(true);
                            }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-bold transition-all ${
                              isDark
                                ? 'text-[#C2D642] hover:bg-[#C2D642]/20'
                                : 'text-[#C2D642] hover:bg-[#C2D642]/10'
                            }`}
                            title="Add activity under this heading"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add activity</span>
                          </button>
                        </td>
                        <td colSpan={7} className="px-4 py-2 align-middle" />
                      </tr>
                    );
                  }
                  const { item: row, depth, srNo, groupIndex, isNewGroup, childIds } = node;
                  const isHeading = (row.type || '').toLowerCase() === 'heading';
                  const indentPx = 24 + depth * 24;
                  return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isNewGroup && groupIndex > 0
                        ? isDark
                          ? 'border-t-2 border-slate-600/60'
                          : 'border-t-2 border-slate-200'
                        : ''
                    } ${
                      isHeading
                        ? isDark
                          ? 'bg-[#4a5d23]'
                          : 'bg-[#C2D642]/20'
                        : isDark
                          ? 'bg-slate-800/50'
                          : 'bg-slate-50'
                    } ${isDark ? (isHeading ? 'hover:bg-[#4a5d23]/90' : 'hover:bg-slate-800/70') : 'hover:bg-slate-100'}`}
                  >
                    <td className="py-4 align-middle" style={{ paddingLeft: indentPx, minWidth: 56 }}>
                      <div className="flex items-center justify-start">
                        <CheckboxCell
                          row={row}
                          childIds={childIds}
                          selectedIds={selectedIds}
                          isDark={isDark}
                          onToggle={() => toggleSelection(row, childIds)}
                        />
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>{srNo}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary}`}>
                      <div
                        className={`flex items-center gap-2 ${depth > 0 ? `border-l-2 pl-2 ${isDark ? 'border-slate-600/50' : 'border-slate-300'}` : ''}`}
                        style={{ paddingLeft: indentPx }}
                      >
                        {depth > 0 && (
                          <span className={`text-xs flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>└</span>
                        )}
                        <span>{row.name || row.activities || '-'}</span>
                        {isHeading && (
                          <span className="ml-2 text-xs font-medium italic text-emerald-400">(Heading)</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.unit || '-')}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.qty ?? '-')}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.rate ?? '-')}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.amount ?? '-')}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.startDate || '-')}</td>
                    <td className={`px-4 py-4 text-sm font-bold align-middle ${textPrimary} ${!isHeading ? 'text-xs' : ''}`}>{(row.type || '').toLowerCase() === 'heading' ? '' : (row.endDate || '-')}</td>
                    <td className="px-4 py-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditActivity(row)}
                          className={`p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteActivity(row)}
                          className={`p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Bar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  currentPage <= 1 ? (isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed') : (isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900')
                }`}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`p-2 rounded transition-colors ${
                  currentPage <= 1 ? (isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed') : (isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900')
                }`}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className={`px-3 py-1.5 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                title="Current page"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage >= totalPages ? (isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed') : (isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900')
                }`}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage >= totalPages ? (isDark ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed') : (isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-200 text-slate-900')
                }`}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <div className={`h-6 w-px ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <span className={`text-sm ${textSecondary}`}>Rows per page:</span>
              <select
                value={entriesPerPage}
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-sm font-bold border appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
            <span className={`text-sm ${textSecondary}`}>
              Page {currentPage} of {totalPages} ({filteredActivities.length} total)
            </span>
          </div>
        </div>
      ) : !isLoadingActivities && !activitiesError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>
            {!selectedProjectId 
              ? 'Please select a project to view activities' 
              : searchQuery.trim()
                ? `No activities found matching "${searchQuery}"`
                : 'No activities found for this project/subproject'}
          </h3>
          {activitiesEmptyMessage && selectedProjectId && !searchQuery.trim() && (
            <p className={`text-sm ${textSecondary} mb-3`}>{activitiesEmptyMessage}</p>
          )}
          <p className={`text-sm ${textSecondary} mb-6`}>
            {selectedProjectId && !searchQuery.trim() && 'Add activities using Create New'}
          </p>
          {selectedProjectId && !searchQuery.trim() && (
            <div className="flex flex-wrap justify-center gap-3">
              <button
                disabled
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all opacity-50 cursor-not-allowed ${
                  isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-900'
                }`}
                title="Bulk Upload"
              >
                <Upload className="w-4 h-4" /> Bulk Upload
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:opacity-90 text-white transition-all"
              >
                <Plus className="w-4 h-4" /> Create New
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Create Activity Modal */}
      <CreateActivityModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingActivityId(null);
          setAddUnderHeadingId(null);
        }}
        onSuccess={handleActivityCreated}
        editingActivityId={editingActivityId}
        activities={activities}
        projects={projects}
        subprojects={subprojects}
        defaultProjectId={selectedProjectId}
        defaultSubprojectId={selectedSubprojectId}
        defaultHeadingId={addUnderHeadingId ?? undefined}
      />

    </div>
  );
};

export default Activities;
