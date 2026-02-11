'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';

interface WarehouseData {
  id: string;
  uuid?: string;
  name: string;
  code?: string;
  project?: string;
  project_id?: number;
  tag_project?: number;
  location: string;
  logo?: string;
  status?: string;
}

interface CreateWarehouseModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingWarehouseId?: string | null; // UUID for display
  editingWarehouseNumericId?: number | string | null; // Numeric ID for API calls
  warehouses?: WarehouseData[];
  projects?: Array<{ id: number; name: string; uuid?: string }>;
  selectedProjectId?: number | string | null; // Pre-select project when adding new warehouse
}

const CreateWarehouseModal: React.FC<CreateWarehouseModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingWarehouseId = null,
  editingWarehouseNumericId = null,
  warehouses = [],
  projects = [],
  selectedProjectId = null
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', // Required: warehouse/store name
    location: '', // Required: store location
    tag_project: '' // Required: project ID to link
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localProjects, setLocalProjects] = useState<Array<{ id: number; name: string; uuid?: string }>>(projects);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Fetch projects when modal opens if not already provided
  useEffect(() => {
    const fetchProjectsIfNeeded = async () => {
      if (!isOpen) return;
      
      // If projects are already provided, use them
      if (projects && projects.length > 0) {
        setLocalProjects(projects);
        console.log('📋 Using provided projects:', projects.length);
        return;
      }
      
      // Otherwise, fetch projects from API
      setIsLoadingProjects(true);
      try {
        console.log('📋 Fetching projects for warehouse modal...');
        const fetchedProjects = await masterDataAPI.getProjects();
        const transformedProjects = fetchedProjects.map((project: any) => ({
          id: project.id,
          uuid: project.uuid,
          name: project.project_name || project.name || '',
        }));
        setLocalProjects(transformedProjects);
        console.log('✅ Projects fetched:', transformedProjects.length);
      } catch (error: any) {
        console.error('❌ Failed to fetch projects:', error);
        toast.showError(error.message || 'Failed to load projects');
        setLocalProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    
    fetchProjectsIfNeeded();
  }, [isOpen, projects]);
  
  // Update local projects when prop changes
  useEffect(() => {
    if (projects && projects.length > 0) {
      setLocalProjects(projects);
    }
  }, [projects]);
  
  // Log projects when modal opens or projects change
  useEffect(() => {
    if (isOpen) {
      console.log('📋 CreateWarehouseModal - Projects available:', {
        projectsCount: localProjects.length,
        projects: localProjects,
        isEditing: !!(editingWarehouseId && editingWarehouseNumericId)
      });
    }
  }, [isOpen, localProjects, editingWarehouseId, editingWarehouseNumericId]);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingWarehouseId && !!editingWarehouseNumericId;

  // Load warehouse data when editing
  useEffect(() => {
    if (isOpen && editingWarehouseId && editingWarehouseNumericId && localProjects.length > 0) {
      const loadWarehouseData = async () => {
        try {
          console.log('📖 Loading warehouse data for editing:', {
            editingWarehouseId: editingWarehouseId,
            editingWarehouseNumericId: editingWarehouseNumericId
          });
          
          // Use numeric ID for API call (backend queries numeric id column)
          const warehouseData = await masterDataAPI.getWarehouse(String(editingWarehouseNumericId));
          console.log('✅ Loaded warehouse data:', warehouseData);
          console.log('📋 All warehouse data fields:', Object.keys(warehouseData));
          console.log('📋 Warehouse data values:', {
            name: warehouseData.name,
            location: warehouseData.location,
            store_location: warehouseData.store_location,
            tag_project: warehouseData.tag_project,
            project_id: warehouseData.project_id,
            project: warehouseData.project,
            projects: warehouseData.projects // Check plural form
          });
          
          // Extract project ID - try multiple possible field names
          // API response uses "projects" (plural) as an object with id and project_name
          let projectId = warehouseData.projects?.id ||           // Check plural first (from API response)
                         warehouseData.tag_project || 
                         warehouseData.project_id || 
                         warehouseData.project?.id ||
                         '';
          
          console.log('🔍 Extracted project ID:', {
            fromProjectsId: warehouseData.projects?.id,
            fromTagProject: warehouseData.tag_project,
            fromProjectId: warehouseData.project_id,
            fromProjectObject: warehouseData.project?.id,
            finalProjectId: projectId
          });
          
          // Try to find matching project in projects list to ensure correct ID format
          // Dropdown uses: value={project.id || project.uuid}
          // So we need to match and use the same format
          if (projectId && localProjects.length > 0) {
            // Try multiple matching strategies
            let matchedProject = localProjects.find((p: any) => 
              String(p.id) === String(projectId)
            );
            
            // If not found by id, try uuid
            if (!matchedProject) {
              matchedProject = localProjects.find((p: any) => 
                String(p.uuid) === String(projectId)
              );
            }
            
            // If still not found, try matching with warehouseData.projects?.id
            if (!matchedProject && warehouseData.projects?.id) {
              matchedProject = localProjects.find((p: any) => 
                String(p.id) === String(warehouseData.projects.id) ||
                String(p.uuid) === String(warehouseData.projects.id)
              );
            }
            
            // If still not found, try matching with other project ID fields
            if (!matchedProject) {
              matchedProject = localProjects.find((p: any) => 
                String(p.id) === String(warehouseData.project_id) ||
                String(p.id) === String(warehouseData.tag_project) ||
                String(p.uuid) === String(warehouseData.project_id) ||
                String(p.uuid) === String(warehouseData.tag_project)
              );
            }
            
            if (matchedProject) {
              // Use the project ID from the projects list in the same format as dropdown options
              // Dropdown uses: value={project.id || project.uuid}
              projectId = String(matchedProject.id || matchedProject.uuid || projectId);
              console.log('✅ Found matching project:', {
                projectName: matchedProject.name,
                projectId: projectId,
                matchedProjectId: matchedProject.id,
                matchedProjectUuid: matchedProject.uuid,
                dropdownValue: matchedProject.id || matchedProject.uuid
              });
            } else {
              console.warn('⚠️ Project ID not found in projects list:', projectId);
              console.warn('Available projects:', localProjects.map((p: any) => ({
                id: p.id,
                uuid: p.uuid,
                name: p.name,
                dropdownValue: p.id || p.uuid
              })));
              console.warn('Warehouse project data:', {
                projects: warehouseData.projects,
                project_id: warehouseData.project_id,
                tag_project: warehouseData.tag_project
              });
              // Keep the original projectId even if not matched - might still work
              projectId = String(projectId);
            }
          } else if (!projectId) {
            console.warn('⚠️ No project ID found in warehouse data');
            projectId = '';
          } else if (localProjects.length === 0) {
            console.warn('⚠️ Projects list is empty, cannot match project ID');
            // Keep the projectId as string for form
            projectId = String(projectId || '');
          } else {
            // Convert to string for form
            projectId = String(projectId);
          }
          
          // Extract location - try multiple possible field names
          const location = warehouseData.location || 
                         warehouseData.store_location ||
                         warehouseData.address ||
                         '';
          
          // Extract name
          const name = warehouseData.name || 
                      warehouseData.store_name ||
                      warehouseData.warehouse_name ||
                      '';
          
          console.log('📝 Extracted values:', {
            name: name,
            location: location,
            projectId: projectId,
            projectIdType: typeof projectId,
            projectIdString: String(projectId),
            projectsAvailable: localProjects.length
          });
          
          // Populate ALL form fields from API response to preserve all previously filled data
          // User can decide which fields to edit/update
          // Ensure projectId is a string and matches dropdown option format
          const formProjectId = projectId ? String(projectId) : '';
          
          setFormData({
            name: name,
            location: location,
            tag_project: formProjectId
          });
          
          console.log('✅ Form populated with all fields for editing:', {
            name: name,
            location: location,
            tag_project: formProjectId,
            formDataTagProject: formProjectId,
            matchingDropdownValue: localProjects.find((p: any) => 
              String(p.id || p.uuid) === formProjectId
            )?.name || 'Not found'
          });
        } catch (error: any) {
          console.error('❌ Failed to load warehouse data:', error);
          console.error('❌ Error details:', {
            message: error.message,
            status: error.status,
            response: error.response?.data
          });
          toast.showError(error.message || 'Failed to load warehouse data');
        }
      };
      loadWarehouseData();
    } else if (isOpen && editingWarehouseId && editingWarehouseNumericId && localProjects.length === 0) {
      // Wait for projects to load before populating form
      console.log('⏳ Waiting for projects to load before populating form...');
    } else if (isOpen && !editingWarehouseId && !editingWarehouseNumericId) {
      // Reset form for new warehouse, pre-select project if provided
      // Only reset if not editing - preserve form data when editing
      setFormData({
        name: '',
        location: '',
        tag_project: selectedProjectId ? String(selectedProjectId) : ''
      });
    }
    // If editing, don't reset - preserve existing form data
  }, [isOpen, editingWarehouseId, editingWarehouseNumericId, selectedProjectId, localProjects]);

  // Reset form when modal closes (only if not editing)
  useEffect(() => {
    if (!isOpen && !editingWarehouseId && !editingWarehouseNumericId) {
      setFormData({
        name: '',
        location: '',
        tag_project: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen, editingWarehouseId, editingWarehouseNumericId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    const missingFields: string[] = [];

    if (!formData.name.trim()) missingFields.push('Warehouse Name');
    if (!formData.tag_project) missingFields.push('Tag Project');
    if (!formData.location.trim()) missingFields.push('Location');

    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        tag_project: Number(formData.tag_project)
      };

      if (isEditing && editingWarehouseNumericId) {
        // Update existing warehouse
        // Note: Laravel uses 'upadteId' (typo) instead of 'updateId'
        // Backend update function uses where('id', $upadteId) which queries numeric id column
        // So we use numeric ID for the update
        console.log('📝 Updating warehouse with numeric ID:', editingWarehouseNumericId);
        await masterDataAPI.updateWarehouse(String(editingWarehouseNumericId), payload);
        toast.showSuccess('Warehouse updated successfully!');
      } else {
        // Create new warehouse - set is_active to 1 (active) by default
        payload.is_active = 1;
        console.log('📦 Creating new warehouse with is_active = 1 (active by default)');
        await masterDataAPI.createWarehouse(payload);
        toast.showSuccess('Warehouse created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save warehouse:', error);
      toast.showError(error.message || 'Failed to save warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Warehouse' : 'Create New Warehouse'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update warehouse details below' : 'Enter warehouse details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Select Project */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              name="tag_project"
              value={formData.tag_project}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            >
              <option value="">-- Select Project --</option>
              {isLoadingProjects ? (
                <option value="" disabled>Loading projects...</option>
              ) : localProjects && localProjects.length > 0 ? (
                localProjects.map((project) => (
                  <option key={project.id || project.uuid} value={project.id || project.uuid}>
                    {project.name || 'Unnamed Project'}
                  </option>
                ))
              ) : (
                <option value="" disabled>No projects available</option>
              )}
            </select>
            {localProjects.length === 0 && !isLoadingProjects && (
              <p className={`text-xs mt-1 ${textSecondary}`}>
                No projects available. Please create a project first.
              </p>
            )}
          </div>

          {/* Warehouse Name */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Warehouse Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter warehouse/store name"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>

          {/* Location */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter warehouse location"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
              } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWarehouseModal;
