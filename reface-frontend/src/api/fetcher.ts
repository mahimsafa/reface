import { useAuth } from '../context/AuthContext';

// Get auth context outside of the fetcher function
let authContext: ReturnType<typeof useAuth> | null = null;

export const setAuthContext = (context: ReturnType<typeof useAuth>) => {
  authContext = context;
};

export const fetcher = async (url: string, options: RequestInit = {}) => {
  // console.log('Fetcher: Making request to:', url);
  
  // Get access token from cookies if auth context is not available
  let accessToken = authContext?.accessToken;
  if (!accessToken) {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
    if (tokenCookie) {
      accessToken = tokenCookie.split('=')[1];
    }
  }
  
  // console.log('Fetcher: Using access token:', !!accessToken);

  const config: RequestInit = {
    ...options,
    headers: {
      // 'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  };

  try {
    // console.log('Fetcher: Sending request with config:', config);
    const response = await fetch(url, config);
    // console.log('Fetcher: Response received:', response.status, response.statusText);
    
    // Handle 401 Unauthorized responses
    if (response.status === 401) {
      // console.log('Fetcher: 401 Unauthorized - logging out');
      // Clear auth state and cookies
      if (authContext) {
        authContext.logout();
      } else {
        // Fallback: clear cookies manually
        document.cookie = 'accessToken=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        document.cookie = 'refreshToken=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        // Redirect to login
        window.location.href = '/login';
      }
      throw new Error('Unauthorized - Please log in again');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log('Fetcher: Response data:', data);
    return data;
  } catch (error) {
    // console.error('Fetcher: API request failed:', error);
    throw new Error(error as string);
  }
};

// Specialized fetchers for different HTTP methods
export const api = {
  get: (url: string) => fetcher(url),
  
  post: (url: string, data?: any) => fetcher(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  postRaw: (url: string, data?: any) => fetcher(url, {
    method: 'POST',
    body: data,
  }),
  
  put: (url: string, data?: any) => fetcher(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  patch: (url: string, data?: any) => fetcher(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  delete: (url: string) => fetcher(url, {
    method: 'DELETE',
  }),
};
