# Authentication Flow Documentation

## Overview
This React application implements a complete JWT-based authentication system using Facebook OAuth, with secure token storage in HTTP-only cookies.

## Architecture

### Tech Stack
- **React 18** with TypeScript
- **React Router v7** for routing
- **Context API** for state management
- **TanStack Query** for API calls
- **TailwindCSS** for styling
- **Cookies** for secure token storage

### Authentication Flow

1. **User visits `/login`**
   - If already authenticated → redirect to home
   - Shows "Sign in with Facebook" button

2. **User clicks Facebook login**
   - Redirects to backend Facebook auth endpoint
   - Backend handles OAuth flow with Facebook

3. **Backend redirects to `/auth/callback`**
   - URL contains `accessToken` and `refreshToken` as query params
   - Frontend extracts tokens and stores them in cookies
   - Updates authentication context
   - Redirects to home page

4. **Protected routes**
   - All routes except `/login` and `/auth/callback` are protected
   - `ProtectedRoute` component checks authentication
   - Unauthenticated users are redirected to `/login`

## File Structure

```
src/
├── context/
│   └── AuthContext.tsx          # Authentication state management
├── components/
│   ├── ProtectedRoute.tsx       # Route protection wrapper
│   ├── Navbar.tsx              # Conditional navigation
│   └── Layout.tsx              # Main layout wrapper
├── pages/
│   ├── Login.tsx               # Login page
│   ├── AuthCallback.tsx        # OAuth callback handler
│   └── Dashboard.tsx           # Protected home page
├── api/
│   └── fetcher.ts              # TanStack Query fetcher with auth
├── lib/
│   ├── config.ts               # Environment configuration
│   └── authApi.ts              # Authentication API calls
└── hooks/
    └── useAuthFetcher.ts       # Hook to integrate auth with fetcher
```

## Key Components

### AuthContext
- Manages authentication state (`isAuthenticated`, `accessToken`, `refreshToken`, `user`)
- Handles token storage in cookies
- Provides `login()`, `logout()`, and `setUser()` functions
- Automatically fetches user data on authentication

### ProtectedRoute
- Wraps protected components
- Redirects unauthenticated users to `/login`
- Preserves intended destination for post-login redirect

### Custom Fetcher
- Automatically attaches `Authorization: Bearer <token>` headers
- Handles 401 responses by clearing auth state and redirecting to login
- Integrates with TanStack Query for seamless API calls

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

## Backend Requirements

Your backend should implement:

1. **Facebook OAuth endpoint**: `/auth/facebook`
   - Initiates Facebook OAuth flow
   - Redirects to Facebook for user consent

2. **OAuth callback**: `/auth/callback`
   - Receives Facebook authorization code
   - Exchanges code for access token
   - Creates/updates user account
   - Redirects to frontend with tokens: `/auth/callback?accessToken=xxx&refreshToken=yyy`

3. **User info endpoint**: `/auth/me`
   - Returns current user information
   - Requires valid access token in Authorization header

4. **Token refresh endpoint**: `/auth/refresh` (optional)
   - Exchanges refresh token for new access token

## Security Features

- **HTTP-only cookies**: Tokens stored securely, not accessible via JavaScript
- **SameSite=Strict**: Prevents CSRF attacks
- **Automatic token cleanup**: 401 responses trigger immediate logout
- **Route protection**: All sensitive routes require authentication
- **Secure redirects**: Post-login redirects to intended destination

## Usage Examples

### Using Authentication in Components

```tsx
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Making Authenticated API Calls

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/fetcher';

const MyComponent = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['user-data'],
    queryFn: () => api.get('/api/user-data'),
  });
  
  // Token is automatically included in the request
  // 401 responses automatically trigger logout
};
```

## Testing the Flow

1. Start the development server: `npm run dev`
2. Visit `/login` - should see Facebook login button
3. Click Facebook login - should redirect to backend
4. After backend OAuth flow, should redirect to `/auth/callback`
5. Should automatically redirect to home page with authentication active
6. Navigation should show user info and logout button
7. Try accessing protected routes - should work when authenticated
8. Click logout - should clear state and redirect to login

## Troubleshooting

### Common Issues

1. **Tokens not being stored**: Check cookie settings and browser console
2. **401 responses not handled**: Ensure `setAuthContext` is called in your app
3. **Redirect loops**: Check authentication state logic in components
4. **CORS issues**: Ensure backend allows frontend origin

### Debug Mode

Enable debug logging by checking browser console and network tab for:
- Cookie storage/retrieval
- API request headers
- Redirect chains
- Authentication state changes
