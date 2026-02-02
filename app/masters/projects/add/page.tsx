'use client';

import AppLayout from '@/components/AppLayout';
import CreateProjectModal from '@/components/masters/Modals/CreateProjectModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
}

export default function AddProjectPage() {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();
  const router = useRouter();
  const [defaultProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setUserProjects(parsed);
      } catch (e) {
        setUserProjects([]);
      }
    }
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2D642]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleClose = () => {
    router.push('/masters/projects');
  };

  const handleSuccess = () => {
    router.push('/masters/projects');
  };

  return (
    <AppLayout>
      <CreateProjectModal
        theme={theme}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        defaultProjects={defaultProjects}
        userProjects={userProjects}
      />
    </AppLayout>
  );
}
