'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { userAPI, masterDataAPI } from '../services/api';
import { extractCompanyLogoFromApi, getCompanyLogoImageSrc } from '../utils/imageUtils';

function firstCompanyRecord(userData: Record<string, any>): Record<string, unknown> | null {
  const raw = userData.company || userData.company_data || userData.companies;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === 'object') return raw[0] as Record<string, unknown>;
  return null;
}

function normLabel(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Tenant row: `company_id` is parent org; subsidiaries live in `company.companies[]` with their own `logo`.
 * Prefer the subsidiary the user signed up with: match `registration_name` to parent `name` (or `company_name`),
 * or match explicit `companies.id` when the profile nests the active subsidiary.
 */
function resolveSubsidiaryFromParent(
  parent: Record<string, unknown>,
  userData: Record<string, any>
): Record<string, unknown> | null {
  const raw = parent.companies;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const nestedCo = userData.companies;
  const targetChildId =
    (typeof userData.companies_id === 'number' || typeof userData.companies_id === 'string') && userData.companies_id !== ''
      ? userData.companies_id
      : nestedCo && typeof nestedCo === 'object' && !Array.isArray(nestedCo) && nestedCo !== null && 'id' in nestedCo
        ? (nestedCo as { id?: unknown }).id
        : null;

  if (targetChildId != null) {
    const hit = raw.find((row) => row && typeof row === 'object' && String((row as { id?: unknown }).id) === String(targetChildId));
    if (hit && typeof hit === 'object') return hit as Record<string, unknown>;
  }

  const parentName = normLabel(parent.name);
  const signupName = normLabel(userData.company_name);
  const labels = [parentName, signupName].filter(Boolean);

  for (const label of labels) {
    const matches = raw.filter(
      (row) =>
        row &&
        typeof row === 'object' &&
        (normLabel((row as { registration_name?: unknown }).registration_name) === label ||
          normLabel((row as { name?: unknown }).name) === label)
    );
    if (!matches.length) continue;
    matches.sort((a, b) => {
      const ta = String((a as { created_at?: string }).created_at || '');
      const tb = String((b as { created_at?: string }).created_at || '');
      if (ta && tb && ta !== tb) return ta.localeCompare(tb);
      return Number((a as { id?: number }).id || 0) - Number((b as { id?: number }).id || 0);
    });
    return matches[0] as Record<string, unknown>;
  }

  return null;
}

/** Merge nested company + root-level `company_logo` from profile-list payload. */
function companyInfoFromProfile(userData: Record<string, any>): CompanyInfo | null {
  const profileCompany = firstCompanyRecord(userData);
  const subsidiary =
    profileCompany && typeof profileCompany === 'object' ? resolveSubsidiaryFromParent(profileCompany, userData) : null;

  const nestedLogo = profileCompany ? extractCompanyLogoFromApi(profileCompany) : '';
  const subsidiaryLogo = subsidiary ? extractCompanyLogoFromApi(subsidiary) : '';
  const rootLogo =
    typeof userData.company_logo === 'string' && userData.company_logo.trim()
      ? userData.company_logo.trim()
      : '';
  const logoMerged = (subsidiaryLogo || nestedLogo || rootLogo || null) as string | null;

  if (subsidiary && (subsidiary.registration_name || subsidiary.name)) {
    return {
      name: String(subsidiary.registration_name || subsidiary.name || ''),
      logo: logoMerged,
    };
  }

  if (profileCompany && (profileCompany.registration_name || profileCompany.name)) {
    return {
      name: String(profileCompany.registration_name || profileCompany.name || ''),
      logo: logoMerged,
    };
  }
  if (userData.company_name) {
    return { name: String(userData.company_name), logo: rootLogo || null };
  }
  return null;
}

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

/** Payload from GET /my-accessible-menus (Next.js sidebar + permissions_by_slug). */
export type AccessibleMenusData = {
  user?: { id: number; uuid?: string | null; company_id?: number };
  role?: { id: number; name: string; slug: string } | null;
  is_super_admin?: boolean;
  menus?: unknown[];
  menus_flat?: Array<{ id: number; name: string; slug: string; parent_id: number | null }>;
  permissions_by_slug?: Record<string, string[]>;
};

interface UserContextType {
  user: User | null;
  company: CompanyInfo | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  accessibleMenus: AccessibleMenusData | null;
  refreshAccessibleMenus: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [accessibleMenus, setAccessibleMenus] = useState<AccessibleMenusData | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('koncite_accessible_menus');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AccessibleMenusData;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccessibleMenus = async () => {
    if (typeof window === 'undefined') return;
    const { getCookie } = require('../utils/cookies');
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    const authOk = getCookie('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
    if (!token || !authOk) {
      setAccessibleMenus(null);
      return;
    }
    try {
      const data = await userAPI.getMyAccessibleMenus();
      if (data && typeof data === 'object') {
        setAccessibleMenus(data as AccessibleMenusData);
        try {
          localStorage.setItem('koncite_accessible_menus', JSON.stringify(data));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('UserContext: my-accessible-menus failed', e);
      }
    }
  };

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
      setAccessibleMenus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch user profile, but don't fail if endpoint doesn't exist
      try {
        const response = await userAPI.getProfile();
        
        // Handle response structure: { status: true, data: { ...user... }, user: { ...user... } }
        // The user data is directly in response.data (not nested in data.user)
        const userData = response.data || response.user;
        
        // Accept user data when we have id or email (name can be null and will show fallback in UI)
        if (userData && (userData.id || userData.email)) {
          setUser(userData);
          const fromProfile = companyInfoFromProfile(userData);
          if (fromProfile) setCompany(fromProfile);
          await loadAccessibleMenus();
        } else {
          setUser(null);
          setAccessibleMenus(null);
        }
      } catch (profileErr: any) {
        const status = profileErr.status ?? profileErr.response?.status;
        const is404 = status === 404;
        const is500 = status === 500;
        // 404: endpoint may not exist. 500: backend error - continue without blocking
        if (is404 || is500) {
          setUser(null);
          setAccessibleMenus(null);
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.warn('UserContext: Profile fetch failed', { status, message: profileErr.message });
        }
        setUser(null);
        setAccessibleMenus(null);
        return;
      }
    } catch (err: any) {
      const status = err.status ?? err.response?.status;
      const is404 = status === 404;
      const is500 = status === 500;
      if (!is404 && !is500) {
        setError(err.message || err.response?.data?.message || 'Failed to load user profile');
      }
      
      setUser(null);
      setCompany(null);
      setAccessibleMenus(null);

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

  const refreshAccessibleMenus = async () => {
    await loadAccessibleMenus();
  };

  const clearUser = () => {
    setUser(null);
    setCompany(null);
    setAccessibleMenus(null);
    setError(null);
    // Clear cookies and localStorage
    const { removeCookie } = require('../utils/cookies');
    removeCookie('auth_token');
    removeCookie('isAuthenticated');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('koncite_accessible_menus');
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
        const fromLogin = companyInfoFromProfile(userData);
        if (fromLogin) setCompany(fromLogin);
        setIsLoading(false);
        setError(null);
        void loadAccessibleMenus();
      } else {
        console.warn('UserContext: No user data or name in event, trying alternative structures...');
        // Try to extract user from different possible structures
        const altUser = event.detail?.data?.user || event.detail;
        if (altUser && altUser.name) {
          console.log('UserContext: Found user in alternative structure:', altUser);
          setUser(altUser);
          setIsLoading(false);
          setError(null);
          void loadAccessibleMenus();
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

  const companyLogoFetchDoneRef = useRef<number | null>(null);
  const companyLogoFetchInFlightRef = useRef<number | null>(null);

  // When profile only had company name but logo lives on the companies master row, load it once per company_id.
  useEffect(() => {
    if (!user?.company_id) {
      companyLogoFetchDoneRef.current = null;
      companyLogoFetchInFlightRef.current = null;
      return;
    }

    const id = Number(user.company_id);
    const rawLogo = company?.logo ?? user.company_logo;
    if (getCompanyLogoImageSrc(rawLogo as string | Record<string, unknown> | null)) {
      companyLogoFetchDoneRef.current = null;
      return;
    }

    if (companyLogoFetchDoneRef.current === id) return;
    if (companyLogoFetchInFlightRef.current === id) return;

    companyLogoFetchInFlightRef.current = id;
    let cancelled = false;

    (async () => {
      try {
        const companies = await masterDataAPI.getCompanies();
        if (cancelled || Number(user.company_id) !== id) return;

        const tenantId = String(user.company_id);
        const brandingName = normLabel(company?.name || user.company_name);

        const matched = companies.find((c: any) => {
          if (String(c.id) === tenantId || String(c.numericId || c.id) === tenantId) return true;
          if (!brandingName) return false;
          if (String(c.company_id ?? c.companies_id) !== tenantId) return false;
          return normLabel(c.registration_name || c.name) === brandingName;
        });

        const logoFromRow = matched ? extractCompanyLogoFromApi(matched as Record<string, unknown>) || null : null;
        const rootLogo =
          typeof user.company_logo === 'string' && user.company_logo.trim() ? user.company_logo.trim() : null;

        if (matched || logoFromRow || rootLogo) {
          const name =
            (matched && (matched.registration_name || matched.name)) ||
            user.company_name ||
            company?.name ||
            '';
          setCompany((prev) => ({
            name: String(name || prev?.name || ''),
            logo: logoFromRow || rootLogo || prev?.logo || null,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        if (companyLogoFetchInFlightRef.current === id) companyLogoFetchInFlightRef.current = null;
        if (!cancelled && Number(user?.company_id) === id) companyLogoFetchDoneRef.current = id;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.company_id, user?.company_name, company?.logo, user?.company_logo, company?.name]);

  return (
    <UserContext.Provider
      value={{
        user,
        company,
        isLoading,
        error,
        isAuthenticated,
        accessibleMenus,
        refreshAccessibleMenus,
        refreshUser,
        clearUser,
      }}
    >
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
