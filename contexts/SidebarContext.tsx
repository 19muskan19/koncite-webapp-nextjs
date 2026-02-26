'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  sidebarOpen: boolean;
  sidebarWidth: number; // px - left offset for modal/content when sidebar takes space
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Desktop (lg 1024px+): collapsed=80px, expanded=256px
// Mobile: closed=0, open=min(280, 85vw) ~ 280px
const DESKTOP_COLLAPSED = 80;
const DESKTOP_EXPANDED = 256;
const MOBILE_OPEN = 280;

export const SidebarProvider: React.FC<{ children: ReactNode; sidebarOpen: boolean }> = ({ children, sidebarOpen }) => {
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      if (isDesktop) {
        setSidebarWidth(sidebarOpen ? DESKTOP_EXPANDED : DESKTOP_COLLAPSED);
      } else {
        setSidebarWidth(sidebarOpen ? Math.min(MOBILE_OPEN, window.innerWidth * 0.85) : 0);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [sidebarOpen]);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, sidebarWidth }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    return { sidebarOpen: false, sidebarWidth: 0 };
  }
  return context;
};
