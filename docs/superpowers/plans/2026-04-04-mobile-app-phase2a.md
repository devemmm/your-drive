# YourDrive Mobile App — Phase 2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rentals, chauffeur services, real-time chat, profile management, and my rides to the mobile app — completing the core feature set.

**Architecture:** Follows Phase 1 patterns: hooks for data fetching (TanStack React Query), Expo Router file-based navigation, Socket.IO for real-time chat. Each feature gets its own route group, hook file, and screen components.

**Tech Stack:** React Native, Expo Router, TanStack React Query, Socket.IO Client, Lucide icons, existing UI components (Button, Input, Card, Avatar, Badge, StarRating).

**Spec reference:** `docs/superpowers/specs/2026-04-03-mobile-app-design.md`

---

## File Structure

```
mobile/src/
├── hooks/
│   ├── useRentals.ts          # NEW — rental CRUD + state transitions
│   ├── useChauffeur.ts        # NEW — chauffeur CRUD + state transitions
│   ├── useChat.ts             # NEW — threads, messages, socket events
│   └── useBookings.ts         # NEW — my bookings list
├── app/
│   ├── (tabs)/
│   │   ├── rides.tsx           # MODIFY — full my rides/bookings list
│   │   ├── chat.tsx            # MODIFY — full chat thread list
│   │   └── profile.tsx         # MODIFY — full profile with settings
│   ├── rental/
│   │   ├── _layout.tsx         # NEW — rental stack
│   │   ├── index.tsx           # NEW — browse available vehicles
│   │   └── [id].tsx            # NEW — rental details + booking
│   ├── chauffeur/
│   │   ├── _layout.tsx         # NEW — chauffeur stack
│   │   ├── index.tsx           # NEW — browse available drivers
│   │   └── [id].tsx            # NEW — chauffeur details + booking
│   ├── chat/
│   │   └── [threadId].tsx      # NEW — chat messages screen
│   └── vehicle/
│       ├── index.tsx           # NEW — my vehicles list
│       ├── add.tsx             # NEW — add vehicle form
│       └── [id].tsx            # NEW — edit vehicle
├── components/
│   ├── RentalCard.tsx          # NEW — rental vehicle card
│   ├── ChauffeurCard.tsx       # NEW — chauffeur driver card
│   ├── ChatThreadItem.tsx      # NEW — chat thread list item
│   ├── MessageBubble.tsx       # NEW — chat message bubble
│   └── ChatInput.tsx           # NEW — chat text input with send
└── lib/
    ├── types.ts                # MODIFY — add missing rental/chauffeur types
    └── constants.ts            # MODIFY — add rental/chauffeur/chat query keys
```

---

## Task 1: Add Rental & Chauffeur Types and Query Keys

**Files:**
- Modify: `mobile/src/lib/types.ts`
- Modify: `mobile/src/lib/constants.ts`

- [ ] **Step 1: Add rental and chauffeur types to types.ts**

Add after the existing `D2DBookingRequest` interface:

```typescript
export type RentalStatus = "REQUESTED" | "APPROVED" | "DECLINED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type RentalType = "HOURLY" | "DAILY";
export type FuelPolicy = "FULL_TO_FULL" | "SAME_LEVEL";

export interface CarRental {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  renterId: string;
  renter: User;
  ownerId: string;
  owner: User;
  rentalType: RentalType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  securityDeposit: number;
  status: RentalStatus;
  fuelPolicy: FuelPolicy;
  mileageLimit: number | null;
  createdAt: string;
}

export interface RentalVehicleListing {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  category: VehicleCategory;
  images: Asset[];
  defaultImage: string | null;
  rentalHourlyRate: number | null;
  rentalDailyRate: number | null;
  capacity: number;
  owner: User;
}

export type ChauffeurStatus = "REQUESTED" | "ACCEPTED" | "DECLINED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type ChauffeurServiceType = "HOURLY" | "DAILY";

export interface ChauffeurService {
  id: string;
  driverId: string;
  driver: User;
  clientId: string;
  client: User;
  serviceType: ChauffeurServiceType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: ChauffeurStatus;
  vehicle: Vehicle | null;
  createdAt: string;
}

export interface ChauffeurDriverListing {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  averageRating: number | null;
  totalRides: number;
  chauffeurHourlyRate: number | null;
  chauffeurDailyRate: number | null;
  chauffeurDescription: string | null;
  vehicles: Vehicle[];
}
```

- [ ] **Step 2: Add query keys to constants.ts**

Add to the `queryKeys` object:

```typescript
  rentals: {
    available: (params?: Record<string, unknown>) => ["rentals", "available", params] as const,
    mine: ["rentals", "mine"] as const,
    detail: (id: string) => ["rentals", id] as const,
  },
  chauffeur: {
    drivers: (params?: Record<string, unknown>) => ["chauffeur", "drivers", params] as const,
    mine: ["chauffeur", "mine"] as const,
    detail: (id: string) => ["chauffeur", id] as const,
  },
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/types.ts mobile/src/lib/constants.ts
git commit -m "feat(mobile): add rental, chauffeur types and query keys"
```

---

## Task 2: Rental Hooks

**Files:**
- Create: `mobile/src/hooks/useRentals.ts`

- [ ] **Step 1: Create useRentals hook**

```typescript
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, CarRental, RentalVehicleListing } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useAvailableRentals(params?: { city?: string; category?: string; minPrice?: number; maxPrice?: number }) {
  return useQuery({
    queryKey: queryKeys.rentals.available(params as Record<string, unknown>),
    queryFn: () => api.get<PaginatedResponse<RentalVehicleListing>>("/public/rentals/vehicles/available", params as Record<string, unknown>),
  });
}

export function useMyRentals() {
  return useQuery({
    queryKey: queryKeys.rentals.mine,
    queryFn: () => api.get<PaginatedResponse<CarRental>>("/rentals"),
  });
}

export function useCreateRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { vehicleId: string; rentalType: string; startDate: string; endDate: string }) =>
      api.post<ApiResponse<CarRental>>("/rentals", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useApproveRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) => api.patch(`/rentals/${rentalId}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useDeclineRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) => api.patch(`/rentals/${rentalId}/decline`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useCancelRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) => api.patch(`/rentals/${rentalId}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useCompleteRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rentalId: string) => api.patch(`/rentals/${rentalId}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useRentals.ts
git commit -m "feat(mobile): add rental hooks (available, create, approve, decline, cancel, complete)"
```

---

## Task 3: Chauffeur Hooks

**Files:**
- Create: `mobile/src/hooks/useChauffeur.ts`

- [ ] **Step 1: Create useChauffeur hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, ChauffeurService, ChauffeurDriverListing } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useAvailableDrivers(params?: { city?: string; minRate?: number; maxRate?: number }) {
  return useQuery({
    queryKey: queryKeys.chauffeur.drivers(params as Record<string, unknown>),
    queryFn: () => api.get<PaginatedResponse<ChauffeurDriverListing>>("/public/chauffeur-drivers", params as Record<string, unknown>),
  });
}

export function useMyChauffeurServices() {
  return useQuery({
    queryKey: queryKeys.chauffeur.mine,
    queryFn: () => api.get<PaginatedResponse<ChauffeurService>>("/chauffeur-services"),
  });
}

export function useCreateChauffeurService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { driverId: string; serviceType: string; startDate: string; endDate: string }) =>
      api.post<ApiResponse<ChauffeurService>>("/chauffeur-services", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur.mine }); },
  });
}

export function useAcceptChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.patch(`/chauffeur-services/${serviceId}/accept`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur.mine }); },
  });
}

export function useDeclineChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.patch(`/chauffeur-services/${serviceId}/decline`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur.mine }); },
  });
}

export function useCancelChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.patch(`/chauffeur-services/${serviceId}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur.mine }); },
  });
}

export function useCompleteChauffeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.patch(`/chauffeur-services/${serviceId}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.chauffeur.mine }); },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useChauffeur.ts
git commit -m "feat(mobile): add chauffeur hooks (drivers, create, accept, decline, cancel, complete)"
```

---

## Task 4: Chat Hook

**Files:**
- Create: `mobile/src/hooks/useChat.ts`

- [ ] **Step 1: Create useChat hook with socket integration**

```typescript
import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, ChatThread, ChatMessage } from "@/lib/types";
import { queryKeys } from "@/lib/constants";
import { useSocketContext } from "@/providers/SocketProvider";

export function useChatThreads() {
  return useQuery({
    queryKey: queryKeys.chat.threads,
    queryFn: () => api.get<PaginatedResponse<ChatThread>>("/chat/threads"),
  });
}

export function useChatMessages(threadId: string) {
  return useQuery({
    queryKey: queryKeys.chat.messages(threadId),
    queryFn: () => api.get<PaginatedResponse<ChatMessage>>(`/chat/threads/${threadId}/messages`),
    enabled: !!threadId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      api.post(`/chat/threads/${threadId}/messages`, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads });
    },
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => api.post(`/chat/threads/${threadId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads });
    },
  });
}

export function useChatSocket(threadId: string | null) {
  const { socket } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !threadId) return;

    socket.emit("join_thread", { threadId });

    const onNewMessage = (message: ChatMessage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads });
    };

    const onMessageUpdated = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) });
    };

    const onMessageDeleted = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) });
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);

    return () => {
      socket.emit("leave_thread", { threadId });
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
    };
  }, [socket, threadId, queryClient]);

  const sendViaSocket = useCallback((content: string) => {
    if (!socket || !threadId) return;
    socket.emit("send_message", { threadId, content });
  }, [socket, threadId]);

  return { sendViaSocket };
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useChat.ts
git commit -m "feat(mobile): add chat hooks with Socket.IO real-time integration"
```

---

## Task 5: Bookings Hook

**Files:**
- Create: `mobile/src/hooks/useBookings.ts`

- [ ] **Step 1: Create useBookings hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, Booking } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.bookings.mine,
    queryFn: () => api.get<PaginatedResponse<Booking>>("/bookings"),
  });
}

export function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: () => api.get<ApiResponse<Booking>>(`/bookings/${bookingId}`),
    select: (data) => data.data,
    enabled: !!bookingId,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useBookings.ts
git commit -m "feat(mobile): add bookings hooks (list, detail, cancel)"
```

---

## Task 6: Rental Screens

**Files:**
- Create: `mobile/src/app/rental/_layout.tsx`
- Create: `mobile/src/app/rental/index.tsx`
- Create: `mobile/src/app/rental/[id].tsx`
- Create: `mobile/src/components/RentalCard.tsx`
- Modify: `mobile/src/app/_layout.tsx` — add rental route

- [ ] **Step 1: Create RentalCard component**

```tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Star, Car } from "lucide-react-native";
import { RentalVehicleListing } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

export function RentalCard({ vehicle }: { vehicle: RentalVehicleListing }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/rental/${vehicle.id}`)}>
      <Card style={rc.card}>
        {vehicle.defaultImage ? (
          <Image source={{ uri: vehicle.defaultImage }} style={rc.image} contentFit="cover" />
        ) : (
          <View style={rc.imagePlaceholder}><Car size={40} color={colors.text.tertiary} /></View>
        )}
        <View style={rc.info}>
          <Text style={rc.name}>{vehicle.make} {vehicle.model} ({vehicle.year})</Text>
          <View style={rc.ownerRow}>
            <Avatar firstName={vehicle.owner.firstName} lastName={vehicle.owner.lastName} imageUrl={vehicle.owner.profileImage} size={24} />
            <Text style={rc.ownerName}>{vehicle.owner.firstName}</Text>
            {vehicle.owner.averageRating && (
              <View style={rc.ratingRow}><Star size={12} color={colors.star} fill={colors.star} /><Text style={rc.rating}>{vehicle.owner.averageRating.toFixed(1)}</Text></View>
            )}
          </View>
          <View style={rc.priceRow}>
            <Badge label={vehicle.category} variant="muted" />
            <Text style={rc.price}>
              {vehicle.rentalDailyRate ? `${formatCurrency(vehicle.rentalDailyRate)}/day` : `${formatCurrency(vehicle.rentalHourlyRate || 0)}/hr`}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card: { gap: spacing.md, padding: 0, overflow: "hidden" },
  image: { width: "100%", height: 160, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl },
  imagePlaceholder: { width: "100%", height: 160, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  info: { padding: spacing.lg, gap: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ownerName: { fontSize: fontSize.sm, color: colors.text.secondary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  rating: { fontSize: fontSize.xs, color: colors.text.secondary },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
});
```

- [ ] **Step 2: Create rental layout, browse, and detail screens**

Create `mobile/src/app/rental/_layout.tsx`:
```tsx
import React from "react";
import { Stack } from "expo-router";
export default function RentalLayout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /><Stack.Screen name="[id]" /></Stack>;
}
```

Create `mobile/src/app/rental/index.tsx` — browse available rental vehicles with a FlatList of RentalCard components, back button, and loading state. Uses `useAvailableRentals()`.

Create `mobile/src/app/rental/[id].tsx` — rental detail screen showing vehicle info, owner info, pricing (hourly/daily), and a "Request Rental" button. Uses `useCreateRental()`.

- [ ] **Step 3: Add rental route to root layout**

In `mobile/src/app/_layout.tsx`, add inside the Stack:
```tsx
<Stack.Screen name="rental" options={{ presentation: "card" }} />
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/rental/ mobile/src/components/RentalCard.tsx mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add rental browse and detail screens"
```

---

## Task 7: Chauffeur Screens

**Files:**
- Create: `mobile/src/app/chauffeur/_layout.tsx`
- Create: `mobile/src/app/chauffeur/index.tsx`
- Create: `mobile/src/app/chauffeur/[id].tsx`
- Create: `mobile/src/components/ChauffeurCard.tsx`
- Modify: `mobile/src/app/_layout.tsx` — add chauffeur route

- [ ] **Step 1: Create ChauffeurCard component**

```tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Star } from "lucide-react-native";
import { ChauffeurDriverListing } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { colors, fontSize, spacing } from "@/lib/theme";

export function ChauffeurCard({ driver }: { driver: ChauffeurDriverListing }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/chauffeur/${driver.id}`)}>
      <Card style={cc.card}>
        <Avatar firstName={driver.firstName} lastName={driver.lastName} imageUrl={driver.profileImage} size={56} />
        <View style={cc.info}>
          <Text style={cc.name}>{driver.firstName} {driver.lastName}</Text>
          <View style={cc.ratingRow}>
            <Star size={14} color={colors.star} fill={colors.star} />
            <Text style={cc.rating}>{driver.averageRating?.toFixed(1) || "New"} · {driver.totalRides} rides</Text>
          </View>
          {driver.chauffeurDescription && <Text style={cc.desc} numberOfLines={2}>{driver.chauffeurDescription}</Text>}
          <Text style={cc.price}>
            {driver.chauffeurDailyRate ? `${formatCurrency(driver.chauffeurDailyRate)}/day` : `${formatCurrency(driver.chauffeurHourlyRate || 0)}/hr`}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  info: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: fontSize.sm, color: colors.text.secondary },
  desc: { fontSize: fontSize.sm, color: colors.text.tertiary },
  price: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
});
```

- [ ] **Step 2: Create chauffeur layout, browse, and detail screens**

Same pattern as rental: `_layout.tsx`, `index.tsx` (browse with FlatList + ChauffeurCard), `[id].tsx` (detail with "Request Service" button).

- [ ] **Step 3: Add chauffeur route to root layout**

```tsx
<Stack.Screen name="chauffeur" options={{ presentation: "card" }} />
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/chauffeur/ mobile/src/components/ChauffeurCard.tsx mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add chauffeur browse and detail screens"
```

---

## Task 8: Chat Screens

**Files:**
- Create: `mobile/src/components/ChatThreadItem.tsx`
- Create: `mobile/src/components/MessageBubble.tsx`
- Create: `mobile/src/components/ChatInput.tsx`
- Create: `mobile/src/app/chat/_layout.tsx`
- Create: `mobile/src/app/chat/[threadId].tsx`
- Modify: `mobile/src/app/(tabs)/chat.tsx` — full thread list

- [ ] **Step 1: Create chat components**

`ChatThreadItem.tsx` — shows avatar, participant name, last message preview, unread count badge, timestamp. Tappable → navigates to `/chat/{threadId}`.

`MessageBubble.tsx` — sent (right-aligned, green bg) vs received (left-aligned, gray bg) with message text, timestamp, and read receipt.

`ChatInput.tsx` — text input with send button (SendHorizontal icon from Lucide). Calls `onSend(text)` prop.

- [ ] **Step 2: Create chat thread list (tabs/chat.tsx)**

Replace the placeholder with a full screen using `useChatThreads()`, FlatList of ChatThreadItem components, empty state when no threads.

- [ ] **Step 3: Create chat messages screen**

Create `mobile/src/app/chat/_layout.tsx` and `mobile/src/app/chat/[threadId].tsx`.

The messages screen uses `useChatMessages(threadId)`, `useChatSocket(threadId)` for real-time updates, FlatList (inverted) of MessageBubble components, ChatInput at bottom, and `useMarkThreadRead()` on mount.

- [ ] **Step 4: Add chat route to root layout**

```tsx
<Stack.Screen name="chat" options={{ presentation: "card" }} />
```

Note: this is a separate `chat/[threadId]` route from the `(tabs)/chat` tab.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ChatThreadItem.tsx mobile/src/components/MessageBubble.tsx mobile/src/components/ChatInput.tsx mobile/src/app/chat/ mobile/src/app/(tabs)/chat.tsx mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add real-time chat with thread list and message screen"
```

---

## Task 9: My Rides Tab

**Files:**
- Modify: `mobile/src/app/(tabs)/rides.tsx` — full rides/bookings list

- [ ] **Step 1: Build my rides screen**

Replace the placeholder with a full screen showing:
- Two sections via segment control: "As Passenger" (my bookings) and "As Driver" (my posted rides)
- "As Passenger" uses `useMyBookings()` — shows ride cards with booking status badge
- "As Driver" uses `useMyRides()` — shows posted ride cards with ride status badge
- Each card tappable → navigates to ride detail
- Empty states for each section
- Uses FlatList with status-colored Badge components

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(tabs)/rides.tsx
git commit -m "feat(mobile): add My Rides tab with passenger bookings and driver rides"
```

---

## Task 10: Profile Screen

**Files:**
- Modify: `mobile/src/app/(tabs)/profile.tsx` — full profile management

- [ ] **Step 1: Build profile screen**

Replace the placeholder with a full profile screen showing:
- Profile header: Avatar (large, 80px), name, email, rating stars, member since
- Menu sections using Card components:
  - **Account**: Edit Profile, My Vehicles (→ `/vehicle`), Payment Methods
  - **Services**: My Rentals (→ rental list), My Chauffeur Services (→ chauffeur list)
  - **Preferences**: Language toggle (EN/RW using i18n), Notifications
  - **Support**: Help Center, Terms of Service
  - **Sign Out** button (destructive variant)
- Each menu item is a TouchableOpacity row with icon (Lucide), label, and ChevronRight
- Sign out calls `signOut()` from `useAuthContext()`

Icons to use: `UserPen`, `Car`, `CreditCard`, `Key`, `UserCheck`, `Globe`, `BellRing`, `HelpCircle`, `FileText`, `LogOut`, `ChevronRight`

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(tabs)/profile.tsx
git commit -m "feat(mobile): add full Profile screen with settings menu"
```

---

## Task 11: Vehicle Management Screens

**Files:**
- Create: `mobile/src/app/vehicle/index.tsx` — my vehicles list
- Create: `mobile/src/app/vehicle/add.tsx` — add vehicle form
- Modify: `mobile/src/app/vehicle/[id].tsx` — edit vehicle (create if doesn't exist)

- [ ] **Step 1: Create vehicle list screen**

Shows user's vehicles using `useMyVehicles()`. Each vehicle card shows image, make/model, plate, capacity. "Add Vehicle" FAB button navigates to `/vehicle/add`.

- [ ] **Step 2: Create add vehicle form**

Multi-field form: make, model, year, color, license plate, capacity, category (dropdown). Image upload via `expo-image-picker`. Submit calls `useCreateVehicle()`.

- [ ] **Step 3: Create edit vehicle screen**

Similar to add but pre-populated. Additional sections for rental settings (hourly/daily rates, availability toggle) and chauffeur settings.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/vehicle/
git commit -m "feat(mobile): add vehicle management screens (list, add, edit)"
```

---

## Task 12: Home Screen — Marketplace Links

**Files:**
- Modify: `mobile/src/app/(tabs)/index.tsx` — add rental/chauffeur quick links

- [ ] **Step 1: Add service cards below search**

Add a horizontal scroll section between SearchCard and "Your Upcoming Rides" with two service cards:
- "Rent a Car" card with Car icon → navigates to `/rental`
- "Hire a Driver" card with UserCheck icon → navigates to `/chauffeur`

Each card is a TouchableOpacity with an icon, title, and short description, styled with the primary green accent.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/(tabs)/index.tsx
git commit -m "feat(mobile): add rental and chauffeur quick links to home screen"
```

---

## Task 13: Final Wiring & Verification

- [ ] **Step 1: Verify TypeScript compiles**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

- [ ] **Step 2: Verify all routes are registered**

Check that `_layout.tsx` has all route groups: `(auth)`, `(tabs)`, `onboarding`, `ride`, `post-ride`, `vehicle`, `rental`, `chauffeur`, `chat`.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "feat(mobile): Phase 2A complete — rentals, chauffeur, chat, profile, vehicles"
```

---

## Verification

1. Start backend: `docker compose up -d`
2. Start mobile: `cd mobile && npx expo start --ios`
3. Test flows:
   - Home → tap "Rent a Car" → see rental listings
   - Home → tap "Hire a Driver" → see chauffeur drivers
   - Chat tab → see thread list (empty if no threads)
   - Rides tab → switch between "As Passenger" / "As Driver"
   - Profile tab → see full menu, tap "My Vehicles" → vehicle list
   - Profile → Sign Out → returns to welcome screen
