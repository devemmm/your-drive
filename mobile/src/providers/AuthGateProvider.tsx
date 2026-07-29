import React, { createContext, useContext, useEffect, useRef } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthContext } from "./AuthProvider";

interface AuthGateContextValue {
  requestAuth: (callback: () => void, returnTo: string) => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useAuthContext();
  const pendingRef = useRef<{ callback: () => void; returnTo: string } | null>(
    null
  );

  function requestAuth(callback: () => void, returnTo: string) {
    pendingRef.current = { callback, returnTo };
    router.push("/(auth)/welcome");
  }

  // When the user finishes auth (and any onboarding gate), resume the pending
  // action: navigate back to the originating screen and fire the callback the
  // gated CTA handed us. Deferred until segments leave `(auth)`/`onboarding`,
  // so signUp→verify-phone doesn't auto-fire mid-onboarding.
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = pendingRef.current;
    if (!pending) return;
    const firstSeg = segments[0] as string | undefined;
    if (firstSeg === "(auth)" || firstSeg === "onboarding") return;
    pendingRef.current = null;
    router.replace(pending.returnTo as never);
    setTimeout(pending.callback, 0);
  }, [isAuthenticated, segments, router]);

  return (
    <AuthGateContext.Provider value={{ requestAuth }}>
      {children}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
}
