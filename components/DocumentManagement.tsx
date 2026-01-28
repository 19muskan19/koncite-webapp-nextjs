'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeType } from '../types';
import { useToast } from '../contexts/ToastContext';
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
  MessageCircle,
  FileText,
  Info,
  ChevronDown,
  ChevronRight,
  Bot,
  X,
  Send,
  Paperclip,
  FolderOpen,
  Upload,
  FolderPlus,
  Menu,
  Check,
  Download,
  Share2,
  Copy,
  RotateCcw,
  Filter
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
}

interface DocumentManagementProps {
  theme: ThemeType;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ theme }) => {
  const toast = useToast();
  const [selectedFolder, setSelectedFolder] = useState<string>('office');
  const [currentPath, setCurrentPath] = useState<string[]>(['office']); // Track navigation path
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false);
  const [showNewDropdown, setShowNewDropdown] = useState<boolean>(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareMode, setShareMode] = useState<'team' | 'link'>('team');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
  const [teamMemberSearch, setTeamMemberSearch] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<FileItem[]>([]);
  // Image Gallery filters
  const [imageSearchName, setImageSearchName] = useState<string>('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI assistant. How can I help you with your documents today?",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const loadProjects = () => {
    // Check if we're in the browser (localStorage is only available client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      setProjects([]);
      return;
    }
    
    const savedProjects = localStorage.getItem('projects');
    const loadedProjects: Project[] = [];
    
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        loadedProjects.push(...parsed);
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
    
    // Also load default projects
    const defaultProjects: Project[] = [
      { 
        id: '1',
        name: 'Residential Complex A', 
        code: 'PRJ001', 
        company: 'ABC Construction Ltd',
        companyLogo: 'https://ui-avatars.com/api/?name=ABC+Construction&background=6366f1&color=fff&size=64',
        startDate: '2024-01-15',
        endDate: '2024-12-31',
        status: 'In Progress',
        progress: 65,
        location: '123 Main Street, New York, NY 10001',
        logo: 'https://ui-avatars.com/api/?name=Residential+Complex&background=6366f1&color=fff&size=128',
        isContractor: true,
        projectManager: 'John Doe',
        createdAt: '2024-01-15T00:00:00.000Z'
      },
      { 
        id: '2',
        name: 'Commercial Tower B', 
        code: 'PRJ002', 
        company: 'XYZ Builders Inc',
        companyLogo: 'https://ui-avatars.com/api/?name=XYZ+Builders&background=10b981&color=fff&size=64',
        startDate: '2024-02-01',
        endDate: '2024-11-30',
        status: 'In Progress',
        progress: 45,
        location: '456 Business Ave, Los Angeles, CA 90001',
        logo: 'https://ui-avatars.com/api/?name=Commercial+Tower&background=10b981&color=fff&size=128',
        isContractor: false,
        projectManager: 'Jane Smith',
        createdAt: '2024-02-01T00:00:00.000Z'
      }
    ];
    
    const existingIds = loadedProjects.map(p => p.id);
    const newDefaults = defaultProjects.filter(p => !existingIds.includes(p.id));
    setProjects([...loadedProjects, ...newDefaults]);
  };

  // Load projects from localStorage
  useEffect(() => {
    loadProjects();
  }, []);

  // Get current folder path as string
  const getCurrentFolderPath = () => {
    return currentPath.join('/');
  };

  const loadDocuments = () => {
    // Check if we're in the browser (localStorage is only available client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      setDocuments([]);
      return;
    }
    
    const folderPath = getCurrentFolderPath();
    
    // If viewing Image Gallery, load all images from all folders
    if (currentPath[0] === 'image-gallery') {
      const allImages: FileItem[] = [];
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
      const seenImageKeys = new Map<string, FileItem>(); // Track seen images by name+size+timestamp to avoid duplicates
      
      // First, load images from all folders except image-gallery and trash
      // This gets images from their original locations
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('documents_') && key !== 'documents_trash' && key !== 'documents_image-gallery') {
          try {
            const savedData = localStorage.getItem(key);
            if (savedData) {
              const parsed = JSON.parse(savedData);
              // Filter only image files
              const images = parsed.filter((doc: any) => {
                const isImage = imageTypes.some(type => doc.name?.toLowerCase().endsWith(type.split('/')[1])) ||
                  /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(doc.name || '');
                return isImage && doc.type === 'file';
              });
              
              // Add original path info to images
              const folderName = key.replace('documents_', '');
              images.forEach((img: any) => {
                // Create a unique key based on name, size, and lastModified to identify duplicates
                const uniqueKey = `${img.name}_${img.size}_${img.lastModified}`;
                
                // Only add if we haven't seen this exact image before
                if (!seenImageKeys.has(uniqueKey)) {
                  const imageItem: FileItem = {
                    ...img,
                    originalPath: img.originalPath || folderName,
                    lastModified: img.lastModified || new Date().toLocaleDateString()
                  };
                  seenImageKeys.set(uniqueKey, imageItem);
                  allImages.push(imageItem);
                }
              });
            }
          } catch (e) {
            console.error(`Error loading documents from ${key}:`, e);
          }
        }
      }
      
      // Then, load from documents_image-gallery to catch images uploaded directly to gallery
      // But skip duplicates that we already have from their original folders
      try {
        const savedGallery = localStorage.getItem('documents_image-gallery');
        if (savedGallery) {
          const parsed = JSON.parse(savedGallery);
          const images = parsed.filter((doc: any) => {
            const isImage = imageTypes.some(type => doc.name?.toLowerCase().endsWith(type.split('/')[1])) ||
              /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(doc.name || '');
            return isImage && doc.type === 'file';
          });
          
          images.forEach((img: any) => {
            const uniqueKey = `${img.name}_${img.size}_${img.lastModified}`;
            // Only add if we haven't seen this image before (from original folder)
            // This prevents duplicates while still showing images uploaded directly to gallery
            if (!seenImageKeys.has(uniqueKey)) {
              const imageItem: FileItem = {
                ...img,
                originalPath: img.originalPath || 'image-gallery',
                lastModified: img.lastModified || new Date().toLocaleDateString()
              };
              seenImageKeys.set(uniqueKey, imageItem);
              allImages.push(imageItem);
            }
          });
        }
      } catch (e) {
        console.error('Error loading gallery documents:', e);
      }
      
      // Sort by lastModified (newest first)
      allImages.sort((a, b) => {
        const dateA = new Date(a.lastModified).getTime();
        const dateB = new Date(b.lastModified).getTime();
        return dateB - dateA;
      });
      
      setDocuments(allImages);
      setSelectedFiles(new Set());
      return;
    }
    
    // Regular folder loading
    const savedDocuments = localStorage.getItem(`documents_${folderPath}`);
    if (savedDocuments) {
      try {
        const parsed = JSON.parse(savedDocuments);
        // Convert stored data back to FileItem format
        setDocuments(parsed.map((doc: any) => {
          // If fileData exists, create a File object from it
          let fileObj: File | undefined;
          if (doc.fileData && doc.mimeType) {
            try {
              const blob = base64ToBlob(doc.fileData, doc.mimeType);
              fileObj = new File([blob], doc.name, { type: doc.mimeType });
            } catch (e) {
              console.error('Error creating file from base64:', e);
            }
          }
          
          return {
            ...doc,
            lastModified: doc.lastModified || new Date().toLocaleDateString(),
            originalPath: doc.originalPath,
            deletedAt: doc.deletedAt,
            file: fileObj || doc.file
          };
        }));
      } catch (e) {
        console.error('Error loading documents:', e);
        setDocuments([]);
      }
    } else {
      setDocuments([]);
    }
    // Clear selection when folder changes
    setSelectedFiles(new Set());
  };

  // Load documents when folder changes
  useEffect(() => {
    loadDocuments();
  }, [currentPath]);

  // Update currentPath when sidebar folder changes
  useEffect(() => {
    setCurrentPath([selectedFolder]);
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
    // Reload projects and documents
    loadProjects();
    loadDocuments();
  };

  // Save documents to localStorage
  useEffect(() => {
    // Check if we're in the browser (localStorage is only available client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
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
        label: project.name
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
    // If we're in a nested folder, show the folder name
    if (currentPath.length > 1) {
      const lastSegment = currentPath[currentPath.length - 1];
      // Extract folder name from ID (format: "path/to/folderName_timestamp")
      const parts = lastSegment.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.split('_')[0];
    }
    // Otherwise show the sidebar folder name
    if (selectedFolder === 'office') return 'Office';
    const parent = sidebarItems.find(item => item.subItems.some(sub => sub.id === selectedFolder));
    if (parent) {
      const subItem = parent.subItems.find(sub => sub.id === selectedFolder);
      return subItem?.label || 'Office';
    }
    return 'Office';
  };

  // Navigate into a folder
  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentPath(prev => [...prev, folderId]);
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.showWarning('Please enter a folder name');
      return;
    }

    const folderName = newFolderName.trim();
    const folderPath = getCurrentFolderPath();
    const folderId = `${folderPath}/${folderName}_${Date.now()}`;
    
    const newFolder: FileItem = {
      id: folderId,
      name: folderName,
      size: '-',
      lastModified: 'Just now',
      owner: 'You',
      type: 'folder',
      path: folderPath
    };

    setDocuments(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowCreateFolderModal(false);
    setShowNewDropdown(false);
    toast.showSuccess(`Folder "${folderName}" created successfully`);
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
      await processFiles(Array.from(files));
    }
    if (uploadFileInputRef.current) {
      uploadFileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    // Check if files are images
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    const folderPath = getCurrentFolderPath();
    const isImageGallery = currentPath[0] === 'image-gallery';
    const isShared = currentPath[0] === 'shared';
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
      try {
        const isImage = imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
        
        if (isImage) {
          // Images go to both current folder AND image gallery
          const baseId = Date.now().toString() + Math.random();
          
          const uploadTime = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Compress image before storing (skip SVG and other vector formats)
          let processedFile = file;
          let fileData: string;
          const mimeType = file.type || 'image/jpeg';
          
          if (!file.type.includes('svg') && !file.type.includes('gif')) {
            try {
              // Compress images larger than 500KB
              if (file.size > 500 * 1024) {
                processedFile = await compressImage(file, 1920, 1920, 0.8);
              }
            } catch (compressError) {
              console.warn('Failed to compress image, using original:', compressError);
              processedFile = file;
            }
          }
          
          // Convert file to base64 for storage
          fileData = await fileToBase64(processedFile);
          
          // Create file for current folder
          const fileForCurrentFolder: FileItem = {
            id: `${baseId}_current`,
            name: file.name,
            size: `${(processedFile.size / 1024).toFixed(2)} KB`,
            lastModified: uploadTime,
            owner: 'You',
            type: 'file' as const,
            file: processedFile,
            path: folderPath,
            fileData: fileData,
            mimeType: mimeType
          };
          
          // Create file for image gallery (with original path info)
          const fileForGallery: FileItem = {
            id: `${baseId}_gallery`,
            name: file.name,
            size: `${(processedFile.size / 1024).toFixed(2)} KB`,
            lastModified: uploadTime,
            owner: 'You',
            type: 'file' as const,
            file: processedFile,
            path: 'image-gallery',
            originalPath: folderPath, // Store where it was uploaded from
            fileData: fileData,
            mimeType: mimeType
          };
          
          // Save to current folder
          if (!isShared) {
            const savedCurrentFolder = localStorage.getItem(`documents_${folderPath}`);
            let currentFolderDocuments: FileItem[] = [];
            if (savedCurrentFolder) {
              try {
                currentFolderDocuments = JSON.parse(savedCurrentFolder);
              } catch (e) {
                console.error('Error loading current folder documents:', e);
              }
            }
            
            const updatedCurrentFolder = [...currentFolderDocuments, fileForCurrentFolder];
            const currentFolderToStore = updatedCurrentFolder.map(doc => ({
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
            
            const saved = safeSetItem(`documents_${folderPath}`, JSON.stringify(currentFolderToStore));
            if (saved) {
              // Update UI if viewing current folder
              if (folderPath === getCurrentFolderPath()) {
                setDocuments(prev => [...prev, fileForCurrentFolder]);
              }
            } else {
              failCount++;
              continue;
            }
          }
          
          // Save to image gallery
          const savedGallery = localStorage.getItem('documents_image-gallery');
          let galleryDocuments: FileItem[] = [];
          if (savedGallery) {
            try {
              galleryDocuments = JSON.parse(savedGallery);
            } catch (e) {
              console.error('Error loading gallery documents:', e);
            }
          }
          
          const updatedGallery = [...galleryDocuments, fileForGallery];
          const galleryToStore = updatedGallery.map(doc => ({
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
          
          const savedGalleryData = safeSetItem('documents_image-gallery', JSON.stringify(galleryToStore));
          if (savedGalleryData) {
            // Update UI if viewing image gallery
            if (isImageGallery) {
              setDocuments(prev => [...prev, fileForGallery]);
            }
            successCount++;
          } else {
            failCount++;
          }
        } else {
          // Non-image files go only to current folder
          const targetFolder = folderPath;
          
          // Load documents for the target folder
          const savedDocuments = localStorage.getItem(`documents_${targetFolder}`);
          let existingDocuments: FileItem[] = [];
          if (savedDocuments) {
            try {
              existingDocuments = JSON.parse(savedDocuments);
            } catch (e) {
              console.error('Error loading documents:', e);
            }
          }
          
          // Check file size - warn if too large
          if (file.size > 2 * 1024 * 1024) { // 2MB
            toast.showWarning(`File "${file.name}" is large (${(file.size / 1024 / 1024).toFixed(2)} MB). Large files may not save properly.`);
          }
          
          // Convert file to base64 for storage
          const fileData = await fileToBase64(file);
          const mimeType = file.type || 'application/octet-stream';
          
          const newFile: FileItem = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            lastModified: 'Just now',
            owner: 'You',
            type: 'file' as const,
            file: file,
            path: targetFolder,
            fileData: fileData,
            mimeType: mimeType
          };
          
          // Add to target folder's documents
          const updatedDocuments = [...existingDocuments, newFile];
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
          
          const saved = safeSetItem(`documents_${targetFolder}`, JSON.stringify(documentsToStore));
          if (saved) {
            // If target folder is current folder, update UI
            if (targetFolder === folderPath && !isShared) {
              setDocuments(prev => [...prev, newFile]);
            }
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        toast.showError(`Failed to process "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
      }
    }
    
    // Show notifications
    if (successCount > 0) {
      const uploadedImages = files.filter(file => {
        const isImage = imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
        return isImage;
      });
      
      const nonImages = files.filter(file => {
        const isImage = imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
        return !isImage;
      });
      
      if (uploadedImages.length > 0) {
        if (isImageGallery) {
          toast.showSuccess(`${successCount} image(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
        } else if (isShared) {
          toast.showSuccess(`${successCount} image(s) uploaded to Image Gallery${failCount > 0 ? `, ${failCount} failed` : ''}`);
        } else {
          toast.showSuccess(`${successCount} image(s) uploaded to current folder and Image Gallery${failCount > 0 ? `, ${failCount} failed` : ''}`);
        }
      } else if (nonImages.length > 0 && !isShared) {
        toast.showSuccess(`${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
      }
    } else if (failCount > 0) {
      toast.showError(`Failed to upload ${failCount} file(s). Storage may be full.`);
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

  const handleSendChatMessage = () => {
    if (!chatInput.trim() && attachedFiles.length === 0) return;

    const messageContent = chatInput.trim();
    const hasFiles = attachedFiles.length > 0;
    
    let fullContent = messageContent;
    if (hasFiles) {
      const fileList = attachedFiles.map(f => `📎 ${f.name} (${(f.size / 1024).toFixed(2)} KB)`).join('\n');
      fullContent = messageContent 
        ? `${messageContent}\n\n${fileList}`
        : `Files attached:\n${fileList}`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setAttachedFiles([]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: messageContent 
          ? `I understand you're asking about "${messageContent}".${hasFiles ? ' I can see you\'ve attached some files.' : ''} Let me help you with that.`
          : `I can see you've attached ${attachedFiles.length} file(s). How can I help you with these files?`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

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

  const selectAllFiles = () => {
    setSelectedFiles(new Set(filteredFiles.map(file => file.id)));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleDeleteFiles = () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to delete');
      return;
    }
    
    const fileCount = selectedFiles.size;
    if (window.confirm(`Are you sure you want to move ${fileCount} file(s) to trash?`)) {
      const filesToMove = documents.filter(doc => selectedFiles.has(doc.id));
      
      // Load existing trash documents
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
      
      // Add deleted files to trash with updated path and original location
      const filesForTrash = filesToMove.map(file => ({
        ...file,
        path: 'trash',
        originalPath: file.path || currentFolderPath, // Store original path
        lastModified: 'Just now',
        deletedAt: new Date().toISOString()
      }));
      
      // Save to trash (only serializable data)
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
        // Remove from current folder
        setDocuments(prev => prev.filter(doc => !selectedFiles.has(doc.id)));
        setSelectedFiles(new Set());
        toast.showSuccess(`${fileCount} file(s) moved to trash`);
      } else {
        toast.showError('Failed to move files to trash. Storage may be full.');
      }
    }
  };

  const handleRestoreFiles = () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to restore');
      return;
    }
    
    const filesToRestore = documents.filter(doc => selectedFiles.has(doc.id));
    const fileCount = filesToRestore.length;
    
    let restoreSuccess = true;
    
    // Restore each file to its original location
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

  const handlePermanentDelete = () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to delete permanently');
      return;
    }
    
    const fileCount = selectedFiles.size;
    if (window.confirm(`Are you sure you want to permanently delete ${fileCount} file(s)? This action cannot be undone.`)) {
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

  const handleDownloadFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to download');
      return;
    }
    
    const filesToDownload = documents.filter(doc => selectedFiles.has(doc.id));
    
    for (const file of filesToDownload) {
      try {
        let blob: Blob;
        
        if (file.file) {
          // Use the File object directly if available
          blob = file.file;
        } else if (file.fileData && file.mimeType) {
          // Convert base64 to Blob
          blob = base64ToBlob(file.fileData, file.mimeType);
        } else {
          // Fallback: create empty blob
          toast.showWarning(`File "${file.name}" data not found`);
          continue;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Error downloading file ${file.name}:`, error);
        toast.showError(`Failed to download ${file.name}`);
      }
    }
    
    toast.showSuccess(`${filesToDownload.length} file(s) download started`);
  };

  const handleShareFiles = () => {
    if (selectedFiles.size === 0) {
      toast.showWarning('Please select files to share');
      return;
    }
    setShowShareModal(true);
  };

  const handleShareSubmit = () => {
    const filesToShare = documents.filter(doc => selectedFiles.has(doc.id));
    const fileNames = filesToShare.map(f => f.name).join(', ');
    
    if (shareMode === 'team') {
      // Handle team sharing
      const members = Array.from(selectedTeamMembers);
      console.log('Sharing with team members:', members);
      toast.showSuccess(`Shared ${selectedFiles.size} file(s) with ${members.length} team member(s)`);
    } else {
      // Handle link sharing
      const shareLink = `${window.location.origin}/share/${Date.now()}`;
      navigator.clipboard.writeText(shareLink).then(() => {
        toast.showSuccess('Share link copied to clipboard!');
      });
    }
    
    setShowShareModal(false);
    setSelectedTeamMembers(new Set());
    setTeamMemberSearch('');
    setIsSearchFocused(false);
  };

  // Mock team members data
  const teamMembers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=6366f1&color=fff' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=10b981&color=fff' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=f59e0b&color=fff' },
    { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=ef4444&color=fff' },
    { id: '5', name: 'David Brown', email: 'david@example.com', avatar: 'https://ui-avatars.com/api/?name=David+Brown&background=8b5cf6&color=fff' },
  ];

  const filteredTeamMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(teamMemberSearch.toLowerCase())
  );

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
                ? isDark
                  ? 'bg-[#5a7a1e] text-white'
                  : 'bg-[#6B8E23]/20 text-[#5a7a1e]'
                : isInCurrentPath
                  ? isDark
                    ? 'bg-[#6B8E23]/20 text-[#6B8E23]'
                    : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                  : isDark
                    ? 'hover:bg-[#6B8E23]/20 text-[#6B8E23]'
                    : 'hover:bg-[#6B8E23]/10 text-[#6B8E23]'
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
            <span className="flex-1 text-left truncate">{node.name}</span>
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
      <div className={`fixed md:static inset-y-0 left-0 z-[101] md:z-auto w-full sm:w-80 md:w-64 border-r ${isDark ? 'bg-slate-900 md:bg-[#6B8E23]/10 border-[#6B8E23]/20' : 'bg-white md:bg-[#6B8E23]/5 border-[#6B8E23]/10'} flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${
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
            // Check if base folders (office, shared) have subfolders
            const folderTree = (item.id === 'office' || item.id === 'shared') ? getFolderTreeForPath(item.id) : [];
            const hasFolderTree = folderTree.length > 0;
            const shouldShowChevron = hasSubItems || hasFolderTree;

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (shouldShowChevron) {
                      toggleFolder(item.id);
                    }
                    setCurrentPath([item.id]);
                    setSelectedFolder(item.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    isSelected && !shouldShowChevron
                      ? isDark
                        ? 'bg-[#6B8E23] text-white'
                        : 'bg-[#6B8E23]/10 text-[#6B8E23] border-l-4 border-orange-400'
                      : isSelected
                        ? isDark
                          ? 'bg-[#6B8E23]/20 text-white'
                          : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                        : isDark
                          ? 'hover:bg-[#6B8E23]/20 text-[#6B8E23]'
                          : 'hover:bg-[#6B8E23]/10 text-[#6B8E23]'
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
                </button>

                {/* Sub Items - Projects */}
                {hasSubItems && isExpanded && item.id === 'projects' && (
                  <div className="ml-3 sm:ml-4 mt-1 space-y-1">
                    {item.subItems.map((subItem) => {
                      const isSubSelected = currentPath[0] === subItem.id;
                      const projectFolderTree = getFolderTreeForPath(subItem.id);
                      const isProjectExpanded = expandedFolders.has(subItem.id);
                      
                      return (
                        <div key={subItem.id}>
                          <button
                            onClick={() => {
                              toggleFolder(subItem.id);
                              setCurrentPath([subItem.id]);
                              setSelectedFolder(subItem.id);
                              // Close sidebar on mobile after selection
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                              isSubSelected && currentPath.length === 1
                                ? isDark
                                  ? 'bg-[#5a7a1e] text-white'
                                  : 'bg-[#6B8E23]/20 text-[#5a7a1e]'
                                : currentPath[0] === subItem.id
                                  ? isDark
                                    ? 'bg-[#6B8E23]/20 text-[#6B8E23]'
                                    : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                                  : isDark
                                    ? 'hover:bg-[#6B8E23]/20 text-[#6B8E23]'
                                    : 'hover:bg-[#6B8E23]/10 text-[#6B8E23]'
                            }`}
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
                            <span className="flex-1 text-left">{subItem.label}</span>
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
                
                {/* Folder Tree for Office and Shared */}
                {!hasSubItems && isExpanded && (item.id === 'office' || item.id === 'shared') && (
                  <div className="ml-3 sm:ml-4 mt-1">
                    {renderFolderTree(getFolderTreeForPath(item.id), item.id, 0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`p-3 md:p-4 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4`}>
          {/* Search Bar */}
          <div className="flex-1 relative flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
            >
              <Menu className={`w-5 h-5 ${textSecondary}`} />
            </button>
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents, folders..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                viewMode === 'grid'
                  ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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
                  ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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
            {currentPath[0] !== 'image-gallery' && (
              <div className="relative new-dropdown">
                <button
                  onClick={() => setShowNewDropdown(!showNewDropdown)}
                  className={`new-button flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
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
                      {currentPath[0] !== 'shared' && (
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
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                showAIAssistant
                  ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                  : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
              title="AI Assistant"
            >
              <MessageCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4`} />
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {currentPath.length > 1 && (
          <div className={`px-3 md:px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {currentPath.map((pathSegment, index) => {
                const isLast = index === currentPath.length - 1;
                // Extract folder name from path segment
                let segmentLabel = '';
                if (index === 0) {
                  // Check if it's a project
                  if (pathSegment.startsWith('project_')) {
                    const projectId = pathSegment.replace('project_', '');
                    const project = projects.find(p => p.id === projectId);
                    segmentLabel = project?.name || pathSegment;
                  } else {
                    const sidebarItem = sidebarItems.find(item => item.id === pathSegment);
                    segmentLabel = sidebarItem?.label || pathSegment;
                  }
                } else {
                  // Extract folder name from ID (format: "path/to/folderName_timestamp")
                  const parts = pathSegment.split('/');
                  const lastPart = parts[parts.length - 1];
                  // Remove timestamp from folder name
                  const nameParts = lastPart.split('_');
                  // Join all parts except the last one (timestamp)
                  segmentLabel = nameParts.slice(0, -1).join('_') || lastPart;
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
                          : `${textSecondary} hover:text-[#6B8E23] cursor-pointer`
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
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar">
          {/* Image Gallery Filters */}
          {currentPath[0] === 'image-gallery' && (
            <div className={`mb-6 p-4 sm:p-6 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
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
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} focus:outline-none focus:ring-2 focus:ring-[#6B8E23] focus:border-transparent`}
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
                    className={`w-full px-4 py-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} hover:border-[#6B8E23] transition-colors`}
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
                            ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
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
                              ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23]/10 text-[#6B8E23]'
                              : isDark ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          {project.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      // Filters are applied automatically via filteredFiles
                      toast.showInfo('Filters applied');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isDark 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setImageSearchName('');
                      setSelectedProjectFilter('all');
                      toast.showInfo('Filters cleared');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isDark 
                        ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                        : 'bg-slate-600 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Results Count */}
              <div className={`text-sm font-bold ${textSecondary}`}>
                Showing {filteredFiles.length === 0 ? 0 : 1} - {filteredFiles.length} of {filteredFiles.length} image{filteredFiles.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Current Directory & Tip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                {getCurrentFolderLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2 hidden lg:flex">
              <Info className={`w-4 h-4 ${textSecondary}`} />
              <p className={`text-xs font-bold ${textSecondary}`}>
                Tip: Hold <strong>Ctrl</strong> to select multiple items, <strong>Shift</strong> for range, or press <strong>Ctrl+A</strong> to select all
              </p>
            </div>
          </div>

          {/* Files List */}
          {viewMode === 'list' ? (
            <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} w-12`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedFiles.size === filteredFiles.length) {
                              clearSelection();
                            } else {
                              selectAllFiles();
                            }
                          }}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <Check className={`w-4 h-4 ${selectedFiles.size === filteredFiles.length && filteredFiles.length > 0 ? 'text-[#6B8E23]' : textSecondary}`} />
                        </button>
                      </th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary}`}>Name</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden sm:table-cell`}>Size</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden md:table-cell`}>Last Modified</th>
                      <th className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-black uppercase tracking-wider ${textSecondary} hidden lg:table-cell`}>Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedFiles.has(file.id);
                      return (
                        <tr
                          key={file.id}
                          onClick={(e) => {
                            if (file.type === 'folder') {
                              // Double-click or Ctrl+Click to navigate into folder
                              if (e.detail === 2 || e.ctrlKey || e.metaKey) {
                                navigateToFolder(file.id, file.name);
                              } else {
                                toggleFileSelection(file.id);
                              }
                            } else {
                              toggleFileSelection(file.id);
                            }
                          }}
                          className={`${isSelected ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-100') : ''} ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`}
                        >
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4`} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => toggleFileSelection(file.id, e)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-[#6B8E23] border-[#6B8E23]'
                                  : isDark
                                    ? 'border-slate-600 hover:border-[#6B8E23]'
                                    : 'border-slate-300 hover:border-[#6B8E23]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          </td>
                          <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10'}`}>
                              {file.type === 'folder' ? (
                                <Folder className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                              ) : (
                                <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs sm:text-sm font-bold ${textPrimary} block truncate`}>{file.name}</span>
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
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.has(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={(e) => {
                      if (file.type === 'folder') {
                        // Double-click to navigate into folder
                        if (e.detail === 2 || e.ctrlKey || e.metaKey) {
                          navigateToFolder(file.id, file.name);
                        } else {
                          toggleFileSelection(file.id);
                        }
                      } else {
                        toggleFileSelection(file.id);
                      }
                    }}
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
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6B8E23] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`w-full h-16 sm:h-20 md:h-24 rounded-lg flex items-center justify-center mb-2 sm:mb-3 ${isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10'}`}>
                      {file.type === 'folder' ? (
                        <Folder className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                      ) : (
                        <FileText className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-bold ${textPrimary} truncate mb-1`}>{file.name}</p>
                    <p className={`text-[10px] sm:text-xs font-bold ${textSecondary}`}>{file.size}</p>
                  </div>
                );
              })}
            </div>
          )}

          {filteredFiles.length === 0 && (
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
                    ? 'border-[#6B8E23] bg-[#6B8E23]/10'
                    : 'border-[#6B8E23] bg-[#6B8E23]/10'
                  : isDark
                    ? 'border-slate-700 bg-slate-800 hover:border-[#6B8E23]/50'
                    : 'border-slate-200 bg-white hover:border-[#6B8E23]/30'
              }`}
              onClick={() => {
                if (!isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery') {
                  uploadFileInputRef.current?.click();
                }
              }}
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${
                isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery'
                  ? isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10'
                  : isDark ? 'bg-slate-700/50' : 'bg-slate-100'
              }`}>
                {isDragging && currentPath[0] !== 'shared' && currentPath[0] !== 'image-gallery' ? (
                  <Upload className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
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
                      ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'
                      : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'
                  } shadow-md`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-[#6B8E23]/20 hover:bg-[#6B8E23]/30' : 'bg-[#6B8E23]/10 hover:bg-[#6B8E23]/20'}`}
              >
                <X className={`w-4 h-4 ${isDark ? 'text-[#6B8E23]' : 'text-[#5a7a1e]'}`} />
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
                        const member = teamMembers.find(m => m.id === memberId);
                        if (!member) return null;
                        return (
                          <div
                            key={memberId}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-[#6B8E23]/20 border border-[#6B8E23]/30' : 'bg-[#6B8E23]/10 border border-[#6B8E23]/20'}`}
                          >
                            <span className={`text-xs font-bold ${isDark ? 'text-[#6B8E23]' : 'text-[#5a7a1e]'}`}>
                              {member.name}
                            </span>
                            <button
                              onClick={() => toggleTeamMember(memberId)}
                              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-[#6B8E23]/30' : 'hover:bg-[#6B8E23]/20'}`}
                            >
                              <X className={`w-3 h-3 ${isDark ? 'text-[#6B8E23]' : 'text-[#5a7a1e]'}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Team Members List - Only show when search is clicked/focused */}
                  {isSearchFocused && (
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 team-members-list">
                      {filteredTeamMembers.length > 0 ? (
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
                    : 'bg-gradient-to-r from-[#6B8E23] to-[#5a7a1e] hover:from-[#5a7a1e] hover:to-[#4a6a18] text-white shadow-lg'
                }`}
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
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
                  className={`w-full px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'} border focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
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
                      ? isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'
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

      {/* AI Assistant Panel */}
      {showAIAssistant && (
        <>
          {/* Mobile Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowAIAssistant(false)}
          />
          <div className={`fixed md:static inset-y-0 right-0 z-50 md:z-auto w-full sm:w-96 md:w-80 border-l ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} flex flex-col transform transition-transform duration-300 ease-in-out`}>
          {/* AI Assistant Header */}
          <div className={`p-3 sm:p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <h3 className={`text-xs sm:text-sm font-black ${textPrimary}`}>AI Assistant</h3>
            </div>
            <button
              onClick={() => setShowAIAssistant(false)}
              className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <X className={`w-4 h-4 ${textSecondary}`} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#6B8E23]/20' : 'bg-[#6B8E23]/10'}`}>
                    <Bot className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-[#6B8E23]' : 'text-[#6B8E23]'}`} />
                  </div>
                )}
                <div className={`max-w-[75%] sm:max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  <div className={`rounded-lg p-2 sm:p-3 ${
                    message.role === 'user'
                      ? isDark ? 'bg-[#6B8E23] text-white' : 'bg-[#6B8E23] text-white'
                      : isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-900'
                  }`}>
                    <p className={`text-xs sm:text-sm font-bold break-words ${message.role === 'user' ? 'text-white' : textPrimary}`}>
                      {message.content}
                    </p>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#6B8E23] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] sm:text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-1.5 sm:gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded text-[10px] sm:text-xs font-bold ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-900'}`}
                >
                  <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className={`ml-0.5 hover:opacity-70 transition-opacity ${textSecondary} flex-shrink-0`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className={`p-3 sm:p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleAttachClick}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
                title="Attach file"
              >
                <Paperclip className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textSecondary}`} />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about documents..."
                className={`flex-1 bg-transparent outline-none text-xs sm:text-sm font-bold ${textPrimary} placeholder:${textSecondary}`}
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim() && attachedFiles.length === 0}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  (chatInput.trim() || attachedFiles.length > 0)
                    ? isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'
                    : isDark ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Floating Action Bar */}
      {selectedFiles.size > 0 && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[102] ${isDark ? 'bg-gradient-to-r from-[#6B8E23] via-[#5a7a1e] to-[#4a6a18]' : 'bg-gradient-to-r from-[#6B8E23] via-[#5a7a1e] to-[#4a6a18]'} rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-2xl ${isDark ? 'border border-[#6B8E23]/30' : 'border border-[#6B8E23]/30'}`}>
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-[#6B8E23]/30 border border-white/30' : 'bg-[#6B8E23]/40 border border-white/40'} flex items-center justify-center`}>
                <span className="text-white text-sm font-black">{selectedFiles.size}</span>
              </div>
              <span className="text-white text-xs sm:text-sm font-bold hidden sm:inline">selected</span>
            </div>
            
            <div className={`h-6 w-px ${isDark ? 'bg-white/30' : 'bg-white/40'}`}></div>
            
            <button
              onClick={clearSelection}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40' : 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40'} transition-colors text-white`}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold hidden sm:inline">Clear</span>
            </button>
            
            {currentPath[0] === 'trash' ? (
              <>
                <button
                  onClick={handleRestoreFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-green-500/80 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'} transition-colors text-white`}
                  title="Restore selected files"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Restore</span>
                </button>
                
                <button
                  onClick={handlePermanentDelete}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-red-500/90 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'} transition-colors text-white`}
                  title="Permanently delete selected files"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Delete Permanently</span>
                </button>
              </>
            ) : currentPath[0] === 'image-gallery' ? (
              <>
                <button
                  onClick={handleDownloadFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40' : 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40'} transition-colors text-white`}
                  title="Download selected images"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Download</span>
                </button>
                
                <button
                  onClick={handleDeleteFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-red-500/90 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'} transition-colors text-white`}
                  title="Delete selected images"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Delete</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDownloadFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40' : 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40'} transition-colors text-white`}
                  title="Download selected files"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Download</span>
                </button>
                
                <button
                  onClick={handleShareFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40' : 'bg-[#6B8E23]/30 hover:bg-[#6B8E23]/40'} transition-colors text-white`}
                  title="Share selected files"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Share</span>
                </button>
                
                <button
                  onClick={handleDeleteFiles}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${isDark ? 'bg-red-500/90 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'} transition-colors text-white`}
                  title="Delete selected files"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold hidden sm:inline">Delete</span>
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
