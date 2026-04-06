import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getCookie } from '../utils/cookies';

// Error response data interface
interface ErrorResponseData {
  message?: string;
  [key: string]: any;
}

// API Base URL Configuration
// In browser: use /api-proxy to avoid CORS (Next.js rewrites proxy to backend). Server-side: use backend URL directly.
const isBrowser = typeof window !== 'undefined';
const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://koncite.com/api';
const isCrossOrigin = /^https?:\/\//.test(backendApiUrl);
export const API_BASE_URL = isBrowser && isCrossOrigin ? '/api-proxy' : backendApiUrl;

// Get auth token from cookies or localStorage (fallback)
export const getAuthToken = (): string | null => {
  // First try cookies
  const cookieToken = getCookie('auth_token');
  if (cookieToken) {
    return cookieToken;
  }
  
  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const localStorageToken = localStorage.getItem('auth_token');
    if (localStorageToken) {
      return localStorageToken;
    }
  }
  
  return null;
};

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (multipart/form-data)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Handle different error status codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          // But check if token exists first - if not, don't logout (might be expected)
          if (typeof window !== 'undefined') {
            const token = getAuthToken();
            const reqPath = String(error.config?.url || '');
            const reqBase = String(error.config?.baseURL || '');
            const urlForMatch = `${reqBase} ${reqPath}`;
            const responseData = (error.response?.data as ErrorResponseData) || {};
            const message = responseData?.message || '';
            
            // Don't logout for document endpoints if they return 401 - might be endpoint not found or permission issue
            // Let the component handle the error instead
            const isDocumentEndpoint = urlForMatch.includes('/documents');

            /**
             * Some APIs incorrectly return HTTP 401 for "face not verified" / enrollment validation errors.
             * Treating those as session expiry logs users out after a failed punch — only real auth failures should clear the token.
             */
            const isFaceVerificationEndpoint =
              urlForMatch.includes('face/punch-in') ||
              urlForMatch.includes('face/punch-out') ||
              urlForMatch.includes('face/enroll') ||
              urlForMatch.includes('face/re-enroll');
            
            if (isDocumentEndpoint || isFaceVerificationEndpoint) {
              if (isFaceVerificationEndpoint && process.env.NODE_ENV === 'development') {
                console.warn('⚠️ 401 on face API (not clearing session):', message || reqPath);
              }
              if (isDocumentEndpoint) {
                console.warn('⚠️ 401 on document API:', message || 'Check: (1) Auth token valid? (2) Laravel routes use auth:sanctum for API? (3) API URL correct?');
              }
              // Don't logout - let the component handle the error
            } else if (token) {
              // Only logout if token exists (meaning user was authenticated but token expired/invalid)
              // If no token, this might be expected for unauthenticated requests
              console.warn('⚠️ 401 Unauthorized - token exists but request failed. Logging out...', {
                url: reqPath,
                message,
              });
              const { removeCookie } = require('../utils/cookies');
              removeCookie('auth_token');
              removeCookie('isAuthenticated');
              // Also clear localStorage for backward compatibility
              localStorage.removeItem('auth_token');
              localStorage.removeItem('isAuthenticated');
              window.location.href = '/';
            } else {
              console.warn('⚠️ 401 Unauthorized - no token found. This might be expected.', {
                url: reqPath,
                message,
              });
            }
          }
          break;
        case 403: {
          const url = error.config?.url || '';
          const data = (error.response?.data as ErrorResponseData) || {};
          const msg = data?.message || data?.error || 'You do not have permission';
          console.error('Forbidden (403):', msg, { url, method: error.config?.method });
          break;
        }
        case 404:
          // Suppress 404 logs for known endpoints that may not exist or return 404 during normal use
          const url = error.config?.url || '';
          const suppress404 = [
            '/profile-list', '/sub-project-list', '/project-subproject', '/project-wise-subproject-search', '/fetch-project-subproject',
            '/get-work-overview', '/get-work-process', '/get-work-process-activities', '/get-inventory-stocks', '/get-inward-stocks',
            '/tasks/get-user-list',
          ].some(p => url.includes(p));
          if (!suppress404) {
            console.error('Not Found: The requested resource does not exist', url);
          }
          break;
        case 422:
          // Validation errors - these will be handled by the component
          break;
        case 429:
          console.error('Too Many Requests: Rate limit exceeded. Please wait a moment and try again.');
          break;
        case 500:
          // Server error - component handles it; no console spam
          break;
        default:
          console.error('An error occurred:', error.message);
      }
    } else if (error.request) {
      // Failed to fetch / network error - avoid spam; component shows toast
      if (process.env.NODE_ENV === 'development') {
        console.warn('Network error (server unreachable or CORS):', error.config?.url || error.message);
      }
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
