import apiClient, { API_BASE_URL, getAuthToken, companyAjaxClient, getLaravelCsrfToken } from './apiClient';
import { setCookie, removeCookie } from '../utils/cookies';
import type { InventoryReportMeta, InventoryReportResult } from '../types/inventoryReportMeta';
import { parseInventoryReportResponse } from '../utils/inventoryReportResponse';

// Types
export type CountryCode = '91' | '971';

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  company_name: string;
  country: number | string;
  phone: string;
  profileImage?: File;
}

export interface SignupResponse {
  message?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    country?: string;
  };
  token?: string;
  errors?: Record<string, string[]>;
}

export interface LoginRequest {
  email: string;
  password: string;
  fcm_token?: string;
}

export interface LoginResponse {
  status?: boolean;
  /** e.g. 300 when email not verified (envelope still HTTP 200 from some gateways) */
  response_code?: number;
  message?: string;
  requires_otp_verification?: boolean;
  email?: string;
  data?: {
    token?: string;
    requires_otp_verification?: boolean;
    email?: string;
    /** false when user must complete email OTP (sign-up verification) */
    otp_verify?: boolean;
    uuid?: string;
    phone?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      phone?: string;
      company_name?: string;
    };
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
  };
  errors?: Record<string, string[]>;
}

export interface OtpVerificationRequest {
  email: string;
  otp: string;
}

export interface OtpVerificationResponse {
  status?: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: any;
  };
  errors?: Record<string, string[]>;
}

export interface ForgotEmailRequest {
  email: string;
}

export interface ForgotEmailResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ForgotPasswordUpdateRequest {
  email: string;
  newPassword: string;
}

/** Laravel BaseController::responseJson — may include nested `data` on auth failures (e.g. email not verified) */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
  response_code?: number;
  data?: {
    otp_verify?: boolean;
    uuid?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

/**
 * Merge nested `data` with root-level fields — backends put `otp_verify` / `email` on `data` or on the envelope.
 */
export function mergeLoginFailurePayload(
  envelope: Record<string, unknown> | null | undefined
): ApiError['data'] | undefined {
  if (!envelope || typeof envelope !== 'object') return undefined;
  const rawInner = envelope['data'];
  const nested: Record<string, unknown> =
    rawInner != null && typeof rawInner === 'object' && !Array.isArray(rawInner)
      ? { ...(rawInner as Record<string, unknown>) }
      : {};
  if (envelope['otp_verify'] !== undefined) nested['otp_verify'] = envelope['otp_verify'];
  const rootEmail = envelope['email'];
  if (typeof rootEmail === 'string' && rootEmail.trim()) nested['email'] = rootEmail.trim();
  if (Object.keys(nested).length === 0) return undefined;
  return nested as ApiError['data'];
}

// Auth API - Matching Laravel routes
export const authAPI = {
  /**
   * Register a new user
   * POST /api/sign-up
   * Uses FormData for multipart/form-data (supports file uploads)
   */
  signup: async (data: FormData | SignupRequest): Promise<SignupResponse> => {
    try {
      let formData: FormData;
      
      // If data is already FormData, use it directly
      if (data instanceof FormData) {
        formData = data;
      } else {
        // Otherwise, convert SignupRequest to FormData
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
      }

      // Log FormData contents for debugging
      console.log('=== SIGNUP REQUEST DEBUG ===');
      console.log('Endpoint:', '/sign-up');
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      console.log('===========================');

      const response = await apiClient.post('/sign-up', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Log response for debugging
      console.log('=== SIGNUP RESPONSE DEBUG ===');
      console.log('HTTP Status:', response.status);
      console.log('Response Status:', response.data?.status);
      console.log('Full Response Data:', JSON.stringify(response.data, null, 2));
      console.log('User from response.data.user:', response.data?.user);
      console.log('User from response.data.data.user:', response.data?.data?.user);
      console.log('User ID:', response.data?.user?.id || response.data?.data?.user?.id);
      console.log('User Name:', response.data?.user?.name || response.data?.data?.user?.name);
      console.log('Message:', response.data?.message);
      console.log('Errors:', response.data?.errors);
      console.log('============================');
      
      // Check if signup failed
      if (response.data?.status === false) {
        console.error('Signup failed on backend:', response.data);
        const errorMessage = response.data?.message || 'Signup failed';
        const errors = response.data?.errors || {};
        throw {
          message: errorMessage,
          errors: errors,
          status: response.status,
        } as ApiError;
      }
      
      return response.data;
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Signup API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Extract errors from Laravel validation response
      const errorData = error.response?.data || {};
      const errors = errorData.errors || {};
      const message = errorData.message || error.message || 'Signup failed';

      throw {
        message,
        errors,
        status: error.response?.status,
      } as ApiError;
    }
  },

  /**
   * Login user
   * POST /api/sign-in
   */
  login: async (email: string, password: string, fcm_token?: string): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post(
        '/sign-in',
        {
          email,
          password,
          ...(fcm_token && { fcm_token }),
        },
        {
          // Backend returns HTTP 300 with JSON for "email not verified"; axios treats 3xx as failure by default.
          validateStatus: (status) => (status >= 200 && status < 300) || status === 300,
        }
      );

      const data = response.data;

      const isLogicalFailure = (s: unknown) =>
        s === false || s === 0 || s === 'false' || s === '0';

      // Laravel envelope: logical failure (e.g. email not verified) — often HTTP 200 or 300 with status: false
      if (data && isLogicalFailure(data.status)) {
        const nestedMsg =
          data.data && typeof data.data === 'object' && data.data !== null && typeof (data.data as { message?: string }).message === 'string'
            ? (data.data as { message: string }).message
            : '';
        const topMsg = data.message;
        const msg =
          (typeof topMsg === 'string' && topMsg.trim()) ||
          (Array.isArray(topMsg) && topMsg[0] != null && String(topMsg[0]).trim()) ||
          nestedMsg ||
          'Login failed';
        throw {
          message: msg,
          errors: data.errors || {},
          status: response.status,
          response_code: typeof data.response_code === 'number' ? data.response_code : undefined,
          data: mergeLoginFailurePayload(data as unknown as Record<string, unknown>),
        } as ApiError;
      }

      // Store auth token in cookies - use user data from login response
      if (data.status && data.data?.token) {
        // Store token in cookies (30 days expiration)
        setCookie('auth_token', data.data.token, 30);
        setCookie('isAuthenticated', 'true', 30);
        // Also store in localStorage for backward compatibility during migration
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Extract user data from login response - handle different response structures
        const user = data.data?.user || data.user;
        
        console.log('=== LOGIN API DEBUG ===');
        console.log('Full response data:', data);
        console.log('User from data.data.user:', data.data?.user);
        console.log('User from data.user:', data.user);
        console.log('Final user object:', user);
        console.log('User name:', user?.name);
        console.log('========================');
        
        if (user && user.name) {
          // Dispatch event with user data immediately
          if (typeof window !== 'undefined') {
            console.log('Login: Dispatching userLoggedIn event with user:', user);
            const event = new CustomEvent('userLoggedIn', { detail: { user } });
            window.dispatchEvent(event);
            console.log('Login: Event dispatched, user name:', user.name);
          }
        } else {
          console.warn('Login: No user data in response, attempting to fetch profile...');
          // If login response doesn't include user data, try to fetch profile
          try {
            const profileResponse = await userAPI.getProfile();
            const profileUser = profileResponse.data?.user || profileResponse.user;
            if (profileUser && profileUser.name) {
              console.log('Login: Fetched user profile:', profileUser);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: profileUser } }));
              }
            } else {
              console.warn('Login: Profile fetch also returned no user data');
            }
          } catch (profileError: any) {
            console.warn('Login: Failed to fetch profile after login:', profileError);
            // If profile endpoint doesn't exist (404), that's okay - we'll rely on login response
            if (profileError.response?.status !== 404) {
              console.error('Login: Unexpected error fetching profile:', profileError);
            }
          }
        }
      } else {
        console.warn('Login: Unexpected response structure:', data);
      }
      
      return data;
    } catch (error: any) {
      // Re-throw structured error from status === false branch (not an Axios error)
      if (
        error &&
        typeof error.message === 'string' &&
        error.response === undefined &&
        error.errors !== undefined
      ) {
        throw error;
      }

      // Log the full error for debugging
      console.error('Login API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Extract error message from Laravel response
      const errorData = error.response?.data || {};
      const rawApiMsg = errorData.message;
      const message =
        (typeof rawApiMsg === 'string' && rawApiMsg.trim()) ||
        (Array.isArray(rawApiMsg) && rawApiMsg[0] != null && String(rawApiMsg[0]).trim()) ||
        (typeof error.message === 'string' && error.message.trim()) ||
        'Login failed';

      throw {
        message,
        errors: errorData.errors || {},
        status: error.response?.status,
        response_code:
          typeof errorData.response_code === 'number' ? errorData.response_code : undefined,
        data: mergeLoginFailurePayload(errorData as Record<string, unknown>),
      } as ApiError;
    }
  },

  /**
   * Verify OTP after signup
   * POST /api/otp_verification
   */
  verifyOtp: async (email: string, otp: string): Promise<OtpVerificationResponse> => {
    try {
      const response = await apiClient.post('/otp_verification', { email, otp });
      const data = response.data;
      
      // Store auth token in cookies - use user data from OTP verification response
      if (data.status && data.data?.token) {
        // Store token in cookies (30 days expiration)
        setCookie('auth_token', data.data.token, 30);
        setCookie('isAuthenticated', 'true', 30);
        // Also store in localStorage for backward compatibility during migration
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Extract user data from OTP verification response
        const user = data.data?.user || data.user;
        console.log('=== OTP VERIFICATION DEBUG ===');
        console.log('Full response data:', data);
        console.log('User from data.data.user:', data.data?.user);
        console.log('User from data.user:', data.user);
        console.log('Final user object:', user);
        console.log('User name:', user?.name);
        console.log('=============================');
        
        if (user && user.name) {
          if (typeof window !== 'undefined') {
            console.log('OTP Verification: Dispatching userLoggedIn event with user:', user);
            const event = new CustomEvent('userLoggedIn', { detail: { user } });
            window.dispatchEvent(event);
            console.log('OTP Verification: Event dispatched, user name:', user.name);
          }
        } else {
          console.warn('OTP Verification: No user data or name in response, attempting to fetch profile...');
          // Try to fetch profile if user data not in response
          try {
            const profileResponse = await userAPI.getProfile();
            const profileUser = profileResponse.data?.user || profileResponse.user;
            if (profileUser && profileUser.name) {
              console.log('OTP Verification: Fetched user profile:', profileUser);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: profileUser } }));
              }
            }
          } catch (profileError: any) {
            if (profileError.response?.status !== 404) {
              console.error('OTP Verification: Failed to fetch profile:', profileError);
            }
          }
        }
      }
      
      return data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'OTP verification failed',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Verify 2FA OTP after sign-in (when two_factor_status is on)
   * POST /api/sign-in-verify-otp
   */
  signInVerifyOtp: async (email: string, otp: string): Promise<OtpVerificationResponse> => {
    try {
      const response = await apiClient.post('/sign-in-verify-otp', { email, otp });
      const data = response.data;

      if (data.status && data.data?.token) {
        setCookie('auth_token', data.data.token, 30);
        setCookie('isAuthenticated', 'true', 30);
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('isAuthenticated', 'true');

        const user = data.data?.user || data.user;
        if (user && user.name && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        }
      }

      return data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Invalid or expired OTP. Please try again.',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Resend OTP
   * POST /api/resend-otp-verification
   */
  resendOtp: async (email: string): Promise<{ message?: string; errors?: Record<string, string[]> }> => {
    try {
      const response = await apiClient.post('/resend-otp-verification', { email });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to resend OTP',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get email for forgot password
   * POST /api/forgot-email
   */
  forgotEmail: async (email: string): Promise<ForgotEmailResponse> => {
    try {
      const response = await apiClient.post('/forgot-email', { email });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to send OTP',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Verify OTP for forgot password
   * POST /api/forgot-email-otp-verification
   */
  verifyForgotPasswordOtp: async (email: string, otp: string): Promise<{ message?: string; errors?: Record<string, string[]> }> => {
    try {
      const response = await apiClient.post('/forgot-email-otp-verification', { email, otp });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'OTP verification failed',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Update password after OTP verification
   * POST /api/forgot-password-update
   * This is called after OTP verification to update the password
   */
  forgotPasswordUpdate: async (email: string, newPassword: string): Promise<{ message?: string; errors?: Record<string, string[]> }> => {
    try {
      const payload: { email: string; newPassword: string } = { 
        email,
        newPassword
      };
      const response = await apiClient.post('/forgot-password-update', payload);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Password update failed',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Logout user (protected route)
   * POST /api/logout
   */
  logout: async () => {
    try {
      const response = await apiClient.post('/logout');
      // Clear auth cookies and localStorage
      removeCookie('auth_token');
      removeCookie('isAuthenticated');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('isAuthenticated');
      }
      return response.data;
    } catch (error: any) {
      // Clear cookies even if logout API fails
      removeCookie('auth_token');
      removeCookie('isAuthenticated');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('isAuthenticated');
      }
      throw {
        message: error.response?.data?.message || 'Logout failed',
      } as ApiError;
    }
  },
};

/** In-app notifications (company-api) — matches NotifactionController */
export interface CompanyNotification {
  id: number | string;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  /** 0 = unread, 1 = read (viewed single), 2 = bulk / archived (API may send number or string) */
  status?: number | string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export const notificationAPI = {
  /**
   * GET /fetch-notifaction — list notifications for current user + company
   */
  fetchList: async (): Promise<CompanyNotification[]> => {
    try {
      const response = await apiClient.get('/fetch-notifaction');
      const raw = response.data?.data ?? response.data;
      if (Array.isArray(raw)) return raw as CompanyNotification[];
      return [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load notifications',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /view-notifaction-update — mark one notification (body: { id })
   */
  markViewed: async (id: number | string): Promise<void> => {
    try {
      await apiClient.post('/view-notifaction-update', { id });
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update notification',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /view-all-notifaction — marks unread (status 0) as status 2
   */
  markAllViewed: async (): Promise<void> => {
    try {
      await apiClient.post('/view-all-notifaction', {});
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update notifications',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// User Profile API
export const userAPI = {
  /**
   * Get current user profile
   * GET /api/profile-list
   * Response structure: { status: true, response_code: 200, message: "...", data: { ...user... } }
   */
  getProfile: async (): Promise<{ data?: any; user?: any; status?: boolean }> => {
    try {
      const response = await apiClient.get('/profile-list');
      
      // Handle response structure: { status: true, response_code: 200, message: "...", data: { ...user... } }
      if (response.data?.status && response.data?.data) {
        // Return data in a format that UserContext expects
        return {
          status: response.data.status,
          data: response.data.data, // User data is directly in data
          user: response.data.data, // Also provide as user for compatibility
        };
      }
      
      // Fallback for other response structures
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const apiError: ApiError & { status?: number } = {
        message: error.response?.data?.message || (status === 500 ? 'Server error loading profile' : 'Failed to fetch profile'),
        errors: error.response?.data?.errors || {},
        status,
      };
      throw apiError;
    }
  },

  /**
   * Update user profile
   * POST /api/profile-update (or any method as per Route::any)
   */
  updateProfile: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      let formData: FormData;
      if (data instanceof FormData) {
        formData = data;
      } else {
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
      }

      const response = await apiClient.post('/profile-update', formData, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update profile',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Update user password
   * POST /api/password-update
   */
  updatePassword: async (currentPassword: string, newPassword: string, passwordConfirmation: string): Promise<any> => {
    try {
      const response = await apiClient.post('/password-update', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation,
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update password',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /my-accessible-menus — Next.js sidebar: nested menus, flat list, effective permissions by slug.
   * Call after login and whenever company-user permissions change.
   */
  getMyAccessibleMenus: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/my-accessible-menus');
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to load accessible menus');
      }
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch accessible menus',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },
};

// Master Data API - CRUD operations for projects, companies, materials, etc.
export const masterDataAPI = {
  // Projects - Matching Laravel routes
  getProjectsList: async (): Promise<any[]> => masterDataAPI.getProjects(),
  // Route: GET /project-list -> projectlist()
  getProjects: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/project-list');
      
      // Handle response structure: { status: true, response_code: 200, message: "...", data: [...] }
      let projects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        projects = response.data.data;
      } else if (Array.isArray(response.data)) {
        projects = response.data;
      }
      return projects;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || (error.response?.status === 500 ? 'Server error loading projects' : 'Failed to fetch projects'),
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: POST /project-add -> projectAdd()
  createProject: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      console.log('🔵 Calling POST /project-add API...');
      let formData: FormData;
      
      // If data is already FormData, use it directly
      if (data instanceof FormData) {
        formData = data;
        // Log FormData contents for debugging
        console.log('FormData contents:');
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
          } else {
            console.log(`  ${key}:`, value);
          }
        }
      } else {
        // Otherwise, convert to FormData
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
        console.log('Converted to FormData:', Object.fromEntries(formData.entries()));
      }

      console.log('Making POST request to /project-add...');
      const response = await apiClient.post('/project-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ /project-add response:', response.data);
      
      // Log Azure folder path if present - CRITICAL for blob storage operations
      // Backend API: POST /api/project-add creates folder and saves to projects.azure_folder_path
      // Path format: {company_azure_folder_path}/projects/{sanitized-project-name}_{project-uuid}
      const azureFolderPath = response.data?.data?.azure_folder_path || 
                              response.data?.azure_folder_path ||
                              response.data?.project?.azure_folder_path;
      
      if (azureFolderPath) {
        // Validate path format matches backend structure
        const pathParts = azureFolderPath.split('/');
        const isValidFormat = pathParts.length >= 3 && 
                             pathParts[pathParts.length - 2] === 'projects' &&
                             pathParts[pathParts.length - 1].includes('_');
        
        console.log('📁 ✅ Azure folder path created:', azureFolderPath);
        console.log('📁 Path details:', {
          fullPath: azureFolderPath,
          pathParts: pathParts,
          isValidFormat: isValidFormat,
          expectedFormat: '{company_azure_folder_path}/projects/{sanitized-name}_{project-uuid}',
          folderMarker: `${azureFolderPath}/.folder`,
          expectedLocation: 'Azure Blob Storage container: documents',
          databaseColumn: 'projects.azure_folder_path',
        });
        
        if (!isValidFormat) {
          console.warn('⚠️ Azure folder path format may be incorrect!');
          console.warn('  Expected: {company-path}/projects/{sanitized-name}_{uuid}');
          console.warn('  Actual:', azureFolderPath);
        }
      } else {
        console.error('❌ CRITICAL: Azure folder path NOT found in response!');
        console.error('Backend API: POST /api/project-add');
        console.error('Controller: App\\Http\\Controllers\\API\\ProjectController::projectAdd()');
        console.error('Database column: projects.azure_folder_path');
        console.error('Expected path format: {company_azure_folder_path}/projects/{sanitized-project-name}_{project-uuid}');
        console.error('Response structure:', {
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          dataDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
          fullResponse: JSON.stringify(response.data, null, 2),
        });
        console.warn('⚠️ File operations (upload, delete) will NOT work until azure_folder_path is set!');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ /project-add error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to create project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: POST /project-search -> projectSearch()
  searchProjects: async (searchQuery: string): Promise<any[]> => {
    try {
      console.log('🔍 Calling POST /project-search with query:', searchQuery);
      const response = await apiClient.post('/project-search', { search_keyword: searchQuery });
      console.log('✅ /project-search response:', response.data);
      
      // Handle response structure: { status: true, data: [...] } or direct array
      let projects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        projects = response.data.data;
      } else if (Array.isArray(response.data)) {
        projects = response.data;
      }
      
      console.log('✅ Extracted projects from search:', projects.length);
      return projects;
    } catch (error: any) {
      console.error('❌ /project-search error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to search projects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: GET /project-edit/{uuid} -> edit()
  getProject: async (uuid: string): Promise<any> => {
    try {
      const uuidParam = String(uuid).trim();
      console.log('📖 Calling GET /project-edit/' + uuidParam);
      console.log('Project UUID details:', {
        original: uuid,
        trimmed: uuidParam,
        length: uuidParam.length,
        type: typeof uuidParam
      });
      
      const response = await apiClient.get(`/project-edit/${encodeURIComponent(uuidParam)}`);
      console.log('✅ /project-edit response:', response.data);
      console.log('Response status:', response.status);
      
      // Handle response structure: { status: true, data: {...} } or direct object
      let result = null;
      
      if (response.data) {
        // Check if response has nested data structure
        if (response.data.data !== undefined) {
          result = response.data.data;
        } else if (response.data.status && response.data.data !== undefined) {
          result = response.data.data;
        } else {
          result = response.data;
        }
      }
      
      // If result is still null or empty, return empty object to avoid null errors
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0 && result.constructor === Object)) {
        console.warn('⚠️ Project data is null or empty in API response');
        result = {};
      }
      
      console.log('✅ Extracted project data:', result);
      return result;
    } catch (error: any) {
      console.error('❌ /project-edit error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateProject: async (uuid: string, data: FormData | Record<string, any>): Promise<any> => {
    try {
      let formData: FormData;
      
      // If data is already FormData, use it directly
      if (data instanceof FormData) {
        formData = data;
      } else {
        // Otherwise, convert to FormData
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
      }

      // POST /api/project-add is used for both create and update
      // Include projectUpdateId in FormData for updates
      // Note: uuid parameter is the projectUpdateId (numeric ID), not UUID
      if (!formData.has('projectUpdateId')) {
        formData.append('projectUpdateId', String(uuid));
      }

      const response = await apiClient.post('/project-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: POST /project-subproject -> projectSubproject()
  // Backend expects: { project_id } - numeric project ID (where('id', $request->project_id))
  // Returns: SubProjectResources collection - subprojects for the project (filtered by company_id)
  getProjectSubprojects: async (projectId: number | string): Promise<any[]> => {
    try {
      // Backend typically expects numeric project_id; sending UUID may cause 500
      const payload = { project_id: projectId };
      const isNumeric = projectId != null && !isNaN(Number(projectId)) && String(projectId).trim() !== '';
      if (!isNumeric) {
        console.warn('⚠️ /project-subproject: project_id may not be numeric. Backend expects numeric ID. Payload:', payload);
      }
      console.log('📦 Calling POST /project-subproject with payload:', payload);
      const response = await apiClient.post('/project-subproject', payload);
      console.log('✅ /project-subproject response:', response.data);

      // Backend returns: responseJson(true, 200, $message, SubProjectResources::collection($data))
      // Structure: { status: true, response_code: 200, message: '...', data: [...] }
      let subprojects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        subprojects = response.data.data;
      } else if (Array.isArray(response.data)) {
        subprojects = response.data;
      }

      console.log('✅ Extracted subprojects:', subprojects.length);
      return subprojects;
    } catch (error: any) {
      const status = error.response?.status;
      const errData = error.response?.data ?? {};
      const backendMsg = errData?.message ?? errData?.error ?? errData?.exception ?? (typeof errData === 'string' ? errData : errData?.message);
      const tryFallback = projectId != null && projectId !== '' && (!error.response || error.response?.status === 500 || error.response?.status === 404);
      if (tryFallback) {
        try {
          return await masterDataAPI.getSubprojects(projectId);
        } catch (fallbackErr: any) {
          const fallbackMsg = fallbackErr?.message ?? (typeof fallbackErr?.response?.data === 'string' ? fallbackErr.response.data : 'Unknown');
          console.error('❌ /project-subproject and fallback failed:', String(fallbackMsg));
        }
      } else {
        console.error('❌ /project-subproject error:', `status=${status ?? 'none'}`, `msg=${String(error?.message ?? 'unknown')}`, `projectId=${projectId}`);
      }
      throw {
        message: backendMsg || error.response?.data?.message || 'Failed to fetch project subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteProject: async (uuid: string): Promise<any> => {
    try {
      // Backend route: DELETE /projects/{uuid} or /project-delete/{uuid}
      // NOTE: Even though route parameter is named {uuid}, backend function likely uses:
      //   where('id', $uuid) - which queries the numeric 'id' column
      // So we need to pass the numeric ID, not the UUID
      const idParam = String(uuid).trim();
      console.log('🗑️ Calling DELETE /projects/' + idParam);
      console.log('Project ID details:', {
        original: uuid,
        trimmed: idParam,
        length: idParam.length,
        type: typeof idParam,
        isNumeric: !isNaN(Number(idParam)),
        note: 'Backend queries numeric id column, not uuid column'
      });
      
      // Try both possible routes - /projects/{id} and /project-delete/{id}
      let response;
      try {
        // First try /project-delete/{id} (more specific route)
        response = await apiClient.delete(`/project-delete/${encodeURIComponent(idParam)}`);
        console.log('✅ /project-delete response:', response.data);
      } catch (firstError: any) {
        // If that fails, try /projects/{id}
        if (firstError.response?.status === 404) {
          console.log('⚠️ /project-delete not found, trying /projects/' + idParam);
          response = await apiClient.delete(`/projects/${encodeURIComponent(idParam)}`);
          console.log('✅ /projects response:', response.data);
        } else {
          throw firstError;
        }
      }
      
      console.log('✅ Project delete response:', response.data);
      console.log('Response status:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ /project-delete or /projects error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        url: error.config?.url,
        method: error.config?.method,
        uuid: uuid
      });
      
      throw {
        message: error.response?.data?.message || error.message || 'Failed to delete project',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  // Companies - Matching Laravel routes
  // Route: GET /companies-list -> companiesList()
  getCompanies: async (): Promise<any[]> => {
    try {
      console.log('🔵 Calling GET /companies-list API...');
      const response = await apiClient.get('/companies-list');
      console.log('✅ /companies-list response:', response.data);
      console.log('Response structure:', {
        status: response.data?.status,
        response_code: response.data?.response_code,
        message: response.data?.message,
        dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'not array',
        isDataArray: Array.isArray(response.data),
      });
      
      // Handle response structure: { status: true, response_code: 200, message: "...", data: [...] }
      let companies: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        companies = response.data.data;
        console.log('✅ Extracted companies from response.data.data:', companies.length);
      } else if (Array.isArray(response.data)) {
        companies = response.data;
        console.log('✅ Using response.data as array:', companies.length);
      } else if (response.data?.companies && Array.isArray(response.data.companies)) {
        companies = response.data.companies;
        console.log('✅ Extracted companies from response.data.companies:', companies.length);
      } else {
        console.warn('⚠️ Unexpected response structure:', response.data);
        companies = [];
      }
      
      console.log('📦 Returning companies:', companies.length);
      return companies;
    } catch (error: any) {
      console.error('❌ /companies-list API error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch companies',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getCompaniesHierarchy: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/companies-hierarchy');
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch companies hierarchy',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Companies - Matching Laravel routes
  // Route: POST /companies-add -> companiesAdd()
  createCompany: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      let formData: FormData;
      
      // If data is already FormData, use it directly
      if (data instanceof FormData) {
        formData = data;
      } else {
        // Otherwise, convert to FormData
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
      }

      console.log('📝 Calling POST /companies-add');
      const response = await apiClient.post('/companies-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ /companies-add response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /companies-add error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to create company',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: POST /companies-search -> companiesSearch()
  searchCompanies: async (searchQuery: string): Promise<any[]> => {
    try {
      console.log('🔍 Calling POST /companies-search with query:', searchQuery);
      const response = await apiClient.post('/companies-search', { search_keyword: searchQuery });
      console.log('✅ /companies-search response:', response.data);
      
      // Handle response structure: { status: true, data: [...] } or direct array
      let companies: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        companies = response.data.data;
      } else if (Array.isArray(response.data)) {
        companies = response.data;
      }
      
      console.log('✅ Extracted companies from search:', companies.length);
      return companies;
    } catch (error: any) {
      console.error('❌ /companies-search error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to search companies',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  // Route: GET /companies-edit/{uuid} -> edit()
  // Note: Laravel edit() uses where('id', $uuid) - pass numeric id for the route param
  getCompany: async (idOrUuid: string): Promise<any> => {
    try {
      const param = String(idOrUuid).trim();
      console.log('📖 Calling GET /companies-edit/' + param);
      
      const response = await apiClient.get(`/companies-edit/${encodeURIComponent(param)}`);
      console.log('✅ /companies-edit response:', response.data);
      
      // Handle response: { status, response_code, message, data: CompaniesResources }
      let result = response.data?.data ?? response.data ?? null;
      
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
        console.warn('⚠️ Company data is null or empty in API response');
        result = {};
      }
      
      console.log('✅ Extracted company data:', result);
      return result;
    } catch (error: any) {
      console.error('❌ /companies-edit error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        param: idOrUuid
      });
      
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           error.message || 
                           'Failed to fetch company details';
      
      throw {
        message: errorMessage,
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },
  updateCompany: async (uuid: string, data: FormData | Record<string, any>): Promise<any> => {
    try {
      let formData: FormData;
      
      // If data is already FormData, use it directly
      if (data instanceof FormData) {
        formData = data;
      } else {
        // Otherwise, convert to FormData
        formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
      }
      
      // Add updateId to FormData for updates (similar to subprojects pattern)
      formData.append('updateId', uuid);
      
      console.log('📝 Calling POST /companies-add (update) with updateId:', uuid);
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      // Use POST /companies-add with updateId parameter (similar to subprojects)
      const response = await apiClient.post('/companies-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ /companies-add (update) response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /companies-add (update) error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        errors: error.response?.data?.errors,
        uuid: uuid,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Extract detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Failed to update company';
      
      // Extract validation errors if present
      const validationErrors = error.response?.data?.errors || {};
      
      throw {
        message: errorMessage,
        errors: validationErrors,
        status: error.response?.status,
        response: error.response?.data
      } as ApiError;
    }
  },
  // Route: DELETE /companies-delete/{uuid} -> delete()
  deleteCompany: async (uuid: string): Promise<any> => {
    try {
      const uuidParam = String(uuid).trim();
      console.log('🗑️ Calling DELETE /companies-delete/' + uuidParam);
      console.log('Company UUID details:', {
        original: uuid,
        trimmed: uuidParam,
        length: uuidParam.length,
        type: typeof uuidParam
      });
      
      // URL encode the UUID to handle any special characters
      const deleteUrl = `/companies-delete/${encodeURIComponent(uuidParam)}`;
      console.log('🗑️ Delete URL:', deleteUrl);
      const response = await apiClient.delete(deleteUrl);
      console.log('✅ /companies-delete response:', response.data);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Backend returns 200 even when not found, so check the message
      const responseData = response.data;
      const message = responseData?.message || '';
      const deletedCount = responseData?.data || 0;
      
      console.log('🗑️ Delete response details:', {
        message: message,
        deletedCount: deletedCount,
        status: responseData?.status,
        responseCode: responseData?.response_code
      });
      
      // If message says "Companies Data Not Found" or deletedCount is 0, treat as error
      if (message.includes('Not Found') || deletedCount === 0) {
        const errorMsg = message || 'Company not found or could not be deleted';
        console.error('❌ Delete failed:', errorMsg);
        throw {
          message: errorMsg,
          errors: {},
          status: 404,
          response: responseData
        } as ApiError;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ /companies-delete error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        url: error.config?.url,
        method: error.config?.method,
        uuid: uuid
      });
      
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           error.message || 
                           'Failed to delete company';
      
      throw {
        message: errorMessage,
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
        response: error.response?.data
      } as ApiError;
    }
  },

  // Materials - Matching Laravel routes
  getMaterials: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/materials-list');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch materials',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createMaterial: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/materials-add', data);
      return response.data;
    } catch (error: any) {
      const errData = error.response?.data || {};
      const errMsg = errData.message || 'Failed to create material';
      const errs = errData.errors || {};
      const firstErr = typeof errs === 'object' && Object.keys(errs).length > 0
        ? Object.values(errs).flat().find((v: any) => v && String(v).trim())
        : undefined;
      const message = firstErr ? `${errMsg}: ${firstErr}` : errMsg;
      throw {
        message,
        errors: errs,
      } as ApiError;
    }
  },
  searchMaterials: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/materials-search', payload);
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search materials',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getMaterial: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/materials-edit/${uuid}`);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateMaterial: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/materials-add is used for both create and update
      // Include id/uuid/updateId for backend to identify update (Laravel backends vary)
      const updateData = {
        ...data,
        updateId: uuid,
        id: uuid,
        uuid: uuid,
      };
      const response = await apiClient.post('/materials-add', updateData);
      return response.data;
    } catch (error: any) {
      const errData = error.response?.data || {};
      const firstErr = errData.errors && typeof errData.errors === 'object'
        ? Object.values(errData.errors).flat().find((v: any) => v && String(v).trim())
        : null;
      const msg = firstErr || errData.message || 'Failed to update material';
      throw {
        message: msg,
        errors: errData.errors || {},
      } as ApiError;
    }
  },
  deleteMaterial: async (idOrUuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/materials-delete/${encodeURIComponent(idOrUuid)}`);
      return response.data;
    } catch (error: any) {
      const errData = error.response?.data || {};
      const msg = errData.message || error.message || 'Failed to delete material';
      throw {
        message: msg,
        errors: errData.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import materials from Excel/CSV
   * POST /api/materials-import
   * FormData: file only (xlsx, xls, csv; max 10MB)
   * Columns: name, class, unit, specification
   */
  importMaterials: async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/materials-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to import materials';
      const hint = status === 404 ? ' Backend endpoint /materials-import may not exist.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import materials opening stock from Excel/CSV
   * POST /api/materials-opening-stock-import
   * FormData: file, project, warehouses, opeing_stock_date
   * Columns: code, opening_qty
   */
  importMaterialsOpeningStock: async (params: {
    file: File;
    project: number | string;
    warehouses: number | string;
    opeing_stock_date: string;
  }): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('project', String(params.project));
      formData.append('warehouses', String(params.warehouses));
      formData.append('opeing_stock_date', params.opeing_stock_date);
      const response = await apiClient.post('/materials-opening-stock-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to import materials opening stock';
      const hint = status === 404 ? ' Backend endpoint /materials-opening-stock-import may not exist.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Materials History - Opening stock, history
  getMaterialsHistoryList: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/materials-history-list/');
      return response.data?.data ?? response.data ?? [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch materials history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  addMaterialsHistory: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/materials-history-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add materials history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  editMaterialsHistory: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/materials-history-edit', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to edit materials history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Available materials opening stock – GET/POST materials-available-opening-stock.
   * Filters: project_id, store_id (both applied with AND when provided).
   * Response: MaterialsAvailableOpeningStockResource[] with qty, material, project, store.
   */
  getMaterialsOpeningList: async (projectId?: number | string, storeId?: number | string): Promise<any> => {
    try {
      const payload: Record<string, any> = {};
      if (projectId) payload.project_id = projectId;
      if (storeId) payload.store_id = storeId;
      const response = await apiClient.post('/materials-available-opening-stock', payload);
      return response.data?.data ?? response.data ?? [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch materials opening list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  addMaterialOpeningStock: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/materials-opening-add', data);
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to add opening stock';
      const hint = status === 404 ? ' Backend endpoint /materials-opening-add may not exist. Add it to your Laravel backend.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Labours - Matching Laravel routes
  getLabours: async (params?: { per_page?: number }): Promise<any[]> => {
    try {
      const config = params?.per_page ? { params: { per_page: params.per_page } } : {};
      const response = await apiClient.get('/labour-list', config);
      const raw = response.data?.data ?? response.data;
      return Array.isArray(raw) ? raw : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch labours',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createLabour: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/labour-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchLabours: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/labour-search', payload);
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search labours',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getLabour: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/labour-edit/${uuid}`);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateLabourStatus: async (uuid: string, is_active: 0 | 1): Promise<any> => {
    try {
      const idParam = String(uuid).trim();
      console.log('🔄 Updating labour status - PATCH /labour-status/' + idParam, { is_active });
      const response = await apiClient.request({
        method: 'patch',
        url: `/labour-status/${encodeURIComponent(idParam)}`,
        data: { is_active },
      });
      console.log('✅ Labour status update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Labour status update error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to update labour status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateLabour: async (idOrUuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // Controller addLabour: Labour::find($request->updateId) - expects numeric id
      const updateData = { ...data, updateId: idOrUuid };
      const response = await apiClient.post('/labour-add', updateData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteLabour: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/labour-delete/${uuid}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Labour bulk import: POST /api/labour-import
   * FormData: file (required). xlsx, xls, csv; max 10MB.
   * Backend expects row 1 headers (e.g. Name, Category, Unit). Response: { data: { imported, total_rows, created, updated, message } }
   */
  importLabour: async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/labour-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to import labours',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Vendors - Matching Laravel routes
  getVendors: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/vendor-list');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch vendors',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getVendorTypeWiseList: async (type: 'supplier' | 'contractor'): Promise<any[]> =>
    masterDataAPI.getSupplierContractorList(type),
  getSupplierContractorList: async (type: 'supplier' | 'contractor' | 'both'): Promise<any[]> => {
    try {
      const response = await apiClient.post('/supplier-contractor-list', { type });
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch supplier/contractor list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createVendor: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/vendor-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchVendors: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/vendor-search', payload);
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search vendors',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getVendor: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/vendor-edit/${uuid}`);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateVendor: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/vendor-add is used for both create and update
      // Include updateId in data for updates
      const updateData = { ...data, updateId: uuid };
      const response = await apiClient.post('/vendor-add', updateData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteVendor: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/vendor-delete/${uuid}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Update vendor active status (activate/deactivate).
   * PATCH /api/vendor-status/{uuid} with body { is_active: 0|1 }
   * Backend uses uuidtoid($uuid, 'vendors') - must pass UUID in URL.
   */
  updateVendorStatus: async (uuid: string, is_active: 0 | 1): Promise<any> => {
    try {
      const response = await apiClient.request({
        method: 'patch',
        url: `/vendor-status/${encodeURIComponent(uuid)}`,
        data: { is_active },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update vendor status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import vendors from Excel/CSV
   * POST /api/vendor-import
   * FormData: file only (xlsx, xls, csv; max 10MB)
   * Columns: Name, Type, Gst No, Address, Contact Person Name, Contact Person Phone, Contact Person Email; optional UUID for updates
   */
  importVendor: async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/vendor-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to import vendors';
      const hint = status === 404 ? ' Backend endpoint /vendor-import may not exist.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Activities - Matching Laravel routes
  getActivities: async (projectId?: number | string, subprojectId?: number | string): Promise<{ data: any[]; message?: string }> => {
    try {
      const payload: any = {};
      if (projectId) {
        payload.project = projectId;
        payload.project_id = projectId; // Some backends expect project_id
      }
      if (subprojectId) {
        payload.subproject = subprojectId;
        payload.subproject_id = subprojectId; // Some backends expect subproject_id
      }
      
      // Use POST if payload has data, otherwise GET
      const response = Object.keys(payload).length > 0
        ? await apiClient.post('/activities-list', payload)
        : await apiClient.get('/activities-list');
      const data = response.data?.data ?? response.data ?? [];
      const message = response.data?.message;
      return { data: Array.isArray(data) ? data : [], message };
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activities',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getActivitiesFieldData: async (projectId: number | string, subprojectId?: number | string): Promise<any> => {
    try {
      const payload: any = { project_id: projectId };
      if (subprojectId) payload.subproject_id = subprojectId;
      const response = await apiClient.post('/activities-field-data', payload);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activities field data',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createActivity: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/activities-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchActivities: async (searchKeyword: string, projectId: number | string): Promise<any[]> => {
    try {
      const response = await apiClient.post('/activities-search', {
        search_keyword: searchKeyword,
        project: projectId
      });
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search activities',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getActivity: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/activities-edit/${uuid}`);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateActivity: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/activities-add is used for both create and update
      // Include updateId in data for updates
      const updateData = { ...data, updateId: uuid };
      const response = await apiClient.post('/activities-add', updateData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteActivity: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/activities-delete/${uuid}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import activities from Excel/CSV
   * POST /api/activities-import
   * FormData: file, project (ID), subproject (ID)
   */
  importActivities: async (file: File, projectId: number | string, subprojectId?: number | string): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project', String(projectId));
      if (subprojectId != null && subprojectId !== '') {
        formData.append('subproject', String(subprojectId));
      }
      const response = await apiClient.post('/activities-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to import activities';
      const hint = status === 404 ? ' Backend endpoint /activities-import may not exist.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Subprojects - Matching Laravel routes
  getSubprojects: async (projectId: number | string): Promise<any[]> => {
    try {
      console.log('📦 Calling POST /sub-project-list with project_id:', projectId);
      const response = await apiClient.post('/sub-project-list', { project_id: projectId });
      console.log('✅ /sub-project-list response:', response.data);
      
      // Handle response structure: { status: true, data: [...] } or direct array
      let subprojects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        subprojects = response.data.data;
      } else if (Array.isArray(response.data)) {
        subprojects = response.data;
      }
      
      console.log('✅ Extracted subprojects:', subprojects.length);
      return subprojects;
    } catch (error: any) {
      console.error('❌ /sub-project-list error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createSubproject: async (data: Record<string, any>): Promise<any> => {
    try {
      console.log('📝 Calling POST /sub-project-add with data:', data);
      const response = await apiClient.post('/sub-project-add', data);
      console.log('✅ /sub-project-add response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /sub-project-add error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to create subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchSubprojects: async (searchKeyword?: string, projectId?: number | string): Promise<any[]> => {
    try {
      const payload: Record<string, any> = searchKeyword ? { search_keyword: searchKeyword } : {};
      if (projectId) payload.project_id = projectId;
      console.log('🔍 Calling POST /sub-project-search with payload:', payload);
      const response = await apiClient.post('/sub-project-search', payload);
      console.log('✅ /sub-project-search response:', response.data);
      
      // Handle response structure: { status: true, data: [...] } or direct array
      let subprojects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        subprojects = response.data.data;
      } else if (Array.isArray(response.data)) {
        subprojects = response.data;
      }
      
      console.log('✅ Extracted search results:', subprojects.length);
      return subprojects;
    } catch (error: any) {
      console.error('❌ /sub-project-search error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to search subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getSubproject: async (uuid: string): Promise<any> => {
    try {
      // Route: GET /sub-project-edit/{uuid}
      // Backend uses UUID for the edit route
      const uuidParam = String(uuid).trim();
      console.log('📖 Calling GET /sub-project-edit/' + uuidParam);
      console.log('UUID type:', typeof uuid, 'UUID value:', uuidParam);
      
      const response = await apiClient.get(`/sub-project-edit/${encodeURIComponent(uuidParam)}`);
      console.log('✅ /sub-project-edit response:', response.data);
      console.log('Response status:', response.status);
      
      // Handle response structure: { status: true, data: {...} } or direct object
      const result = response.data?.data || response.data || {};
      console.log('✅ Extracted subproject data:', result);
      return result;
    } catch (error: any) {
      console.error('❌ /sub-project-edit error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params
      });
      
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch subproject',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },
  updateSubproject: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/sub-project-add is used for both create and update
      // Backend update function uses where('id', $updateId) which queries numeric id column
      // So we pass the numeric ID even though the parameter is named uuid
      const numericId = String(id).trim();
      const updateData = { ...data, updateId: numericId };
      console.log('📝 Calling POST /sub-project-add (update) with updateId:', numericId);
      console.log('Note: Backend queries numeric id column even though updateId parameter is named uuid');
      console.log('Update data:', updateData);
      const response = await apiClient.post('/sub-project-add', updateData);
      console.log('✅ /sub-project-add (update) response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /sub-project-add (update) error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to update subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteSubproject: async (uuid: string): Promise<any> => {
    try {
      console.log('🗑️ Calling DELETE /sub-project-delete/' + uuid);
      const response = await apiClient.delete(`/sub-project-delete/${uuid}`);
      console.log('✅ /sub-project-delete response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /sub-project-delete error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to delete subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /fetch-project-subproject - DPR project/subproject (returns 404 if not implemented)
   * DPR uses getProjects + getSubprojects instead - /project-list and /sub-project-list
   */
  async fetchProjectSubproject(data?: Record<string, any>): Promise<any> {
    const payload = data || {};
    const projectId = payload.project_id ?? payload.projectId;
    try {
      const response = await apiClient.post('/fetch-project-subproject', payload);
      const res = response.data;
      if (res?.data !== undefined) return res.data;
      if (Array.isArray(res)) return res;
      if (res?.projects !== undefined) return res.projects;
      if (res?.subProject !== undefined) return res.subProject;
      if (res?.subprojects !== undefined) return res.subprojects;
      return res ?? [];
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } } | undefined;
      if (err?.response?.status === 404) {
        if (projectId != null && projectId !== '') {
          return this.getSubprojects(projectId);
        }
        return this.getProjects();
      }
      const responseData = err?.response?.data;
      const message = (responseData && responseData.message) ? responseData.message : 'Failed to fetch project/subproject';
      const errors = (responseData && responseData.errors) ? responseData.errors : {};
      throw { message, errors } as ApiError;
    }
  },
  projectWiseSubprojectSearch: async (data: Record<string, any>): Promise<any[]> => {
    try {
      console.log('🔍 Calling POST /project-wise-subproject-search with payload:', data);
      const response = await apiClient.post('/project-wise-subproject-search', data);
      console.log('✅ /project-wise-subproject-search response:', response.data);
      
      // Handle response structure: { status: true, data: [...] } or direct array
      let subprojects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        subprojects = response.data.data;
      } else if (Array.isArray(response.data)) {
        subprojects = response.data;
      }
      
      console.log('✅ Extracted project-wise subproject search results:', subprojects.length);
      return subprojects;
    } catch (error: any) {
      console.error('❌ /project-wise-subproject-search error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to search subprojects by project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Units - Matching Laravel routes (loads all units from unit-list)
  getUnits: async (): Promise<any[]> => {
    try {
      const token = getAuthToken();
      console.log('📦 Fetching units - Token present:', !!token);
      console.log('📦 Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
      // Request all units from unit-list (per_page=9999 in case API paginates)
      const response = await apiClient.get('/unit-list', { params: { per_page: 9999 } });
      console.log('✅ Units API response:', response.data);
      console.log('✅ Response status:', response.status);
      // Extract units: { data: [...] } or { data: { data: [...] } } or paginated { data: [...], current_page }
      const rawUnits = response.data?.data ?? response.data ?? [];
      const units = Array.isArray(rawUnits) ? rawUnits : (rawUnits?.data ?? rawUnits?.units ?? []);
      console.log('✅ Extracted units array:', units);
      console.log('✅ Units count:', units.length);
      
      // Log unit details to verify they belong to the user
      if (units.length > 0) {
        console.log('📋 Units details:');
        units.forEach((unit: any, index: number) => {
          console.log(`  Unit ${index + 1}:`, {
            id: unit.id,
            uuid: unit.uuid,
            unit: unit.unit || unit.name,
            is_active: unit.is_active,
            is_active_type: typeof unit.is_active,
            company_id: unit.company_id,
            user_id: unit.user_id,
            created_by: unit.created_by
          });
        });
      }
      
      return units;
    } catch (error: any) {
      console.error('❌ Failed to fetch units:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to fetch units',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createUnitsBulk: async (items: Array<{ unit: string; unit_coversion?: string | null; unit_coversion_factor?: string | null }>): Promise<any> => {
    try {
      const payload = { f: items };
      console.log('📦 Creating units (bulk) - POST /unit-add');
      console.log('📦 Payload:', payload);
      const response = await apiClient.post('/unit-add', payload);
      console.log('✅ Unit bulk create API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit bulk create error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to create units',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk edit units — POST /unit-bulk-edit with body { f: [...] }.
   * Each row: id XOR uuid, plus unit, unit_coversion, unit_coversion_factor (Laravel UnitController::unitBulkEdit).
   */
  bulkEditUnits: async (
    items: Array<{
      id?: number;
      uuid?: string;
      unit: string;
      unit_coversion?: string | null;
      unit_coversion_factor?: string | null;
    }>
  ): Promise<any> => {
    try {
      const payload = { f: items };
      console.log('📦 Bulk editing units - POST /unit-bulk-edit');
      const response = await apiClient.post('/unit-bulk-edit', payload);
      console.log('✅ Unit bulk edit API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit bulk edit error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to update units',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createUnit: async (data: Record<string, any>): Promise<any> => {
    try {
      console.log('📦 Creating unit - POST /unit-add');
      console.log('📦 Payload:', data);
      const response = await apiClient.post('/unit-add', data);
      console.log('✅ Unit create API response:', response.data);
      // Return full response structure: { status, response_code, message, data }
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit create error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to create unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchUnits: async (searchKeyword?: string): Promise<any[]> => {
    try {
      console.log('🔍 Searching units - POST /unit-search');
      console.log('🔍 Search keyword:', searchKeyword);
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/unit-search', payload);
      console.log('✅ Unit search API response:', response.data);
      const units = response.data.data || response.data || [];
      console.log('✅ Extracted units from search:', units.length);
      return units;
    } catch (error: any) {
      console.error('❌ Unit search error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to search units',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getUnit: async (uuid: string): Promise<any> => {
    try {
      // Route: GET /unit-edit/{param} — Laravel UnitController::edit uses where('id', $param); pass numeric PK.
      const idParam = String(uuid).trim();
      console.log('📖 Fetching unit details - GET /unit-edit/' + idParam);
      console.log('📖 ID details:', {
        original: uuid,
        trimmed: idParam,
        isNumeric: !isNaN(Number(idParam)),
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam)
      });
      const response = await apiClient.get(`/unit-edit/${encodeURIComponent(idParam)}`, {
        // Also send id as query param so DevTools shows a request “payload”; path param is canonical for Laravel.
        params: { id: idParam },
      });
      console.log('✅ Unit edit API response:', response.data);
      const unitData = response.data.data || response.data || {};
      console.log('✅ Extracted unit data:', unitData);
      console.log('✅ Unit is_active status:', unitData.is_active);
      return unitData;
    } catch (error: any) {
      console.error('❌ Unit edit (get) error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to fetch unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateUnitStatus: async (uuid: string, is_active: 0 | 1): Promise<any> => {
    try {
      const idParam = String(uuid).trim();
      console.log('🔄 Updating unit status - PATCH /unit-status/' + idParam, { is_active });
      const response = await apiClient.request({
        method: 'patch',
        url: `/unit-status/${encodeURIComponent(idParam)}`,
        data: { is_active },
      });
      console.log('✅ Unit status update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit status update error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to update unit status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateUnit: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/unit-add is used for both create and update
      // Include updateId in data for updates
      console.log('📝 Updating unit - POST /unit-add (with updateId)');
      console.log('📝 Numeric ID (updateId):', uuid);
      console.log('📝 Update data (before adding updateId):', JSON.stringify(data, null, 2));
      console.log('📝 is_active value being sent:', data.is_active, 'Type:', typeof data.is_active);
      console.log('📝 Status change:', data.is_active === 1 ? 'ACTIVE' : 'INACTIVE/DISABLED');
      
      const updateData: Record<string, any> = {
        ...data,
        updateId: uuid,
      };
      if (data.is_active !== undefined) {
        updateData.is_active = Number(data.is_active);
      }
      
      console.log('📝 Final payload being sent:', JSON.stringify(updateData, null, 2));
      console.log('📝 Verifying is_active in payload:', updateData.is_active, 'Type:', typeof updateData.is_active);
      const response = await apiClient.post('/unit-add', updateData);
      console.log('✅ Unit update API response:', response.data);
      console.log('✅ Response data structure:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit update error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to update unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteUnit: async (uuid: string): Promise<any> => {
    try {
      // Note: Route parameter is named 'uuid' but backend uses where('id', $uuid) so it expects numeric ID
      const idParam = String(uuid).trim();
      console.log('🗑️ Deleting unit - DELETE /unit-delete/' + idParam);
      console.log('🗑️ ID details:', {
        original: uuid,
        trimmed: idParam,
        isNumeric: !isNaN(Number(idParam))
      });
      const response = await apiClient.delete(`/unit-delete/${encodeURIComponent(idParam)}`);
      console.log('✅ Unit delete API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Unit delete error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || 'Failed to delete unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Warehouses/Stores - Matching Laravel routes
  getWarehouses: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/store-list');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch warehouses',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getProjectWiseWarehouses: async (projectId: number | string): Promise<any[]> => {
    try {
      const response = await apiClient.post('/project-wise-store-list', { project_id: projectId });
      const data = response.data?.data ?? response.data;
      const arr = Array.isArray(data) ? data : (data?.data ?? data?.stores ?? data?.warehouses ?? []);
      return Array.isArray(arr) ? arr : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch project warehouses',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createWarehouse: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/store-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create warehouse',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchWarehouses: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/store-search', payload);
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search warehouses',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getWarehouse: async (id: string | number): Promise<any> => {
    try {
      // Route: GET /store-edit/{uuid}
      // Even though route parameter is named {uuid}, backend edit function uses where('id', $uuid)
      // which queries the numeric id column, so we pass the numeric ID
      const numericId = String(id).trim();
      console.log('📖 Calling GET /store-edit/' + numericId);
      console.log('ID type:', typeof id, 'ID value:', numericId);
      console.log('Note: Backend queries numeric id column even though route uses {uuid}');
      
      const response = await apiClient.get(`/store-edit/${encodeURIComponent(numericId)}`);
      console.log('✅ /store-edit response:', response.data);
      console.log('Response status:', response.status);
      
      return response.data.data || response.data || {};
    } catch (error: any) {
      console.error('❌ /store-edit error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch warehouse',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },
  updateWarehouse: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/store-add is used for both create and update
      // Include upadteId (note: typo in Laravel code) for updates
      // Route uses UUID for the updateId parameter
      const uuidParam = String(uuid).trim();
      console.log('📝 Updating warehouse - POST /store-add (with upadteId)');
      console.log('📝 UUID (upadteId):', uuidParam);
      console.log('📝 Update data (before adding upadteId):', JSON.stringify(data, null, 2));
      
      const updateData = { ...data, upadteId: uuidParam };
      console.log('📝 Final payload being sent:', JSON.stringify(updateData, null, 2));
      
      const response = await apiClient.post('/store-add', updateData);
      console.log('✅ /store-add (update) response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /store-add (update) error:', error);
      console.error('Error response:', error.response?.data);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to update warehouse',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteWarehouse: async (id: string | number): Promise<any> => {
    try {
      // Route: DELETE /store-delete/{uuid}
      // Even though route parameter is named {uuid}, backend delete function uses where('id', $uuid)
      // which queries the numeric id column, so we pass the numeric ID
      const numericId = String(id).trim();
      console.log('🗑️ Calling DELETE /store-delete/' + numericId);
      console.log('ID type:', typeof id, 'ID value:', numericId);
      console.log('Note: Backend queries numeric id column even though route uses {uuid}');
      
      const response = await apiClient.delete(`/store-delete/${encodeURIComponent(numericId)}`);
      console.log('✅ /store-delete response:', response.data);
      console.log('Response status:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ /store-delete error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to delete warehouse',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  // Assets/Equipments - Matching Laravel routes
  getAssetsEquipments: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/assets-list');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch assets/equipments',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createAssetEquipment: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/assets-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchAssetsEquipments: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/assets-search', payload);
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search assets/equipments',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getAssetEquipment: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/assets-edit/${uuid}`);
      return response.data.data || response.data || {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateAssetEquipment: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/assets-add is used for both create and update
      // Include updateId in data for updates
      const updateData = { ...data, updateId: uuid };
      const response = await apiClient.post('/assets-add', updateData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteAssetEquipment: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/assets-delete/${uuid}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Update asset/equipment active status (activate/deactivate).
   * PATCH /api/assets-status/{uuid} with body { is_active: 0|1 }
   * Backend uses uuidtoid($uuid, 'assets') - must pass UUID in URL.
   */
  updateAssetStatus: async (uuid: string, is_active: 0 | 1): Promise<any> => {
    try {
      const response = await apiClient.request({
        method: 'patch',
        url: `/assets-status/${encodeURIComponent(uuid)}`,
        data: { is_active },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update asset status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import assets/equipments/machinery via Excel/CSV
   * POST /api/assets-import
   * FormData: file (required), project (nullable), warehouses (nullable)
   * File: xlsx, xls, csv; max 10MB
   * Headers: Asset/Equipments/Machinery, Specification, Unit (optional UUID/ID for updates)
   * Response: { data: { imported, total_rows, created, updated, skipped, message } }
   */
  importAssetEquipment: async (file: File, project?: string, warehouses?: string): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (project) formData.append('project', project);
      if (warehouses) formData.append('warehouses', warehouses);
      const response = await apiClient.post('/assets-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to import assets';
      throw {
        message: msg,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Bulk import assets opening stock via Excel/CSV
   * POST /api/assets-opening-stock-import
   * FormData: file (required), project (nullable), warehouses (nullable), opeing_stock_date/opening_stock_date (nullable)
   * File: xlsx, xls, csv; max 10MB
   * Excel format: Code | Opening Qty (row 1 = headers)
   * Response: { data: { imported, total_rows, created, updated, failed, message } }
   */
  importAssetsOpeningStock: async (params: {
    file: File;
    project: number | string;
    warehouses: number | string;
    opening_stock_date?: string;
  }): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.project) formData.append('project', String(params.project));
      if (params.warehouses) formData.append('warehouses', String(params.warehouses));
      if (params.opening_stock_date) {
        formData.append('opeing_stock_date', params.opening_stock_date);
        formData.append('opening_stock_date', params.opening_stock_date);
      }
      const response = await apiClient.post('/assets-opening-stock-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Failed to import assets opening stock';
      const hint = status === 404 ? ' Backend endpoint /assets-opening-stock-import may not exist.' : '';
      throw {
        message: msg + hint,
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Available assets opening stock – GET/POST assets-available-opening-stock
   * Filters: project_id, store_id (nullable; both applied with AND when provided)
   * Response: AssetsOpeningStockResource[] with quantity (and sometimes qty/opening), asset, project, store
   */
  getAssetsOpeningStockList: async (projectId?: number | string, storeId?: number | string): Promise<any[]> => {
    try {
      const payload: Record<string, any> = {};
      if (projectId != null && projectId !== '') payload.project_id = projectId;
      if (storeId != null && storeId !== '') payload.store_id = storeId;
      const response = await apiClient.post('/assets-available-opening-stock', payload);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch assets opening stock list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Global Projects Stock - POST /inventory/inventory-report
   * Backend type: 'global-project-stock'
   * Request: { type: 'global-project-stock', item_type: 'materials'|'machines' }
   * Response: data.material or data.assets - array with code, name, specification, unit, project, total_inward
   */
  getGlobalStockReport: async (dataType: 'materials' | 'assets'): Promise<any[]> => {
    try {
      const itemType = dataType === 'materials' ? 'materials' : 'machines';
      const payload = { type: 'global-project-stock', item_type: itemType };
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const arr = dataType === 'materials' ? (data?.material ?? data?.materials ?? []) : (data?.assets ?? []);
      const list = Array.isArray(arr) ? arr : [];
      return list.filter((r: any) => (Number(r?.total_inward ?? r?.total_stock_qty ?? r?.qty ?? 0) > 0));
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return [];
      }
      throw {
        message: error.response?.data?.message || 'Failed to load global stock report',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Project Stock Statement - POST /inventory/inventory-report
   * Backend type: 'project-stock'
   * Request: { type: 'project-stock', project, store, item_type: 'materials'|'machines' }
   * Response: data.material or data.assets - class (materials only), code, name, specification, unit, total_inward, total_issue, available_stock
   */
  getProjectStockStatement: async (params: {
    projectId: string | number;
    storeId?: string | number;
    dataType: 'materials' | 'assets';
  }): Promise<any[]> => {
    try {
      const itemType = params.dataType === 'materials' ? 'materials' : 'machines';
      const payload: Record<string, any> = {
        type: 'project-stock',
        project: params.projectId,
        projectId: params.projectId,
        item_type: itemType,
      };
      if (params.storeId != null && params.storeId !== '') {
        payload.store = params.storeId;
        payload.storeId = params.storeId;
      }
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const arr = params.dataType === 'materials' ? (data?.material ?? data?.materials ?? []) : (data?.assets ?? []);
      return Array.isArray(arr) ? arr : [];
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return [];
      }
      throw {
        message: error.response?.data?.message || 'Failed to load project stock statement',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Work Progress Details - POST /inventory/inventory-report
   * type: 'work-details'
   * Required: project|projectId, date_from|dateForm, date_to|dateTo
   * Optional: subproject|subProjectId
   * Response: { activities, headerDetails } - activities: sl_no, activities, unit, est_qty, est_rate, est_amount, completed_qty, est_amount_completion, completion, balance_qty
   */
  getWorkProgressDetailsReport: async (params: {
    project?: string | number;
    projectId?: string | number;
    subproject?: string | number;
    subProjectId?: string | number;
    date_from?: string;
    dateForm?: string;
    date_to?: string;
    dateTo?: string;
  }): Promise<{ activities: any[]; headerDetails?: any }> => {
    try {
      const project = params.project ?? params.projectId;
      const dateFrom = (params.date_from ?? params.dateForm ?? '').slice(0, 10);
      const dateTo = (params.date_to ?? params.dateTo ?? '').slice(0, 10);
      if (!project || !dateFrom || !dateTo) return { activities: [], headerDetails: undefined };
      const payload: Record<string, unknown> = {
        type: 'work-details',
        project,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const sub = params.subproject ?? params.subProjectId;
      if (sub != null && sub !== '') payload.subproject = sub;
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const arr = data?.activities ?? data?.data ?? data;
      return {
        activities: Array.isArray(arr) ? arr : [],
        headerDetails: data?.headerDetails ?? data?.header_details,
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) return { activities: [] };
      throw {
        message: error.response?.data?.message || 'Failed to load work progress details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * DPR (Daily Progress Report) - POST /inventory/inventory-report
   * type: 'dprs'
   * Required: project|projectId, date|date_from|dateForm
   * Optional: userId|emp_id (filters by user)
   * Response: activities, material, labour, assets, historie, safetie - arrays with sl_no, etc.
   */
  getDPRReport: async (params: {
    project?: string | number;
    projectId?: string | number;
    date?: string;
    date_from?: string;
    dateForm?: string;
    userId?: string | number;
    emp_id?: string | number;
  }): Promise<{
    activities: any[];
    material: any[];
    labour: any[];
    assets: any[];
    historie: any[];
    safetie: any[];
    [key: string]: any;
  }> => {
    try {
      const project = params.project ?? params.projectId;
      const dateStr = (params.date ?? params.date_from ?? params.dateForm ?? '').slice(0, 10);
      if (!project || !dateStr) {
        return {
          activities: [],
          material: [],
          labour: [],
          assets: [],
          historie: [],
          safetie: [],
        };
      }
      const payload: Record<string, unknown> = {
        type: 'dprs',
        project,
        date: dateStr,
      };
      const empId = params.emp_id ?? params.userId;
      if (empId != null && empId !== '') payload.emp_id = empId;
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const toArr = (v: any) => (Array.isArray(v) ? v : []);
      return {
        activities: toArr(data?.activities),
        material: toArr(data?.material ?? data?.materials),
        labour: toArr(data?.labour ?? data?.labours),
        assets: toArr(data?.assets),
        historie: toArr(data?.historie ?? data?.hindrance ?? data?.hindrances),
        safetie: toArr(data?.safetie ?? data?.safety ?? data?.safeties),
        ...data,
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return {
          activities: [],
          material: [],
          labour: [],
          assets: [],
          historie: [],
          safetie: [],
        };
      }
      throw {
        message: error.response?.data?.message || 'Failed to load DPR report',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Resources Usage From DPR – By Date (single date)
   * type: 'resources-usage-from-dpr-date'
   * Required: project|projectId, subproject|subProjectId, date|dateForm
   * Response: { labour, material, assets }
   */
  getResourcesUsageFromDprDate: async (params: {
    project?: string | number;
    projectId?: string | number;
    subproject?: string | number;
    subProjectId?: string | number;
    date?: string;
    dateForm?: string;
  }): Promise<{ labour: any[]; material: any[]; assets: any[] }> => {
    try {
      const project = params.project ?? params.projectId;
      const subproject = params.subproject ?? params.subProjectId;
      const dateStr = (params.date ?? params.dateForm ?? '').slice(0, 10);
      if (!project || !subproject || !dateStr) {
        return { labour: [], material: [], assets: [] };
      }
      const payload = {
        type: 'resources-usage-from-dpr-date',
        project,
        subproject,
        date: dateStr,
      };
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const toArr = (v: any) => (Array.isArray(v) ? v : []);
      return {
        labour: toArr(data?.labour),
        material: toArr(data?.material ?? data?.materials),
        assets: toArr(data?.assets),
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return { labour: [], material: [], assets: [] };
      }
      throw {
        message: error.response?.data?.message || 'Failed to load resources usage by date',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Resources Usage From DPR – By Days (date range)
   * type: 'resources-usage-from-dpr-days'
   * Required: project|projectId, subproject|subProjectId, from_date|dateForm, to_date|dateTo
   * Response: { labour, material, assets }
   */
  getResourcesUsageFromDprDays: async (params: {
    project?: string | number;
    projectId?: string | number;
    subproject?: string | number;
    subProjectId?: string | number;
    from_date?: string;
    dateForm?: string;
    to_date?: string;
    dateTo?: string;
  }): Promise<{ labour: any[]; material: any[]; assets: any[] }> => {
    try {
      const project = params.project ?? params.projectId;
      const subproject = params.subproject ?? params.subProjectId;
      const fromStr = (params.from_date ?? params.dateForm ?? '').slice(0, 10);
      const toStr = (params.to_date ?? params.dateTo ?? '').slice(0, 10);
      if (!project || !subproject || !fromStr || !toStr) {
        return { labour: [], material: [], assets: [] };
      }
      const payload = {
        type: 'resources-usage-from-dpr-days',
        project,
        subproject,
        from_date: fromStr,
        to_date: toStr,
      };
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const toArr = (v: any) => (Array.isArray(v) ? v : []);
      return {
        labour: toArr(data?.labour),
        material: toArr(data?.material ?? data?.materials),
        assets: toArr(data?.assets),
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return { labour: [], material: [], assets: [] };
      }
      throw {
        message: error.response?.data?.message || 'Failed to load resources usage by days',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * Material Used Vs Store Issue - POST /inventory/inventory-report
   * type: 'material-used-vs-store-issue'
   * Compares store issue quantity vs DPR usage for materials.
   * Required: project|projectId, subproject|subProjectId, store|storeId, from_date|dateForm, to_date|dateTo
   * Response: material array with code, name, specification, unit, issue_qty, dpr_qty, variation
   */
  getMaterialUsedVsStoreIssue: async (params: {
    project?: string | number;
    projectId?: string | number;
    subproject?: string | number;
    subProjectId?: string | number;
    store?: string | number;
    storeId?: string | number;
    from_date?: string;
    dateForm?: string;
    to_date?: string;
    dateTo?: string;
  }): Promise<any[]> => {
    try {
      const project = params.project ?? params.projectId;
      const subproject = params.subproject ?? params.subProjectId;
      const store = params.store ?? params.storeId;
      const fromStr = (params.from_date ?? params.dateForm ?? '').slice(0, 10);
      const toStr = (params.to_date ?? params.dateTo ?? '').slice(0, 10);
      if (!project || !subproject || !store || !fromStr || !toStr) {
        return [];
      }
      const payload = {
        type: 'material-used-vs-store-issue',
        project,
        subproject,
        store,
        from_date: fromStr,
        to_date: toStr,
      };
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const data = response.data?.data ?? response.data;
      const arr = data?.material ?? data?.materials ?? data ?? [];
      return Array.isArray(arr) ? arr : [];
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) return [];
      throw {
        message: error.response?.data?.message || 'Failed to load material used vs store issue report',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Project Allocation / Permissions API - company_project_permissions
// Base: /api/project-allocation-* | Auth: Bearer token, auth:company-api
export const projectAllocationAPI = {
  /** GET /project-allocation-list - List all project permissions */
  list: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/project-allocation-list');
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch project permissions',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /project-allocation-add-form - Projects and users for add form */
  getAddFormData: async (): Promise<{ projects: any[]; users: any[] }> => {
    try {
      const response = await apiClient.get('/project-allocation-add-form');
      const data = response.data?.data ?? response.data ?? {};
      return {
        projects: Array.isArray(data.projects) ? data.projects : [],
        users: Array.isArray(data.users) ? data.users : [],
      };
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch add form data',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** POST /project-allocation-add - Add project permission(s) */
  add: async (params: {
    project_id?: number;
    project_uuid?: string;
    user_allocation: number[];
    sub_project_id?: number | null;
  }): Promise<any> => {
    try {
      const payload: Record<string, any> = {
        user_allocation: params.user_allocation,
      };
      if (params.project_id != null) payload.project_id = params.project_id;
      if (params.project_uuid != null && params.project_uuid !== '') payload.project_uuid = params.project_uuid;
      if (params.sub_project_id != null) payload.sub_project_id = params.sub_project_id;
      const response = await apiClient.post('/project-allocation-add', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add project permission',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /project-allocation-edit/{uuid} - Edit form data by project UUID */
  getEditFormData: async (projectUuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/project-allocation-edit/${encodeURIComponent(projectUuid)}`);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch project allocation data',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /project-allocation-project-filter/{uuid} - Subprojects for a project */
  getSubprojects: async (projectUuid: string): Promise<any[]> => {
    try {
      const response = await apiClient.get(`/project-allocation-project-filter/${encodeURIComponent(projectUuid)}`);
      const data = response.data?.data ?? response.data ?? {};
      const list = data.subprojects ?? data.sub_projects ?? [];
      return Array.isArray(list) ? list : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** DELETE /project-allocation-delete/{id} - Delete permission by company_project_permissions.id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/project-allocation-delete/${id}`);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete project permission',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

/** PR Approval — project ↔ user allocation (company_users.id per project). */
const PR_APPROVAL_ADD_PATH =
  process.env.NEXT_PUBLIC_PR_APPROVAL_ADD_PATH?.replace(/^\/+/, '') ?? 'pr-approval-add';

const PR_LIST_PATH = process.env.NEXT_PUBLIC_PR_LIST_PATH?.replace(/^\/+/, '') ?? 'pr-list';

const PR_DETAILS_PATH = process.env.NEXT_PUBLIC_PR_DETAILS_PATH?.replace(/^\/+/, '') ?? 'pr-details';

const PR_APPROVE_PATH =
  process.env.NEXT_PUBLIC_PR_APPROVE_PATH?.replace(/^\/+/, '') ?? 'pr-approve';

const PR_REJECT_PATH =
  process.env.NEXT_PUBLIC_PR_REJECT_PATH?.replace(/^\/+/, '') ?? 'pr-reject';

/**
 * Company web ajax: `POST|PUT /company/ajax/company-custome-update-status`
 * Body: uuid, find=material_requests, getUrl=company, title=pr_status, status=1|2, CSRF.
 */
const COMPANY_PR_STATUS_PATH =
  process.env.NEXT_PUBLIC_COMPANY_PR_STATUS_PATH?.replace(/^\/+/, '') ?? 'ajax/company-custome-update-status';

export const prApprovalAPI = {
  /**
   * GET /api/pr-list (or /api/v1/pr-list if `NEXT_PUBLIC_PR_LIST_PATH` is set).
   * Response: array of PR summaries (uuid, request_id, status, status_label, project fields, dates, …).
   */
  list: async (): Promise<unknown> => {
    try {
      const response = await apiClient.get(`/${PR_LIST_PATH}`);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to load PR list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /api/pr-details/{uuid} — full PR with material_request_details lines.
   */
  details: async (uuid: string): Promise<unknown> => {
    try {
      const response = await apiClient.get(
        `/${PR_DETAILS_PATH}/${encodeURIComponent(String(uuid).trim())}`
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to load PR details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /api/pr-approve — body `{ uuid }` (override path with `NEXT_PUBLIC_PR_APPROVE_PATH`).
   */
  approve: async (uuid: string): Promise<unknown> => {
    try {
      const response = await apiClient.post(
        `/${PR_APPROVE_PATH}`,
        { uuid: String(uuid).trim() },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to approve purchase request',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /api/pr-reject — body `{ uuid }` (override path with `NEXT_PUBLIC_PR_REJECT_PATH`).
   */
  reject: async (uuid: string): Promise<unknown> => {
    try {
      const response = await apiClient.post(
        `/${PR_REJECT_PATH}`,
        { uuid: String(uuid).trim() },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to reject purchase request',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /api/pr-approval-add (or /api/v1/pr-approval-add if `NEXT_PUBLIC_PR_APPROVAL_ADD_PATH` is set).
   * Body: `{ project_id, user_allocation: number[] }` — Bearer via apiClient.
   */
  add: async (params: {
    project_id: number;
    user_allocation: number[];
    /** If true, send `material_request_id` instead of `project_id` (same integer value). */
    useMaterialRequestId?: boolean;
  }): Promise<unknown> => {
    try {
      const body: Record<string, unknown> = {
        user_allocation: params.user_allocation,
      };
      if (params.useMaterialRequestId) {
        body.material_request_id = params.project_id;
      } else {
        body.project_id = params.project_id;
      }
      const response = await apiClient.post(`/${PR_APPROVAL_ADD_PATH}`, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to save PR approval allocation',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Safety API - Matching Laravel routes (SafetyController)
// safety-list: GET or POST, expects dprId (optionally projects_id, sub_projects_id)
export const safetyAPI = {
  getSafetyList: async (params?: {
    dprId?: string | number;
    projects_id?: string | number;
    sub_projects_id?: string | number;
    project_id?: string | number;
    subproject_id?: string | number;
  }): Promise<any[]> => {
    try {
      const p = params || {};
      const payload: Record<string, string | number> = {};
      if (p.dprId != null && p.dprId !== '') payload.dprId = p.dprId;
      if (p.projects_id != null || p.project_id != null) payload.projects_id = p.projects_id ?? p.project_id ?? '';
      if (p.sub_projects_id != null || p.subproject_id != null) payload.sub_projects_id = p.sub_projects_id ?? p.subproject_id ?? '';
      const response = await apiClient.post('/safety-list', payload);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch safety list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /safety-add — multipart/form-data (Bearer via apiClient).
   * Fields: name, date, details, remarks, dpr_id, projects_id; optional sub_projects_id;
   * optional company_users_id / company_user_id; optional id (update); file field img.
   * Do not set Content-Type manually — axios sets multipart boundary for FormData.
   */
  addSafety: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/safety-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add safety',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getSafety: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/safety-edit/${encodeURIComponent(uuid)}`);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch safety',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteSafety: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/safety-delete/${encodeURIComponent(id)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete safety',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Hinderance API - Matching Laravel routes (HinderanceController)
// hinderance-list: GET or POST, expects dprId (optionally projects_id, sub_projects_id)
export const hinderanceAPI = {
  getList: async (params?: {
    dprId?: string | number;
    projects_id?: string | number;
    sub_projects_id?: string | number;
  }): Promise<any[]> => {
    try {
      const p = params || {};
      const payload: Record<string, string | number> = {};
      if (p.dprId != null && p.dprId !== '') payload.dprId = p.dprId;
      if (p.projects_id != null) payload.projects_id = p.projects_id;
      if (p.sub_projects_id != null) payload.sub_projects_id = p.sub_projects_id;
      const response = await apiClient.post('/hinderance-list', payload);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch hinderance list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /hinderance-add — same multipart contract as safety-add; optional img.
   */
  add: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/hinderance-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add hinderance',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  get: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/hinderance-edit/${encodeURIComponent(uuid)}`);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch hinderance',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  delete: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/hinderance-delete/${encodeURIComponent(id)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete hinderance',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Activities History API - DPR activities (ActivityHistoryController)
export const activitiesHistoryAPI = {
  /** Load activities for a DPR. If DPR exists for today, returns activities with history; else all for project/subproject. */
  list: async (projectId: number | string, subprojectId: number | string | null): Promise<any[]> => {
    try {
      const response = await apiClient.post('/activities-history-list', {
        project_id: projectId,
        subproject_id: subprojectId ?? null,
      });
      const data = response.data?.data ?? response.data?.response ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activities history list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Add or update activity history entries for a DPR. Uses updateOrCreate on activities_id + dpr_id + company_id. */
  add: async (entries: Array<{
    activities_history_activities_id: number;
    activities_history_qty: number;
    activities_history_completion?: number;
    /** Always send (null when no contractor) — Laravel may require the key. */
    activities_history_vendors_id: number | null;
    /** Always send (empty string ok) — Laravel may require the key. */
    activities_history_remarkes: string;
    activities_history_img?: string; // base64
    activities_history_dpr_id?: number | null;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/activities-history-add', entries);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add activity history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Load activity data for editing. Returns activities filtered by DPR ID and activity IDs. */
  edit: async (dprId: number | string, activityIds: (number | string)[]): Promise<any[]> => {
    try {
      const ids = activityIds.map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10))).filter((n) => !isNaN(n));
      const nid = Number(dprId);
      // Backend variants: typo getActivites vs getActivities; snake_case dpr_id (matches fetch-dpr-history-edit).
      // No trailing slash — avoids duplicate route / proxy quirks.
      const response = await apiClient.post('/activities-history-edit', {
        dprId: nid,
        dpr_id: nid,
        getActivites: ids,
        getActivities: ids,
      });
      const data = response.data?.data ?? response.data?.response ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activity history for edit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Search activities by project/subproject. Used when choosing activities to add to a DPR.
   * Backend expects numeric project_id/subproject_id; send both param names for compatibility. */
  projectSearch: async (
    projectId: number | string,
    subprojectId?: number | string | null,
    searchKeyword?: string
  ): Promise<any[]> => {
    try {
      const payload: Record<string, any> = { project: projectId, project_id: projectId };
      if (subprojectId != null && subprojectId !== '') {
        payload.subproject = subprojectId;
        payload.subproject_id = subprojectId;
      }
      if (searchKeyword != null && searchKeyword.trim()) payload.search_keyword = searchKeyword.trim();
      const response = await apiClient.post('/activities-project-search', payload);
      const data = response.data?.data ?? response.data?.response ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search activities',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Labour History API - DPR labour usage (LabourHistoryController)
export const labourHistoryAPI = {
  /** Returns all labour history records for a DPR. */
  list: async (dprId: number | string): Promise<any[]> => {
    try {
      const response = await apiClient.get(`/labour-history-list/${encodeURIComponent(dprId)}`);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch labour history list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Creates/updates labour entries for a DPR. Uses updateOrCreate on labours_id + dpr_id. */
  add: async (entries: Array<{
    labours_id: number;
    dpr_id: number;
    qty: number;
    ot_qty?: number;
    activities_id?: number | null;
    vendors_id?: number | null;
    rate_per_unit: number;
    remarkes?: string;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/labour-history-add', entries);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add labour history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Returns labour records for a given DPR and labour IDs. Used when editing DPR labour section. */
  edit: async (dprId: number | string, labourIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/labour-history-edit/', {
        dprId,
        getLabour: labourIds,
      });
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch labour history for edit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Workforce API - Punch, Staff, Contractor (LabourController, etc.)
export const workforceAPI = {
  /**
   * Submit punch IN/OUT with photo and GPS
   * POST /labour-punch-submit (or /company/labour/punch/submit)
   * FormData: labour_id, punch_type (punch_in|punch_out), photo (file), latitude, longitude, accuracy?, altitude?, etc.
   */
  punchSubmit: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/labour-punch-submit', formData, { timeout: 60000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to submit punch',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Add new worker profile (Staff tab - New Worker Profile)
   * POST /user-management-add (or /company/userManagment/add)
   * FormData: name, project_id, designation, worker_type, profile_images
   */
  addWorkerProfile: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/user-management-add', formData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add worker profile',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Store contractor rate (vendor + category + daily_rate; optional labour_id from Labour master)
   * POST /labour-rates-store
   */
  /** @deprecated Prefer contractorLaborRatesAPI.create */
  storeRate: async (data: {
    vendor_id: number;
    category: string;
    daily_rate: number;
    overtime_rate?: number;
    labour_id?: number;
    effective_from?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/labour-rates-store', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to store rate',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

/** Contractor labour rates – form-options, CRUD (Laravel /contractor-labor-rates). */
export const contractorLaborRatesAPI = {
  formOptions: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/contractor-labor-rates/form-options');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load rate form options',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  list: async (params?: {
    project_id?: number | string;
    vendors_id?: number | string;
    labours_id?: number | string;
    is_active?: 0 | 1;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/contractor-labor-rates', { params: params ?? {} });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load contractor labour rates',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  get: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/contractor-labor-rates/${encodeURIComponent(uuid)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load rate',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  create: async (body: {
    vendors_id: number;
    labours_id: number;
    project_id: number;
    daily_rate_amount: number;
    daily_rate_unit: 'day' | 'hour';
    effective_from: string;
    overtime_rate_amount?: number;
    overtime_rate_unit?: 'day' | 'hour';
    hours_per_day?: number;
    currency_code?: string;
    notes?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/contractor-labor-rates', body);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to save contractor rate',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
        responseData: error.response?.data,
      } as ApiError;
    }
  },
};

/** Daily labour entries – resolve-rate, list, detail, submit. */
export const labourEntriesAPI = {
  resolveRate: async (params: {
    project_id: number | string;
    vendors_id: number | string;
    labours_id: number | string;
    work_date: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/labour-entries/resolve-rate', { params });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Could not resolve rate for this line',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
        responseData: error.response?.data,
      } as ApiError;
    }
  },

  list: async (params?: {
    work_date_from?: string;
    work_date_to?: string;
    project_id?: number | string;
    vendors_id?: number | string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/labour-entries', { params: params ?? {} });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load labour entries',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  get: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/labour-entries/${encodeURIComponent(uuid)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load labour entry',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  create: async (body: {
    work_date: string;
    project_id: number;
    vendors_id: number;
    labour_categories: Array<{
      labours_id: number;
      day_labour_count: number;
      /** Unit for day_labour_count (work quantity); distinct from rate day_unit */
      day_labour_count_unit?: 'day' | 'hour';
      overtime_hours?: number;
      /** Unit for overtime_hours quantity; distinct from rate ot_unit */
      overtime_quantity_unit?: 'day' | 'hour';
      daily_rate: number;
      day_unit: 'day' | 'hour';
      ot_rate: number;
      ot_unit: 'day' | 'hour';
      contractor_labor_rate_id?: number | null;
    }>;
    currency_code?: string;
    status?: string;
    notes?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/labour-entries', body);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to submit labour entry',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
        responseData: error.response?.data,
      } as ApiError;
    }
  },
};

/** Azure Face attendance – proxied to Laravel (base URL already includes /api). */
export const faceAttendanceAPI = {
  setup: async (body?: { company_id?: number }): Promise<any> => {
    try {
      const response = await apiClient.post('/face/setup', body ?? {});
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Face setup failed',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  enroll: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/face/enroll', formData, { timeout: 120000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Face enrollment failed',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** Replace enrollment (super-admin / manager on backend). Same multipart shape as enroll. */
  reEnroll: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/face/re-enroll', formData, { timeout: 120000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Face re-enrollment failed',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  check: async (params: {
    company_id: number | string;
    subject_type: 'company_user' | 'workforce_profile';
    subject_id: number | string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/face/check', { params });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Face check failed',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  attendees: async (params?: { company_id?: number | string }): Promise<any> => {
    try {
      const response = await apiClient.get('/face/attendees', { params: params ?? {} });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load attendees',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Multipart: company_id, photo, latitude, longitude, optional geo_accuracy, device_info,
   * optional client_punch_at (ISO-8601 UTC), client_timezone (IANA), client_utc_offset_minutes.
   * Backend should persist punch time from server now() and/or these client fields for correct wall clock.
   */
  punchIn: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/face/punch-in', formData, { timeout: 90000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Punch in failed',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  /** Same body as punchIn. */
  punchOut: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/face/punch-out', formData, { timeout: 90000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Punch out failed',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      } as ApiError;
    }
  },

  statusToday: async (params?: {
    company_id?: number | string;
    subject_type?: string;
    subject_id?: number | string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/face/status-today', { params: params ?? {} });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load today status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

export const attendanceReportAPI = {
  report: async (params: {
    company_id: number | string;
    date_from: string;
    date_to: string;
    project_id?: number | string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/attendance/report', { params });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load attendance report',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

export const workforceProfilesAPI = {
  /** Lightweight field worker profile (not full login). Multipart: company_id, name, project_id, worker_type (staff|own_labour), designation, email?, mobile?, profile_photo? */
  create: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/workforce-profiles', formData, { timeout: 60000 });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create workforce profile',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Assets History API - DPR asset/equipment usage (AssetsHistoryController)
export const assetsHistoryAPI = {
  /** Returns all asset history records for a DPR. POST assets-history-list with dpr_id in body */
  list: async (dprId: number | string): Promise<any[]> => {
    try {
      const response = await apiClient.post('/assets-history-list', { dpr_id: dprId });
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch assets history list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Creates/updates asset entries for a DPR. Uses updateOrCreate on assets_id + dpr_id. */
  add: async (entries: Array<{
    assets_id: number;
    dpr_id: number;
    qty: number;
    activities_id?: number | null;
    vendors_id?: number | null;
    rate_per_unit: number;
    remarkes?: string;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/assets-history-add', entries);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add assets history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Returns asset records for a given DPR and asset IDs. Used when editing DPR asset section. */
  edit: async (dprId: number | string, assetIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/assets-history-edit', {
        dprId,
        getAssets: assetIds,
      });
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch assets history for edit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Materials History API - DPR material consumption (MaterialsHistoryController)
// Backend uses fetch-dpr-history-edit + materials-history-edit for DPR materials (no materials-history-list/{dprId} route)
export const materialsHistoryAPI = {
  /** Creates/updates material consumption entries for a DPR. Uses updateOrCreate on materials_id + dpr_id + activities_id. */
  add: async (entries: Array<{
    materials_id: number;
    dpr_id: number;
    activities_id?: number | null;
    qty: number;
    remarkes?: string;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/materials-history-add', entries);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add materials history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Returns material records for a given DPR and material IDs. Used when editing DPR materials section. */
  edit: async (dprId: number | string, materialIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/materials-history-edit', {
        dprId,
        getMaterials: materialIds,
      });
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch materials history for edit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Returns opening stock of materials for a project or store. Used to see available materials before adding to DPR. */
  openingList: async (projectId?: number | string | null, storeId?: number | string | null): Promise<any[]> => {
    try {
      const payload: Record<string, any> = {};
      if (projectId != null && projectId !== '') payload.projectId = projectId;
      if (storeId != null && storeId !== '') payload.storeId = storeId;
      const response = await apiClient.post('/materials-opening-list', payload);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch materials opening list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// DPR API - Matching Laravel routes (DprController)
export const dprAPI = {
  /**
   * POST /dpr-exists-check — same company/user/project/date/subproject as dpr-add duplicate logic.
   * Body: project_id (or projects_id), date (Y-m-d), subproject_id (or sub_projects_id) optional.
   */
  existsCheckForDate: async (params: {
    project_id: number | string;
    date: string;
    subproject_id?: number | string | null;
  }): Promise<{
    dpr_exists: boolean;
    dpr_id: number | null;
    message?: string;
    date?: string;
    projects_id?: number;
    sub_projects_id?: number | null;
  }> => {
    try {
      const pid = Number(params.project_id);
      const dateStr = String(params.date).trim().slice(0, 10);
      const body: Record<string, unknown> = {
        project_id: pid,
        projects_id: pid,
        date: dateStr,
      };
      const rawSub = params.subproject_id;
      if (rawSub != null && rawSub !== '') {
        const sid = Number(rawSub);
        if (!Number.isNaN(sid)) {
          body.subproject_id = sid;
          body.sub_projects_id = sid;
        }
      }
      const response = await apiClient.post('/dpr-exists-check', body);
      const top = response.data as Record<string, unknown> | undefined;
      const inner = (top?.data ?? top?.response ?? top) as Record<string, unknown> | undefined;
      const dpr_exists = Boolean(inner?.dpr_exists);
      const dprRaw = inner?.dpr_id;
      const dpr_id =
        dprRaw != null && dprRaw !== ''
          ? Number(dprRaw)
          : null;
      return {
        dpr_exists,
        dpr_id: !Number.isNaN(dpr_id as number) ? (dpr_id as number) : null,
        message: typeof top?.message === 'string' ? (top.message as string) : undefined,
        date: inner?.date as string | undefined,
        projects_id: inner?.projects_id != null ? Number(inner.projects_id) : undefined,
        sub_projects_id:
          inner?.sub_projects_id != null && inner.sub_projects_id !== ''
            ? Number(inner.sub_projects_id)
            : null,
      };
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to check for existing DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getList: async (params?: { project?: number | string; subproject?: number | string; date?: string; userId?: number | string; emp_id?: number | string }): Promise<any[]> => {
    const toArray = (val: any): any[] => {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const arr = Object.values(val);
        if (arr.length > 0) return arr;
      }
      return [];
    };
    const parseResponse = (res: any): any[] => {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      const fromData = toArray((res as any)?.data ?? res);
      if (fromData.length > 0) return fromData;
      if (res?.data && typeof res.data === 'object') {
        const d = res.data;
        if (Array.isArray(d)) return d;
        const fromD = toArray(d?.data ?? d?.dprs ?? d?.list ?? d?.items);
        if (fromD.length > 0) return fromD;
      }
      if (Array.isArray(res?.response)) return res.response;
      if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
      const fromDataData = toArray(res?.data?.data);
      if (fromDataData.length > 0) return fromDataData;
      return [];
    };
    try {
      const response = await apiClient.get('/dpr-list', { params: params || {} });
      return parseResponse(response.data);
    } catch (e) {
      try {
        const response = await apiClient.post('/get-work-overview', params || {});
        return parseResponse(response.data);
      } catch (e2) {
        return [];
      }
    }
  },
  add: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/dpr-add', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  edit: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.get(`/dpr-edit/${encodeURIComponent(id)}`);
      return response.data?.data ?? response.data ?? [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getDetails: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.get(`/dpr-details/${encodeURIComponent(id)}`);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch DPR details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  delete: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/dpr-delete/${encodeURIComponent(id)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  dprCheck: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/dpr-check');
      return response.data?.data ?? response.data ?? [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch DPR check',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  dprHistoryEdit: async (data: { type: string; dprId: number }): Promise<any> => {
    try {
      // Send both dprId and dpr_id for backend compatibility (Laravel may expect snake_case)
      const payload = { ...data, dpr_id: data.dprId };
      const response = await apiClient.post('/fetch-dpr-history-edit', payload);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch DPR history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  dprHistoryUpdate: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/dpr-history-Update', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update DPR history',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  generatePDF: async (dprId: number | string): Promise<any> => {
    try {
      const response = await apiClient.post('/generate-pdf', { dpr: dprId });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to generate PDF',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Generate DPR PDF by project, date, emp_id (no dpr ID required). POST /generate-pdf with project, date, emp_id. */
  generatePDFByParams: async (params: {
    project: string | number;
    date: string;
    emp_id?: string | number;
  }): Promise<any> => {
    try {
      const payload: Record<string, unknown> = {
        project: params.project,
        date: params.date.slice(0, 10),
      };
      if (params.emp_id != null && params.emp_id !== '') payload.emp_id = params.emp_id;
      const response = await apiClient.post('/generate-pdf', payload);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to generate PDF',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Fetch PDF blob from dpr-pdf URL. Flow: GET /api/dpr-pdf/{token}?file={base64(filename)} returns file with Content-Disposition: inline */
  downloadPdfBlob: async (pdfUrl: string): Promise<Blob> => {
    const url = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL.replace(/\/$/, '')}${pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`}`;
    const response = await apiClient.get(url, { responseType: 'blob' });
    return response.data as Blob;
  },
  bulkAdd: async (formData: FormData): Promise<any> => {
    try {
      // Do NOT set Content-Type - let browser set multipart/form-data with boundary for file uploads
      const response = await apiClient.post('/dpr-bulk-add', formData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Azure Storage API - Matching Laravel AzureStorageController
export const azureStorageAPI = {
  /**
   * Upload files to Azure Blob Storage
   * POST /api/azure-storage/upload
   */
  upload: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/azure-storage/upload', formData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to upload to Azure',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get signed URL for private blob access
   * POST /api/azure-storage/get-signed-url
   */
  getSignedUrl: async (blob_path: string, expiry_minutes?: number): Promise<any> => {
    try {
      const response = await apiClient.post('/azure-storage/get-signed-url', {
        blob_path,
        expiry_minutes: expiry_minutes ?? 60,
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to get signed URL',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Create folder in Azure
   * POST /api/azure-storage/create-folder
   */
  createFolder: async (folder_path: string): Promise<any> => {
    try {
      const response = await apiClient.post('/azure-storage/create-folder', {
        folder_path,
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create folder',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get Azure configuration status
   * GET /api/azure-storage/status
   */
  status: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/azure-storage/status');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to get Azure status',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

/** Optional POST /documents/download body fields for DPR gallery + project-scoped blobs. */
export type DocumentDownloadSource = 'safety' | 'hinderance' | 'activity' | 'dms' | 'hindrance';

export interface DocumentDownloadOptions {
  /** DPR gallery only: safety | hinderance | activity — do not send for `dms` (normal AzureDocument download). */
  source?: DocumentDownloadSource;
  /** When set with blob path and no DMS uuid, Laravel resolves project Azure path (do not send uuid). */
  projectId?: number;
  /** If set, sent as full_path in addition to file_path. */
  fullPath?: string;
  /** Default 120000 for this request only (global apiClient timeout stays 30s). */
  timeoutMs?: number;
}

/** Only DPR gallery sources may be sent; `dms` and unknown values are omitted (standard DMS uuid download). */
function normalizeDocumentDownloadSource(source?: string): string | undefined {
  if (source == null || String(source).trim() === '') return undefined;
  const s = String(source).toLowerCase().trim();
  if (s === 'hindrance') return 'hinderance';
  if (s === 'safety' || s === 'hinderance' || s === 'activity') return s;
  return undefined;
}

/**
 * Laravel documents API group (Bearer `Authorization`, `scopes:company` on mobile/Next).
 *
 * Coverage: GET /documents; POST /documents/upload; POST /documents/folder; POST /documents/download;
 * DELETE /documents/delete; POST /documents/move-to-trash; GET /documents/trash; POST /documents/restore;
 * DELETE /documents/permanent-delete; POST /documents/share; GET /documents/shared;
 * DELETE /documents/unshare; GET /documents/team-members; GET /documents/gallery;
 * POST /documents/generate-public-link; POST /documents/revoke-public-link.
 * AI helpers live under /documents/ai/* — see `dmsAiService.ts` (context/upload/search) plus `/ai-agent/*` for chat sessions.
 *
 * Primary consumer: `components/DocumentManagement.tsx`. `deleteFile` is available for path-based hard delete when needed.
 */
export const documentAPI = {
  /**
   * Get documents
   * GET /api/documents
   * Supports search for recursive search in current folder + nested subfolders
   */
  getDocuments: async (params: {
    category: 'office' | 'project' | 'shared';
    project_id?: number;
    folder_uuid?: string;
    folder_path?: string;
    search?: string;
  }): Promise<any> => {
    try {
      // Verify token before making request
      const { getAuthToken } = require('./apiClient');
      const token = getAuthToken();
      console.log('📄 Calling /documents API with params:', params);
      console.log('📄 Auth token check:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      });
      
      const response = await apiClient.get('/documents', { params });
      console.log('✅ /documents API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ /documents API error:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers,
        hasAuthHeader: !!error.config?.headers?.Authorization,
      });
      throw {
        message: error.response?.data?.message || 'Failed to fetch documents',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
        response: error.response,
      } as ApiError;
    }
  },

  /**
   * Upload documents
   * POST /api/documents/upload
   */
  uploadDocuments: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to upload documents',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Create folder
   * POST /api/documents/folder
   */
  createFolder: async (data: {
    folder_name: string;
    category: 'office' | 'project';
    project_id?: number;
    subproject_id?: number;
    parent_folder_uuid?: string;
    folder_path?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/folder', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create folder',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Download document — POST /documents/download (Bearer auth).
   *
   * - **uuid**: DMS / shared row; optional **source** for DPR gallery; optional **project_id**.
   * - **projectId + path, no uuid**: project Azure blob / gallery composite id — sends **project_id**,
   *   **file_path**, **full_path** (same path unless `fullPath` set). Do not send uuid in this branch.
   * - **file_path only** (no uuid, no projectId): legacy `storage/app/public/`.
   *
   * Uses **timeoutMs** (default 120000) for this request only.
   */
  downloadDocument: async (
    file_path: string,
    original_name?: string,
    uuid?: string,
    options?: DocumentDownloadOptions
  ): Promise<Blob> => {
    const parseBlobError = async (data: any): Promise<string> => {
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          return json?.message || 'Failed to download document';
        } catch {
          return 'Failed to download document';
        }
      }
      return (data?.message as string) || 'Failed to download document';
    };

    const timeoutMs = options?.timeoutMs ?? 120000;
    const isValidUuid =
      typeof uuid === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());

    const projectIdRaw = options?.projectId != null ? Number(options.projectId) : NaN;
    const useProjectPath =
      Number.isFinite(projectIdRaw) &&
      projectIdRaw > 0 &&
      !isValidUuid;

    const body: Record<string, string> = {};
    if (original_name && String(original_name).trim()) {
      body.original_name = String(original_name).trim();
    }

    const src = normalizeDocumentDownloadSource(options?.source);
    if (src) body.source = src;

    if (useProjectPath) {
      const fp = (file_path && String(file_path).trim()) || '';
      if (!fp) {
        throw {
          message: 'Project download requires file_path (Azure / blob path)',
          errors: {},
        } as ApiError;
      }
      const full = (options?.fullPath && String(options.fullPath).trim()) || fp;
      body.project_id = String(Math.trunc(projectIdRaw));
      body.file_path = fp;
      body.full_path = full;
    } else if (isValidUuid) {
      const u = uuid!.trim();
      body.uuid = u;
      body.item_uuid = u;
      if (Number.isFinite(projectIdRaw) && projectIdRaw > 0) {
        body.project_id = String(Math.trunc(projectIdRaw));
      }
    } else {
      const fp = (file_path && String(file_path).trim()) || '';
      if (!fp) {
        throw {
          message: 'Download requires a DMS uuid, legacy file_path, or project_id + file_path',
          errors: {},
        } as ApiError;
      }
      body.file_path = fp;
      if (options?.fullPath && String(options.fullPath).trim()) {
        body.full_path = String(options.fullPath).trim();
      }
      if (Number.isFinite(projectIdRaw) && projectIdRaw > 0) {
        body.project_id = String(Math.trunc(projectIdRaw));
        if (!body.full_path) body.full_path = fp;
      }
    }

    try {
      const response = await apiClient.post('/documents/download', body, {
        responseType: 'blob',
        timeout: timeoutMs,
      });
      const blob = response.data as Blob;
      if (!blob || blob.size === 0) {
        throw new Error('Server returned empty file');
      }
      if (blob.type?.startsWith('application/json')) {
        const errMsg = await parseBlobError(blob);
        throw new Error(errMsg);
      }
      return blob;
    } catch (error: any) {
      const message =
        error.response?.data instanceof Blob
          ? await parseBlobError(error.response.data)
          : (error.response?.data?.message || error.message || 'Failed to download document');
      throw { message, errors: error.response?.data?.errors || {} } as ApiError;
    }
  },

  /**
   * Project-scoped path download — never sends uuid (Laravel requirement for this branch).
   */
  downloadDocumentByProjectPath: async (
    projectId: number,
    fullPath: string,
    original_name?: string,
    options?: Omit<DocumentDownloadOptions, 'projectId' | 'fullPath'>
  ): Promise<Blob> =>
    documentAPI.downloadDocument(fullPath, original_name, undefined, {
      ...options,
      projectId,
      fullPath: fullPath,
    }),

  /**
   * Delete file
   * DELETE /api/documents/delete
   */
  deleteFile: async (file_path: string): Promise<any> => {
    try {
      const response = await apiClient.delete('/documents/delete', {
        data: { file_path },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete file',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Share items
   * POST /api/documents/share
   */
  shareItems: async (data: {
    items: Array<{
      type: 'folder' | 'document';
      uuid: string;
      name: string;
      section: string;
      path?: string;
      projectId?: string;
      metadata?: any;
    }>;
    shared_with?: number[];
    is_public?: boolean;
    expires_in_days?: number;
    password?: string;
    email_addresses?: string[];
    email_message?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/share', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to share items',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get shared items
   * GET /api/documents/shared
   */
  getSharedItems: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/documents/shared');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch shared items',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Unshare item
   * DELETE /api/documents/unshare
   */
  unshareItem: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete('/documents/unshare', {
        data: { uuid },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to unshare item',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get team members
   * GET /api/documents/team-members
   */
  getTeamMembers: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/documents/team-members');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch team members',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Get trash items
   * GET /api/documents/trash
   */
  getTrash: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/documents/trash');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch trash',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Move items to trash
   * POST /api/documents/trash or /api/documents/move-to-trash
   */
  moveToTrash: async (uuids: string[]): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/move-to-trash', { item_uuids: uuids });
     return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to move to trash',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Restore items from trash
   * POST /api/documents/restore
   */
  restore: async (uuids: string[]): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/restore', { item_uuids: uuids });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to restore',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Permanently delete items from trash
   * DELETE /api/documents/permanent-delete
   */
  permanentDelete: async (uuids: string[]): Promise<any> => {
    try {
      const response = await apiClient.delete('/documents/permanent-delete', { data: { item_uuids: uuids } });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to permanently delete',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Generate a time-limited or passworded public link for a document (optional UI).
   * POST /api/documents/generate-public-link
   */
  generatePublicLink: async (data: {
    uuid?: string;
    item_uuid?: string;
    expires_in_days?: number;
    password?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/generate-public-link', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to generate public link',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Revoke a previously generated public link.
   * POST /api/documents/revoke-public-link
   */
  revokePublicLink: async (data: { uuid?: string; item_uuid?: string; token?: string }): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/revoke-public-link', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to revoke public link',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** Download by DMS / gallery uuid; forwards optional **source** and **projectId** for DPR gallery rows. */
  downloadDocumentByUuid: async (
    uuid: string,
    original_name?: string,
    options?: Omit<DocumentDownloadOptions, 'fullPath'>
  ): Promise<Blob> => documentAPI.downloadDocument('', original_name, uuid, options),

  /**
   * Get gallery images (aggregated DPR-linked + DMS gallery sources, paginated).
   * GET /api/documents/gallery
   * Query: project_id?, category?, page (≥1), per_page (1–100, default 24).
   */
  getGalleryImages: async (params?: {
    project_id?: number;
    category?: 'office' | 'project' | 'shared';
    page?: number;
    per_page?: number;
  }): Promise<any> => {
    try {
      const rawPage = params?.page != null ? Number(params.page) : 1;
      const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);
      let perPage = params?.per_page != null ? Number(params.per_page) : 24;
      if (!Number.isFinite(perPage)) perPage = 24;
      perPage = Math.min(100, Math.max(1, Math.floor(perPage)));
      const response = await apiClient.get('/documents/gallery', {
        params: { ...params, page, per_page: perPage },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch gallery images',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Common API - Countries, States, Cities
export interface Country {
  id: number;
  name: string;
  code?: string;
  phone_code?: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
}

export interface City {
  id: number;
  name: string;
  state_id: number;
}

export const commonAPI = {
  /**
   * Get list of countries
   * GET /api/get-country
   */
  getCountries: async (): Promise<Country[]> => {
    try {
      const response = await apiClient.get('/get-country');
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data?.countries && Array.isArray(response.data.countries)) {
        return response.data.countries;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch countries:', error);
      return [];
    }
  },

  /**
   * Get states by country
   * POST /api/get-states
   */
  getStates: async (countryId: number | string): Promise<State[]> => {
    try {
      const response = await apiClient.post('/get-states', { country_id: countryId });
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data?.states && Array.isArray(response.data.states)) {
        return response.data.states;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch states:', error);
      return [];
    }
  },

  /**
   * Get cities by state
   * POST /api/get-cities
   */
  getCities: async (stateId: number | string): Promise<City[]> => {
    try {
      const response = await apiClient.post('/get-cities', { state_id: stateId });
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data?.cities && Array.isArray(response.data.cities)) {
        return response.data.cities;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch cities:', error);
      return [];
    }
  },
};

// Teams / Staff API - Admin > User Management > Teams (TeamsController)
// Routes: teams-list, teams-add, teams-search, teams-edit/{uuid}, teams-details, teams-delete/{uuid}, teams-password-update/{uuid}, teams-chat, user-permission/{uuid}, add-user-permission (POST)
export const teamsAPI = {
  /**
   * GET /teams-list -> teamsList()
   */
  getTeamsList: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/teams-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch staff list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /role-list — legacy list (some screens still use it).
   * Prefer `roleManagementAPI.listRoles()` → GET /role-management for Role management UI parity with web.
   */
  getRoleList: async (): Promise<Array<{ id: string | number; name: string; slug?: string; company_id?: string | number }>> => {
    try {
      const response = await apiClient.get('/role-list');
      const raw = response.data?.data ?? response.data;
      if (!Array.isArray(raw)) return [];
      return raw.map((r: any) => ({
        id: r.id,
        name: String(r.name ?? ''),
        slug: r.slug != null ? String(r.slug) : undefined,
        company_id: r.company_id,
      }));
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch role list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /teams-add -> teamsAdd()
   */
  createOrUpdateStaff: async (formData: FormData | Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/teams-add', formData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to save staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /teams-search -> search()
   * Payload: { search_keyword?: string }
   */
  searchStaff: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
      const response = await apiClient.post('/teams-search', payload);
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /teams-edit/{uuid} -> edit()
   * Note: Backend uses where('id', $uuid) - pass numeric id
   */
  getStaff: async (idOrUuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/teams-edit/${encodeURIComponent(idOrUuid)}`);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /user-permission/{uuid} -> userPermission()
   * Load permission payload for the staff member before opening the permissions UI.
   */
  getUserPermission: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/user-permission/${encodeURIComponent(uuid)}`);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch user permissions',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /add-user-permission -> addUserPermission()
   * Body: { updateId: company_user id, permission?: Record<permission_id, string[]> }
   */
  addUserPermission: async (body: { updateId: number; permission: Record<string, string[]> }): Promise<any> => {
    try {
      const response = await apiClient.post('/add-user-permission', body);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Save failed');
      }
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to save user permissions',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /teams-details -> details()
   * Payload: { details_search_id: string|number }
   */
  getStaffDetails: async (detailsSearchId: string | number): Promise<any> => {
    try {
      const response = await apiClient.post('/teams-details', { details_search_id: detailsSearchId });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch staff details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * DELETE /teams-delete/{uuid} -> delete()
   * Note: Backend uses where('id', $uuid) - pass numeric id
   * Request body: { id: string }
   */
  deleteStaff: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/teams-delete/${encodeURIComponent(id)}`, {
        data: { id },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /teams-password-update/{uuid} -> teamsPasswordUpdate()
   */
  updatePassword: async (idOrUuid: string, passwordData: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post(`/teams-password-update/${encodeURIComponent(idOrUuid)}`, passwordData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update password',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * GET /teams-chat -> teamsChat()
   */
  getTeamsChat: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/teams-chat');
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch teams chat',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

/**
 * Laravel `/api/role-management/*` (RouteServiceProvider + `role-management` group, company Bearer token, etc.)
 *
 * | Method | Path | Purpose |
 * | GET | `/` | List roles (index) |
 * | GET | `/add/{id}` | Form payload for add/edit role |
 * | GET | `/add-permission/{id}` | Menus + current permissions for role |
 * | POST | `/add-permission` | Save permissions `{ updateId, permission }` |
 * | POST | `/add-role` | Create/update role `{ role, uuid? }` |
 * | GET | `/edit/{uuid}` | Role details for edit |
 * | DELETE | `/delete/{id}` | Delete role |
 *
 * **v1:** `NEXT_PUBLIC_ROLE_MANAGEMENT_API_BASE=v1/role-management`
 *
 * Do **not** `POST .../add-permission` with only `updateId` on open — it can clear assignments.
 */
const ROLE_MANAGEMENT_API_BASE = (
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ROLE_MANAGEMENT_API_BASE : undefined
)?.trim()
  .replace(/^\/+|\/+$/g, '') || 'role-management';

function roleManagementRoot(): string {
  return `/${ROLE_MANAGEMENT_API_BASE}`;
}

function roleManagementPath(segment: string): string {
  const s = segment.replace(/^\/+/, '');
  return `/${ROLE_MANAGEMENT_API_BASE}/${s}`;
}

function assertRoleManagementOk(data: any): void {
  if (data && typeof data === 'object' && 'status' in data && (data as { status?: boolean }).status === false) {
    throw new Error((data as { message?: string }).message || 'Request failed');
  }
}

/** JSON CRUD for company roles + permissions (mirrors web `/company/roleManagment`). */
export const roleManagementAPI = {
  /** GET /role-management — list roles for company (+ global roles). */
  listRoles: async (): Promise<
    Array<{ id: string | number; name: string; slug?: string; company_id?: string | number }>
  > => {
    try {
      const response = await apiClient.get(roleManagementRoot());
      let raw: unknown = response.data?.data ?? response.data;
      if (
        raw &&
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        'data' in raw &&
        Array.isArray((raw as { data: unknown }).data)
      ) {
        raw = (raw as { data: unknown[] }).data;
      }
      if (!Array.isArray(raw)) return [];
      return (raw as Record<string, unknown>[]).map((r) => ({
        id: r.id as string | number,
        name: String(r.name ?? ''),
        slug: r.slug != null ? String(r.slug) : undefined,
        company_id: r.company_id as string | number | undefined,
      }));
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch roles',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /role-management/add/{id} — `id` empty or `0` for new-role form. */
  getAddForm: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.get(roleManagementPath(`add/${encodeURIComponent(String(id))}`));
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load role form',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /role-management/edit/{uuid} */
  getEditRole: async (uuid: string | number): Promise<any> => {
    try {
      const response = await apiClient.get(roleManagementPath(`edit/${encodeURIComponent(String(uuid))}`));
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch role',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * POST /role-management/add-role — create `{ role }` or update `{ role, uuid }` (uuid = role id per Laravel).
   */
  addRole: async (payload: { role: string; uuid?: string | number }): Promise<any> => {
    try {
      const body: Record<string, unknown> = { role: payload.role };
      if (payload.uuid != null && String(payload.uuid).trim() !== '') {
        body.uuid = payload.uuid;
      }
      const response = await apiClient.post(roleManagementPath('add-role'), body);
      assertRoleManagementOk(response.data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to save role',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** DELETE /role-management/delete/{id} */
  deleteRole: async (id: string | number): Promise<void> => {
    try {
      const response = await apiClient.delete(roleManagementPath(`delete/${encodeURIComponent(String(id))}`));
      assertRoleManagementOk(response.data);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to delete role',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

export const rolePermissionsAPI = {
  /** Load matrix: **GET only** — Laravel route `add-permission/{id}` allows GET/HEAD, not POST. */
  getRolePermission: async (roleId: number): Promise<any> => {
    const id = encodeURIComponent(String(roleId));
    const pathWithId = roleManagementPath(`add-permission/${id}`);
    const unwrap = (response: { data?: any }) => response.data?.data ?? response.data;

    try {
      const response = await apiClient.get(pathWithId);
      return unwrap(response);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch role permissions',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  addRolePermission: async (body: { updateId: number; permission: Record<string, string[]> }): Promise<any> => {
    try {
      const response = await apiClient.post(roleManagementPath('add-permission'), body);
      assertRoleManagementOk(response.data);
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Save failed');
      }
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to save role permissions',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Material Request APIs - Inventory > Purchase Request
// Backend: materials-request-list (GET/POST), materials-request-add (POST), materials-request-edit (POST)
// MaterialRequestController: add(), index(), edit()
export const materialRequestAPI = {
  /**
   * POST /inventory/materials-request-add
   * Create: { projects_id, sub_projects_id? } — backend sets name, date, company_id, user_id, status
   * Update: { id, projects_id, sub_projects_id? }
   * Response: { status, message, data: MaterialRequest } — extract data.id for new MR
   */
  add: async (data: { projects_id: number | string; sub_projects_id?: number | string; id?: number | string }): Promise<any> => {
    try {
      const payload: Record<string, unknown> = {
        projects_id: data.projects_id,
        ...(data.sub_projects_id != null && { sub_projects_id: data.sub_projects_id }),
        ...(data.id != null && { id: data.id }),
      };
      const response = await apiClient.post('/inventory/materials-request-add', payload);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Material request creation failed');
      }
      const result = response.data?.data ?? response.data;
      return result;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to create material request',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * GET/POST /inventory/materials-request-list
   * GET: no params. POST: { projectId, subprojectId?, request_no? } — backend filters by projects_id, sub_projects_id, request_no
   * Response: { status, message, data: MaterialRequest[] }
   */
  list: async (filters?: {
    projectId?: number | string;
    subprojectId?: number | string;
    request_no?: string;
    status?: number | string;
    /** Optional — backend may filter MR list by date range */
    date_from?: string;
    date_to?: string;
  }): Promise<any[]> => {
    try {
      let response;
      if (
        filters?.projectId != null ||
        filters?.subprojectId != null ||
        filters?.request_no != null ||
        filters?.status != null ||
        (filters?.date_from != null && String(filters.date_from).trim()) ||
        (filters?.date_to != null && String(filters.date_to).trim())
      ) {
        const body: Record<string, number | string> = {};
        if (filters.projectId != null) body.projectId = filters.projectId;
        if (filters.subprojectId != null) body.subprojectId = filters.subprojectId;
        if (filters.request_no != null && String(filters.request_no).trim()) body.request_no = String(filters.request_no).trim();
        if (filters.status != null) body.status = filters.status;
        if (filters.date_from != null && String(filters.date_from).trim()) body.date_from = String(filters.date_from).trim();
        if (filters.date_to != null && String(filters.date_to).trim()) body.date_to = String(filters.date_to).trim();
        response = await apiClient.post('/inventory/materials-request-list', body);
      } else {
        response = await apiClient.get('/inventory/materials-request-list');
      }
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to fetch material requests');
      }
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch material requests',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /inventory/materials-request-edit
   * Payload: { id, project_id? } — Material Request id, project_id optional
   * Response: { status, message, data: MaterialRequestDetails[] } — array of line items for edit
   */
  edit: async (id: number | string, projectId?: number | string): Promise<any> => {
    try {
      const body: Record<string, unknown> = { id };
      if (projectId != null && projectId !== '') body.project_id = projectId;
      const response = await apiClient.post('/inventory/materials-request-edit', body);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to fetch material request');
      }
      const result = response.data?.data ?? response.data;
      return Array.isArray(result) ? result : (result && typeof result === 'object' ? [result] : []);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch material request',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /inventory/inventory-report - PR (Indent / Purchase Request) report
   * Backend type: 'pr'
   * All filters optional. With no filters, returns all materials with material requests.
   * Request: { type: 'pr', projectId|project?, subProjectId|subproject?, dateForm|date_from?, dateTo|date_to?, indentNo|indent_no? }
   * Response envelope may include `meta` (company, project, subProject logos/names) alongside `data.material`.
   */
  getReport: async (filters?: {
    projectId?: number | string;
    project?: number | string;
    subProjectId?: number | string;
    subproject?: number | string;
    dateForm?: string;
    date_from?: string;
    dateTo?: string;
    date_to?: string;
    indentNo?: string;
    indent_no?: string;
  }): Promise<InventoryReportResult> => {
    try {
      const payload: Record<string, unknown> = { type: 'pr' };
      const project = filters?.projectId ?? filters?.project;
      if (project != null && project !== '') payload.projectId = project;
      const subproject = filters?.subProjectId ?? filters?.subproject;
      if (subproject != null && subproject !== '') payload.subProjectId = subproject;
      const dateForm = (filters?.dateForm ?? filters?.date_from ?? '').slice(0, 10);
      if (dateForm) payload.dateForm = dateForm;
      const dateTo = (filters?.dateTo ?? filters?.date_to ?? '').slice(0, 10);
      if (dateTo) payload.dateTo = dateTo;
      const indentNo = (filters?.indentNo ?? filters?.indent_no ?? '').trim();
      if (indentNo) payload.indentNo = indentNo;
      const response = await apiClient.post('/inventory/inventory-report', payload);
      return parseInventoryReportResponse(response.data);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) return { rows: [], meta: null };
      throw {
        message: error.response?.data?.message || 'Failed to load PR report',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /inventory/materials-request-details-list
   * MaterialRequestDetailsController::index
   * Payload: { projectId (required), searchkey? }
   * Response: { status, message, data: MaterialRequestDetails[] }
   */
  detailsList: async (projectId: number | string, searchkey?: string): Promise<any[]> => {
    try {
      const body: Record<string, unknown> = { projectId };
      if (searchkey != null && searchkey !== '') body.searchkey = searchkey;
      const response = await apiClient.post('/inventory/materials-request-details-list', body);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to fetch material request details');
      }
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch material request details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /inventory/materials-request-details-add
   * MaterialRequestDetailsController::add
   * Payload: Array of { projects_id, qty, inventoryId, material_id?, sub_projects_id?, activities_id?, date?, remarks? }
   * - inventoryId → material_requests_id (updateOrCreate criteria)
   * - Backend updateOrCreate by (materials_id, material_requests_id)
   */
  detailsAdd: async (items: Array<{
    projects_id: number | string;
    qty: number;
    inventoryId: number | string;
    material_id?: number | string;
    sub_projects_id?: number | string;
    activities_id?: number | string;
    date?: string;
    remarks?: string;
  }>): Promise<any> => {
    try {
      if (!items || items.length === 0) {
        throw new Error('No items to add');
      }
      const payload = items.map((it) => ({
        projects_id: it.projects_id,
        qty: it.qty,
        inventoryId: it.inventoryId,
        ...(it.material_id != null && { material_id: it.material_id }),
        ...(it.sub_projects_id != null && { sub_projects_id: it.sub_projects_id }),
        ...(it.activities_id != null && { activities_id: it.activities_id }),
        ...(it.date != null && it.date !== '' && { date: it.date }),
        ...(it.remarks != null && it.remarks !== '' && { remarks: it.remarks }),
      }));
      const response = await apiClient.post('/inventory/materials-request-details-add', payload);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to add material request details');
      }
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to add material request details',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /inventory/materials-request-details-edit
   * MaterialRequestDetailsController::edit
   * Payload: { inventoryId, inventory_id, materials, projectId?, project_id? }
   * Backend expects: materials (array), inventoryId — projectId optional if backend filters by project
   */
  detailsEdit: async (inventoryId: number | string, materials: (number | string)[], projectId?: number | string): Promise<any> => {
    try {
      const materialsArr = Array.isArray(materials) && materials.length > 0 ? materials : [];
      if (materialsArr.length === 0) return [];
      const payload: Record<string, unknown> = {
        inventoryId,
        inventory_id: inventoryId,
        materials: materialsArr,
      };
      if (projectId != null && projectId !== '') {
        payload.projectId = projectId;
        payload.project_id = projectId;
      }
      const response = await apiClient.post('/inventory/materials-request-details-edit', payload);
      if (response.data?.success === false || response.data?.status === false) {
        throw new Error(response.data?.message || 'Failed to fetch material request details for edit');
      }
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : (data ? [data] : []);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.message || 'Failed to fetch material request details for edit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** POST /api/inventory/project-to-store-list - PR/context details (type: material_request) when MaterialsListInv loads. Pass inventoryId when editing to get current PR's req no. */
  projectToStoreList: async (projectId: number | string, storeIds: (number | string)[] = [], type = 'material_request', inventoryId?: number | string): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { type, project_id: projectId, store_id: storeIds };
      if (inventoryId != null) payload.inventory_id = inventoryId;
      const response = await apiClient.post('/inventory/project-to-store-list', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch project store',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** POST /api/inventory/generate-pdf - Generate PDF for Material Request. Returns { pdf_url } - open in new tab. */
  generatePdf: async (requestId: number | string): Promise<{ pdf_url: string }> => {
    try {
      const response = await apiClient.post('/inventory/generate-pdf', { type: 'material_request', requestId });
      const data = response.data?.data ?? response.data;
      const pdfUrl = response.data?.pdf_url ?? data?.pdf_url;
      if (!pdfUrl) {
        throw new Error('No PDF URL in response');
      }
      return { pdf_url: pdfUrl };
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || error.response?.data?.error || 'Failed to generate PDF',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// RFQ (Request for Quotation) APIs - QuotesDetailsController
// Routes: quote-details-list, quote-details-add, quote-details-edit, material-request-send-to-vendor
export const rfqAPI = {
  /**
   * GET /inventory/quote-details-list
   * QuotesDetailsController::index - no params, returns Quote[] (last 15 days)
   * Response: { status, message, data: Quote[] }
   */
  list: async (_filters?: { projectId?: number | string }): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/quote-details-list');
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to fetch quote list');
      }
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      try {
        return await materialRequestAPI.list(_filters);
      } catch {
      return [];
      }
    }
  },
  /**
   * POST /inventory/quote-details-edit
   * QuotesDetailsController::edit - Load quote with details for edit
   * Payload: { quotesId } — backend only uses quotesId
   * Response: { status, message, data: { flage, vendor_data, data } }
   */
  get: async (id: number | string, _projectsId?: number | string): Promise<any> => {
    try {
      const payload = { quotesId: id };
      const response = await apiClient.post('/inventory/quote-details-edit', payload);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to load RFQ');
      }
      const result = response.data?.data ?? response.data;
      return result;
    } catch (error: any) {
      try {
        return await materialRequestAPI.edit(id, _projectsId);
      } catch {
        throw { message: error.response?.data?.message || 'Failed to load RFQ', errors: error.response?.data?.errors || {} } as ApiError;
      }
    }
  },
  /** POST /inventory/quote-add - Create RFQ header */
  quoteAdd: async (data: { name: string; projects_id: number | string }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/quote-add', data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to create quote', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/quote-details-add
   * QuotesDetailsController::add
   * Two paths:
   * A) Image: FormData with img, quotes_id, date, remarkes, id? (for update)
   * B) Materials: Array of { quotes_id, materials, material_requests_id, material_request_details_id?, date, qty, request_qty, price, id? }
   * Response: { status, message, data } — single model (image) or array (materials)
   */
  quoteDetailsAdd: async (details: FormData | Array<{
    quotes_id: number | string;
    materials: number | string;
    material_requests_id?: number | string;
    material_request_details_id?: number | string;
    date: string;
    qty: number | string;
    request_qty: number | string;
    price?: number | string;
    id?: number | string;
  }>): Promise<any> => {
    if (details instanceof FormData) {
      try {
        const response = await apiClient.post('/inventory/quote-details-add', details, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data?.status === false || response.data?.success === false) {
          throw new Error(response.data?.message || 'Failed to add quote details');
        }
        return response.data?.data ?? response.data;
      } catch (error: any) {
        const data = error?.response?.data;
        const msg = typeof data === 'object' ? (data?.message ?? data?.error ?? 'Failed to add quote details') : 'Failed to add quote details';
        throw { message: msg, response: error?.response, errors: data?.errors || {} } as ApiError;
      }
    }
    if (!Array.isArray(details) || details.length === 0) {
      throw { message: 'No quote details to add', errors: {} } as ApiError;
    }
    try {
      const response = await apiClient.post('/inventory/quote-details-add', details);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to add quote details');
      }
      const result = response.data?.data ?? response.data;
      return Array.isArray(result) ? result : (result ? [result] : []);
    } catch (error: any) {
      const data = error?.response?.data;
      const msg = typeof data === 'object' ? (data?.message ?? data?.error ?? 'Failed to add quote details') : 'Failed to add quote details';
      const errList = data?.errors;
      const errStr = errList && typeof errList === 'object' ? Object.entries(errList).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ') : '';
      throw { message: errStr ? `${msg} ${errStr}` : msg, response: error?.response, errors: data?.errors || {} } as ApiError;
    }
  },
  /** POST /inventory/materials-request-no-wise-materials-list - Materials for selected request
   * Backend uses only request_no. projectId optional for filtering.
   */
  getMaterialsByRequestNo: async (requestNo: string | number, _materialRequestsId?: string | number, projectId?: number | string): Promise<any[]> => {
    try {
      const reqNo = requestNo == null || String(requestNo).trim() === '' ? undefined : requestNo;
      if (!reqNo) return [];
      const payload: Record<string, unknown> = { request_no: reqNo };
      if (projectId != null && projectId !== '') payload.projectId = projectId;
      const response = await apiClient.post('/inventory/materials-request-no-wise-materials-list', payload);
      const raw = response.data?.data ?? response.data;
      const arr = Array.isArray(raw) ? raw
        : Array.isArray(raw?.materials) ? raw.materials
        : Array.isArray(raw?.material_request_details) ? raw.material_request_details
        : Array.isArray(raw?.details) ? raw.details
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data) ? raw.data
        : [];
      return arr;
    } catch (error: any) {
      return [];
    }
  },
  /** POST /inventory/project-to-store-list - Project/quote context (type: quotes, project_id, store_id, request_id) */
  projectToStoreList: async (projectId: number | string, type = 'quotes', requestId?: number | string): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { type, project_id: projectId, store_id: [] };
      if (requestId != null && requestId !== '') payload.request_id = requestId;
      const response = await apiClient.post('/inventory/project-to-store-list', payload);
      return response.data?.data ?? response.data;
    } catch {
      return null;
    }
  },
  /** Create RFQ via quote-add. Returns { id } */
  save: async (data: {
    id?: number | string;
    projects_id: number | string;
    material_request_id?: number | string;
    image_url?: string;
    message?: string;
  }): Promise<any> => {
    const projectsId = data.projects_id;
    const name = new Date().toISOString().split('T')[0];
    const response = await apiClient.post('/inventory/quote-add', { name, projects_id: projectsId });
    const created = response.data?.data ?? response.data;
    const quoteId = created?.id ?? created?.uuid ?? data.id;
    if (!quoteId) throw new Error('No quote ID returned');
    return { id: quoteId, uuid: quoteId };
  },
  /** Get quote details - uses quote-details-edit (requires projects_id) or materials-request-edit fallback */
  getQuoteDetails: async (rfqId: number | string, projectsId?: number | string): Promise<any[]> => {
    try {
      const resp = await rfqAPI.get(rfqId, projectsId);
      const details = resp?.details ?? resp?.quote_details ?? (Array.isArray(resp) ? resp : resp?.data ?? []);
      return Array.isArray(details) ? details : (details && typeof details === 'object' ? [details] : []);
    } catch {
      return [];
    }
  },
  /** Get vendors - vendor-list */
  getVendors: async (_rfqId?: number | string): Promise<any[]> => {
    try {
      return await masterDataAPI.getVendors();
    } catch {
      return [];
    }
  },
  /**
   * POST /inventory/material-request-send-to-vendor
   * QuotesDetailsController::materialrequestSendToVendor
   * Payload: { type (0|1), vendor_id (array), quotes_id (array), quotes_details_id?, material_request_details_id?, materials_id? }
   * type 0 = materials path, type 1 = image path
   * Response: { status, message, data }
   */
  sendToVendors: async (
    rfqId: number | string,
    vendorIds: (number | string)[],
    options?: { type?: 0 | 1; quotesDetailsId?: (number | string)[]; materialRequestDetailsId?: (number | string)[]; materialRequestsId?: (number | string)[]; materialsId?: (number | string)[] }
  ): Promise<any> => {
    try {
      const type = options?.type ?? 1;
      const payload: Record<string, unknown> = {
        type,
        vendor_id: vendorIds,
        quotes_id: [rfqId],
      };
      if (type === 0 && options) {
        if (options.quotesDetailsId?.length) payload.quotes_details_id = options.quotesDetailsId;
        if (options.materialRequestDetailsId?.length) payload.material_request_details_id = options.materialRequestDetailsId;
        if (options.materialRequestsId?.length) payload.material_requests_id = options.materialRequestsId;
        if (options.materialsId?.length) payload.materials_id = options.materialsId;
      }
      const response = await apiClient.post('/inventory/material-request-send-to-vendor', payload);
      if (response.data?.status === false || response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to send to vendors');
      }
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || error.message || 'Failed to send to vendors', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * Send RFQ/quote email to vendor addresses
   * POST /api/inventory/rfq-send-email
   *
   * REQUEST BODY:
   * {
   *   requestId: number | string,      // Material Request ID - backend generates PDF from this
   *   email_addresses: string[],       // Vendor email addresses
   *   message?: string,                // Email body text
   *   image_base64?: string,           // Optional: base64 data URL (data:image/jpeg;base64,...)
   *   image_filename?: string          // Optional: filename for attachment (e.g. "quote-image.png")
   * }
   *
   * SUCCESS RESPONSE (200):
   * { status: true, message: "Emails sent successfully", data?: {...} }
   *
   * ERROR RESPONSE (4xx/5xx):
   * { status: false, message: "Error description", errors?: {...} }
   */
  sendEmailToVendors: async (
    requestId: number | string,
    emailAddresses: string[],
    message?: string,
    imageBase64?: string | null,
    imageFilename?: string
  ): Promise<any> => {
    try {
      const payload: Record<string, unknown> = {
        requestId,
        email_addresses: emailAddresses,
        message: message || 'Please find our Request for Quotation attached. Kindly submit your quote at your earliest convenience.',
      };
      if (imageBase64) {
        payload.image_base64 = imageBase64;
        if (imageFilename) payload.image_filename = imageFilename;
      }
      const response = await apiClient.post('/inventory/rfq-send-email', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to send email to vendors',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /** Generate RFQ PDF - inventory/generate-pdf with type: quotes. Optional quotes_details to fill Code, Name, Specification, Units when backend returns materials: null. */
  generatePdf: async (
    rfqId: number | string,
    quotesDetails?: Array<{
      id?: number | string;
      materials_id?: number | string;
      materialCode?: string;
      materialName?: string;
      materialSpec?: string;
      materialUnit?: string;
      qty?: number | string;
      request_qty?: number | string;
      date?: string;
      price?: number | string;
    }>
  ): Promise<{ pdf_url: string; name?: string }> => {
    try {
      const payload: Record<string, unknown> = { requestId: rfqId, type: 'quotes' };
      if (quotesDetails != null && quotesDetails.length > 0) {
        payload.quotes_details = quotesDetails.map((d) => ({
          id: d.id,
          materials_id: d.materials_id,
          materials: {
            code: d.materialCode ?? '',
            name: d.materialName ?? '',
            specification: d.materialSpec ?? '',
            unit: d.materialUnit ?? '',
          },
          qty: d.qty ?? d.request_qty,
          request_qty: d.request_qty ?? d.qty,
          date: d.date,
          price: d.price,
        }));
      }
      const response = await apiClient.post('/inventory/generate-pdf', payload);
      const data = response.data?.data ?? response.data;
      return { pdf_url: data?.pdf_url ?? data?.url ?? response.data?.pdf_url ?? '', name: data?.name };
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to generate RFQ PDF', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/inventory-report - RFQ report
   * Backend type: 'rfq'
   * All filters optional. With no filters, returns all RFQ materials.
   * Request: { type: 'rfq', projectId|project?, subProjectId|subproject?, dateForm|date_from?, dateTo|date_to?, prepared|prepared_by?, rfqno|rfq_no? }
   * Response: data.material - array with sl_no, code, name, specification, unit, required_qty, required_date, quote_rate
   */
  getReport: async (filters?: {
    projectId?: number | string;
    project?: number | string;
    subProjectId?: number | string;
    subproject?: number | string;
    dateForm?: string;
    date_from?: string;
    dateTo?: string;
    date_to?: string;
    prepared?: number | string;
    prepared_by?: number | string;
    rfqno?: string;
    rfq_no?: string;
  }): Promise<InventoryReportResult> => {
    try {
      const payload: Record<string, unknown> = { type: 'rfq' };
      const project = filters?.projectId ?? filters?.project;
      if (project != null && project !== '') payload.projectId = project;
      const subproject = filters?.subProjectId ?? filters?.subproject;
      if (subproject != null && subproject !== '') payload.subProjectId = subproject;
      const dateForm = (filters?.dateForm ?? filters?.date_from ?? '').slice(0, 10);
      if (dateForm) payload.dateForm = dateForm;
      const dateTo = (filters?.dateTo ?? filters?.date_to ?? '').slice(0, 10);
      if (dateTo) payload.dateTo = dateTo;
      const prepared = filters?.prepared ?? filters?.prepared_by;
      if (prepared != null && prepared !== '') payload.prepared = prepared;
      const rfqno = (filters?.rfqno ?? filters?.rfq_no ?? '').trim();
      if (rfqno) payload.rfqno = rfqno;
      const response = await apiClient.post('/inventory/inventory-report', payload);
      return parseInventoryReportResponse(response.data);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) return { rows: [], meta: null };
      throw { message: error.response?.data?.message || 'Failed to load RFQ report', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
};

// Goods Return APIs - Inventory > Goods Returns
// Spec: return-list (GET), return-add (POST), return-edit (POST), return-goods-add (POST), return-goods-details-add (POST)
export const goodsReturnAPI = {
  /**
   * GET /inventory/return-list - No request body.
   * Returns list of returns with at least one return good.
   * Response: status, response_code, message, data (collection with id, name, date, code/return_no, projects_id, sub_projects_id, user_id, company_id, details, remarks).
   */
  list: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/return-list');
      const raw = response.data?.data ?? response.data;
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.returns) ? raw.returns : Array.isArray(raw?.data) ? raw.data : [];
      return arr;
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch returns', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/return-edit
   * Request body: { inv_returns_id: number } - ID of the return record only.
   * Response root is the return goods record with inv_return and inv_return_details nested inside.
   */
  edit: async (invReturnsId: number | string): Promise<any> => {
    try {
      const body = { inv_returns_id: invReturnsId };
      const response = await apiClient.post('/inventory/return-edit', body);
      const d = response.data;
      const inner = d?.data;
      // Response root = return goods record (has inv_return, inv_return_details nested)
      if (inner && typeof inner === 'object' && (inner.inv_return != null || inner.inv_return_details != null)) {
        return inner;
      }
      return d?.data ?? d;
    } catch (error: any) {
      const data = error.response?.data;
      const msg = typeof data === 'object' ? data?.message : (typeof data === 'string' && data.includes('error') ? 'Backend error' : null);
      throw { message: msg || 'Failed to fetch return (API may not be implemented)', errors: (typeof data === 'object' && data?.errors) || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/return-add
   * Request body: name, projects_id, store_warehouses_id (array).
   * Creates new InvReturn header. Response: status, response_code, message, data with created return record.
   */
  createHeader: async (data: { name: string; projects_id: number | string; store_warehouses_id: (number | string)[] }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/return-add', data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to create return header', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/project-to-store-list (type: "return")
   * Returns return_no in data.invInwardRegNo.
   * - Create mode (requestId null): backend generates unique 6-digit via generateUniqueNumberAndCheck.
   * - Edit mode (requestId = inv_returns_id): backend returns existing return_no from InvReturnGood.
   */
  projectToStoreList: async (
    projectId: number | string,
    storeIds: (number | string)[],
    type = 'return',
    requestId?: number | string | null
  ): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { type, project_id: projectId, store_id: storeIds };
      if (requestId != null && requestId !== '') payload.request_id = requestId;
      const response = await apiClient.post('/inventory/project-to-store-list', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to fetch project store', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getIssueTypeList: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/issue-type-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch issue types', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getIssueTypeTagList: async (invIssueListsId: number | string, projectId: number | string, storeIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/inventory/issue-type-tag-list', { inv_issue_lists_id: invIssueListsId, project_id: projectId, store_id: storeIds });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch tags', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getMaterialList: async (projectId: number | string, goodsType: 'materials' | 'machines'): Promise<any[]> => {
    try {
      const response = await apiClient.post('/inventory/issue-material-list', {
        goods_type: goodsType,
        project_id: projectId,
        type: 'return',
      });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch materials', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/return-goods-add
   * Request body: inv_return_id, projects_id, goods_type ("materials"/"machines"), return_no, date, return_from, materials_id (array).
   * Optional: id (to update), remarkes, type.
   * Response: status, response_code, message, data as materials/assets list for the return.
   */
  addReturnGoods: async (payload: {
    id?: number | string | null;
    inv_return_id: number | string;
    projects_id: number | string;
    return_no: string;
    date: string;
    type?: number | string;
    goods_type: 'materials' | 'machines';
    return_from: number | string;
    remarkes?: string;
    materials_id: (number | string)[];
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/return-goods-add', payload);
      const res = response.data;
      // Extract array of items from common response structures
      const toArr = (x: any) => (Array.isArray(x) ? x : []);
      let arr =
        toArr(res).length > 0 ? res
        : toArr(res?.data).length > 0 ? res.data
        : toArr(res?.return_goods).length > 0 ? res.return_goods
        : toArr(res?.data?.return_goods).length > 0 ? res.data.return_goods
        : toArr(res?.data?.data).length > 0 ? res.data.data
        : toArr(res?.materials).length > 0 ? res.materials
        : toArr(res?.data?.materials).length > 0 ? res.data.materials
        : [];
      // Single object (e.g. { id, name, code, stock_qty }) - wrap in array
      if (arr.length === 0) {
        const obj = res?.data ?? res;
        if (obj && typeof obj === 'object' && (obj.stock_qty != null || obj.code != null || obj.name != null)) {
          arr = [obj];
        }
      }
      return arr.length > 0 ? arr : (res?.data ?? res);
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to add return goods', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/return-goods-details-add
   * Request body: array of objects with inv_return_goods_id, type, materials_id, return_qty, stock_qty, projects_id, store_warehouses_id.
   * Optional per item: id (to update), price, remarkes, activities_id.
   * Response: status, response_code, message, data with saved details.
   */
  addReturnDetails: async (items: Array<{
    id?: number | string | null;
    inv_return_goods_id: number | string;
    projects_id: number | string;
    store_warehouses_id: (number | string)[];
    materials_id: number | string;
    type: 'materials' | 'machines';
    return_qty: number | string;
    stock_qty?: number | string;
    price?: number | string;
    remarkes?: string;
    activities_id?: number | string | null;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/return-goods-details-add', items);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to update return details', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  generatePdf: async (
    requestId: number | string,
    returnGoodsDetails?: Array<{
      id?: number | string;
      inv_return_goods_id?: number | string;
      materials_id?: number | string;
      type?: string;
      return_qty?: number | string;
      stock_qty?: number | string;
      materialCode?: string;
      materialName?: string;
      materialSpec?: string;
      materialUnit?: string;
    }>
  ): Promise<{ pdf_url: string; name?: string }> => {
    try {
      const payload: Record<string, unknown> = { type: 'return', requestId };
      if (returnGoodsDetails != null && returnGoodsDetails.length > 0) {
        payload.return_goods_details = returnGoodsDetails;
        // Shape matching backend data.inv_returns_goods[].inv_return_details for PDF template
        payload.inv_return_details = returnGoodsDetails.map((d) => ({
          id: d.id,
          inv_return_goods_id: d.inv_return_goods_id,
          materials_id: d.materials_id,
          type: d.type ?? 'materials',
          return_qty: d.return_qty,
          stock_qty: d.stock_qty,
          materials: {
            code: d.materialCode ?? '',
            name: d.materialName ?? '',
            specification: d.materialSpec ?? '',
            unit: d.materialUnit ?? '',
          },
        }));
        const firstInvReturnGoodsId = returnGoodsDetails[0]?.inv_return_goods_id;
        if (firstInvReturnGoodsId != null) {
          payload.inv_return_goods_id = firstInvReturnGoodsId;
        }
      }
      const response = await apiClient.post('/inventory/generate-pdf', payload);
      const data = response.data?.data ?? response.data;
      const pdfUrl = response.data?.pdf_url ?? data?.pdf_url;
      if (!pdfUrl) throw new Error('No PDF URL in response');
      return { pdf_url: pdfUrl, name: data?.name ?? data?.filename };
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to generate PDF', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/inventory-report - Issue Return report
   * Backend type: 'issue-return'
   * Request: { type: 'issue-return', project, store, from_date, to_date, entry_type?, item_type }
   * Response: data.assets - array of report rows
   */
  getReport: async (filters: {
    projectId: number | string;
    storeId?: number | string;
    entryTypeId?: number | string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    dataType: 'materials' | 'machines';
  }): Promise<InventoryReportResult> => {
    try {
      const payload: Record<string, unknown> = {
        type: 'issue-return',
        project: filters.projectId,
        projectId: filters.projectId,
        item_type: filters.dataType,
      };
      if (filters.storeId != null && filters.storeId !== '') {
        payload.store = filters.storeId;
        payload.storeId = filters.storeId;
      }
      if (filters.entryTypeId != null && filters.entryTypeId !== '') payload.entry_type = filters.entryTypeId;
      if (filters.dateFrom) {
        payload.from_date = filters.dateFrom.slice(0, 10);
        payload.dateForm = filters.dateFrom.slice(0, 10);
      }
      if (filters.dateTo) {
        payload.to_date = filters.dateTo.slice(0, 10);
        payload.dateTo = filters.dateTo.slice(0, 10);
      }
      if (filters.search != null && String(filters.search).trim()) payload.search = filters.search.trim();
      const response = await apiClient.post('/inventory/inventory-report', payload);
      return parseInventoryReportResponse(response.data);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return { rows: [], meta: null };
      }
      throw { message: error.response?.data?.message || 'Failed to load Issue Return report', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
};

// Goods Issue (Outward) APIs - Inventory > Goods Issue / Issue Slip
export const goodsIssueAPI = {
  list: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/issue-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch issues', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  edit: async (invIssuesId: number | string): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/issue-goods-edit', { inv_issues_id: invIssuesId });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      const data = error.response?.data;
      const msg = typeof data === 'object' ? data?.message : (typeof data === 'string' && data.includes('error') ? 'Backend error' : null);
      throw { message: msg || 'Failed to fetch issue (API may not be implemented)', errors: (typeof data === 'object' && data?.errors) || {} } as ApiError;
    }
  },
  createHeader: async (data: { name: string; projects_id: number | string; store_warehouses_id: (number | string)[] }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/issue-add', data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to create issue header', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  projectToStoreList: async (projectId: number | string, storeIds: (number | string)[], type = 'issue'): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/project-to-store-list', { type, project_id: projectId, store_id: storeIds });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to fetch project store', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getIssueTypeList: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/issue-type-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch issue types', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getIssueTypeTagList: async (invIssueListsId: number | string, projectId: number | string, storeIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/inventory/issue-type-tag-list', { inv_issue_lists_id: invIssueListsId, project_id: projectId, store_id: storeIds });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch tags', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getMaterialList: async (projectId: number | string, goodsType: 'materials' | 'machines'): Promise<any[]> => {
    try {
      const response = await apiClient.post('/inventory/issue-material-list', {
        goods_type: goodsType,
        project_id: projectId,
        type: 'issue',
      });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch materials', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  addIssueGoods: async (payload: {
    id?: number | string | null;
    inv_issues_id: number | string;
    projects_id: number | string;
    store_warehouses_id: (number | string)[];
    issue_no: string;
    date: string;
    entry_type?: number | string;
    goods_type: 'materials' | 'machines';
    issue_to: number | string;
    materials_id: (number | string)[];
    remarkes?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/issue-goods-add', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to add issue goods', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  addIssueDetails: async (items: Array<{
    id?: number | string | null;
    inv_issue_goods_id: number | string;
    projects_id: number | string;
    store_warehouses_id: (number | string)[];
    materials_id: number | string;
    type: 'materials' | 'machines';
    issue_qty: number | string;
    stock_qty?: number | string;
    activities_id?: number | string;
  }>): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/issue-goods-details-add', items);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to update issue details', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  generatePdf: async (requestId: number | string, invIssueListsId?: number | string, details?: Array<{ materials_id?: number | string; materialCode?: string; materialName?: string; materialSpec?: string; materialUnit?: string; issue_qty?: number | string; stock_qty?: number | string; activityName?: string }>): Promise<{ pdf_url: string; name?: string }> => {
    try {
      const payload: Record<string, unknown> = { type: 'issue', requestId };
      if (invIssueListsId != null) payload.inv_issue_lists_id = invIssueListsId;
      if (details != null && details.length > 0) payload.issue_goods_details = details;
      const response = await apiClient.post('/inventory/generate-pdf', payload);
      const data = response.data?.data ?? response.data;
      const pdfUrl = response.data?.pdf_url ?? data?.pdf_url;
      if (!pdfUrl) throw new Error('No PDF URL in response');
      return { pdf_url: pdfUrl, name: data?.name ?? data?.filename };
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to generate PDF', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/inventory-report - Issue Slip / Issue Details report
   * Backend types: 'issue-slip' (single date), 'issue-details' (date range)
   * Request: { type, project, store, from_date/to_date, entry_type?, item_type }
   * Response: InvIssuesDetails - transformed to assets array by buildIssueDetailsOrSlipAssets
   */
  getReport: async (filters: {
    projectId: number | string;
    storeId?: number | string;
    issueToId?: number | string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    dataType?: 'materials' | 'machines';
    reportType?: 'issue-slip' | 'issue-details';
  }): Promise<InventoryReportResult> => {
    try {
      const reportType = filters.reportType ?? 'issue-slip';
      const dateStr = (filters.date ?? filters.dateFrom ?? '').toString().slice(0, 10);
      const dateToStr = (filters.dateTo ?? '').toString().slice(0, 10);
      const project = filters.projectId != null && filters.projectId !== '' ? filters.projectId : undefined;
      const store = filters.storeId != null && filters.storeId !== '' ? filters.storeId : undefined;

      if (reportType === 'issue-slip') {
        if (!project || !store || !dateStr) return { rows: [], meta: null };
      }

      const payload: Record<string, unknown> = {
        type: reportType,
        project: project ?? filters.projectId,
        projectId: project ?? filters.projectId,
      };
      if (store != null) {
        payload.store = store;
        payload.storeId = store;
      }
      if (dateStr) payload.from_date = dateStr;
      if (reportType === 'issue-details' && dateToStr) payload.to_date = dateToStr;
      const itemType = filters.dataType;
      if (itemType) payload.item_type = itemType;
      if (filters.issueToId != null && filters.issueToId !== '') payload.entry_type = filters.issueToId;
      if (filters.search != null && String(filters.search).trim()) payload.search = filters.search.trim();
      const response = await apiClient.post('/inventory/inventory-report', payload);
      return parseInventoryReportResponse(response.data);
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return { rows: [], meta: null };
      }
      throw { message: error.response?.data?.message || 'Failed to load Issue report', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
};

// Goods Receipt (GRN/MRN / Inward) APIs - Inventory > Goods Receipt
export const goodsReceiptAPI = {
  list: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/inward-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch inwards', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  edit: async (invInwardsId: number | string): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/inward-goods-edit', { inv_inwards_id: invInwardsId });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      const data = error.response?.data;
      const msg = typeof data === 'object' ? data?.message : (typeof data === 'string' && data.includes('error') ? 'Backend error' : null);
      throw { message: msg || 'Failed to fetch inward (API may not be implemented)', errors: (typeof data === 'object' && data?.errors) || {} } as ApiError;
    }
  },
  createHeader: async (data: { name: string; projects_id: number | string; store_warehouses_id: (number | string)[] }): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/inward-add', data);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to create inward header', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  projectToStoreList: async (projectId: number | string, storeIds: (number | string)[], type = 'inward'): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/project-to-store-list', { type, project_id: projectId, store_id: storeIds });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to fetch project store', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getEntryTypeList: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/inventory/inward-goods-entry-type-list');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch entry types', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  getTypeWiseList: async (type: string, projectId: number | string, storeIds: (number | string)[]): Promise<any[]> => {
    try {
      const response = await apiClient.post('/inventory/inward-goods-entry-type-id', { type, project_id: projectId, store_id: storeIds });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      throw { message: error.response?.data?.message || 'Failed to fetch list', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  addInwardGoods: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/inventory/inward-goods-add', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to add inward goods', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /** POST inventory/inward-goods-details-add - request body must be array of objects per spec */
  addInwardDetails: async (items: Array<{
    id?: number | string | null;
    inward_goods_id: number | string;
    projects_id: number | string;
    store_warehouses_id: (number | string)[];
    materials_id: number | string;
    type?: 'materials' | 'machines';
    recipt_qty?: number | string;
    reject_qty?: number | string;
    price?: number | string;
    remarkes?: string;
    po_qty?: number | string;
    accepted_qty?: number | string;
  }>): Promise<any> => {
    try {
      const raw = Array.isArray(items) ? items : [];
      const payload = raw.map((item) => {
        const rec = Number(item.recipt_qty ?? 0) || 0;
        const rej = Number(item.reject_qty ?? 0) || 0;
        const storeIds = (Array.isArray(item.store_warehouses_id) ? item.store_warehouses_id : [])
          .map((x) => (typeof x === 'number' ? x : Number(x)));
        return {
          id: item.id != null && item.id !== '' ? String(item.id) : '',
          inward_goods_id: Number(item.inward_goods_id) || item.inward_goods_id,
          materials_id: Number(item.materials_id) || item.materials_id,
          po_qty: item.po_qty != null && item.po_qty !== '' ? item.po_qty : '',
          price: item.price != null && item.price !== '' ? Number(item.price) : 0,
          projects_id: String(item.projects_id ?? ''),
          recipt_qty: rec,
          reject_qty: rej,
          remarkes: item.remarkes ?? '',
          store_warehouses_id: storeIds,
          type: item.type === 'machines' ? 'machines' : 'materials',
        };
      });
      const response = await apiClient.post('/inventory/inward-goods-details-add', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw { message: error.response?.data?.message || 'Failed to update inward details', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /** POST /api/inventory/generate-pdf - Generate Inward PDF. Body: { type: 'inward', requestId } (inv_inwards.id). Optional inward_details to avoid null->code when relations are missing. */
  generatePdf: async (
    requestId: number | string,
    inwardDetails?: Array<{
      id?: number | string;
      materials_id?: number | string;
      materialCode?: string;
      materialName?: string;
      materialSpec?: string;
      materialUnit?: string;
      recipt_qty?: number | string;
      reject_qty?: number | string;
    }>
  ): Promise<{ pdf_url: string; name?: string }> => {
    try {
      const payload: Record<string, unknown> = { type: 'inward', requestId };
      if (inwardDetails != null && inwardDetails.length > 0) {
        payload.inward_details = inwardDetails.map((d) => ({
          id: d.id,
          materials_id: d.materials_id,
          materials: {
            code: d.materialCode ?? '',
            name: d.materialName ?? '',
            specification: d.materialSpec ?? '',
            unit: d.materialUnit ?? '',
          },
          recipt_qty: d.recipt_qty,
          reject_qty: d.reject_qty,
        }));
      }
      const response = await apiClient.post('/inventory/generate-pdf', payload);
      const data = response.data?.data ?? response.data;
      const pdfUrl = response.data?.pdf_url ?? data?.pdf_url;
      if (!pdfUrl) throw new Error('No PDF URL in response');
      return { pdf_url: pdfUrl, name: response.data?.name ?? data?.name ?? data?.filename };
    } catch (error: any) {
      const errMsg = error.response?.data?.error ?? error.response?.data?.message ?? 'Failed to generate PDF';
      throw { message: errMsg, errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST /inventory/inventory-report - GRN/MRN Slip / GRN Details report
   * Backend types: 'grn-slip' (single date), 'grn-details' (date range)
   * GRN Slip required: project|projectId, store|storeId, from_date|date
   * Optional: supplier, entry_type, item_type, search (GRN no or delivery ref copy number)
   * Response: grn-slip returns { fetchHeadData, assets }; grn-details returns assets
   * fetchHeadData: project name, date, store name/location, entry type, supplier, delivery ref, GRN number
   * assets: sl_no, grn_no, date, code, name, specification, unit, receipt_qty, reject_qty, accepted_qty, rate, amount, po_qty, po_balance, remarks
   */
  getReport: async (filters: {
    projectId?: number | string;
    project?: number | string;
    storeId?: number | string;
    store?: number | string;
    entryTypeId?: number | string;
    entry_type?: number | string;
    supplierId?: number | string;
    supplier?: number | string;
    dateFrom?: string;
    date?: string;
    from_date?: string;
    dateTo?: string;
    to_date?: string;
    search?: string;
    dataType?: 'materials' | 'machines';
    item_type?: 'materials' | 'machines';
    reportType?: 'grn-slip' | 'grn-details';
  }): Promise<InventoryReportResult> => {
    try {
      const reportType = filters.reportType ?? 'grn-slip';
      const project = filters.projectId ?? filters.project;
      const store = filters.storeId ?? filters.store;
      const dateStr = (filters.dateFrom ?? filters.date ?? filters.from_date ?? '').slice(0, 10);
      const dateToStr = (filters.dateTo ?? filters.to_date ?? '').slice(0, 10);
      const itemType = filters.dataType ?? filters.item_type ?? 'materials';

      if (reportType === 'grn-slip' && (!project || !store || !dateStr)) {
        return { rows: [], meta: null, fetchHeadData: undefined };
      }
      if (reportType === 'grn-details' && (!project || !store || !dateStr || !dateToStr)) {
        return { rows: [], meta: null };
      }

      const payload: Record<string, unknown> = {
        type: reportType,
        project: project ?? filters.projectId,
        projectId: project ?? filters.projectId,
        store: store ?? filters.storeId,
        storeId: store ?? filters.storeId,
        from_date: dateStr,
        date: dateStr,
        item_type: itemType,
      };
      if (reportType === 'grn-details' && dateToStr) payload.to_date = dateToStr;
      const entryType = filters.entryTypeId ?? filters.entry_type;
      if (entryType != null && entryType !== '') payload.entry_type = entryType;
      const supplier = filters.supplierId ?? filters.supplier;
      if (supplier != null && supplier !== '') payload.supplier = supplier;
      if (filters.search != null && String(filters.search).trim()) payload.search = filters.search.trim();
      const response = await apiClient.post('/inventory/inventory-report', payload);
      const parsed = parseInventoryReportResponse(response.data);
      const data = response.data?.data ?? response.data;
      const fd =
        parsed.fetchHeadData ??
        (data && typeof data === 'object'
          ? (data as Record<string, unknown>).fetchHeadData ?? (data as Record<string, unknown>).fetch_head_data
          : undefined);
      if (reportType === 'grn-slip') {
        return { rows: parsed.rows, meta: parsed.meta, fetchHeadData: fd };
      }
      return { rows: parsed.rows, meta: parsed.meta };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 422) {
        return { rows: [], meta: null };
      }
      throw { message: error.response?.data?.message || 'Failed to load GRN report', errors: error.response?.data?.errors || {} } as ApiError;
    }
  },
};

// Dashboard APIs - Aligned with Laravel DashboardController routes
// Endpoints: get-work-overview, get-work-process, get-work-process-activities, get-inventory-stocks, get-inward-stocks
export const dashboardAPI = {
  /**
   * POST get-work-overview - Work overview (Overview tab) -> workstatus
   * Request: { project (required), subproject?, date? }
   * Response: monthwiseworkProgess, estimatedCost, balanceEstimate, excessEstimateCost, totalActivites, inProgress, notStart, completed, timeline, DPR, labour, inventory
   */
  getWorkOverview: async (
    params: { project: number | string; subproject?: number | string; date?: string },
    config?: { signal?: AbortSignal }
  ): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { project: params.project };
      if (params.subproject != null && params.subproject !== '') payload.subproject = params.subproject;
      if (params.date != null && params.date !== '') payload.date = params.date;
      const response = await apiClient.post('/get-work-overview', payload, config);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') throw error;
      throw {
        message: error.response?.data?.message || 'Failed to fetch dashboard overview',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST /dashboard-overview-search - alternative search endpoint (fallback)
   */
  dashboardOverviewSearch: async (params: { project: number | string; subproject?: number | string; date?: string }): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { project: params.project };
      if (params.subproject != null && params.subproject !== '') payload.subproject = params.subproject;
      if (params.date != null && params.date !== '') payload.date = params.date;
      const response = await apiClient.post('/dashboard-overview-search', payload);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch dashboard overview',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST get-work-process - Cost summary + chart for Work Progress tab -> workprocess
   * Request: { project (required), subproject? }
   * Response: estimatedCost, estimatedCostForExecutedQty, balanceEstimate, excessEstimateCost, totalActivites, inProgress, notStart, completed, workProcessData
   */
  getWorkProcess: async (
    params: { project: number | string; subproject?: number | string; date?: string },
    config?: { signal?: AbortSignal }
  ): Promise<any> => {
    try {
      const payload: Record<string, unknown> = { project: params.project };
      if (params.subproject != null && params.subproject !== '') payload.subproject = params.subproject;
      const response = await apiClient.post('/get-work-process', payload, config);
      return response.data?.data ?? response.data ?? {};
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') throw error;
      throw {
        message: error.response?.data?.message || 'Failed to fetch work process',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST get-work-process-activities - Activity lists by status -> getworkProcessActivities
   * Request: { project (required), subproject?, date?, filterName (required) }
   * filterName: inprogress | completed | notstart | delay
   * Response: inProgressactivites | completedactivites | notStartactivites | delayactivites
   */
  getWorkProcessActivities: async (
    params: {
      project: number | string;
      subproject?: number | string;
      date?: string;
      filterName: 'inprogress' | 'completed' | 'notstart' | 'delay';
    },
    config?: { signal?: AbortSignal }
  ): Promise<any[]> => {
    try {
      const payload: Record<string, unknown> = { project: params.project, filterName: params.filterName };
      if (params.subproject != null && params.subproject !== '') payload.subproject = params.subproject;
      if (params.date != null && params.date !== '') payload.date = params.date;
      const response = await apiClient.post('/get-work-process-activities', payload, config);
      const data = response.data?.data ?? response.data ?? {};
      const key =
        params.filterName === 'inprogress' ? 'inProgressactivites'
        : params.filterName === 'completed' ? 'completedactivites'
        : params.filterName === 'notstart' ? 'notStartactivites'
        : 'delayactivites';
      const arr = data[key] ?? data[params.filterName] ?? data.activities ?? [];
      return Array.isArray(arr) ? arr : [];
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') throw error;
      throw {
        message: error.response?.data?.message || 'Failed to fetch activities',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  /**
   * POST get-inventory-stocks - Inventory stocks by project/store/date -> getstocksinventory
   * Request: { project (required), store (required), date (required), filterName? }
   * filterName: material | machine (default: material)
   * Response: { materialStocks: [] } or { machineStocks: [] }
   */
  getInventoryStocks: async (
    params: {
      project: number | string;
      store: number | string;
      date: string;
      filterName?: 'material' | 'machine';
    },
    config?: { signal?: AbortSignal }
  ): Promise<{ materialStocks?: any[]; machineStocks?: any[] }> => {
    try {
      const projectNum = /^\d+$/.test(String(params.project)) ? Number(params.project) : params.project;
      const storeStr = params.store != null ? String(params.store).trim() : '';
      const storeNum = /^\d+$/.test(storeStr) ? Number(storeStr) : null;
      if (storeNum === null) {
        throw { message: 'Store is required', errors: {} } as ApiError;
      }
      let dateStr = params.date ? String(params.date).trim().replace(/\//g, '-') : '';
      if (dateStr.length === 10 && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('-');
        dateStr = `${y}-${m}-${d}`;
      }
      dateStr = dateStr.slice(0, 10);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw { message: 'Valid date (YYYY-MM-DD) is required', errors: {} } as ApiError;
      }
      const payload: Record<string, unknown> = {
        project: projectNum,
        store: storeNum,
        date: dateStr,
        filterName: params.filterName ?? 'material',
      };
      const response = await apiClient.post('/get-inventory-stocks', payload, config);
      const data = response.data?.data ?? response.data ?? {};
      const materialStocks = data.materialStocks ?? data.material_stocks ?? [];
      const machineStocks = data.machineStocks ?? data.machine_stocks ?? [];
      return {
        materialStocks: Array.isArray(materialStocks) ? materialStocks : [],
        machineStocks: Array.isArray(machineStocks) ? machineStocks : [],
      };
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') throw error;
      const status = error.response?.status;
      const data = error.response?.data;
      let message = data?.message || 'Failed to fetch inventory stocks';
      if (status === 422 && data?.errors && typeof data.errors === 'object') {
        const errParts = Object.entries(data.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
        if (errParts.length > 0) message = `Validation failed: ${errParts.join('; ')}`;
      }
      throw { message, errors: data?.errors || {} } as ApiError;
    }
  },
  /**
   * POST get-inward-stocks - Inward stocks (goods receipt) by date/project/store -> getInwardStocks
   * Request: { date (required), project (required), store (required) }
   * Response: Array of inward records
   */
  getInwardStocks: async (params: { date: string; project: number | string; store: number | string }): Promise<any[]> => {
    try {
      let dateStr = params.date ? String(params.date).trim().replace(/\//g, '-') : '';
      if (dateStr.length === 10 && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('-');
        dateStr = `${y}-${m}-${d}`;
      }
      dateStr = dateStr.slice(0, 10);
      const projectNum = /^\d+$/.test(String(params.project)) ? Number(params.project) : params.project;
      const storeNum = /^\d+$/.test(String(params.store)) ? Number(params.store) : params.store;
      const payload = { date: dateStr, project: projectNum, store: storeNum };
      const response = await apiClient.post('/get-inward-stocks', payload);
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch inward stocks',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

/**
 * Tasks API (routes/api.php, prefix /api — client uses /tasks via api-proxy baseURL):
 * - GET /tasks — list (query: project_id, role, viewer, status, priority, search)
 * - GET /tasks/get-user-list — optional; UI uses GET /teams-list for staff pickers
 * - POST /tasks — create
 * - GET /tasks/{uuid} — TaskResource (show); PUT|PATCH /tasks/{uuid} — assignee-only description + status
 * - DELETE /tasks/{uuid} — soft delete
 */

export type TaskApiRole =
  | 'assigned_to'
  | 'assigned_by'
  | 'assigned_to_me'
  | 'assigned_by_me';

/** Pick assignee label: API may send plain strings (vendors/custom), display_name, or nested user. */
function taskAssignLabel(
  raw: unknown,
  displayName: unknown,
  userName: unknown,
): string {
  const r = typeof raw === 'string' ? raw.trim() : '';
  if (r) return r;
  const d = typeof displayName === 'string' ? displayName.trim() : '';
  if (d) return d;
  const u = typeof userName === 'string' ? userName.trim() : '';
  return u;
}

/** Normalize TaskResource / API row to UI Task (id = uuid for update/delete). */
function normalizeTaskRow(item: any): Record<string, any> {
  if (!item || typeof item !== 'object') return {};
  const tagList =
    item.tags ??
    item.task_tags?.map((x: any) => (typeof x === 'string' ? x : x.tag ?? x.name)).filter(Boolean) ??
    [];
  const to = taskAssignLabel(
    item.assigned_to,
    item.assigned_to_display_name,
    item.assigned_to_user?.name,
  );
  const by = taskAssignLabel(
    item.assigned_by,
    item.assigned_by_display_name,
    item.assigned_by_user?.name,
  );
  let due = item.due_date ?? '';
  if (due && typeof due === 'string' && due.includes('T')) due = due.slice(0, 10);

  const rawRemark = item.remark ?? item.completion_remark ?? item.status_remark ?? item.remarks;
  const remarkStr = typeof rawRemark === 'string' ? rawRemark.trim() : '';

  const row: Record<string, any> = {
    // TaskResource: id is the task uuid.
    id: String(item.id ?? item.uuid ?? item.task_id ?? item.task_uuid ?? ''),
    title: item.title ?? '',
    description: item.description ?? '',
    assigned_to: to,
    assigned_by: by,
    assigned_to_user_id:
      item.assigned_to_user_id ??
      item.assigned_to_company_user_id ??
      item.assigned_to_user?.id ??
      undefined,
    assigned_by_user_id:
      item.assigned_by_user_id ??
      item.assigned_by_company_user_id ??
      item.assigned_by_user?.id ??
      undefined,
    due_date: due,
    priority: item.priority ?? 'medium',
    status: item.status ?? 'todo',
    tags: Array.isArray(tagList) ? tagList : [],
    project_id: item.project_id ?? undefined,
  };
  if (remarkStr) row.remark = remarkStr;
  return row;
}

/** Unwrap Laravel / custom envelopes: { data: Task[] }, { data: { data: [] } }, { data: { tasks: [] } }, etc. */
function parseTasksResponse(responseData: any): any[] {
  const fromObject = (o: Record<string, unknown> | null | undefined): any[] => {
    if (!o || typeof o !== 'object') return [];
    if (Array.isArray(o)) return o as any[];
    if (Array.isArray(o.data)) return o.data as any[];
    const nested = o.data;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const inner = nested as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as any[];
      for (const k of ['tasks', 'items', 'results', 'records', 'list', 'rows'] as const) {
        if (Array.isArray(inner[k])) return inner[k] as any[];
      }
    }
    for (const k of ['tasks', 'items', 'results', 'records', 'list', 'rows'] as const) {
      if (Array.isArray(o[k])) return o[k] as any[];
    }
    return [];
  };

  if (responseData == null) return [];
  if (Array.isArray(responseData)) return responseData;
  if (typeof responseData !== 'object') return [];
  const root = responseData as Record<string, unknown>;
  const a = fromObject(root);
  if (a.length) return a;
  return [];
}

function taskAiHeuristics(tasks: any[], query: string, viewer?: string | null): string {
  const today = new Date().toISOString().split('T')[0];
  const viewerLower = (viewer || '').toLowerCase();
  const filtered = viewerLower
    ? tasks.filter(
        (t: any) =>
          (t.assigned_to || '').toLowerCase() === viewerLower ||
          (t.assigned_by || '').toLowerCase() === viewerLower
      )
    : tasks;

  const overdue = filtered.filter((t: any) => t.due_date && t.due_date < today && t.status !== 'done');
  const dueToday = filtered.filter((t: any) => t.due_date === today);
  const highPriority = filtered.filter((t: any) => t.priority === 'high' || t.priority === 'urgent');
  const byPerson = filtered.reduce((acc: Record<string, number>, t: any) => {
    const name = t.assigned_to || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const mostTasks = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0];

  const q = (query || '').toLowerCase();
  if (q.includes('due today') || q.includes('today')) {
    return dueToday.length
      ? `**Tasks due today (${dueToday.length}):**\n${dueToday.map((t: any) => `• ${t.title} (${t.assigned_to})`).join('\n')}`
      : 'No tasks due today.';
  }
  if (q.includes('overdue')) {
    return overdue.length
      ? `**Overdue tasks (${overdue.length}):**\n${overdue.map((t: any) => `• ${t.title} - Due ${t.due_date} (${t.assigned_to})`).join('\n')}`
      : 'No overdue tasks.';
  }
  if (q.includes('high priority') || q.includes('priority')) {
    return highPriority.length
      ? `**High/urgent priority (${highPriority.length}):**\n${highPriority.map((t: any) => `• ${t.title} (${t.assigned_to})`).join('\n')}`
      : 'No high priority tasks.';
  }
  if (q.includes('most tasks') || q.includes('who has')) {
    return mostTasks ? `**${mostTasks[0]}** has the most tasks: ${mostTasks[1]}.` : 'No tasks assigned yet.';
  }
  if (q.includes('summarize') || q.includes('summary') || q.includes('all tasks')) {
    return `**Summary:** ${filtered.length} total tasks. ${filtered.filter((t: any) => t.status === 'done').length} done, ${filtered.filter((t: any) => t.status === 'in_progress').length} in progress, ${filtered.filter((t: any) => t.status === 'todo').length} to do. ${overdue.length} overdue.`;
  }
  if (q.includes('this week')) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const dueWeek = filtered.filter((t: any) => t.due_date && t.due_date >= today && t.due_date <= weekEndStr);
    return dueWeek.length
      ? `**Tasks due this week (${dueWeek.length}):**\n${dueWeek.map((t: any) => `• ${t.title} - ${t.due_date} (${t.assigned_to})`).join('\n')}`
      : 'No tasks due this week.';
  }
  return `You have ${filtered.length} tasks. Ask about "tasks due today", "overdue tasks", "high priority tasks", "who has the most tasks", or "summarize all tasks" for more details.`;
}

export interface TaskFormDataUser {
  id: number;
  name: string;
  email?: string;
}

async function getWithFirstPath<T>(paths: string[]): Promise<T | null> {
  for (const path of paths) {
    try {
      const response = await apiClient.get(path);
      return response.data as T;
    } catch (e: any) {
      if (e?.response?.status === 404) continue;
      throw e;
    }
  }
  return null;
}

export const taskAPI = {
  getFormData: async (): Promise<{
    current_user: TaskFormDataUser;
    company_users: TaskFormDataUser[];
  }> => {
    const custom = process.env.NEXT_PUBLIC_TASK_FORM_DATA_PATH?.trim();
    /** GET /api/tasks/get-user-list — override path via NEXT_PUBLIC_TASK_FORM_DATA_PATH if needed. */
    const paths = [custom, '/tasks/get-user-list'].filter(Boolean) as string[];
    try {
      const raw = await getWithFirstPath<{ data?: any } | any>(paths);
      const envelope = raw?.data ?? raw ?? {};
      const inner = envelope?.data ?? envelope;
      return {
        current_user: inner?.current_user ?? { id: 0, name: '', email: '' },
        company_users: Array.isArray(inner?.company_users) ? inner.company_users : [],
      };
    } catch {
      return { current_user: { id: 0, name: '', email: '' }, company_users: [] };
    }
  },

  getTasks: async (params?: {
    viewer?: string;
    role?: TaskApiRole;
    status?: string;
    priority?: string;
    search?: string;
    project_id?: number | string;
  }): Promise<any[]> => {
    const qp: Record<string, string> = {};
    if (params?.viewer?.trim()) qp.viewer = params.viewer.trim();
    if (params?.role) qp.role = params.role;
    if (params?.status && params.status !== 'all') qp.status = params.status;
    if (params?.priority && params.priority !== 'all') qp.priority = params.priority;
    if (params?.search?.trim()) qp.search = params.search.trim();
    if (params?.project_id != null && params.project_id !== '') qp.project_id = String(params.project_id);

    try {
      const response = await apiClient.get('/tasks', { params: qp });
      const raw = parseTasksResponse(response.data);
      return raw.map(normalizeTaskRow);
    } catch (e: any) {
      const st = e?.response?.status;
      if (st === 422) return [];
      throw {
        message: e?.response?.data?.message || e?.message || 'Failed to load tasks',
        errors: e?.response?.data?.errors || {},
      } as ApiError;
    }
  },

  createTask: async (payload: {
    title: string;
    description?: string;
    assigned_to?: string;
    assigned_by?: string;
    assigned_to_user_id?: number;
    assigned_by_user_id?: number;
    due_date?: string;
    priority?: string;
    status?: string;
    tags?: string[];
    project_id?: number | string;
  }): Promise<any> => {
    const body: Record<string, unknown> = {
      title: payload.title,
      description: payload.description ?? '',
      due_date: payload.due_date || null,
      priority: payload.priority ?? 'medium',
      status: payload.status ?? 'todo',
      tags: payload.tags ?? [],
    };
    if (payload.project_id != null && payload.project_id !== '') body.project_id = Number(payload.project_id);

    if (payload.assigned_to_user_id != null) {
      body.assigned_to_user_id = Number(payload.assigned_to_user_id);
    } else if (payload.assigned_to?.trim()) {
      body.assigned_to = payload.assigned_to.trim();
    }

    if (payload.assigned_by_user_id != null) {
      body.assigned_by_user_id = Number(payload.assigned_by_user_id);
    } else if (payload.assigned_by?.trim()) {
      body.assigned_by = payload.assigned_by.trim();
    }

    const response = await apiClient.post('/tasks', body);
    const created = response.data?.data ?? response.data;
    return normalizeTaskRow(created);
  },

  /**
   * PATCH or PUT /tasks/{uuid} — Laravel: tenant + assignee only.
   * Body: at least one of `description`, `status` (`todo` | `in_progress` | `done`), `remark`.
   * Status updates often send `{ status, remark }` (remark optional).
   * 403 "Only assigned user can edit this task", 422 if neither field sent, 404 if missing.
   */
  updateTask: async (
    uuid: string,
    payload: Partial<{
      description: string | null;
      status: string;
      remark: string;
    }>
  ): Promise<any> => {
    const body: Record<string, unknown> = {};
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.remark !== undefined) body.remark = payload.remark;
    if (Object.keys(body).length === 0) {
      throw {
        message: 'At least one field is required: description, status, or remark',
        errors: {},
      } as ApiError;
    }
    try {
      const response = await apiClient.patch(`/tasks/${encodeURIComponent(uuid)}`, body);
      const updated = response.data?.data ?? response.data;
      return normalizeTaskRow(updated);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === 'string' ? e.response.data : null) ||
        e?.message ||
        'Failed to update task';
      throw {
        message: msg,
        errors: e?.response?.data?.errors || {},
        status: e?.response?.status,
      } as ApiError;
    }
  },

  deleteTask: async (uuid: string): Promise<void> => {
    try {
      await apiClient.delete(`/tasks/${encodeURIComponent(uuid)}`);
    } catch (e: any) {
      throw {
        message: e?.response?.data?.message || e?.message || 'Failed to delete task',
        errors: e?.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /** GET /tasks/{uuid} — single TaskResource (404 / wrong company). */
  getTask: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/tasks/${encodeURIComponent(uuid)}`);
      const row = response.data?.data ?? response.data;
      return normalizeTaskRow(row);
    } catch (e: any) {
      throw {
        message: e?.response?.data?.message || e?.message || 'Failed to load task',
        errors: e?.response?.data?.errors || {},
        status: e?.response?.status,
      } as ApiError;
    }
  },

  aiQuery: async (query: string, viewer?: string | null): Promise<{ response: string }> => {
    try {
      const raw = await taskAPI.getTasks({ viewer: viewer || undefined });
      return { response: taskAiHeuristics(raw, query, viewer) };
    } catch {
      return { response: 'Could not load tasks for insights.' };
    }
  },
};

// Export default for convenience
export default {
  auth: authAPI,
  user: userAPI,
  masterData: masterDataAPI,
  document: documentAPI,
  common: commonAPI,
  teams: teamsAPI,
  rolePermissions: rolePermissionsAPI,
  materialRequest: materialRequestAPI,
  rfq: rfqAPI,
  goodsReturn: goodsReturnAPI,
  goodsIssue: goodsIssueAPI,
  goodsReceipt: goodsReceiptAPI,
  dashboard: dashboardAPI,
  task: taskAPI,
};
