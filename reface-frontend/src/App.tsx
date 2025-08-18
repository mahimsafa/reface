import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

// import components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// import pages
import Dashboard from './pages/Dashboard';
import ImageUpload from './pages/ImageUpload';
import ProcessedImagesList from './pages/ProcessedImagesList';
import ProcessedImageDetails from './pages/ProcessedImageDetails';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Usage from './pages/Usage';
import TopUp from './pages/TopUp';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Wrapper component for all protected routes
const ProtectedRoutes: React.FC = () => (
  <ProtectedRoute>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<ImageUpload />} />
        <Route path="/processed" element={<ProcessedImagesList />} />
        <Route path="/processed/:id" element={<ProcessedImageDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/password" element={<ChangePassword />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/topup" element={<TopUp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* All other routes are protected by default */}
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;