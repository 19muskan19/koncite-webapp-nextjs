# Laravel Backend Debugging Guide

## Issue: User Name Not Showing After Login & Data Not Stored in Database

### Frontend Status ✅
The frontend is now:
- ✅ Sending all required fields in signup request
- ✅ Properly handling login/OTP responses
- ✅ Dispatching user data via events
- ✅ Logging all API responses for debugging

### What to Check in Laravel Backend

## 1. Check Signup Endpoint (`/api/sign-up`)

### Expected Request Format:
```php
// FormData with these fields:
- name: string (required)
- email: string (required)
- password: string (required)
- password_confirmation: string (required)
- phone: string (required)
- country: integer (required) - Country ID
- country_code: string (required) - e.g., "91", "971"
- company_name: string (required)
- company_address: string (required)
- company_phone: string (required)
- company_country_code: string (required) - e.g., "91", "971"
- profile_images: file (optional)
```

### Expected Response Format:
```php
// Success Response:
{
  "status": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "country_id": 91,
      "country_code": "91",
      "company_name": "My Company",
      // ... other user fields
    }
  }
}

// Error Response:
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email has already been taken."],
    // ... other validation errors
  }
}
```

### Check Your Laravel Controller:

**File:** `app/Http/Controllers/AuthController.php` (or similar)

```php
public function signUp(Request $request)
{
    // 1. Validate request
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'password' => 'required|string|min:6|confirmed',
        'phone' => 'required|string',
        'country' => 'required|integer|exists:countries,id',
        'country_code' => 'required|string',
        'company_name' => 'required|string|max:255',
        'company_address' => 'required|string',
        'company_phone' => 'required|string',
        'company_country_code' => 'required|string',
        'profile_images' => 'nullable|image|max:2048',
    ]);

    try {
        DB::beginTransaction();

        // 2. Create Company
        $company = Company::create([
            'name' => $validated['company_name'],
            'address' => $validated['company_address'],
            'phone' => $validated['company_phone'],
            'country_code' => $validated['company_country_code'],
        ]);

        // 3. Handle profile image upload
        $profileImagePath = null;
        if ($request->hasFile('profile_images')) {
            $profileImagePath = $request->file('profile_images')->store('profiles', 'public');
        }

        // 4. Create User
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'],
            'country_id' => $validated['country'],
            'country_code' => $validated['country_code'],
            'company_id' => $company->id,
            'profile_image' => $profileImagePath,
            'email_verified_at' => null, // Will be verified via OTP
        ]);

        // 5. Send OTP (if you have OTP functionality)
        // ... your OTP sending logic here

        DB::commit();

        // 6. Return response WITH user data
        return response()->json([
            'status' => true,
            'message' => 'User registered successfully. Please verify your email.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'country_id' => $user->country_id,
                    'country_code' => $user->country_code,
                    'company_name' => $company->name,
                    // Include all fields you need in frontend
                ]
            ]
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Signup error: ' . $e->getMessage());
        return response()->json([
            'status' => false,
            'message' => 'Registration failed. Please try again.',
            'errors' => ['general' => [$e->getMessage()]]
        ], 500);
    }
}
```

## 2. Check Login Endpoint (`/api/sign-in`)

### Expected Response Format:
```php
{
  "status": true,
  "message": "Login successful",
  "data": {
    "token": "your-jwt-token-here",
    "user": {
      "id": 1,
      "name": "John Doe",  // ⚠️ THIS IS CRITICAL - Must include name
      "email": "john@example.com",
      "phone": "1234567890",
      "company_name": "My Company",
      // ... other user fields
    }
  }
}
```

### Check Your Login Controller:

```php
public function signIn(Request $request)
{
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    if (Auth::attempt($credentials)) {
        $user = Auth::user();
        
        // ⚠️ IMPORTANT: Check if email is verified (if OTP is required)
        if (!$user->email_verified_at) {
            return response()->json([
                'status' => false,
                'message' => 'Please verify your email with OTP first.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        // ⚠️ CRITICAL: Return user data with token
        return response()->json([
            'status' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,  // ⚠️ MUST INCLUDE NAME
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'company_name' => $user->company->name ?? null,
                    // Include all fields needed in frontend
                ]
            ]
        ], 200);
    }

    return response()->json([
        'status' => false,
        'message' => 'Invalid credentials',
    ], 401);
}
```

## 3. Check OTP Verification Endpoint (`/api/otp_verification`)

### Expected Response Format:
```php
{
  "status": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "your-jwt-token-here",
    "user": {
      "id": 1,
      "name": "John Doe",  // ⚠️ MUST INCLUDE NAME
      "email": "john@example.com",
      // ... other user fields
    }
  }
}
```

## 4. Database Structure Check

### Users Table:
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NULL,
    country_id BIGINT UNSIGNED NULL,
    country_code VARCHAR(10) NULL,
    company_id BIGINT UNSIGNED NULL,
    profile_image VARCHAR(255) NULL,
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (country_id) REFERENCES countries(id)
);
```

### Companies Table:
```sql
CREATE TABLE companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NULL,
    phone VARCHAR(255) NULL,
    country_code VARCHAR(10) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

## 5. Debugging Steps

### Step 1: Check Laravel Logs
```bash
tail -f storage/logs/laravel.log
```
Look for:
- Signup errors
- Database errors
- Validation errors
- Transaction rollbacks

### Step 2: Test Signup with cURL
```bash
curl -X POST https://staging.koncite.com/api/sign-up \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "password=password123" \
  -F "password_confirmation=password123" \
  -F "phone=1234567890" \
  -F "country=91" \
  -F "country_code=91" \
  -F "company_name=Test Company" \
  -F "company_address=123 Test St" \
  -F "company_phone=9876543210" \
  -F "company_country_code=91" \
  -v
```

### Step 3: Check Database Directly
```sql
-- Check if users are being created
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Check if companies are being created
SELECT * FROM companies ORDER BY created_at DESC LIMIT 5;

-- Check if user has company
SELECT u.*, c.name as company_name 
FROM users u 
LEFT JOIN companies c ON u.company_id = c.id 
ORDER BY u.created_at DESC LIMIT 5;
```

### Step 4: Check API Response in Browser
1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform signup/login
4. Check the response in the Network tab
5. Look for console logs (already added in frontend)

## Common Issues & Solutions

### Issue 1: Data Not Saved in Database
**Possible Causes:**
- Transaction not committed
- Validation failing silently
- Database connection issue
- Foreign key constraint failing

**Solution:**
- Check Laravel logs for errors
- Ensure `DB::commit()` is called
- Verify database connection
- Check foreign key constraints

### Issue 2: User Name Not Showing
**Possible Causes:**
- Login/OTP response doesn't include user data
- User data structure doesn't match frontend expectations
- User data doesn't include `name` field

**Solution:**
- Ensure login/OTP response includes `data.user.name`
- Check browser console logs (frontend logs all responses)
- Verify user data structure matches frontend expectations

### Issue 3: Signup Returns Success But No Data in DB
**Possible Causes:**
- Transaction rolled back due to exception
- Database write permissions issue
- Model events preventing save

**Solution:**
- Check Laravel logs for exceptions
- Verify database user has write permissions
- Check model events/observers

## Next Steps

1. **Check Laravel logs** - Look for errors during signup
2. **Verify database structure** - Ensure tables exist and have correct columns
3. **Test API endpoints** - Use cURL or Postman to test directly
4. **Check browser console** - Frontend logs all API responses
5. **Verify response format** - Ensure responses match expected structure

## Frontend Console Logs to Check

After signup/login, check browser console for:
- `=== SIGNUP REQUEST DEBUG ===` - Shows data being sent
- `=== SIGNUP RESPONSE DEBUG ===` - Shows response received
- `=== LOGIN API DEBUG ===` - Shows login response
- `=== OTP VERIFICATION DEBUG ===` - Shows OTP response
- `UserContext: Received userLoggedIn event` - Shows if user data is received

If any of these show missing or null user data, the issue is in the Laravel backend response format.
