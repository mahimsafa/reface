import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ImageUpload from './components/ImageUpload';
import ProcessedImagesList from './components/ProcessedImagesList';
import ProcessedImageDetails from './components/ProcessedImageDetails';
import Profile from './components/Profile';
import ChangePassword from './components/ChangePassword';
import Usage from './components/Usage';
import TopUp from './components/TopUp';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ImageUpload />} />
            <Route path="/processed" element={<ProcessedImagesList />} />
            <Route path="/processed/:id" element={<ProcessedImageDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/password" element={<ChangePassword />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/topup" element={<TopUp />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;