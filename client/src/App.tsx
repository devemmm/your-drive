import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SocketProvider } from "./providers/SocketProvider";
import { initializeReferralSystem } from "./utils/referralUtils";

import { AuthProvider } from "./providers/AuthProvider";
import { useEffect } from "react";

import VehicleDetailPage from "./pages/Vehicle";
import Payment from "./pages/Payment";
import AdminLogin from "@/pages/admin/AdminLogin";
import {
  AdminGuard,
  AuthenticatedGuard,
  UnauthenticatedGuard,
  OperatorGuard,
} from "./providers/RouteGuards";
import OperatorDashboard from "@/pages/operator/OperatorDashboard";
import CookieBanner from "./components/GeoLanguageBanner";
import LocationPermission from "./components/LocationPermission";
import HomePage from "./pages/Home";
import PolicyPage from "./pages/Policy";
import BookARide from "@/pages/ride/book";
import Marketplace from "@/pages/marketplace";
import PostARide from "@/pages/ride/post";
import DashboardPage from "./pages/UserDashboard";
import ProfilePage from "./pages/ProfilePage";
import RideDetails from "./components/RideDetails";
import RideGroupChat from "./pages/RideGroupChat";
import PassengerOnboarding from "./pages/PassengerOnboarding";
// import PassengerRideDetails from "./components/PassengerBookedRideDetails";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import TermsOfService from "./pages/TermsOfService";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import AuthLayout from "./components/AuthLayout";
import VerifyUserPhoneNumber from "./pages/VerifyUserPhoneNumber";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyUserEmail from "./pages/VerifyUserEmail";
import ResetPassword from "./pages/ResetPassword";
import PassengerRideDetails from "./components/PassengerRideDetails";
import PolicyHubPage from "./pages/Policy";
import PolicyDetailPage from "./pages/PolicyDetailPage ";

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
};

const App = () => {
  useEffect(() => {
    initializeReferralSystem();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AuthProvider>
                <SocketProvider>
                  <CookieBanner />
                  <LocationPermission />
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />

                      {/* Public Routes */}
                      <Route path="policies" element={<PolicyPage />} />
                      <Route path="help-center" element={<HelpCenter />} />
                      <Route path="contact" element={<ContactUs />} />

                      {/* Policies routes */}
                      <Route
                        path="terms-of-service"
                        element={<TermsOfService />}
                      />
                      <Route path="/policies" element={<PolicyHubPage />} />
                      <Route
                        path="/policies/:policyId"
                        element={<PolicyDetailPage />}
                      />

                      {/* Driver and Passenger pages - accessible to all users */}
                      <Route path="marketplace" element={<Marketplace />} />
                      <Route path="book-a-ride" element={<Navigate to="/marketplace?tab=rides" replace />} />
                      <Route path="post-a-ride" element={<PostARide />} />

                      {/* Admin Routes (separgitate from other protected routes) */}
                      <Route element={<AdminGuard />}>
                        <Route path="admin" element={<AdminDashboard />} />
                      </Route>

                      {/* Operator Routes */}
                      <Route element={<OperatorGuard />}>
                        <Route path="operator" element={<OperatorDashboard />} />
                      </Route>

                      {/* Protected Routes that require onboarding completion */}
                      <Route element={<AuthenticatedGuard />}>
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route
                          path="passenger-home"
                          element={<DashboardPage />}
                        />
                        <Route
                          path="verify-phone"
                          element={<VerifyUserPhoneNumber />}
                        />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="vehicle" element={<VehicleDetailPage />} />
                        <Route path="payment" element={<Payment />} />
                        <Route path="chat" element={<Chat />} />

                        {/* Ride Routes */}
                        <Route path="rides" element={<RideDetails />} />

                        <Route
                          path="ride-group-chat"
                          element={<RideGroupChat />}
                        />
                      </Route>

                      {/* Passenger Onboarding Route */}
                      <Route
                        path="passenger-onboarding"
                        element={<PassengerOnboarding />}
                      />

                      <Route path="ride" element={<PassengerRideDetails />} />

                      <Route path="*" element={<NotFound />} />
                    </Route>

                    {/* Authentication Routes with AuthLayout (no navbar/footer) */}
                    <Route element={<UnauthenticatedGuard />}>
                      <Route path="/" element={<AuthLayout />}>
                        <Route path="login" element={<Login />} />
                        <Route path="admin/login" element={<AdminLogin />} />
                        <Route path="register" element={<Register />} />
                        <Route
                          path="forgot-password"
                          element={<ForgotPassword />}
                        />

                        <Route path="ride" element={<PassengerRideDetails />} />
                        <Route
                          path="verify-email"
                          element={<VerifyUserEmail />}
                        />
                        <Route
                          path="reset-password"
                          element={<ResetPassword />}
                        />
                      </Route>
                    </Route>
                  </Routes>
                </SocketProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
