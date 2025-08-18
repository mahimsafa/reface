import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { setAuthContext } from '../api/fetcher';

export const useAuthFetcher = () => {
  const auth = useAuth();

  useEffect(() => {
    // Set the auth context in the fetcher so it can access tokens and logout function
    setAuthContext(auth);
  }, [auth]);

  return auth;
};
