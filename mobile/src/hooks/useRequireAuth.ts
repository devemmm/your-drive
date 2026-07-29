import { useCallback } from "react";
import { usePathname } from "expo-router";
import { useAuthContext } from "@/providers/AuthProvider";
import { useAuthGate } from "@/providers/AuthGateProvider";

interface Options {
  // Kept for call-site compatibility; ignored now that the gate is a redirect
  // instead of a sheet with a headline.
  reason?: string;
}

/**
 * useRequireAuth returns a `requireAuth(callback, opts?)` function.
 *
 * - Authenticated: callback runs synchronously.
 * - Guest: the callback + current pathname are stashed and the user is sent
 *   to /(auth)/welcome. Once they finish auth (and any onboarding), the
 *   AuthGateProvider routes them back and fires the callback.
 */
export function useRequireAuth() {
  const { isAuthenticated } = useAuthContext();
  const { requestAuth } = useAuthGate();
  const pathname = usePathname();

  return useCallback(
    (callback: () => void, _opts?: Options) => {
      if (isAuthenticated) {
        callback();
        return;
      }
      requestAuth(callback, pathname);
    },
    [isAuthenticated, requestAuth, pathname]
  );
}
