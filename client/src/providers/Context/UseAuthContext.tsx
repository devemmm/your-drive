import { AuthUser } from "@/lib/types";
import { createContext, useContext } from "react";

type AuthContextType = {
  user: AuthUser;
  loading: boolean;
  authenticated: boolean;
  login: (user: any, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  initialized: boolean;
  isLogout: boolean;
  setUser: (user: any) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
