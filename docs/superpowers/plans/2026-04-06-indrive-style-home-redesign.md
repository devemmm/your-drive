# InDrive-Style Home Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tab-based home screen with a full-screen Google Map + swipeable bottom sheet, and convert bottom tab navigation to a hamburger side-drawer menu.

**Architecture:** The `(tabs)` directory becomes `(drawer)` using `expo-router/drawer` with `@react-navigation/drawer`. The home screen renders a full-screen `MapView` with driver markers, a pickup location bubble, and a `@gorhom/bottom-sheet` overlay. The bottom sheet has collapsed (vehicle tabs + search bar) and expanded (destination + mode toggle + contextual fields + recent destinations) states. All former tab screens become drawer menu items.

**Tech Stack:** expo-router/drawer, @react-navigation/drawer, @gorhom/bottom-sheet, react-native-maps (already installed), expo-location, react-native-reanimated (already installed)

**Spec:** `docs/superpowers/specs/2026-04-06-indrive-style-home-redesign.md`

---

### Task 1: Install Dependencies

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install drawer, bottom sheet, and location packages**

```bash
cd mobile && npx expo install @react-navigation/drawer expo-location @gorhom/bottom-sheet
```

This installs:
- `@react-navigation/drawer` — required for `expo-router/drawer`
- `expo-location` — GPS permissions and current location
- `@gorhom/bottom-sheet` — performant swipeable bottom sheet (uses already-installed reanimated + gesture-handler)

- [ ] **Step 2: Verify installation**

```bash
cd mobile && npx expo doctor
```

Expected: No critical issues. May show peer-dep warnings — safe to ignore.

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore: install drawer, bottom-sheet, and expo-location deps"
```

---

### Task 2: Create `useCurrentLocation` Hook

**Files:**
- Create: `mobile/src/hooks/useCurrentLocation.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect } from "react";
import * as Location from "expo-location";

interface CurrentLocation {
  latitude: number;
  longitude: number;
}

interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLocation() {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setIsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);

      const [reverseGeo] = await Location.reverseGeocodeAsync(coords);
      if (reverseGeo) {
        const street = reverseGeo.street || reverseGeo.name || "";
        const city = reverseGeo.city || reverseGeo.subregion || "";
        setAddress(street || city || "Current Location");
      }
    } catch (err: any) {
      setError(err.message || "Failed to get location");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, address, isLoading, error, refetch: fetchLocation };
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useCurrentLocation.ts
git commit -m "feat: add useCurrentLocation hook with GPS and reverse geocoding"
```

---

### Task 3: Convert Tab Navigation to Drawer Navigation

This task replaces the bottom tab bar with a side drawer menu. The `(tabs)` directory is renamed to `(drawer)` and the layout switches from `Tabs` to `Drawer`.

**Files:**
- Rename: `mobile/src/app/(tabs)/` → `mobile/src/app/(drawer)/`
- Rewrite: `mobile/src/app/(drawer)/_layout.tsx`
- Create: `mobile/src/components/DrawerContent.tsx`
- Modify: `mobile/src/app/_layout.tsx` (update `(tabs)` → `(drawer)` reference)

- [ ] **Step 1: Rename the tabs directory**

```bash
cd mobile/src/app && mv "(tabs)" "(drawer)"
```

- [ ] **Step 2: Update root layout to reference `(drawer)`**

In `mobile/src/app/_layout.tsx`, change the Stack.Screen name:

```typescript
// Change this line:
<Stack.Screen name="(tabs)" />
// To:
<Stack.Screen name="(drawer)" />
```

- [ ] **Step 3: Create the custom drawer content component**

Create `mobile/src/components/DrawerContent.tsx`:

```typescript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  Home, Car, PlusCircle, MessageCircle, User,
  Key, UserCheck, X, ChevronRight,
} from "lucide-react-native";
import { useAuthContext } from "@/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuthContext();
  const router = useRouter();

  function navigateAndClose(route: string) {
    props.navigation.closeDrawer();
    router.push(route as any);
  }

  const menuItems: MenuItem[] = [
    {
      icon: <Car size={20} color={colors.text.secondary} />,
      label: "My Rides",
      onPress: () => {
        props.navigation.closeDrawer();
        // Navigate to the rides screen within the drawer group
        router.push("/(drawer)/rides" as any);
      },
    },
    {
      icon: <PlusCircle size={20} color={colors.text.secondary} />,
      label: "Post a Ride",
      onPress: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/post" as any);
      },
    },
    {
      icon: <Key size={20} color={colors.text.secondary} />,
      label: "Rent a Car",
      onPress: () => navigateAndClose("/rental"),
    },
    {
      icon: <UserCheck size={20} color={colors.text.secondary} />,
      label: "Hire a Driver",
      onPress: () => navigateAndClose("/chauffeur"),
    },
    {
      icon: <MessageCircle size={20} color={colors.text.secondary} />,
      label: "Chat",
      onPress: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/chat" as any);
      },
    },
    {
      icon: <User size={20} color={colors.text.secondary} />,
      label: "Profile",
      onPress: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/profile" as any);
      },
    },
  ];

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "bottom"]}>
      {/* User header */}
      <View style={s.header}>
        <Avatar
          firstName={user?.firstName || ""}
          lastName={user?.lastName || ""}
          imageUrl={user?.profileImage?.url}
          size={56}
        />
        <View style={s.userInfo}>
          <Text style={s.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={s.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          onPress={() => props.navigation.closeDrawer()}
          style={s.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={s.divider} />

      {/* Menu items */}
      <ScrollView style={s.menuList} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={s.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            {item.icon}
            <Text style={s.menuLabel}>{item.label}</Text>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  menuList: {
    flex: 1,
    paddingTop: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "500",
    color: colors.text.primary,
  },
});
```

- [ ] **Step 4: Rewrite the drawer layout**

Rewrite `mobile/src/app/(drawer)/_layout.tsx`:

```typescript
import React from "react";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAuthContext } from "@/providers/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { DrawerContent } from "@/components/DrawerContent";
import { colors } from "@/lib/theme";

function NotificationsPoller() {
  useNotifications();
  return null;
}

export default function DrawerLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) return <LoadingIndicator fullScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  return (
    <>
      <NotificationsPoller />
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            width: "80%",
            backgroundColor: colors.background,
          },
          swipeEnabled: false,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{ title: "Home" }}
        />
        <Drawer.Screen
          name="rides"
          options={{ title: "My Rides", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="post"
          options={{ title: "Post a Ride", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="chat"
          options={{ title: "Chat", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="profile"
          options={{ title: "Profile", drawerItemStyle: { display: "none" } }}
        />
      </Drawer>
    </>
  );
}
```

- [ ] **Step 5: Run the app to verify drawer works**

```bash
cd mobile && npx expo start
```

Expected: App launches, no tab bar visible, hamburger can be tested once home screen is built. The other screens (rides, chat, profile, post) should still be accessible via URL.

- [ ] **Step 6: Commit**

```bash
git add -A mobile/src/app/"(drawer)" mobile/src/components/DrawerContent.tsx mobile/src/app/_layout.tsx
git commit -m "feat: replace bottom tab navigation with drawer side menu"
```

**Note:** After renaming `(tabs)` to `(drawer)`, git may show the old `(tabs)` files as deleted and new `(drawer)` files as added. That's expected.

---

### Task 4: Build the Map Home Screen

This is the core task — replace the old scrollable home with a full-screen map, floating controls, and the bottom sheet.

**Files:**
- Rewrite: `mobile/src/app/(drawer)/index.tsx`
- Create: `mobile/src/components/HomeBottomSheet.tsx`

- [ ] **Step 1: Create the HomeBottomSheet component**

Create `mobile/src/components/HomeBottomSheet.tsx`:

```typescript
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  Search, Hand, DollarSign, Users, Minus, Plus, Calendar, X, ChevronDown,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LocationPicker } from "@/components/LocationPicker";
import { ExtractedLocation } from "@/hooks/usePlaces";
import { useCreateRideRequest } from "@/hooks/useRideRequests";
import { handleApiError } from "@/lib/utils";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "react-i18next";

type VehicleType = "CAR" | "MOTORBIKE" | "BUS";
type Mode = "request" | "find";

interface VehicleOption {
  type: VehicleType;
  label: string;
  materialIcon: string;
  disabled?: boolean;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { type: "CAR", label: "Car", materialIcon: "directions-car" },
  { type: "MOTORBIKE", label: "Moto", materialIcon: "two-wheeler" },
  { type: "BUS", label: "Bus", materialIcon: "directions-bus", disabled: true },
];

const MAX_PASSENGERS = 8;

interface HomeBottomSheetProps {
  onSheetChange?: (index: number) => void;
}

const HomeBottomSheet = forwardRef<BottomSheet, HomeBottomSheetProps>(
  ({ onSheetChange }, ref) => {
    const router = useRouter();
    const { t } = useTranslation();
    const createRequest = useCreateRideRequest();

    const [vehicleType, setVehicleType] = useState<VehicleType>("CAR");
    const [mode, setMode] = useState<Mode>("request");
    const [destinationLocation, setDestinationLocation] = useState<ExtractedLocation | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [proposedFare, setProposedFare] = useState("");
    const [passengers, setPassengers] = useState(1);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const snapPoints = useMemo(() => ["22%", "85%"], []);

    const handleSheetChange = useCallback(
      (index: number) => {
        onSheetChange?.(index);
      },
      [onSheetChange]
    );

    async function handleRequestRide() {
      if (!destinationLocation) {
        Alert.alert("Missing destination", "Please select where you want to go.");
        return;
      }
      const fare = parseFloat(proposedFare);
      if (!fare || fare <= 0) {
        Alert.alert("Proposed fare", "Enter the amount you're offering to pay.");
        return;
      }
      try {
        const payload: any = {
          destination: {
            city: destinationLocation.city || destinationLocation.region || destinationLocation.locationName,
            province: destinationLocation.region || destinationLocation.city || "Unknown",
            latitude: destinationLocation.latitude,
            longitude: destinationLocation.longitude,
            locationName: destinationLocation.locationName,
            address: destinationLocation.address,
          },
          seats: vehicleType === "MOTORBIKE" ? 1 : passengers,
          rideType: "P2P",
          proposedFare: fare,
          vehicleCategory: vehicleType,
        };
        const response = await createRequest.mutateAsync(payload);
        const requestId = (response as any)?.data?.id;
        if (requestId) {
          router.push(`/ride-request/${requestId}` as any);
        }
      } catch (error: any) {
        handleApiError(error, t);
      }
    }

    function handleFindRides() {
      if (!destinationLocation) {
        Alert.alert("Missing destination", "Please select where you want to go.");
        return;
      }
      router.push({
        pathname: "/ride/search-results",
        params: {
          destinationCity: destinationLocation.city,
          departureDate: date.toISOString().split("T")[0],
          passengers: passengers.toString(),
        },
      });
    }

    const isToday = date.toDateString() === new Date().toDateString();
    const dateLabel = isToday
      ? "Today"
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    return (
      <>
        <BottomSheet
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChange}
          backgroundStyle={bs.background}
          handleIndicatorStyle={bs.handle}
          enablePanDownToClose={false}
        >
          <BottomSheetScrollView
            contentContainerStyle={bs.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Vehicle type tabs */}
            <View style={bs.vehicleTabs}>
              {VEHICLE_OPTIONS.map((opt) => {
                const selected = vehicleType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      bs.vehicleTab,
                      selected && bs.vehicleTabActive,
                      opt.disabled && bs.vehicleTabDisabled,
                    ]}
                    onPress={() => {
                      if (opt.disabled) {
                        Alert.alert("Coming soon", "Bus rides are still in development.");
                        return;
                      }
                      setVehicleType(opt.type);
                      if (opt.type === "MOTORBIKE") setPassengers(1);
                    }}
                    activeOpacity={opt.disabled ? 1 : 0.7}
                  >
                    <Text style={[bs.vehicleIcon, selected && bs.vehicleIconActive]}>
                      {opt.type === "CAR" ? "🚙" : opt.type === "MOTORBIKE" ? "🏍" : "🚌"}
                    </Text>
                    <Text
                      style={[
                        bs.vehicleLabel,
                        selected && bs.vehicleLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search / Destination field */}
            <TouchableOpacity
              style={bs.searchBar}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}
            >
              {destinationLocation ? (
                <>
                  <View style={bs.destDot} />
                  <Text style={bs.destText} numberOfLines={1}>
                    {destinationLocation.locationName || destinationLocation.city}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDestinationLocation(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Search size={18} color={colors.text.tertiary} />
                  <Text style={bs.searchPlaceholder}>Where to & for how much?</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Mode toggle — only visible when destination is set */}
            {destinationLocation && (
              <>
                <View style={bs.modeToggle}>
                  <TouchableOpacity
                    style={[bs.modeBtn, mode === "request" && bs.modeBtnActive]}
                    onPress={() => setMode("request")}
                    activeOpacity={0.8}
                  >
                    <Hand size={14} color={mode === "request" ? colors.text.inverse : colors.text.secondary} />
                    <Text style={[bs.modeText, mode === "request" && bs.modeTextActive]}>
                      Request a Ride
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[bs.modeBtn, mode === "find" && bs.modeBtnActive]}
                    onPress={() => setMode("find")}
                    activeOpacity={0.8}
                  >
                    <Search size={14} color={mode === "find" ? colors.text.inverse : colors.text.secondary} />
                    <Text style={[bs.modeText, mode === "find" && bs.modeTextActive]}>
                      Find a Ride
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Contextual fields */}
                <View style={bs.fieldsRow}>
                  {mode === "request" ? (
                    <View style={bs.fareField}>
                      <DollarSign size={16} color={colors.text.secondary} />
                      <TextInput
                        style={bs.fareInput}
                        placeholder="Your offer (e.g. 2500)"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="numeric"
                        value={proposedFare}
                        onChangeText={setProposedFare}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={bs.dateField}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Calendar size={16} color={colors.text.secondary} />
                      <Text style={bs.dateText}>{dateLabel}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Passenger stepper (hidden for motorbike) */}
                  {(mode !== "request" || vehicleType !== "MOTORBIKE") && (
                    <View style={bs.paxField}>
                      <TouchableOpacity
                        onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                        disabled={passengers <= 1}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={passengers <= 1 ? colors.text.tertiary : colors.primary} />
                      </TouchableOpacity>
                      <View style={bs.paxCenter}>
                        <Users size={14} color={colors.text.secondary} />
                        <Text style={bs.paxCount}>{passengers}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setPassengers((p) => Math.min(MAX_PASSENGERS, p + 1))}
                        disabled={passengers >= MAX_PASSENGERS}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={passengers >= MAX_PASSENGERS ? colors.text.tertiary : colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Action button */}
                <TouchableOpacity
                  style={bs.actionBtn}
                  onPress={mode === "request" ? handleRequestRide : handleFindRides}
                  activeOpacity={0.8}
                >
                  <Text style={bs.actionText}>
                    {mode === "request" ? "Request Ride" : "Search Rides"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Recent destinations placeholder */}
            {!destinationLocation && (
              <View style={bs.recentSection}>
                <Text style={bs.recentLabel}>RECENT</Text>
                <Text style={bs.recentEmpty}>
                  Your recent destinations will appear here
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        <LocationPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(loc) => setDestinationLocation(loc)}
          mode="addresses"
          title="Where are you going?"
        />
      </>
    );
  }
);

HomeBottomSheet.displayName = "HomeBottomSheet";
export { HomeBottomSheet };

const bs = StyleSheet.create({
  background: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  handle: {
    backgroundColor: colors.border,
    width: 40,
    height: 4,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  // Vehicle tabs
  vehicleTabs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  vehicleTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  vehicleTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  vehicleTabDisabled: {
    opacity: 0.4,
  },
  vehicleIcon: {
    fontSize: 20,
  },
  vehicleIconActive: {},
  vehicleLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  vehicleLabelActive: {
    fontWeight: "600",
    color: colors.primary,
  },
  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  destDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  destText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.text.primary,
  },
  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  modeTextActive: {
    color: colors.text.inverse,
  },
  // Fields
  fieldsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  fareField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  dateField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  paxField: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paxCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  paxCount: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text.primary,
  },
  // Action button
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text.inverse,
  },
  // Recent destinations
  recentSection: {
    gap: spacing.sm,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  recentEmpty: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
});
```

- [ ] **Step 2: Commit the bottom sheet component**

```bash
git add mobile/src/components/HomeBottomSheet.tsx
git commit -m "feat: add HomeBottomSheet component with vehicle tabs, mode toggle, and ride request flow"
```

- [ ] **Step 3: Rewrite the home screen**

Rewrite `mobile/src/app/(drawer)/index.tsx`:

```typescript
import React, { useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation } from "expo-router";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { Menu, Locate } from "lucide-react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { HomeBottomSheet } from "@/components/HomeBottomSheet";
import { colors } from "@/lib/theme";

const HARARE_REGION = {
  latitude: -17.8292,
  longitude: 31.0522,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

// Fake nearby drivers for visual effect — replace with real data later
const NEARBY_DRIVERS = [
  { id: "d1", latitude: -17.826, longitude: 31.049, type: "CAR" as const },
  { id: "d2", latitude: -17.832, longitude: 31.056, type: "CAR" as const },
  { id: "d3", latitude: -17.828, longitude: 31.053, type: "MOTORBIKE" as const },
  { id: "d4", latitude: -17.834, longitude: 31.048, type: "CAR" as const },
];

export default function HomeScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { location, address, refetch } = useCurrentLocation();

  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : HARARE_REGION;

  function centerOnUser() {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
    refetch();
  }

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
      >
        {/* Nearby driver markers */}
        {NEARBY_DRIVERS.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
            title={driver.type === "CAR" ? "Car" : "Moto"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Text style={{ fontSize: 24 }}>
              {driver.type === "CAR" ? "🚙" : "🏍"}
            </Text>
          </Marker>
        ))}
      </MapView>

      {/* Pickup location bubble */}
      {address && (
        <View style={s.pickupBubble}>
          <View style={s.pickupContent}>
            <Text style={s.pickupLabel}>Pickup point</Text>
            <Text style={s.pickupAddress} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>
      )}

      {/* Hamburger menu button */}
      <TouchableOpacity
        style={s.hamburgerBtn}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.8}
      >
        <Menu size={22} color={colors.text.primary} />
      </TouchableOpacity>

      {/* GPS re-center button */}
      <TouchableOpacity
        style={s.gpsBtn}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <Locate size={20} color={colors.text.primary} />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <HomeBottomSheet ref={bottomSheetRef} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Pickup bubble
  pickupBubble: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pickupContent: {
    gap: 2,
  },
  pickupLabel: {
    fontSize: 10,
    color: "#999",
  },
  pickupAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  // Floating buttons
  hamburgerBtn: {
    position: "absolute",
    top: 56,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gpsBtn: {
    position: "absolute",
    bottom: 210,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
```

- [ ] **Step 4: Run the app and verify**

```bash
cd mobile && npx expo start
```

Expected: Map loads full-screen, hamburger opens the drawer, GPS button re-centers, bottom sheet swipes up/down, vehicle tabs switch, destination picker opens, mode toggle works, action button submits.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/"(drawer)"/index.tsx
git commit -m "feat: rebuild home screen with full-screen map, bottom sheet, and floating controls"
```

---

### Task 5: Clean Up Old SearchCard and Update Imports

The old `SearchCard` component is no longer used on the home screen. Its logic has been absorbed into `HomeBottomSheet`. Remove or keep for reference — but update any remaining imports.

**Files:**
- Modify: `mobile/src/components/SearchCard.tsx` (keep file, but it's no longer imported by home)

- [ ] **Step 1: Verify no other screen imports SearchCard**

```bash
cd mobile && grep -r "SearchCard" src/ --include="*.tsx" --include="*.ts"
```

If only `(drawer)/index.tsx` (the old home) imported it and we've already rewritten that file, no changes needed. If other files import it, leave the component in place.

- [ ] **Step 2: Remove the old NotificationBell import from home if still present**

The new home screen doesn't use `NotificationBell` directly (it's in the drawer header area or notifications route). Verify the rewritten `index.tsx` compiles clean.

- [ ] **Step 3: Commit if any cleanup was done**

```bash
git add -A mobile/src/
git commit -m "chore: clean up unused imports after home screen redesign"
```

---

### Task 6: Update Status Bar for Map Screen

The map screen needs a light status bar (white text) since the map can be dark. Other screens keep the dark status bar.

**Files:**
- Modify: `mobile/src/app/_layout.tsx`
- Already handled: `mobile/src/app/(drawer)/index.tsx` (sets `StatusBar style="dark"`)

- [ ] **Step 1: Update root layout status bar to auto**

In `mobile/src/app/_layout.tsx`, change:
```typescript
// From:
<StatusBar style="dark" />
// To:
<StatusBar style="auto" />
```

This lets individual screens override the status bar style. The home screen sets `style="dark"` (since the map background varies), and other screens inherit the default.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/_layout.tsx
git commit -m "fix: set status bar to auto for map screen compatibility"
```

---

### Task 7: Verify Full Flow End-to-End

- [ ] **Step 1: Test the following flows manually**

1. **App launch** → Map loads, current location detected, pickup bubble shows street name
2. **Hamburger menu** → Opens drawer with: My Rides, Post a Ride, Rent a Car, Hire a Driver, Chat, Profile
3. **Drawer → Rent a Car** → Opens rental browse screen
4. **Drawer → Hire a Driver** → Opens chauffeur browse screen
5. **Drawer → My Rides** → Shows rides list
6. **Drawer → Chat** → Shows messages
7. **Drawer → Profile** → Shows profile
8. **Vehicle tabs** → Car/Moto switch works, Bus shows "Coming soon"
9. **Search bar tap** → Location picker opens
10. **Select destination** → Sheet expands, mode toggle appears
11. **Request a Ride** → Enter fare + passengers → "Request Ride" → navigates to ride-request screen
12. **Find a Ride** → Pick date + passengers → "Search Rides" → navigates to search results
13. **GPS button** → Map re-centers on current location
14. **Swipe bottom sheet** → Collapses/expands smoothly

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A mobile/src/
git commit -m "feat: complete InDrive-style home screen with map, bottom sheet, and drawer navigation"
```
