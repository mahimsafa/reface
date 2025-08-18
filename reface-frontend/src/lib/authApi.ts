import { api } from '../api/fetcher';
import { config } from './config';
import { User } from '../types';

export const authApi = {
  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    return api.get(`${config.apiUrl}/api/users/me`);
  },

  // Refresh token (if needed in the future)
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    return api.post(`${config.apiUrl}/api/auth/refresh`, { refreshToken });
  },
};
