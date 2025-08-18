import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/authApi';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: any | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const removeCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state from cookies on mount
  useEffect(() => {
    const storedAccessToken = getCookie('accessToken');
    const storedRefreshToken = getCookie('refreshToken');
    
    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setIsAuthenticated(true);
      
      // Fetch user data
      fetchUserData(storedAccessToken);
    }
  }, []);

  const fetchUserData = async (token: string) => {
    // Prevent multiple simultaneous calls
    if (isLoadingUser) {
      // console.log('AuthContext: fetchUserData already in progress, skipping');
      return;
    }
    
    // console.log('AuthContext: Starting fetchUserData');
    setIsLoadingUser(true);
    try {
      // console.log('AuthContext: Calling authApi.getCurrentUser()');
      const userData = await authApi.getCurrentUser();
      // console.log('AuthContext: User data received:', userData);
      setUser(userData);
    } catch (error) {
      console.error('AuthContext: Failed to fetch user data:', error);
      // Don't logout on user data fetch failure - just log the error
      // The user can still use the app with valid tokens
    } finally {
      setIsLoadingUser(false);
      // console.log('AuthContext: fetchUserData completed');
    }
  };

  const login = (accessToken: string, refreshToken: string) => {
    // console.log('AuthContext: Login called with tokens');
    
    setCookie('accessToken', accessToken, 7); // 7 days
    setCookie('refreshToken', refreshToken, 30); // 30 days for refresh token
    
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);
    
    // Fetch user data after login
    // console.log('AuthContext: Fetching user data');
    fetchUserData(accessToken);
  };

  const logout = () => {
    removeCookie('accessToken');
    removeCookie('refreshToken');
    
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    setUser(null);
    
    navigate('/login');
  };

  const value: AuthContextType = {
    isAuthenticated,
    accessToken,
    refreshToken,
    user,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
