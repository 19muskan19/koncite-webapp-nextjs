'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { ThemeType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useUser } from '../contexts/UserContext';
import { masterDataAPI, documentAPI } from '../services/api';
import { getLogoUrl } from '@/utils/imageUtils';
import {
  Folder,
  Briefcase,
  Users,
  Image as ImageIcon,
  Trash2,
  Search,
  Grid3x3,
  List,
  RefreshCw,
  Plus,
  BotMessageSquare,
  FileText,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  FolderOpen,
  Upload,
  FolderPlus,
  Menu,
  Check,
  Download,
  Share2,
  Copy,
  RotateCcw,
  Cloud,
  CloudOff
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  size: string;
  lastModified: string;
  owner: string;
  type: 'file' | 'folder';
  file?: File;
  path?: string;
  originalPath?: string;
  deletedAt?: string;
  fileData?: string; // Base64 encoded file data
  mimeType?: string; // MIME type of the file
}

interface Project {
  id: string;
  numericId?: number; // Store numeric ID for API calls
  name: string;
  code: string;
  company: string;
  companyLogo: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  location: string;
  logo: string;
  isContractor?: boolean;
  projectManager?: string;
  createdAt?: string;
  azure_folder_path?: string; // Azure Blob Storage folder path for documents
  blobStorageConnected?: boolean; // Whether blob storage folder exists and is accessible
  blobItemCount?: number; // Number of items in blob storage folder
  blobError?: string; // Error message if blob storage verification failed
}

interface DocumentManagementProps {
  theme: ThemeType;
  initialPathFromUrl?: string[];
}

/** Create URL-safe slug from project name */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
}

/** Check if string is a UUID */
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Convert URL segments to currentPath (internal state). projects needed to resolve slug to ID. */
function urlSegmentsToPath(segments: string[], projects?: Project[]): string[] {
  if (segments.length === 0) return ['office'];
  if (segments[0] === 'projects') {
    if (segments.length === 1) return ['projects'];
    const slugOrId = segments[1];
    const rest = segments.slice(2);
    let projectId = slugOrId;
    if (!isUuid(slugOrId)) {
      if (projects?.length) {
        const project = projects.find(
          p => slugify(p.name) === slugOrId || slugify(p.code || '') === slugOrId
        );
        projectId = project ? String(project.id) : slugOrId;
      } else {
        return ['projects'];
      }
    }
    return ['projects', `project_${projectId}`, ...rest];
  }
  return segments;
}

/** Convert currentPath to URL segments. Uses: office, projects, trash, shared, image-gallery. */
function pathToUrlSegments(path: string[], projects?: Project[]): string[] {
  if (path.length === 0) return ['office'];
  if (path[0] === 'projects' && path.length >= 2 && path[1].startsWith('project_')) {
    const id = path[1].replace('project_', '');
    const rest = path.slice(2);
    let slug = id;
    if (projects?.length) {
      const project = projects.find(p => String(p.id) === id || String(p.numericId) === id);
      if (project?.name) slug = slugify(project.name);
    }
    return ['projects', slug, ...rest];
  }
  return path;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ theme, initialPathFromUrl = [] }) => {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useUser();
  const [selectedFolder, setSelectedFolder] = useState<string>('office');
  const [currentPath, setCurrentPath] = useState<string[]>(() =>
    urlSegmentsToPath(initialPathFromUrl, [])
  );
  const [folderDisplayNames, setFolderDisplayNames] = useState<Record<string, string>>({}); // uuid/path -> display name for breadcrumbs
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewDropdown, setShowNewDropdown] = useState<boolean>(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareMode, setShareMode] = useState<'team' | 'link'>('team');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
  const [teamMemberSearch, setTeamMemberSearch] = useState<string>('');
  const [teamMembersList, setTeamMembersList] = useState<Array<{ id: string; name: string; email: string; role?: string }>>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState<boolean>(false);
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState<boolean>(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  // Image Gallery filters
  const [imageSearchName, setImageSearchName] = useState<string>('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState<boolean>(false);
  const [galleryPage, setGalleryPage] = useState<number>(1);
  const GALLERY_PAGE_SIZE = 24;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [trashCount, setTrashCount] = useState<number>(0);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameModalMode, setRenameModalMode] = useState<'file' | 'folder'>('file');
  const [renameModalValue, setRenameModalValue] = useState<string>('');
  const [renameModalError, setRenameModalError] = useState<string | null>(null);
  const [renameModalExistingNames, setRenameModalExistingNames] = useState<Set<string>>(new Set());
  const [pendingUploadQueue, setPendingUploadQueue] = useState<Array<{ file: File; displayName: string }>>([]);
  const [renameUploadQueue, setRenameUploadQueue] = useState<File[]>([]);
  const [viewFile, setViewFile] = useState<FileItem | null>(null);
  const [viewFileExcelData, setViewFileExcelData] = useState<{ sheetNames: string[]; sheets: Record<string, string[][]> } | null>(null);
  const [viewFileActiveSheet, setViewFileActiveSheet] = useState<string>('');
  const [viewFileLoading, setViewFileLoading] = useState(false);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  const prevSelectedCountRef = React.useRef<number>(0);
  const lastFileClickRef = React.useRef<{ fileId: string; time: number } | null>(null);

  const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/;
  const isValidDisplayName = (name: string): boolean => !INVALID_FILENAME_CHARS.test(name) && name.trim().length > 0;

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // DMS Step 1: GET /api/project-list - load projects for sidebar only
  const loadProjects = async () => {
    if (typeof window !== 'undefined') {
      const { getCookie } = require('../utils/cookies');
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
      if (!token || !authFlag) {
        setProjects([]);
        setProjectsLoading(false);
        setProjectsError(null);
        return;
      }
    } else {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const fetchedProjects = await masterDataAPI.getProjects();
      console.log('✅ Fetched projects from API:', fetchedProjects?.length || 0);
      
      if (!Array.isArray(fetchedProjects)) {
        console.error('❌ API did not return an array:', fetchedProjects);
        setProjects([]);
        return;
      }
      
      // Transform API response. Backend returns azure_path_status (true/false) only, not actual path (safety).
      const transformedProjects: Project[] = fetchedProjects.map((p: any) => {
        const companyName = p.companies?.registration_name || p.companies?.name || p.company || p.company_name || '';
        const companyLogo = p.companies?.logo || p.company_logo || '';
        const numericId = p.id;
        const uuid = p.uuid;
        const azurePathStatus = p.azure_path_status === true;
        return {
          id: uuid || String(numericId),
          numericId: numericId,
          name: p.project_name || p.name || '',
          code: p.code || '',
          company: companyName,
          companyLogo: companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=6366f1&color=fff&size=64`,
          startDate: p.planned_start_date || p.start_date || p.startDate || '',
          endDate: p.planned_end_date || p.end_date || p.endDate || '',
          status: p.status || 'Planning',
          progress: p.progress || 0,
          location: p.address || p.location || '',
          logo: getLogoUrl(p.logo, p.project_name || p.name || '', '6366f1'),
          isContractor: p.own_project_or_contractor === 'yes' || p.is_contractor || p.isContractor,
          projectManager: p.project_manager || p.projectManager,
          createdAt: p.created_at || p.createdAt,
          blobStorageConnected: azurePathStatus,
          blobError: azurePathStatus ? undefined : 'Azure path not configured',
        };
      });

      setProjects(transformedProjects);
      setProjectsError(null);
    } catch (err: any) {
      const message = err?.message || err?.response?.data?.message || 'Failed to load projects';
      setProjects([]);
      setProjectsError(message);
      toast.showError(message);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Do NOT load project-list on DMS open. project-list is loaded only when user clicks "Project" in the sidebar (see sidebar button onClick for item.id === 'projects').

  // Get current folder path as string
  const getCurrentFolderPath = () => {
    return currentPath.join('/');
  };

  // Trash count disabled - badge not shown
  const loadTrashCount = async () => {
    setTrashCount(0);
  };

  // DMS Step 2: GET /api/documents (office/shared) or GET /api/documents?category=project&project_id=<id> (when a project is selected). Do NOT call documents API when only "Project" menu is selected – only project-list is called then.
  const loadDocuments = async () => {
    if (isLoading) return;
    if (typeof window !== 'undefined') {
      const { getCookie } = require('../utils/cookies');
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
      if (!token || !authFlag) {
        setDocuments([]);
        setDocumentsLoading(false);
        setDocumentsError(null);
        return;
      }
    } else {
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    // When user clicked "Project" in sidebar but no specific project selected: only project-list is called (on click). Do NOT call documents API here.
    if (currentPath[0] === 'projects' && currentPath.length === 1) {
      setDocuments([]);
      setDocumentsLoading(false);
      setDocumentsError(null);
      return;
    }

    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      // Determine category and project_id from currentPath
      const firstSegment = currentPath[0];
      let category: 'office' | 'project' | 'shared' = 'office';
      let projectId: number | undefined;
      let folderUuid: string | undefined;
      let folderPath: string | undefined;

      // DMS Step 3: Click a project → GET /api/documents?category=project&project_id=<id>&folder_path=<azure_path>
      if (firstSegment === 'projects' && currentPath.length > 1) {
        category = 'project';
        // Extract project ID from path (format: project_<id>)
        const projectSegment = currentPath[1];
        if (projectSegment.startsWith('project_')) {
          const projectIdStr = projectSegment.replace('project_', '');
          // Find project by ID to get numeric ID and azure_folder_path
          const project = projects.find(p => p.id === projectIdStr || String(p.id) === projectIdStr);
          if (project) {
            // Use numericId if available, otherwise try to parse the ID
            projectId = project.numericId || (typeof project.id === 'number' ? project.id : parseInt(projectIdStr));
            
            // If project has azure_folder_path, use it as base path
            // Backend will use this to list blobs directly from Azure
            // Backend resolves path from project (azure_folder_path in DB). Frontend does not receive or send actual path; we only have azure_path_status for icon. Send only project_id.
          }
        }
        // Check if we're navigating into a folder
        if (currentPath.length > 2) {
          const folderSegment = currentPath[currentPath.length - 1];
          // Check if it's a UUID format or a path
          if (folderSegment.includes('/')) {
            folderPath = folderSegment;
          } else {
            folderUuid = folderSegment;
          }
        }
      } else if (firstSegment === 'shared') {
        // Shared root: GET /api/documents/shared → flat list of items shared with user.
        // Shared folder contents: GET /api/documents?category=shared&folder_uuid=<id> → files/folders inside that folder.
        if (currentPath.length > 1) {
          // User opened a shared folder: load its contents via list-documents API (same as office/project nested folders).
          const sharedFolderUuid = currentPath[currentPath.length - 1];
          const response = await documentAPI.getDocuments({
            category: 'shared',
            folder_uuid: sharedFolderUuid,
          });
          if (response.status && response.data) {
            const fileItems: FileItem[] = response.data.map((doc: any) => ({
              id: doc.uuid,
              name: doc.original_name ?? doc.name,
              size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
              lastModified: doc.uploaded_at || new Date().toLocaleDateString(),
              owner: doc.uploaded_by || 'Unknown',
              type: doc.is_folder ? 'folder' : 'file',
              path: doc.file_path || doc.item_path || doc.full_path,
              fileData: doc.file_url,
              mimeType: doc.mime_type,
            }));
            setDocuments(fileItems);
            setDocumentsError(null);
            setFolderDisplayNames(prev => {
              const next = { ...prev };
              fileItems.filter(item => item.type === 'folder').forEach(f => {
                if (f.name) next[f.id] = f.name;
              });
              return next;
            });
          } else {
            setDocuments([]);
          }
        } else {
          // Shared root: dedicated endpoint returns top-level shared items only.
          const response = await documentAPI.getSharedItems();
          if (response.status && response.data) {
            const fileItems: FileItem[] = response.data.map((item: any) => ({
              id: item.uuid,
              name: item.item_name || 'Untitled',
              size: '—',
              lastModified: item.shared_date && item.shared_time ? `${item.shared_date} ${item.shared_time}` : (item.shared_at || '—'),
              owner: item.shared_by || 'Unknown',
              type: (item.item_type === 'folder' ? 'folder' : 'file') as 'file' | 'folder',
              path: item.file_path || item.item_path || item.full_path,
            }));
            setDocuments(fileItems);
            setDocumentsError(null);
          } else {
            setDocuments([]);
          }
        }
        setDocumentsLoading(false);
        setSelectedFiles(new Set());
        return;
      } else if (firstSegment === 'trash') {
        // GET /api/documents/trash – list trashed items (soft-deleted)
        try {
          const response = await documentAPI.getTrash();
          if (response.status && response.data) {
            const fileItems: FileItem[] = response.data.map((item: any) => ({
              id: item.uuid,
              name: item.name || item.original_name || 'Untitled',
              size: item.file_size ? `${(item.file_size / 1024).toFixed(2)} KB` : '—',
              lastModified: item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—',
              owner: item.uploaded_by || 'Unknown',
              type: item.is_folder ? 'folder' : 'file',
              path: item.file_path || item.item_path || item.full_path,
              originalPath: item.original_parent_uuid || item.original_parent_name || undefined,
              deletedAt: item.deleted_at,
            }));
            setDocuments(fileItems);
            setDocumentsError(null);
            setTrashCount(Array.isArray(response.data) ? response.data.length : 0);
          } else {
            setDocuments([]);
            setTrashCount(0);
          }
        } catch (err: any) {
          const msg = err?.message || err?.response?.data?.message || 'Failed to load trash';
          setDocuments([]);
          setDocumentsError(msg);
          setTrashCount(0);
          toast.showError(msg);
        }
        setDocumentsLoading(false);
        setSelectedFiles(new Set());
        return;
      } else if (firstSegment === 'office' && currentPath.length > 1) {
        // Office nested folder: pass folder_uuid or folder_path so API returns this folder's contents (match Laravel)
        const folderSegment = currentPath[currentPath.length - 1];
        if (folderSegment.includes('/')) {
          folderPath = folderSegment;
        } else {
          folderUuid = folderSegment;
        }
      } else if (firstSegment === 'image-gallery') {
        try {
          // Load gallery images from API
          let galleryProjectId: number | undefined;
          if (selectedProjectFilter !== 'all') {
            const projectIdStr = selectedProjectFilter.replace('project_', '');
            const project = projects.find(p => p.id === projectIdStr || String(p.id) === projectIdStr);
            galleryProjectId = project?.numericId || (typeof project?.id === 'number' ? project.id : parseInt(projectIdStr));
          }
          
          const response = await documentAPI.getGalleryImages({
            project_id: galleryProjectId,
            category: galleryProjectId ? 'project' : undefined,
            page: 1,
            per_page: 100,
          });
          
          if (response.status && response.data) {
            const galleryImages: FileItem[] = response.data.map((img: any) => ({
              id: img.uuid || img.id,
              name: img.original_name ?? img.name,
              size: img.file_size ? `${(img.file_size / 1024).toFixed(2)} KB` : '0 KB',
              lastModified: img.uploaded_at || new Date().toLocaleDateString(),
              owner: img.uploaded_by || 'Unknown',
              type: 'file' as const,
              path: img.blob_path,
              fileData: img.url,
              mimeType: img.mime_type,
            }));
            setDocuments(galleryImages);
            setDocumentsError(null);
            setSelectedFiles(new Set());
          } else {
            setDocuments([]);
          }
        } catch (galleryErr: any) {
          // Check if it's a 401 error - don't show error toast as interceptor handles logout
          const is401 = galleryErr.response?.status === 401 || galleryErr.status === 401;
          
          if (!is401) {
            toast.showError(galleryErr.message || 'Failed to load gallery images');
          }
          
          setDocuments([]);
        }
        return;
      }

      // Call API to get documents
      // Backend will handle:
      // 1. Company isolation (filters by user's company_id -> child company IDs)
      // 2. Permission checks (getAccessibleDocumentIds)
      // 3. Azure blob listing (if project has azure_folder_path)
      const params: any = {
        category,
      };
      
      if (projectId) {
        params.project_id = projectId;
      }
      
      if (folderUuid) {
        params.folder_uuid = folderUuid;
      }
      
      if (folderPath) {
        params.folder_path = folderPath;
      }

      console.log('📄 Loading documents with params:', params);
      const response = await documentAPI.getDocuments(params);
      
      if (response.status && response.data) {
        const fileItems: FileItem[] = response.data.map((doc: any) => ({
          id: doc.uuid,
          name: doc.original_name ?? doc.name,
          size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
          lastModified: doc.uploaded_at || new Date().toLocaleDateString(),
          owner: doc.uploaded_by || 'Unknown',
          type: doc.is_folder ? 'folder' : 'file',
          path: doc.file_path || doc.item_path || doc.full_path,
          fileData: doc.file_url,
          mimeType: doc.mime_type,
        }));
        setDocuments(fileItems);
        setDocumentsError(null);
        // Store folder names for breadcrumb display (no extra API calls)
        setFolderDisplayNames(prev => {
          const next = { ...prev };
          fileItems.filter(item => item.type === 'folder').forEach(f => {
            if (f.name) next[f.id] = f.name;
          });
          return next;
        });
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load documents';
      setDocuments([]);
      setDocumentsError(errorMessage);
      const errorStatus = err.status || err.response?.status;
      const errorData = err.response?.data || {};
      console.error('❌ Failed to load documents:', {
        error: err,
        status: errorStatus,
        message: errorMessage,
        response: errorData,
        url: err.config?.url,
        headers: err.config?.headers,
        hasAuthHeader: !!err.config?.headers?.Authorization,
        authHeaderPreview: err.config?.headers?.Authorization ? `${err.config.headers.Authorization.substring(0, 30)}...` : 'none',
      });
      
      // Check if it's a 401 error
      const is401 = errorStatus === 401;
      
      if (is401) {
        // For 401 on document endpoints, show detailed error message
        const detailedMessage = errorMessage.includes('unauthenticated') || errorMessage.includes('Unauthenticated')
          ? `Authentication failed: ${errorMessage}. Please check if you're logged in and try refreshing the page.`
          : errorMessage;
        
        // Check token for logging
        let hasToken = false;
        if (typeof window !== 'undefined') {
          const { getCookie } = require('../utils/cookies');
          hasToken = !!(getCookie('auth_token') || localStorage.getItem('auth_token'));
        }
        
        console.warn('⚠️ 401 Authentication failed on document endpoint:', {
          message: errorMessage,
          detailedMessage,
          errorData,
          hasToken,
        });
        
        toast.showError(detailedMessage);
      } else {
        toast.showError(errorMessage);
      }
    } finally {
      setDocumentsLoading(false);
    }
    setSelectedFiles(new Set());
  };

  // Load trash count for sidebar badge when DMS is ready (once when auth is ready)
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;
    const { getCookie } = require('../utils/cookies');
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
    if (token && authFlag) loadTrashCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Load documents when folder changes or when authenticated
  useEffect(() => {
    // Don't load if still checking authentication or user profile
    if (isLoading) {
      console.log('⏳ Still loading user profile, waiting...');
      return;
    }
    
    // Double-check token exists before making API call
    // Use token check instead of isAuthenticated (which requires user to be loaded)
    if (typeof window !== 'undefined') {
      const { getCookie } = require('../utils/cookies');
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
      
      if (!token || !authFlag) {
        setDocuments([]);
        setDocumentsLoading(false);
        setDocumentsError(null);
        return;
      }
      loadDocuments();
    } else {
      setDocuments([]);
      setDocumentsLoading(false);
      setDocumentsError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, isLoading, selectedProjectFilter]);

  // Load projects when opening a project URL (needed to resolve slug to ID)
  useEffect(() => {
    if (initialPathFromUrl[0] === 'projects' && initialPathFromUrl.length > 1 && projects.length === 0 && !projectsLoading) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPathFromUrl[0], initialPathFromUrl.length]);

  // Sync from URL when it changes (initial load, projects loaded for slug resolution). Skip when state already matches to prevent redundant re-renders.
  const initialPathKey = initialPathFromUrl.join('/');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathFromUrl = urlSegmentsToPath(initialPathFromUrl, projects);
    setCurrentPath(prev => {
      if (prev.length === pathFromUrl.length && prev.every((p, i) => p === pathFromUrl[i])) return prev;
      return pathFromUrl;
    });
    setSelectedFolder(prev => {
      const firstSegment = pathFromUrl[0];
      const folder = firstSegment === 'projects' && pathFromUrl[1] ? pathFromUrl[1] : firstSegment;
      return prev === folder ? prev : folder;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPathKey, projects]);

  // Update URL when currentPath changes. Use history.replaceState to avoid Next.js navigation (no re-render from router = no double glitch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const segments = pathToUrlSegments(currentPath, projects);
    const targetPath = segments.length > 0 ? segments.join('/') : 'office';
    const targetUrl = `/document-management/${targetPath}`;
    if (window.location.pathname !== targetUrl) {
      window.history.replaceState(null, '', targetUrl);
    }
  }, [currentPath, projects]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const pathSegments = window.location.pathname.replace('/document-management', '').replace(/^\//, '').split('/').filter(Boolean);
      const pathFromUrl = urlSegmentsToPath(pathSegments, projects);
      setCurrentPath(pathFromUrl);
      const firstSegment = pathFromUrl[0];
      const folder = firstSegment === 'projects' && pathFromUrl[1] ? pathFromUrl[1] : firstSegment;
      setSelectedFolder(folder);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projects]);

  // Sync currentPath when sidebar folder changes. Keep 'projects' prefix when a project is selected so loadDocuments calls category=project&project_id=, not office.
  // Return prev when unchanged to avoid redundant re-renders (prevents double glitch on click)
  useEffect(() => {
    setCurrentPath(prev => {
      const next = selectedFolder.startsWith('project_') ? ['projects', selectedFolder] : [selectedFolder];
      if (prev.length === next.length && prev.every((p, i) => p === next[i])) return prev;
      return next;
    });
  }, [selectedFolder]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined' || !document) {
      return;
    }
    
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      if (document && document.body) {
        document.body.style.overflow = '';
      }
    };
  }, [sidebarOpen]);

  const handleRefresh = () => {
    if (currentPath[0] === 'projects') {
      loadProjects();
    }
    loadDocuments();
  };

  // Save documents to localStorage (skip when viewing API trash so we don't overwrite)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (currentPath[0] === 'trash') return;
    const folderPath = getCurrentFolderPath();
    if (documents.length > 0) {
      // Store only serializable data
      const documentsToStore = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        lastModified: doc.lastModified,
        owner: doc.owner,
        type: doc.type,
        path: doc.path || folderPath,
        originalPath: (doc as any).originalPath,
        deletedAt: (doc as any).deletedAt,
        fileData: (doc as any).fileData,
        mimeType: (doc as any).mimeType
      }));
      safeSetItem(`documents_${folderPath}`, JSON.stringify(documentsToStore));
    } else {
      try {
        localStorage.removeItem(`documents_${folderPath}`);
      } catch (error) {
        console.error('Error removing documents:', error);
      }
    }
  }, [documents, currentPath]);

  // Interface for folder tree structure
  interface FolderTreeNode {
    id: string;
    name: string;
    path: string;
    children: FolderTreeNode[];
    level: number;
  }

  // Build folder tree structure from localStorage
  const buildFolderTree = (basePath: string): FolderTreeNode[] => {
    const tree: FolderTreeNode[] = [];
    const folderMap = new Map<string, FolderTreeNode>();

    // Get all localStorage keys that start with 'documents_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('documents_') && key !== 'documents_trash' && key !== 'documents_image-gallery') {
        const path = key.replace('documents_', '');
        
        // Only process paths that start with basePath
        if (path === basePath || path.startsWith(basePath + '/')) {
          const relativePath = path === basePath ? '' : path.substring(basePath.length + 1);
          const segments = relativePath ? relativePath.split('/').filter(s => s) : [];
          
          // Build tree structure
          let currentPath = basePath;
          let parent: FolderTreeNode | null = null;
          
          segments.forEach((segment, index) => {
            // Extract folder name from segment (format: "folderName_timestamp")
            const nameParts = segment.split('_');
            // Join all parts except the last one (timestamp) to get folder name
            const folderName = nameParts.length > 1 
              ? nameParts.slice(0, -1).join('_') 
              : segment;
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            const nodeId = currentPath;
            
            if (!folderMap.has(nodeId)) {
              const node: FolderTreeNode = {
                id: nodeId,
                name: folderName,
                path: currentPath,
                children: [],
                level: index + 1
              };
              
              folderMap.set(nodeId, node);
              
              if (parent) {
                parent.children.push(node);
              } else {
                tree.push(node);
              }
              
              parent = node;
            } else {
              parent = folderMap.get(nodeId) || null;
            }
          });
        }
      }
    }

    // Sort folders alphabetically
    const sortTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      return nodes.sort((a, b) => a.name.localeCompare(b.name)).map(node => ({
        ...node,
        children: sortTree(node.children)
      }));
    };

    return sortTree(tree);
  };

  // Get folder tree for a specific base path
  const getFolderTreeForPath = (basePath: string): FolderTreeNode[] => {
    return buildFolderTree(basePath);
  };

  const sidebarItems = [
    {
      id: 'office',
      label: 'Office',
      icon: Folder,
      subItems: []
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: Briefcase,
      subItems: projects.map(project => ({
        id: `project_${project.id}`,
        label: project.name,
        blobStorageConnected: project.blobStorageConnected,
        azure_folder_path: project.azure_folder_path,
        blobItemCount: project.blobItemCount,
        blobError: project.blobError,
      }))
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: Users,
      subItems: []
    },
    {
      id: 'image-gallery',
      label: 'Image Gallery',
      icon: ImageIcon,
      subItems: []
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: Trash2,
      subItems: []
    }
  ];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getCurrentFolderLabel = () => {
    if (currentPath.length > 1) {
      const lastSegment = currentPath[currentPath.length - 1];
      const name = folderDisplayNames[lastSegment];
      if (name) return name;
      // Project segment: show project name (e.g. TowerD), not "project"
      if (lastSegment.startsWith('project_')) {
        const projectId = lastSegment.replace('project_', '');
        const project = projects.find(p => p.id === projectId || String(p.id) === projectId);
        return project?.name || lastSegment;
      }
      const parts = lastSegment.split('/');
      const lastPart = parts[parts.length - 1];
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart);
      return isUuid ? 'Folder' : (lastPart || 'Folder');
    }
    // Section-level view: show correct section label (Trash, Shared, Projects, Office, Image Gallery)
    const sectionId = currentPath[0] || selectedFolder;
    const sectionItem = sidebarItems.find(item => item.id === sectionId);
    if (sectionItem) return sectionItem.label;
    if (sectionId.startsWith('project_')) {
      const project = projects.find(p => p.id === sectionId.replace('project_', '') || String(p.id) === sectionId.replace('project_', ''));
      return project?.name || sectionId;
    }
    return 'Office';
  };

  // Navigate into a folder (from main content double-click; names stored for breadcrumb)
  const navigateToFolder = (folderId: string, folderName: string, folderPath?: string) => {
    // In Shared view we must use folderId (SharedDocument.uuid) so the API can resolve the share and list folder contents. Using folderPath would send a blob path and the backend would not find the share.
    const isSharedView = currentPath[0] === 'shared';
    const pathToUse = isSharedView ? folderId : (folderPath && folderPath.includes('/') ? folderPath : folderId);
    if (folderName) {
      setFolderDisplayNames(prev => ({ ...prev, [pathToUse]: folderName }));
    }
    setCurrentPath(prev => {
      if (prev[prev.length - 1] === pathToUse) return prev;
      return [...prev, pathToUse];
    });
    setSelectedFiles(new Set());
  };

  // Navigate back using breadcrumb
  const navigateToPath = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
    setSelectedFiles(new Set());
  };

  // Filter files based on search query and image gallery filters
  const filteredFiles = documents.filter(file => {
    // Basic search filter
    const matchesSearch = searchQuery === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Image Gallery specific filters
    if (currentPath[0] === 'image-gallery') {
      // Filter by name
      const matchesName = imageSearchName === '' || 
        file.name.toLowerCase().includes(imageSearchName.toLowerCase());
      
      // Filter by project (check if file originalPath or path contains project ID)
      let matchesProject = true;
      if (selectedProjectFilter !== 'all') {
        const projectId = selectedProjectFilter.replace('project_', '');
        const filePath = (file as any).originalPath || file.path || '';
        matchesProject = filePath.includes(`project_${projectId}`) || filePath.includes(projectId);
      }
      
      return matchesSearch && matchesName && matchesProject;
    }
    
    return matchesSearch;
  });

  // Paginated gallery files (image-gallery only)
  const galleryTotalPages = currentPath[0] === 'image-gallery'
    ? Math.max(1, Math.ceil(filteredFiles.length / GALLERY_PAGE_SIZE))
    : 1;
  const paginatedGalleryFiles = currentPath[0] === 'image-gallery'
    ? filteredFiles.slice((galleryPage - 1) * GALLERY_PAGE_SIZE, galleryPage * GALLERY_PAGE_SIZE)
    : filteredFiles;
  const galleryStart = currentPath[0] === 'image-gallery' && filteredFiles.length > 0
    ? (galleryPage - 1) * GALLERY_PAGE_SIZE + 1
    : 0;
  const galleryEnd = currentPath[0] === 'image-gallery'
    ? Math.min(galleryPage * GALLERY_PAGE_SIZE, filteredFiles.length)
    : filteredFiles.length;

  // Reset gallery page when filters change
  useEffect(() => {
    if (currentPath[0] === 'image-gallery') {
      setGalleryPage(1);
    }
  }, [imageSearchName, selectedProjectFilter, currentPath[0]]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.showWarning('Please enter a folder name');
      return;
    }
    const folderName = newFolderName.trim();
    const existingNames = new Set(documents.map((d) => d.name));
    if (existingNames.has(folderName)) {
      setRenameModalMode('folder');
      setRenameModalValue(folderName);
      setRenameModalExistingNames(existingNames);
      setShowCreateFolderModal(false);
      setShowRenameModal(true);
      return;
    }

    // Check token instead of isAuthenticated (which requires user to be loaded)
    if (typeof window !== 'undefined') {
      const { getCookie } = require('../utils/cookies');
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
      
      if (!token || !authFlag) {
        toast.showError('Please log in to create folders');
        return;
      }
    } else {
      toast.showError('Please log in to create folders');
      return;
    }

    const firstSegment = currentPath[0];
    const isShared = firstSegment === 'shared';
    const isImageGallery = firstSegment === 'image-gallery';

    // Don't allow folder creation in shared or image gallery
    if (isShared || isImageGallery) {
      toast.showError('Cannot create folders in shared or image gallery');
      return;
    }

    // Determine category and project_id from currentPath
    let category: 'office' | 'project' = 'office';
    let projectId: number | undefined;
    let subprojectId: number | undefined;
    let parentFolderUuid: string | undefined;
    let folderPathParam: string | undefined;

    // Check if we're in a project folder
    if (firstSegment === 'projects' && currentPath.length > 1) {
      category = 'project';
      const projectSegment = currentPath[1];
      if (projectSegment.startsWith('project_')) {
        const projectIdStr = projectSegment.replace('project_', '');
        const project = projects.find(p => p.id === projectIdStr || String(p.id) === projectIdStr);
        if (project) {
          projectId = project.numericId || (typeof project.id === 'number' ? project.id : parseInt(projectIdStr));
          
          // At project root: backend createFolder resolves path from project_id (no path sent from frontend).
        }
      }
      // Check if we're in a subproject or nested folder
      if (currentPath.length > 2) {
        const folderSegment = currentPath[currentPath.length - 1];
        if (folderSegment.includes('/')) {
          folderPathParam = folderSegment;
        } else {
          parentFolderUuid = folderSegment;
        }
      }
    } else if (firstSegment === 'office') {
      category = 'office';
      // For office, check if we're in a nested folder
      if (currentPath.length > 1) {
        const folderSegment = currentPath[currentPath.length - 1];
        if (folderSegment.includes('/')) {
          folderPathParam = folderSegment;
        } else {
          parentFolderUuid = folderSegment;
        }
      }
    }

    try {
      const folderData: any = {
        folder_name: folderName,
        category,
      };

      if (projectId) {
        folderData.project_id = projectId;
      }

      if (subprojectId) {
        folderData.subproject_id = subprojectId;
      }

      if (parentFolderUuid) {
        folderData.parent_folder_uuid = parentFolderUuid;
      }

      if (folderPathParam) {
        folderData.folder_path = folderPathParam;
      }

      console.log('📁 Creating folder via API:', folderData);

      toast.showInfo(`Creating folder "${folderName}"...`);

      const response = await documentAPI.createFolder(folderData);

      if (response.status && response.data) {
        // Transform API response to FileItem format
        const newFolder: FileItem = {
          id: response.data.uuid,
          name: response.data.name,
          size: '-',
          lastModified: response.data.created_at || new Date().toLocaleDateString(),
          owner: 'You',
          type: 'folder',
          path: response.data.name,
        };

        // Update UI
        setDocuments(prev => [...prev, newFolder]);
        setNewFolderName('');
        setShowCreateFolderModal(false);
        setShowNewDropdown(false);
        
        // Reload documents to get latest from server
        await loadDocuments();
        
        toast.showSuccess(response.message || `Folder "${folderName}" created successfully`);
      } else {
        toast.showError(response.message || 'Failed to create folder');
      }
    } catch (err: any) {
      console.error('❌ Failed to create folder:', err);
      if (err.response?.status === 409) {
        setRenameModalMode('folder');
        setRenameModalValue(newFolderName.trim());
        setRenameModalExistingNames(new Set(documents.map((d) => d.name)));
        setShowCreateFolderModal(false);
        setShowRenameModal(true);
        return;
      }
      const errorMessage = err.message || err.response?.data?.message || 'Failed to create folder';
      toast.showError(errorMessage);
    }
  };

  const handleUploadFiles = () => {
    uploadFileInputRef.current?.click();
    setShowNewDropdown(false);
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Helper function to convert base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Helper function to compress image
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type || 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            file.type || 'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
    });
  };

  // Helper function to estimate storage size
  const estimateStorageSize = (data: string): number => {
    return new Blob([data]).size;
  };

  // Helper function to get available storage (approximate)
  const getAvailableStorage = (): number => {
    if (typeof Storage === 'undefined') return 0;
    
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    
    // Most browsers have ~5-10MB limit, we'll use 5MB as conservative estimate
    const maxStorage = 5 * 1024 * 1024; // 5MB in bytes
    return maxStorage - total;
  };

  // Helper function to clear old trash data
  const clearOldTrashData = (): void => {
    try {
      const savedTrash = localStorage.getItem('documents_trash');
      if (savedTrash) {
        const trashDocuments = JSON.parse(savedTrash);
        // Keep only last 50 items
        if (trashDocuments.length > 50) {
          const sortedTrash = trashDocuments.sort((a: any, b: any) => {
            const dateA = new Date(a.deletedAt || 0).getTime();
            const dateB = new Date(b.deletedAt || 0).getTime();
            return dateB - dateA;
          });
          const recentTrash = sortedTrash.slice(0, 50);
          localStorage.setItem('documents_trash', JSON.stringify(recentTrash));
        }
      }
    } catch (e) {
      console.error('Error clearing old trash data:', e);
    }
  };

  // Helper function to safely set localStorage with quota handling
  const safeSetItem = (key: string, value: string): boolean => {
    try {
      const estimatedSize = estimateStorageSize(value);
      const availableStorage = getAvailableStorage();

      // If estimated size is larger than available storage, try to free up space
      if (estimatedSize > availableStorage) {
        // Clear old trash data first
        clearOldTrashData();
        
        // Check again after clearing
        const newAvailableStorage = getAvailableStorage();
        if (estimatedSize > newAvailableStorage) {
          toast.showWarning(`File is too large (${(estimatedSize / 1024 / 1024).toFixed(2)} MB). Available storage: ${(newAvailableStorage / 1024 / 1024).toFixed(2)} MB. Please delete some files or clear trash.`);
          return false;
        }
      }

      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Try to clear old trash data and retry once
        clearOldTrashData();
        try {
          localStorage.setItem(key, value);
          toast.showWarning('Storage was full. Cleared old trash data and saved successfully.');
          return true;
        } catch (retryError) {
          toast.showError(`Storage limit exceeded. Could not save "${key}". Please delete some files or clear browser storage.`);
          console.error('QuotaExceededError after cleanup:', retryError);
          return false;
        }
      } else {
        toast.showError(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Error saving to localStorage:', error);
        return false;
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const existingNames = new Set(documents.map((d) => d.name));
      const needRename = fileList.filter((f) => existingNames.has(f.name));
      const okFiles = fileList.filter((f) => !existingNames.has(f.name));
      if (needRename.length > 0) {
        setPendingUploadQueue(okFiles.map((f) => ({ file: f, displayName: f.name })));
        setRenameUploadQueue(needRename);
        setRenameModalExistingNames(new Set(existingNames));
        setRenameModalMode('file');
        setRenameModalValue(needRename[0].name);
        setRenameModalError(null);
        setShowRenameModal(true);
      } else {
        await processFiles(fileList);
      }
    }
    if (uploadFileInputRef.current) {
      uploadFileInputRef.current.value = '';
    }
  };

  // Upload files with optional display names (for rename flow). Used by processFiles and rename modal.
  const doUpload = async (files: File[], displayNames?: string[]) => {
    // Check token instead of isAuthenticated (which requires user to be loaded)
    if (typeof window !== 'undefined') {
      const { getCookie } = require('../utils/cookies');
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
      
      if (!token || !authFlag) {
        console.error('❌ No auth token or flag found for upload');
        toast.showError('Authentication token not found. Please log in again.');
        return;
      }
      console.log('✅ Auth token and flag verified for upload');
    } else {
      toast.showError('Please log in to upload files');
      return;
    }

    const folderPath = getCurrentFolderPath();
    const firstSegment = currentPath[0];
    const isImageGallery = firstSegment === 'image-gallery';
    const isShared = firstSegment === 'shared';
    
    // Determine category and project_id from currentPath
    let category: 'office' | 'project' = 'office';
    let projectId: number | undefined;
    let subprojectId: number | undefined;
    let parentFolderUuid: string | undefined;
    let folderPathParam: string | undefined;

    // Check if we're in a project folder
    if (firstSegment === 'projects' && currentPath.length > 1) {
      category = 'project';
      const projectSegment = currentPath[1];
      if (projectSegment.startsWith('project_')) {
        const projectIdStr = projectSegment.replace('project_', '');
        const project = projects.find(p => p.id === projectIdStr || String(p.id) === projectIdStr);
        if (project) {
          projectId = project.numericId || (typeof project.id === 'number' ? project.id : parseInt(projectIdStr));
          
          // At project root: backend upload resolves path from project_id (no path sent from frontend).
        }
      }
      // Check if we're in a subproject folder
      if (currentPath.length > 2) {
        const folderSegment = currentPath[currentPath.length - 1];
        // Check if it's a folder path or UUID
        if (folderSegment.includes('/')) {
          folderPathParam = folderSegment;
        } else {
          parentFolderUuid = folderSegment;
        }
      }
    } else if (firstSegment === 'office') {
      category = 'office';
      // For office, we might have nested folders
      if (currentPath.length > 1) {
        const folderSegment = currentPath[currentPath.length - 1];
        if (folderSegment.includes('/')) {
          folderPathParam = folderSegment;
        } else {
          parentFolderUuid = folderSegment;
        }
      }
    }

    // Don't allow uploads to shared or image gallery directly
    if (isShared || isImageGallery) {
      toast.showError('Cannot upload directly to shared or image gallery. Please select a folder.');
      return;
    }

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files[]', file);
      });
      if (displayNames && displayNames.length === files.length) {
        displayNames.forEach((name) => {
          formData.append('original_names[]', name);
        });
      }
      formData.append('category', category);
      if (projectId) {
        formData.append('project_id', projectId.toString());
      }
      if (subprojectId) {
        formData.append('subproject_id', subprojectId.toString());
      }
      if (parentFolderUuid) {
        formData.append('parent_folder_uuid', parentFolderUuid);
      }
      if (folderPathParam) {
        formData.append('folder_path', folderPathParam);
      }

      // Verify token one more time before API call
      if (typeof window !== 'undefined') {
        const { getCookie } = require('../utils/cookies');
        const token = getCookie('auth_token') || localStorage.getItem('auth_token');
        console.log('📤 Uploading files to API:', {
          category,
          projectId,
          subprojectId,
          parentFolderUuid,
          folderPathParam,
          fileCount: files.length,
          hasToken: !!token,
          tokenLength: token?.length || 0,
        });
      }

      // Show loading toast
      toast.showInfo(`Uploading ${files.length} file(s)...`);

      // Call API to upload files
      const response = await documentAPI.uploadDocuments(formData);
      
      if (response.status && response.data) {
        const uploadedFiles = response.data;
        
        // Transform API response to FileItem format
        const fileItems: FileItem[] = uploadedFiles.map((doc: any) => ({
          id: doc.uuid,
          name: doc.original_name ?? doc.name,
          size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
          lastModified: doc.uploaded_at || new Date().toLocaleDateString(),
          owner: doc.uploaded_by || 'You',
          type: 'file' as const,
          path: doc.file_path,
          fileData: doc.file_url, // Signed URL from Azure
          mimeType: doc.mime_type,
        }));

        // Update UI with uploaded files
        setDocuments(prev => [...prev, ...fileItems]);
        
        // Reload documents to get latest from server
        await loadDocuments();
        
        toast.showSuccess(response.message || `${uploadedFiles.length} file(s) uploaded successfully`);
      } else {
        toast.showError(response.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('❌ Failed to upload files:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to upload files';
      toast.showError(errorMessage);
    }
  };

  const processFiles = async (files: File[]) => doUpload(files);
  const processFilesWithNames = async (filesWithNames: Array<{ file: File; displayName: string }>) =>
    doUpload(filesWithNames.map((x) => x.file), filesWithNames.map((x) => x.displayName));

  const handleRenameModalSubmit = () => {
    const newName = renameModalValue.trim();
    setRenameModalError(null);
    if (!newName) {
      setRenameModalError('Name is required.');
      return;
    }
    if (renameModalExistingNames.has(newName)) {
      setRenameModalError('A file or folder with this name already exists in this folder.');
      return;
    }
    if (!isValidDisplayName(newName)) {
      setRenameModalError('Name contains invalid characters (e.g. \\ / : * ? " < > |).');
      return;
    }
    if (renameModalMode === 'file' && renameUploadQueue.length > 0) {
      const nextPending = [...pendingUploadQueue, { file: renameUploadQueue[0], displayName: newName }];
      const updatedExisting = new Set([...renameModalExistingNames, newName]);
      if (renameUploadQueue.length > 1) {
        setPendingUploadQueue(nextPending);
        setRenameUploadQueue(renameUploadQueue.slice(1));
        setRenameModalExistingNames(updatedExisting);
        setRenameModalValue(renameUploadQueue[1].name);
      } else {
        setShowRenameModal(false);
        setRenameUploadQueue([]);
        setPendingUploadQueue([]);
        processFilesWithNames(nextPending);
      }
    } else if (renameModalMode === 'folder') {
      setShowRenameModal(false);
      setNewFolderName(newName);
      setShowCreateFolderModal(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.new-dropdown') && !target.closest('.new-button')) {
        setShowNewDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isViewableImage = (file: FileItem) =>
    file.type === 'file' &&
    file.fileData &&
    typeof file.fileData === 'string' &&
    (file.fileData.startsWith('http') || file.fileData.startsWith('data:')) &&
    (file.mimeType?.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name || ''));

  const isViewableExcel = (file: FileItem) =>
    file.type === 'file' &&
    (file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimeType === 'application/vnd.ms-excel' ||
      file.mimeType === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
      /\.(xlsx|xls|xlsm)$/i.test(file.name || ''));

  const openFileInNewTab = async (file: FileItem) => {
    try {
      if (isPdf(file)) {
        if (hasDirectUrl(file) || (file.fileData && typeof file.fileData === 'string' && file.fileData.startsWith('data:'))) {
          window.open(file.fileData as string, '_blank', 'noopener,noreferrer');
        } else if (file.path || isUuid(file.id)) {
          const blob = await fetchFileBlob(file);
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else {
          toast.showWarning(`File "${file.name}" cannot be opened`);
        }
      } else {
        if (hasDirectUrl(file)) {
          window.open(file.fileData as string, '_blank', 'noopener,noreferrer');
        } else if (file.path || isUuid(file.id)) {
          const blob = await fetchFileBlob(file);
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else if (file.file) {
          const blobUrl = URL.createObjectURL(file.file);
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else if (file.fileData && file.mimeType) {
          const blob = base64ToBlob(file.fileData, file.mimeType);
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } else {
          toast.showWarning(`File "${file.name}" cannot be opened`);
        }
      }
    } catch (err: any) {
      toast.showError(err?.message || `Failed to open ${file.name}`);
    }
  };

  const handleOpenViewMode = async (file: FileItem) => {
    if (file.type !== 'file') return;
    if (isViewableImage(file)) {
      setViewFileExcelData(null);
      setViewFile(file);
    } else if (isViewableExcel(file)) {
      try {
        let blob: Blob;
        if (file.path || isUuid(file.id)) {
          blob = await fetchFileBlob(file);
        } else if (file.fileData && file.mimeType && typeof file.fileData === 'string' && file.fileData.startsWith('data:')) {
          blob = base64ToBlob(file.fileData, file.mimeType);
        } else if (hasDirectUrl(file)) {
          const res = await fetch(file.fileData as string);
          blob = await res.blob();
        } else {
          toast.showWarning(`File "${file.name}" cannot be downloaded`);
          return;
        }
        triggerBlobDownload(blob, file.name || 'download');
        toast.showSuccess(`Downloading ${file.name}`);
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || `Failed to download ${file.name}`;
        toast.showError(msg);
      }
    } else {
      await openFileInNewTab(file);
    }
  };


  // Show toast when user selects file(s); avoid on clear
  useEffect(() => {
    const count = selectedFiles.size;
    if (count > 0 && count > prevSelectedCountRef.current) {
      toast.showInfo(`${count} item${count !== 1 ? 's' : ''} selected`);
    }
    prevSelectedCountRef.current = count;
  }, [selectedFiles, toast]);

  // File selection handlers
  const toggleFileSelection = (fileId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const DOUBLE_CLICK_MS = 400;
  const handleFileItemClick = (file: FileItem, e: React.MouseEvent) => {
    if (file.type === 'folder') {
      if (e.detail === 2 || e.ctrlKey || e.metaKey) {
        navigateToFolder(file.id, file.name, file.path);
      } else {
        toggleFileSelection(file.id);
      }
      return;
    }
    const now = Date.now();
    const last = lastFileClickRef.current;
    if (last && last.fileId === file.id && now - last.time < DOUBLE_CLICK_MS) {
      lastFileClickRef.current = null;
      handleOpenViewMode(file);
    } else {
      lastFileClickRef.current = { fileId: file.id, time: now };
      toggleFileSelection(file.id);
    }
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(filteredFiles.map(file => file.id)));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleDeleteFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to delete');
      return;
    }
    
    const fileCount = selectedFiles.size;
    const isTrashView = currentPath[0] === 'trash';
    const filesToMove = documents.filter(doc => selectedFiles.has(doc.id));

    // Not in trash: move to trash via API (soft delete; does not remove from Azure)
    if (!isTrashView) {
      const uuids = filesToMove.map(f => f.id).filter(Boolean);
      const useApi = uuids.length > 0 && uuids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (useApi) {
        if (!window.confirm(`Move ${fileCount} item(s) to trash?`)) return;
        try {
          const res = await documentAPI.moveToTrash(uuids);
          await loadDocuments();
          setSelectedFiles(new Set());
          toast.showSuccess(res?.message || `${fileCount} item(s) moved to trash`);
        } catch (err: any) {
          toast.showError(err?.message || 'Failed to move to trash');
        }
        return;
      }
      // API-sourced view (office or project) but ids are not UUIDs – do not remove from UI (would cause reappear bug)
      const isApiSourcedView = currentPath[0] === 'office' || (currentPath[0] === 'projects' && currentPath.length > 1);
      if (isApiSourcedView) {
        toast.showWarning('Selected items cannot be moved to trash from this view. Try again or use a different folder.');
        return;
      }
    }

    // Trash view or localStorage-only: move to trash (localStorage fallback)
    if (!window.confirm(`Are you sure you want to move ${fileCount} file(s) to trash?`)) return;
    const savedTrash = localStorage.getItem('documents_trash');
    let trashDocuments: FileItem[] = [];
    if (savedTrash) {
      try {
        trashDocuments = JSON.parse(savedTrash);
      } catch (e) {
        console.error('Error loading trash:', e);
      }
    }
    const currentFolderPath = getCurrentFolderPath();
    const filesForTrash = filesToMove.map(file => ({
      ...file,
      path: 'trash',
      originalPath: file.path || currentFolderPath,
      lastModified: 'Just now',
      deletedAt: new Date().toISOString()
    }));
    const trashToStore = [...trashDocuments, ...filesForTrash].map(doc => ({
      id: doc.id,
      name: doc.name,
      size: doc.size,
      lastModified: doc.lastModified,
      owner: doc.owner,
      type: doc.type,
      path: doc.path,
      originalPath: (doc as any).originalPath,
      deletedAt: (doc as any).deletedAt,
      fileData: (doc as any).fileData,
      mimeType: (doc as any).mimeType
    }));
    const saved = safeSetItem('documents_trash', JSON.stringify(trashToStore));
    if (saved) {
      setDocuments(prev => prev.filter(doc => !selectedFiles.has(doc.id)));
      setSelectedFiles(new Set());
      toast.showSuccess(`${fileCount} file(s) moved to trash`);
    } else {
      toast.showError('Failed to move files to trash. Storage may be full.');
    }
  };

  const handleUnshare = async () => {
    if (selectedFiles.size === 0 || currentPath[0] !== 'shared') return;
    const count = selectedFiles.size;
    if (!window.confirm(`Unshare ${count} item(s)?`)) return;
    try {
      for (const id of selectedFiles) {
        await documentAPI.unshareItem(id);
      }
      await loadDocuments();
      setSelectedFiles(new Set());
      toast.showSuccess(`${count} item(s) unshared`);
    } catch (err: any) {
      toast.showError(err?.message || 'Failed to unshare');
    }
  };

  const handleRestoreFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to restore');
      return;
    }
    
    const filesToRestore = documents.filter(doc => selectedFiles.has(doc.id));
    const fileCount = filesToRestore.length;
    const uuids = filesToRestore.map(f => f.id);
    const fromApi = currentPath[0] === 'trash' && uuids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    if (fromApi) {
      try {
        const res = await documentAPI.restore(uuids);
        await loadDocuments();
        setSelectedFiles(new Set());
        loadTrashCount();
        toast.showSuccess(res?.message || `${fileCount} item(s) restored`);
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to restore');
      }
      return;
    }

    let restoreSuccess = true;
    // Restore each file to its original location (localStorage)
    filesToRestore.forEach(file => {
      const originalPath = (file as any).originalPath || 'office';
      
      // Load documents from original location
      const savedDocuments = localStorage.getItem(`documents_${originalPath}`);
      let existingDocuments: FileItem[] = [];
      if (savedDocuments) {
        try {
          existingDocuments = JSON.parse(savedDocuments);
        } catch (e) {
          console.error('Error loading documents:', e);
        }
      }
      
      // Create restored file without trash metadata
      const restoredFile: FileItem = {
        ...file,
        path: originalPath,
        originalPath: undefined,
        deletedAt: undefined
      };
      
      // Add to original location
      const updatedDocuments = [...existingDocuments, restoredFile];
      const documentsToStore = updatedDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        lastModified: doc.lastModified,
        owner: doc.owner,
        type: doc.type,
        path: doc.path,
        originalPath: (doc as any).originalPath,
        deletedAt: (doc as any).deletedAt,
        fileData: (doc as any).fileData,
        mimeType: (doc as any).mimeType
      }));
      
      const saved = safeSetItem(`documents_${originalPath}`, JSON.stringify(documentsToStore));
      if (!saved) {
        restoreSuccess = false;
      }
    });
    
    if (!restoreSuccess) {
      toast.showError('Failed to restore some files. Storage may be full.');
      return;
    }
    
    // Remove from trash
    const savedTrash = localStorage.getItem('documents_trash');
    let trashDocuments: FileItem[] = [];
    if (savedTrash) {
      try {
        trashDocuments = JSON.parse(savedTrash);
      } catch (e) {
        console.error('Error loading trash:', e);
      }
    }
    
    const updatedTrash = trashDocuments.filter(doc => !selectedFiles.has(doc.id));
    const trashToStore = updatedTrash.map(doc => ({
      id: doc.id,
      name: doc.name,
      size: doc.size,
      lastModified: doc.lastModified,
      owner: doc.owner,
      type: doc.type,
      path: doc.path,
      originalPath: (doc as any).originalPath,
      deletedAt: (doc as any).deletedAt,
      fileData: (doc as any).fileData,
      mimeType: (doc as any).mimeType
    }));
    
    const trashSaved = safeSetItem('documents_trash', JSON.stringify(trashToStore));
    if (trashSaved) {
      // Update UI
      setDocuments(prev => prev.filter(doc => !selectedFiles.has(doc.id)));
      setSelectedFiles(new Set());
      toast.showSuccess(`${fileCount} file(s) restored successfully`);
    } else {
      toast.showError('Failed to update trash. Files may still appear in trash.');
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to delete permanently');
      return;
    }
    
    const fileCount = selectedFiles.size;
    const uuids = Array.from(selectedFiles);
    const fromApi = currentPath[0] === 'trash' && uuids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    if (fromApi && window.confirm(`Permanently delete ${fileCount} item(s)? This cannot be undone.`)) {
      try {
        const res = await documentAPI.permanentDelete(uuids);
        await loadDocuments();
        setSelectedFiles(new Set());
        loadTrashCount();
        toast.showSuccess(res?.message || `${fileCount} item(s) permanently deleted`);
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to permanently delete');
      }
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete ${fileCount} file(s)? This action cannot be undone.`)) {
      // Remove from trash (localStorage)
      const savedTrash = localStorage.getItem('documents_trash');
      let trashDocuments: FileItem[] = [];
      if (savedTrash) {
        try {
          trashDocuments = JSON.parse(savedTrash);
        } catch (e) {
          console.error('Error loading trash:', e);
        }
      }
      
      const updatedTrash = trashDocuments.filter(doc => !selectedFiles.has(doc.id));
      const trashToStore = updatedTrash.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        lastModified: doc.lastModified,
        owner: doc.owner,
        type: doc.type,
        path: doc.path,
        originalPath: (doc as any).originalPath,
        deletedAt: (doc as any).deletedAt,
        fileData: (doc as any).fileData,
        mimeType: (doc as any).mimeType
      }));
      
      const saved = safeSetItem('documents_trash', JSON.stringify(trashToStore));
      if (saved) {
        // Update UI
        setDocuments(prev => prev.filter(doc => !selectedFiles.has(doc.id)));
        setSelectedFiles(new Set());
        toast.showSuccess(`${fileCount} file(s) permanently deleted`);
      } else {
        toast.showError('Failed to permanently delete files. Storage may be full.');
      }
    }
  };

  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const isPdf = (file: FileItem) =>
    file.mimeType === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf');

  const hasDirectUrl = (file: FileItem) =>
    typeof file.fileData === 'string' && (file.fileData.startsWith('https') || file.fileData.startsWith('http'));

  /** Fetch file blob via API - uses POST /documents/download. Sends both uuid and path so backend can use whichever it expects. */
  const fetchFileBlob = async (file: FileItem): Promise<Blob> => {
    if (!file.path && !isUuid(file.id)) {
      throw new Error(`File "${file.name}" cannot be downloaded (no path or ID)`);
    }
    return documentAPI.downloadDocument(
      file.path || file.id,
      file.name,
      isUuid(file.id) ? file.id : undefined
    );
  };

  const sanitizeDownloadFilename = (name: string): string => {
    if (!name || !name.trim()) return 'download';
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'download';
  };

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeDownloadFilename(fileName);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleDownloadFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to download');
      return;
    }

    const filesToDownload = documents.filter(doc => selectedFiles.has(doc.id)).filter(doc => doc.type !== 'folder');
    if (filesToDownload.length === 0) {
      toast.showWarning('Select files to download (folders are skipped)');
      return;
    }

    let successCount = 0;
    for (const file of filesToDownload) {
      try {
        if (isPdf(file)) {
          if (hasDirectUrl(file)) {
            window.open(file.fileData as string, '_blank', 'noopener,noreferrer');
            successCount += 1;
          } else if (file.path || isUuid(file.id)) {
            const blob = await fetchFileBlob(file);
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            successCount += 1;
          } else {
            toast.showWarning(`File "${file.name}" cannot be opened (no URL or path)`);
          }
          continue;
        }

        let blob: Blob;
        if (file.file) {
          blob = file.file;
        } else if (file.path || isUuid(file.id)) {
          blob = await fetchFileBlob(file);
        } else if (file.fileData && file.mimeType && typeof file.fileData === 'string' && file.fileData.startsWith('data:')) {
          blob = base64ToBlob(file.fileData, file.mimeType);
        } else if (hasDirectUrl(file)) {
          const res = await fetch(file.fileData as string);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blob = await res.blob();
        } else if (file.fileData && file.mimeType && typeof file.fileData === 'string' && !file.fileData.startsWith('http')) {
          blob = base64ToBlob(file.fileData, file.mimeType);
        } else {
          toast.showWarning(`File "${file.name}" data not found`);
          continue;
        }

        triggerBlobDownload(blob, file.name || 'download');
        successCount += 1;
      } catch (error: any) {
        console.error(`Error downloading file ${file.name}:`, error);
        toast.showError(error?.message || `Failed to download ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.showSuccess(successCount === filesToDownload.length
        ? `${successCount} file(s) download started`
        : `${successCount} of ${filesToDownload.length} file(s) download started`);
    }
  };

  const handleShareFiles = () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to share');
      return;
    }
    setShowShareModal(true);
  };

  const handleShareSubmit = async () => {
    const filesToShare = documents.filter(doc => selectedFiles.has(doc.id));
    
    if (shareMode === 'team') {
      if (selectedTeamMembers.size === 0) {
        toast.showError('Please select at least one team member');
        return;
      }
      const section = currentPath[0] || 'office';
      let projectId: number | undefined;
      if (section === 'project' && currentPath[1]) {
        const projectIdStr = currentPath[1].replace('project_', '');
        const project = projects.find(p => p.id === projectIdStr || String(p.id) === projectIdStr);
        projectId = project?.numericId ?? (typeof project?.id === 'number' ? project.id : parseInt(projectIdStr, 10));
      }
      const items = filesToShare.map(f => ({
        type: (f.type === 'folder' ? 'folder' : 'document') as 'folder' | 'document',
        uuid: f.id,
        name: f.name,
        section,
        path: f.path,
        projectId: projectId != null ? String(projectId) : undefined,
      }));
      const shared_with = Array.from(selectedTeamMembers).map(Number);
      try {
        const res = await documentAPI.shareItems({ items, shared_with });
        if (res?.status) {
          toast.showSuccess(`Shared ${filesToShare.length} item(s) with ${shared_with.length} team member(s)`);
          setShowShareModal(false);
          setSelectedTeamMembers(new Set());
          setTeamMemberSearch('');
          setIsSearchFocused(false);
          setSelectedFiles(new Set());
          await loadDocuments();
        } else {
          toast.showError(res?.message || 'Share failed');
        }
      } catch (err: any) {
        toast.showError(err?.message || 'Failed to share');
      }
      return;
    }
    // Handle link sharing (no backend call)
    const shareLink = `${window.location.origin}/share/${Date.now()}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      toast.showSuccess('Share link copied to clipboard!');
    });
    setShowShareModal(false);
    setSelectedTeamMembers(new Set());
    setTeamMemberSearch('');
    setIsSearchFocused(false);
  };

  // Team members from API (GET /api/documents/team-members); filtered for search
  const filteredTeamMembers = teamMembersList.filter(member =>
    member.name.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(teamMemberSearch.toLowerCase())
  ).map(m => ({ ...m, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff` }));

  const toggleTeamMember = (memberId: string) => {
    setSelectedTeamMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
        // Hide the list when a member is selected
        setIsSearchFocused(false);
      }
      return newSet;
    });
  };

  // Load team members when Share modal opens (GET /api/documents/team-members)
  useEffect(() => {
    if (!showShareModal) return;
    setTeamMembersLoading(true);
    setTeamMembersError(null);
    documentAPI.getTeamMembers()
      .then((res: any) => {
        if (res?.status && Array.isArray(res?.data)) {
          setTeamMembersList(res.data.map((u: any) => ({
            id: String(u.id),
            name: u.name || '',
            email: u.email || '',
            role: u.role,
          })));
        } else {
          setTeamMembersList([]);
        }
      })
      .catch((err: any) => {
        setTeamMembersError(err?.message || 'Failed to load team members');
        setTeamMembersList([]);
      })
      .finally(() => setTeamMembersLoading(false));
  }, [showShareModal]);

  // Auto-expand folders in current path
  useEffect(() => {
    if (currentPath.length > 1) {
      const newExpanded = new Set(expandedFolders);
      // Expand all parent folders in the path
      for (let i = 1; i < currentPath.length; i++) {
        const pathSegment = currentPath[i];
        newExpanded.add(pathSegment);
      }
      setExpandedFolders(newExpanded);
    }
  }, [currentPath]);

  // Recursive component to render folder tree
  const renderFolderTree = (nodes: FolderTreeNode[], basePath: string, level: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.id);
      const isSelected = currentPath.includes(node.id);
      const hasChildren = node.children.length > 0;
      const pathSegments = node.path.split('/');
      const isInCurrentPath = currentPath.some((seg, idx) => {
        const currentPathSegments = currentPath.slice(0, idx + 1);
        return currentPathSegments.join('/') === node.path;
      });

      return (
        <div key={node.id} className={level > 0 ? 'ml-3 sm:ml-4' : ''}>
          <button
            onClick={() => {
              if (hasChildren) {
                toggleFolder(node.id);
              }
              // Navigate to this folder
              const pathArray = node.path.split('/');
              setCurrentPath(pathArray);
              setSelectedFolder(pathArray[0]);
              // Close sidebar on mobile after selection
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isSelected && !hasChildren
                ? 'bg-[#C2D642] text-white'
                : isInCurrentPath
                  ? isDark
                    ? 'bg-[#C2D642]/20 text-[#C2D642]'
                    : 'bg-[#C2D642]/10 text-[#C2D642]'
                  : isDark
                    ? 'hover:bg-[#C2D642]/20 text-[#C2D642]'
                    : 'hover:bg-[#C2D642]/10 text-[#C2D642]'
            }`}
          >
            {hasChildren ? (
              <span className="w-4 flex items-center justify-center flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            ) : (
              <span className="w-4 flex items-center justify-center flex-shrink-0" />
            )}
            <Folder className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left truncate" title={node.name}>{node.name}</span>
          </button>
          {hasChildren && isExpanded && (
            <div className="mt-1">
              {renderFolderTree(node.children, basePath, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A to select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        selectAllFiles();
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
      // Delete key to delete selected files
      if (e.key === 'Delete' && selectedFiles.size > 0) {
        handleDeleteFiles();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles, filteredFiles]);

  return (
    <div className={`flex flex-col md:flex-row h-[calc(100vh-3.5rem-2rem)] sm:h-[calc(100vh-4rem-2rem)] md:h-[calc(100vh-3.5rem-2rem)] ${bgPrimary} rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-[101] md:z-auto w-full sm:w-72 md:w-56 border-r ${isDark ? 'bg-[#0a0a0a] border-slate-700' : 'bg-white border-slate-200'} flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-inherit bg-inherit flex-shrink-0">
          <h3 className={`text-sm font-black ${textPrimary}`}>Folders</h3>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-700/50 active:bg-slate-700' : 'hover:bg-slate-100 active:bg-slate-200'}`}
            aria-label="Close sidebar"
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 custom-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedFolders.has(item.id);
            const isSelected = currentPath[0] === item.id || (selectedFolder === item.id && currentPath.length === 1);
            const hasSubItems = item.subItems.length > 0;
            // Laravel: Office and Shared are single menu items (no dropdown/tree). Only Projects has expandable tree.
            const folderTree = (item.id === 'office' || item.id === 'shared') ? [] : getFolderTreeForPath(item.id);
            const hasFolderTree = folderTree.length > 0;
            const shouldShowChevron = hasSubItems || hasFolderTree;

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    const isExpandingProjects = item.id === 'projects' && !isExpanded;
                    if (shouldShowChevron) {
                      toggleFolder(item.id);
                    }
                    // Call project-list API only once: when first expanding Project menu (not on collapse, not on re-expand)
                    if (item.id === 'projects' && isExpandingProjects && projects.length === 0 && !projectsLoading) {
                      loadProjects();
                    }
                    setCurrentPath([item.id]);
                    setSelectedFolder(item.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                    item.id === 'projects' || item.id === 'office'
                      ? (isDark ? 'text-[#C2D642] hover:bg-[#C2D642]/20' : 'text-[#C2D642] hover:bg-[#C2D642]/10')
                        + ' hover:scale-[1.02] hover:translate-x-0.5 origin-left'
                      : isSelected && !shouldShowChevron
                        ? 'bg-[#C2D642] text-white'
                        : isSelected
                          ? isDark
                            ? 'bg-[#C2D642]/20 text-white'
                            : 'bg-[#C2D642]/10 text-[#C2D642]'
                          : isDark
                            ? 'hover:bg-[#C2D642]/20 text-[#C2D642]'
                            : 'hover:bg-[#C2D642]/10 text-[#C2D642]'
                  }`}
                >
                  {shouldShowChevron && (
                    <span className="w-4 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  {!shouldShowChevron && <span className="w-4" />}
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'trash' && trashCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold bg-[#C2D642] text-white">
                      {trashCount > 99 ? '99+' : trashCount}
                    </span>
                  )}
                </button>

                {/* Sub Items - Projects (DMS Step 1: GET /api/project-list) */}
                {hasSubItems && isExpanded && item.id === 'projects' && (
                  <div className="ml-3 sm:ml-4 mt-1 space-y-1">
                    {projectsLoading && (
                      <div className={`px-2 sm:px-3 py-2 text-xs sm:text-sm ${textSecondary}`}>
                        Loading projects...
                      </div>
                    )}
                    {!projectsLoading && projectsError && (
                      <div className={`px-2 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        <p className="mb-1">{projectsError}</p>
                        <button type="button" onClick={() => loadProjects()} className="underline font-medium hover:no-underline">Retry</button>
                      </div>
                    )}
                    {!projectsLoading && !projectsError && item.subItems.map((subItem) => {
                      const isSubSelected = currentPath[0] === subItem.id;
                      const projectFolderTree = getFolderTreeForPath(subItem.id);
                      const isProjectExpanded = expandedFolders.has(subItem.id);
                      
                      return (
                        <div key={subItem.id}>
                          <button
                            onClick={() => {
                              toggleFolder(subItem.id);
                              setCurrentPath(['projects', subItem.id]);
                              setSelectedFolder(subItem.id);
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 origin-left ${
                              isDark ? 'text-[#C2D642] hover:bg-[#C2D642]/20' : 'text-[#C2D642] hover:bg-[#C2D642]/10'
                            } hover:scale-[1.02] hover:translate-x-0.5`}
                            title={subItem.blobStorageConnected === false ? (subItem.blobError || 'Azure path not configured') : subItem.blobStorageConnected ? 'Azure path configured' : 'Checking...'}
                          >
                            {projectFolderTree.length > 0 && (
                              <span className="w-4 flex items-center justify-center flex-shrink-0">
                                {isProjectExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                            )}
                            {projectFolderTree.length === 0 && <span className="w-4" />}
                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left truncate" title={subItem.label}>{subItem.label}</span>
                            {/* Blob storage connection indicator */}
                            {subItem.blobStorageConnected === true && (
                              <span title={`Blob storage connected (${subItem.blobItemCount || 0} items)`}>
                                <Cloud className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                              </span>
                            )}
                            {subItem.blobStorageConnected === false && (
                              <span title="Blob storage not connected">
                                <CloudOff className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                              </span>
                            )}
                          </button>
                          {isProjectExpanded && projectFolderTree.length > 0 && (
                            <div className="ml-3 sm:ml-4 mt-1">
                              {renderFolderTree(projectFolderTree, subItem.id, 1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Header - aligned with masters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 md:px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5'}`}>
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#C2D642]" />
            </div>
            <div className="min-w-0">
              <h1 className={`text-lg sm:text-xl font-black tracking-tight truncate ${textPrimary}`}>Document Management</h1>
              <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>
                Manage and organize your files
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className={`px-3 md:px-4 pb-2 flex-shrink-0`}>
          <div className={`p-2 sm:p-3 rounded-xl border ${cardClass} flex flex-wrap items-center justify-between gap-2`}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
            >
              <Menu className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-[#C2D642] text-white'
                  : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                viewMode === 'list'
                  ? 'bg-[#C2D642] text-white'
                  : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleRefresh}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textSecondary}`} />
            </button>
            {(currentPath[0] === 'office' || (currentPath[0] === 'projects' && currentPath.length > 1)) && (
              <div className="relative new-dropdown">
                <button
                  onClick={() => setShowNewDropdown(!showNewDropdown)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all bg-[#C2D642] hover:bg-[#A8B838] text-white shadow-md border-2 border-[#A8B838]`}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">New</span>
                </button>
                {showNewDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-44 sm:w-48 rounded-lg border shadow-lg z-20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowCreateFolderModal(true);
                          setShowNewDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${
                          isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        Create Folder
                      </button>
                      {((currentPath[0] as string) !== 'shared') && (
                        <button
                          onClick={handleUploadFiles}
                          className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-colors text-left ${
                            isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          Upload Files
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
            <button
              onClick={() => {
                let pid: string | undefined;
                if (currentPath[0] === 'projects' && currentPath.length >= 2 && currentPath[1]?.startsWith('project_')) {
                  const idStr = currentPath[1].replace('project_', '');
                  pid = projects.find(p => String(p.id) === idStr)?.id;
                }
                router.push(pid ? `/document-management/dms-agent?project_id=${encodeURIComponent(pid)}` : '/document-management/dms-agent');
              }}
              className={`p-1.5 sm:p-2 rounded-lg border border-[#C2D642]/60 transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-700 text-[#C2D642]' : 'hover:bg-slate-100 text-[#C2D642]'}`}
              title="AI Assistant"
            >
              <BotMessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className={`px-3 md:px-4 py-2 flex-shrink-0 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {currentPath.map((pathSegment, index) => {
              const isLast = index === currentPath.length - 1;
              let segmentLabel = '';
              if (index === 0) {
                if (pathSegment.startsWith('project_')) {
                  const projectId = pathSegment.replace('project_', '');
                  const project = projects.find(p => p.id === projectId);
                  segmentLabel = project?.name || pathSegment;
                } else {
                  const sidebarItem = sidebarItems.find(item => item.id === pathSegment);
                  segmentLabel = sidebarItem?.label || pathSegment;
                }
              } else {
                // Project segment (e.g. project_123): always resolve from projects so we show "TowerD" not "project"
                if (pathSegment.startsWith('project_')) {
                  const projectId = pathSegment.replace('project_', '');
                  const project = projects.find(p => p.id === projectId || String(p.id) === projectId);
                  segmentLabel = project?.name || pathSegment;
                } else {
                  // Prefer stored folder name (from API or navigateToFolder); never show raw UUID/path
                  segmentLabel = folderDisplayNames[pathSegment];
                  if (!segmentLabel) {
                    const parts = pathSegment.split('/');
                    const lastPart = parts[parts.length - 1];
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart);
                    segmentLabel = isUuid ? 'Folder' : lastPart;
                  }
                }
              }

              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className={`w-3 h-3 sm:w-4 sm:h-4 ${textSecondary}`} />
                  )}
                  <button
                    onClick={() => !isLast && navigateToPath(index)}
                    className={`text-xs sm:text-sm font-bold transition-colors ${
                      isLast
                        ? `${textPrimary} cursor-default`
                        : `${textSecondary} hover:text-[#C2D642] cursor-pointer`
                    }`}
                    disabled={isLast}
                  >
                    {segmentLabel}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-8 sm:pb-10 md:pb-6 custom-scrollbar">
          {/* Image Gallery Filters */}
          {currentPath[0] === 'image-gallery' && (
            <div className={`mb-6 p-4 sm:p-6 rounded-xl border ${cardClass}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                {/* Search by Name */}
                <div className="flex-1 w-full sm:w-auto">
                  <label className={`block text-xs font-black uppercase mb-2 ${textSecondary}`}>
                    SEARCH BY NAME
                  </label>
                  <input
                    type="text"
                    value={imageSearchName}
                    onChange={(e) => setImageSearchName(e.target.value)}
                    placeholder="Enter image name..."
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} focus:outline-none focus:ring-2 focus:ring-[#C2D642] focus:border-transparent`}
                  />
                </div>

                {/* Project Filter */}
                <div className="relative flex-1 w-full sm:w-auto">
                  <label className={`block text-xs font-black uppercase mb-2 ${textSecondary}`}>
                    PROJECT
                  </label>
                  <button
                    onClick={() => {
                      setShowProjectDropdown(!showProjectDropdown);
                    }}
                    className={`w-full px-4 py-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} hover:border-[#C2D642] transition-colors`}
                  >
                    <span className="text-sm font-bold">
                      {selectedProjectFilter === 'all' 
                        ? 'All Projects' 
                        : projects.find(p => `project_${p.id}` === selectedProjectFilter)?.name || 'All Projects'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showProjectDropdown && (
                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg z-30 max-h-60 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <button
                        onClick={() => {
                          setSelectedProjectFilter('all');
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors ${
                          selectedProjectFilter === 'all'
                            ? isDark ? 'bg-[#C2D642] text-white' : 'bg-[#C2D642]/10 text-[#C2D642]'
                            : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        All Projects
                      </button>
                      {projects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setSelectedProjectFilter(`project_${project.id}`);
                            setShowProjectDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors ${
                            selectedProjectFilter === `project_${project.id}`
                              ? isDark ? 'bg-[#C2D642] text-white' : 'bg-[#C2D642]/10 text-[#C2D642]'
                              : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          {project.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Results Count & Pagination Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className={`text-sm font-bold ${textSecondary}`}>
                  Showing {galleryStart} - {galleryEnd} of {filteredFiles.length} image{filteredFiles.length !== 1 ? 's' : ''}
                </div>
                {galleryTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGalleryPage(p => Math.max(1, p - 1))}
                      disabled={galleryPage <= 1}
                      className={`p-2 rounded-lg transition-colors ${galleryPage <= 1 ? 'opacity-50 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1 text-xs font-bold ${textSecondary}`}>
                      Page {galleryPage} of {galleryTotalPages}
                    </span>
                    <button
                      onClick={() => setGalleryPage(p => Math.min(galleryTotalPages, p + 1))}
                      disabled={galleryPage >= galleryTotalPages}
                      className={`p-2 rounded-lg transition-colors ${galleryPage >= galleryTotalPages ? 'opacity-50 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Directory */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                {getCurrentFolderLabel()}
              </span>
            </div>
          </div>

          {/* DMS Step 2: Loading / Error for GET /api/documents (Office content) */}
          {currentPath[0] !== 'image-gallery' && documentsLoading && (
            <div className={`flex flex-col items-center justify-center py-12 sm:py-16 rounded-xl border ${cardClass}`}>
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4 border-2 ${isDark ? 'border-[#C2D642]/50' : 'border-[#C2D642]/40'}`}>
                <RefreshCw className={`w-10 h-10 sm:w-12 sm:h-12 animate-spin ${textSecondary}`} />
              </div>
              <p className={`text-sm font-bold ${textSecondary}`}>Loading folders and files...</p>
            </div>
          )}
          {currentPath[0] !== 'image-gallery' && !documentsLoading && documentsError && (
            <div className={`flex flex-col items-center justify-center py-12 sm:py-16 rounded-xl border ${cardClass}`}>
              <p className={`text-sm font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{documentsError}</p>
              <button type="button" onClick={() => loadDocuments()} className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#A8B838] text-white">Retry</button>
            </div>
          )}

          {/* Files List (when not loading and no error, or image-gallery) */}
          {(currentPath[0] === 'image-gallery' || (!documentsLoading && !documentsError)) && (
          <>
          {viewMode === 'list' ? (
            <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 w-12`} />
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden sm:table-cell`}>Size</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden md:table-cell`}>Last Modified</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden lg:table-cell`}>Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {(currentPath[0] === 'image-gallery' ? paginatedGalleryFiles : filteredFiles).map((file) => {
                      const isSelected = selectedFiles.has(file.id);
                      return (
                        <tr
                          key={file.id}
                          onClick={(e) => handleFileItemClick(file, e)}
                          className={`${isSelected ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-100') : ''} ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`}
                        >
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4`} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => toggleFileSelection(file.id, e)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-[#C2D642] border-[#C2D642]'
                                  : isDark
                                    ? 'border-slate-600 hover:border-[#C2D642]'
                                    : 'border-slate-300 hover:border-[#C2D642]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          </td>
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                              {file.type === 'folder' ? (
                                <Folder className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
                              ) : currentPath[0] === 'image-gallery' && file.fileData && typeof file.fileData === 'string' && (file.fileData.startsWith('http') || file.fileData.startsWith('data:')) && (file.mimeType?.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)) ? (
                                <img src={file.fileData} alt={file.name} className="w-full h-full object-contain" loading="lazy" />
                              ) : (
                                <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs sm:text-sm font-bold ${textPrimary} block truncate`} title={file.name}>{file.name}</span>
                              <span className={`text-[10px] sm:text-xs font-bold ${textSecondary} sm:hidden`}>{file.size}</span>
                            </div>
                          </td>
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textSecondary} hidden sm:table-cell`}>{file.size}</td>
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textSecondary} hidden md:table-cell`}>{file.lastModified}</td>
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold ${textSecondary} hidden lg:table-cell`}>{file.owner}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {(currentPath[0] === 'image-gallery' ? paginatedGalleryFiles : filteredFiles).map((file) => {
                const isSelected = selectedFiles.has(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={(e) => handleFileItemClick(file, e)}
                    className={`p-2 sm:p-3 md:p-4 rounded-lg border cursor-pointer transition-all relative ${
                      isSelected
                        ? isDark
                          ? 'border-indigo-500 bg-indigo-500/20'
                          : 'border-indigo-500 bg-indigo-100'
                        : isDark
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                    } hover:shadow-md`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C2D642] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`w-full h-16 sm:h-20 md:h-24 rounded-lg flex items-center justify-center mb-2 sm:mb-3 overflow-hidden ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                      {file.type === 'folder' ? (
                        <Folder className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
                      ) : currentPath[0] === 'image-gallery' && file.fileData && typeof file.fileData === 'string' && (file.fileData.startsWith('http') || file.fileData.startsWith('data:')) && (file.mimeType?.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)) ? (
                        <img src={file.fileData} alt={file.name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <FileText className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-bold ${textPrimary} truncate mb-1`} title={file.name}>{file.name}</p>
                    <p className={`text-[10px] sm:text-xs font-bold ${textSecondary}`}>{file.size}</p>
                    {currentPath[0] === 'image-gallery' && (
                      <>
                        <p className={`text-[10px] sm:text-xs font-bold ${textSecondary} truncate`} title={file.lastModified}>{file.lastModified}</p>
                        <p className={`text-[10px] sm:text-xs font-bold ${textSecondary} truncate`} title={file.owner}>{file.owner}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Image Gallery Pagination (below grid/list) */}
          {currentPath[0] === 'image-gallery' && galleryTotalPages > 1 && filteredFiles.length > 0 && (
            <div className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border ${cardClass}`}>
              <div className={`text-sm font-bold ${textSecondary}`}>
                Showing {galleryStart} - {galleryEnd} of {filteredFiles.length} image{filteredFiles.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGalleryPage(p => Math.max(1, p - 1))}
                  disabled={galleryPage <= 1}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    galleryPage <= 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, galleryTotalPages) }, (_, i) => {
                    const total = Math.min(5, galleryTotalPages);
                    let pageNum: number;
                    if (galleryTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (galleryPage <= 3) {
                      pageNum = i + 1;
                    } else if (galleryPage >= galleryTotalPages - 2) {
                      pageNum = galleryTotalPages - total + i + 1;
                    } else {
                      pageNum = galleryPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setGalleryPage(pageNum)}
                        className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${
                          galleryPage === pageNum
                            ? 'bg-[#C2D642] text-white'
                            : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setGalleryPage(p => Math.min(galleryTotalPages, p + 1))}
                  disabled={galleryPage >= galleryTotalPages}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    galleryPage >= galleryTotalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {filteredFiles.length === 0 && (
            currentPath[0] === 'trash' ? (
              <div className={`p-6 sm:p-8 rounded-lg text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <p className="text-sm font-bold">Trash is empty</p>
              </div>
            ) : (
            <div
              ref={dropZoneRef}
              onDragEnter={currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? handleDragEnter : undefined}
              onDragOver={currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? handleDragOver : undefined}
              onDragLeave={currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? handleDragLeave : undefined}
              onDrop={currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? handleDrop : undefined}
              className={`p-6 sm:p-8 md:p-12 rounded-lg border-2 border-dashed text-center transition-all ${
                currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? 'cursor-pointer' : 'cursor-default'
              } ${
                isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery'
                  ? isDark
                    ? 'border-[#C2D642] bg-[#C2D642]/10'
                    : 'border-[#C2D642] bg-[#C2D642]/10'
                  : isDark
                    ? 'border-slate-700 bg-slate-800 hover:border-[#C2D642]/50'
                    : 'border-slate-200 bg-white hover:border-[#C2D642]/30'
              }`}
              onClick={() => {
                if (!isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery') {
                  uploadFileInputRef.current?.click();
                }
              }}
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${
                isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery'
                  ? isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
                  : isDark ? 'bg-slate-700/50' : 'bg-slate-100'
              }`}>
                {isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? (
                  <Upload className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? 'text-[#C2D642]' : 'text-[#C2D642]'}`} />
                ) : (
                  <Folder className={`w-8 h-8 sm:w-10 sm:h-10 ${textSecondary} opacity-50`} />
                )}
              </div>
              <h3 className={`text-base sm:text-lg font-black mb-2 ${textPrimary}`}>
                {isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? 'Drop files here' : searchQuery ? 'No files found' : currentPath[0] === 'image-gallery' ? 'No images found' : 'No files or folders'}
              </h3>
              <p className={`text-xs sm:text-sm ${textSecondary} mb-3 sm:mb-4`}>
                {isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery'
                  ? 'Release to upload files'
                  : searchQuery
                    ? 'Try a different search term'
                    : currentPath[0] === 'shared'
                      ? 'This folder is read-only. Upload files to other folders.'
                      : currentPath[0] === 'image-gallery'
                        ? 'Images uploaded in any folder will appear here automatically.'
                        : 'Drag and drop files here or click "New" to get started'}
              </p>
              {!searchQuery && !isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    uploadFileInputRef.current?.click();
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isDark
                      ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white'
                      : 'bg-[#C2D642] hover:bg-[#A8B838] text-white'
                  } shadow-md`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
              )}
            </div>
            )
          )}
          </>
          )}
        </div>
      </div>

      {/* View File Modal */}
      {viewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4" onClick={() => { setViewFile(null); setViewFileExcelData(null); setViewFileActiveSheet(''); }}>
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-xl border overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0 border-inherit">
              <h3 className={`text-sm sm:text-base font-bold truncate flex-1 min-w-0 ${textPrimary}`} title={viewFile.name}>{viewFile.name}</h3>
              <button
                onClick={() => { setViewFile(null); setViewFileExcelData(null); setViewFileActiveSheet(''); }}
                className={`ml-2 p-1.5 rounded-lg flex-shrink-0 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[200px]">
              {viewFileLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C2D642] border-t-transparent" />
                  <p className={`text-sm font-bold ${textSecondary}`}>Loading spreadsheet...</p>
                </div>
              ) : viewFileExcelData ? (
                <div className="w-full overflow-auto">
                  {viewFileExcelData.sheetNames.length > 1 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {viewFileExcelData.sheetNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => setViewFileActiveSheet(name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewFileActiveSheet === name ? (isDark ? 'bg-[#C2D642] text-slate-900' : 'bg-[#C2D642] text-slate-900') : (isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-800 hover:bg-slate-200')}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto border rounded-lg border-inherit">
                    <table className={`min-w-full text-xs sm:text-sm border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      <tbody>
                        {(viewFileExcelData.sheets[viewFileActiveSheet || viewFileExcelData.sheetNames[0]] || []).map((row, ri) => (
                          <tr key={ri} className={isDark ? 'border-b border-slate-700' : 'border-b border-slate-200'}>
                            {row.map((cell, ci) => (
                              <td key={ci} className={`px-2 py-1.5 font-normal ${ri === 0 ? (isDark ? 'bg-slate-700/50 font-bold' : 'bg-slate-100 font-bold') : ''}`}>
                                {String(cell ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : viewFile.fileData && isViewableImage(viewFile) ? (
                <img src={viewFile.fileData} alt={viewFile.name} className="max-w-full max-h-[70vh] w-auto h-auto object-contain" />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowShareModal(false)}>
          <div className={`w-full max-w-lg rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-inherit">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
                  <Folder className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>
                <h3 className={`text-lg sm:text-xl font-black ${textPrimary}`}>Share Items</h3>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedTeamMembers(new Set());
                  setTeamMemberSearch('');
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-[#C2D642]/20 hover:bg-[#C2D642]/30' : 'bg-[#C2D642]/10 hover:bg-[#C2D642]/20'}`}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-[#C2D642]' : 'text-[#A8B838]'}`} />
              </button>
            </div>

            {/* Share Count */}
            <div className="px-4 sm:px-6 pt-4">
              <p className={`text-sm font-bold ${textSecondary}`}>
                Share {selectedFiles.size} selected item(s)
              </p>
            </div>

            {/* Share Mode Tabs */}
            <div className="px-4 sm:px-6 pt-4 flex items-center gap-4 border-b border-inherit">
              <button
                onClick={() => setShareMode('team')}
                className={`flex items-center gap-2 pb-4 transition-colors ${
                  shareMode === 'team'
                    ? `${isDark ? 'text-blue-400' : 'text-blue-600'} border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`
                    : textSecondary
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-bold">Share with Team</span>
              </button>
              <button
                onClick={() => setShareMode('link')}
                className={`flex items-center gap-2 pb-4 transition-colors ${
                  shareMode === 'link'
                    ? `${isDark ? 'text-blue-400' : 'text-blue-600'} border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`
                    : textSecondary
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-bold">Get Link</span>
              </button>
            </div>

            {/* Share Content */}
            <div className="p-4 sm:p-6">
              {shareMode === 'team' ? (
                <div className="space-y-4">
                  <h4 className={`text-sm font-bold ${textPrimary}`}>Select Team Members</h4>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                    <input
                      type="text"
                      value={teamMemberSearch}
                      onChange={(e) => setTeamMemberSearch(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={(e) => {
                        // Check if the blur is happening because user clicked on a list item
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (!relatedTarget || !relatedTarget.closest('.team-members-list')) {
                          // Delay to allow click events on list items
                          setTimeout(() => setIsSearchFocused(false), 300);
                        }
                      }}
                      onClick={() => setIsSearchFocused(true)}
                      placeholder="Search team members..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    />
                  </div>
                  
                  {/* Selected Members Tags */}
                  {selectedTeamMembers.size > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {Array.from(selectedTeamMembers).map((memberId) => {
                        const member = teamMembersList.find(m => m.id === memberId);
                        if (!member) return null;
                        return (
                          <div
                            key={memberId}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-[#C2D642]/20 border border-[#C2D642]/30' : 'bg-[#C2D642]/10 border border-[#C2D642]/20'}`}
                          >
                            <span className={`text-xs font-bold ${isDark ? 'text-[#C2D642]' : 'text-[#A8B838]'}`}>
                              {member.name}
                            </span>
                            <button
                              onClick={() => toggleTeamMember(memberId)}
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-[#C2D642]/30' : 'hover:bg-[#C2D642]/20'}`}
                            >
                              <X className={`w-3 h-3 ${isDark ? 'text-[#C2D642]' : 'text-[#A8B838]'}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Team Members List - Only show when search is clicked/focused */}
                  {teamMembersError && (
                    <p className={`text-sm font-bold text-red-500 py-2`}>{teamMembersError}</p>
                  )}
                  {isSearchFocused && (
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 team-members-list">
                      {teamMembersLoading ? (
                        <p className={`text-sm font-bold ${textSecondary} text-center py-4`}>Loading team members...</p>
                      ) : filteredTeamMembers.length > 0 ? (
                        filteredTeamMembers.map((member) => {
                          const isSelected = selectedTeamMembers.has(member.id);
                          return (
                            <button
                              key={member.id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur
                                toggleTeamMember(member.id);
                              }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                isSelected
                                  ? isDark
                                    ? 'bg-blue-500/20 border-2 border-blue-500'
                                    : 'bg-blue-50 border-2 border-blue-500'
                                  : isDark
                                    ? 'hover:bg-slate-700 border-2 border-transparent'
                                    : 'hover:bg-slate-50 border-2 border-transparent'
                              }`}
                            >
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1 text-left">
                                <p className={`text-sm font-bold ${textPrimary}`}>{member.name}</p>
                                <p className={`text-xs font-bold ${textSecondary}`}>{member.email}</p>
                              </div>
                              {isSelected && (
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}>
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <p className={`text-sm font-bold ${textSecondary} text-center py-4`}>
                          No team members found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className={`text-sm font-bold ${textPrimary}`}>Generate Shareable Link</h4>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-bold ${textSecondary} mb-2`}>
                      Anyone with this link can access the selected files
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                        <p className={`text-xs font-bold ${textSecondary} truncate`}>
                          {window.location.origin}/share/{Date.now()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const shareLink = `${window.location.origin}/share/${Date.now()}`;
                          navigator.clipboard.writeText(shareLink).then(() => {
                            toast.showSuccess('Link copied to clipboard!');
                          });
                        }}
                        className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
                        title="Copy to clipboard"
                      >
                        <Copy className={`w-4 h-4 ${textSecondary}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedTeamMembers(new Set());
                  setTeamMemberSearch('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleShareSubmit}
                disabled={shareMode === 'team' && selectedTeamMembers.size === 0}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  shareMode === 'team' && selectedTeamMembers.size === 0
                    ? isDark
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#C2D642] to-[#A8B838] hover:from-[#A8B838] hover:to-[#8B9A38] text-white shadow-lg'
                }`}
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename (duplicate name) Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>
                {renameModalMode === 'file' ? 'File name already exists' : 'Folder name already exists'}
              </h3>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameUploadQueue([]);
                  setPendingUploadQueue([]);
                  setRenameModalError(null);
                }}
                className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <X className={`w-4 h-4 sm:w-5 sm:h-5 ${textSecondary}`} />
              </button>
            </div>
            <p className={`text-xs sm:text-sm mb-3 ${textSecondary}`}>
              {renameModalMode === 'file'
                ? 'A file with this name already exists in this folder. Please enter a new name.'
                : 'A folder with this name already exists in this folder. Please enter a new name.'}
            </p>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block text-xs sm:text-sm font-bold mb-2 ${textPrimary}`}>
                  {renameModalMode === 'file' ? 'File name' : 'Folder name'}
                </label>
                <input
                  type="text"
                  value={renameModalValue}
                  onChange={(e) => {
                    setRenameModalValue(e.target.value);
                    setRenameModalError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameModalSubmit();
                  }}
                  placeholder={renameModalMode === 'file' ? 'Enter new file name...' : 'Enter new folder name...'}
                  className={`w-full px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  autoFocus
                />
                {renameModalError && (
                  <p className="mt-1 text-xs font-bold text-red-500">{renameModalError}</p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameUploadQueue([]);
                    setPendingUploadQueue([]);
                    setRenameModalError(null);
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameModalSubmit}
                  disabled={!renameModalValue.trim()}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                    renameModalValue.trim()
                      ? isDark ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white' : 'bg-[#C2D642] hover:bg-[#A8B838] text-white'
                      : isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {renameModalMode === 'file' ? 'Upload with this name' : 'Create with this name'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className={`text-base sm:text-lg font-black ${textPrimary}`}>Create New Folder</h3>
              <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                }}
                className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <X className={`w-4 h-4 sm:w-5 sm:h-5 ${textSecondary}`} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block text-xs sm:text-sm font-bold mb-2 ${textPrimary}`}>
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                  placeholder="Enter folder name..."
                  className={`w-full px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                    newFolderName.trim()
                      ? isDark ? 'bg-[#C2D642] hover:bg-[#A8B838] text-white' : 'bg-[#C2D642] hover:bg-[#A8B838] text-white'
                      : isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[102] rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-2xl border-2 border-[#C2D642]/70 bg-transparent backdrop-blur-md max-w-xl">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <button
              onClick={clearSelection}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C2D642]/60 bg-transparent hover:bg-[#C2D642]/10 transition-colors text-[#C2D642]`}
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Clear</span>
            </button>
            
            {currentPath[0] === 'trash' ? (
              <>
                <button
                  onClick={handleRestoreFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C2D642]/60 bg-transparent hover:bg-[#C2D642]/10 transition-colors text-[#C2D642]"
                  title="Restore selected files"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Restore</span>
                </button>
                
                <button
                  onClick={handlePermanentDelete}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-500 bg-transparent hover:bg-red-500/10 transition-colors text-red-500"
                  title="Permanently delete selected files"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Delete Permanently</span>
                </button>
              </>
            ) : currentPath[0] === 'image-gallery' ? (
              <>
                <button
                  onClick={handleDownloadFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C2D642]/60 bg-transparent hover:bg-[#C2D642]/10 transition-colors text-[#C2D642]"
                  title="Download selected images"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Download</span>
                </button>
                
                <button
                  onClick={handleDeleteFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-500 bg-transparent hover:bg-red-500/10 transition-colors text-red-500"
                  title="Delete selected images"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Delete</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDownloadFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C2D642]/60 bg-transparent hover:bg-[#C2D642]/10 transition-colors text-[#C2D642]"
                  title="Download selected files"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Download</span>
                </button>
                
                <button
                  onClick={handleShareFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C2D642]/60 bg-transparent hover:bg-[#C2D642]/10 transition-colors text-[#C2D642]"
                  title="Share selected files"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Share</span>
                </button>
                
                {currentPath[0] === 'shared' && (
                  <button
                    onClick={handleUnshare}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-amber-500/70 bg-transparent hover:bg-amber-500/10 transition-colors text-amber-500"
                    title="Unshare selected items"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Unshare</span>
                  </button>
                )}
                
                <button
                  onClick={handleDeleteFiles}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-500 bg-transparent hover:bg-red-500/10 transition-colors text-red-500"
                  title="Delete selected files"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-bold hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;