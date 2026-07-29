import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { googleAuthService } from "@/services/googleAuth";
import { apiUrl } from "@/data";
import { useAuth } from "@/providers/Context/UseAuthContext";

import { useSearchParams } from "react-router-dom";

interface GoogleAuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      profileImage?: {
        url: string;
      };
      roles: string[];
      isVerified: boolean;
      googleId: string;
    };
  };
}

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const lang = localStorage.getItem("i18nextLng");

  const [searchParams] = useSearchParams();

  const [referralCode, setReferralCode] = useState<string | null>(() =>
    localStorage.getItem("Code")
  );

  useEffect(() => {
    const code = searchParams.get("referralCode");
    if (code) {
      setReferralCode(code);
      localStorage.setItem("Code", code);
    }
  }, [searchParams]);

  const googleAuthMutation = useMutation({
    mutationFn: async (code: string) => {
      const param = new URLSearchParams({
        ...(referralCode && { referralCode }),
        lang,
      });

      const response = await axios.post<GoogleAuthResponse>(
        `${apiUrl}/api/v1/auth/google?${param.toString()}`,
        { code }
      );
      return response.data;
    },
    onSuccess: async (data) => {
      const { token, user } = data.data;

      // Store token (login() also persists token + role before its redirect).
      localStorage.setItem("Your-DriveToken", JSON.stringify(token));

      // Create local user object
      const localUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        roles: user.roles,
        isVerified: user.isVerified,
      };

      // Clear referral code after successful login
      localStorage.removeItem("Code");

      // Pick the post-login destination, then let login() perform the single
      // redirect (it reads postLoginRedirect). A BUS_OPERATOR falls through to
      // login()'s role-based home (/operator).
      const g = user as { role?: string; roles?: string[]; isPassengerOnboarded?: boolean };
      const rawRole = g.role ?? g.roles?.[0];
      if (rawRole !== "BUS_OPERATOR") {
        localStorage.setItem(
          "postLoginRedirect",
          !g.isPassengerOnboarded ? "/passenger-onboarding" : "/profile"
        );
      }
      await login(localUser, token);
    },
    onError: (error: any) => {
      console.error("Google authentication error:", error);
      toast.error(
        error.response?.data?.message ||
          "Google authentication failed. Please try again.",
        { className: "custom-error-toast" }
      );
    },
  });

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // Get authorization code from Google
      const code = await googleAuthService.getAuthCode();

      // Send code to backend
      googleAuthMutation.mutate(code);
    } catch (error) {
      console.error("Google OAuth error:", error);
      toast.error("Failed to sign in with Google. Please try again.", {
        className: "custom-error-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithGoogle,
    isLoading: isLoading || googleAuthMutation.isPending,
    error: googleAuthMutation.error,
  };
};
