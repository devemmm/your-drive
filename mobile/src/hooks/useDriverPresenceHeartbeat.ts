import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { STORAGE_KEYS } from "@/lib/constants";

const HEARTBEAT_MS = 10_000;

async function postHeartbeat() {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const vehicleIdStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_VEHICLE_ID);
    const currentVehicleId = vehicleIdStr ? Number(vehicleIdStr) : undefined;
    await api.post("/driver-presence", {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      currentVehicleId,
    });
    return { ok: true as const };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403) {
      return { ok: false as const, stopLoop: true };
    }
    return { ok: false as const, stopLoop: false };
  }
}

async function postOffline() {
  try {
    await api.post("/driver-presence/offline");
  } catch {
    // Fire-and-forget; the server's 30s freshness window + cleanup cron
    // compensate for lost beacons (e.g., airplane mode on unmount).
  }
}

export function useDriverPresenceHeartbeat() {
  const { user } = useAuthContext();
  const isAvailable = !!user?.isAvailableForRideRequest;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedByServerRef = useRef(false);
  const tickRef = useRef<() => void>(() => {});

  async function tick() {
    if (stoppedByServerRef.current) return;
    if (appStateRef.current !== "active") return;
    if (!isAvailable) return;
    const result = await postHeartbeat();
    if (!result.ok && result.stopLoop) {
      stoppedByServerRef.current = true;
      stop(false);
    }
  }

  function stop(sendOffline: boolean) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sendOffline) void postOffline();
  }

  // Keep the ref pointing at the latest tick so the AppState listener below
  // always sees current isAvailable / stoppedByServerRef state.
  tickRef.current = tick;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      if (next === "active") {
        // Clear any prior server-stop so the next tick retries (e.g. after a trip ends).
        // If the server still 403s, the loop stops again within 10s — acceptable overhead.
        stoppedByServerRef.current = false;
        void tickRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isAvailable) {
      stop(true);
      return;
    }

    // Fresh transition to available: clear any prior server-stop signal so
    // the driver can come back online after toggling off/on.
    stoppedByServerRef.current = false;

    let cancelled = false;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      // Guard is load-bearing: no setInterval is scheduled if the component
      // unmounts before the async permission check resolves.
      if (perm.status !== "granted" || cancelled) return;
      await tick();
      intervalRef.current = setInterval(tick, HEARTBEAT_MS);
    })();

    return () => {
      cancelled = true;
      stop(true);
    };
  }, [isAvailable]);
}
