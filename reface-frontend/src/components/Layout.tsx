import React from "react";
import { PhotoProvider } from "react-photo-view";

import "react-photo-view/dist/react-photo-view.css";

import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <PhotoProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <Navbar />
        {/* Main Content */}
        <main>{children}</main>
      </div>
    </PhotoProvider>
  );
};

export default Layout;
