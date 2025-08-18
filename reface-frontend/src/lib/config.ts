export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  facebookAuthUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/facebook`,
  authMeUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/me`
} as const;
