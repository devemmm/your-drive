# InDrive-Style Driver Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the driver's "Live Ride Requests" list screen with a map-first driver home that has a single online/offline toggle and presents incoming requests as a focused bottom sheet with countdown, plus a backlog chip for older opens. Resolves "no drivers on passenger map" as a side effect — the heartbeat is gated by `isAvailableForRideRequest`, and that toggle is currently buried in profile.

**Architecture:** `(drawer)/index.tsx` becomes a thin router that branches on `useMode().isDriverMode`, rendering either the extracted `PassengerHome` or the new `DriverHome`. `DriverHome` composes the existing `useOpenRideRequestsForDrivers`, `useAcceptRideRequest`, `useToggleRideRequestAvailability`, `useMyVehicles`, and `CounterOfferSheet`. No backend changes.

**Tech Stack:** Expo Router, react-native-maps, expo-location, @gorhom/bottom-sheet (already installed), @tanstack/react-query, @testing-library/react-native + jest-expo.

**Spec:** `docs/superpowers/specs/2026-06-01-driver-home-indrive-style-design.md`

---

## File Map

- **Extract / move (existing → new path, no behavior change):**
  - `mobile/src/app/(drawer)/index.tsx` → split: route file stays; passenger UI moves to `mobile/src/app/(drawer)/_components/PassengerHome.tsx`.
  - `RideRequestCard` (currently inline in `ride-requests/index.tsx:237-325`) → `mobile/src/app/(drawer)/_components/RideRequestCard.tsx`.
  - Vehicle picker modal (currently inline in `ride-requests/index.tsx:154-223`) → `mobile/src/app/(drawer)/_components/VehiclePickerSheet.tsx`.

- **Create:**
  - `mobile/src/app/(drawer)/_components/DriverHome.tsx` — the new screen.
  - `mobile/src/app/(drawer)/_components/CountdownRing.tsx` — visual primitive used in the focused request sheet.
  - `mobile/src/app/(drawer)/_components/FocusedRideRequestSheet.tsx` — the focused-request bottom sheet.
  - `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`.

- **Modify:**
  - `mobile/src/app/(drawer)/index.tsx` — turn into router that branches on mode.
  - `mobile/src/app/(drawer)/_layout.tsx` — drop `initialRouteName` branch, drop `ride-requests` screen.
  - `mobile/src/components/DrawerContent.tsx` — drop the `Live Ride Requests` menu entry, update mode-toggle target to `/` for both directions.

- **Delete:**
  - `mobile/src/app/(drawer)/ride-requests/index.tsx`.
  - `mobile/src/app/(drawer)/ride-requests/` directory (empty after the file deletion).

---

## Task 1: Extract RideRequestCard

**Files:**
- Create: `mobile/src/app/(drawer)/_components/RideRequestCard.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p mobile/src/app/\(drawer\)/_components
```

Create `mobile/src/app/(drawer)/_components/RideRequestCard.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MapPin, Users, Clock } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { RideRequest } from "@/hooks/useRideRequests";

interface Props {
  request: RideRequest;
  onAccept: () => void;
  onCounter: () => void;
}

export function RideRequestCard({ request, onAccept, onCounter }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const fare = request.proposedFare ? parseFloat(request.proposedFare) : 0;
  const when = request.timeWindowStart ?? request.date;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onAccept}>
      <Card style={s.card}>
        <View style={s.cardHeader}>
          <Avatar
            firstName={request.user?.firstName ?? "?"}
            lastName={request.user?.lastName ?? ""}
            imageUrl={request.user?.profileImage?.url}
            size={40}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.passenger}>
              {request.user?.firstName} {request.user?.lastName}
            </Text>
            {request.user?.averageRating != null && (
              <Text style={s.meta}>
                ★ {request.user.averageRating.toFixed(1)} · {request.user.totalRatings} trips
              </Text>
            )}
          </View>
          {fare > 0 && (
            <View style={s.fareBadge}>
              <Text style={s.fareText}>{formatCurrency(Math.round(fare * 100))}</Text>
            </View>
          )}
        </View>

        <View style={s.routeRow}>
          <MapPin size={14} color={colors.primary} />
          <Text style={s.routeText} numberOfLines={1}>{request.originCity}</Text>
        </View>
        <View style={s.routeRow}>
          <MapPin size={14} color={colors.error} />
          <Text style={s.routeText} numberOfLines={1}>{request.destCity}</Text>
        </View>

        <View style={s.footerRow}>
          <View style={s.footerItem}>
            <Clock size={14} color={colors.text.tertiary} />
            <Text style={s.footerText}>{formatDate(when)} · {formatTime(when)}</Text>
          </View>
          <View style={s.footerItem}>
            <Users size={14} color={colors.text.tertiary} />
            <Text style={s.footerText}>{request.seats} seat{request.seats > 1 ? "s" : ""}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            title={`Accept${fare > 0 ? ` · ${formatCurrency(Math.round(fare * 100))}` : ""}`}
            onPress={onAccept}
          />
          <Button title="Counter-offer" variant="secondary" onPress={onCounter} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: { gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  passenger: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary },
  fareBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  fareText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text.primary },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: fontSize.xs, color: colors.text.tertiary },
});
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/RideRequestCard.tsx
git commit -m "refactor(mobile): extract RideRequestCard into _components"
```

---

## Task 2: Extract VehiclePickerSheet

**Files:**
- Create: `mobile/src/app/(drawer)/_components/VehiclePickerSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Check } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  plateNumber?: string;
  capacity: number;
}

interface Props {
  visible: boolean;
  vehicles: Vehicle[];
  title?: string;
  subtitle?: string;
  onPick: (vehicleId: number) => void;
  onClose: () => void;
  loading?: boolean;
}

export function VehiclePickerSheet({
  visible,
  vehicles,
  title = "Pick a vehicle",
  subtitle,
  onPick,
  onClose,
  loading,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          <ScrollView style={{ maxHeight: 300 }}>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                testID={`vehiclePicker.row.${v.id}`}
                style={s.row}
                onPress={() => onPick(v.id)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{v.make} {v.model}</Text>
                  <Text style={s.rowSub}>
                    {v.plateNumber ? `${v.plateNumber} · ` : ""}{v.capacity} seats
                  </Text>
                </View>
                <Check size={18} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="Cancel" variant="secondary" onPress={onClose} loading={loading} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.sm, color: colors.text.secondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  rowSub: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: 2 },
});
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/VehiclePickerSheet.tsx
git commit -m "refactor(mobile): extract VehiclePickerSheet into _components"
```

---

## Task 3: Create CountdownRing

**Files:**
- Create: `mobile/src/app/(drawer)/_components/CountdownRing.tsx`

Animated ring isn't required for MVP — a numeric "12s" badge is enough. Visual polish can come later.

- [ ] **Step 1: Create the file**

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, borderRadius, ColorPalette } from "@/lib/theme";

interface Props {
  secondsRemaining: number;
}

export function CountdownRing({ secondsRemaining }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const urgent = secondsRemaining <= 5;

  return (
    <View
      testID="driverHome.countdown"
      style={[s.ring, urgent ? s.ringUrgent : null]}
    >
      <Text style={[s.text, urgent ? s.textUrgent : null]}>
        {secondsRemaining}s
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  ring: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ringUrgent: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  text: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  textUrgent: { color: colors.text.inverse },
});
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/CountdownRing.tsx
git commit -m "feat(mobile): add CountdownRing for driver home request sheet"
```

---

## Task 4: Create FocusedRideRequestSheet (UI only, no auto-close yet)

**Files:**
- Create: `mobile/src/app/(drawer)/_components/FocusedRideRequestSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Modal, TouchableOpacity } from "react-native";
import { MapPin, Users, Clock } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CountdownRing } from "./CountdownRing";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { RideRequest } from "@/hooks/useRideRequests";

interface Props {
  request: RideRequest;
  vehicleLabel: string | null;
  secondsRemaining: number;
  onChangeVehicle: () => void;
  onAccept: () => void;
  onCounter: () => void;
  onSkip: () => void;
  acceptDisabled?: boolean;
}

export function FocusedRideRequestSheet({
  request,
  vehicleLabel,
  secondsRemaining,
  onChangeVehicle,
  onAccept,
  onCounter,
  onSkip,
  acceptDisabled,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const fare = request.proposedFare ? parseFloat(request.proposedFare) : 0;
  const when = request.timeWindowStart ?? request.date;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onSkip}
      testID="driverHome.focusedSheet"
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.headerRow}>
            <Avatar
              firstName={request.user?.firstName ?? "?"}
              lastName={request.user?.lastName ?? ""}
              imageUrl={request.user?.profileImage?.url}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.passenger}>
                {request.user?.firstName} {request.user?.lastName}
              </Text>
              {request.user?.averageRating != null && (
                <Text style={s.meta}>
                  ★ {request.user.averageRating.toFixed(1)} · {request.user.totalRatings} trips
                </Text>
              )}
            </View>
            <CountdownRing secondsRemaining={secondsRemaining} />
          </View>

          <ScrollView style={{ maxHeight: 200 }}>
            <View style={s.routeRow}>
              <MapPin size={14} color={colors.primary} />
              <Text style={s.routeText}>{request.originCity}</Text>
            </View>
            <View style={s.routeRow}>
              <MapPin size={14} color={colors.error} />
              <Text style={s.routeText}>{request.destCity}</Text>
            </View>

            <View style={s.footerRow}>
              <View style={s.footerItem}>
                <Clock size={14} color={colors.text.tertiary} />
                <Text style={s.footerText}>{formatDate(when)} · {formatTime(when)}</Text>
              </View>
              <View style={s.footerItem}>
                <Users size={14} color={colors.text.tertiary} />
                <Text style={s.footerText}>{request.seats} seat{request.seats > 1 ? "s" : ""}</Text>
              </View>
            </View>

            {fare > 0 && (
              <Text style={s.fare}>
                {formatCurrency(Math.round(fare * 100))}
              </Text>
            )}

            <TouchableOpacity
              testID="driverHome.changeVehicle"
              onPress={onChangeVehicle}
              activeOpacity={0.7}
              style={s.vehicleRow}
            >
              <Text style={s.vehicleText}>
                Vehicle: {vehicleLabel ?? "Choose vehicle"} · Change
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={{ gap: spacing.sm }}>
            <Button
              testID="driverHome.accept"
              title={`Accept${fare > 0 ? ` · ${formatCurrency(Math.round(fare * 100))}` : ""}`}
              onPress={onAccept}
              disabled={acceptDisabled}
            />
            <Button
              testID="driverHome.counter"
              title="Counter-offer"
              variant="secondary"
              onPress={onCounter}
            />
            <TouchableOpacity testID="driverHome.skip" onPress={onSkip} activeOpacity={0.7}>
              <Text style={s.skip}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "85%",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  passenger: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text.primary },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: fontSize.xs, color: colors.text.tertiary },
  fare: {
    marginTop: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primary,
  },
  vehicleRow: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vehicleText: { fontSize: fontSize.sm, color: colors.text.primary },
  skip: {
    textAlign: "center",
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/FocusedRideRequestSheet.tsx
git commit -m "feat(mobile): add FocusedRideRequestSheet for driver home"
```

---

## Task 5: DriverHome — test scaffolding + offline state

**Files:**
- Create: `mobile/src/app/(drawer)/_components/DriverHome.tsx`
- Create: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`:

```tsx
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Hook mocks. We control these per-test via the setters below. ---
let mockUser: any = { id: 1, isAvailableForRideRequest: false, isDriverOnboarded: true };
let mockVehicles: any[] = [
  { id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 },
];
let mockRequests: any[] = [];
let mockTogglePending = false;
let lastToggle: any = null;
let lastAccept: any = null;

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

jest.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      primary: "#000",
      primaryLight: "#eee",
      error: "#f00",
      success: "#0f0",
      surface: "#fff",
      background: "#fff",
      border: "#ccc",
      text: { primary: "#000", secondary: "#444", tertiary: "#888", inverse: "#fff" },
    },
    resolved: "light",
  }),
}));

jest.mock("@/hooks/useUser", () => ({
  useToggleRideRequestAvailability: () => ({
    mutateAsync: (v: boolean) => {
      lastToggle = v;
      return Promise.resolve();
    },
    isPending: mockTogglePending,
  }),
}));

jest.mock("@/hooks/useVehicles", () => ({
  useMyVehicles: () => ({ data: mockVehicles, isLoading: false }),
}));

jest.mock("@/hooks/useRideRequests", () => ({
  useOpenRideRequestsForDrivers: () => ({
    data: mockRequests,
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useAcceptRideRequest: () => ({
    mutateAsync: (input: any) => {
      lastAccept = input;
      return Promise.resolve({ data: { ride: { id: 99 } } });
    },
    isPending: false,
  }),
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  getCurrentPositionAsync: () =>
    Promise.resolve({ coords: { latitude: 0, longitude: 0, accuracy: 5 } }),
  Accuracy: { Balanced: 3 },
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MapView = (props: any) => React.createElement(View, { testID: "map" }, props.children);
  const Marker = (props: any) => React.createElement(View, { testID: "marker" }, props.children);
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: "google" };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ openDrawer: jest.fn() }),
}));

import { DriverHome } from "../DriverHome";

function resetMocks() {
  mockUser = { id: 1, isAvailableForRideRequest: false, isDriverOnboarded: true };
  mockVehicles = [{ id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 }];
  mockRequests = [];
  mockTogglePending = false;
  lastToggle = null;
  lastAccept = null;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockClear();
}

describe("DriverHome", () => {
  beforeEach(() => resetMocks());

  it("renders the GO ONLINE button when the driver is offline", () => {
    mockUser.isAvailableForRideRequest = false;
    const { getByTestId } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOnline")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: FAIL with "Cannot find module '../DriverHome'".

- [ ] **Step 3: Write minimal DriverHome to make the test pass**

Create `mobile/src/app/(drawer)/_components/DriverHome.tsx`:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Button } from "@/components/ui/Button";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing } from "@/lib/theme";

export function DriverHome() {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const isOnline = !!user?.isAvailableForRideRequest;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView style={StyleSheet.absoluteFillObject} provider={PROVIDER_GOOGLE} />

      <View style={styles.bottomBar}>
        {!isOnline ? (
          <Button testID="driverHome.goOnline" title="GO ONLINE" onPress={() => {}} />
        ) : (
          <Button testID="driverHome.goOffline" title="GO OFFLINE" variant="secondary" onPress={() => {}} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome skeleton with offline GO ONLINE button"
```

---

## Task 6: GO ONLINE tap calls toggleAvailability(true)

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

Append to the `describe("DriverHome", ...)` block in the test file:

```tsx
  it("calls toggleAvailability(true) when GO ONLINE is tapped", async () => {
    mockUser.isAvailableForRideRequest = false;
    const { getByTestId } = render(<DriverHome />);
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.goOnline"));
    });
    expect(lastToggle).toBe(true);
  });

  it("renders GO OFFLINE when the driver is online", () => {
    mockUser.isAvailableForRideRequest = true;
    const { getByTestId } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOffline")).toBeTruthy();
  });

  it("calls toggleAvailability(false) when GO OFFLINE is tapped", async () => {
    mockUser.isAvailableForRideRequest = true;
    const { getByTestId } = render(<DriverHome />);
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.goOffline"));
    });
    expect(lastToggle).toBe(false);
  });
```

- [ ] **Step 2: Run the new tests; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "toggleAvailability"
```

Expected: FAIL (the buttons have empty onPress).

- [ ] **Step 3: Wire the toggle in DriverHome.tsx**

Edit `DriverHome.tsx`. Replace the body of the component with:

```tsx
export function DriverHome() {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const toggleAvailability = useToggleRideRequestAvailability();
  const isOnline = !!user?.isAvailableForRideRequest;

  async function handleToggle(next: boolean) {
    try {
      await toggleAvailability.mutateAsync(next);
    } catch {
      // Failures are surfaced to the user via existing API error handling
      // upstream; nothing to do locally.
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView style={StyleSheet.absoluteFillObject} provider={PROVIDER_GOOGLE} />

      <View style={styles.bottomBar}>
        {!isOnline ? (
          <Button
            testID="driverHome.goOnline"
            title="GO ONLINE"
            onPress={() => handleToggle(true)}
            loading={toggleAvailability.isPending}
          />
        ) : (
          <Button
            testID="driverHome.goOffline"
            title="GO OFFLINE"
            variant="secondary"
            onPress={() => handleToggle(false)}
            loading={toggleAvailability.isPending}
          />
        )}
      </View>
    </View>
  );
}
```

Add to the imports at the top:

```tsx
import { useToggleRideRequestAvailability } from "@/hooks/useUser";
```

- [ ] **Step 4: Run the tests; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome GO ONLINE/OFFLINE wiring"
```

---

## Task 7: First-poll backlog behavior + idle state

When the driver is online, the *first* request payload is treated as backlog so we don't bombard a freshly-opened app with a focused sheet. The backlog chip shows the count; tapping it (covered in a later task) opens the backlog sheet.

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing tests**

Append to the test file:

```tsx
  it("shows the idle 'Looking for requests…' caption when online with no requests", () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { getByText, queryByTestId } = render(<DriverHome />);
    expect(getByText(/Looking for requests/i)).toBeTruthy();
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
  });

  it("treats the first-poll requests as backlog (no focused sheet, chip count = N)", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 1, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "1" } },
      { id: 2, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "2" } },
      { id: 3, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "3" } },
    ];
    const { queryByTestId, getByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByTestId("driverHome.backlogChip").props.children).toEqual(
      expect.arrayContaining([3, expect.anything()])
    );
  });
```

Note: the chip's children check is loose because `Text` children come through as a mixed array (`[count, " requests waiting"]`). Adjust if your chip renders the count differently — but make sure the count `3` appears somewhere in the rendered chip.

A simpler check that works regardless of children shape:

```tsx
    const { queryByTestId, getByText } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/3 requests waiting/i)).toBeTruthy();
```

Use the simpler form.

- [ ] **Step 2: Run the new tests; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "first-poll"
```

Expected: FAIL.

- [ ] **Step 3: Implement first-poll backlog + idle caption**

Replace `DriverHome.tsx` with:

```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Button } from "@/components/ui/Button";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToggleRideRequestAvailability } from "@/hooks/useUser";
import {
  useOpenRideRequestsForDrivers,
  type RideRequest,
} from "@/hooks/useRideRequests";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export function DriverHome() {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const toggleAvailability = useToggleRideRequestAvailability();
  const isOnline = !!user?.isAvailableForRideRequest;
  const { data: openRequests = [] } = useOpenRideRequestsForDrivers(isOnline);

  const [focusedRequestId, setFocusedRequestId] = useState<number | null>(null);
  const dismissedRef = useRef<Set<number>>(new Set());
  const seenFirstPollRef = useRef<boolean>(false);

  // Reset when the driver toggles online/offline so a fresh online session
  // starts from a clean slate.
  useEffect(() => {
    if (!isOnline) {
      dismissedRef.current = new Set();
      seenFirstPollRef.current = false;
      setFocusedRequestId(null);
    }
  }, [isOnline]);

  // Selection: on first poll, dump everything into dismissed (treat as backlog).
  // On subsequent polls, the first not-dismissed, not-already-focused id wins.
  useEffect(() => {
    if (!isOnline) return;
    if (!seenFirstPollRef.current) {
      seenFirstPollRef.current = true;
      openRequests.forEach((r) => dismissedRef.current.add(r.id));
      return;
    }
    if (focusedRequestId != null) {
      const stillThere = openRequests.some((r) => r.id === focusedRequestId);
      if (!stillThere) setFocusedRequestId(null);
      return;
    }
    const next = openRequests.find(
      (r) => !dismissedRef.current.has(r.id),
    );
    if (next) setFocusedRequestId(next.id);
  }, [openRequests, isOnline, focusedRequestId]);

  const backlogIds = useMemo(
    () =>
      openRequests
        .filter((r) => dismissedRef.current.has(r.id) && r.id !== focusedRequestId)
        .map((r) => r.id),
    [openRequests, focusedRequestId],
  );

  async function handleToggle(next: boolean) {
    try {
      await toggleAvailability.mutateAsync(next);
    } catch {
      // Surface via existing API error handling.
    }
  }

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <MapView style={StyleSheet.absoluteFillObject} provider={PROVIDER_GOOGLE} />

      {isOnline && focusedRequestId == null && (
        <Text style={s.idleCaption}>Looking for requests…</Text>
      )}

      {isOnline && backlogIds.length > 0 && (
        <TouchableOpacity testID="driverHome.backlogChip" style={s.chip} activeOpacity={0.85}>
          <Text style={s.chipText}>
            {backlogIds.length} requests waiting
          </Text>
        </TouchableOpacity>
      )}

      <View style={s.bottomBar}>
        {!isOnline ? (
          <Button
            testID="driverHome.goOnline"
            title="GO ONLINE"
            onPress={() => handleToggle(true)}
            loading={toggleAvailability.isPending}
          />
        ) : (
          <Button
            testID="driverHome.goOffline"
            title="GO OFFLINE"
            variant="secondary"
            onPress={() => handleToggle(false)}
            loading={toggleAvailability.isPending}
          />
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  idleCaption: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.text.secondary,
    fontSize: fontSize.sm,
  },
  chip: {
    position: "absolute",
    bottom: 140,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipText: { color: colors.text.inverse, fontWeight: "700", fontSize: fontSize.sm },
  bottomBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
});
```

- [ ] **Step 4: Run the tests; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome first-poll backlog + idle caption"
```

---

## Task 8: Focused sheet appears for new requests after first poll

A request that arrives *after* the first poll triggers the focused sheet. We simulate this by rerendering with the request still in the payload — but since the test mocks `useOpenRideRequestsForDrivers` to return a static list, we control "first poll vs subsequent" by mutating `mockRequests` and re-rendering.

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

Append to the test file:

```tsx
  it("focuses a request that arrives after the first poll", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll: empty
    const { rerender, queryByTestId, getByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();

    // Subsequent poll surfaces a new request.
    mockRequests = [
      {
        id: 42,
        originCity: "X",
        destCity: "Y",
        seats: 1,
        date: "2026-06-01T10:00:00Z",
        timeWindowStart: null,
        proposedFare: "10.00",
        user: { firstName: "P", lastName: "P" },
      },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "after the first poll"
```

Expected: FAIL (no focused sheet rendered yet).

- [ ] **Step 3: Render FocusedRideRequestSheet in DriverHome**

In `DriverHome.tsx`, add imports:

```tsx
import { FocusedRideRequestSheet } from "./FocusedRideRequestSheet";
import { useMyVehicles } from "@/hooks/useVehicles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/constants";
```

Add inside the component (after the existing `useEffect`s):

```tsx
  const { data: vehicles = [] } = useMyVehicles();
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  // Default vehicle: persisted choice, falling back to first vehicle.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.CURRENT_VEHICLE_ID).then((stored) => {
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && vehicles.some((v) => v.id === parsed)) {
        setVehicleId(parsed);
      } else if (vehicles.length > 0) {
        setVehicleId(vehicles[0].id);
      }
    });
  }, [vehicles]);

  const focusedRequest = useMemo<RideRequest | null>(
    () => openRequests.find((r) => r.id === focusedRequestId) ?? null,
    [openRequests, focusedRequestId],
  );
  const focusedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );
```

At the bottom of the JSX, *inside* the outer `<View>` and *before* the closing tag, add:

```tsx
      {focusedRequest && (
        <FocusedRideRequestSheet
          request={focusedRequest}
          vehicleLabel={focusedVehicle ? `${focusedVehicle.make} ${focusedVehicle.model}` : null}
          secondsRemaining={20}
          onChangeVehicle={() => {}}
          onAccept={() => {}}
          onCounter={() => {}}
          onSkip={() => {}}
          acceptDisabled={!vehicleId}
        />
      )}
```

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome focuses new requests after first poll"
```

---

## Task 9: Skip sends the focused request to backlog

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

```tsx
  it("Skip moves the focused request to backlog", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll empty
    const { rerender, getByTestId, queryByTestId, getByText } = render(<DriverHome />);

    mockRequests = [
      { id: 7, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "X" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.skip"));
    });

    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/1 requests waiting/i)).toBeTruthy();
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "Skip moves"
```

Expected: FAIL (Skip is a no-op).

- [ ] **Step 3: Wire Skip**

In `DriverHome.tsx`, add a `handleSkip` function inside the component (above the JSX):

```tsx
  function handleSkip() {
    if (focusedRequestId == null) return;
    dismissedRef.current.add(focusedRequestId);
    setFocusedRequestId(null);
  }
```

Replace the `onSkip={() => {}}` prop on `FocusedRideRequestSheet` with `onSkip={handleSkip}`.

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome Skip moves focused request to backlog"
```

---

## Task 10: Countdown ticks down and expiry triggers Skip

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing tests using fake timers**

At the top of the `describe` block, add `jest.useFakeTimers();` inside `beforeEach`:

```tsx
  beforeEach(() => {
    resetMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
```

Append the test:

```tsx
  it("expiring the 20s countdown moves the request to backlog (same as Skip)", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { rerender, getByTestId, queryByTestId, getByText } = render(<DriverHome />);

    mockRequests = [
      { id: 99, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "Z" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    // Advance 20 seconds; countdown should expire and move to backlog.
    await act(async () => {
      jest.advanceTimersByTime(20_500);
    });

    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/1 requests waiting/i)).toBeTruthy();
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "countdown"
```

Expected: FAIL.

- [ ] **Step 3: Add countdown state to DriverHome.tsx**

Replace the `secondsRemaining={20}` hardcoded value with state. Add inside the component:

```tsx
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);

  // Reset countdown whenever the focused request changes.
  useEffect(() => {
    if (focusedRequestId == null) {
      setSecondsRemaining(20);
      return;
    }
    setSecondsRemaining(20);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          dismissedRef.current.add(focusedRequestId);
          setFocusedRequestId(null);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [focusedRequestId]);
```

Change the prop:

```tsx
          secondsRemaining={secondsRemaining}
```

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome 20s countdown that expires to backlog"
```

---

## Task 11: Tap backlog chip opens backlog sheet listing dismissed requests

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

```tsx
  it("tapping the backlog chip opens the backlog sheet with the dismissed requests", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 11, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "1" } },
      { id: 12, originCity: "C", destCity: "D", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "2" } },
    ];
    const { getByTestId, queryByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.backlogSheet")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogChip"));
    });

    expect(getByTestId("driverHome.backlogSheet")).toBeTruthy();
    // Both backlog rows visible.
    expect(getByTestId("driverHome.backlogRow.11")).toBeTruthy();
    expect(getByTestId("driverHome.backlogRow.12")).toBeTruthy();
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "backlog chip"
```

Expected: FAIL.

- [ ] **Step 3: Implement the backlog sheet inline in DriverHome**

In `DriverHome.tsx`, add a Modal import:

```tsx
import { Modal, ScrollView } from "react-native";
```

(Already imported in earlier tasks — make sure both are present.)

Add state:

```tsx
  const [backlogSheetOpen, setBacklogSheetOpen] = useState(false);
```

Change the chip TouchableOpacity:

```tsx
        <TouchableOpacity
          testID="driverHome.backlogChip"
          style={s.chip}
          activeOpacity={0.85}
          onPress={() => setBacklogSheetOpen(true)}
        >
```

Add the backlog sheet markup at the bottom of the outer `<View>`, before the closing tag and before the `{focusedRequest && (...)` block:

```tsx
      <Modal
        visible={backlogSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBacklogSheetOpen(false)}
      >
        <View style={s.backlogBackdrop} testID="driverHome.backlogSheet">
          <View style={s.backlogPanel}>
            <Text style={s.backlogTitle}>Backlog</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {openRequests
                .filter((r) => backlogIds.includes(r.id))
                .map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    testID={`driverHome.backlogRow.${r.id}`}
                    style={s.backlogRow}
                    onPress={() => {
                      dismissedRef.current.delete(r.id);
                      setFocusedRequestId(r.id);
                      setBacklogSheetOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.backlogRowText}>
                      {r.originCity} → {r.destCity}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <Button title="Close" variant="secondary" onPress={() => setBacklogSheetOpen(false)} />
          </View>
        </View>
      </Modal>
```

Add to `makeStyles`:

```tsx
  backlogBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backlogPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "70%",
  },
  backlogTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  backlogRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backlogRowText: { fontSize: fontSize.md, color: colors.text.primary },
```

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome backlog chip + backlog sheet"
```

---

## Task 12: Tapping a backlog row re-focuses the request

The backlog row already wires `setFocusedRequestId` in Task 11. Add the test that locks this in.

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`

- [ ] **Step 1: Add the test**

```tsx
  it("tapping a backlog row re-focuses that request", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 21, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "1" } },
    ];
    const { getByTestId, queryByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogChip"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogRow.21"));
    });

    expect(getByTestId("driverHome.focusedSheet")).toBeTruthy();
    expect(queryByTestId("driverHome.backlogSheet")).toBeNull();
  });
```

- [ ] **Step 2: Run; expect pass (no impl change needed — Task 11 already wired this)**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "test(mobile): lock in backlog row → focused request behavior"
```

---

## Task 13: GO ONLINE disabled when driver has zero vehicles

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing tests**

```tsx
  it("disables GO ONLINE with a CTA when the driver has no vehicles", () => {
    mockUser.isAvailableForRideRequest = false;
    mockVehicles = [];
    const { getByTestId, getByText } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOnline").props.accessibilityState?.disabled).toBe(true);
    expect(getByText(/Add a vehicle to go online/i)).toBeTruthy();
  });
```

The exact prop path depends on the `Button` component. If `Button` doesn't forward `accessibilityState`, swap to checking that pressing it does nothing:

```tsx
    fireEvent.press(getByTestId("driverHome.goOnline"));
    expect(lastToggle).toBeNull();
```

Use whichever pattern matches `Button`'s behavior (open `mobile/src/components/ui/Button.tsx` and verify).

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "no vehicles"
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `DriverHome.tsx`, change the offline branch:

```tsx
        {!isOnline ? (
          <>
            <Button
              testID="driverHome.goOnline"
              title="GO ONLINE"
              onPress={() => handleToggle(true)}
              loading={toggleAvailability.isPending}
              disabled={vehicles.length === 0}
            />
            {vehicles.length === 0 && (
              <Text style={s.cta}>Add a vehicle to go online</Text>
            )}
          </>
        ) : (
```

Add the style:

```tsx
  cta: {
    color: colors.text.secondary,
    textAlign: "center",
    fontSize: fontSize.xs,
  },
```

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): disable GO ONLINE when driver has no vehicles"
```

---

## Task 14: Accept calls mutation with selected vehicle and navigates

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

```tsx
  it("Accept calls useAcceptRideRequest with the focused request and selected vehicle", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll empty
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 55, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "X" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.accept"));
    });

    expect(lastAccept).toEqual({ requestId: 55, vehicleId: 10 });
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "Accept calls"
```

Expected: FAIL.

- [ ] **Step 3: Wire Accept in DriverHome.tsx**

Add imports:

```tsx
import { useRouter } from "expo-router";
import { useAcceptRideRequest } from "@/hooks/useRideRequests";
```

Add inside the component:

```tsx
  const router = useRouter();
  const acceptMutation = useAcceptRideRequest();

  async function handleAccept() {
    if (focusedRequestId == null || vehicleId == null) return;
    try {
      const res = await acceptMutation.mutateAsync({
        requestId: focusedRequestId,
        vehicleId,
      });
      const rideId = (res as any)?.data?.ride?.id;
      const acceptedId = focusedRequestId;
      setFocusedRequestId(null);
      dismissedRef.current.delete(acceptedId);
      if (rideId) router.replace(`/ride/${rideId}` as any);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 410) {
        const goneId = focusedRequestId;
        dismissedRef.current.delete(goneId);
        setFocusedRequestId(null);
      }
      // Otherwise leave the sheet open so the driver can retry.
    }
  }
```

Replace `onAccept={() => {}}` on `FocusedRideRequestSheet` with `onAccept={handleAccept}`.

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome Accept wires acceptRideRequest mutation"
```

---

## Task 15: Counter-offer opens the existing CounterOfferSheet

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

```tsx
  it("Counter-offer opens the CounterOfferSheet for the focused request", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 66, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "8.00", user: { firstName: "U", lastName: "Y" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.counter"));
    });

    expect(getByTestId("driverHome.counterOfferSheet")).toBeTruthy();
  });
```

- [ ] **Step 2: Add a mock for CounterOfferSheet**

At the top of the test file, before the `import { DriverHome }` line, add:

```tsx
jest.mock("@/components/CounterOfferSheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  const CounterOfferSheet = React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: () => {} }));
    return React.createElement(View, { testID: "driverHome.counterOfferSheet" });
  });
  return { CounterOfferSheet };
});
```

- [ ] **Step 3: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "Counter-offer"
```

Expected: FAIL.

- [ ] **Step 4: Wire CounterOfferSheet in DriverHome.tsx**

Add the import:

```tsx
import { CounterOfferSheet, type CounterOfferSheetRef } from "@/components/CounterOfferSheet";
```

Add state and ref:

```tsx
  const counterSheetRef = useRef<CounterOfferSheetRef>(null);
  const [counterState, setCounterState] = useState<{
    rideRequestId: number;
    proposedFare: number;
    vehicleId: number;
  } | null>(null);

  function handleCounter() {
    if (focusedRequest == null || vehicleId == null) return;
    const fare = focusedRequest.proposedFare ? parseFloat(focusedRequest.proposedFare) : 0;
    const focusedId = focusedRequest.id;
    setCounterState({ rideRequestId: focusedId, proposedFare: fare, vehicleId });
    // Mirror ride-requests/index.tsx: close focused sheet, then open CounterOfferSheet.
    dismissedRef.current.add(focusedId);
    setFocusedRequestId(null);
    setTimeout(() => counterSheetRef.current?.open(), 250);
  }
```

Replace `onCounter={() => {}}` with `onCounter={handleCounter}`.

Render `CounterOfferSheet` at the bottom of the outer `<View>` (always — its visibility is controlled internally via the ref):

```tsx
      {counterState && (
        <CounterOfferSheet
          ref={counterSheetRef}
          rideRequestId={counterState.rideRequestId}
          proposedFare={counterState.proposedFare}
          vehicleId={counterState.vehicleId}
        />
      )}
```

- [ ] **Step 5: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome Counter-offer opens CounterOfferSheet"
```

---

## Task 16: Change vehicle persists CURRENT_VEHICLE_ID

**Files:**
- Modify: `mobile/src/app/(drawer)/_components/__tests__/DriverHome.test.tsx`
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`

- [ ] **Step 1: Add the failing test**

```tsx
  it("changing vehicle in the focused sheet persists CURRENT_VEHICLE_ID", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockVehicles = [
      { id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 },
      { id: 11, make: "Toyota", model: "Corolla", plateNumber: "XYZ789", capacity: 4 },
    ];
    mockRequests = [];
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 77, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "Z" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.changeVehicle"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("vehiclePicker.row.11"));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("yourdrive_current_vehicle_id", "11");
  });
```

- [ ] **Step 2: Run; expect failure**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx -t "changing vehicle"
```

Expected: FAIL.

- [ ] **Step 3: Wire VehiclePickerSheet for Change Vehicle**

Add the import:

```tsx
import { VehiclePickerSheet } from "./VehiclePickerSheet";
```

Add state:

```tsx
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handlePickVehicle(id: number) {
    setVehicleId(id);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_VEHICLE_ID, String(id));
    setPickerOpen(false);
  }
```

Replace `onChangeVehicle={() => {}}` with `onChangeVehicle={() => setPickerOpen(true)}`.

At the bottom of the outer `<View>`, add:

```tsx
      <VehiclePickerSheet
        visible={pickerOpen}
        vehicles={vehicles}
        title="Change vehicle"
        onPick={handlePickVehicle}
        onClose={() => setPickerOpen(false)}
      />
```

Note: `useMyVehicles` returns the same `Vehicle[]` shape; cast or pass as `vehicles as any` if `lib/types.ts` `Vehicle` differs from `VehiclePickerSheet`'s `Vehicle`. If types differ, narrow them via:

```tsx
const pickerVehicles = vehicles.map((v) => ({
  id: v.id,
  make: v.make,
  model: v.model,
  plateNumber: v.plateNumber,
  capacity: v.capacity,
}));
```

And use `pickerVehicles` in the sheet.

- [ ] **Step 4: Run; expect pass**

```bash
cd mobile && npx jest src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/__tests__/DriverHome.test.tsx
git commit -m "feat(mobile): DriverHome change-vehicle persists CURRENT_VEHICLE_ID"
```

---

## Task 17: Extract PassengerHome out of the route file

The current `mobile/src/app/(drawer)/index.tsx` is the passenger home. Move its full content into a new component file unchanged so the route file can branch on mode.

**Files:**
- Create: `mobile/src/app/(drawer)/_components/PassengerHome.tsx`
- Modify: `mobile/src/app/(drawer)/index.tsx`

- [ ] **Step 1: Create PassengerHome.tsx with the current home content**

Open `mobile/src/app/(drawer)/index.tsx` and copy the entire file's content into a new file `mobile/src/app/(drawer)/_components/PassengerHome.tsx`. Then in that new file:

1. Rename the default-exported function `HomeScreen` to a named-exported function `PassengerHome`:

```tsx
export function PassengerHome() {
  // (everything inside the old HomeScreen body)
}
```

2. Remove `export default` if it's there.

3. Update imports if any relative paths break — most should still resolve since the file is one level deeper but `@/...` aliases are unaffected.

- [ ] **Step 2: Make the route file a thin router**

Replace the entire contents of `mobile/src/app/(drawer)/index.tsx` with:

```tsx
import React from "react";
import { useMode } from "@/providers/ModeProvider";
import { PassengerHome } from "./_components/PassengerHome";
import { DriverHome } from "./_components/DriverHome";

export default function HomeRoute() {
  const { isDriverMode } = useMode();
  return isDriverMode ? <DriverHome /> : <PassengerHome />;
}
```

- [ ] **Step 3: Type-check and run all existing tests**

```bash
cd mobile && npx tsc --noEmit && npx jest
```

Expected: PASS for both.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/PassengerHome.tsx \
        mobile/src/app/\(drawer\)/index.tsx
git commit -m "refactor(mobile): split (drawer)/index into mode-branching router"
```

---

## Task 18: Drop ride-requests from the drawer layout

**Files:**
- Modify: `mobile/src/app/(drawer)/_layout.tsx`

- [ ] **Step 1: Update _layout.tsx**

Open `mobile/src/app/(drawer)/_layout.tsx`. Replace the two affected pieces:

1. Remove the `useMode` import line if it has no other use after this change:

```tsx
import { useMode } from "@/providers/ModeProvider";
```

— check whether it's still used elsewhere in the file. If yes, keep it.

2. Replace the `initialRoute` block and the `<Drawer.Screen name="ride-requests" .../>` line.

Find:

```tsx
  const { isDriverMode } = useMode();
```

If `isDriverMode` is unused after the next edit, remove this line too.

Find and remove:

```tsx
  // Driver mode lands on the live ride request inbox; passenger mode on the
  // map. The user flips between them with the drawer's mode toggle, which also
  // navigates to the matching home.
  const initialRoute = isDriverMode ? "ride-requests" : "index";
```

In the `<Drawer ...>` props, change `initialRouteName={initialRoute}` to `initialRouteName="index"`.

Find and remove:

```tsx
        <Drawer.Screen name="ride-requests" options={{ title: "Live Ride Requests" }} />
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/\(drawer\)/_layout.tsx
git commit -m "refactor(mobile): drop ride-requests screen from drawer layout"
```

---

## Task 19: Drop the ride-requests menu entry and update mode toggle target

**Files:**
- Modify: `mobile/src/components/DrawerContent.tsx`

- [ ] **Step 1: Edit DrawerContent.tsx**

1. In the `menuItems` array (around lines 61-120), remove the entry:

```tsx
    {
      icon: (c) => <Radio size={20} color={c} />,
      label: "Live Ride Requests",
      route: "/ride-requests",
      testID: "drawer.rideRequests",
      mode: "driver",
    },
```

2. If `Radio` is no longer imported anywhere else in the file, remove it from the lucide import:

```tsx
import {
  Home, Car, PlusCircle, MessageCircle, User,
  Key, UserCheck, X, ChevronRight, Wallet, Radio,
} from "lucide-react-native";
```

becomes (Radio removed):

```tsx
import {
  Home, Car, PlusCircle, MessageCircle, User,
  Key, UserCheck, X, ChevronRight, Wallet,
} from "lucide-react-native";
```

3. In `handleToggleMode`, change the driver-mode redirect from `/ride-requests` to `/`:

Find:

```tsx
    if (!user?.isDriverOnboarded) {
      router.push("/onboarding/driver?redirect=ride-requests" as any);
      return;
    }
    setMode("driver");
    router.replace("/ride-requests");
```

Replace with:

```tsx
    if (!user?.isDriverOnboarded) {
      router.push("/onboarding/driver?redirect=home" as any);
      return;
    }
    setMode("driver");
    router.replace("/");
```

- [ ] **Step 2: Check the onboarding screen handles the new redirect query**

Open `mobile/src/app/onboarding/driver.tsx` and grep for `redirect`:

```bash
grep -n "redirect" mobile/src/app/onboarding/driver.tsx
```

If it specifically checks for `"ride-requests"`, update it to also accept `"home"`, or simplify it to always route to `/` after onboarding (since driver home is now `/`). Quote the file's existing handling in the commit message if you change it.

- [ ] **Step 3: Type-check and run tests**

```bash
cd mobile && npx tsc --noEmit && npx jest
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/DrawerContent.tsx mobile/src/app/onboarding/driver.tsx
git commit -m "refactor(mobile): remove Live Ride Requests drawer entry; driver lands at /"
```

---

## Task 20: Delete the old ride-requests screen

**Files:**
- Delete: `mobile/src/app/(drawer)/ride-requests/index.tsx`
- Delete: `mobile/src/app/(drawer)/ride-requests/` (directory, when empty)

- [ ] **Step 1: Delete the file and directory**

```bash
rm mobile/src/app/\(drawer\)/ride-requests/index.tsx
rmdir mobile/src/app/\(drawer\)/ride-requests
```

- [ ] **Step 2: Grep for any remaining references**

```bash
grep -rn "ride-requests\|/ride-requests" mobile/src --include="*.ts" --include="*.tsx" | grep -v "/api/v1\|backend\|ride-requests/open-for-drivers\|/ride-requests/" 
```

If the grep flags any push/replace navigation to `/ride-requests` outside of API call strings, replace those with `/` (driver lands at home now). Re-run until the grep is clean of navigation references.

- [ ] **Step 3: Type-check and run tests**

```bash
cd mobile && npx tsc --noEmit && npx jest
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A mobile/src/app/\(drawer\)/
git commit -m "refactor(mobile): delete obsolete ride-requests screen"
```

---

## Task 21: Manual iOS sim verification

This task isn't TDD — the test suite cannot exercise MapView, Expo Router navigation, or the live `/driver-presence` and `/ride-requests/open-for-drivers` endpoints. We verify the real app behavior by hand.

- [ ] **Step 1: Build and launch dev client on iOS sim**

```bash
cd mobile && npx expo run:ios
```

- [ ] **Step 2: Walk the driver flow**

Sign in as a driver-onboarded user. Confirm:

1. The drawer's "Switch to Driver Mode" button drops you on the new map-first home — not `/ride-requests`.
2. The drawer no longer shows a "Live Ride Requests" item.
3. **GO ONLINE** is visible. Tap it.
4. Backend confirms the heartbeat: from another shell, run
   ```bash
   curl -s "$YOURDRIVE_API/api/v1/drivers/nearby?swLat=-30&swLng=20&neLat=10&neLng=50" \
     -H "Authorization: Bearer <token>" | jq '.drivers | length'
   ```
   Expected: ≥ 1 within ~30 s of going online (presence freshness window).
5. As a separate test user (passenger), create a ride request via the passenger home. Within ~10 s, the driver should see the focused sheet on `DriverHome`.
6. Tap **Skip**. Sheet closes, chip shows "1 requests waiting". Tap the chip → backlog sheet lists the request.
7. Tap the row → focused sheet returns. Tap **Accept** → app navigates to `/ride/<id>` and the ride exists server-side.
8. Tap **GO OFFLINE**. Heartbeat stops; passenger map should empty out within ~30 s.

If any step fails, file a TODO in the commit message and stop here for review.

- [ ] **Step 3: Walk the passenger flow (regression check)**

Sign in as a non-driver. The drawer toggle lands on `PassengerHome`, the existing map + bottom-sheet UI. All passenger paths (request a ride, find a ride, rental, chauffeur) still work as before.

- [ ] **Step 4: Confirm the "no drivers on map" bug is gone**

Keep a passenger session running. As you toggle a driver online from the new DriverHome on a second device or simulator, the passenger should see a driver marker appear within ~10 s.

- [ ] **Step 5: Commit a notes file (optional) or push the branch**

If anything is left to clean up, capture a short note in the commit body. Otherwise, push:

```bash
git push -u origin <branch>
```

---

## Self-Review

**Spec coverage check.**

| Spec section | Implementing task(s) |
|---|---|
| Routing & file structure | Tasks 17, 18, 19, 20 |
| Reused infrastructure | Tasks 6, 8, 10, 14, 15, 16 |
| Screen state: Offline | Tasks 5, 6, 13 |
| Screen state: Online idle | Task 7 |
| Screen state: Online focused | Tasks 8, 10, 14, 15, 16 |
| Screen state: Backlog chip + sheet | Tasks 11, 12 |
| Screen state: No location permission | (not separately tested; covered manually in Task 21) |
| State machine for incoming requests | Tasks 7, 8, 9, 10 |
| Error handling: 409 on accept | Task 14 |
| Tests listed in spec | All present in Tasks 5–16 |
| Migration & rollout | Tasks 17–21 |

**Placeholder scan:** No "TBD", no "TODO", no "similar to Task N", every step shows the code or command. The "No location permission" UI is intentionally lighter than the spec — covered by manual verification only — because mocking expo-location's prompt-show flow has historically been more complex than the bug-surface justifies. If you want unit-level coverage there, add a small task with the standard pattern after Task 13.

**Type consistency:** `useToggleRideRequestAvailability` matches `useUser.ts:38`. `useOpenRideRequestsForDrivers` matches `useRideRequests.ts:124`. `useAcceptRideRequest` mutation key matches `useRideRequests.ts:136`. `STORAGE_KEYS.CURRENT_VEHICLE_ID` matches `lib/constants.ts:66`. `CounterOfferSheet` ref API matches the existing usage in `ride-requests/index.tsx:155-220`. Vehicle shape in `VehiclePickerSheet` is a structural subset of the `Vehicle` type from `lib/types.ts`.
