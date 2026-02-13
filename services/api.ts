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
  // Route: GET /project-list -> projectlist()
  getProjects: async (): Promise<any[]> => {
    try {
      console.log('🔵 Calling GET /project-list API...');
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
      const payload = { project_id: projectId };
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
      console.error('❌ /project-subproject error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch project subprojects',
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
      const response = await apiClient.post('/companies-search', { search: searchQuery });
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
  getCompany: async (uuid: string): Promise<any> => {
    try {
      const uuidParam = String(uuid).trim();
      console.log('📖 Calling GET /companies-edit/' + uuidParam);
      console.log('Company UUID details:', {
        original: uuid,
        trimmed: uuidParam,
        length: uuidParam.length,
        type: typeof uuidParam
      });
      
      const response = await apiClient.get(`/companies-edit/${encodeURIComponent(uuidParam)}`);
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
  getMaterialsOpeningList: async (projectId?: number | string, storeId?: number | string): Promise<any> => {
    try {
      const payload: Record<string, any> = {};
      if (projectId) payload.projectId = projectId;
      if (storeId) payload.storeId = storeId;
      const response = await apiClient.post('/materials-opening-list', payload);
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
  // DPR-specific subproject APIs - uses POST /project-subproject (same as getProjectSubprojects)
  fetchProjectSubproject: async (data?: Record<string, any>): Promise<any> => {
    try {
      const payload = data || {};
      const projectId = payload.project_id ?? payload.projectId;
      if (!projectId) {
        console.warn('fetchProjectSubproject: No project_id in payload, returning empty array');
        return [];
      }
      // Use existing /project-subproject endpoint (fetch-project-subproject does not exist on backend)
      const response = await apiClient.post('/project-subproject', { project_id: projectId });
      let result: any = null;
      if (response.data?.data !== undefined) {
        result = response.data.data;
      } else if (response.data) {
        result = response.data;
      }
      return result ?? [];
    } catch (error: any) {
      console.error('❌ /project-subproject (fetchProjectSubproject) error:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch project subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
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

// Safety API - Matching Laravel routes (SafetyController)
export const safetyAPI = {
  getSafetyList: async (params?: { project_id?: string | number; subproject_id?: string | number }): Promise<any[]> => {
    try {
      const response = await apiClient.get('/safety-list', { params: params || {} });
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch safety list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  addSafety: async (data: Record<string, any>): Promise<any> => {
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

// DPR API - Matching Laravel routes (DprController)
export const dprAPI = {
  getList: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/dpr-list');
      const res = response.data;
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        const d = res.data;
        if (Array.isArray(d.dprs)) return d.dprs;
        if (Array.isArray(d.list)) return d.list;
        if (Array.isArray(d.items)) return d.items;
      }
      return [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch DPR list',
        errors: error.response?.data?.errors || {},
      } as ApiError;
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
      const response = await apiClient.post('/fetch-dpr-history-edit', data);
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
  bulkAdd: async (formData: FormData): Promise<any> => {
    try {
      const response = await apiClient.post('/dpr-bulk-add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to add DPR',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
};

// Document Management API - Matching Laravel routes
export const documentAPI = {
  /**
   * Get documents
   * GET /api/documents
   */
  getDocuments: async (params: {
    category: 'office' | 'project' | 'shared';
    project_id?: number;
    folder_uuid?: string;
    folder_path?: string;
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
   * Download document
   * POST /api/documents/download
   */
  downloadDocument: async (file_path: string, original_name?: string): Promise<any> => {
    try {
      const response = await apiClient.post('/documents/download', {
        file_path,
        original_name,
      }, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to download document',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

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
   * Get gallery images
   * GET /api/documents/gallery
   */
  getGalleryImages: async (params?: {
    project_id?: number;
    category?: 'office' | 'project' | 'shared';
    page?: number;
    per_page?: number;
  }): Promise<any> => {
    try {
      const response = await apiClient.get('/documents/gallery', { params });
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

// Teams / Staff API - Operations > Staff (TeamsController)
// Backend: teamsList, teamsAdd, edit, details, delete, search
export const teamsAPI = {
  /**
   * Get staff/teams list
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
   * Create or update staff
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
   * Get staff by uuid
   * GET /teams-edit/{uuid} -> edit()
   */
  getStaff: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/teams-edit/${encodeURIComponent(uuid)}`);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Delete staff
   * DELETE /teams-delete/{uuid} -> delete()
   */
  deleteStaff: async (uuid: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/teams-delete/${encodeURIComponent(uuid)}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete staff',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Search staff
   * POST /teams-search -> search()
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
};

// Export default for convenience
export default {
  auth: authAPI,
  user: userAPI,
  masterData: masterDataAPI,
  document: documentAPI,
  common: commonAPI,
  teams: teamsAPI,
};
