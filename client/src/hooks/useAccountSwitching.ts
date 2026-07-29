import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { AccountManager } from "@/utils/accountManager";
import { useOnboardingUser } from "@/data";
import { toast } from "sonner";

interface AvailableRole {
  role: "passenger" | "driver" | "admin";
  isOnboarded: boolean;
  isActive: boolean;
}

export const useAccountSwitching = () => {
  const { user } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  // Get onboarding status from API
  const { data: onboardingStatus, isLoading: isLoadingOnboarding } =
    useOnboardingUser();

  // Initialize accounts based on onboarding status
  useEffect(() => {
    if (user && onboardingStatus && !isLoadingOnboarding) {
      try {
        const currentRole = user.role as "passenger" | "driver" | "admin";
        const token = localStorage.getItem("Your-DriveToken");

        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        let parsedToken;
        try {
          parsedToken = JSON.parse(token);
        } catch (e) {
          console.error("Error parsing token:", e);
          parsedToken = token; // Use as string if parsing fails
        }

        // Update AccountManager with all available roles
        AccountManager.addUserWithMultipleRoles({
          id: user.id || `${user.email}-${currentRole}`,
          email: user.email,
          name: user.name || user.email,
          profileImage: user.profileImage?.url,
          token: parsedToken,
          onboardingStatus: onboardingStatus,
          activeRole: currentRole,
        });
      } catch (error) {
        console.error("Error initializing account switching:", error);
      }
    }
  }, [user, onboardingStatus, isLoadingOnboarding]);

  // Get available roles for current user
  const getAvailableRoles = (): AvailableRole[] => {
    if (!onboardingStatus) return [];

    return onboardingStatus.roles
      .map((role) => {
        // Fix role mapping - handle uppercase role names from API
        let roleKey: "passenger" | "driver" | "admin";
        if (role === "DRIVER" || role === "driver") {
          roleKey = "driver";
        } else if (role === "PASSENGER" || role === "passenger") {
          roleKey = "passenger";
        } else if (role === "ADMIN" || role === "admin") {
          roleKey = "admin";
        } else {
          console.warn("Unknown role:", role);
          return null;
        }

        let isOnboarded = false;
        if (roleKey === "driver") {
          isOnboarded = onboardingStatus.driver?.isDriverOnboarded || false;
        } else if (roleKey === "passenger") {
          isOnboarded =
            onboardingStatus.passenger?.isPassengerOnboarded || false;
        } else if (roleKey === "admin") {
          isOnboarded = true; // Admin is always considered onboarded
        }

        return {
          role: roleKey,
          isOnboarded,
          isActive: user?.role === roleKey,
        };
      })
      .filter(Boolean) as AvailableRole[]; // Remove null values
  };

  // Get roles user can switch to (onboarded roles excluding current)
  const getSwitchableRoles = (): AvailableRole[] => {
    return getAvailableRoles().filter(
      (roleInfo) => roleInfo.isOnboarded && !roleInfo.isActive
    );
  };

  // Get roles user needs to complete onboarding for
  const getIncompleteRoles = (): AvailableRole[] => {
    return getAvailableRoles().filter(
      (roleInfo) => !roleInfo.isOnboarded && !roleInfo.isActive
    );
  };

  // Switch to a different role
  const switchToRole = async (targetRole: "passenger" | "driver" | "admin") => {
    if (!user || isSwitching) {
      return false;
    }

    setIsSwitching(true);

    try {
      // Check if user is onboarded for this role
      const roleInfo = getAvailableRoles().find((r) => r.role === targetRole);

      if (!roleInfo) {
        console.error(`Role ${targetRole} not found in available roles`);
        toast.error(`Role ${targetRole} not available for this user`, {
          className: "custom-error-toast",
        });
        return false;
      }

      if (!roleInfo.isOnboarded) {
        // Redirect to onboarding for this role
        const onboardingUrl = `/onboarding?role=${targetRole}`;
        window.location.href = onboardingUrl;
        return true;
      }

      // Switch role using AccountManager
      const switchedAccount = AccountManager.switchUserRole(targetRole);

      if (switchedAccount) {
        // Determine redirect path
        let redirectPath = "/";
        if (targetRole === "driver") {
          redirectPath = "/dashboard";
        } else if (targetRole === "passenger") {
          redirectPath = "/passenger-home";
        } else if (targetRole === "admin") {
          redirectPath = "/admin";
        }

        toast.success(`Switched to ${targetRole} account`);

        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          window.location.replace(redirectPath);
        }, 100);

        return true;
      } else {
        console.error("AccountManager.switchUserRole returned null");
        toast.error("Failed to switch account - no account found", {
          className: "custom-error-toast",
        });
        return false;
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error(`Failed to switch account: ${error.message}`, {
        className: "custom-error-toast",
      });
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  // Check if user has multiple onboarded roles
  const hasMultipleRoles = (): boolean => {
    return getAvailableRoles().filter((r) => r.isOnboarded).length > 1;
  };

  // Check if user can complete onboarding for additional roles
  const canCompleteMoreRoles = (): boolean => {
    return getIncompleteRoles().length > 0;
  };

  return {
    // Data
    availableRoles: getAvailableRoles(),
    switchableRoles: getSwitchableRoles(),
    incompleteRoles: getIncompleteRoles(),
    currentRole: user?.role,

    // State
    isSwitching,
    isLoading: isLoadingOnboarding,

    // Methods
    switchToRole,
    hasMultipleRoles: hasMultipleRoles(),
    canCompleteMoreRoles: canCompleteMoreRoles(),

    // Helper methods
    getRoleDisplayName: (role: string) => {
      return role.charAt(0).toUpperCase() + role.slice(1);
    },

    getRoleIcon: (role: string) => {
      switch (role) {
        case "driver":
          return "🚙";
        case "passenger":
          return "🧍";
        case "admin":
          return "👔";
        default:
          return "👤";
      }
    },
  };
};
