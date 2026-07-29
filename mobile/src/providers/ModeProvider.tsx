import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthContext } from "./AuthProvider";

/**
 * App-wide "driver vs passenger" mode, inDrive-style. This is a client-side
 * preference (persisted locally) that decides which menus the user sees and
 * where they land — it is independent of `isDriverOnboarded`, which records
 * whether the user has ever completed driver verification.
 *
 * Default: until the user explicitly picks a mode, onboarded drivers start in
 * driver mode and everyone else in passenger mode. We also clamp "driver" back
 * to "passenger" whenever the account is not (or no longer) driver-onboarded,
 * so a stale preference can never strand a passenger in the driver UI.
 */
export type AppMode = "driver" | "passenger";

const STORAGE_KEY = "@yourdrive/app_mode";

interface ModeContextValue {
  mode: AppMode;
  isDriverMode: boolean;
  setMode: (m: AppMode) => Promise<void>;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [stored, setStored] = useState<AppMode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "driver" || v === "passenger") setStored(v);
    });
  }, []);

  let mode: AppMode = stored ?? (user?.isDriverOnboarded ? "driver" : "passenger");
  // Never show the driver UI to an account that isn't driver-onboarded.
  if (mode === "driver" && user && !user.isDriverOnboarded) mode = "passenger";

  const setMode = async (m: AppMode) => {
    setStored(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  };

  return (
    <ModeContext.Provider value={{ mode, isDriverMode: mode === "driver", setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
