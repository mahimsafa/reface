import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFacebookF } from "react-icons/fa6";
import { useAuth } from '../context/AuthContext';
import { config } from '../lib/config';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleFacebookLogin = () => {
    // Redirect to backend's Facebook auth endpoint
    window.location.href = config.facebookAuthUrl;
  };

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Reface
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Facebook account to continue
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={handleFacebookLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <FaFacebookF className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
            </span>
            Continue with Facebook
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;