# YourDrive Mobile App — Design Spec

## Overview

A React Native + Expo mobile app for the YourDrive ride-sharing platform, covering both passenger and driver experiences. The app provides P2P/D2D ride booking, car rentals, chauffeur services, real-time chat, and Stripe payments. Influenced by inDrive's UX patterns.

**Target platforms:** iOS 14+ / Android 6+ (API 23)
**Languages:** English + Kinyarwanda
**Market:** Rwanda (RWF currency)

---

## Architecture

### Approach: Standalone Mobile App

New `/mobile` directory in the existing monorepo. Dedicated React Native + Expo app with its own navigation, components, and hooks — consuming the same Express.js backend API as the web client. No changes to the existing web client.

**Rationale:** Fastest path to MVP. Clean separation between mobile-native patterns and web patterns. Shared code can be extracted into packages later as patterns stabilize.

### Project Structure

```
your-drive/
├── client/          # Existing React web app (unchanged)
├── server/          # Existing Express API (minor additions)
├── mobile/          # React Native + Expo app
│   ├── app/         # Expo Router file-based routing
│   │   ├── (auth)/          # Auth screens (welcome, login, register, forgot-password)
│   │   ├── (tabs)/          # Bottom tab navigator (home, rides, post, chat, profile)
│   │   ├── ride/            # Ride details, active ride, completion
│   │   ├── rental/          # Rental browsing, booking, details
│   │   ├── chauffeur/       # Chauffeur browsing, booking, details
│   │   ├── vehicle/         # Vehicle management
│   │   ├── payment/         # Stripe payment sheet
│   │   ├── onboarding/      # Passenger onboarding + phone verification
│   │   └── _layout.tsx      # Root layout
│   ├── components/  # Reusable UI components
│   ├── hooks/       # Data fetching & business logic hooks
│   ├── services/    # API client, socket, storage
│   ├── lib/         # Types, utils, constants
│   ├── providers/   # Auth, Socket, Theme contexts
│   ├── assets/      # Images, fonts, animations
│   └── translations/# i18n (en, rw)
```

### Tech Stack

| Category | Choice |
|----------|--------|
| Framework | React Native + Expo SDK 52 (managed workflow) |
| Navigation | Expo Router v4 (file-based, stack + tabs) |
| Data fetching | TanStack React Query (same pattern as web) |
| API client | Axios with JWT interceptor |
| Maps | React Native Maps (Google Maps) |
| Real-time | Socket.IO Client |
| Payments | Stripe React Native SDK |
| Auth | expo-auth-session (Google), expo-apple-authentication (Apple) |
| Token storage | expo-secure-store (encrypted, keychain-backed) |
| Push notifications | expo-notifications + Firebase FCM |
| Animations | react-native-reanimated |
| Lists | FlashList (high-performance scrolling) |
| Images | expo-image (disk caching) |
| i18n | i18next + react-i18next |
| Validation | Zod |
| Build & deploy | EAS Build + EAS Submit |

---

## Navigation & Screen Map

### (auth) — Stack Navigator (unauthenticated)

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `welcome` | Splash with Log In & Sign Up CTAs | — |
| `login` | Email/password + Google + Apple Sign-In | POST `/auth/login`, `/auth/google/mobile`, `/auth/apple` |
| `register` | Name, email, password, referral code, T&C | POST `/auth/register` |
| `forgot-password` | Password reset request | POST `/auth/forgot-password` |
| `verify-email` | Email verification code | POST `/auth/verify-email` |
| `reset-password` | New password entry | POST `/auth/reset-password` |

### onboarding — Stack Navigator (authenticated, not onboarded)

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `passenger` | Passenger profile setup | POST `/users/update` |
| `verify-phone` | Phone number + OTP verification | POST `/users/add-phone`, `/users/verify-phone` |

### (tabs) — Bottom Tab Navigator (authenticated + onboarded)

| Tab | Screen | Description |
|-----|--------|-------------|
| Home | `home` | Search card (origin/destination, date, passengers) + upcoming rides |
| Rides | `rides` | My rides as passenger & driver, bookings list |
| Post | `post` | Multi-step ride posting form |
| Chat | `chat` | Chat thread list with unread indicators |
| Profile | `profile` | Profile, vehicles, payment methods, settings, language, logout |

### ride/ — Stack Navigator

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `search-results` | P2P/D2D results with filters | GET `/public/rides/search`, `/public/rides` |
| `[id]` | Ride details + pricing breakdown + "Book This Ride" | GET `/public/rides/:rideId`, POST `/rides/:rideId/book` |
| `[id]/active` | Live map, ETA, seat attendance code, chat/call | GET `/rides/:rideId`, Socket.IO events |
| `[id]/complete` | Payment summary + star rating + review | POST `/ratings` |
| `[id]/chat` | Ride group chat | GET/POST `/chat/threads/:threadId/messages` |

### rental/ — Stack Navigator

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `index` | Browse available rental vehicles with filters | GET `/public/rentals/vehicles/available` |
| `[id]` | Rental details + booking modal | POST `/rentals`, GET rental details |
| `[id]/active` | Active rental tracking | PATCH `/rentals/:rentalId/complete`, `/rentals/:rentalId/cancel` |

### chauffeur/ — Stack Navigator

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `index` | Browse available chauffeur drivers | GET `/public/chauffeur-drivers` |
| `[id]` | Chauffeur details + booking modal | POST `/chauffeur-services` |
| `[id]/active` | Active service tracking | PATCH `/chauffeur-services/:serviceId/complete`, `cancel` |

### vehicle/ — Stack Navigator

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `index` | My vehicles list | GET `/vehicles` |
| `add` | Add vehicle form with image upload | POST `/vehicles` |
| `[id]` | Edit vehicle + rental/chauffeur settings | PUT `/vehicles/:vehicleId`, PATCH rental settings |

### payment/ — Modal

| Screen | Description | API Endpoints |
|--------|-------------|---------------|
| `index` | Stripe payment sheet | POST `/transactions/confirm`, `/transactions/finalize-3ds` |

### Route Guards

- `(auth)` routes redirect to `(tabs)` if authenticated
- `(tabs)` routes redirect to `(auth)` if not authenticated
- Onboarding check intercepts before main tabs if `isPassengerOnboarded === false`

---

## API & Data Layer

### API Client

Axios-based HTTP client mirroring the web client pattern:

- Base URL from `EXPO_PUBLIC_API_URL` environment variable
- JWT token injected via request interceptor (read from `expo-secure-store`)
- Automatic 401 handling: clear token, redirect to login
- Language header injection from i18n current language
- Methods: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`, `upload<T>()`

### React Query Hooks

| Hook | Queries | Mutations |
|------|---------|-----------|
| `useAuth` | — | login, register, googleAuth, appleAuth, forgotPassword, resetPassword |
| `useUser` | profile, single user | updateProfile, changePassword, addPhone, verifyPhone, deleteAccount |
| `useRides` | public rides, my rides, ride details | createRide, updateRide, bookRide, startRide, cancelRide, completeRide |
| `useBookings` | my bookings, booking details | cancelBooking, approveBooking |
| `useD2D` | d2d requests | createD2D, acceptD2D, cancelD2D, initializePayment |
| `useRentals` | available vehicles, my rentals | createRental, approve, decline, activate, complete, cancel |
| `useChauffeur` | available drivers, my services | createService, accept, decline, activate, complete, cancel |
| `useVehicles` | my vehicles, vehicle details | createVehicle, updateVehicle, deleteVehicle, addImages |
| `useChat` | threads, messages | sendMessage, markRead |
| `useTransactions` | transactions | confirmPayment, finalize3DS |
| `useNotifications` | notifications | markRead, markAllRead, registerFCMToken |

### Socket.IO

- Connects on authentication with JWT token
- Notification room: `user-{userId}`
- Chat namespace: `/chat`
- Events: `join_thread`, `leave_thread`, `send_message`, `typing_start`, `typing_stop`, `mark_message_read`, `mark_thread_read`
- Broadcasts: `new_message`, `message_updated`, `message_deleted`, `new_message_notification`
- Auto-reconnect on connection loss

---

## Authentication & Security

### Auth Flow

```
App Launch
  → Check expo-secure-store for JWT
  → Token exists → decode & check expiry
    → Valid → fetch user profile → route to (tabs) or onboarding
    → Expired → clear token → route to (auth)/welcome
  → No token → route to (auth)/welcome
```

### Login Methods

| Method | Implementation | Backend Endpoint |
|--------|---------------|-----------------|
| Email/Password | Direct POST with credentials | POST `/auth/login` |
| Google OAuth | `expo-auth-session` → ID token | POST `/auth/google/mobile` (exists) |
| Apple Sign-In | `expo-apple-authentication` → identity token | POST `/auth/apple` (NEW — must be added) |

### Token Management

- JWT stored in `expo-secure-store` (encrypted, keychain-backed on iOS/Android)
- Token validity checked on app foreground via `AppState` listener
- Auto-logout with user-facing message on 401 responses
- No sensitive data stored in `AsyncStorage`

### Push Notifications

- Request permission on first login
- Register FCM token via POST `/notifications/register-fcm-token`
- Re-register on token refresh
- Handle notification taps for deep linking to rides, bookings, chat

---

## Components

### Shared UI

- `Button` — primary (green), secondary (outline), destructive variants
- `Input` — text fields with leading icons, password toggle, validation errors
- `Card` — ride card, rental card, chauffeur card
- `Avatar` — profile images with initials fallback
- `Badge` — status badges (P2P, D2D, seat count, ride status)
- `BottomSheet` — modal sheets for filters, booking details
- `StarRating` — interactive rating input + read-only display
- `LoadingIndicator` — skeleton loaders + activity spinners
- `EmptyState` — illustrated empty states per feature
- `Toast` — success/error feedback notifications

### Search & Booking

- `SearchCard` — origin/destination with Google Places autocomplete, date picker, passenger count
- `RideResultCard` — driver info, rating, departure/arrival times, price, seats, preferences icons
- `FilterBar` — P2P/D2D toggle, price, time, preferences filters
- `BookingSummary` — pricing breakdown (fare + platform fee + tax = total)
- `RentalCard` — vehicle image, type (car/motorbike), hourly/daily rate, availability
- `ChauffeurCard` — driver photo, rating, hourly/daily rate, vehicle info

### Map

- `RideMap` — route polyline with origin/destination markers
- `ActiveRideMap` — live tracking with driver position, ETA overlay
- `LocationPicker` — interactive map + Google Places search for selecting points

### Driver

- `PostRideForm` — multi-step: route → vehicle → preferences → pricing → review
- `RideManagement` — driver's view of bookings, approve/decline actions, attendance codes
- `VehicleForm` — add/edit vehicle with image upload via Cloudinary, rental & chauffeur settings

### Chat

- `ThreadList` — conversation list with last message preview, unread count
- `MessageBubble` — sent/received styling with timestamps, read receipts
- `TypingIndicator` — animated dots for real-time typing status
- `ChatInput` — text input with send button

### Profile

- `ProfileHeader` — avatar, name, rating, member since date
- `SettingsMenu` — language toggle, notification preferences, payment methods, logout
- `VehicleList` — user's registered vehicles with edit/delete actions

---

## Offline Handling & Performance

### Offline Strategy — Graceful Degradation

- **React Query cache** — previously loaded data remains visible offline
- **Optimistic updates** — chat messages appear instantly, sync on reconnect
- **Network status banner** — visible "No internet connection" indicator
- **Retry queue** — failed mutations auto-retry when connection returns
- **Cached user profile** — profile persists so app doesn't blank on launch

### Performance Optimizations

- **FlashList** over FlatList for all scrollable lists
- **expo-image** with disk caching for profile photos, vehicle images
- **Route prefetching** — prefetch ride details on scroll
- **Lazy loading** — rental and chauffeur routes loaded on demand
- **Reanimated** — 60fps UI-thread animations for bottom sheets, transitions
- **Bundle splitting** — automatic per-route via Expo Router

### App Size Target

Under 25MB initial download.

---

## Backend Changes Required

The existing server needs minimal additions:

| Change | Description | Effort |
|--------|-------------|--------|
| Apple Sign-In endpoint | `POST /auth/apple` — verify Apple identity token, create/find user, return JWT | Small |
| Apple user ID field | Add `appleId` field to User model in Prisma schema | Small |
| FCM token handling | Already exists at `POST /notifications/register-fcm-token` | None |
| Mobile Google OAuth | Already exists at `POST /auth/google/mobile` | None |
| CORS update | Add mobile dev URL to allowed origins (or use wildcard in dev) | Trivial |

---

## Design Reference

The Pencil design file at `/Users/adrianmaenzanise/Documents/designs/your-drive.pen` contains 8 screens that define the visual language:

1. **Welcome** — green branding, illustration, Log In / Sign Up CTAs
2. **Login** — clean form, Google OAuth, forgot password link
3. **Sign Up** — two-column name fields, referral code, T&C checkbox
4. **Home** — greeting, search card with origin/destination, upcoming rides, bottom tab bar
5. **Search Results** — P2P/D2D filter tabs, driver result cards with ratings and prices in RWF
6. **Ride Details** — driver profile, route timeline, vehicle info, preference icons, pricing breakdown
7. **Active Ride** — map with route, "Ride in Progress" status, ETA, attendance code, chat/call buttons
8. **Ride Complete** — success checkmark, payment summary, star rating with review input

**Design tokens:** Green primary (#22C55E), white backgrounds, rounded cards with subtle shadows, green CTAs.
