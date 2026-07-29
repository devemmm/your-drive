# Unified Marketplace — Rental & Chauffeur Frontend Design

## Overview

Add frontend support for two backend features that are fully built but have zero frontend implementation: **Car/Motorbike Rental** and **Chauffeur Services**. The approach creates a new unified marketplace page for browsing all service types, extends existing pages for listing/creation, and adds two new admin dashboard tabs.

## Architecture: New Marketplace Page + Shared Components (Option B)

A new `/marketplace` route with a service type selector. Each service type renders a dedicated list component, but they share filter bar, card layout, and booking modal patterns. Existing pages remain untouched — no risk of breaking the current ride flow.

---

## 1. Routing

### New Routes

| Route | Purpose |
|-------|---------|
| `/marketplace` | Unified browsing page, `?tab=rides\|rentals\|chauffeur` query param (defaults to `rides`) |
| `/marketplace/rental/:rentalId` | Rental detail / booking flow |
| `/marketplace/chauffeur/:driverId` | Chauffeur detail / booking flow |

### Redirects

| Old Route | Redirects To |
|-----------|-------------|
| `/book-a-ride` | `/marketplace?tab=rides` |

### Existing Pages Extended (no new routes)

| Page | Addition |
|------|----------|
| `/vehicle` | Rental Settings section (toggle availability, rates, deposit, fuel policy, pickup location) |
| `/profile` | Chauffeur Settings section (toggle availability, rates, description) |

---

## 2. Shared Components

### ServiceTypeSelector

Tab bar at the top of the marketplace page: **Rides | Rentals | Chauffeur**. Controls which list component renders below and which filters are active. Updates the `?tab` query param.

### FilterBar

Extends the existing ride filter component. Filters conditionally show/hide based on active tab:

- **Always visible**: location search, date range, price range
- **Rides only**: smoking, pets, AC, ladies-only, luggage, D2D toggle
- **Rentals only**: vehicle category (car/motorbike), fuel policy, mileage limit
- **Chauffeur only**: driver rating, vehicle category

### ServiceCard

Unified card component that adapts layout per service type:

- **Ride card**: driver info, route, departure time, seats, price (reuses existing `RideCard` pattern)
- **Rental card**: vehicle image, make/model, category badge (CAR/MOTORBIKE), daily/hourly rate, deposit, owner info
- **Chauffeur card**: driver photo, rating, vehicle info, hourly/daily rate, description

### BookingModal

Adapted per service type:

- **Ride**: existing booking modal (seat selection, payment)
- **Rental**: date selection, rate type (hourly/daily), cost breakdown with deposit, pickup location confirmation
- **Chauffeur**: date selection, rate type (hourly/daily), pickup/dropoff locations, notes

---

## 3. Vehicle Page — Rental Settings

Collapsible section on the existing `/vehicle` page:

- Toggle: "Make available for rental"
- When enabled:
  - Hourly rate (CAD)
  - Daily rate (CAD)
  - Security deposit (CAD)
  - Rental description (textarea)
  - Mileage limit (km, optional)
  - Fuel policy (dropdown: FULL_TO_FULL, SAME_LEVEL — matches `FuelPolicy` enum)
  - Pickup location (map picker, reuses existing location components)
- Save triggers `PUT /vehicles/:id` with rental fields

Maps directly to existing Vehicle model fields: `isAvailableForRental`, `hourlyRate`, `dailyRate`, `securityDeposit`, `rentalDescription`, `mileageLimit`, `fuelPolicy`, `pickupLocationId`.

---

## 4. Profile Page — Chauffeur Settings

Section on the existing `/profile` page:

- Toggle: "Available as a chauffeur"
- When enabled:
  - Hourly rate (CAD)
  - Daily rate (CAD)
  - Description (textarea)
- Save updates user profile fields

Maps directly to existing User model fields: `isAvailableForChauffeur`, `chauffeurHourlyRate`, `chauffeurDailyRate`, `chauffeurDescription`.

---

## 5. React Query Hooks

### New: `useRentals.ts`

- `useAvailableRentals(filters)` — browse marketplace listings
- `useRental(rentalId)` — single rental detail
- `useCreateRental(data)` — request a rental
- `useApproveRental()` — owner approves
- `useDeclineRental()` — owner declines
- `useInitializeRentalPayment()` — Stripe payment intent
- `useActivateRental()` — start rental
- `useCompleteRental()` — mark complete
- `useCancelRental()` — cancel with refund logic
- `useReleaseDeposit()` — owner releases security deposit

### New: `useChauffeur.ts`

- `useAvailableDrivers(filters)` — browse available drivers (`GET /chauffeur-services/public/chauffeur-drivers`)
- `useChauffeurService(serviceId)` — single service detail
- `useCreateChauffeurService(data)` — request a chauffeur
- `useAcceptService()` — driver accepts
- `useDeclineService()` — driver declines
- `useInitializeChauffeurPayment()` — Stripe payment intent
- `useActivateService()` — start service
- `useCompleteService()` — mark complete
- `useCancelService()` — cancel

### Extend: `useVehicles.ts`

- `useUpdateRentalSettings(vehicleId, data)` — toggle availability, set rates, deposit, fuel policy

### New: `useAdminRentals.ts`

- Admin CRUD for rental management (list, detail, search, status filter, cancel, refund actions)

### New: `useAdminChauffeur.ts`

- Admin CRUD for chauffeur service management (list, detail, search, status filter, cancel actions)

All hooks follow existing patterns: TanStack React Query v5 with `ApiService` axios wrapper.

---

## 6. Admin Dashboard

### New Tab: Rentals

- Status filter pills: All | Requested | Approved | Active | Completed | Cancelled | Disputed
- Search by renter, owner, or vehicle
- Table columns: ID, Vehicle, Category (CAR/MOTORBIKE badge), Renter, Owner, Dates, Amount, Status, Actions
- "View" opens detail modal: full rental info, status timeline, transaction details, chat thread link, cancel/refund actions

### New Tab: Chauffeur Services

- Status filter pills: All | Requested | Accepted | Active | Completed | Cancelled | Disputed
- Search by passenger, driver, or vehicle
- Table columns: ID, Driver, Passenger, Vehicle, Type (HOURLY/DAILY), Dates, Amount, Status, Actions
- "View" opens detail modal: service info, pickup/dropoff locations, status timeline, transaction details, chat thread link, cancel actions

### Extend: Fee Settings Tab

Add two new settings cards:

- **Rental Settings**: platform fee %, max rental duration days, min rental duration hours, request expiry hours, deposit release reminder hours
- **Chauffeur Settings**: platform fee %, max service duration days, min service duration hours, request expiry hours, overdue grace period hours

Maps to existing `RentalSettings` and `ChauffeurSettings` Prisma models.

---

## 7. Frontend Types

Add to `lib/types.ts`:

- `VehicleCategory` enum: `CAR | MOTORBIKE`
- `CarRental` interface matching Prisma model
- `RentalType` enum: `HOURLY | DAILY`
- `RentalStatus` enum: `REQUESTED | APPROVED | DECLINED | ACTIVE | COMPLETED | CANCELLED | DISPUTED`
- `ChauffeurService` interface matching Prisma model
- `ChauffeurServiceType` enum: `HOURLY | DAILY`
- `ChauffeurStatus` enum: `REQUESTED | ACCEPTED | DECLINED | ACTIVE | COMPLETED | CANCELLED | DISPUTED`
- `RentalSettings` interface
- `ChauffeurSettings` interface

---

## 8. Backend Changes

**None required.** All models, enums, routes, controllers, services, and validators already exist. The frontend will consume existing API endpoints.

---

## 9. Scope Boundaries

**In scope:**
- Marketplace browsing page with three service type tabs
- Rental and chauffeur booking flows (request, payment, lifecycle)
- Vehicle rental settings on vehicle page
- Chauffeur settings on profile page
- Two new admin tabs (Rentals, Chauffeur Services)
- Admin settings for rental and chauffeur platform config
- Frontend type definitions
- i18n strings for EN/FR

**Out of scope:**
- Backend changes (already complete)
- Chat thread UI (already exists, just needs linking)
- Review/rating UI (existing system handles this)
- Notification UI (existing notification system handles this)
- Stripe Connect onboarding (existing payment flow handles this)
- Mobile-specific responsive design (follow existing responsive patterns)
