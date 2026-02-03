'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  country?: string;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    // Check if user is authenticated
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('auth_token');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    if (!token || !isAuthenticated) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch user profile, but don't fail if endpoint doesn't exist
      try {
        console.log('UserContext: Fetching user profile...');
        const response = await userAPI.getProfile();
        console.log('UserContext: Profile response:', response);
        const userData = response.data?.user || response.user;
        
        if (userData && userData.name) {
          console.log('UserContext: Setting user from profile:', userData.name);
          setUser(userData);
        } else {
          console.warn('UserContext: Profile fetched but no user data or name found:', response);
          setUser(null);
        }
      } catch (profileErr: any) {
        // If 404, endpoint doesn't exist - this is okay, user will be set from login event
        if (profileErr.status === 404) {
          console.log('UserContext: Profile endpoint not available (404), user will be set from login event');
          setUser(null); // Will be set when userLoggedIn event fires
        } else {
          console.error('UserContext: Error fetching profile:', profileErr);
          throw profileErr; // Re-throw other errors
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError(err.message || 'Failed to load user profile');
      setUser(null);
      
      // If 401, clear auth
      if (err.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('isAuthenticated');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUserProfile();
  };

  const clearUser = () => {
    setUser(null);
    setError(null);
  };

  // Fetch user profile on mount and when auth changes
  useEffect(() => {
    fetchUserProfile();

    // Listen for login events
    const handleUserLoggedIn = (event: CustomEvent) => {
      const userData = event.detail?.user;
      console.log('=== UserContext: Received userLoggedIn event ===');
      console.log('Event detail:', event.detail);
      console.log('User data:', userData);
      console.log('User name:', userData?.name);
      console.log('================================================');
      
      if (userData && userData.name) {
        console.log('UserContext: Setting user with name:', userData.name);
        setUser(userData);
        setIsLoading(false);
        setError(null);
      } else {
        console.warn('UserContext: No user data or name in event, trying alternative structures...');
        // Try to extract user from different possible structures
        const altUser = event.detail?.data?.user || event.detail;
        if (altUser && altUser.name) {
          console.log('UserContext: Found user in alternative structure:', altUser);
          setUser(altUser);
          setIsLoading(false);
          setError(null);
        } else {
          console.error('UserContext: Could not extract user data from event. Event structure:', event.detail);
          // Try to fetch profile as last resort
          fetchUserProfile();
        }
      }
    };

    // Listen for logout events
    const handleUserLoggedOut = () => {
      clearUser();
    };

    // Listen for storage changes (auth_token)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'isAuthenticated') {
        fetchUserProfile();
      }
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
