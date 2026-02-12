'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { userAPI, masterDataAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  company_id?: number;
  country?: string;
  [key: string]: any;
}

export interface CompanyInfo {
  name: string;
  logo?: string | null;
}

interface UserContextType {
  user: User | null;
  company: CompanyInfo | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Derive isAuthenticated from user and token (reactive)
  // Check cookies first, then fallback to localStorage for backward compatibility
  const isAuthenticated = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const { getCookie } = require('../utils/cookies');
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    const authFlag = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
    return !!(user && token && authFlag);
  }, [user]);

  const fetchUserProfile = async () => {
    // Check if user is authenticated
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const { getCookie } = require('../utils/cookies');
    // Check cookies first, then fallback to localStorage for backward compatibility
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    const isAuthenticated = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';

    if (!token || !isAuthenticated) {
      setUser(null);
      setCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch user profile, but don't fail if endpoint doesn't exist
      try {
        console.log('UserContext: Fetching user profile from /profile-list...');
        const response = await userAPI.getProfile();
        console.log('UserContext: Profile response:', response);
        
        // Handle response structure: { status: true, data: { ...user... }, user: { ...user... } }
        // The user data is directly in response.data (not nested in data.user)
        const userData = response.data || response.user;
        
        if (userData && userData.name) {
          console.log('UserContext: Setting user from profile:', userData.name);
          console.log('UserContext: User company_id:', userData.company_id);
          setUser(userData);
          // Company from profile: nested company or company_name (entered at signup)
          const profileCompany = userData.company || userData.company_data || userData.companies;
          if (profileCompany && (profileCompany.registration_name || profileCompany.name)) {
            setCompany({
              name: profileCompany.registration_name || profileCompany.name || '',
              logo: profileCompany.logo || profileCompany.logo_url || null
            });
          } else if (userData.company_name) {
            setCompany({ name: userData.company_name, logo: userData.company_logo || null });
          }
        } else {
          console.warn('UserContext: Profile fetched but no user data or name found:', response);
          console.warn('UserContext: Response structure:', JSON.stringify(response, null, 2));
          setUser(null);
        }
      } catch (profileErr: any) {
        // Check for 404 or if error response status is 404
        const is404 = profileErr.status === 404 || 
                      profileErr.response?.status === 404 ||
                      (profileErr.message && profileErr.message.includes('404'));
        
        if (is404) {
          console.log('UserContext: Profile endpoint not available (404), user will be set from login event');
          setUser(null); // Will be set when userLoggedIn event fires
          // Don't throw - this is expected if endpoint doesn't exist
          return;
        } else {
          // Log the full error for debugging
          console.error('UserContext: Error fetching profile:', {
            error: profileErr,
            status: profileErr.status || profileErr.response?.status,
            message: profileErr.message || profileErr.response?.data?.message,
            response: profileErr.response?.data
          });
          // Don't throw - just log and continue, user will be set from login event
          setUser(null);
          return;
        }
      }
    } catch (err: any) {
      // Only log non-404 errors
      const is404 = err.status === 404 || 
                    err.response?.status === 404 ||
                    (err.message && err.message.includes('404'));
      
      if (!is404) {
        console.error('UserContext: Failed to fetch user profile:', {
          error: err,
          status: err.status || err.response?.status,
          message: err.message || err.response?.data?.message,
          response: err.response?.data
        });
        setError(err.message || err.response?.data?.message || 'Failed to load user profile');
      } else {
        console.log('UserContext: Profile endpoint not found (404) - this is expected if endpoint doesn\'t exist');
      }
      
      setUser(null);
      setCompany(null);
      
      // If 401, clear auth (cookies and localStorage)
      if (err.status === 401 || err.response?.status === 401) {
        const { removeCookie } = require('../utils/cookies');
        removeCookie('auth_token');
        removeCookie('isAuthenticated');
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
    setCompany(null);
    setError(null);
    // Clear cookies and localStorage
    const { removeCookie } = require('../utils/cookies');
    removeCookie('auth_token');
    removeCookie('isAuthenticated');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('isAuthenticated');
    }
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
        // Company name from login (entered at signup)
        if (userData.company_name) {
          setCompany({ name: userData.company_name, logo: userData.company_logo || null });
        }
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

  // Fetch company by company_id when user has it but company not yet loaded from profile
  useEffect(() => {
    if (!user || company) return;
    if (!user.company_id && !user.company_name) return;

    const fetchCompany = async () => {
      try {
        const companies = await masterDataAPI.getCompanies();
        const matched = companies.find((c: any) =>
          String(c.id) === String(user.company_id) ||
          String(c.numericId || c.id) === String(user.company_id)
        );
        if (matched) {
          setCompany({
            name: matched.registration_name || matched.name || '',
            logo: matched.logo || matched.logo_url || null
          });
        } else if (user.company_name) {
          setCompany({ name: user.company_name, logo: user.company_logo || null });
        }
      } catch {
        if (user.company_name) {
          setCompany({ name: user.company_name, logo: user.company_logo || null });
        }
      }
    };

    fetchCompany();
  }, [user?.id, user?.company_id, user?.company_name]);

  return (
    <UserContext.Provider value={{ user, company, isLoading, error, isAuthenticated, refreshUser, clearUser }}>
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
