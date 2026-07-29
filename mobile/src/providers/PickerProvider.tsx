import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type PickerFieldName = "from" | "to";
export type PickerMode = "idle" | "picking";

export type PickerValue =
  | { kind: "current"; label: string; city: string; latitude?: number; longitude?: number }
  | { kind: "place"; placeId: string; label: string; city: string; latitude: number; longitude: number }
  | { kind: "dragged"; label: string; city: string; latitude: number; longitude: number };

interface PickerState {
  from: PickerValue;
  to: PickerValue | null;
  activeField: PickerFieldName | null;
  mode: PickerMode;
}

interface PickerActions {
  activate(field: PickerFieldName): void;
  cancel(): void;
  setField(field: PickerFieldName, value: PickerValue): void;
  useCurrentLocationFor(field: PickerFieldName, info: { city: string; latitude?: number; longitude?: number }): void;
  confirm(): void;
}

type PickerContextValue = PickerState & PickerActions;

const PickerContext = createContext<PickerContextValue | null>(null);

const DEFAULT_FROM: PickerValue = { kind: "current", label: "Current location", city: "" };

export function PickerProvider({ children }: { children: React.ReactNode }) {
  const [from, setFrom] = useState<PickerValue>(DEFAULT_FROM);
  const [to, setTo] = useState<PickerValue | null>(null);
  const [activeField, setActiveField] = useState<PickerFieldName | null>(null);
  const [mode, setMode] = useState<PickerMode>("idle");

  const activate = useCallback((field: PickerFieldName) => {
    setActiveField(field);
    setMode("picking");
  }, []);

  const cancel = useCallback(() => {
    setActiveField(null);
    setMode("idle");
  }, []);

  const setField = useCallback((field: PickerFieldName, value: PickerValue) => {
    if (field === "from") setFrom(value);
    else setTo(value);
  }, []);

  const useCurrentLocationFor = useCallback((field: PickerFieldName, info: { city: string; latitude?: number; longitude?: number }) => {
    setField(field, { kind: "current", label: "Current location", city: info.city, latitude: info.latitude, longitude: info.longitude });
  }, [setField]);

  const confirm = useCallback(() => {
    setActiveField(null);
    setMode("idle");
  }, []);

  const value = useMemo<PickerContextValue>(
    () => ({ from, to, activeField, mode, activate, cancel, setField, useCurrentLocationFor, confirm }),
    [from, to, activeField, mode, activate, cancel, setField, useCurrentLocationFor, confirm]
  );

  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>;
}

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used inside a PickerProvider");
  return ctx;
}
