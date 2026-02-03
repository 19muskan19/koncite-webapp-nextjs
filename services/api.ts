import apiClient, { API_BASE_URL, getAuthToken } from './apiClient';

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
      
      // Store only auth token - use user data from login response
      if (data.status && data.data?.token) {
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
      
      // Store only auth token - use user data from OTP verification response
      if (data.status && data.data?.token) {
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
      return response.data;
    } catch (error: any) {
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
   * GET /api/get-profile
   */
  getProfile: async (): Promise<{ data?: { user?: any } }> => {
    try {
      const response = await apiClient.get('/get-profile');
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch profile',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  /**
   * Update user profile
   * POST /api/update-profile
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

      const response = await apiClient.post('/update-profile', formData, {
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
};

// Master Data API - CRUD operations for projects, companies, materials, etc.
export const masterDataAPI = {
  // Projects
  getProjects: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/projects');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch projects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createProject: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/projects', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateProject: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/projects/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteProject: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/projects/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete project',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Companies
  getCompanies: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/companies');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch companies',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createCompany: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/companies', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create company',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateCompany: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/companies/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update company',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteCompany: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/companies/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete company',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Materials
  getMaterials: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/materials');
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
      const response = await apiClient.post('/materials', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateMaterial: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/materials/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteMaterial: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/materials/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete material',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Labours
  getLabours: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/labours');
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
      const response = await apiClient.post('/labours', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateLabour: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/labours/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteLabour: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/labours/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete labour',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Vendors
  getVendors: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/vendors');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch vendors',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createVendor: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/vendors', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateVendor: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/vendors/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteVendor: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/vendors/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete vendor',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Activities
  getActivities: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/activities');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch activities',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createActivity: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/activities', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateActivity: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/activities/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteActivity: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/activities/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete activity',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Subprojects
  getSubprojects: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/subprojects');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch subprojects',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createSubproject: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/subprojects', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateSubproject: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/subprojects/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteSubproject: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/subprojects/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete subproject',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Units
  getUnits: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/units');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch units',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createUnit: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/units', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateUnit: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/units/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteUnit: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/units/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete unit',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Warehouses
  getWarehouses: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/warehouses');
      return response.data.data || response.data || [];
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch warehouses',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  createWarehouse: async (data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.post('/warehouses', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create warehouse',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateWarehouse: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/warehouses/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update warehouse',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteWarehouse: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/warehouses/${id}`);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete warehouse',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },

  // Assets/Equipments
  getAssetsEquipments: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/assets-equipments');
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
      const response = await apiClient.post('/assets-equipments', data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to create asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  updateAssetEquipment: async (id: string | number, data: Record<string, any>): Promise<any> => {
    try {
      const response = await apiClient.put(`/assets-equipments/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to update asset/equipment',
        errors: error.response?.data?.errors || {},
      } as ApiError;
    }
  },
  deleteAssetEquipment: async (id: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/assets-equipments/${id}`);
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
