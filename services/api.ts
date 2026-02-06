import apiClient, { API_BASE_URL, getAuthToken } from './apiClient';
import { setCookie, removeCookie } from '../utils/cookies';

// Types
export type CountryCode = '91' | '971';

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string; // Required by Laravel for password validation
  company_name: string;
  company_address: string;
  company_phone: string;
  company_country_code: string;
  country: number | string; // Country ID (integer) - required by Laravel
  country_code: string;
  phone: string;
  profile_images?: File; // Optional file upload
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
  message?: string;
  data?: {
    token?: string;
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

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
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
      const response = await apiClient.post('/sign-in', { 
        email, 
        password,
        ...(fcm_token && { fcm_token })
      });
      
      const data = response.data;
      
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
      // Log the full error for debugging
      console.error('Login API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Extract error message from Laravel response
      const errorData = error.response?.data || {};
      const message = errorData.message || error.message || 'Login failed';
      
      throw {
        message,
        errors: errorData.errors || {},
        status: error.response?.status,
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
   */
  forgotPasswordUpdate: async (email: string, newPassword: string): Promise<{ message?: string; errors?: Record<string, string[]> }> => {
    try {
      const response = await apiClient.post('/forgot-password-update', { 
        email, 
        newPassword 
      });
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

// User Profile API
export const userAPI = {
  /**
   * Get current user profile
   * GET /api/profile-list
   * Response structure: { status: true, response_code: 200, message: "...", data: { ...user... } }
   */
  getProfile: async (): Promise<{ data?: any; user?: any; status?: boolean }> => {
    try {
      console.log('🔵 Calling /profile-list API...');
      const response = await apiClient.get('/profile-list');
      console.log('✅ /profile-list response:', response.data);
      
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
      console.error('❌ /profile-list API error:', error);
      // Preserve status code for proper error handling
      const apiError: ApiError & { status?: number } = {
        message: error.response?.data?.message || 'Failed to fetch profile',
        errors: error.response?.data?.errors || {},
        status: error.response?.status,
      };
      
      // If 404, log a warning but still throw so caller can handle it
      if (error.response?.status === 404) {
        console.warn('User profile endpoint /profile-list not found (404). User data will be sourced from login/OTP response.');
      }
      
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
};

// Master Data API - CRUD operations for projects, companies, materials, etc.
export const masterDataAPI = {
  // Projects - Matching Laravel routes
  getProjects: async (): Promise<any[]> => {
    try {
      console.log('🔵 Calling /project-list API...');
      const response = await apiClient.get('/project-list');
      console.log('✅ /project-list response:', response.data);
      console.log('Response structure:', {
        status: response.data?.status,
        response_code: response.data?.response_code,
        message: response.data?.message,
        dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'not array',
        isDataArray: Array.isArray(response.data),
      });
      
      // Handle response structure: { status: true, response_code: 200, message: "...", data: [...] }
      let projects: any[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        projects = response.data.data;
        console.log('✅ Extracted projects from response.data.data:', projects.length);
      } else if (Array.isArray(response.data)) {
        projects = response.data;
        console.log('✅ Using response.data as array:', projects.length);
      } else {
        console.warn('⚠️ Unexpected response structure:', response.data);
        projects = [];
      }
      
      console.log('📦 Returning projects:', projects);
      return projects;
    } catch (error: any) {
      console.error('❌ /project-list API error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch projects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createProject: async (data: FormData | Record<string, any>): Promise<any> => {
    try {
      console.log('🔵 Creating project via /project-add API...');
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
      console.log('✅ Project created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchProjects: async (searchQuery: string): Promise<any[]> => {
    try {
      const response = await apiClient.post('/project-search', { search_keyword: searchQuery });
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search projects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getProject: async (uuid: string): Promise<any> => {
    try {
      // Backend route: GET /project-edit/{uuid}
      // NOTE: Even though route parameter is named {uuid}, backend function uses:
      //   where('id', $uuid) - which queries the numeric 'id' column
      // So we need to pass the numeric ID, not the UUID
      const idParam = String(uuid).trim();
      console.log('📖 Calling GET /project-edit/' + idParam);
      console.log('Project ID details:', {
        original: uuid,
        trimmed: idParam,
        length: idParam.length,
        type: typeof idParam,
        isNumeric: !isNaN(Number(idParam)),
        note: 'Backend queries numeric id column, not uuid column'
      });
      
      const response = await apiClient.get(`/project-edit/${encodeURIComponent(idParam)}`);
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
  getProjectSubprojects: async (projectId: number | string): Promise<any> => {
    try {
      const response = await apiClient.post('/project-subproject', { project_id: projectId });
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch subprojects',
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
  getCompanies: async (): Promise<any[]> => {
    try {
      console.log('=== GET COMPANIES API CALL ===');
      console.log('Making GET request to /companies-list');
      const token = getAuthToken();
      console.log('Auth token present:', !!token);
      
      const response = await apiClient.get('/companies-list');
      console.log('getCompanies API response status:', response.status);
      console.log('getCompanies API response data:', response.data);
      console.log('Response headers:', response.headers);
      
      // Handle different response structures
      let companies: any[] = [];
      if (Array.isArray(response.data)) {
        companies = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        companies = response.data.data;
      } else if (response.data?.companies && Array.isArray(response.data.companies)) {
        companies = response.data.companies;
      } else {
        console.warn('Unexpected API response structure:', response.data);
        companies = [];
      }
      
      console.log('Extracted companies array:', companies);
      console.log('Number of companies:', companies.length);
      console.log('=== GET COMPANIES API CALL COMPLETE ===');
      
      return companies;
    } catch (error: any) {
      console.error('=== GET COMPANIES API ERROR ===');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('=== END ERROR ===');
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

      const response = await apiClient.post('/companies-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create company',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  searchCompanies: async (searchQuery: string): Promise<any[]> => {
    try {
      const response = await apiClient.post('/companies-search', { search: searchQuery });
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to search companies',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  getCompany: async (uuid: string): Promise<any> => {
    try {
      // Note: Parameter is named 'uuid' but backend expects numeric 'id' field
      const idParam = String(uuid).trim();
      console.log('📖 Calling GET /companies-edit/' + idParam);
      console.log('Company ID details:', {
        original: uuid,
        trimmed: idParam,
        length: idParam.length,
        type: typeof idParam,
        isNumeric: !isNaN(Number(idParam))
      });
      
      const response = await apiClient.get(`/companies-edit/${encodeURIComponent(idParam)}`);
      console.log('✅ /companies-edit response:', response.data);
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
        console.warn('⚠️ Company data is null or empty in API response');
        result = {};
      }
      
      console.log('✅ Extracted company data:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      return result;
    } catch (error: any) {
      console.error('❌ /companies-edit error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message,
        url: error.config?.url,
        method: error.config?.method,
        uuid: uuid
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
  deleteCompany: async (uuid: string): Promise<any> => {
    try {
      // Backend route: DELETE /companies-delete/{uuid}
      // NOTE: Even though route parameter is named {uuid}, backend function uses:
      //   where('id', $uuid) - which queries the numeric 'id' column
      // So we need to pass the numeric ID, not the UUID
      const idParam = String(uuid).trim();
      console.log('🗑️ Calling DELETE /companies-delete/' + idParam);
      console.log('Company ID details:', {
        original: uuid,
        trimmed: idParam,
        length: idParam.length,
        type: typeof idParam,
        isNumeric: !isNaN(Number(idParam)),
        note: 'Backend queries numeric id column, not uuid column'
      });
      
      // URL encode the ID to handle any special characters
      const deleteUrl = `/companies-delete/${encodeURIComponent(idParam)}`;
      console.log('🗑️ Delete URL:', deleteUrl);
      console.log('🗑️ Using numeric ID for deletion (backend queries id column):', idParam);
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
      throw {
        message: error.response?.data?.message || 'Failed to create material',
        errors: error.response?.data?.errors || {},
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
      // Include updateId in data for updates
      const updateData = { ...data, updateId: uuid };
      const response = await apiClient.post('/materials-add', updateData);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteMaterial: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/materials-delete/${uuid}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Labours - Matching Laravel routes
  getLabours: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/labour-list');
      return response.data.data || response.data || [];
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
  updateLabour: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/labour-add is used for both create and update
      // Include updateId in data for updates
      const updateData = { ...data, updateId: uuid };
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

  // Activities - Matching Laravel routes
  getActivities: async (projectId?: number | string, subprojectId?: number | string): Promise<any[]> => {
    try {
      const payload: any = {};
      if (projectId) payload.project = projectId;
      if (subprojectId) payload.subproject = subprojectId;
      
      // Use POST if payload has data, otherwise GET
      const response = Object.keys(payload).length > 0
        ? await apiClient.post('/activities-list', payload)
        : await apiClient.get('/activities-list');
      return response.data.data || response.data || [];
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
  searchSubprojects: async (searchKeyword?: string): Promise<any[]> => {
    try {
      const payload = searchKeyword ? { search_keyword: searchKeyword } : {};
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

  // Units - Matching Laravel routes
  getUnits: async (): Promise<any[]> => {
    try {
      const token = getAuthToken();
      console.log('📦 Fetching units - Token present:', !!token);
      console.log('📦 Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
      
      const response = await apiClient.get('/unit-list');
      console.log('✅ Units API response:', response.data);
      console.log('✅ Response status:', response.status);
      console.log('✅ Number of units received:', Array.isArray(response.data?.data) ? response.data.data.length : Array.isArray(response.data) ? response.data.length : 0);
      
      const units = response.data.data || response.data || [];
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
      // Route: GET /unit-edit/{uuid}
      // Backend uses where('id', $uuid) - but route parameter is named 'uuid'
      // Try UUID first, then fallback to numeric ID if UUID format doesn't match
      const idParam = String(uuid).trim();
      console.log('📖 Fetching unit details - GET /unit-edit/' + idParam);
      console.log('📖 ID details:', {
        original: uuid,
        trimmed: idParam,
        isNumeric: !isNaN(Number(idParam)),
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam)
      });
      const response = await apiClient.get(`/unit-edit/${encodeURIComponent(idParam)}`);
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
  updateUnit: async (uuid: string, data: Record<string, any>): Promise<any> => {
    try {
      // POST /api/unit-add is used for both create and update
      // Include updateId in data for updates
      console.log('📝 Updating unit - POST /unit-add (with updateId)');
      console.log('📝 Numeric ID (updateId):', uuid);
      console.log('📝 Update data (before adding updateId):', JSON.stringify(data, null, 2));
      console.log('📝 is_active value being sent:', data.is_active, 'Type:', typeof data.is_active);
      console.log('📝 Status change:', data.is_active === 1 ? 'ACTIVE' : 'INACTIVE/DISABLED');
      
      // Ensure is_active is explicitly included and is a number (1 or 0)
      const updateData = { 
        ...data, 
        updateId: uuid,
        is_active: data.is_active !== undefined ? Number(data.is_active) : (data.is_active === 0 ? 0 : 1)
      };
      
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
      return response.data.data || response.data || [];
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

// Export default for convenience
export default {
  auth: authAPI,
  user: userAPI,
  masterData: masterDataAPI,
  common: commonAPI,
};
