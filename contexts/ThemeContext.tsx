import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeType } from '../types';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    // Check localStorage first, then default to 'dark'
    const savedTheme = localStorage.getItem('theme') as ThemeType;
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Apply theme class to body for global styling
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
