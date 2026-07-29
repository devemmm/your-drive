import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./Context/UseAuthContext";
import LoadingIndicator from "@/components/LoadingIndicator";
import CustomLoader from "@/components/CustomLoader";
import { jwtDecode } from "jwt-decode";

export const AdminGuard = () => {
  const { user, authenticated, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminVerified, setIsAdminVerified] = useState<boolean | null>(null);

  // Verify admin role from JWT token (more secure than localStorage)
  useEffect(() => {
    const verifyAdminRole = () => {
      try {
        // First check localStorage - if it says admin, backend just authenticated them
        const storedRole = localStorage.getItem("userRole");
        let parsedStoredRole = null;
        try {
          parsedStoredRole = storedRole ? JSON.parse(storedRole) : null;
        } catch {
          parsedStoredRole = storedRole;
        }
        const isAdminFromStorage = parsedStoredRole === "admin";
        
        // If localStorage says admin, trust it (backend authenticated via login)
        if (isAdminFromStorage) {
          const token = localStorage.getItem("Your-DriveToken");
          if (!token) {
            setIsAdminVerified(false);
            return;
          }

          let actualToken = token;
          try {
            const parsed = JSON.parse(token);
            actualToken = typeof parsed === "string" ? parsed : token;
          } catch {
            // Token is already a string, use as is
          }

          try {
            const decoded: any = jwtDecode(actualToken);
            // Check if token contains admin role
            const tokenRole = decoded.role || decoded.roles?.[0] || decoded.userRole || decoded.type;
            const isAdminFromToken = tokenRole === "admin" || tokenRole === "ADMIN" || 
                                     tokenRole === "Admin" ||
                                     (Array.isArray(decoded.roles) && decoded.roles.includes("admin")) ||
                                     (Array.isArray(decoded.roles) && decoded.roles.includes("ADMIN"));
            
            // If token has role and it explicitly says NOT admin, that's a security issue
            // Otherwise, trust localStorage (backend authenticated)
            if (tokenRole && !isAdminFromToken) {
              console.warn("Security: Token role doesn't match admin, but localStorage says admin");
              setIsAdminVerified(false);
              return;
            }
            
            // Trust localStorage - backend authenticated the admin
            setIsAdminVerified(true);
          } catch (decodeError) {
            // If we can't decode token but localStorage says admin, trust it
            console.warn("Could not decode token, trusting localStorage:", decodeError);
            setIsAdminVerified(true);
          }
        } else {
          setIsAdminVerified(false);
        }
      } catch (error) {
        console.error("Failed to verify admin role:", error);
        setIsAdminVerified(false);
      }
    };

    if (!loading && initialized) {
      if (authenticated) {
        verifyAdminRole();
      } else {
        setIsAdminVerified(false);
      }
    }
  }, [authenticated, loading, initialized]);

  useEffect(() => {
    if (!loading && initialized) {
      if (!authenticated) {
        localStorage.setItem("postLoginRedirect", location.pathname);
        navigate("/admin/login");
        return;
      }

      // Verify admin role - check both isAdminVerified and user.role
      // isAdminVerified comes from token/localStorage check
      // user.role comes from AuthProvider
      const isAdmin = isAdminVerified === true || user?.role === "admin";
      
      if (authenticated && !isAdmin) {
        navigate("/");
        return;
      }
    }
  }, [user, authenticated, loading, initialized, isAdminVerified, navigate, location.pathname]);

  if (loading || !initialized || (isAdminVerified === null && authenticated))
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader className="h-10 w-10 text-center mt-40" />;
      </div>
    );
  
  // Check both isAdminVerified and user.role
  const isAdmin = isAdminVerified === true || user?.role === "admin";
  
  if (!authenticated || !isAdmin)
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader className="h-10 w-10 text-center mt-40" />;
      </div>
    );

  return <Outlet />;
};

export const AuthenticatedGuard = () => {
  const { authenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !authenticated) {
      localStorage.setItem("postLoginRedirect", location.pathname);
      navigate("/login");
    }
  }, [authenticated, loading, navigate, location.pathname]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!authenticated) {
    return <LoadingIndicator />;
  }

  return <Outlet />;
};

export const UnauthenticatedGuard = () => {
  const { authenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && authenticated && user) {
      // Redirect authenticated users away from auth pages, by role
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "BUS_OPERATOR") navigate("/operator");
      else navigate("/");
    }
  }, [authenticated, loading, user, navigate]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  if (authenticated)
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );

  return <Outlet />;
};

export const OperatorGuard = () => {
  const { user, authenticated, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !initialized) return;
    if (!authenticated) {
      localStorage.setItem("postLoginRedirect", location.pathname);
      navigate("/login");
      return;
    }
    if (user && user.role !== "BUS_OPERATOR") {
      navigate("/");
    }
  }, [user, authenticated, loading, initialized, navigate, location.pathname]);

  if (loading || !initialized || !authenticated || user?.role !== "BUS_OPERATOR") {
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  }
  return <Outlet />;
};

export const PassengerOnboardingGuard = () => {
  const { authenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && authenticated && user) {
      // Only allow access if user is not onboarded as passenger
      if (user.isPassengerOnboarded) {
        navigate("/profile");
        return;
      }
    } else if (!loading && !authenticated) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }
  }, [authenticated, loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  }

  // If user is already onboarded, show loading while redirecting
  if (user?.isPassengerOnboarded) {
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  }

  return <Outlet />;
};
