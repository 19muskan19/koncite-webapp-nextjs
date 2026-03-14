'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface MainSidebarContextType {
  setSidebarOpen: (open: boolean) => void;
}

const MainSidebarContext = createContext<MainSidebarContextType | undefined>(undefined);

export const MainSidebarProvider: React.FC<{ children: ReactNode; setSidebarOpen: (open: boolean) => void }> = ({
  children,
  setSidebarOpen,
}) => {
  return (
    <MainSidebarContext.Provider value={{ setSidebarOpen }}>
      {children}
    </MainSidebarContext.Provider>
  );
};

export const useMainSidebar = () => {
  const context = useContext(MainSidebarContext);
  return context;
};
