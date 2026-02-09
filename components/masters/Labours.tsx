'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Users, Plus, Search, X, Download, Loader2, Edit, Trash2, MoreVertical } from 'lucide-react';
import CreateLabourModal from './Modals/CreateLabourModal';
import { masterDataAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface Labour {
  id: string; // UUID or string for display
  numericId?: number | string; // Numeric ID from database for API calls
  uuid?: string; // UUID if available
  name: string;
  code?: string;
  category: 'skilled' | 'semiskilled' | 'unskilled'; // API uses lowercase
  unit_id?: number;
  unit?: {
    id: number;
    unit: string;
    unit_coversion?: string;
    unit_coversion_factor?: string;
  };
  status?: 'Active' | 'Inactive';
  is_active?: number; // 1 = active, 0 = inactive
  createdAt?: string;
}

interface LaboursProps {
  theme: ThemeType;
}

const Labours: React.FC<LaboursProps> = ({ theme }) => {
  const toast = useToast();
  const { isAuthenticated } = useUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingLabourId, setEditingLabourId] = useState<string | null>(null); // UUID for display
  const [editingLabourNumericId, setEditingLabourNumericId] = useState<number | string | null>(null); // Numeric ID for API calls
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [isLoadingLabours, setIsLoadingLabours] = useState<boolean>(false);
  const [laboursError, setLaboursError] = useState<string | null>(null);
  const [togglingLabourId, setTogglingLabourId] = useState<string | null>(null); // Track which labour is being toggled
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Fetch labours from API
  const fetchLabours = async () => {
    if (!isAuthenticated) {
      setLabours([]);
      setIsLoadingLabours(false);
      return;
    }
    
    setIsLoadingLabours(true);
    setLaboursError(null);
    try {
      const fetchedLabours = await masterDataAPI.getLabours();
      // Transform API response to match Labour interface
      const transformedLabours: Labour[] = fetchedLabours.map((labour: any) => {
        const numericId = labour.id; // Numeric ID from database
        const uuid = labour.uuid; // UUID if available
        
        // Normalize category to lowercase
        let category: 'skilled' | 'semiskilled' | 'unskilled' = 'skilled';
        const cat = (labour.category || '').toLowerCase();
        if (cat === 'skilled' || cat === 'semiskilled' || cat === 'unskilled') {
          category = cat as 'skilled' | 'semiskilled' | 'unskilled';
        }
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = labour.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: labour.name || '',
          code: labour.code || '',
          category,
          unit_id: labour.unit_id || labour.unit?.id,
          unit: labour.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: labour.created_at || labour.createdAt,
        };
      });
      setLabours(transformedLabours);
    } catch (err: any) {
      console.error('Failed to fetch labours:', err);
      setLaboursError(err.message || 'Failed to load labours');
      setLabours([]);
      toast.showError(err.message || 'Failed to load labours');
    } finally {
      setIsLoadingLabours(false);
    }
  };

  // Load labours from API on mount and when auth changes
  useEffect(() => {
    fetchLabours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Search labours using API
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch all labours
      await fetchLabours();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await masterDataAPI.searchLabours(query);
      // Transform API response to match Labour interface
      const transformedLabours: Labour[] = searchResults.map((labour: any) => {
        const numericId = labour.id; // Numeric ID from database
        const uuid = labour.uuid; // UUID if available
        
        // Normalize category to lowercase
        let category: 'skilled' | 'semiskilled' | 'unskilled' = 'skilled';
        const cat = (labour.category || '').toLowerCase();
        if (cat === 'skilled' || cat === 'semiskilled' || cat === 'unskilled') {
          category = cat as 'skilled' | 'semiskilled' | 'unskilled';
        }
        
        // Handle is_active: can be 1, "1", true, or undefined/null
        // Default to Active if undefined/null
        const isActiveValue = labour.is_active;
        const isActive = isActiveValue === 1 || 
                        isActiveValue === '1' || 
                        isActiveValue === true || 
                        isActiveValue === 'true' ||
                        isActiveValue === undefined || // Default to active
                        isActiveValue === null; // Default to active
        
        return {
          id: uuid || String(numericId), // Use UUID for display if available, otherwise numeric ID as string
          numericId: numericId, // Store numeric ID for API calls
          uuid: uuid, // Store UUID if available
          name: labour.name || '',
          code: labour.code || '',
          category,
          unit_id: labour.unit_id || labour.unit?.id,
          unit: labour.unit || undefined,
          status: (isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          is_active: isActive ? 1 : 0,
          createdAt: labour.created_at || labour.createdAt,
        };
      });
      setLabours(transformedLabours);
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
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchLabours();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const labourTypeOptions = [
    'Supervisor',
    'Foremen',
    'Helpers',
    'Male Coolie',
    'Female Coolie',
    'General Laborers',
    'Beldar',
    'Masons',
    'Carpenters',
    'Electricians',
    'Plumbers',
    'Welders',
    'Fitters',
    'Tilers',
    'Painter'
  ];

  // Filter labours (client-side filtering is optional since we're using API search)
  const filteredLabours = useMemo(() => {
    let filtered = [...labours];
    
    // Client-side filtering is optional since we're using API search
    // But keep it for additional filtering if needed
    if (searchQuery.trim() && !isSearching) {
      filtered = filtered.filter(labour =>
        labour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (labour.code && labour.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        labour.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [labours, searchQuery, isSearching]);

  const handleEditLabour = async (labour: Labour) => {
    try {
      // Use UUID for GET /labour-edit/{uuid} API
      const labourUuid = labour.uuid || labour.id;
      
      console.log('📝 Editing labour:', {
        labourId: labour.id,
        uuid: labour.uuid,
        numericId: labour.numericId,
        usingUuidForGet: labourUuid
      });
      
      // Fetch full labour details from API using UUID
      const labourDetails = await masterDataAPI.getLabour(String(labourUuid));
      console.log('✅ Labour details fetched:', labourDetails);
      
      setEditingLabourId(String(labourUuid)); // UUID for GET /labour-edit/{uuid}
      setEditingLabourNumericId(labour.numericId || null); // Numeric ID for update if needed
      
      // Open modal with labour data - CreateLabourModal will handle this
      setShowCreateModal(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch labour details:', error);
      toast.showError(error.message || 'Failed to load labour details');
    }
  };

  const handleDeleteLabour = async (labourId: string) => {
    // Find the labour to get its UUID
    const labour = labours.find(l => l.id === labourId);
    const deleteUuid = labour?.uuid || labourId; // Use UUID for delete API
    
    console.log('🗑️ Deleting labour:', {
      labourId: labourId,
      uuid: labour?.uuid,
      numericId: labour?.numericId,
      usingUuid: deleteUuid
    });
    
    if (window.confirm('Are you sure you want to delete this labour?')) {
      try {
        await masterDataAPI.deleteLabour(String(deleteUuid));
        toast.showSuccess('Labour deleted successfully');
        // Refresh labours list
        await fetchLabours();
      } catch (error: any) {
        console.error('Failed to delete labour:', error);
        toast.showError(error.message || 'Failed to delete labour');
      }
    }
  };

  const handleToggleStatus = async (labour: Labour) => {
    console.log('🔄 handleToggleStatus called with labour:', {
      id: labour.id,
      name: labour.name,
      status: labour.status,
      is_active: labour.is_active,
      togglingLabourId: togglingLabourId,
      isLoadingLabours: isLoadingLabours
    });
    
    // Prevent multiple simultaneous toggles
    if (togglingLabourId === labour.id) {
      console.log('⏳ Toggle already in progress for this labour');
      return;
    }

    if (isLoadingLabours) {
      console.log('⏳ Labours are loading, cannot toggle');
      return;
    }

    try {
      setTogglingLabourId(labour.id);
      
      // Determine current status
      const currentStatus = labour.status || (labour.is_active === 1 ? 'Active' : 'Inactive');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const isActive = newStatus === 'Active' ? 1 : 0;
      
      console.log('🔄 Status toggle calculation:', {
        currentStatus: currentStatus,
        currentIsActive: labour.is_active,
        newStatus: newStatus,
        newIsActive: isActive
      });
      
      // Use UUID for labour-edit/{uuid} API
      const labourUuid = labour.uuid || labour.id;
      
      console.log('🔄 Toggling labour status:', {
        labourId: labour.id,
        uuid: labourUuid,
        currentStatus: labour.status,
        currentIsActive: labour.is_active,
        newStatus: newStatus,
        newIsActive: isActive
      });

      // First, fetch current labour data using labour-edit/{uuid} API to ensure we have latest data
      let currentLabourData;
      try {
        console.log('📖 Fetching current labour data via labour-edit/{uuid}');
        currentLabourData = await masterDataAPI.getLabour(String(labourUuid));
        console.log('✅ Current labour data:', currentLabourData);
      } catch (fetchError: any) {
        console.warn('⚠️ Failed to fetch labour data, using existing data:', fetchError);
        // Fallback to existing labour data if fetch fails
        currentLabourData = {
          name: labour.name,
          category: labour.category,
          unit_id: labour.unit_id,
          is_active: labour.is_active
        };
      }

      // Optimistically update UI immediately
      setLabours(prevLabours => 
        prevLabours.map(l => 
          l.id === labour.id 
            ? { ...l, status: newStatus, is_active: isActive }
            : l
        )
      );

      // Update labour status using updateLabour API with UUID
      // The API uses POST /labour-add with updateId parameter
      const updatePayload = {
        name: currentLabourData.name || labour.name,
        category: currentLabourData.category || labour.category,
        unit_id: currentLabourData.unit_id || labour.unit_id,
        is_active: isActive // Explicitly set the new status
      };
      
      console.log('📝 Updating labour with payload:', {
        uuid: labourUuid,
        updatePayload: updatePayload
      });
      
      await masterDataAPI.updateLabour(String(labourUuid), updatePayload);
      
      toast.showSuccess(`Labour ${newStatus.toLowerCase()} successfully`);
      
      // Refresh labours list to ensure UI reflects database state
      await fetchLabours();
      
    } catch (error: any) {
      console.error('❌ Failed to toggle labour status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      
      // Revert optimistic update on error
      setLabours(prevLabours => 
        prevLabours.map(l => 
          l.id === labour.id 
            ? { ...l, status: labour.status, is_active: labour.is_active }
            : l
        )
      );
      
      toast.showError(error.message || 'Failed to update labour status');
    } finally {
      setTogglingLabourId(null);
    }
  };

  const handleLabourCreated = async () => {
    // Refresh labours list after create/update
    await fetchLabours();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId]);

  const handleDownloadExcel = () => {
    // Prepare data for Excel export
    const headers = ['Labour Type', 'Code', 'Category', 'Status'];
    const rows = filteredLabours.map(labour => [
      labour.name,
      labour.id,
      labour.category,
      labour.status
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for UTF-8 to ensure Excel opens it correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `labours_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <Users className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Labours</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Manage labour workforce and assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadExcel}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDark 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' 
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } shadow-sm`}
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642] text-white' : 'bg-[#C2D642] hover:bg-[#C2D642] text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${cardClass}`}>
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Search by labour type, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoadingLabours && (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50 animate-spin`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>Loading Labours...</h3>
          <p className={`text-sm ${textSecondary}`}>Please wait while we fetch your labours</p>
        </div>
      )}

      {/* Error State */}
      {laboursError && !isLoadingLabours && (
        <div className={`p-12 rounded-xl border text-center ${cardClass} border-red-500`}>
          <Users className={`w-16 h-16 mx-auto mb-4 text-red-500 opacity-50`} />
          <h3 className={`text-lg font-black mb-2 text-red-500`}>Error Loading Labours</h3>
          <p className={`text-sm ${textSecondary} mb-4`}>{laboursError}</p>
          <button
            onClick={fetchLabours}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Labours Table */}
      {!isLoadingLabours && !laboursError && filteredLabours.length > 0 ? (
        <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Type</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Category</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                  <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Status</th>
                  <th className={`px-6 py-4 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredLabours.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className={`${
                      row.status === 'Inactive' 
                        ? isDark 
                          ? 'opacity-50 bg-slate-800/20' 
                          : 'opacity-50 bg-slate-50/50'
                        : isDark 
                          ? 'hover:bg-slate-800/30' 
                          : 'hover:bg-slate-50/50'
                    } transition-colors`}
                  >
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {index + 1}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.name}
                      {row.status === 'Inactive' && (
                        <span className="ml-2 text-xs text-red-500">(Disabled)</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>{row.code || '-'}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.category === 'skilled' ? 'Skilled' : 
                       row.category === 'semiskilled' ? 'Semi Skilled' : 
                       row.category === 'unskilled' ? 'Unskilled' : 
                       row.category}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.status === 'Inactive' ? textSecondary : textPrimary}`}>
                      {row.unit?.unit || '-'}
                    </td>
                    <td className={`px-6 py-4`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔄 Toggle button clicked for labour:', {
                            id: row.id,
                            name: row.name,
                            currentStatus: row.status,
                            currentIsActive: row.is_active,
                            togglingLabourId: togglingLabourId,
                            isLoadingLabours: isLoadingLabours
                          });
                          handleToggleStatus(row);
                        }}
                        disabled={isLoadingLabours || togglingLabourId === row.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C2D642]/50 focus:ring-offset-2 ${
                          row.status === 'Active'
                            ? 'bg-green-600'
                            : isDark ? 'bg-slate-700' : 'bg-slate-300'
                        } ${(isLoadingLabours || togglingLabourId === row.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={row.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                          className={`dropdown-trigger p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                          title="Actions"
                        >
                          <MoreVertical className={`w-4 h-4 ${textSecondary}`} />
                        </button>
                        {openDropdownId === row.id && (
                          <div className={`dropdown-menu absolute right-0 top-full mt-1 w-32 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEditLabour(row);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                                }`}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteLabour(row.id);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors text-left ${
                                  isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-50 text-red-600'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoadingLabours && !laboursError ? (
        <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
          <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
          <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No Labours Found</h3>
          <p className={`text-sm ${textSecondary}`}>
            {searchQuery.trim() 
              ? `No labours found matching "${searchQuery}"` 
              : 'Start by adding your first labour entry'}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Total Records</p>
          <p className={`text-2xl font-black ${textPrimary}`}>{filteredLabours.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Active</p>
          <p className={`text-2xl font-black text-[#C2D642]`}>{filteredLabours.filter(l => l.status === 'Active').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${cardClass}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Last Updated</p>
          <p className={`text-sm font-bold ${textPrimary}`}>Today</p>
        </div>
      </div>

      {/* Create Labour Modal */}
      <CreateLabourModal
        theme={theme}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingLabourId(null);
          setEditingLabourNumericId(null);
        }}
        onSuccess={handleLabourCreated}
        editingLabourId={editingLabourId}
        editingLabourNumericId={editingLabourNumericId}
        labours={labours}
      />
    </div>
  );
};

export default Labours;
