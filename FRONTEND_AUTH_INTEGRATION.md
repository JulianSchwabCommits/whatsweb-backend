# Frontend Authentication Integration Guide

Complete guide for integrating the authentication system into your frontend application.

## API Endpoints Reference

**Base URL:** `http://localhost:8080` (development) or your production URL

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login existing user |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout user |
| GET | `/auth/me` | Yes | Get current user profile |

---

## Data Types / Interfaces

```typescript
// Request DTOs
interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  fullName: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

// Response DTOs
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}
```

---

## Authentication Flow

### 1. Registration Flow

```typescript
async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch('http://localhost:8080/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }

  const data: AuthResponse = await response.json();
  
  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}

// Usage
try {
  const result = await register({
    email: 'user@example.com',
    password: 'SecurePass123!',
    username: 'johndoe',
    fullName: 'John Doe'
  });
  console.log('Registered:', result.user);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number or special character

**Validation Errors:**
- `400` - Invalid input (email format, password requirements, etc.)
- `409` - Username or email already exists

---

### 2. Login Flow

```typescript
async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch('http://localhost:8080/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }

  const data: AuthResponse = await response.json();
  
  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}

// Usage
try {
  const result = await login({
    email: 'user@example.com',
    password: 'SecurePass123!'
  });
  console.log('Logged in:', result.user);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

**Login Errors:**
- `401` - Invalid credentials
- `400` - Invalid input

---

### 3. Token Refresh Flow

Access tokens expire after 1 hour. Use the refresh token to get a new access token.

```typescript
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('http://localhost:8080/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Refresh token expired or invalid - user needs to login again
    localStorage.clear();
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  
  return data.accessToken;
}

// Automatic token refresh on 401 error
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // If token expired, refresh and retry
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      
      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
    } catch (error) {
      // Redirect to login
      window.location.href = '/login';
      throw error;
    }
  }

  return response;
}
```

---

### 4. Get Current User

```typescript
async function getCurrentUser(): Promise<User> {
  const response = await fetchWithAuth('http://localhost:8080/auth/me');

  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }

  return await response.json();
}

// Usage
try {
  const user = await getCurrentUser();
  console.log('Current user:', user);
} catch (error) {
  console.error('Failed to get user:', error);
}
```

---

### 5. Logout

```typescript
async function logout(): Promise<void> {
  const accessToken = localStorage.getItem('accessToken');

  try {
    await fetch('http://localhost:8080/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

// Usage
await logout();
window.location.href = '/login';
```

---

## Complete Auth Service (React/TypeScript)

```typescript
// services/authService.ts
export class AuthService {
  private static baseUrl = 'http://localhost:8080';

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();
    this.setTokens(result);
    return result;
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();
    this.setTokens(result);
    return result;
  }

  static async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Session expired');
    }

    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }

  static async getCurrentUser(): Promise<User> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/auth/me`);
    return await response.json();
  }

  static async logout(): Promise<void> {
    try {
      await this.fetchWithAuth(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
      });
    } finally {
      localStorage.clear();
    }
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private static setTokens(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  private static async fetchWithAuth(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const accessToken = localStorage.getItem('accessToken');
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      const newToken = await this.refreshToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response;
  }
}
```

---

## React Context Provider Example

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      if (AuthService.isAuthenticated()) {
        try {
          const userData = await AuthService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to get user:', error);
          AuthService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const result = await AuthService.login(credentials);
    setUser(result.user);
  };

  const register = async (data: RegisterRequest) => {
    const result = await AuthService.register(data);
    setUser(result.user);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Protected Route Component (React Router)

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Usage in routes
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## Example Login Component

```typescript
// components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## Example Registration Component

```typescript
// components/RegisterForm.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      
      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        minLength={2}
      />
      
      <input
        type="text"
        placeholder="Full Name"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        required
        minLength={2}
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        minLength={8}
      />
      
      <p className="hint">
        Password must contain at least 8 characters, including uppercase, 
        lowercase, and a number or special character.
      </p>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
}
```

---

## Axios Interceptor (Alternative to fetch)

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// Request interceptor - add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          'http://localhost:8080/auth/refresh',
          { refreshToken }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Usage
import api from './api';

// All requests automatically include auth token
const user = await api.get('/auth/me');
const data = await api.get('/some-protected-endpoint');
```

---

## WebSocket Authentication

For your chat gateway, send the token when connecting:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
});

// If token expires, reconnect with new token
socket.on('connect_error', async (error) => {
  if (error.message === 'Unauthorized') {
    try {
      const newToken = await AuthService.refreshToken();
      socket.auth = { token: newToken };
      socket.connect();
    } catch (err) {
      // Redirect to login
      window.location.href = '/login';
    }
  }
});
```

---

## Environment Variables

Create `.env` in your frontend:

```env
VITE_API_URL=http://localhost:8080
# or for Create React App
REACT_APP_API_URL=http://localhost:8080
# or for Next.js
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Use in code:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

---

## Security Best Practices

1. **Never expose tokens in URLs** - Always use headers
2. **Use HTTPS in production** - Never send tokens over HTTP
3. **Store tokens securely**:
   - Web: `localStorage` (simple) or `httpOnly` cookies (more secure)
   - Mobile: Secure storage (Keychain/Keystore)
4. **Implement automatic token refresh** - Handle 401 errors gracefully
5. **Clear tokens on logout** - Always cleanup
6. **Validate input on frontend** - Match backend validation rules
7. **Handle errors gracefully** - Show user-friendly messages

---

## Quick Checklist

✅ Install dependencies (`axios` or use `fetch`)  
✅ Create auth service with login/register/logout  
✅ Store tokens in localStorage  
✅ Add Authorization header to protected requests  
✅ Implement automatic token refresh on 401  
✅ Create auth context/provider  
✅ Create protected route component  
✅ Add login/register forms  
✅ Handle errors and show messages  
✅ Clear tokens on logout  
✅ Update WebSocket connection with auth token

---

## Testing Your Integration

1. Register a new user
2. Check localStorage has tokens
3. Navigate to protected route
4. Verify user data loads
5. Wait for token to expire (or manually delete it)
6. Verify automatic refresh works
7. Logout and verify tokens are cleared
8. Try accessing protected route while logged out

---

## Common Issues & Solutions

**Issue: CORS errors**
- Backend must have correct CORS configuration (already set up)
- Make sure you're using the correct URL

**Issue: 401 on every request**
- Check token is being sent in Authorization header
- Verify token format: `Bearer <token>`
- Check token hasn't expired

**Issue: Infinite refresh loop**
- Ensure you only retry once (`_retry` flag)
- Check refresh token is valid

**Issue: User logged out randomly**
- Refresh token might be expired (7 days default)
- Implement "Remember me" with longer refresh token expiry

Need help? Check the backend logs or Supabase dashboard for detailed error messages.
