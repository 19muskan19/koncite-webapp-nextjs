# API Configuration Guide

## Base URL Configuration

The API base URL is configured in `services/apiClient.ts`. It uses environment variables with fallback defaults.

### Environment Variables

Create a `.env.local` file in your project root:

```env
# API Base URL Configuration
# Production: https://koncite.com/api
# Staging: https://staging.koncite.com/api
# Local: http://localhost/api

NEXT_PUBLIC_API_URL=https://staging.koncite.com/api
# OR
NEXT_PUBLIC_API_BASE_URL=https://staging.koncite.com/api
```

### Priority Order

1. `NEXT_PUBLIC_API_URL` (preferred)
2. `NEXT_PUBLIC_API_BASE_URL` (fallback)
3. Default: `https://staging.koncite.com/api`

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication Endpoints

- **POST** `/api/sign-up` - User registration (FormData)
- **POST** `/api/sign-in` - User login (JSON)
- **POST** `/api/otp_verification` - Verify OTP (JSON)
- **POST** `/api/resend-otp-verification` - Resend OTP (JSON)
- **POST** `/api/forgot-email` - Request password reset OTP (JSON)
- **POST** `/api/forgot-email-otp-verification` - Verify password reset OTP (JSON)
- **POST** `/api/forgot-password-update` - Update password (JSON)
- **POST** `/api/logout` - Logout (JSON, requires auth)

### Sign-up Request Format

The sign-up endpoint uses **FormData** (multipart/form-data) to support file uploads:

```typescript
{
  company_name: string;
  company_address: string;
  company_country_code: '91' | '971';  // India or UAE
  company_phone: string;
  country_code: '91' | '971';  // India or UAE
  phone: string;
  name: string;
  email: string;
  password: string;
  profile_images?: File;  // Optional image file
}
```

### Country Codes

Only two country codes are supported:
- `'91'` - India (+91)
- `'971'` - UAE (+971)

### Response Format

All API responses follow this structure:

```typescript
{
  status: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      // ... other user fields
    };
  };
  errors?: Record<string, string[]>;
}
```

## Token Management

- Tokens are automatically stored in `localStorage` as `auth_token`
- Tokens are automatically included in Authorization header for authenticated requests
- Token is cleared on logout or 401 errors

## Usage Example

```typescript
import { authAPI } from '@/services/api';

// Sign up
const signupData = {
  company_name: 'My Company',
  company_address: '123 Main St',
  company_country_code: '91',
  company_phone: '1234567890',
  country_code: '91',
  phone: '9876543210',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
};

await authAPI.signup(signupData);

// Login
await authAPI.login('john@example.com', 'password123');

// Verify OTP
await authAPI.verifyOtp('john@example.com', '123456');
```

## Error Handling

All API functions throw `ApiError` objects:

```typescript
try {
  await authAPI.signup(data);
} catch (error) {
  console.error(error.message);  // Error message
  console.error(error.errors);   // Validation errors object
  console.error(error.status);   // HTTP status code
}
```
