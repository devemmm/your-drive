# YourDrive Mobile App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working React Native + Expo mobile app with authentication, ride search/booking/tracking, ride posting (driver), and navigation — consuming the existing Express.js backend.

**Architecture:** Standalone `/mobile` directory using Expo SDK 52 with Expo Router v4 file-based navigation. Axios + TanStack React Query for data fetching (same patterns as web client). JWT tokens stored in expo-secure-store.

**Tech Stack:** React Native, Expo SDK 52, Expo Router v4, TanStack React Query, Axios, React Native Maps (Google), Socket.IO Client, Stripe React Native, expo-secure-store, expo-auth-session, react-native-reanimated, Zod, i18next, Jest + React Native Testing Library.

**Design reference:** Pencil file at `/Users/adrianmaenzanise/Documents/designs/your-drive.pen` — 8 screens defining the visual language (green primary, white backgrounds, rounded cards).

**Spec reference:** `docs/superpowers/specs/2026-04-03-mobile-app-design.md`

---

## File Structure

```
mobile/
├── app.config.ts
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env.example
├── assets/
│   ├── images/
│   │   ├── welcome-illustration.png
│   │   └── icon.png
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── _layout.tsx                    # Root layout — providers, auth gate
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx                # Auth stack layout
│   │   │   ├── welcome.tsx                # Welcome/splash screen
│   │   │   ├── login.tsx                  # Login screen
│   │   │   ├── register.tsx               # Registration screen
│   │   │   └── forgot-password.tsx        # Password reset
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx                # Bottom tab navigator
│   │   │   ├── index.tsx                  # Home tab
│   │   │   ├── rides.tsx                  # My rides tab
│   │   │   ├── post.tsx                   # Post a ride tab
│   │   │   ├── chat.tsx                   # Chat tab (placeholder Phase 2)
│   │   │   └── profile.tsx                # Profile tab (placeholder Phase 2)
│   │   ├── onboarding/
│   │   │   ├── _layout.tsx                # Onboarding stack
│   │   │   ├── passenger.tsx              # Passenger setup
│   │   │   └── verify-phone.tsx           # Phone OTP verification
│   │   ├── ride/
│   │   │   ├── _layout.tsx                # Ride stack
│   │   │   ├── search-results.tsx         # Search results list
│   │   │   ├── [id].tsx                   # Ride details + booking
│   │   │   ├── [id]/
│   │   │   │   ├── active.tsx             # Active ride tracking
│   │   │   │   └── complete.tsx           # Ride completion + rating
│   │   ├── post-ride/
│   │   │   ├── _layout.tsx                # Post ride stack
│   │   │   └── index.tsx                  # Multi-step post ride form
│   │   └── vehicle/
│   │       ├── _layout.tsx                # Vehicle stack
│   │       ├── index.tsx                  # My vehicles list
│   │       ├── add.tsx                    # Add vehicle
│   │       └── [id].tsx                   # Edit vehicle
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── StarRating.tsx
│   │   │   ├── LoadingIndicator.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Toast.tsx
│   │   ├── SearchCard.tsx
│   │   ├── RideResultCard.tsx
│   │   ├── FilterBar.tsx
│   │   ├── BookingSummary.tsx
│   │   ├── RideMap.tsx
│   │   ├── ActiveRideMap.tsx
│   │   ├── PostRideForm/
│   │   │   ├── RouteStep.tsx
│   │   │   ├── VehicleStep.tsx
│   │   │   ├── PreferencesStep.tsx
│   │   │   ├── PricingStep.tsx
│   │   │   └── ReviewStep.tsx
│   │   └── NetworkBanner.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useRides.ts
│   │   ├── useBookings.ts
│   │   ├── useD2D.ts
│   │   ├── useVehicles.ts
│   │   ├── useTransactions.ts
│   │   ├── useNotifications.ts
│   │   └── useNetwork.ts
│   ├── services/
│   │   ├── api.ts                         # Axios client with interceptors
│   │   ├── auth.ts                        # Token storage + retrieval
│   │   └── socket.ts                      # Socket.IO client
│   ├── providers/
│   │   ├── AuthProvider.tsx               # Auth context + state
│   │   ├── QueryProvider.tsx              # React Query setup
│   │   └── SocketProvider.tsx             # Socket.IO context
│   ├── lib/
│   │   ├── types.ts                       # TypeScript interfaces
│   │   ├── constants.ts                   # App constants, query keys
│   │   ├── utils.ts                       # Helpers (formatCurrency, formatDate, etc.)
│   │   └── theme.ts                       # Colors, spacing, typography
│   └── translations/
│       ├── i18n.ts                        # i18next config
│       ├── en.json                        # English
│       └── rw.json                        # Kinyarwanda
├── __tests__/
│   ├── services/
│   │   ├── api.test.ts
│   │   └── auth.test.ts
│   ├── hooks/
│   │   ├── useAuth.test.ts
│   │   ├── useRides.test.ts
│   │   └── useBookings.test.ts
│   ├── components/
│   │   ├── Button.test.tsx
│   │   ├── SearchCard.test.tsx
│   │   └── RideResultCard.test.tsx
│   └── screens/
│       ├── login.test.tsx
│       └── home.test.tsx
```

---

## Task 1: Scaffold Expo Project & Install Dependencies

**Files:**
- Create: `mobile/` (entire scaffold)
- Create: `mobile/package.json` (auto-generated, then modified)
- Create: `mobile/.env.example`

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
npx create-expo-app@latest mobile --template blank-typescript
```

Expected: New `mobile/` directory with Expo SDK project.

- [ ] **Step 2: Install core dependencies**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile

# Navigation
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-screens react-native-safe-area-context

# Data fetching
npm install @tanstack/react-query axios

# Maps
npx expo install react-native-maps

# Auth
npx expo install expo-secure-store expo-auth-session expo-crypto expo-apple-authentication expo-web-browser

# Payments
npx expo install @stripe/stripe-react-native

# Real-time
npm install socket.io-client

# UI & Animation
npx expo install react-native-reanimated react-native-gesture-handler expo-image @shopify/flash-list

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# i18n
npm install i18next react-i18next expo-localization

# Notifications
npx expo install expo-notifications expo-device

# Utils
npm install date-fns
```

- [ ] **Step 3: Install dev dependencies**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npm install -D @testing-library/react-native @testing-library/jest-native jest-expo @types/react
```

- [ ] **Step 4: Create .env.example**

```bash
# File: mobile/.env.example
```

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
```

- [ ] **Step 5: Add mobile to root .gitignore if needed, then commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
echo ".superpowers/" >> .gitignore
git add mobile/ .gitignore
git commit -m "feat(mobile): scaffold Expo SDK 52 project with dependencies"
```

---

## Task 2: App Configuration

**Files:**
- Create: `mobile/app.config.ts`
- Modify: `mobile/tsconfig.json`
- Modify: `mobile/babel.config.js`
- Create: `mobile/src/lib/theme.ts`

- [ ] **Step 1: Create app.config.ts**

```typescript
// mobile/app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "YourDrive",
  slug: "your-drive",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "yourdrive",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.yourdrive.app",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "YourDrive needs your location to find rides near you.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "YourDrive needs your location to track your ride in real-time.",
    },
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.yourdrive.app",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    "expo-localization",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#22C55E",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.yourdrive.app",
        enableGooglePay: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
```

- [ ] **Step 2: Configure TypeScript with path aliases**

Update `mobile/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 3: Configure Babel for reanimated**

Update `mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};
```

- [ ] **Step 4: Create theme constants**

```typescript
// mobile/src/lib/theme.ts
export const colors = {
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primaryLight: "#DCFCE7",
  background: "#FFFFFF",
  surface: "#F9FAFB",
  text: {
    primary: "#111827",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
    inverse: "#FFFFFF",
  },
  border: "#E5E7EB",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
  star: "#FBBF24",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  title: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
```

- [ ] **Step 5: Commit**

```bash
git add mobile/app.config.ts mobile/tsconfig.json mobile/babel.config.js mobile/src/lib/theme.ts
git commit -m "feat(mobile): configure app.config.ts, TypeScript, Babel, and theme"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `mobile/src/lib/types.ts`
- Create: `mobile/src/lib/constants.ts`

- [ ] **Step 1: Create shared types**

These mirror the server's Prisma models and the web client's types at `client/src/lib/types.ts`.

```typescript
// mobile/src/lib/types.ts

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  isVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  isPassengerOnboarded: boolean;
  isDriverOnboarded: boolean;
  averageRating: number | null;
  totalRides: number;
  stripeConnectId: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  capacity: number;
  category: VehicleCategory;
  images: Asset[];
  defaultImage: string | null;
  isAvailableForRental: boolean;
  isAvailableForChauffeur: boolean;
  rentalHourlyRate: number | null;
  rentalDailyRate: number | null;
  chauffeurHourlyRate: number | null;
  chauffeurDailyRate: number | null;
  createdAt: string;
}

export type VehicleCategory = "CAR" | "MOTORBIKE" | "VAN" | "BUS";

export interface Asset {
  id: string;
  url: string;
  publicId: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string | null;
}

export interface Ride {
  id: string;
  driverId: string;
  driver: User;
  vehicle: Vehicle;
  origin: Location;
  destination: Location;
  stopovers: Location[];
  departureDate: string;
  departureTime: string;
  estimatedArrivalTime: string | null;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  status: RideStatus;
  rideType: "P2P" | "D2D";
  bookingType: "AUTOMATIC" | "MANUAL";
  contributionCollection: "VIA_PLATFORM" | "DIRECT";
  preferences: RidePreferences;
  bookings: Booking[];
  createdAt: string;
}

export type RideStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "BLOCKED";

export interface RidePreferences {
  airConditioning: boolean;
  noSmoking: boolean;
  petsAllowed: boolean;
  ladiesOnly: boolean;
  gentsOnly: boolean;
  bicycleSupport: boolean;
  luggageSize: "SMALL" | "MEDIUM" | "LARGE";
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  passenger: User;
  seats: number;
  status: BookingStatus;
  totalAmount: number;
  attendanceCode: string | null;
  createdAt: string;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface D2DBookingRequest {
  id: string;
  rideId: string;
  passengerId: string;
  passenger: User;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: "POSTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  detourKm: number | null;
  detourMinutes: number | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  type: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  rideId: string | null;
  participants: User[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  sender: User;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  type: "RIDE" | "RENTAL" | "CHAUFFEUR";
  createdAt: string;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search params
export interface RideSearchParams {
  originCity?: string;
  destinationCity?: string;
  departureDate?: string;
  passengers?: number;
  rideType?: "P2P" | "D2D";
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

// Auth types
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  referralCode?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}
```

- [ ] **Step 2: Create constants**

```typescript
// mobile/src/lib/constants.ts

export const queryKeys = {
  user: {
    profile: ["user", "profile"] as const,
    single: (id: string) => ["user", id] as const,
  },
  rides: {
    public: (params?: Record<string, unknown>) =>
      ["rides", "public", params] as const,
    search: (params?: Record<string, unknown>) =>
      ["rides", "search", params] as const,
    mine: ["rides", "mine"] as const,
    detail: (id: string) => ["rides", id] as const,
  },
  bookings: {
    mine: ["bookings", "mine"] as const,
    detail: (id: string) => ["bookings", id] as const,
  },
  d2d: {
    requests: (rideId: string) => ["d2d", "requests", rideId] as const,
  },
  vehicles: {
    mine: ["vehicles", "mine"] as const,
    detail: (id: string) => ["vehicles", id] as const,
  },
  chat: {
    threads: ["chat", "threads"] as const,
    messages: (threadId: string) => ["chat", "messages", threadId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    detail: (id: string) => ["transactions", id] as const,
  },
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "yourdrive_auth_token",
  USER_ROLE: "yourdrive_user_role",
  LANGUAGE: "yourdrive_language",
} as const;

export const RIDE_PREFERENCE_ICONS: Record<string, string> = {
  airConditioning: "snowflake",
  noSmoking: "cigarette-off",
  petsAllowed: "paw-print",
  ladiesOnly: "user",
  gentsOnly: "user",
  bicycleSupport: "bike",
  luggageSize: "luggage",
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/types.ts mobile/src/lib/constants.ts
git commit -m "feat(mobile): add TypeScript types and constants"
```

---

## Task 4: API Client Service

**Files:**
- Create: `mobile/src/services/api.ts`
- Create: `mobile/src/services/auth.ts`
- Create: `mobile/__tests__/services/api.test.ts`
- Create: `mobile/__tests__/services/auth.test.ts`

- [ ] **Step 1: Write tests for auth service**

```typescript
// mobile/__tests__/services/auth.test.ts
import * as SecureStore from "expo-secure-store";
import { authStorage } from "@/services/auth";
import { STORAGE_KEYS } from "@/lib/constants";

jest.mock("expo-secure-store");

describe("authStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves token to secure store", async () => {
    await authStorage.setToken("test-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEYS.AUTH_TOKEN,
      "test-token"
    );
  });

  it("retrieves token from secure store", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("test-token");
    const token = await authStorage.getToken();
    expect(token).toBe("test-token");
  });

  it("removes token from secure store", async () => {
    await authStorage.removeToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      STORAGE_KEYS.AUTH_TOKEN
    );
  });

  it("returns null when no token exists", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const token = await authStorage.getToken();
    expect(token).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx jest __tests__/services/auth.test.ts --no-cache
```

Expected: FAIL — module `@/services/auth` not found.

- [ ] **Step 3: Implement auth storage service**

```typescript
// mobile/src/services/auth.ts
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/lib/constants";

export const authStorage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  },
};
```

- [ ] **Step 4: Implement API client**

```typescript
// mobile/src/services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authStorage } from "./auth";
import i18next from "i18next";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.params = {
      ...config.params,
      lang: i18next.language || "en",
    };
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await authStorage.removeToken();
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    apiClient.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((res) => res.data),

  upload: <T>(url: string, formData: FormData) =>
    apiClient
      .post<T>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),
};

export default apiClient;
```

- [ ] **Step 5: Run tests and verify they pass, then commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx jest __tests__/services/auth.test.ts --no-cache
git add src/services/ __tests__/services/
git commit -m "feat(mobile): add API client and auth storage services"
```

---

## Task 5: Auth Provider & Context

**Files:**
- Create: `mobile/src/providers/AuthProvider.tsx`
- Create: `mobile/src/providers/QueryProvider.tsx`
- Create: `mobile/src/hooks/useAuth.ts`
- Create: `mobile/src/hooks/useUser.ts`

- [ ] **Step 1: Create Query Provider**

```tsx
// mobile/src/providers/QueryProvider.tsx
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export { queryClient };
```

- [ ] **Step 2: Create useAuth hook**

```typescript
// mobile/src/hooks/useAuth.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { authStorage } from "@/services/auth";
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "@/lib/types";

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post<AuthResponse>("/auth/login", payload),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post<AuthResponse>("/auth/register", payload),
  });
}

export function useGoogleAuth() {
  return useMutation({
    mutationFn: (idToken: string) =>
      api.post<AuthResponse>("/auth/google/mobile", { idToken }),
  });
}

export function useAppleAuth() {
  return useMutation({
    mutationFn: (payload: { identityToken: string; fullName?: string }) =>
      api.post<AuthResponse>("/auth/apple", payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post("/auth/forgot-password", { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) =>
      api.post("/auth/reset-password", payload),
  });
}
```

- [ ] **Step 3: Create useUser hook**

```typescript
// mobile/src/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, User } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: () => api.get<ApiResponse<User>>("/users/profile"),
    enabled,
    select: (data) => data.data,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => api.upload("/users/update", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
  });
}

export function useAddPhone() {
  return useMutation({
    mutationFn: (phoneNumber: string) =>
      api.post("/users/add-phone", { phoneNumber }),
  });
}

export function useVerifyPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api.post("/users/verify-phone", { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
  });
}
```

- [ ] **Step 4: Create Auth Provider**

```tsx
// mobile/src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { authStorage } from "@/services/auth";
import { useCurrentUser } from "@/hooks/useUser";
import { User } from "@/lib/types";
import { queryClient } from "./QueryProvider";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  const {
    data: user,
    isLoading: isLoadingUser,
  } = useCurrentUser(!!token);

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, []);

  async function loadToken() {
    const storedToken = await authStorage.getToken();
    setToken(storedToken);
    setIsLoadingToken(false);
  }

  async function handleAppStateChange(state: AppStateStatus) {
    if (state === "active" && token) {
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    }
  }

  async function signIn(newToken: string) {
    await authStorage.setToken(newToken);
    setToken(newToken);
  }

  async function signOut() {
    await authStorage.removeToken();
    setToken(null);
    queryClient.clear();
  }

  const isLoading = isLoadingToken || (!!token && isLoadingUser);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/providers/ mobile/src/hooks/useAuth.ts mobile/src/hooks/useUser.ts
git commit -m "feat(mobile): add auth provider, query provider, and auth/user hooks"
```

---

## Task 6: i18n Setup

**Files:**
- Create: `mobile/src/translations/i18n.ts`
- Create: `mobile/src/translations/en.json`
- Create: `mobile/src/translations/rw.json`

- [ ] **Step 1: Create i18n config**

```typescript
// mobile/src/translations/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./en.json";
import rw from "./rw.json";

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rw: { translation: rw },
  },
  lng: deviceLanguage === "rw" ? "rw" : "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

- [ ] **Step 2: Create English translations**

```json
// mobile/src/translations/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "search": "Search",
    "noResults": "No results found",
    "seeAll": "See All",
    "offline": "No internet connection"
  },
  "auth": {
    "welcome": "Share rides. Save money. Travel together.",
    "login": "Log In",
    "signUp": "Sign Up",
    "welcomeBack": "Welcome Back",
    "signInContinue": "Sign in to continue",
    "createAccount": "Create Account",
    "signUpGetStarted": "Sign up to get started with YourDrive",
    "email": "Email address",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "firstName": "First Name",
    "lastName": "Last Name",
    "referralCode": "Referral Code (optional)",
    "forgotPassword": "Forgot Password?",
    "continueWith": "or continue with",
    "continueGoogle": "Continue with Google",
    "continueApple": "Continue with Apple",
    "noAccount": "Don't have an account?",
    "haveAccount": "Already have an account?",
    "agreeTerms": "I agree to the Terms & Conditions",
    "forgotPasswordTitle": "Forgot Password",
    "forgotPasswordDesc": "Enter your email to receive a reset link",
    "sendResetLink": "Send Reset Link",
    "resetSent": "Reset link sent to your email"
  },
  "home": {
    "greeting": "Hello, {{name}}",
    "whereHeading": "Where are you heading today?",
    "whereGoing": "Where are you going?",
    "from": "From: Current location",
    "to": "To: Enter destination",
    "today": "Today",
    "passengers": "{{count}} Passenger",
    "passengers_plural": "{{count}} Passengers",
    "searchRides": "Search Rides",
    "upcomingRides": "Your Upcoming Rides",
    "perSeat": "per seat"
  },
  "rides": {
    "ridesFound": "{{count}} rides found",
    "p2p": "P2P",
    "d2d": "D2D",
    "price": "Price",
    "time": "Time",
    "prefs": "Prefs",
    "seatsLeft": "{{count}} seats left",
    "seatLeft": "{{count}} seat left",
    "rideDetails": "Ride Details",
    "memberSince": "Member since {{date}}",
    "pricePerSeat": "Price per seat",
    "platformFee": "Platform fee",
    "total": "Total",
    "bookThisRide": "Book This Ride",
    "rideInProgress": "Ride in Progress",
    "arriving": "Arriving in {{minutes}} min",
    "attendanceCode": "Your Seat Attendance Code",
    "chatDriver": "Chat",
    "callDriver": "Call Driver",
    "reportIssue": "Report Issue",
    "rideCompleted": "Ride Completed!",
    "paymentSummary": "Payment Summary",
    "amountPaid": "Amount paid",
    "paymentMethod": "Payment method",
    "transactionId": "Transaction ID",
    "howWasRide": "How was your ride with {{name}}?",
    "leaveComment": "Leave a comment (optional)",
    "submitReview": "Submit Review",
    "skip": "Skip"
  },
  "post": {
    "postRide": "Post a Ride",
    "route": "Route",
    "vehicle": "Vehicle",
    "preferences": "Preferences",
    "pricing": "Pricing",
    "review": "Review",
    "origin": "Origin",
    "destination": "Destination",
    "departureDate": "Departure Date",
    "departureTime": "Departure Time",
    "selectVehicle": "Select Vehicle",
    "availableSeats": "Available Seats",
    "pricePerSeatLabel": "Price per Seat (RWF)",
    "bookingType": "Booking Type",
    "automatic": "Automatic",
    "manual": "Manual Approval",
    "publishRide": "Publish Ride"
  },
  "tabs": {
    "home": "Home",
    "rides": "Rides",
    "post": "Post",
    "chat": "Chat",
    "profile": "Profile"
  }
}
```

- [ ] **Step 3: Create Kinyarwanda translations (starter)**

```json
// mobile/src/translations/rw.json
{
  "common": {
    "loading": "Gutegereza...",
    "error": "Habaye ikosa",
    "retry": "Ongera ugerageze",
    "cancel": "Hagarika",
    "confirm": "Emeza",
    "save": "Bika",
    "delete": "Siba",
    "edit": "Hindura",
    "back": "Subira inyuma",
    "next": "Komeza",
    "done": "Byarangiye",
    "search": "Shakisha",
    "noResults": "Nta bisubizo bibonetse",
    "seeAll": "Reba byose",
    "offline": "Nta murandasi"
  },
  "auth": {
    "welcome": "Sangira ingendo. Bungabunga amafaranga. Twegere hamwe.",
    "login": "Injira",
    "signUp": "Iyandikishe",
    "welcomeBack": "Murakaza neza",
    "signInContinue": "Injira kugirango ukomeze",
    "createAccount": "Fungura konti",
    "email": "Aderesi imeri",
    "password": "Ijambo ry'ibanga",
    "forgotPassword": "Wibagiwe ijambo ry'ibanga?"
  },
  "tabs": {
    "home": "Ahabanza",
    "rides": "Ingendo",
    "post": "Tanga",
    "chat": "Ubutumwa",
    "profile": "Umwirondoro"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/translations/
git commit -m "feat(mobile): add i18n setup with English and Kinyarwanda translations"
```

---

## Task 7: UI Component Library

**Files:**
- Create: `mobile/src/components/ui/Button.tsx`
- Create: `mobile/src/components/ui/Input.tsx`
- Create: `mobile/src/components/ui/Card.tsx`
- Create: `mobile/src/components/ui/Avatar.tsx`
- Create: `mobile/src/components/ui/Badge.tsx`
- Create: `mobile/src/components/ui/StarRating.tsx`
- Create: `mobile/src/components/ui/LoadingIndicator.tsx`
- Create: `mobile/src/components/ui/Toast.tsx`
- Create: `mobile/src/components/NetworkBanner.tsx`
- Create: `mobile/src/lib/utils.ts`

- [ ] **Step 1: Create utility functions**

```typescript
// mobile/src/lib/utils.ts
import { format, parseISO } from "date-fns";

export function formatCurrency(amount: number, currency = "RWF"): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDate(dateString: string, fmt = "EEE, dd MMM yyyy"): string {
  return format(parseISO(dateString), fmt);
}

export function formatTime(timeString: string): string {
  return timeString.substring(0, 5);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
```

- [ ] **Step 2: Create Button component**

```tsx
// mobile/src/components/ui/Button.tsx
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors, borderRadius, fontSize, spacing } from "@/lib/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? colors.primary : colors.text.inverse}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text`],
              styles[`size_${size}_text`],
              icon ? { marginLeft: spacing.sm } : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  destructive: {
    backgroundColor: colors.error,
  },
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    height: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: "600",
  },
  primaryText: {
    color: colors.text.inverse,
  } as TextStyle,
  secondaryText: {
    color: colors.primary,
  } as TextStyle,
  destructiveText: {
    color: colors.text.inverse,
  } as TextStyle,
  size_sm_text: {
    fontSize: fontSize.sm,
  },
  size_md_text: {
    fontSize: fontSize.md,
  },
  size_lg_text: {
    fontSize: fontSize.lg,
  },
});
```

- [ ] **Step 3: Create Input component**

```tsx
// mobile/src/components/ui/Input.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { colors, borderRadius, fontSize, spacing } from "@/lib/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  icon,
  rightIcon,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.text.tertiary}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.icon}
          >
            <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  icon: {
    marginRight: spacing.sm,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 4: Create Card, Avatar, Badge, StarRating, LoadingIndicator, Toast, and NetworkBanner**

```tsx
// mobile/src/components/ui/Card.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, borderRadius, spacing } from "@/lib/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
```

```tsx
// mobile/src/components/ui/Avatar.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors, fontSize } from "@/lib/theme";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  size?: number;
}

export function Avatar({ firstName, lastName, imageUrl, size = 40 }: AvatarProps) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(firstName, lastName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.primary,
    fontWeight: "700",
  },
});
```

```tsx
// mobile/src/components/ui/Badge.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, borderRadius, fontSize, spacing } from "@/lib/theme";

interface BadgeProps {
  label: string;
  variant?: "primary" | "outline" | "muted";
}

export function Badge({ label, variant = "primary" }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  primary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  primaryText: {
    color: colors.primary,
  },
  outlineText: {
    color: colors.text.secondary,
  },
  mutedText: {
    color: colors.text.secondary,
  },
});
```

```tsx
// mobile/src/components/ui/StarRating.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "@/lib/theme";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 24,
  interactive = false,
  onRate,
}: StarRatingProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.round(rating);
        const star = (
          <View
            key={i}
            style={[
              styles.star,
              {
                width: size,
                height: size,
                backgroundColor: filled ? colors.star : colors.surface,
                borderRadius: 4,
              },
            ]}
          />
        );

        if (interactive && onRate) {
          return (
            <TouchableOpacity key={i} onPress={() => onRate(i + 1)}>
              {star}
            </TouchableOpacity>
          );
        }
        return star;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  star: {
    alignItems: "center",
    justifyContent: "center",
  },
});
```

```tsx
// mobile/src/components/ui/LoadingIndicator.tsx
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

interface LoadingIndicatorProps {
  fullScreen?: boolean;
  size?: "small" | "large";
}

export function LoadingIndicator({
  fullScreen = false,
  size = "large",
}: LoadingIndicatorProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={colors.primary} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={colors.primary} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
```

```tsx
// mobile/src/components/NetworkBanner.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, fontSize, spacing } from "@/lib/theme";

export function NetworkBanner({ isConnected }: { isConnected: boolean }) {
  if (isConnected) return null;

  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t("common.offline")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  text: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ mobile/src/lib/utils.ts
git commit -m "feat(mobile): add UI component library (Button, Input, Card, Avatar, Badge, StarRating, etc.)"
```

---

## Task 8: Root Layout & Navigation Shell

**Files:**
- Create: `mobile/src/app/_layout.tsx`
- Create: `mobile/src/app/(auth)/_layout.tsx`
- Create: `mobile/src/app/(tabs)/_layout.tsx`
- Create: `mobile/src/app/ride/_layout.tsx`
- Create: `mobile/src/app/onboarding/_layout.tsx`
- Create: `mobile/src/app/post-ride/_layout.tsx`
- Create: `mobile/src/app/vehicle/_layout.tsx`

- [ ] **Step 1: Create root layout with providers and auth gate**

```tsx
// mobile/src/app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "@/translations/i18n";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen
              name="ride"
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="post-ride"
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="vehicle"
              options={{ presentation: "card" }}
            />
          </Stack>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Create auth stack layout**

```tsx
// mobile/src/app/(auth)/_layout.tsx
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuthContext } from "@/providers/AuthProvider";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) return <LoadingIndicator fullScreen />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

- [ ] **Step 3: Create tabs layout**

```tsx
// mobile/src/app/(tabs)/_layout.tsx
import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { colors, fontSize } from "@/lib/theme";

export default function TabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const { t } = useTranslation();

  if (isLoading) return <LoadingIndicator fullScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;
  if (user && !user.isPassengerOnboarded) return <Redirect href="/onboarding/passenger" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: "600",
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          height: 80,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => null, // Lucide icons added in polish
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: t("tabs.rides"),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: t("tabs.post"),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => null,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Create remaining stack layouts**

```tsx
// mobile/src/app/ride/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function RideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="search-results" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

```tsx
// mobile/src/app/onboarding/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="passenger" />
      <Stack.Screen name="verify-phone" />
    </Stack>
  );
}
```

```tsx
// mobile/src/app/post-ride/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function PostRideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

```tsx
// mobile/src/app/vehicle/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function VehicleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/
git commit -m "feat(mobile): add root layout, auth/tabs/ride navigation structure"
```

---

## Task 9: Welcome & Login Screens

**Files:**
- Create: `mobile/src/app/(auth)/welcome.tsx`
- Create: `mobile/src/app/(auth)/login.tsx`

- [ ] **Step 1: Create Welcome screen**

```tsx
// mobile/src/app/(auth)/welcome.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>YourDrive</Text>
        <Text style={styles.tagline}>{t("auth.welcome")}</Text>
      </View>

      <View style={styles.buttons}>
        <Button
          title={t("auth.login")}
          variant="secondary"
          onPress={() => router.push("/(auth)/login")}
          style={{ flex: 1 }}
        />
        <Button
          title={t("auth.signUp")}
          onPress={() => router.push("/(auth)/register")}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  logo: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.primary,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
```

- [ ] **Step 2: Create Login screen**

```tsx
// mobile/src/app/(auth)/login.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/hooks/useAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { colors, fontSize, spacing } from "@/lib/theme";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuthContext();
  const loginMutation = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginForm) {
    try {
      const response = await loginMutation.mutateAsync(data);
      await signIn(response.token);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("common.error")
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
            <Text style={styles.subtitle}>{t("auth.signInContinue")}</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.email")}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.password")}
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  error={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
            </TouchableOpacity>

            <Button
              title={t("auth.login")}
              onPress={handleSubmit(onSubmit)}
              loading={loginMutation.isPending}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.continueWith")}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title={t("auth.continueGoogle")}
              variant="secondary"
              onPress={() => {
                // Google auth implementation in Task 11
              }}
            />

            {Platform.OS === "ios" && (
              <Button
                title={t("auth.continueApple")}
                variant="secondary"
                onPress={() => {
                  // Apple auth implementation in Task 11
                }}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("auth.noAccount")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>{t("auth.signUp")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  forgotLink: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingTop: spacing.xxl,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "600",
  },
});
```

- [ ] **Step 3: Verify app compiles**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx expo start --clear
```

Press `q` to quit after verifying no compilation errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(auth)/
git commit -m "feat(mobile): add Welcome and Login screens"
```

---

## Task 10: Register & Forgot Password Screens

**Files:**
- Create: `mobile/src/app/(auth)/register.tsx`
- Create: `mobile/src/app/(auth)/forgot-password.tsx`

- [ ] **Step 1: Create Register screen**

```tsx
// mobile/src/app/(auth)/register.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/hooks/useAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { colors, fontSize, spacing } from "@/lib/theme";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuthContext();
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
    },
  });

  async function onSubmit(data: RegisterForm) {
    try {
      const response = await registerMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        referralCode: data.referralCode || undefined,
      });
      await signIn(response.token);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("common.error")
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("auth.createAccount")}</Text>
            <Text style={styles.subtitle}>{t("auth.signUpGetStarted")}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      placeholder={t("auth.firstName")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.firstName?.message}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      placeholder={t("auth.lastName")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.lastName?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.email")}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.password")}
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.confirmPassword")}
                  value={value}
                  onChangeText={onChange}
                  isPassword
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="referralCode"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t("auth.referralCode")}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            <Button
              title={t("auth.createAccount")}
              onPress={handleSubmit(onSubmit)}
              loading={registerMutation.isPending}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("auth.haveAccount")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>{t("auth.login")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  nameRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingTop: spacing.xxl,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Create Forgot Password screen**

```tsx
// mobile/src/app/(auth)/forgot-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForgotPassword } from "@/hooks/useAuth";
import { colors, fontSize, spacing } from "@/lib/theme";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const forgotMutation = useForgotPassword();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: { email: string }) {
    try {
      await forgotMutation.mutateAsync(data.email);
      setSent(true);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("common.error")
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t("auth.forgotPasswordTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.forgotPasswordDesc")}</Text>

          {sent ? (
            <View style={styles.sentBox}>
              <Text style={styles.sentText}>{t("auth.resetSent")}</Text>
              <Button
                title={t("auth.login")}
                onPress={() => router.replace("/(auth)/login")}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    placeholder={t("auth.email")}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email?.message}
                  />
                )}
              />
              <Button
                title={t("auth.sendResetLink")}
                onPress={handleSubmit(onSubmit)}
                loading={forgotMutation.isPending}
              />
            </View>
          )}

          <Button
            title={t("common.back")}
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.lg,
  },
  sentBox: {
    gap: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  sentText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "500",
    textAlign: "center",
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(auth)/register.tsx mobile/src/app/(auth)/forgot-password.tsx
git commit -m "feat(mobile): add Register and Forgot Password screens"
```

---

## Task 11: Google & Apple OAuth

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`
- Create: `mobile/src/hooks/useGoogleSignIn.ts`
- Create: `mobile/src/hooks/useAppleSignIn.ts`

- [ ] **Step 1: Create Google Sign-In hook**

```typescript
// mobile/src/hooks/useGoogleSignIn.ts
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { useGoogleAuth } from "./useAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const { signIn } = useAuthContext();
  const googleAuthMutation = useGoogleAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleAuth(id_token);
    }
  }, [response]);

  async function handleGoogleAuth(idToken: string) {
    try {
      const result = await googleAuthMutation.mutateAsync(idToken);
      await signIn(result.token);
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Google sign-in failed");
    }
  }

  return {
    promptAsync,
    isReady: !!request,
    isLoading: googleAuthMutation.isPending,
  };
}
```

- [ ] **Step 2: Create Apple Sign-In hook**

```typescript
// mobile/src/hooks/useAppleSignIn.ts
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform, Alert } from "react-native";
import { useAppleAuth } from "./useAuth";
import { useAuthContext } from "@/providers/AuthProvider";

export function useAppleSignIn() {
  const { signIn } = useAuthContext();
  const appleAuthMutation = useAppleAuth();

  async function promptAsync() {
    if (Platform.OS !== "ios") return;

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received");
      }

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim()
        : undefined;

      const result = await appleAuthMutation.mutateAsync({
        identityToken: credential.identityToken,
        fullName: fullName || undefined,
      });

      await signIn(result.token);
    } catch (error: any) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", error?.response?.data?.message || "Apple sign-in failed");
      }
    }
  }

  return {
    promptAsync,
    isAvailable: Platform.OS === "ios",
    isLoading: appleAuthMutation.isPending,
  };
}
```

- [ ] **Step 3: Update Login screen to wire up OAuth buttons**

In `mobile/src/app/(auth)/login.tsx`, replace the two placeholder OAuth button `onPress` handlers:

For Google button:
```tsx
// Add imports at top:
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useAppleSignIn } from "@/hooks/useAppleSignIn";

// Inside LoginScreen function, add:
const { promptAsync: googlePrompt, isLoading: googleLoading } = useGoogleSignIn();
const { promptAsync: applePrompt, isAvailable: appleAvailable, isLoading: appleLoading } = useAppleSignIn();

// Replace Google button:
<Button
  title={t("auth.continueGoogle")}
  variant="secondary"
  onPress={() => googlePrompt()}
  loading={googleLoading}
/>

// Replace Apple button:
{appleAvailable && (
  <Button
    title={t("auth.continueApple")}
    variant="secondary"
    onPress={() => applePrompt()}
    loading={appleLoading}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useGoogleSignIn.ts mobile/src/hooks/useAppleSignIn.ts mobile/src/app/(auth)/login.tsx
git commit -m "feat(mobile): add Google and Apple OAuth sign-in"
```

---

## Task 12: Home Screen

**Files:**
- Create: `mobile/src/app/(tabs)/index.tsx`
- Create: `mobile/src/components/SearchCard.tsx`

- [ ] **Step 1: Create SearchCard component**

```tsx
// mobile/src/components/SearchCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

export function SearchCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("Today");
  const [passengers, setPassengers] = useState(1);

  function handleSearch() {
    router.push({
      pathname: "/ride/search-results",
      params: {
        originCity: origin || undefined,
        destinationCity: destination || undefined,
        departureDate: date === "Today" ? new Date().toISOString().split("T")[0] : date,
        passengers: passengers.toString(),
      },
    });
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{t("home.whereGoing")}</Text>

      <TouchableOpacity style={styles.locationRow}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Text style={styles.locationText}>{origin || t("home.from")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.locationRow}>
        <View style={[styles.dot, { backgroundColor: colors.error }]} />
        <Text style={styles.locationText}>{destination || t("home.to")}</Text>
      </TouchableOpacity>

      <View style={styles.metaRow}>
        <TouchableOpacity style={styles.metaItem}>
          <Text style={styles.metaText}>{date}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.metaItem}>
          <Text style={styles.metaText}>
            {t("home.passengers", { count: passengers })}
          </Text>
        </TouchableOpacity>
      </View>

      <Button title={t("home.searchRides")} onPress={handleSearch} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaItem: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});
```

- [ ] **Step 2: Create Home screen**

```tsx
// mobile/src/app/(tabs)/index.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useUser";
import { SearchCard } from "@/components/SearchCard";
import { Avatar } from "@/components/ui/Avatar";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthContext();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t("home.greeting", { name: user?.firstName })}
            </Text>
            <Text style={styles.subtitle}>{t("home.whereHeading")}</Text>
          </View>
          <Avatar
            firstName={user?.firstName || ""}
            lastName={user?.lastName || ""}
            imageUrl={user?.profileImage}
            size={40}
          />
        </View>

        <SearchCard />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.upcomingRides")}</Text>
          {/* Upcoming rides will be populated by useRides hook */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
});
```

- [ ] **Step 3: Create placeholder tab screens**

```tsx
// mobile/src/app/(tabs)/rides.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function RidesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
});
```

```tsx
// mobile/src/app/(tabs)/post.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function PostScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Post a Ride</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
});
```

```tsx
// mobile/src/app/(tabs)/chat.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Chat</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
});
```

```tsx
// mobile/src/app/(tabs)/profile.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const { signOut, user } = useAuthContext();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Button title="Sign Out" variant="destructive" onPress={signOut} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  name: { fontSize: fontSize.lg, color: colors.text.secondary },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(tabs)/ mobile/src/components/SearchCard.tsx
git commit -m "feat(mobile): add Home screen with SearchCard and placeholder tabs"
```

---

## Task 13: Ride Hooks & Search Results

**Files:**
- Create: `mobile/src/hooks/useRides.ts`
- Create: `mobile/src/hooks/useBookings.ts`
- Create: `mobile/src/components/RideResultCard.tsx`
- Create: `mobile/src/components/FilterBar.tsx`
- Create: `mobile/src/app/ride/search-results.tsx`

- [ ] **Step 1: Create useRides hook**

```typescript
// mobile/src/hooks/useRides.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, Ride, RideSearchParams } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function usePublicRides(params: RideSearchParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.rides.search(params),
    queryFn: ({ pageParam = 1 }) =>
      api.get<PaginatedResponse<Ride>>("/public/rides/search", {
        ...params,
        page: pageParam,
        limit: 10,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useRideDetail(rideId: string) {
  return useQuery({
    queryKey: queryKeys.rides.detail(rideId),
    queryFn: () => api.get<ApiResponse<Ride>>(`/public/rides/${rideId}`),
    select: (data) => data.data,
    enabled: !!rideId,
  });
}

export function useMyRides() {
  return useQuery({
    queryKey: queryKeys.rides.mine,
    queryFn: () => api.get<PaginatedResponse<Ride>>("/rides"),
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<ApiResponse<Ride>>("/rides", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine });
    },
  });
}

export function useBookRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, seats }: { rideId: string; seats: number }) =>
      api.post(`/rides/${rideId}/book`, { seats }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
    },
  });
}

export function usePublishRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string) => api.patch(`/rides/${rideId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine });
    },
  });
}
```

- [ ] **Step 2: Create RideResultCard component**

```tsx
// mobile/src/components/RideResultCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Ride } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/utils";
import { colors, fontSize, spacing } from "@/lib/theme";

interface RideResultCardProps {
  ride: Ride;
}

export function RideResultCard({ ride }: RideResultCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push(`/ride/${ride.id}`)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.driverInfo}>
            <Avatar
              firstName={ride.driver.firstName}
              lastName={ride.driver.lastName}
              imageUrl={ride.driver.profileImage}
              size={40}
            />
            <View>
              <Text style={styles.driverName}>
                {ride.driver.firstName} {ride.driver.lastName.charAt(0)}.
              </Text>
              <Text style={styles.rating}>
                {ride.driver.averageRating?.toFixed(1) || "New"} · {ride.driver.totalRides} rides
              </Text>
            </View>
          </View>
          <Text style={styles.price}>{formatCurrency(ride.pricePerSeat)}</Text>
        </View>

        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(ride.departureTime)}</Text>
          <View style={styles.timeLine} />
          <Text style={styles.time}>{ride.estimatedArrivalTime ? formatTime(ride.estimatedArrivalTime) : "—"}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.seats}>
            {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} left
          </Text>
          <Badge label={ride.rideType} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  driverInfo: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  driverName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
  },
  rating: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.primary,
  },
  times: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  time: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seats: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});
```

- [ ] **Step 3: Create FilterBar and Search Results screen**

```tsx
// mobile/src/components/FilterBar.tsx
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { spacing } from "@/lib/theme";
import { TouchableOpacity } from "react-native";

interface FilterBarProps {
  activeType: "P2P" | "D2D";
  onTypeChange: (type: "P2P" | "D2D") => void;
}

export function FilterBar({ activeType, onTypeChange }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity onPress={() => onTypeChange("P2P")}>
        <Badge
          label="P2P"
          variant={activeType === "P2P" ? "primary" : "outline"}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onTypeChange("D2D")}>
        <Badge
          label="D2D"
          variant={activeType === "D2D" ? "primary" : "outline"}
        />
      </TouchableOpacity>
      <TouchableOpacity>
        <Badge label="Price" variant="outline" />
      </TouchableOpacity>
      <TouchableOpacity>
        <Badge label="Time" variant="outline" />
      </TouchableOpacity>
      <TouchableOpacity>
        <Badge label="Prefs" variant="outline" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
```

```tsx
// mobile/src/app/ride/search-results.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { usePublicRides } from "@/hooks/useRides";
import { RideResultCard } from "@/components/RideResultCard";
import { FilterBar } from "@/components/FilterBar";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Button } from "@/components/ui/Button";
import { Ride, RideSearchParams } from "@/lib/types";
import { colors, fontSize, spacing } from "@/lib/theme";
import { TouchableOpacity } from "react-native";

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{
    originCity?: string;
    destinationCity?: string;
    departureDate?: string;
    passengers?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [rideType, setRideType] = useState<"P2P" | "D2D">("P2P");

  const searchParams: RideSearchParams = {
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    departureDate: params.departureDate,
    passengers: params.passengers ? parseInt(params.passengers) : undefined,
    rideType,
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePublicRides(searchParams);

  const rides = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{"←"}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>
            {params.originCity || "Any"} → {params.destinationCity || "Any"}
          </Text>
          <Text style={styles.subtitle}>
            {params.departureDate} · {params.passengers || 1} passenger
          </Text>
        </View>
      </View>

      <FilterBar activeType={rideType} onTypeChange={setRideType} />

      <Text style={styles.count}>
        {t("rides.ridesFound", { count: rides.length })}
      </Text>

      {isLoading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlashList
          data={rides}
          renderItem={({ item }: { item: Ride }) => <RideResultCard ride={item} />}
          estimatedItemSize={150}
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? <LoadingIndicator /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  back: {
    fontSize: fontSize.xxl,
    color: colors.text.primary,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useRides.ts mobile/src/components/RideResultCard.tsx mobile/src/components/FilterBar.tsx mobile/src/app/ride/search-results.tsx
git commit -m "feat(mobile): add ride hooks, search results screen with FlashList"
```

---

## Task 14: Ride Details & Booking Screen

**Files:**
- Create: `mobile/src/app/ride/[id].tsx`
- Create: `mobile/src/components/BookingSummary.tsx`

- [ ] **Step 1: Create BookingSummary component**

```tsx
// mobile/src/components/BookingSummary.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "@/lib/utils";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

interface BookingSummaryProps {
  pricePerSeat: number;
  seats: number;
  platformFee: number;
}

export function BookingSummary({ pricePerSeat, seats, platformFee }: BookingSummaryProps) {
  const subtotal = pricePerSeat * seats;
  const total = subtotal + platformFee;

  return (
    <View style={styles.container}>
      <Row label="Price per seat" value={formatCurrency(pricePerSeat)} />
      <Row label="Seats" value={`x ${seats}`} />
      <Row label="Platform fee" value={formatCurrency(platformFee)} />
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.primary,
  },
});
```

- [ ] **Step 2: Create Ride Details screen**

```tsx
// mobile/src/app/ride/[id].tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRideDetail, useBookRide } from "@/hooks/useRides";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookingSummary } from "@/components/BookingSummary";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatDate, formatTime } from "@/lib/utils";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: ride, isLoading } = useRideDetail(id!);
  const bookMutation = useBookRide();

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  async function handleBook() {
    try {
      await bookMutation.mutateAsync({ rideId: ride!.id, seats: 1 });
      router.push(`/ride/${ride!.id}/active`);
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("common.error"));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t("rides.rideDetails")}</Text>
        </TouchableOpacity>

        {/* Driver Info */}
        <Card style={styles.driverCard}>
          <View style={styles.driverRow}>
            <Avatar
              firstName={ride.driver.firstName}
              lastName={ride.driver.lastName}
              imageUrl={ride.driver.profileImage}
              size={48}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>
                {ride.driver.firstName} {ride.driver.lastName.charAt(0)}.
              </Text>
              <Text style={styles.driverMeta}>
                {ride.driver.averageRating?.toFixed(1) || "New"} · {ride.driver.totalRides} rides
              </Text>
              <Text style={styles.driverMeta}>
                {t("rides.memberSince", { date: formatDate(ride.driver.createdAt, "MMM yyyy") })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Route */}
        <Card>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View>
              <Text style={styles.cityName}>{ride.origin.name}</Text>
              <Text style={styles.routeMeta}>
                {formatTime(ride.departureTime)} · {ride.origin.address}
              </Text>
            </View>
          </View>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <View>
              <Text style={styles.cityName}>{ride.destination.name}</Text>
              <Text style={styles.routeMeta}>
                {ride.estimatedArrivalTime ? formatTime(ride.estimatedArrivalTime) : ""} · Est. arrival
              </Text>
            </View>
          </View>
        </Card>

        {/* Vehicle */}
        <Card>
          <Text style={styles.vehicleText}>
            {ride.vehicle.make} {ride.vehicle.model} - {ride.vehicle.color}
          </Text>
          <Text style={styles.vehiclePlate}>{ride.vehicle.licensePlate}</Text>
        </Card>

        {/* Preferences */}
        <View style={styles.prefsRow}>
          {ride.preferences.airConditioning && <Badge label="AC" />}
          {ride.preferences.noSmoking && <Badge label="No Smoking" />}
          {ride.preferences.luggageSize && (
            <Badge label={`${ride.preferences.luggageSize} Luggage`} variant="outline" />
          )}
        </View>

        {/* Pricing */}
        <BookingSummary
          pricePerSeat={ride.pricePerSeat}
          seats={1}
          platformFee={350}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t("rides.bookThisRide")}
          onPress={handleBook}
          loading={bookMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  backBtn: { paddingVertical: spacing.sm },
  backText: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text.primary },
  driverCard: {},
  driverRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  driverName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  driverMeta: { fontSize: fontSize.xs, color: colors.text.secondary },
  routePoint: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", paddingVertical: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cityName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  routeMeta: { fontSize: fontSize.sm, color: colors.text.secondary },
  vehicleText: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehiclePlate: { fontSize: fontSize.sm, color: colors.text.secondary },
  prefsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/ride/\\[id\\].tsx mobile/src/components/BookingSummary.tsx
git commit -m "feat(mobile): add Ride Details screen with booking and pricing"
```

---

## Task 15: Active Ride & Ride Complete Screens

**Files:**
- Create: `mobile/src/app/ride/[id]/active.tsx`
- Create: `mobile/src/app/ride/[id]/complete.tsx`
- Create: `mobile/src/components/ActiveRideMap.tsx`

- [ ] **Step 1: Create ActiveRideMap component**

```tsx
// mobile/src/components/ActiveRideMap.tsx
import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Location } from "@/lib/types";
import { colors } from "@/lib/theme";

interface ActiveRideMapProps {
  origin: Location;
  destination: Location;
}

export function ActiveRideMap({ origin, destination }: ActiveRideMapProps) {
  const region = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 1.5 + 0.05,
    longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 1.5 + 0.05,
  };

  return (
    <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region}>
      <Marker
        coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
        title={origin.name}
        pinColor={colors.primary}
      />
      <Marker
        coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
        title={destination.name}
        pinColor={colors.error}
      />
      <Polyline
        coordinates={[
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude },
        ]}
        strokeWidth={3}
        strokeColor={colors.primary}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 350,
  },
});
```

- [ ] **Step 2: Create Active Ride screen**

```tsx
// mobile/src/app/ride/[id]/active.tsx
import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useRideDetail } from "@/hooks/useRides";
import { ActiveRideMap } from "@/components/ActiveRideMap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function ActiveRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: ride, isLoading } = useRideDetail(id!);

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  function handleCall() {
    if (ride?.driver.phoneNumber) {
      Linking.openURL(`tel:${ride.driver.phoneNumber}`);
    }
  }

  return (
    <View style={styles.container}>
      <ActiveRideMap origin={ride.origin} destination={ride.destination} />

      <View style={styles.sheet}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t("rides.rideInProgress")}</Text>
        </View>

        <View style={styles.driverRow}>
          <Avatar
            firstName={ride.driver.firstName}
            lastName={ride.driver.lastName}
            imageUrl={ride.driver.profileImage}
            size={40}
          />
          <View>
            <Text style={styles.driverName}>
              {ride.driver.firstName} {ride.driver.lastName.charAt(0)}.
            </Text>
            <Text style={styles.vehicleInfo}>
              {ride.vehicle.make} {ride.vehicle.model} · {ride.vehicle.licensePlate}
            </Text>
          </View>
        </View>

        <View style={styles.etaBox}>
          <Text style={styles.etaText}>{t("rides.arriving", { minutes: 45 })}</Text>
          <Text style={styles.routeText}>
            {ride.origin.name} → {ride.destination.name}
          </Text>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>{t("rides.attendanceCode")}</Text>
          <View style={styles.codeRow}>
            {"482731".split("").map((digit, i) => (
              <View key={i} style={styles.codeDigit}>
                <Text style={styles.codeDigitText}>{digit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={t("rides.chatDriver")}
            variant="secondary"
            size="md"
            onPress={() => {}}
            style={{ flex: 1 }}
          />
          <Button
            title={t("rides.callDriver")}
            variant="secondary"
            size="md"
            onPress={handleCall}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  driverRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  driverName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehicleInfo: { fontSize: fontSize.sm, color: colors.text.secondary },
  etaBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  etaText: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  routeText: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  codeSection: { alignItems: "center", gap: spacing.md },
  codeLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeDigit: {
    width: 40,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeDigitText: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  actions: { flexDirection: "row", gap: spacing.md },
});
```

- [ ] **Step 3: Create Ride Complete screen**

```tsx
// mobile/src/app/ride/[id]/complete.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useRideDetail } from "@/hooks/useRides";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function RideCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: ride, isLoading } = useRideDetail(id!);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const reviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      api.post(`/ratings`, {
        rideId: id,
        revieweeId: ride?.driverId,
        rating: data.rating,
        comment: data.comment || undefined,
        type: "RIDE",
      }),
  });

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  async function handleSubmit() {
    if (rating === 0) return;
    try {
      await reviewMutation.mutateAsync({ rating, comment });
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("common.error"));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>{t("rides.rideCompleted")}</Text>
        <Text style={styles.route}>
          {ride.origin.name} → {ride.destination.name}
        </Text>
        <Text style={styles.date}>{formatDate(ride.departureDate)}</Text>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("rides.paymentSummary")}</Text>
          <SummaryRow label={t("rides.amountPaid")} value={formatCurrency(ride.pricePerSeat + 350)} />
          <SummaryRow label={t("rides.paymentMethod")} value="Visa ····4242" />
          <SummaryRow label={t("rides.transactionId")} value={`TXN-${id?.substring(0, 6).toUpperCase()}`} />
        </Card>

        <Text style={styles.ratingPrompt}>
          {t("rides.howWasRide", { name: ride.driver.firstName })}
        </Text>
        <StarRating rating={rating} size={40} interactive onRate={setRating} />

        <TextInput
          style={styles.commentInput}
          placeholder={t("rides.leaveComment")}
          placeholderTextColor={colors.text.tertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <Button
          title={t("rides.submitReview")}
          onPress={handleSubmit}
          loading={reviewMutation.isPending}
          disabled={rating === 0}
        />
        <Button
          title={t("rides.skip")}
          variant="secondary"
          onPress={() => router.replace("/(tabs)")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={summaryStyles.value}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { fontSize: fontSize.sm, color: colors.text.secondary },
  value: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, alignItems: "center", gap: spacing.lg },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  checkmark: { fontSize: 32, color: colors.primary },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  route: { fontSize: fontSize.md, color: colors.text.secondary },
  date: { fontSize: fontSize.sm, color: colors.text.tertiary },
  summaryCard: { width: "100%" },
  summaryTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary, marginBottom: spacing.sm },
  ratingPrompt: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary, textAlign: "center" },
  commentInput: {
    width: "100%", borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    padding: spacing.lg, fontSize: fontSize.md, color: colors.text.primary,
    textAlignVertical: "top", minHeight: 80,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/ride/\\[id\\]/ mobile/src/components/ActiveRideMap.tsx
git commit -m "feat(mobile): add Active Ride and Ride Complete screens"
```

---

## Task 16: Post a Ride (Driver Flow)

**Files:**
- Create: `mobile/src/hooks/useVehicles.ts`
- Create: `mobile/src/app/post-ride/index.tsx`

- [ ] **Step 1: Create useVehicles hook**

```typescript
// mobile/src/hooks/useVehicles.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, Vehicle } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useMyVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.mine,
    queryFn: () => api.get<ApiResponse<Vehicle[]>>("/vehicles"),
    select: (data) => data.data,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => api.upload("/vehicles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
    },
  });
}
```

- [ ] **Step 2: Create Post a Ride screen (multi-step form)**

```tsx
// mobile/src/app/post-ride/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useCreateRide, usePublishRide } from "@/hooks/useRides";
import { useMyVehicles } from "@/hooks/useVehicles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";
import { TouchableOpacity } from "react-native";

type Step = "route" | "vehicle" | "preferences" | "pricing" | "review";
const STEPS: Step[] = ["route", "vehicle", "preferences", "pricing", "review"];

export default function PostRideScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const { data: vehicles, isLoading: vehiclesLoading } = useMyVehicles();
  const createRide = useCreateRide();
  const publishRide = usePublishRide();

  const [form, setForm] = useState({
    originName: "",
    originAddress: "",
    destinationName: "",
    destinationAddress: "",
    departureDate: "",
    departureTime: "",
    vehicleId: "",
    availableSeats: "1",
    pricePerSeat: "",
    bookingType: "AUTOMATIC" as "AUTOMATIC" | "MANUAL",
    rideType: "P2P" as "P2P" | "D2D",
    airConditioning: false,
    noSmoking: true,
    luggageSize: "MEDIUM" as "SMALL" | "MEDIUM" | "LARGE",
  });

  function updateForm(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else router.back();
  }

  async function handlePublish() {
    try {
      const response = await createRide.mutateAsync({
        originName: form.originName,
        originAddress: form.originAddress,
        destinationName: form.destinationName,
        destinationAddress: form.destinationAddress,
        departureDate: form.departureDate,
        departureTime: form.departureTime,
        vehicleId: form.vehicleId,
        availableSeats: parseInt(form.availableSeats),
        pricePerSeat: parseFloat(form.pricePerSeat),
        bookingType: form.bookingType,
        rideType: form.rideType,
        preferences: {
          airConditioning: form.airConditioning,
          noSmoking: form.noSmoking,
          luggageSize: form.luggageSize,
        },
      });
      const rideId = (response as any).data?.id;
      if (rideId) await publishRide.mutateAsync(rideId);
      router.replace("/(tabs)/rides");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("common.error"));
    }
  }

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevStep}>
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("post.postRide")}</Text>
        <Text style={styles.stepIndicator}>
          {currentStep + 1}/{STEPS.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === "route" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("post.route")}</Text>
            <Input
              placeholder={t("post.origin")}
              value={form.originName}
              onChangeText={(v) => updateForm("originName", v)}
            />
            <Input
              placeholder={t("post.destination")}
              value={form.destinationName}
              onChangeText={(v) => updateForm("destinationName", v)}
            />
            <Input
              placeholder={t("post.departureDate")}
              value={form.departureDate}
              onChangeText={(v) => updateForm("departureDate", v)}
            />
            <Input
              placeholder={t("post.departureTime")}
              value={form.departureTime}
              onChangeText={(v) => updateForm("departureTime", v)}
            />
          </View>
        )}

        {step === "vehicle" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("post.vehicle")}</Text>
            {vehiclesLoading ? (
              <LoadingIndicator />
            ) : (
              vehicles?.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => updateForm("vehicleId", v.id)}
                  style={[
                    styles.vehicleOption,
                    form.vehicleId === v.id && styles.vehicleSelected,
                  ]}
                >
                  <Text style={styles.vehicleName}>
                    {v.make} {v.model} - {v.color}
                  </Text>
                  <Text style={styles.vehiclePlate}>{v.licensePlate}</Text>
                </TouchableOpacity>
              ))
            )}
            <Input
              placeholder={t("post.availableSeats")}
              value={form.availableSeats}
              onChangeText={(v) => updateForm("availableSeats", v)}
              keyboardType="numeric"
            />
          </View>
        )}

        {step === "preferences" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("post.preferences")}</Text>
            <ToggleRow
              label="Air Conditioning"
              value={form.airConditioning}
              onToggle={() => updateForm("airConditioning", !form.airConditioning)}
            />
            <ToggleRow
              label="No Smoking"
              value={form.noSmoking}
              onToggle={() => updateForm("noSmoking", !form.noSmoking)}
            />
          </View>
        )}

        {step === "pricing" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("post.pricing")}</Text>
            <Input
              placeholder={t("post.pricePerSeatLabel")}
              value={form.pricePerSeat}
              onChangeText={(v) => updateForm("pricePerSeat", v)}
              keyboardType="numeric"
            />
            <View style={styles.bookingTypeRow}>
              <TouchableOpacity
                onPress={() => updateForm("bookingType", "AUTOMATIC")}
                style={[
                  styles.bookingTypeBtn,
                  form.bookingType === "AUTOMATIC" && styles.bookingTypeActive,
                ]}
              >
                <Text style={form.bookingType === "AUTOMATIC" ? styles.bookingTypeActiveText : styles.bookingTypeText}>
                  {t("post.automatic")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateForm("bookingType", "MANUAL")}
                style={[
                  styles.bookingTypeBtn,
                  form.bookingType === "MANUAL" && styles.bookingTypeActive,
                ]}
              >
                <Text style={form.bookingType === "MANUAL" ? styles.bookingTypeActiveText : styles.bookingTypeText}>
                  {t("post.manual")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === "review" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("post.review")}</Text>
            <Card>
              <Text style={styles.reviewLabel}>Route</Text>
              <Text style={styles.reviewValue}>{form.originName} → {form.destinationName}</Text>
              <Text style={styles.reviewLabel}>Date & Time</Text>
              <Text style={styles.reviewValue}>{form.departureDate} at {form.departureTime}</Text>
              <Text style={styles.reviewLabel}>Price per seat</Text>
              <Text style={styles.reviewValue}>RWF {form.pricePerSeat}</Text>
              <Text style={styles.reviewLabel}>Seats</Text>
              <Text style={styles.reviewValue}>{form.availableSeats}</Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === "review" ? (
          <Button
            title={t("post.publishRide")}
            onPress={handlePublish}
            loading={createRide.isPending || publishRide.isPending}
          />
        ) : (
          <Button title={t("common.next")} onPress={nextStep} />
        )}
      </View>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={toggleStyles.row}>
      <Text style={toggleStyles.label}>{label}</Text>
      <View style={[toggleStyles.toggle, value && toggleStyles.toggleActive]}>
        <View style={[toggleStyles.thumb, value && toggleStyles.thumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md },
  label: { fontSize: fontSize.md, color: colors.text.primary },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: "center", padding: 2 },
  toggleActive: { backgroundColor: colors.primary },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background },
  thumbActive: { alignSelf: "flex-end" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  back: { fontSize: fontSize.md, color: colors.text.primary, fontWeight: "500" },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  stepIndicator: { fontSize: fontSize.sm, color: colors.text.secondary },
  progressBar: { height: 3, backgroundColor: colors.surface, marginHorizontal: spacing.lg },
  progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  content: { flexGrow: 1, padding: spacing.lg },
  stepContent: { gap: spacing.lg },
  stepTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  vehicleOption: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg },
  vehicleSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  vehicleName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehiclePlate: { fontSize: fontSize.sm, color: colors.text.secondary },
  bookingTypeRow: { flexDirection: "row", gap: spacing.md },
  bookingTypeBtn: { flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, alignItems: "center" },
  bookingTypeActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bookingTypeText: { color: colors.text.secondary, fontWeight: "500" },
  bookingTypeActiveText: { color: colors.primary, fontWeight: "600" },
  reviewLabel: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm },
  reviewValue: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useVehicles.ts mobile/src/app/post-ride/
git commit -m "feat(mobile): add Post a Ride multi-step form with vehicle selection"
```

---

## Task 17: Backend — Apple Sign-In Endpoint

**Files:**
- Modify: `server/prisma/schema.prisma` — add `appleId` field to User
- Create: `server/src/controllers/appleAuth.controller.ts`
- Modify: `server/src/routes/auth.routes.ts` — add Apple route
- Modify: `server/package.json` — add `apple-signin-auth` dependency

- [ ] **Step 1: Add appleId to User model**

In `server/prisma/schema.prisma`, add to the User model:

```prisma
appleId String? @unique
```

- [ ] **Step 2: Install apple-signin-auth**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/server
npm install apple-signin-auth
```

- [ ] **Step 3: Create Apple auth controller**

```typescript
// server/src/controllers/appleAuth.controller.ts
import { Request, Response, NextFunction } from "express";
import appleSignin from "apple-signin-auth";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/generateToken";

const prisma = new PrismaClient();

export async function appleAuthController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { identityToken, fullName } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        message: "Identity token is required",
      });
    }

    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const { sub: appleId, email } = payload;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { appleId },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      const nameParts = fullName?.split(" ") || [];
      user = await prisma.user.create({
        data: {
          appleId,
          email: email || `${appleId}@privaterelay.appleid.com`,
          firstName: nameParts[0] || "User",
          lastName: nameParts.slice(1).join(" ") || "",
          isVerified: true,
          isEmailVerified: !!email,
          password: "",
        },
      });
    } else if (!user.appleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleId },
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 4: Add route to auth routes**

In `server/src/routes/auth.routes.ts`, add:

```typescript
import { appleAuthController } from "../controllers/appleAuth.controller";

// Add with existing routes:
router.post("/apple", appleAuthController);
```

- [ ] **Step 5: Generate Prisma migration and commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/server
npx prisma migrate dev --name add-apple-id-to-user
git add prisma/ src/controllers/appleAuth.controller.ts src/routes/auth.routes.ts package.json package-lock.json
git commit -m "feat(server): add Apple Sign-In endpoint and appleId field"
```

---

## Task 18: Socket Provider & Notifications Hook

**Files:**
- Create: `mobile/src/providers/SocketProvider.tsx`
- Create: `mobile/src/hooks/useNotifications.ts`
- Create: `mobile/src/services/socket.ts`

- [ ] **Step 1: Create socket service**

```typescript
// mobile/src/services/socket.ts
import { io, Socket } from "socket.io-client";
import { authStorage } from "./auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:5000";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await authStorage.getToken();
  if (!token) throw new Error("No auth token");

  socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Create Socket Provider**

```tsx
// mobile/src/providers/SocketProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useAuthContext } from "./AuthProvider";
import { connectSocket, disconnectSocket, getSocket } from "@/services/socket";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    connectSocket().then((s) => {
      setSocket(s);
      s.on("connect", () => setIsConnected(true));
      s.on("disconnect", () => setIsConnected(false));
    });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
```

- [ ] **Step 3: Create notifications hook**

```typescript
// mobile/src/hooks/useNotifications.ts
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import { ApiResponse, Notification, PaginatedResponse } from "@/lib/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useRegisterPushToken() {
  const registerMutation = useMutation({
    mutationFn: (token: string) =>
      api.post("/notifications/register-fcm-token", { fcmToken: token }),
  });

  async function registerForPushNotifications() {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    registerMutation.mutate(tokenData.data);

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  }

  return { registerForPushNotifications };
}

export function useNotificationsList() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api.get<PaginatedResponse<Notification>>("/notifications"),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
```

- [ ] **Step 4: Wire SocketProvider into root layout**

In `mobile/src/app/_layout.tsx`, wrap `AuthProvider`'s children with `SocketProvider`:

```tsx
// Add import:
import { SocketProvider } from "@/providers/SocketProvider";

// Update the return to nest SocketProvider inside AuthProvider:
<AuthProvider>
  <SocketProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }}>
      {/* ...existing screens... */}
    </Stack>
  </SocketProvider>
</AuthProvider>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/socket.ts mobile/src/providers/SocketProvider.tsx mobile/src/hooks/useNotifications.ts mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add Socket.IO provider and push notification registration"
```

---

## Task 19: Final Wiring & Smoke Test

**Files:**
- Modify: `mobile/src/app/_layout.tsx` (if needed)
- Verify all routes compile and navigate

- [ ] **Step 1: Verify project compiles**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx expo start --clear
```

Verify no TypeScript or Metro bundler errors. Press `q` to quit.

- [ ] **Step 2: Run tests**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx jest --passWithNoTests
```

Expected: All tests pass.

- [ ] **Step 3: Verify navigation flow manually (if device/simulator available)**

Test flow:
1. App opens → Welcome screen (not authenticated)
2. Tap "Log In" → Login screen
3. Tap "Sign Up" → Register screen
4. After login → Home screen with tabs
5. Search → Search results
6. Tap ride → Ride details
7. Post tab → Post a ride form

- [ ] **Step 4: Final commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add -A
git commit -m "feat(mobile): Phase 1 complete - auth, rides, posting, navigation"
```

---

## Phase 2 (Separate Plan)

The following features will be covered in a Phase 2 plan:

- **Car Rentals** — browse vehicles, booking flow, active rental tracking
- **Chauffeur Services** — browse drivers, booking flow, active service tracking
- **Chat** — full real-time chat with Socket.IO, thread list, message bubbles, typing indicators
- **Profile** — full profile management, vehicle CRUD, payment methods, settings
- **Onboarding** — passenger + driver onboarding flows with phone verification
- **Google Places Autocomplete** — integration into SearchCard and PostRideForm
- **Deep Linking** — handle push notification taps, universal links
- **Stripe Payment Sheet** — full payment integration with 3D Secure
- **Tab Bar Icons** — Lucide icons for bottom tabs
- **Error Boundaries** — global error handling
- **Offline Banner** — network status detection with NetInfo
