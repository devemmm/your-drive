import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./layout/Navbar"
import Footer from "./layout/Footer"

import ChatButton from "./Chat/ChatButton";
import SEOHead from "./SEOHead";
import { useAuth } from "@/providers/Context/UseAuthContext";

const Layout: React.FC = () => {
  const { user } = useAuth();

  // Debug logging
  // console.log("Layout render:", { user: !!user });

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Global Chat Button - only show for authenticated users */}
      {user && <ChatButton />}
    </div>
  );
};

export default Layout;
