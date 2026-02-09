'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  ClipboardCheck,
  Plus,
  Edit,
  Search,
  X,
  Building2,
  Layers,
  Activity,
  ArrowRight,
  Boxes,
  Upload,
  Image as ImageIcon,
  Trash2,
  Users,
  Download,
  CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import CreateSubprojectModal from '../masters/Modals/CreateSubprojectModal';
import CreateActivityModal from '../masters/Modals/CreateActivityModal';
import CreateMaterialModal from '../masters/Modals/CreateMaterialModal';
import CreateLabourModal from '../masters/Modals/CreateLabourModal';
import CreateAssetEquipmentModal from '../masters/Modals/CreateAssetEquipmentModal';

interface Project {
  id: string;
  name: string;
  logo: string;
  code?: string;
  company?: string;
  location?: string;
}

interface Subproject {
  id: string;
  name: string;
  code: string;
  project: string;
  manager?: string;
  status: string;
  progress?: number;
  startDate: string;
  endDate: string;
}

interface ActivityItem {
  id: string;
  name: string;
  project: string;
  subproject: string;
  type: 'heading' | 'activity';
  unit?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

interface SelectedActivity {
  id: string;
  name: string;
  unit?: string;
  quantity: number;
  contractor?: string;
  images?: string[];
  remarks?: string;
}

interface Contractor {
  id: string;
  name: string;
  type: 'contractor' | 'supplier' | 'both';
}

interface Labour {
  id: string;
  name: string;
  type: string;
  category: string;
  createdAt?: string;
}

interface Material {
  id: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface SelectedMaterial {
  id: string;
  class: 'A' | 'B' | 'C';
  code: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  activity?: string;
  remarks?: string;
}

interface AssetEquipment {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  createdAt?: string;
}

interface SelectedAsset {
  id: string;
  code: string;
  name: string;
  quantity: number;
  activity?: string;
  contractor?: string;
  ratePerUnit: number;
  remarks?: string;
}

interface SafetyProblem {
  id: string;
  details: string;
}

interface SelectedSafetyProblem {
  id: string;
  details: string;
  image?: string;
  teamMembers?: string[];
  remarks?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface HindranceProblem {
  id: string;
  details: string;
}

interface SelectedHindranceProblem {
  id: string;
  details: string;
  image?: string;
  teamMembers?: string[];
  remarks?: string;
}

interface SelectedLabour {
  id: string;
  type: string;
  category: string;
  quantity: number;
  overtimeQuantity: number;
  activity?: string;
  contractor?: string;
  ratePerUnit: number;
  remarks?: string;
}

interface DPRProps {
  theme: ThemeType;
}

const DPR: React.FC<DPRProps> = ({ theme }) => {
  const [showProjectSelection, setShowProjectSelection] = useState<boolean>(false);
  const [showSubprojectSelection, setShowSubprojectSelection] = useState<boolean>(false);
  const [showActivitySelection, setShowActivitySelection] = useState<boolean>(false);
  const [showMaterialSelection, setShowMaterialSelection] = useState<boolean>(false);
  const [showLabourSelection, setShowLabourSelection] = useState<boolean>(false);
  const [showAssetSelection, setShowAssetSelection] = useState<boolean>(false);
  const [showSafetySelection, setShowSafetySelection] = useState<boolean>(false);
  const [showHindranceSelection, setShowHindranceSelection] = useState<boolean>(false);
  const [showDPRComplete, setShowDPRComplete] = useState<boolean>(false);
  const [showCreateSubprojectModal, setShowCreateSubprojectModal] = useState<boolean>(false);
  const [showCreateActivityModal, setShowCreateActivityModal] = useState<boolean>(false);
  const [showCreateMaterialModal, setShowCreateMaterialModal] = useState<boolean>(false);
  const [showCreateLabourModal, setShowCreateLabourModal] = useState<boolean>(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState<boolean>(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [subprojectSearchQuery, setSubprojectSearchQuery] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [assets, setAssets] = useState<AssetEquipment[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSubproject, setSelectedSubproject] = useState<Subproject | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Map<string, SelectedActivity>>(new Map());
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectedMaterial>>(new Map());
  const [selectedLabours, setSelectedLabours] = useState<Map<string, SelectedLabour>>(new Map());
  const [selectedAssets, setSelectedAssets] = useState<Map<string, SelectedAsset>>(new Map());
  const [selectedSafetyProblems, setSelectedSafetyProblems] = useState<Map<string, SelectedSafetyProblem>>(new Map());
  const [selectedHindranceProblems, setSelectedHindranceProblems] = useState<Map<string, SelectedHindranceProblem>>(new Map());
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [safetyProblems, setSafetyProblems] = useState<SafetyProblem[]>([]);
  const [hindranceProblems, setHindranceProblems] = useState<HindranceProblem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Load projects from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lotus Rise',
        'Lakeshire',
        'Demo Data',
        'Residential Complex A',
        'Commercial Tower B'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectsData: Project[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectsData = parsed.map((project: any) => ({
            id: project.id || project.name,
            name: project.name,
            logo: project.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=C2D642&color=fff&size=128`,
            code: project.code,
            company: project.company,
            location: project.location
          }));
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      // Add default projects with images
      const defaultProjectsData: Project[] = defaultProjectNames.map((name, idx) => ({
        id: `default-${idx}`,
        name,
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C2D642&color=fff&size=128`
      }));

      // Set projects for modal display
      setProjects([...defaultProjectsData, ...userProjectsData]);
    };

    loadProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', loadProjects);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', loadProjects);
    };
  }, []);

  // Load subprojects from localStorage
  useEffect(() => {
    const loadSubprojects = () => {
      const defaultSubprojects: Subproject[] = [
        { id: '1', name: 'Foundation Work', code: 'SUB001', project: 'Residential Complex A', manager: 'John Doe', status: 'Active', progress: 85, startDate: '2024-01-20', endDate: '2024-03-15' },
        { id: '2', name: 'Structural Framework', code: 'SUB002', project: 'Residential Complex A', manager: 'John Doe', status: 'In Progress', progress: 60, startDate: '2024-03-16', endDate: '2024-06-30' },
        { id: '3', name: 'A wing', code: 'SUB003', project: 'Lakeshire', manager: 'Jane Smith', status: 'Active', progress: 75, startDate: '2024-01-15', endDate: '2024-05-20' },
        { id: '4', name: 'B wing', code: 'SUB004', project: 'Lakeshire', manager: 'Jane Smith', status: 'In Progress', progress: 45, startDate: '2024-03-01', endDate: '2024-07-15' },
        { id: '5', name: 'Electrical Installation', code: 'SUB005', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'In Progress', progress: 45, startDate: '2024-02-25', endDate: '2024-05-20' },
        { id: '6', name: 'HVAC System', code: 'SUB006', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'Pending', progress: 0, startDate: '2024-05-21', endDate: '2024-07-10' },
      ];

      const savedSubprojects = localStorage.getItem('subprojects');
      let userSubprojects: Subproject[] = [];
      
      if (savedSubprojects) {
        try {
          const parsed = JSON.parse(savedSubprojects);
          userSubprojects = parsed.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            code: sub.code || `SUB${String(sub.id).padStart(3, '0')}`,
            project: sub.project,
            manager: sub.manager,
            status: sub.status || 'Pending',
            progress: sub.progress || 0,
            startDate: sub.startDate || '',
            endDate: sub.endDate || ''
          }));
        } catch (e) {
          console.error('Error parsing subprojects:', e);
        }
      }

      setSubprojects([...defaultSubprojects, ...userSubprojects]);
    };

    loadSubprojects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subprojects') {
        loadSubprojects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('subprojectsUpdated', loadSubprojects);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('subprojectsUpdated', loadSubprojects);
    };
  }, []);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const query = projectSearchQuery.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.code?.toLowerCase().includes(query) ||
      project.company?.toLowerCase().includes(query)
    );
  }, [projects, projectSearchQuery]);

  // Filter subprojects by selected project and search query
  const filteredSubprojects = useMemo(() => {
    if (!selectedProject) return [];
    
    let filtered = subprojects.filter(sub => sub.project === selectedProject.name);
    
    if (subprojectSearchQuery.trim()) {
      const query = subprojectSearchQuery.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.name.toLowerCase().includes(query) ||
        sub.code.toLowerCase().includes(query) ||
        sub.manager?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [subprojects, selectedProject, subprojectSearchQuery]);

  const handleCreateNewDPR = () => {
    setShowProjectSelection(true);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectSelection(false);
    setShowSubprojectSelection(true);
    setProjectSearchQuery('');
    setSubprojectSearchQuery('');
  };

  const handleSelectSubproject = (subproject: Subproject) => {
    setSelectedSubproject(subproject);
    setShowSubprojectSelection(false);
    setShowActivitySelection(true);
    setSubprojectSearchQuery('');
  };

  // Load contractors from vendors
  useEffect(() => {
    const loadContractors = () => {
      const savedVendors = localStorage.getItem('vendors');
      let contractorList: Contractor[] = [];
      
      if (savedVendors) {
        try {
          const parsed = JSON.parse(savedVendors);
          contractorList = parsed
            .filter((vendor: any) => vendor.type === 'contractor' || vendor.type === 'both')
            .map((vendor: any) => ({
              id: vendor.id,
              name: vendor.name,
              type: vendor.type
            }));
        } catch (e) {
          console.error('Error parsing vendors:', e);
        }
      }

      // Add default contractors if none exist
      if (contractorList.length === 0) {
        contractorList = [
          { id: '1', name: 'One Test Contractor', type: 'contractor' },
          { id: '2', name: 'Ramji', type: 'contractor' },
        ];
      }

      setContractors(contractorList);
    };

    loadContractors();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vendors') {
        loadContractors();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('vendorsUpdated', loadContractors);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vendorsUpdated', loadContractors);
    };
  }, []);

  // Load activities from localStorage
  useEffect(() => {
    const loadActivities = () => {
      const defaultActivities: ActivityItem[] = [
        { id: '1', name: 'Excavation & Misc', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-15T00:00:00.000Z' },
        { id: '2', name: 'PCC', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-16T00:00:00.000Z' },
        { id: '3', name: 'Steel Reinforcement', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Kgs', createdAt: '2024-01-17T00:00:00.000Z' },
        { id: '4', name: 'Concrete Work', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-18T00:00:00.000Z' },
        { id: '5', name: 'Masonry', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Cum', createdAt: '2024-01-19T00:00:00.000Z' },
        { id: '6', name: 'Plastering, Gypsum, POP', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-20T00:00:00.000Z' },
        { id: '7', name: 'Water Proofing', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-21T00:00:00.000Z' },
        { id: '8', name: 'Doors & Windows', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
        { id: '9', name: 'Tiling & Paver Work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-23T00:00:00.000Z' },
        { id: '10', name: 'Railing & Fabrication work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Rmt', createdAt: '2024-01-24T00:00:00.000Z' },
        { id: '11', name: 'Electrical', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Nos', createdAt: '2024-01-25T00:00:00.000Z' },
        { id: '12', name: 'Plumbing', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
        { id: '13', name: 'Painting', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-27T00:00:00.000Z' },
        { id: '14', name: 'Bituminous Works', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Sqm', createdAt: '2024-01-28T00:00:00.000Z' },
        { id: '15', name: 'Sub Activites 1.1', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'heading', createdAt: '2024-01-29T00:00:00.000Z' },
      ];

      const savedActivities = localStorage.getItem('activities');
      let userActivities: ActivityItem[] = [];
      
      if (savedActivities) {
        try {
          const parsed = JSON.parse(savedActivities);
          userActivities = parsed.map((act: any) => ({
            id: act.id,
            name: act.name,
            project: act.project,
            subproject: act.subproject,
            type: act.type,
            unit: act.unit,
            qty: act.qty,
            rate: act.rate,
            amount: act.amount,
            startDate: act.startDate,
            endDate: act.endDate,
            createdAt: act.createdAt
          }));
        } catch (e) {
          console.error('Error parsing activities:', e);
        }
      }

      setActivities([...defaultActivities, ...userActivities]);
    };

    loadActivities();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activities') {
        loadActivities();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('activitiesUpdated', loadActivities);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activitiesUpdated', loadActivities);
    };
  }, []);

  // Filter activities - show all activities (only activities, not headings)
  const filteredActivities = useMemo(() => {
    // Show all activities regardless of project/subproject
    // Only show activities, not headings
    return activities.filter(activity => 
      activity.type === 'activity' // Only show activities, not headings
    );
  }, [activities]);

  const handleToggleActivity = (activity: ActivityItem) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      if (newMap.has(activity.id)) {
        newMap.delete(activity.id);
      } else {
        newMap.set(activity.id, {
          id: activity.id,
          name: activity.name,
          unit: activity.unit,
          quantity: 0
        });
      }
      return newMap;
    });
  };

  const handleQuantityChange = (activityId: string, quantity: number) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleContractorChange = (activityId: string, contractor: string) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleRemarksChange = (activityId: string, remarks: string) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity) {
        newMap.set(activityId, {
          ...activity,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleImageUpload = (activityId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imagePromises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(imageDataUrls => {
      setSelectedActivities(prev => {
        const newMap = new Map(prev);
        const activity = newMap.get(activityId);
        if (activity) {
          const currentImages = activity.images || [];
          newMap.set(activityId, { 
            ...activity, 
            images: [...currentImages, ...imageDataUrls]
          });
        }
        return newMap;
      });
    });
  };

  const handleRemoveImage = (activityId: string, imageIndex: number) => {
    setSelectedActivities(prev => {
      const newMap = new Map(prev);
      const activity = newMap.get(activityId);
      if (activity && activity.images) {
        const updatedImages = activity.images.filter((_, idx) => idx !== imageIndex);
        newMap.set(activityId, { ...activity, images: updatedImages });
      }
      return newMap;
    });
  };

  const handleActivitySelectionNext = () => {
    setShowActivitySelection(false);
    setShowMaterialSelection(true);
  };

  // Load materials from localStorage
  useEffect(() => {
    const loadMaterials = () => {
      const defaultMaterials: Material[] = [
        { id: '1', class: 'A', code: 'M685270', name: 'Cement', specification: 'OPC testy', unit: 'Packet', createdAt: '2024-01-15T00:00:00.000Z' },
        { id: '2', class: 'A', code: 'M984236', name: 'RMC', specification: 'M40', unit: 'Cft', createdAt: '2024-01-16T00:00:00.000Z' },
        { id: '3', class: 'B', code: 'M211203', name: 'Measuring Tape', specification: '1/2 Inches', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
        { id: '4', class: 'B', code: 'M257929', name: 'Hose Pipe', specification: '1 Inches', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
        { id: '5', class: 'B', code: 'M205837', name: 'Hose Pipe', specification: '', unit: 'Rft', createdAt: '2024-01-19T00:00:00.000Z' },
        { id: '6', class: 'B', code: 'M987837', name: 'Nylon Rope', specification: '', unit: 'Rft', createdAt: '2024-01-20T00:00:00.000Z' },
        { id: '7', class: 'C', code: 'M183654', name: 'Oil', specification: '', unit: 'Ltr', createdAt: '2024-01-21T00:00:00.000Z' },
        { id: '8', class: 'C', code: 'M976735', name: 'Cover Blocks', specification: '20mm', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
        { id: '9', class: 'C', code: 'M421512', name: 'Cover Blocks', specification: '25mm', unit: 'Nos', createdAt: '2024-01-23T00:00:00.000Z' },
        { id: '10', class: 'C', code: 'M625759', name: 'Petrol', specification: '', unit: 'Ltr', createdAt: '2024-01-24T00:00:00.000Z' },
        { id: '11', class: 'C', code: 'M232620', name: 'Diesel', specification: '', unit: 'Ltr', createdAt: '2024-01-25T00:00:00.000Z' },
        { id: '12', class: 'B', code: 'M932823', name: 'UPVC', specification: '12 inch', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
        { id: '13', class: 'A', code: 'M880841', name: 'Tmt Concrete', specification: '', unit: 'Cft', createdAt: '2024-01-27T00:00:00.000Z' },
        { id: '14', class: 'A', code: 'M100439', name: 'Cement', specification: 'OPC 53 grade', unit: 'Bags', createdAt: '2024-01-28T00:00:00.000Z' },
      ];

      const savedMaterials = localStorage.getItem('materials');
      let userMaterials: Material[] = [];
      
      if (savedMaterials) {
        try {
          const parsed = JSON.parse(savedMaterials);
          userMaterials = parsed.map((mat: any) => ({
            id: mat.id,
            class: mat.class,
            code: mat.code,
            name: mat.name,
            specification: mat.specification || '',
            unit: mat.unit,
            createdAt: mat.createdAt
          }));
        } catch (e) {
          console.error('Error parsing materials:', e);
        }
      }

      setMaterials([...defaultMaterials, ...userMaterials]);
    };

    loadMaterials();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'materials') {
        loadMaterials();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('materialsUpdated', loadMaterials);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('materialsUpdated', loadMaterials);
    };
  }, []);

  const handleToggleMaterial = (material: Material) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      if (newMap.has(material.id)) {
        newMap.delete(material.id);
      } else {
        newMap.set(material.id, {
          id: material.id,
          class: material.class,
          code: material.code,
          name: material.name,
          specification: material.specification,
          unit: material.unit,
          quantity: 0
        });
      }
      return newMap;
    });
  };

  const handleMaterialQuantityChange = (materialId: string, quantity: number) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleMaterialActivityChange = (materialId: string, activity: string) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleMaterialRemarksChange = (materialId: string, remarks: string) => {
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, {
          ...material,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleMaterialSelectionNext = () => {
    setShowMaterialSelection(false);
    setShowLabourSelection(true);
  };

  // Get selected activity names for material activity dropdown
  const selectedActivityNames = useMemo(() => {
    return Array.from(selectedActivities.values()).map(act => act.name);
  }, [selectedActivities]);

  // Load labours from localStorage
  useEffect(() => {
    const loadLabours = () => {
      const defaultLabours: Labour[] = [
        { id: 'LAB001', name: 'Supervisor', type: 'Supervisor', category: 'Skilled', createdAt: '2024-01-15T00:00:00.000Z' },
        { id: 'LAB002', name: 'Foremen', type: 'Foremen', category: 'Skilled', createdAt: '2024-01-16T00:00:00.000Z' },
        { id: 'LAB003', name: 'Helpers', type: 'Helpers', category: 'Semi Skilled', createdAt: '2024-01-17T00:00:00.000Z' },
        { id: 'LAB004', name: 'Male Coolie', type: 'Male Coolie', category: 'Unskilled', createdAt: '2024-01-18T00:00:00.000Z' },
        { id: 'LAB005', name: 'Female Coolie', type: 'Female Coolie', category: 'Unskilled', createdAt: '2024-01-19T00:00:00.000Z' },
        { id: 'LAB006', name: 'General Laborers', type: 'General Laborers', category: 'Unskilled', createdAt: '2024-01-20T00:00:00.000Z' },
        { id: 'LAB007', name: 'Beldar', type: 'Beldar', category: 'Unskilled', createdAt: '2024-01-21T00:00:00.000Z' },
        { id: 'LAB008', name: 'Masons', type: 'Masons', category: 'Skilled', createdAt: '2024-01-22T00:00:00.000Z' },
        { id: 'LAB009', name: 'Carpenters', type: 'Carpenters', category: 'Skilled', createdAt: '2024-01-23T00:00:00.000Z' },
        { id: 'LAB010', name: 'Electricians', type: 'Electricians', category: 'Skilled', createdAt: '2024-01-24T00:00:00.000Z' },
      ];

      const savedLabours = localStorage.getItem('labours');
      let userLabours: Labour[] = [];
      
      if (savedLabours) {
        try {
          const parsed = JSON.parse(savedLabours);
          userLabours = parsed.map((lab: any) => ({
            id: lab.id,
            name: lab.name || lab.type,
            type: lab.type,
            category: lab.category,
            createdAt: lab.createdAt
          }));
        } catch (e) {
          console.error('Error parsing labours:', e);
        }
      }

      setLabours([...defaultLabours, ...userLabours]);
    };

    loadLabours();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'labours') {
        loadLabours();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('laboursUpdated', loadLabours);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('laboursUpdated', loadLabours);
    };
  }, []);

  // Load assets from localStorage
  useEffect(() => {
    const loadAssets = () => {
      const defaultAssets: AssetEquipment[] = [
        { id: '1', code: 'AE001', name: 'Machinery Hire', specification: 'Heavy Duty', unit: 'Hrs', createdAt: '2024-01-15T00:00:00.000Z' },
        { id: '2', code: 'AE002', name: 'Breaker Hire', specification: 'Industrial Grade', unit: 'Hrs', createdAt: '2024-01-16T00:00:00.000Z' },
        { id: '3', code: 'AE003', name: 'MS Props', specification: 'Standard Size', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
        { id: '4', code: 'AE004', name: 'MS Shikanja', specification: 'Reinforced', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
        { id: '5', code: 'AE005', name: 'MS Shuttering Plates', specification: 'Steel Grade', unit: 'Sqm', createdAt: '2024-01-19T00:00:00.000Z' },
        { id: '6', code: 'AE006', name: 'Concrete Breaker Machine', specification: 'Portable', unit: 'Hrs', createdAt: '2024-01-20T00:00:00.000Z' },
        { id: '7', code: 'AE007', name: 'Measuring Tape', specification: '50m', unit: 'Nos', createdAt: '2024-01-21T00:00:00.000Z' },
        { id: '8', code: 'AE008', name: 'Helmets', specification: 'Safety Certified', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
      ];

      const savedAssets = localStorage.getItem('assetsEquipments');
      let userAssets: AssetEquipment[] = [];
      
      if (savedAssets) {
        try {
          const parsed = JSON.parse(savedAssets);
          userAssets = parsed.map((asset: any) => ({
            id: asset.id,
            code: asset.code,
            name: asset.name,
            specification: asset.specification || '',
            unit: asset.unit,
            createdAt: asset.createdAt
          }));
        } catch (e) {
          console.error('Error parsing assets:', e);
        }
      }

      setAssets([...defaultAssets, ...userAssets]);
    };

    loadAssets();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'assetsEquipments') {
        loadAssets();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('assetsEquipmentsUpdated', loadAssets);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('assetsEquipmentsUpdated', loadAssets);
    };
  }, []);

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) {
      return assets;
    }
    const query = assetSearchQuery.toLowerCase();
    return assets.filter(asset =>
      asset.code.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query) ||
      asset.specification.toLowerCase().includes(query) ||
      asset.unit.toLowerCase().includes(query)
    );
  }, [assets, assetSearchQuery]);

  const handleToggleLabour = (labour: Labour) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      if (newMap.has(labour.id)) {
        newMap.delete(labour.id);
      } else {
        newMap.set(labour.id, {
          id: labour.id,
          type: labour.type,
          category: labour.category,
          quantity: 0,
          overtimeQuantity: 0,
          ratePerUnit: 0
        });
      }
      return newMap;
    });
  };

  const handleLabourQuantityChange = (labourId: string, quantity: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleLabourOvertimeQuantityChange = (labourId: string, overtimeQuantity: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          overtimeQuantity: overtimeQuantity
        });
      }
      return newMap;
    });
  };

  const handleLabourActivityChange = (labourId: string, activity: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleLabourContractorChange = (labourId: string, contractor: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleLabourRateChange = (labourId: string, ratePerUnit: number) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          ratePerUnit: ratePerUnit
        });
      }
      return newMap;
    });
  };

  const handleLabourRemarksChange = (labourId: string, remarks: string) => {
    setSelectedLabours(prev => {
      const newMap = new Map(prev);
      const labour = newMap.get(labourId);
      if (labour) {
        newMap.set(labourId, {
          ...labour,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleLabourSelectionNext = () => {
    setShowLabourSelection(false);
    setShowAssetSelection(true);
  };

  const handleToggleAsset = (asset: AssetEquipment) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      if (newMap.has(asset.id)) {
        newMap.delete(asset.id);
      } else {
        newMap.set(asset.id, {
          id: asset.id,
          code: asset.code,
          name: asset.name,
          quantity: 0,
          ratePerUnit: 0
        });
      }
      return newMap;
    });
  };

  const handleAssetQuantityChange = (assetId: string, quantity: number) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          quantity: quantity
        });
      }
      return newMap;
    });
  };

  const handleAssetActivityChange = (assetId: string, activity: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          activity: activity
        });
      }
      return newMap;
    });
  };

  const handleAssetContractorChange = (assetId: string, contractor: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          contractor: contractor
        });
      }
      return newMap;
    });
  };

  const handleAssetRateChange = (assetId: string, ratePerUnit: number) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          ratePerUnit: ratePerUnit
        });
      }
      return newMap;
    });
  };

  const handleAssetRemarksChange = (assetId: string, remarks: string) => {
    setSelectedAssets(prev => {
      const newMap = new Map(prev);
      const asset = newMap.get(assetId);
      if (asset) {
        newMap.set(assetId, {
          ...asset,
          remarks: remarks
        });
      }
      return newMap;
    });
  };

  const handleAssetSelectionNext = () => {
    setShowAssetSelection(false);
    setShowSafetySelection(true);
  };

  // Load team members from localStorage
  useEffect(() => {
    const loadTeamMembers = () => {
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed)) {
            const members: TeamMember[] = parsed.map((u: any) => ({
              id: u.id || Date.now().toString(),
              name: u.name || '',
              email: u.email || ''
            })).filter((m: TeamMember) => m.name && m.email);
            setTeamMembers(members);
          }
        } catch (e) {
          console.error('Error parsing users:', e);
        }
      }
    };
    loadTeamMembers();
    
    // Listen for storage events
    const handleStorageChange = () => {
      loadTeamMembers();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('usersUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usersUpdated', handleStorageChange);
    };
  }, []);

  // Initialize default safety problems
  useEffect(() => {
    const defaultSafetyProblems: SafetyProblem[] = [
      { id: '1', details: 'Unsafe scaffolding' },
      { id: '2', details: 'Missing safety barriers' },
      { id: '3', details: 'Improper use of PPE' },
      { id: '4', details: 'Exposed electrical wires' },
      { id: '5', details: 'Slippery surfaces' },
      { id: '6', details: 'Unsafe material storage' },
      { id: '7', details: 'Inadequate lighting' },
      { id: '8', details: 'Blocked emergency exits' },
    ];
    setSafetyProblems(defaultSafetyProblems);
  }, []);

  const handleToggleSafetyProblem = (problem: SafetyProblem) => {
    setSelectedSafetyProblems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(problem.id)) {
        newMap.delete(problem.id);
      } else {
        newMap.set(problem.id, {
          id: problem.id,
          details: problem.details,
          image: '',
          teamMembers: [],
          remarks: ''
        });
      }
      return newMap;
    });
  };

  const handleSafetyImageUpload = (problemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedSafetyProblems(prev => {
        const newMap = new Map(prev);
        const problem = newMap.get(problemId);
        if (problem) {
          newMap.set(problemId, { ...problem, image: result });
        }
        return newMap;
      });
    };
    reader.readAsDataURL(files[0]);
  };

  const handleSafetyRemoveImage = (problemId: string) => {
    setSelectedSafetyProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, image: '' });
      }
      return newMap;
    });
  };

  const handleSafetyTeamMembersChange = (problemId: string, memberIds: string[]) => {
    setSelectedSafetyProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, teamMembers: memberIds });
      }
      return newMap;
    });
  };

  const handleSafetyRemarksChange = (problemId: string, remarks: string) => {
    setSelectedSafetyProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, remarks });
      }
      return newMap;
    });
  };

  const handleSafetyNext = () => {
    setShowSafetySelection(false);
    setShowHindranceSelection(true);
  };

  const handleSafetySkip = () => {
    setShowSafetySelection(false);
    setShowHindranceSelection(true);
  };

  // Initialize default hindrance problems
  useEffect(() => {
    const defaultHindranceProblems: HindranceProblem[] = [
      { id: '1', details: 'Weather delays' },
      { id: '2', details: 'Material unavailability' },
      { id: '3', details: 'Equipment breakdown' },
      { id: '4', details: 'Labour shortage' },
      { id: '5', details: 'Site access issues' },
      { id: '6', details: 'Permit delays' },
      { id: '7', details: 'Design changes' },
      { id: '8', details: 'Utility conflicts' },
      { id: '9', details: 'Traffic restrictions' },
      { id: '10', details: 'Environmental concerns' },
    ];
    setHindranceProblems(defaultHindranceProblems);
  }, []);

  const handleToggleHindranceProblem = (problem: HindranceProblem) => {
    setSelectedHindranceProblems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(problem.id)) {
        newMap.delete(problem.id);
      } else {
        newMap.set(problem.id, {
          id: problem.id,
          details: problem.details,
          image: '',
          teamMembers: [],
          remarks: ''
        });
      }
      return newMap;
    });
  };

  const handleHindranceImageUpload = (problemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedHindranceProblems(prev => {
        const newMap = new Map(prev);
        const problem = newMap.get(problemId);
        if (problem) {
          newMap.set(problemId, { ...problem, image: result });
        }
        return newMap;
      });
    };
    reader.readAsDataURL(files[0]);
  };

  const handleHindranceRemoveImage = (problemId: string) => {
    setSelectedHindranceProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, image: '' });
      }
      return newMap;
    });
  };

  const handleHindranceTeamMembersChange = (problemId: string, memberIds: string[]) => {
    setSelectedHindranceProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, teamMembers: memberIds });
      }
      return newMap;
    });
  };

  const handleHindranceRemarksChange = (problemId: string, remarks: string) => {
    setSelectedHindranceProblems(prev => {
      const newMap = new Map(prev);
      const problem = newMap.get(problemId);
      if (problem) {
        newMap.set(problemId, { ...problem, remarks });
      }
      return newMap;
    });
  };

  const generateDPRPDF = async () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to add image to PDF (returns Promise)
    const addImageToPDF = (imageData: string, x: number, y: number, maxWidth: number, maxHeight: number): Promise<number> => {
      return new Promise((resolve) => {
        try {
          // Check if imageData is valid
          if (!imageData || (!imageData.startsWith('data:image/') && !imageData.startsWith('http'))) {
            console.error('Invalid image data');
            doc.text('Invalid image data', x, yPosition);
            resolve(lineHeight);
            return;
          }

          const img = new Image();
          
          img.onload = () => {
            try {
              // Calculate dimensions maintaining aspect ratio
              let imgWidth = maxWidth;
              let imgHeight = (img.height / img.width) * imgWidth;
              
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (img.width / img.height) * imgHeight;
              }
              
              // Check if image needs to be on a new page
              if (yPosition + imgHeight + 5 > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              
              // Determine image format from data URL
              let format = 'JPEG';
              if (imageData.includes('data:image/png')) {
                format = 'PNG';
              } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
                format = 'JPEG';
              }
              
              // Add image to PDF - jsPDF can handle full data URLs
              doc.addImage(imageData, format, x, yPosition, imgWidth, imgHeight);
              resolve(imgHeight + 5);
            } catch (error) {
              console.error('Error adding image to PDF:', error);
              // Try with full data URL as fallback
              try {
                let format = 'JPEG';
                if (imageData.includes('data:image/png')) {
                  format = 'PNG';
                }
                doc.addImage(imageData, format, x, yPosition, maxWidth, maxHeight);
                resolve(maxHeight + 5);
              } catch (fallbackError) {
                console.error('Fallback image add also failed:', fallbackError);
                doc.text('Image could not be loaded', x, yPosition);
                resolve(lineHeight);
              }
            }
          };
          
          img.onerror = (error) => {
            console.error('Image load error:', error);
            // Try to add image directly anyway
            try {
              let format = 'JPEG';
              if (imageData.includes('data:image/png')) {
                format = 'PNG';
              }
              doc.addImage(imageData, format, x, yPosition, maxWidth, maxHeight);
              resolve(maxHeight + 5);
            } catch (addError) {
              console.error('Direct image add failed:', addError);
              doc.text('Image could not be loaded', x, yPosition);
              resolve(lineHeight);
            }
          };
          
          // Set image source
          img.src = imageData;
          
          // If image is already loaded (cached), trigger onload immediately
          if (img.complete && img.naturalHeight !== 0) {
            img.onload(new Event('load') as any);
          }
        } catch (error) {
          console.error('Error in addImageToPDF:', error);
          doc.text('Image could not be loaded', x, yPosition);
          resolve(lineHeight);
        }
      });
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Progress Report (DPR)', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Date: ${currentDate}`, margin, yPosition);
    yPosition += sectionSpacing;

    // Project Information
    if (selectedProject && selectedSubproject) {
      checkPageBreak(20);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Information', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Project: ${selectedProject.name}`, margin, yPosition);
      yPosition += lineHeight;
      doc.text(`Subproject: ${selectedSubproject.name}`, margin, yPosition);
      yPosition += lineHeight;
      if (selectedProject.code) {
        doc.text(`Project Code: ${selectedProject.code}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += sectionSpacing;
    }

    // Activities Section
    if (selectedActivities.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Activities', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const activitiesHeaders = ['Sr No', 'Activity', 'Unit', 'Quantity', 'Contractor', 'Remarks'];
      const colWidths = [15, 60, 20, 25, 40, 30];
      let xPos = margin;
      
      activitiesHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPosition);
        xPos += colWidths[idx];
      });
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      for (const activity of selectedActivities.values()) {
        checkPageBreak(15);
        xPos = margin;
        doc.text(srNo.toString(), xPos, yPosition);
        xPos += colWidths[0];
        doc.text(activity.name || '-', xPos, yPosition);
        xPos += colWidths[1];
        doc.text(activity.unit || '-', xPos, yPosition);
        xPos += colWidths[2];
        doc.text(activity.quantity.toString(), xPos, yPosition);
        xPos += colWidths[3];
        doc.text(activity.contractor || '-', xPos, yPosition);
        xPos += colWidths[4];
        const remarksLines = doc.splitTextToSize(activity.remarks || '-', colWidths[5]);
        doc.text(remarksLines, xPos, yPosition);
        yPosition += Math.max(lineHeight, remarksLines.length * lineHeight);
        
        // Add images if any
        if (activity.images && activity.images.length > 0) {
          yPosition += lineHeight;
          doc.setFontSize(9);
          doc.text('Images:', margin, yPosition);
          yPosition += lineHeight + 2;
          
          for (const image of activity.images) {
            const imageHeight = await addImageToPDF(image, margin, yPosition, pageWidth - 2 * margin, 40);
            yPosition += imageHeight + 2;
            checkPageBreak(50);
          }
          
          doc.setFontSize(10);
        }
        
        srNo++;
      }
      yPosition += sectionSpacing;
    }

    // Materials Section
    if (selectedMaterials.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Materials', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const materialsHeaders = ['Sr No', 'Material', 'Unit', 'Quantity', 'Activity', 'Remarks'];
      const materialColWidths = [15, 50, 20, 25, 40, 30];
      let xPos = margin;
      
      materialsHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPosition);
        xPos += materialColWidths[idx];
      });
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      selectedMaterials.forEach((material) => {
        checkPageBreak(15);
        xPos = margin;
        doc.text(srNo.toString(), xPos, yPosition);
        xPos += materialColWidths[0];
        doc.text(`${material.name} (${material.code})`, xPos, yPosition);
        xPos += materialColWidths[1];
        doc.text(material.unit, xPos, yPosition);
        xPos += materialColWidths[2];
        doc.text(material.quantity.toString(), xPos, yPosition);
        xPos += materialColWidths[3];
        doc.text(material.activity || '-', xPos, yPosition);
        xPos += materialColWidths[4];
        const remarksLines = doc.splitTextToSize(material.remarks || '-', materialColWidths[5]);
        doc.text(remarksLines, xPos, yPosition);
        yPosition += Math.max(lineHeight, remarksLines.length * lineHeight);
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Labours Section
    if (selectedLabours.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Labours', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const laboursHeaders = ['Sr No', 'Labour', 'Category', 'Qty', 'OT Qty', 'Activity', 'Contractor', 'Rate', 'Remarks'];
      const labourColWidths = [12, 35, 20, 15, 15, 30, 30, 20, 25];
      let xPos = margin;
      
      laboursHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPosition);
        xPos += labourColWidths[idx];
      });
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      selectedLabours.forEach((labour) => {
        checkPageBreak(15);
        xPos = margin;
        doc.text(srNo.toString(), xPos, yPosition);
        xPos += labourColWidths[0];
        doc.text(labour.type || '-', xPos, yPosition);
        xPos += labourColWidths[1];
        doc.text(labour.category || '-', xPos, yPosition);
        xPos += labourColWidths[2];
        doc.text(labour.quantity.toString(), xPos, yPosition);
        xPos += labourColWidths[3];
        doc.text(labour.overtimeQuantity.toString(), xPos, yPosition);
        xPos += labourColWidths[4];
        doc.text(labour.activity || '-', xPos, yPosition);
        xPos += labourColWidths[5];
        doc.text(labour.contractor || '-', xPos, yPosition);
        xPos += labourColWidths[6];
        doc.text(labour.ratePerUnit.toString(), xPos, yPosition);
        xPos += labourColWidths[7];
        const remarksLines = doc.splitTextToSize(labour.remarks || '-', labourColWidths[8]);
        doc.text(remarksLines, xPos, yPosition);
        yPosition += Math.max(lineHeight, remarksLines.length * lineHeight);
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Assets Section
    if (selectedAssets.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Assets & Equipments', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const assetsHeaders = ['Sr No', 'Asset', 'Quantity', 'Activity', 'Contractor', 'Rate', 'Remarks'];
      const assetColWidths = [12, 50, 20, 30, 30, 20, 28];
      let xPos = margin;
      
      assetsHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPosition);
        xPos += assetColWidths[idx];
      });
      yPosition += lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      selectedAssets.forEach((asset) => {
        checkPageBreak(15);
        xPos = margin;
        doc.text(srNo.toString(), xPos, yPosition);
        xPos += assetColWidths[0];
        doc.text(`${asset.name} (${asset.code})`, xPos, yPosition);
        xPos += assetColWidths[1];
        doc.text(asset.quantity.toString(), xPos, yPosition);
        xPos += assetColWidths[2];
        doc.text(asset.activity || '-', xPos, yPosition);
        xPos += assetColWidths[3];
        doc.text(asset.contractor || '-', xPos, yPosition);
        xPos += assetColWidths[4];
        doc.text(asset.ratePerUnit.toString(), xPos, yPosition);
        xPos += assetColWidths[5];
        const remarksLines = doc.splitTextToSize(asset.remarks || '-', assetColWidths[6]);
        doc.text(remarksLines, xPos, yPosition);
        yPosition += Math.max(lineHeight, remarksLines.length * lineHeight);
        srNo++;
      });
      yPosition += sectionSpacing;
    }

    // Safety Problems Section
    if (selectedSafetyProblems.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Safety Issues', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      for (const problem of selectedSafetyProblems.values()) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${srNo}. ${problem.details}`, margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFont('helvetica', 'normal');
        if (problem.teamMembers && problem.teamMembers.length > 0) {
          const teamMemberNames = problem.teamMembers.map(id => {
            const member = teamMembers.find(m => m.id === id);
            return member ? member.name : id;
          }).join(', ');
          doc.text(`Team Members: ${teamMemberNames}`, margin + 5, yPosition);
          yPosition += lineHeight;
        }
        
        if (problem.remarks) {
          const remarksLines = doc.splitTextToSize(`Remarks: ${problem.remarks}`, pageWidth - 2 * margin - 10);
          doc.text(remarksLines, margin + 5, yPosition);
          yPosition += remarksLines.length * lineHeight;
        }
        
        if (problem.image) {
          doc.text('Image:', margin + 5, yPosition);
          yPosition += lineHeight + 2;
          const imageHeight = await addImageToPDF(problem.image, margin + 5, yPosition, pageWidth - 2 * margin - 10, 50);
          yPosition += imageHeight;
        }
        
        yPosition += 3;
        srNo++;
      }
      yPosition += sectionSpacing;
    }

    // Hindrance Problems Section
    if (selectedHindranceProblems.size > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Hindrance Issues', margin, yPosition);
      yPosition += lineHeight + 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let srNo = 1;
      for (const problem of selectedHindranceProblems.values()) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${srNo}. ${problem.details}`, margin, yPosition);
        yPosition += lineHeight;
        
        doc.setFont('helvetica', 'normal');
        if (problem.teamMembers && problem.teamMembers.length > 0) {
          const teamMemberNames = problem.teamMembers.map(id => {
            const member = teamMembers.find(m => m.id === id);
            return member ? member.name : id;
          }).join(', ');
          doc.text(`Team Members: ${teamMemberNames}`, margin + 5, yPosition);
          yPosition += lineHeight;
        }
        
        if (problem.remarks) {
          const remarksLines = doc.splitTextToSize(`Remarks: ${problem.remarks}`, pageWidth - 2 * margin - 10);
          doc.text(remarksLines, margin + 5, yPosition);
          yPosition += remarksLines.length * lineHeight;
        }
        
        if (problem.image) {
          doc.text('Image:', margin + 5, yPosition);
          yPosition += lineHeight + 2;
          const imageHeight = await addImageToPDF(problem.image, margin + 5, yPosition, pageWidth - 2 * margin - 10, 50);
          yPosition += imageHeight;
        }
        
        yPosition += 3;
        srNo++;
      }
    }

    // Generate filename
    const projectName = selectedProject?.name || 'DPR';
    const subprojectName = selectedSubproject?.name || '';
    const filename = `DPR_${projectName}_${subprojectName}_${new Date().toISOString().split('T')[0]}.pdf`.replace(/[^a-z0-9]/gi, '_');

    // Save PDF
    doc.save(filename);
  };

  const handleHindranceNext = () => {
    setShowHindranceSelection(false);
    setShowDPRComplete(true);
  };

  const handleHindranceSkip = () => {
    setShowHindranceSelection(false);
    setShowDPRComplete(true);
  };

  const handleDownloadDPR = async () => {
    await generateDPRPDF();
  };

  const handleAssetCreated = (newAsset: AssetEquipment) => {
    // Update local state
    setAssets(prev => [...prev, newAsset]);
    // Reload assets from localStorage to ensure consistency
    const savedAssets = localStorage.getItem('assetsEquipments');
    if (savedAssets) {
      try {
        const parsed = JSON.parse(savedAssets);
        const defaultAssets: AssetEquipment[] = [
          { id: '1', code: 'AE001', name: 'Machinery Hire', specification: 'Heavy Duty', unit: 'Hrs', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: '2', code: 'AE002', name: 'Breaker Hire', specification: 'Industrial Grade', unit: 'Hrs', createdAt: '2024-01-16T00:00:00.000Z' },
          { id: '3', code: 'AE003', name: 'MS Props', specification: 'Standard Size', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
          { id: '4', code: 'AE004', name: 'MS Shikanja', specification: 'Reinforced', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
          { id: '5', code: 'AE005', name: 'MS Shuttering Plates', specification: 'Steel Grade', unit: 'Sqm', createdAt: '2024-01-19T00:00:00.000Z' },
          { id: '6', code: 'AE006', name: 'Concrete Breaker Machine', specification: 'Portable', unit: 'Hrs', createdAt: '2024-01-20T00:00:00.000Z' },
          { id: '7', code: 'AE007', name: 'Measuring Tape', specification: '50m', unit: 'Nos', createdAt: '2024-01-21T00:00:00.000Z' },
          { id: '8', code: 'AE008', name: 'Helmets', specification: 'Safety Certified', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
        ];
        const userAssets = parsed.map((asset: any) => ({
          id: asset.id,
          code: asset.code,
          name: asset.name,
          specification: asset.specification || '',
          unit: asset.unit,
          createdAt: asset.createdAt
        }));
        setAssets([...defaultAssets, ...userAssets]);
      } catch (e) {
        console.error('Error parsing assets:', e);
      }
    }
  };

  const handleLabourCreated = (newLabour: { id: string; name: string; category: 'Skilled' | 'Unskilled' | 'Semi Skilled'; trade?: string; skillLevel?: string; status: 'Active' | 'Inactive'; createdAt?: string }) => {
    // Transform the labour from CreateLabourModal to match DPR's Labour type
    const transformedLabour: Labour = {
      id: newLabour.id,
      name: newLabour.name,
      type: newLabour.name, // Use name as type since CreateLabourModal doesn't have type
      category: newLabour.category,
      createdAt: newLabour.createdAt
    };
    // Update local state
    setLabours(prev => [...prev, transformedLabour]);
    // Reload labours from localStorage to ensure consistency
    const savedLabours = localStorage.getItem('labours');
    if (savedLabours) {
      try {
        const parsed = JSON.parse(savedLabours);
        const defaultLabours: Labour[] = [
          { id: 'LAB001', name: 'Supervisor', type: 'Supervisor', category: 'Skilled', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: 'LAB002', name: 'Foremen', type: 'Foremen', category: 'Skilled', createdAt: '2024-01-16T00:00:00.000Z' },
          { id: 'LAB003', name: 'Helpers', type: 'Helpers', category: 'Semi Skilled', createdAt: '2024-01-17T00:00:00.000Z' },
          { id: 'LAB004', name: 'Male Coolie', type: 'Male Coolie', category: 'Unskilled', createdAt: '2024-01-18T00:00:00.000Z' },
          { id: 'LAB005', name: 'Female Coolie', type: 'Female Coolie', category: 'Unskilled', createdAt: '2024-01-19T00:00:00.000Z' },
          { id: 'LAB006', name: 'General Laborers', type: 'General Laborers', category: 'Unskilled', createdAt: '2024-01-20T00:00:00.000Z' },
          { id: 'LAB007', name: 'Beldar', type: 'Beldar', category: 'Unskilled', createdAt: '2024-01-21T00:00:00.000Z' },
          { id: 'LAB008', name: 'Masons', type: 'Masons', category: 'Skilled', createdAt: '2024-01-22T00:00:00.000Z' },
          { id: 'LAB009', name: 'Carpenters', type: 'Carpenters', category: 'Skilled', createdAt: '2024-01-23T00:00:00.000Z' },
          { id: 'LAB010', name: 'Electricians', type: 'Electricians', category: 'Skilled', createdAt: '2024-01-24T00:00:00.000Z' },
        ];
        const userLabours = parsed.map((lab: any) => ({
          id: lab.id,
          name: lab.name || lab.type,
          type: lab.type,
          category: lab.category,
          createdAt: lab.createdAt
        }));
        setLabours([...defaultLabours, ...userLabours]);
      } catch (e) {
        console.error('Error parsing labours:', e);
      }
    }
  };

  const handleMaterialCreated = (newMaterial: Material) => {
    // Update local state
    setMaterials(prev => [...prev, newMaterial]);
    // Reload materials from localStorage to ensure consistency
    const savedMaterials = localStorage.getItem('materials');
    if (savedMaterials) {
      try {
        const parsed = JSON.parse(savedMaterials);
        const defaultMaterials: Material[] = [
          { id: '1', class: 'A', code: 'M685270', name: 'Cement', specification: 'OPC testy', unit: 'Packet', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: '2', class: 'A', code: 'M984236', name: 'RMC', specification: 'M40', unit: 'Cft', createdAt: '2024-01-16T00:00:00.000Z' },
          { id: '3', class: 'B', code: 'M211203', name: 'Measuring Tape', specification: '1/2 Inches', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
          { id: '4', class: 'B', code: 'M257929', name: 'Hose Pipe', specification: '1 Inches', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
          { id: '5', class: 'B', code: 'M205837', name: 'Hose Pipe', specification: '', unit: 'Rft', createdAt: '2024-01-19T00:00:00.000Z' },
          { id: '6', class: 'B', code: 'M987837', name: 'Nylon Rope', specification: '', unit: 'Rft', createdAt: '2024-01-20T00:00:00.000Z' },
          { id: '7', class: 'C', code: 'M183654', name: 'Oil', specification: '', unit: 'Ltr', createdAt: '2024-01-21T00:00:00.000Z' },
          { id: '8', class: 'C', code: 'M976735', name: 'Cover Blocks', specification: '20mm', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
          { id: '9', class: 'C', code: 'M421512', name: 'Cover Blocks', specification: '25mm', unit: 'Nos', createdAt: '2024-01-23T00:00:00.000Z' },
          { id: '10', class: 'C', code: 'M625759', name: 'Petrol', specification: '', unit: 'Ltr', createdAt: '2024-01-24T00:00:00.000Z' },
          { id: '11', class: 'C', code: 'M232620', name: 'Diesel', specification: '', unit: 'Ltr', createdAt: '2024-01-25T00:00:00.000Z' },
          { id: '12', class: 'B', code: 'M932823', name: 'UPVC', specification: '12 inch', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
          { id: '13', class: 'A', code: 'M880841', name: 'Tmt Concrete', specification: '', unit: 'Cft', createdAt: '2024-01-27T00:00:00.000Z' },
          { id: '14', class: 'A', code: 'M100439', name: 'Cement', specification: 'OPC 53 grade', unit: 'Bags', createdAt: '2024-01-28T00:00:00.000Z' },
        ];
        const userMaterials = parsed.map((mat: any) => ({
          id: mat.id,
          class: mat.class,
          code: mat.code,
          name: mat.name,
          specification: mat.specification || '',
          unit: mat.unit,
          createdAt: mat.createdAt
        }));
        setMaterials([...defaultMaterials, ...userMaterials]);
      } catch (e) {
        console.error('Error parsing materials:', e);
      }
    }
  };

  const handleCreateNewProject = () => {
    window.location.href = '/masters/projects/add';
  };

  const handleCreateNewSubproject = () => {
    setShowCreateSubprojectModal(true);
  };

  const handleSubprojectCreated = (newSubproject: Subproject) => {
    // Update local state
    setSubprojects(prev => [...prev, newSubproject]);
    // Refresh the subproject list
    setSubprojectSearchQuery('');
  };

  const handleActivityCreated = (newActivity: ActivityItem) => {
    // Update local state
    setActivities(prev => [...prev, newActivity]);
    // Reload activities from localStorage to ensure consistency
    const savedActivities = localStorage.getItem('activities');
    if (savedActivities) {
      try {
        const parsed = JSON.parse(savedActivities);
        const defaultActivities: ActivityItem[] = [
          { id: '1', name: 'Excavation & Misc', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: '2', name: 'PCC', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-16T00:00:00.000Z' },
          { id: '3', name: 'Steel Reinforcement', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Kgs', createdAt: '2024-01-17T00:00:00.000Z' },
          { id: '4', name: 'Concrete Work', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-18T00:00:00.000Z' },
          { id: '5', name: 'Masonry', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Cum', createdAt: '2024-01-19T00:00:00.000Z' },
          { id: '6', name: 'Plastering, Gypsum, POP', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-20T00:00:00.000Z' },
          { id: '7', name: 'Water Proofing', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-21T00:00:00.000Z' },
          { id: '8', name: 'Doors & Windows', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
          { id: '9', name: 'Tiling & Paver Work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-23T00:00:00.000Z' },
          { id: '10', name: 'Railing & Fabrication work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Rmt', createdAt: '2024-01-24T00:00:00.000Z' },
          { id: '11', name: 'Electrical', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Nos', createdAt: '2024-01-25T00:00:00.000Z' },
          { id: '12', name: 'Plumbing', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
          { id: '13', name: 'Painting', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-27T00:00:00.000Z' },
          { id: '14', name: 'Bituminous Works', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Sqm', createdAt: '2024-01-28T00:00:00.000Z' },
          { id: '15', name: 'Sub Activites 1.1', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'heading', createdAt: '2024-01-29T00:00:00.000Z' },
        ];
        const userActivities = parsed.map((act: any) => ({
          id: act.id,
          name: act.name,
          project: act.project,
          subproject: act.subproject,
          type: act.type,
          unit: act.unit,
          qty: act.qty,
          rate: act.rate,
          amount: act.amount,
          startDate: act.startDate,
          endDate: act.endDate,
          createdAt: act.createdAt
        }));
        setActivities([...defaultActivities, ...userActivities]);
      } catch (e) {
        console.error('Error parsing activities:', e);
      }
    }
  };

  const handleEditPrevious = () => {
    // TODO: Implement edit previous DPR logic
    console.log('Edit previous DPR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
            <ClipboardCheck className="w-6 h-6 text-[#C2D642]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Daily Progress Report (DPR)</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Track daily work progress and activities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewDPR}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
          >
            <Plus className="w-4 h-4" /> Create a new DPR
          </button>
          <button
            onClick={handleEditPrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
          >
            <Edit className="w-4 h-4" /> Edit previous
          </button>
        </div>
      </div>

      {/* Project Selection Modal */}
      {showProjectSelection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select a Project</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>Choose a project to create a new DPR</p>
              </div>
              <button
                onClick={() => {
                  setShowProjectSelection(false);
                  setProjectSearchQuery('');
                }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>

            {/* Search and Create New */}
            <div className="p-6 border-b border-inherit flex items-center gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
              <button
                onClick={handleCreateNewProject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
              >
                <Plus className="w-4 h-4" /> Create New
              </button>
            </div>

            {/* Projects Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`rounded-xl border ${cardClass} p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                        isDark ? 'hover:border-[#C2D642]/50' : 'hover:border-[#C2D642]/30'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 border-[#C2D642]/20 mb-3 flex-shrink-0 group-hover:border-[#C2D642]/50 transition-colors`}>
                          <img 
                            src={project.logo} 
                            alt={project.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(project.name)}&background=C2D642&color=fff&size=128`;
                            }}
                          />
                        </div>
                        <h3 className={`text-base font-black ${textPrimary} mb-1 group-hover:text-[#C2D642] transition-colors`}>{project.name}</h3>
                        {project.code && (
                          <p className={`text-xs ${textSecondary} mb-1`}>Code: {project.code}</p>
                        )}
                        {project.company && (
                          <p className={`text-xs ${textSecondary}`}>{project.company}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Building2 className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No projects found</h3>
                  <p className={`text-sm ${textSecondary} mb-4`}>
                    {projectSearchQuery ? 'Try a different search term' : 'Create a new project to get started'}
                  </p>
                  <button
                    onClick={handleCreateNewProject}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all mx-auto ${isDark ? 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white' : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white'} shadow-md`}
                  >
                    <Plus className="w-4 h-4" /> Create New Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subproject Selection Modal */}
      {showSubprojectSelection && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select One Subproject</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Please select a subproject for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSubprojectSelection(false);
                  setSubprojectSearchQuery('');
                  setSelectedProject(null);
                }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
              >
                <X className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>

            {/* Search and Create New */}
            <div className="p-6 border-b border-inherit flex items-center gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary} pointer-events-none`} />
                <input
                  type="text"
                  placeholder="Search subprojects..."
                  value={subprojectSearchQuery}
                  onChange={(e) => setSubprojectSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
              <button
                onClick={handleCreateNewSubproject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
              >
                <Plus className="w-4 h-4" /> Create New
              </button>
            </div>

            {/* Subprojects List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredSubprojects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubprojects.map((subproject) => (
                    <div
                      key={subproject.id}
                      onClick={() => handleSelectSubproject(subproject)}
                      className={`rounded-xl border ${cardClass} p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                        isDark ? 'hover:border-[#C2D642]/50' : 'hover:border-[#C2D642]/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'} flex-shrink-0`}>
                          <Layers className={`w-5 h-5 text-[#C2D642]`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-black ${textPrimary} mb-1 group-hover:text-[#C2D642] transition-colors truncate`}>
                            {subproject.name}
                          </h3>
                          {subproject.code && (
                            <p className={`text-xs ${textSecondary} mb-2`}>Code: {subproject.code}</p>
                          )}
                          {subproject.manager && (
                            <p className={`text-xs ${textSecondary} mb-1`}>Manager: {subproject.manager}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                              subproject.status === 'Active' || subproject.status === 'In Progress'
                                ? 'bg-[#C2D642]/20 text-[#C2D642]'
                                : subproject.status === 'Completed'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-slate-500/20 text-slate-500'
                            }`}>
                              {subproject.status}
                            </span>
                            {subproject.progress !== undefined && (
                              <span className={`text-xs font-bold ${textSecondary}`}>
                                {subproject.progress}% Complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Layers className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No subprojects available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {subprojectSearchQuery 
                      ? 'No subprojects found matching your search' 
                      : `There are no subprojects available for ${selectedProject.name}. Please create a subproject first.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Selection Modal */}
      {showActivitySelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select Activities</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Select activities for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateActivityModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                >
                  <Plus className="w-4 h-4" /> Create New
                </button>
                <button
                  onClick={() => {
                    setShowActivitySelection(false);
                    setSelectedActivities(new Map());
                  }}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Activities Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredActivities.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={filteredActivities.length > 0 && filteredActivities.every(act => selectedActivities.has(act.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map<string, SelectedActivity>();
                                  filteredActivities.forEach(act => {
                                    newMap.set(act.id, {
                                      id: act.id,
                                      name: act.name,
                                      unit: act.unit,
                                      quantity: 0
                                    });
                                  });
                                  setSelectedActivities(newMap);
                                } else {
                                  setSelectedActivities(new Map());
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>SR No</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Activities</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Upload Image</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {filteredActivities.map((activity, idx) => {
                          const isSelected = selectedActivities.has(activity.id);
                          const selectedActivity = selectedActivities.get(activity.id);
                          return (
                            <tr 
                              key={activity.id} 
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleActivity(activity)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{idx + 1}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{activity.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{activity.unit || '-'}</td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedActivity?.quantity || 0}
                                    onChange={(e) => handleQuantityChange(activity.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedActivity?.contractor || ''}
                                    onChange={(e) => handleContractorChange(activity.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <div className="space-y-2">
                                    <label htmlFor={`image-upload-${activity.id}`} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-sm font-bold border-2 border-dashed transition-all ${
                                      isDark 
                                        ? 'border-slate-600 hover:border-[#C2D642] text-slate-300 hover:text-[#C2D642]' 
                                        : 'border-slate-300 hover:border-[#C2D642] text-slate-600 hover:text-[#C2D642]'
                                    }`}>
                                      <Upload className="w-4 h-4" />
                                      <span>Upload</span>
                                      <input
                                        id={`image-upload-${activity.id}`}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleImageUpload(activity.id, e.target.files)}
                                        className="hidden"
                                      />
                                    </label>
                                    {selectedActivity?.images && selectedActivity.images.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedActivity.images.map((image, imgIdx) => (
                                          <div key={imgIdx} className="relative group">
                                            <img 
                                              src={image} 
                                              alt={`Activity ${imgIdx + 1}`}
                                              className="w-16 h-16 object-cover rounded-lg border border-inherit"
                                            />
                                            <button
                                              onClick={() => handleRemoveImage(activity.id, imgIdx)}
                                              className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <textarea
                                    value={selectedActivity?.remarks || ''}
                                    onChange={(e) => handleRemarksChange(activity.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Activity className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No activities available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    There are no activities available for {selectedSubproject.name}. Please create activities first.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowActivitySelection(false);
                  setShowSubprojectSelection(true);
                  setSelectedActivities(new Map());
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleActivitySelectionNext}
                disabled={selectedActivities.size === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  selectedActivities.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Selection Modal */}
      {showMaterialSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select Materials Used</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Select materials for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateMaterialModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                >
                  <Plus className="w-4 h-4" /> Create New
                </button>
                <button
                  onClick={() => {
                    setShowMaterialSelection(false);
                    setSelectedMaterials(new Map());
                  }}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Materials Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {materials.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={materials.length > 0 && materials.every(mat => selectedMaterials.has(mat.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map<string, SelectedMaterial>();
                                  materials.forEach(mat => {
                                    newMap.set(mat.id, {
                                      id: mat.id,
                                      class: mat.class,
                                      code: mat.code,
                                      name: mat.name,
                                      specification: mat.specification,
                                      unit: mat.unit,
                                      quantity: 0
                                    });
                                  });
                                  setSelectedMaterials(newMap);
                                } else {
                                  setSelectedMaterials(new Map());
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Class</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Material Code</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Material Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {materials.map((material, idx) => {
                          const isSelected = selectedMaterials.has(material.id);
                          const selectedMaterial = selectedMaterials.get(material.id);
                          return (
                            <tr 
                              key={material.id} 
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleMaterial(material)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.class}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.code}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.specification || '-'}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{material.unit}</td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedMaterial?.quantity || 0}
                                    onChange={(e) => handleMaterialQuantityChange(material.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedMaterial?.activity || ''}
                                    onChange={(e) => handleMaterialActivityChange(material.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <textarea
                                    value={selectedMaterial?.remarks || ''}
                                    onChange={(e) => handleMaterialRemarksChange(material.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No materials available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    There are no materials available. Please create materials first.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowMaterialSelection(false);
                  setShowActivitySelection(true);
                  setSelectedMaterials(new Map());
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleMaterialSelectionNext}
                disabled={selectedMaterials.size === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  selectedMaterials.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labour Selection Modal */}
      {showLabourSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select Labours</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Select labours for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateLabourModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                >
                  <Plus className="w-4 h-4" /> Create New
                </button>
                <button
                  onClick={() => {
                    setShowLabourSelection(false);
                    setSelectedLabours(new Map());
                  }}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Labours Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {labours.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={labours.length > 0 && labours.every(lab => selectedLabours.has(lab.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map<string, SelectedLabour>();
                                  labours.forEach(lab => {
                                    newMap.set(lab.id, {
                                      id: lab.id,
                                      type: lab.type,
                                      category: lab.category,
                                      quantity: 0,
                                      overtimeQuantity: 0,
                                      ratePerUnit: 0
                                    });
                                  });
                                  setSelectedLabours(newMap);
                                } else {
                                  setSelectedLabours(new Map());
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Category</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Overtime Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate Per Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {labours.map((labour, idx) => {
                          const isSelected = selectedLabours.has(labour.id);
                          const selectedLabour = selectedLabours.get(labour.id);
                          return (
                            <tr 
                              key={labour.id} 
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleLabour(labour)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.category}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{labour.name}</td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedLabour?.quantity || 0}
                                    onChange={(e) => handleLabourQuantityChange(labour.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedLabour?.overtimeQuantity || 0}
                                    onChange={(e) => handleLabourOvertimeQuantityChange(labour.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedLabour?.activity || ''}
                                    onChange={(e) => handleLabourActivityChange(labour.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedLabour?.contractor || ''}
                                    onChange={(e) => handleLabourContractorChange(labour.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedLabour?.ratePerUnit || 0}
                                    onChange={(e) => handleLabourRateChange(labour.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <textarea
                                    value={selectedLabour?.remarks || ''}
                                    onChange={(e) => handleLabourRemarksChange(labour.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No labours available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    There are no labours available. Please create labours first.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowLabourSelection(false);
                  setShowMaterialSelection(true);
                  setSelectedLabours(new Map());
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleLabourSelectionNext}
                disabled={selectedLabours.size === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  selectedLabours.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Selection Modal */}
      {showAssetSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>Select Machines/Assets</h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Select machines/assets for <span className="font-bold text-[#C2D642]">{selectedProject.name}</span> - <span className="font-bold text-[#C2D642]">{selectedSubproject.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateAssetModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${isDark ? 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10' : 'border-[#C2D642] text-[#C2D642] hover:bg-[#C2D642]/10'}`}
                >
                  <Plus className="w-4 h-4" /> Create New
                </button>
                <button
                  onClick={() => {
                    setShowAssetSelection(false);
                    setSelectedAssets(new Map());
                    setAssetSearchQuery('');
                  }}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-inherit">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
                <input
                  type="text"
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  placeholder="Search by code, name, specification, or unit..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-bold border ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
            </div>

            {/* Assets Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredAssets.length > 0 ? (
                <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>
                            <input
                              type="checkbox"
                              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                              checked={filteredAssets.length > 0 && filteredAssets.every(asset => selectedAssets.has(asset.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newMap = new Map<string, SelectedAsset>();
                                  filteredAssets.forEach(asset => {
                                    newMap.set(asset.id, {
                                      id: asset.id,
                                      code: asset.code,
                                      name: asset.name,
                                      quantity: 0,
                                      ratePerUnit: 0
                                    });
                                  });
                                  setSelectedAssets(newMap);
                                } else {
                                  setSelectedAssets(new Map());
                                }
                              }}
                            />
                          </th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Code</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Activity</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Tag Contractor</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate Per Unit</th>
                          <th className={`px-6 py-4 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {filteredAssets.map((asset) => {
                          const isSelected = selectedAssets.has(asset.id);
                          const selectedAsset = selectedAssets.get(asset.id);
                          return (
                            <tr 
                              key={asset.id} 
                              className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors ${isSelected ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : ''}`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleAsset(asset)}
                                  className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} cursor-pointer`}
                                />
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.code}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.name}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.specification || '-'}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>{asset.unit}</td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedAsset?.quantity || 0}
                                    onChange={(e) => handleAssetQuantityChange(asset.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedAsset?.activity || ''}
                                    onChange={(e) => handleAssetActivityChange(asset.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Activity</option>
                                    {selectedActivityNames.map(activityName => (
                                      <option key={activityName} value={activityName}>
                                        {activityName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <select
                                    value={selectedAsset?.contractor || ''}
                                    onChange={(e) => handleAssetContractorChange(asset.id, e.target.value)}
                                    className={`w-full min-w-[180px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  >
                                    <option value="">Select Contractor</option>
                                    {contractors.map(contractor => (
                                      <option key={contractor.id} value={contractor.name}>
                                        {contractor.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selectedAsset?.ratePerUnit || 0}
                                    onChange={(e) => handleAssetRateChange(asset.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-lg text-sm font-bold border ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isSelected ? (
                                  <textarea
                                    value={selectedAsset?.remarks || ''}
                                    onChange={(e) => handleAssetRemarksChange(asset.id, e.target.value)}
                                    rows={2}
                                    className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                      isDark 
                                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                    } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  <span className={`text-sm ${textSecondary}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Boxes className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No assets available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    {assetSearchQuery 
                      ? 'No assets found matching your search' 
                      : 'There are no assets available. Please create assets first.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowAssetSelection(false);
                  setShowLabourSelection(true);
                  setSelectedAssets(new Map());
                  setAssetSearchQuery('');
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleAssetSelectionNext}
                disabled={selectedAssets.size === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  selectedAssets.size === 0
                    ? isDark
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Selection Modal */}
      {showSafetySelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>Safety</h2>
              <button
                onClick={() => setShowSafetySelection(false)}
                className={`p-2 rounded-lg transition-all ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {safetyProblems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedSafetyProblems.size === safetyProblems.length && safetyProblems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newMap = new Map<string, SelectedSafetyProblem>();
                                safetyProblems.forEach(problem => {
                                  newMap.set(problem.id, {
                                    id: problem.id,
                                    details: problem.details,
                                    image: '',
                                    teamMembers: [],
                                    remarks: ''
                                  });
                                });
                                setSelectedSafetyProblems(newMap);
                              } else {
                                setSelectedSafetyProblems(new Map());
                              }
                            }}
                            className={`w-4 h-4 rounded border-2 ${
                              isDark 
                                ? 'bg-slate-800 border-slate-600 checked:bg-[#C2D642] checked:border-[#C2D642]' 
                                : 'bg-white border-slate-300 checked:bg-[#C2D642] checked:border-[#C2D642]'
                            }`}
                          />
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          SR No
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Safety Problem Details
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Image
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Tag Team Members
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {safetyProblems.map((problem, index) => {
                        const isSelected = selectedSafetyProblems.has(problem.id);
                        const selectedProblem = selectedSafetyProblems.get(problem.id);
                        return (
                          <tr 
                            key={problem.id} 
                            className={`transition-colors ${
                              isSelected 
                                ? isDark ? 'bg-slate-800/50' : 'bg-slate-50' 
                                : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSafetyProblem(problem)}
                                className={`w-4 h-4 rounded border-2 ${
                                  isDark 
                                    ? 'bg-slate-800 border-slate-600 checked:bg-[#C2D642] checked:border-[#C2D642]' 
                                    : 'bg-white border-slate-300 checked:bg-[#C2D642] checked:border-[#C2D642]'
                                }`}
                              />
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                              {index + 1}
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                              {problem.details}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  {selectedProblem?.image ? (
                                    <div className="relative">
                                      <img 
                                        src={selectedProblem.image} 
                                        alt="Safety issue" 
                                        className="w-16 h-16 object-cover rounded-lg border border-inherit"
                                      />
                                      <button
                                        onClick={() => handleSafetyRemoveImage(problem.id)}
                                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleSafetyImageUpload(problem.id, e)}
                                        className="hidden"
                                      />
                                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all ${
                                        isDark
                                          ? 'border-slate-600 hover:border-[#C2D642] text-slate-400 hover:text-[#C2D642]'
                                          : 'border-slate-300 hover:border-[#C2D642] text-slate-600 hover:text-[#C2D642]'
                                      }`}>
                                        <Upload className="w-4 h-4" />
                                        <span className="text-xs font-bold">Upload</span>
                                      </div>
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <select
                                  multiple
                                  value={selectedProblem?.teamMembers || []}
                                  onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    handleSafetyTeamMembersChange(problem.id, selected);
                                  }}
                                  className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                    isDark 
                                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  size={Math.min(Math.max(teamMembers.length, 3), 5)}
                                >
                                  {teamMembers.length > 0 ? (
                                    teamMembers.map(member => (
                                      <option key={member.id} value={member.id}>
                                        {member.name} ({member.email})
                                      </option>
                                    ))
                                  ) : (
                                    <option disabled>No team members available</option>
                                  )}
                                </select>
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <textarea
                                  value={selectedProblem?.remarks || ''}
                                  onChange={(e) => handleSafetyRemarksChange(problem.id, e.target.value)}
                                  placeholder="Enter remarks..."
                                  rows={2}
                                  className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                    isDark 
                                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' 
                                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'
                                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                />
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No safety problems available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    There are no safety problems configured.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowSafetySelection(false);
                  setShowAssetSelection(true);
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSafetySkip}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleSafetyNext}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hindrance Selection Modal */}
      {showHindranceSelection && selectedProject && selectedSubproject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>Hindrance</h2>
              <button
                onClick={() => setShowHindranceSelection(false)}
                className={`p-2 rounded-lg transition-all ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {hindranceProblems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedHindranceProblems.size === hindranceProblems.length && hindranceProblems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newMap = new Map<string, SelectedHindranceProblem>();
                                hindranceProblems.forEach(problem => {
                                  newMap.set(problem.id, {
                                    id: problem.id,
                                    details: problem.details,
                                    image: '',
                                    teamMembers: [],
                                    remarks: ''
                                  });
                                });
                                setSelectedHindranceProblems(newMap);
                              } else {
                                setSelectedHindranceProblems(new Map());
                              }
                            }}
                            className={`w-4 h-4 rounded border-2 ${
                              isDark 
                                ? 'bg-slate-800 border-slate-600 checked:bg-[#C2D642] checked:border-[#C2D642]' 
                                : 'bg-white border-slate-300 checked:bg-[#C2D642] checked:border-[#C2D642]'
                            }`}
                          />
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          SR No
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Hindrance Problem Details
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Image
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Tag Team Members
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {hindranceProblems.map((problem, index) => {
                        const isSelected = selectedHindranceProblems.has(problem.id);
                        const selectedProblem = selectedHindranceProblems.get(problem.id);
                        return (
                          <tr 
                            key={problem.id} 
                            className={`transition-colors ${
                              isSelected 
                                ? isDark ? 'bg-slate-800/50' : 'bg-slate-50' 
                                : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleHindranceProblem(problem)}
                                className={`w-4 h-4 rounded border-2 ${
                                  isDark 
                                    ? 'bg-slate-800 border-slate-600 checked:bg-[#C2D642] checked:border-[#C2D642]' 
                                    : 'bg-white border-slate-300 checked:bg-[#C2D642] checked:border-[#C2D642]'
                                }`}
                              />
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                              {index + 1}
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold ${textPrimary}`}>
                              {problem.details}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  {selectedProblem?.image ? (
                                    <div className="relative">
                                      <img 
                                        src={selectedProblem.image} 
                                        alt="Hindrance issue" 
                                        className="w-16 h-16 object-cover rounded-lg border border-inherit"
                                      />
                                      <button
                                        onClick={() => handleHindranceRemoveImage(problem.id)}
                                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleHindranceImageUpload(problem.id, e)}
                                        className="hidden"
                                      />
                                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all ${
                                        isDark
                                          ? 'border-slate-600 hover:border-[#C2D642] text-slate-400 hover:text-[#C2D642]'
                                          : 'border-slate-300 hover:border-[#C2D642] text-slate-600 hover:text-[#C2D642]'
                                      }`}>
                                        <Upload className="w-4 h-4" />
                                        <span className="text-xs font-bold">Upload</span>
                                      </div>
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <select
                                  multiple
                                  value={selectedProblem?.teamMembers || []}
                                  onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    handleHindranceTeamMembersChange(problem.id, selected);
                                  }}
                                  className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border ${
                                    isDark 
                                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                  size={Math.min(Math.max(teamMembers.length, 3), 5)}
                                >
                                  {teamMembers.length > 0 ? (
                                    teamMembers.map(member => (
                                      <option key={member.id} value={member.id}>
                                        {member.name} ({member.email})
                                      </option>
                                    ))
                                  ) : (
                                    <option disabled>No team members available</option>
                                  )}
                                </select>
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isSelected ? (
                                <textarea
                                  value={selectedProblem?.remarks || ''}
                                  onChange={(e) => handleHindranceRemarksChange(problem.id, e.target.value)}
                                  placeholder="Enter remarks..."
                                  rows={2}
                                  className={`w-full min-w-[200px] px-3 py-2 rounded-lg text-sm font-bold border resize-none ${
                                    isDark 
                                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#C2D642]' 
                                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C2D642]'
                                  } focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                                />
                              ) : (
                                <span className={`text-sm ${textSecondary}`}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-12 rounded-xl border text-center ${cardClass}`}>
                  <Users className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
                  <h3 className={`text-lg font-black mb-2 ${textPrimary}`}>No hindrance problems available</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    There are no hindrance problems configured.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-inherit">
              <button
                onClick={() => {
                  setShowHindranceSelection(false);
                  setShowSafetySelection(true);
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleHindranceSkip}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleHindranceNext}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPR Complete Modal */}
      {showDPRComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-md overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <h2 className={`text-xl font-black ${textPrimary}`}>DPR Complete</h2>
              <button
                onClick={() => setShowDPRComplete(false)}
                className={`p-2 rounded-lg transition-all ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
              }`}>
                <CheckCircle className={`w-12 h-12 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
              </div>
              <h3 className={`text-2xl font-black mb-3 ${textPrimary}`}>
                Your DPR is Ready!
              </h3>
              <p className={`text-sm mb-8 ${textSecondary}`}>
                Your Daily Progress Report has been successfully created and is ready to share and download.
              </p>
              <button
                onClick={handleDownloadDPR}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg text-base font-bold transition-all bg-[#C2D642] hover:bg-[#C2D642]/90 text-white shadow-md`}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-inherit">
              <button
                onClick={() => setShowDPRComplete(false)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Activity Modal */}
      <CreateActivityModal
        theme={theme}
        isOpen={showCreateActivityModal}
        onClose={() => setShowCreateActivityModal(false)}
        onSuccess={() => {
          setShowCreateActivityModal(false);
          // Reload activities from localStorage
          const savedActivities = localStorage.getItem('activities');
          if (savedActivities) {
            try {
              const parsed = JSON.parse(savedActivities);
              const defaultActivities: ActivityItem[] = [
                { id: '1', name: 'Excavation & Misc', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-15T00:00:00.000Z' },
                { id: '2', name: 'PCC', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-16T00:00:00.000Z' },
                { id: '3', name: 'Steel Reinforcement', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Kgs', createdAt: '2024-01-17T00:00:00.000Z' },
                { id: '4', name: 'Concrete Work', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Cum', createdAt: '2024-01-18T00:00:00.000Z' },
                { id: '5', name: 'Masonry', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Cum', createdAt: '2024-01-19T00:00:00.000Z' },
                { id: '6', name: 'Plastering, Gypsum, POP', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-20T00:00:00.000Z' },
                { id: '7', name: 'Water Proofing', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-21T00:00:00.000Z' },
                { id: '8', name: 'Doors & Windows', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
                { id: '9', name: 'Tiling & Paver Work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-23T00:00:00.000Z' },
                { id: '10', name: 'Railing & Fabrication work', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Rmt', createdAt: '2024-01-24T00:00:00.000Z' },
                { id: '11', name: 'Electrical', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Nos', createdAt: '2024-01-25T00:00:00.000Z' },
                { id: '12', name: 'Plumbing', project: 'Residential Complex A', subproject: 'Plumbing Installation', type: 'activity', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
                { id: '13', name: 'Painting', project: 'Residential Complex A', subproject: 'Structural Framework', type: 'activity', unit: 'Sqm', createdAt: '2024-01-27T00:00:00.000Z' },
                { id: '14', name: 'Bituminous Works', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'activity', unit: 'Sqm', createdAt: '2024-01-28T00:00:00.000Z' },
                { id: '15', name: 'Sub Activites 1.1', project: 'Residential Complex A', subproject: 'Foundation Work', type: 'heading', createdAt: '2024-01-29T00:00:00.000Z' },
              ];
              const userActivities = parsed.map((act: any) => ({
                id: act.id,
                name: act.name,
                project: act.project,
                subproject: act.subproject,
                type: act.type,
                unit: act.unit,
                qty: act.qty,
                rate: act.rate,
                amount: act.amount,
                startDate: act.startDate,
                endDate: act.endDate,
                createdAt: act.createdAt
              }));
              setActivities([...defaultActivities, ...userActivities]);
            } catch (e) {
              console.error('Error parsing activities:', e);
            }
          }
        }}
        activities={activities}
      />

      {/* Create Material Modal */}
      <CreateMaterialModal
        theme={theme}
        isOpen={showCreateMaterialModal}
        onClose={() => setShowCreateMaterialModal(false)}
        onSuccess={() => {
          setShowCreateMaterialModal(false);
          // Reload materials from localStorage
          const savedMaterials = localStorage.getItem('materials');
          if (savedMaterials) {
            try {
              const parsed = JSON.parse(savedMaterials);
              const defaultMaterials: Material[] = [
                { id: '1', class: 'A', code: 'M685270', name: 'Cement', specification: 'OPC testy', unit: 'Packet', createdAt: '2024-01-15T00:00:00.000Z' },
                { id: '2', class: 'A', code: 'M984236', name: 'RMC', specification: 'M40', unit: 'Cft', createdAt: '2024-01-16T00:00:00.000Z' },
                { id: '3', class: 'B', code: 'M211203', name: 'Measuring Tape', specification: '1/2 Inches', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
                { id: '4', class: 'B', code: 'M257929', name: 'Hose Pipe', specification: '1 Inches', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
                { id: '5', class: 'B', code: 'M205837', name: 'Hose Pipe', specification: '', unit: 'Rft', createdAt: '2024-01-19T00:00:00.000Z' },
                { id: '6', class: 'B', code: 'M987837', name: 'Nylon Rope', specification: '', unit: 'Rft', createdAt: '2024-01-20T00:00:00.000Z' },
                { id: '7', class: 'C', code: 'M183654', name: 'Oil', specification: '', unit: 'Ltr', createdAt: '2024-01-21T00:00:00.000Z' },
                { id: '8', class: 'C', code: 'M976735', name: 'Cover Blocks', specification: '20mm', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
                { id: '9', class: 'C', code: 'M421512', name: 'Cover Blocks', specification: '25mm', unit: 'Nos', createdAt: '2024-01-23T00:00:00.000Z' },
                { id: '10', class: 'C', code: 'M625759', name: 'Petrol', specification: '', unit: 'Ltr', createdAt: '2024-01-24T00:00:00.000Z' },
                { id: '11', class: 'C', code: 'M232620', name: 'Diesel', specification: '', unit: 'Ltr', createdAt: '2024-01-25T00:00:00.000Z' },
                { id: '12', class: 'B', code: 'M932823', name: 'UPVC', specification: '12 inch', unit: 'Rmt', createdAt: '2024-01-26T00:00:00.000Z' },
                { id: '13', class: 'A', code: 'M880841', name: 'Tmt Concrete', specification: '', unit: 'Cft', createdAt: '2024-01-27T00:00:00.000Z' },
                { id: '14', class: 'A', code: 'M100439', name: 'Cement', specification: 'OPC 53 grade', unit: 'Bags', createdAt: '2024-01-28T00:00:00.000Z' },
              ];
              const userMaterials = parsed.map((mat: any) => ({
                id: mat.id,
                class: mat.class,
                code: mat.code,
                name: mat.name,
                specification: mat.specification || '',
                unit: mat.unit,
                createdAt: mat.createdAt
              }));
              setMaterials([...defaultMaterials, ...userMaterials]);
            } catch (e) {
              console.error('Error parsing materials:', e);
            }
          }
        }}
      />

      {/* Create Labour Modal */}
      <CreateLabourModal
        theme={theme}
        isOpen={showCreateLabourModal}
        onClose={() => setShowCreateLabourModal(false)}
        onSuccess={() => {
          setShowCreateLabourModal(false);
          // Reload labours from localStorage
          const savedLabours = localStorage.getItem('labours');
          if (savedLabours) {
            try {
              const parsed = JSON.parse(savedLabours);
              const defaultLabours: Labour[] = [
                { id: 'LAB001', name: 'Supervisor', type: 'Supervisor', category: 'Skilled', createdAt: '2024-01-15T00:00:00.000Z' },
                { id: 'LAB002', name: 'Foremen', type: 'Foremen', category: 'Skilled', createdAt: '2024-01-16T00:00:00.000Z' },
                { id: 'LAB003', name: 'Helpers', type: 'Helpers', category: 'Semi Skilled', createdAt: '2024-01-17T00:00:00.000Z' },
                { id: 'LAB004', name: 'Male Coolie', type: 'Male Coolie', category: 'Unskilled', createdAt: '2024-01-18T00:00:00.000Z' },
                { id: 'LAB005', name: 'Female Coolie', type: 'Female Coolie', category: 'Unskilled', createdAt: '2024-01-19T00:00:00.000Z' },
                { id: 'LAB006', name: 'General Laborers', type: 'General Laborers', category: 'Unskilled', createdAt: '2024-01-20T00:00:00.000Z' },
                { id: 'LAB007', name: 'Beldar', type: 'Beldar', category: 'Unskilled', createdAt: '2024-01-21T00:00:00.000Z' },
                { id: 'LAB008', name: 'Masons', type: 'Masons', category: 'Skilled', createdAt: '2024-01-22T00:00:00.000Z' },
                { id: 'LAB009', name: 'Carpenters', type: 'Carpenters', category: 'Skilled', createdAt: '2024-01-23T00:00:00.000Z' },
                { id: 'LAB010', name: 'Electricians', type: 'Electricians', category: 'Skilled', createdAt: '2024-01-24T00:00:00.000Z' },
              ];
              const userLabours = parsed.map((lab: any) => ({
                id: lab.id,
                name: lab.name || lab.type,
                type: lab.type,
                category: lab.category,
                createdAt: lab.createdAt
              }));
              setLabours([...defaultLabours, ...userLabours]);
            } catch (e) {
              console.error('Error parsing labours:', e);
            }
          }
        }}
      />

      {/* Create Asset Modal */}
      <CreateAssetEquipmentModal
        theme={theme}
        isOpen={showCreateAssetModal}
        onClose={() => setShowCreateAssetModal(false)}
        onSuccess={() => {
          setShowCreateAssetModal(false);
          // Reload assets from localStorage
          const savedAssets = localStorage.getItem('assetsEquipments');
          if (savedAssets) {
            try {
              const parsed = JSON.parse(savedAssets);
              const defaultAssets: AssetEquipment[] = [
                { id: '1', code: 'AE001', name: 'Machinery Hire', specification: 'Heavy Duty', unit: 'Hrs', createdAt: '2024-01-15T00:00:00.000Z' },
                { id: '2', code: 'AE002', name: 'Breaker Hire', specification: 'Industrial Grade', unit: 'Hrs', createdAt: '2024-01-16T00:00:00.000Z' },
                { id: '3', code: 'AE003', name: 'MS Props', specification: 'Standard Size', unit: 'Nos', createdAt: '2024-01-17T00:00:00.000Z' },
                { id: '4', code: 'AE004', name: 'MS Shikanja', specification: 'Reinforced', unit: 'Nos', createdAt: '2024-01-18T00:00:00.000Z' },
                { id: '5', code: 'AE005', name: 'MS Shuttering Plates', specification: 'Steel Grade', unit: 'Sqm', createdAt: '2024-01-19T00:00:00.000Z' },
                { id: '6', code: 'AE006', name: 'Concrete Breaker Machine', specification: 'Portable', unit: 'Hrs', createdAt: '2024-01-20T00:00:00.000Z' },
                { id: '7', code: 'AE007', name: 'Measuring Tape', specification: '50m', unit: 'Nos', createdAt: '2024-01-21T00:00:00.000Z' },
                { id: '8', code: 'AE008', name: 'Helmets', specification: 'Safety Certified', unit: 'Nos', createdAt: '2024-01-22T00:00:00.000Z' },
              ];
              const userAssets = parsed.map((asset: any) => ({
                id: asset.id,
                code: asset.code,
                name: asset.name,
                specification: asset.specification || '',
                unit: asset.unit,
                createdAt: asset.createdAt
              }));
              setAssets([...defaultAssets, ...userAssets]);
            } catch (e) {
              console.error('Error parsing assets:', e);
            }
          }
        }}
      />

      {/* Create Subproject Modal */}
      <CreateSubprojectModal
        theme={theme}
        isOpen={showCreateSubprojectModal}
        onClose={() => setShowCreateSubprojectModal(false)}
        onSuccess={() => {
          setShowCreateSubprojectModal(false);
          // Reload subprojects from localStorage
          const savedSubprojects = localStorage.getItem('subprojects');
          if (savedSubprojects) {
            try {
              const parsed = JSON.parse(savedSubprojects);
              const userSubprojects = parsed.map((sub: any) => ({
                id: sub.id,
                name: sub.name,
                code: sub.code || `SUB${String(sub.id).padStart(3, '0')}`,
                project: sub.project,
                manager: sub.manager,
                status: sub.status || 'Pending',
                progress: sub.progress || 0,
                startDate: sub.startDate || '',
                endDate: sub.endDate || ''
              }));
              const defaultSubprojects: Subproject[] = [
                { id: '1', name: 'Foundation Work', code: 'SUB001', project: 'Residential Complex A', manager: 'John Doe', status: 'Active', progress: 85, startDate: '2024-01-20', endDate: '2024-03-15' },
                { id: '2', name: 'Structural Framework', code: 'SUB002', project: 'Residential Complex A', manager: 'John Doe', status: 'In Progress', progress: 60, startDate: '2024-03-16', endDate: '2024-06-30' },
                { id: '3', name: 'A wing', code: 'SUB003', project: 'Lakeshire', manager: 'Jane Smith', status: 'Active', progress: 75, startDate: '2024-01-15', endDate: '2024-05-20' },
                { id: '4', name: 'B wing', code: 'SUB004', project: 'Lakeshire', manager: 'Jane Smith', status: 'In Progress', progress: 45, startDate: '2024-03-01', endDate: '2024-07-15' },
                { id: '5', name: 'Electrical Installation', code: 'SUB005', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'In Progress', progress: 45, startDate: '2024-02-25', endDate: '2024-05-20' },
                { id: '6', name: 'HVAC System', code: 'SUB006', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'Pending', progress: 0, startDate: '2024-05-21', endDate: '2024-07-10' },
              ];
              setSubprojects([...defaultSubprojects, ...userSubprojects]);
            } catch (e) {
              console.error('Error parsing subprojects:', e);
            }
          }
        }}
        defaultSubprojects={[
          { id: '1', name: 'Foundation Work', code: 'SUB001', project: 'Residential Complex A', manager: 'John Doe', status: 'Active', progress: 85, startDate: '2024-01-20', endDate: '2024-03-15' },
          { id: '2', name: 'Structural Framework', code: 'SUB002', project: 'Residential Complex A', manager: 'John Doe', status: 'In Progress', progress: 60, startDate: '2024-03-16', endDate: '2024-06-30' },
          { id: '3', name: 'A wing', code: 'SUB003', project: 'Lakeshire', manager: 'Jane Smith', status: 'Active', progress: 75, startDate: '2024-01-15', endDate: '2024-05-20' },
          { id: '4', name: 'B wing', code: 'SUB004', project: 'Lakeshire', manager: 'Jane Smith', status: 'In Progress', progress: 45, startDate: '2024-03-01', endDate: '2024-07-15' },
          { id: '5', name: 'Electrical Installation', code: 'SUB005', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'In Progress', progress: 45, startDate: '2024-02-25', endDate: '2024-05-20' },
          { id: '6', name: 'HVAC System', code: 'SUB006', project: 'Commercial Tower B', manager: 'Mike Johnson', status: 'Pending', progress: 0, startDate: '2024-05-21', endDate: '2024-07-10' },
        ]}
        userSubprojects={subprojects.filter(s => !['1', '2', '3', '4', '5', '6'].includes(s.id))}
        onSubprojectCreated={handleSubprojectCreated}
        defaultProject={selectedProject?.name || ''}
      />
    </div>
  );
};

export default DPR;
