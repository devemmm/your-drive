import { useEffect, useState } from "react";
import i18n from "@/i18n";
import { AuthContext } from "./Context/UseAuthContext";
import { jwtDecode } from "jwt-decode";
import { useLocation, useNavigate } from "react-router-dom";
import { useSingleUser } from "@/data";
import LoadingIndicator from "@/components/LoadingIndicator";

const LogoutModal = ({ onClose }: { onClose: () => void }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      onClose();
    } else {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown, onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-900 dark:border-2 dark:border-white/25 p-4 rounded shadow-md">
        <h2 className="text-lg font-semibold">Logging out...</h2>
        <p>
          Please wait while we log you out. You will be logged out in{" "}
          {countdown} seconds.
        </p>
      </div>
    </div>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isLogout, setLogout] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const location = useLocation();

  const navigate = useNavigate();

  // User data fetching (only for non-admin users)
  const { data: loggedInUser, isPending } = useSingleUser({
    userId: userId!,
    enabled: !!userId,
  });

  // Check token expiration on route change
  useEffect(() => {
    const token = localStorage.getItem("Your-DriveToken");
    if (token && authenticated) {
      try {
        let actualToken = token;
        try {
          const parsed = JSON.parse(token);
          actualToken = typeof parsed === "string" ? parsed : token;
        } catch {
          // Token is already a string, use as is
        }

        const decoded: any = jwtDecode(actualToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          setIsModalOpen(true);
        }
      } catch (error) {
        logout();
      }
    }
  }, [location.pathname, authenticated]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("Your-DriveToken");
      const userRole = localStorage.getItem("userRole");

      if (token && userRole) {
        try {
          let actualToken = token;
          try {
            const parsed = JSON.parse(token);
            actualToken = typeof parsed === "string" ? parsed : token;
          } catch {
            // Token is already a string, use as is
          }

          const decoded: any = jwtDecode(actualToken);
          const parsedRole = JSON.parse(userRole);

          // Check if token is expired
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
            logout();
            return;
          }

          // Verify admin role from JWT token, not just localStorage
          // Backend should include role in token (role, roles, or userRole field)
          const tokenRole = decoded.role || decoded.roles?.[0] || decoded.userRole || decoded.type;
          const isAdminFromToken = tokenRole === "admin" || tokenRole === "ADMIN" || 
                                   tokenRole === "Admin" ||
                                   (Array.isArray(decoded.roles) && decoded.roles.includes("admin")) ||
                                   (Array.isArray(decoded.roles) && decoded.roles.includes("ADMIN"));
          
          // If localStorage says admin, trust it (backend just authenticated)
          // Also check token if role is present, but don't block if token doesn't have role field
          if (parsedRole === "admin") {
            // If token has role and it doesn't match admin, that's a security issue
            if (tokenRole && !isAdminFromToken) {
              console.warn("Admin role mismatch: localStorage says admin but token role doesn't match. Logging out for security.");
              logout();
              return;
            }
            
            // Trust localStorage for admin (backend authenticated them)
            const adminUser = {
              email: decoded.email || "admin@example.com",
              name: decoded.name || "Admin User",
              role: "admin",
              id: decoded.id || decoded.sub || "admin",
              theme: "light",
              language: "en",
              profileImage: { url: "" },
            };

            setUser(adminUser);
            setAuthenticated(true);
            setLoading(false);
            setInitialized(true);
          } else {
            // For regular users, set userId to fetch from API
            setUserId(decoded.id || decoded.sub);
          }
        } catch (err) {
          logout();
        }
      } else {
        setAuthenticated(false);
        setInitialized(true);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Update user state when logged in user data is fetched (for non-admin users)
  useEffect(() => {
    if (loggedInUser && userId) {
      const userRole = localStorage.getItem("userRole");
      const parsedRole = userRole ? JSON.parse(userRole) : null;
      // Prefer the role from localStorage, but fall back to the fetched profile's
      // role if localStorage was somehow cleared (e.g. a stale tab). Without this,
      // a missing userRole would surface user.role = null and OperatorGuard would
      // bounce a BUS_OPERATOR to "/". Re-persist a recovered role so later reads
      // (and route guards) stay consistent.
      const effectiveRole = parsedRole ?? (loggedInUser as { role?: string }).role ?? null;
      if (!parsedRole && effectiveRole) {
        localStorage.setItem("userRole", JSON.stringify(effectiveRole));
      }

      const localUser = {
        email: loggedInUser.email,
        name: loggedInUser.name,
        password: loggedInUser.password,
        role: effectiveRole,
        theme: loggedInUser.theme,
        language: loggedInUser.language,
        id: loggedInUser.id,
        profileImage: loggedInUser.profileImage,
        isPassengerOnboarded: loggedInUser.isPassengerOnboarded,
      };

      setUser(localUser);
      setAuthenticated(true);
      setLoading(false);
      setInitialized(true);

      const isAlreadyOnboarding =
        location.pathname === "/profile" &&
        location.search.includes("completeProfile=true");

      // Bus operators are not passengers — never force them through passenger
      // onboarding; they belong on the operator dashboard. (Mirrors the
      // BUS_OPERATOR exclusion in Login.tsx's post-login redirect.)
      const isBusOperator = effectiveRole === "BUS_OPERATOR";

      if (
        !loggedInUser.isPassengerOnboarded &&
        !isAlreadyOnboarding &&
        !isBusOperator
      ) {
        navigate("/profile?completeProfile=true", { replace: true });
      }
    } else if (!isPending && userId && !initialized) {
      setAuthenticated(false);
      setInitialized(true);
      setLoading(false);
    }
  }, [
    loggedInUser,
    isPending,
    userId,
    initialized,
    location.pathname,
    location.search,
    authenticated,
    navigate,
  ]);

  const login = async (localUser: any, token?: string) => {
    setLoading(true);
    try {
      setUser(localUser);
      setAuthenticated(true);

      // Persist auth state to localStorage BEFORE navigating. login() ends with a
      // full-page `window.location.replace`, so any localStorage write done by the
      // caller *after* awaiting login() races the page unload and may not land — on
      // reload the app would then read a missing token/role and mis-route the user
      // (e.g. a BUS_OPERATOR bounced to "/" by OperatorGuard). Writing here, before
      // the redirect, makes the post-login state deterministic.
      const rawRole = localUser?.role || localUser?.roles?.[0];
      if (token) {
        localStorage.setItem("Your-DriveToken", JSON.stringify(token));
      }
      if (rawRole) {
        localStorage.setItem("userRole", JSON.stringify(rawRole));
      }

      // Apply preferred language on login
      try {
        const preferredLang =
          localUser?.language || localStorage.getItem("i18nextLng") || "en";
        if (preferredLang) {
          i18n.changeLanguage(preferredLang);
          localStorage.setItem("i18nextLng", preferredLang);
        }
      } catch {
        console.log("Error changing language");
      }
      const postLoginRedirect = localStorage.getItem("postLoginRedirect");
      localStorage.removeItem("postLoginRedirect");
      const role = String(rawRole || "").toUpperCase();
      const home = role === "ADMIN" ? "/admin" : role === "BUS_OPERATOR" ? "/operator" : "/dashboard";
      window.location.replace(postLoginRedirect || home);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLogout(true);
    try {
      setUser(null);
      setAuthenticated(false);
      setUserId(undefined);
      localStorage.removeItem("Your-DriveToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("email");
      localStorage.removeItem("postLoginRedirect");
      localStorage.removeItem("rideDetails");
      localStorage.removeItem("createRideStep");
      localStorage.removeItem("vehicleInfo");
      localStorage.removeItem("departureCity");
      localStorage.removeItem("destinationCity");
      localStorage.removeItem("distance");
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLogout(false);
    }
  };

  if (!initialized) return <LoadingIndicator />;
  if (isModalOpen) return <LogoutModal onClose={logout} />;

  return (
    <AuthContext.Provider
      value={{
        logout,
        login,
        user,
        loading,
        authenticated,
        initialized,
        isLogout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
