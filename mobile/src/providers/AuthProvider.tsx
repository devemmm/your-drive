import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { router } from "expo-router";
import { authStorage } from "@/services/auth";
import { setOnSignOut } from "@/services/api";
import { useCurrentUser } from "@/hooks/useUser";
import { User } from "@/lib/types";
import { queryClient } from "./QueryProvider";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const { data: user, isLoading: isLoadingUser } = useCurrentUser(!!token);

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && tokenRef.current) {
        queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setOnSignOut(() => {
      setToken(null);
      queryClient.clear();
      // The drawer no longer redirects unauthenticated users (guests browse
      // freely), so a forced sign-out (e.g. a 401) must navigate explicitly or
      // the user is stranded on a now-empty protected screen.
      router.replace("/(auth)/welcome");
    });
  }, []);

  async function loadToken() {
    const storedToken = await authStorage.getToken();
    setToken(storedToken);
    setIsLoadingToken(false);
  }

  async function signIn(newToken: string) {
    await authStorage.setToken(newToken);
    setToken(newToken);
    // Force-refetch the user profile with the new token. Without this, a prior
    // sign-out path that called queryClient.clear() can leave the observer in
    // a state where enabled:false→true does not auto-fire on the next login,
    // stranding the user on the auth stack.
    await queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
  }

  async function signOut() {
    await authStorage.removeToken();
    setToken(null);
    queryClient.clear();
    // Guest browsing removed the drawer's auth redirect, so logout has to send
    // the user back to the welcome/login screen itself.
    router.replace("/(auth)/welcome");
  }

  const isLoading = isLoadingToken || (!!token && isLoadingUser);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated: !!token && !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within AuthProvider");
  return context;
}
