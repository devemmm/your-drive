# Unified Marketplace — Rental & Chauffeur Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend support for vehicle rentals (car + motorbike) and chauffeur services via a unified marketplace page, with separate listing flows and two new admin dashboard tabs.

**Architecture:** New `/marketplace` route with service type tabs (Rides | Rentals | Chauffeur). Each tab renders a dedicated list component backed by new React Query hooks. Listing flows extend existing Vehicle and Profile pages. Two new admin tabs follow the existing admin tab pattern. `/book-a-ride` redirects to the marketplace.

**Tech Stack:** React 18, TypeScript, TanStack React Query v5, Radix UI / shadcn/ui, Tailwind CSS, Axios (ApiService wrapper), React Router DOM 6, React Hook Form + Zod, i18next (EN/FR), Stripe

**Spec:** `docs/superpowers/specs/2026-04-01-marketplace-rental-chauffeur-design.md`

---

## File Structure

### New Files
```
client/src/
├── hooks/
│   ├── useRentals.ts              # React Query hooks for rental CRUD + browsing
│   ├── useChauffeur.ts            # React Query hooks for chauffeur CRUD + browsing
│   ├── useAdminRentals.ts         # Admin rental management hooks
│   └── useAdminChauffeur.ts       # Admin chauffeur management hooks
├── pages/
│   └── marketplace/
│       ├── index.tsx              # Marketplace page with service type tabs
│       ├── RentalList.tsx         # Rental listings grid
│       ├── RentalCard.tsx         # Individual rental vehicle card
│       ├── RentalBookingModal.tsx # Rental booking flow modal
│       ├── ChauffeurList.tsx      # Chauffeur driver listings grid
│       ├── ChauffeurCard.tsx      # Individual chauffeur driver card
│       └── ChauffeurBookingModal.tsx # Chauffeur booking flow modal
├── pages/admin/tabs/
│   ├── RentalsTab.tsx             # Admin rentals management tab
│   └── ChauffeurTab.tsx           # Admin chauffeur management tab
└── components/
    ├── RentalSettings.tsx         # Vehicle rental settings form (used on Vehicle page)
    └── ChauffeurSettings.tsx      # User chauffeur settings form (used on Profile page)
```

### Modified Files
```
client/src/
├── lib/types.ts                   # Add rental, chauffeur, and vehicle category types
├── data/index.ts                  # Add new queryKey constants
├── App.tsx                        # Add marketplace route, redirect /book-a-ride
├── pages/Vehicle.tsx              # Import and render RentalSettings component
├── pages/ProfilePage.tsx          # Import and render ChauffeurSettings component
├── pages/admin/AdminDashboard.tsx # Register two new tabs (Rentals, Chauffeur)
├── components/Layout.tsx          # Update navbar link from /book-a-ride to /marketplace
└── translations/
    ├── eng.json                   # Add EN strings for marketplace, rental, chauffeur
    └── rw.json                    # Add FR/RW strings
```

---

## Task 1: Add Frontend Types

**Files:**
- Modify: `client/src/lib/types.ts`
- Modify: `client/src/data/index.ts`

- [ ] **Step 1: Add rental and chauffeur types to `lib/types.ts`**

Open `client/src/lib/types.ts` and add the following types at the end of the file:

```typescript
// Vehicle Category
export type VehicleCategory = "CAR" | "MOTORBIKE";

// Fuel Policy
export type FuelPolicy = "FULL_TO_FULL" | "SAME_LEVEL";

// Location
export interface Location {
  id: number;
  region: string;
  city: string;
  locationName: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

// === RENTAL TYPES ===

export type RentalType = "HOURLY" | "DAILY";

export type RentalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "DECLINED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface CarRental {
  id: number;
  vehicleId: number;
  vehicle: Vehicle & {
    category: VehicleCategory;
    hourlyRate: string | null;
    dailyRate: string | null;
    securityDeposit: string | null;
    rentalDescription: string | null;
    mileageLimit: number | null;
    fuelPolicy: FuelPolicy;
    pickupLocation: Location | null;
  };
  renterId: number;
  renter: { id: number; name: string; email: string; profileImage?: { url: string } };
  ownerId: number;
  owner: { id: number; name: string; email: string; profileImage?: { url: string } };
  startDate: string;
  endDate: string;
  rentalType: RentalType;
  totalAmount: string;
  securityDepositAmount: string;
  status: RentalStatus;
  pickupLocation: Location | null;
  returnLocation: Location | null;
  pickupNotes: string | null;
  returnNotes: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  depositRefunded: boolean;
  transactionId: number | null;
  depositTransactionId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RentalVehicleListing {
  id: number;
  make: string;
  model: string;
  year: number | null;
  color: string;
  plateNumber: string;
  category: VehicleCategory;
  capacity: number;
  hourlyRate: string | null;
  dailyRate: string | null;
  securityDeposit: string | null;
  rentalDescription: string | null;
  mileageLimit: number | null;
  fuelPolicy: FuelPolicy;
  defaultImage: { url: string } | null;
  files: { id: number; url: string }[];
  pickupLocation: Location | null;
  user: { id: number; name: string; profileImage?: { url: string } };
}

export interface RentalSettings {
  id: number;
  platformFeePercentage: string;
  maxRentalDurationDays: number;
  minRentalDurationHours: number;
  requestExpiryHours: number;
  depositReleaseReminderHours: number;
}

// === CHAUFFEUR TYPES ===

export type ChauffeurServiceType = "HOURLY" | "DAILY";

export type ChauffeurStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface ChauffeurService {
  id: number;
  vehicleId: number;
  vehicle: Vehicle & { category: VehicleCategory };
  passengerId: number;
  passenger: { id: number; name: string; email: string; profileImage?: { url: string } };
  driverId: number;
  driver: { id: number; name: string; email: string; profileImage?: { url: string } };
  startDate: string;
  endDate: string;
  serviceType: ChauffeurServiceType;
  totalAmount: string;
  status: ChauffeurStatus;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  pickupNotes: string | null;
  dropoffNotes: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  transactionId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChauffeurDriverListing {
  id: number;
  name: string;
  email: string;
  profileImage?: { url: string };
  chauffeurHourlyRate: string | null;
  chauffeurDailyRate: string | null;
  chauffeurDescription: string | null;
  vehicles: (Vehicle & { category: VehicleCategory })[];
}

export interface ChauffeurSettings {
  id: number;
  platformFeePercentage: string;
  maxServiceDurationDays: number;
  minServiceDurationHours: number;
  requestExpiryHours: number;
  overdueGracePeriodHours: number;
}

// === CREATE REQUEST TYPES ===

export interface CreateRentalRequest {
  vehicleId: number;
  startDate: string;
  endDate: string;
  rentalType: RentalType;
  pickupNotes?: string;
  returnNotes?: string;
  pickupLocation?: Omit<Location, "id">;
  returnLocation?: Omit<Location, "id">;
}

export interface CreateChauffeurRequest {
  vehicleId: number;
  driverId: number;
  startDate: string;
  endDate: string;
  serviceType: ChauffeurServiceType;
  pickupNotes?: string;
  dropoffNotes?: string;
  pickupLocation?: Omit<Location, "id">;
  dropoffLocation?: Omit<Location, "id">;
}
```

- [ ] **Step 2: Add query key constants to `data/index.ts`**

Open `client/src/data/index.ts` and add these keys to the `queryKey` object:

```typescript
RENTALS: "rentals",
RENTAL: "rental",
AVAILABLE_RENTALS: "availableRentals",
CHAUFFEUR_SERVICES: "chauffeurServices",
CHAUFFEUR_SERVICE: "chauffeurService",
AVAILABLE_DRIVERS: "availableDrivers",
RENTAL_SETTINGS: "rentalSettings",
CHAUFFEUR_SETTINGS: "chauffeurSettings",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No new errors from the types we added (existing errors are OK).

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/types.ts client/src/data/index.ts
git commit -m "feat(marketplace): add rental and chauffeur frontend types"
```

---

## Task 2: Add i18n Strings

**Files:**
- Modify: `client/src/translations/eng.json`
- Modify: `client/src/translations/rw.json`

- [ ] **Step 1: Add English translation keys**

Open `client/src/translations/eng.json` and add the following top-level keys:

```json
"marketplace": {
  "title": "Marketplace",
  "tabs": {
    "rides": "Rides",
    "rentals": "Rentals",
    "chauffeur": "Chauffeur"
  },
  "filters": {
    "location": "Location",
    "dateRange": "Date Range",
    "priceRange": "Price Range",
    "vehicleCategory": "Vehicle Type",
    "car": "Car",
    "motorbike": "Motorbike",
    "fuelPolicy": "Fuel Policy",
    "mileageLimit": "Mileage Limit",
    "driverRating": "Driver Rating",
    "startDate": "Start Date",
    "endDate": "End Date",
    "minPrice": "Min Price",
    "maxPrice": "Max Price",
    "search": "Search",
    "clearFilters": "Clear Filters",
    "noResults": "No results found",
    "noResultsDescription": "Try adjusting your filters or search criteria"
  }
},
"rental": {
  "card": {
    "perHour": "/hour",
    "perDay": "/day",
    "deposit": "Deposit",
    "mileageLimit": "{{limit}} km limit",
    "unlimitedMileage": "Unlimited mileage",
    "viewDetails": "View Details",
    "bookNow": "Book Now"
  },
  "booking": {
    "title": "Book This Vehicle",
    "rentalType": "Rental Type",
    "hourly": "Hourly",
    "daily": "Daily",
    "startDate": "Start Date",
    "endDate": "End Date",
    "pickupLocation": "Pickup Location",
    "returnLocation": "Return Location",
    "pickupNotes": "Pickup Notes",
    "returnNotes": "Return Notes",
    "costBreakdown": "Cost Breakdown",
    "rentalCost": "Rental Cost",
    "securityDeposit": "Security Deposit",
    "total": "Total",
    "confirmBooking": "Confirm Booking",
    "requestSent": "Rental request sent successfully",
    "requestError": "Failed to send rental request"
  },
  "status": {
    "REQUESTED": "Requested",
    "APPROVED": "Approved",
    "DECLINED": "Declined",
    "ACTIVE": "Active",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",
    "DISPUTED": "Disputed"
  },
  "settings": {
    "title": "Rental Settings",
    "available": "Available for Rental",
    "hourlyRate": "Hourly Rate (CAD)",
    "dailyRate": "Daily Rate (CAD)",
    "securityDeposit": "Security Deposit (CAD)",
    "description": "Rental Description",
    "mileageLimit": "Mileage Limit (km)",
    "fuelPolicy": "Fuel Policy",
    "fuelPolicies": {
      "FULL_TO_FULL": "Full to Full",
      "SAME_LEVEL": "Same Level"
    },
    "pickupLocation": "Pickup Location",
    "save": "Save Settings",
    "saved": "Rental settings saved",
    "saveError": "Failed to save rental settings"
  }
},
"chauffeur": {
  "card": {
    "perHour": "/hour",
    "perDay": "/day",
    "vehicles": "Vehicles",
    "viewProfile": "View Profile",
    "bookNow": "Book Now"
  },
  "booking": {
    "title": "Book This Driver",
    "serviceType": "Service Type",
    "hourly": "Hourly",
    "daily": "Daily",
    "selectVehicle": "Select Vehicle",
    "startDate": "Start Date",
    "endDate": "End Date",
    "pickupLocation": "Pickup Location",
    "dropoffLocation": "Dropoff Location",
    "pickupNotes": "Pickup Notes",
    "dropoffNotes": "Dropoff Notes",
    "costBreakdown": "Cost Breakdown",
    "serviceCost": "Service Cost",
    "total": "Total",
    "confirmBooking": "Confirm Booking",
    "requestSent": "Chauffeur request sent successfully",
    "requestError": "Failed to send chauffeur request"
  },
  "status": {
    "REQUESTED": "Requested",
    "ACCEPTED": "Accepted",
    "DECLINED": "Declined",
    "ACTIVE": "Active",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",
    "DISPUTED": "Disputed"
  },
  "settings": {
    "title": "Chauffeur Settings",
    "available": "Available as Chauffeur",
    "hourlyRate": "Hourly Rate (CAD)",
    "dailyRate": "Daily Rate (CAD)",
    "description": "Describe your service",
    "save": "Save Settings",
    "saved": "Chauffeur settings saved",
    "saveError": "Failed to save chauffeur settings"
  }
},
"AdminDashboard": {
  "tabs": {
    "rentals": "Rentals",
    "chauffeurServices": "Chauffeur"
  }
},
"adminRentals": {
  "title": "Rental Management",
  "searchPlaceholder": "Search by renter, owner, or vehicle...",
  "table": {
    "id": "ID",
    "vehicle": "Vehicle",
    "category": "Category",
    "renter": "Renter",
    "owner": "Owner",
    "dates": "Dates",
    "amount": "Amount",
    "status": "Status",
    "actions": "Actions"
  },
  "view": "View",
  "cancel": "Cancel",
  "refundDeposit": "Refund Deposit",
  "resolveDispute": "Resolve Dispute",
  "forceCancel": "Force Cancel",
  "cancelReason": "Cancellation Reason",
  "noRentals": "No rentals found"
},
"adminChauffeur": {
  "title": "Chauffeur Service Management",
  "searchPlaceholder": "Search by passenger, driver, or vehicle...",
  "table": {
    "id": "ID",
    "driver": "Driver",
    "passenger": "Passenger",
    "vehicle": "Vehicle",
    "type": "Type",
    "dates": "Dates",
    "amount": "Amount",
    "status": "Status",
    "actions": "Actions"
  },
  "view": "View",
  "cancel": "Cancel",
  "resolveDispute": "Resolve Dispute",
  "forceCancel": "Force Cancel",
  "cancelReason": "Cancellation Reason",
  "noServices": "No chauffeur services found"
}
```

Note: Merge the `AdminDashboard.tabs` keys into the existing `AdminDashboard.tabs` object — don't overwrite it.

- [ ] **Step 2: Add corresponding keys to `rw.json`**

Add the same structure to `client/src/translations/rw.json` with French/Kinyarwanda translations. Use the English values as placeholders if unsure of translations — the user can update them later.

- [ ] **Step 3: Commit**

```bash
git add client/src/translations/eng.json client/src/translations/rw.json
git commit -m "feat(marketplace): add i18n strings for rental and chauffeur"
```

---

## Task 3: Create Rental React Query Hook

**Files:**
- Create: `client/src/hooks/useRentals.ts`

- [ ] **Step 1: Create the `useRentals.ts` hook**

Create `client/src/hooks/useRentals.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  CarRental,
  CreateRentalRequest,
  RentalVehicleListing,
  RentalStatus,
} from "@/lib/types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface RentalFilters {
  page?: number;
  pageSize?: number;
  city?: string;
  region?: string;
  category?: string;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: string;
  endDate?: string;
}

interface RentalListFilters {
  page?: number;
  pageSize?: number;
  status?: RentalStatus;
  role?: "renter" | "owner";
}

export function useAvailableRentals(filters: RentalFilters = {}) {
  return useQuery({
    queryKey: [queryKey.AVAILABLE_RENTALS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<RentalVehicleListing>>(
        `/api/v1/public/rentals/vehicles/available?${params.toString()}`
      );
    },
  });
}

export function useRentals(filters: RentalListFilters = {}) {
  return useQuery({
    queryKey: [queryKey.RENTALS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<CarRental>>(
        `/api/v1/rentals?${params.toString()}`
      );
    },
  });
}

export function useRental(rentalId: number | null) {
  return useQuery({
    queryKey: [queryKey.RENTAL, rentalId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: CarRental }>(
        `/api/v1/rentals/${rentalId}`
      );
    },
    enabled: !!rentalId,
  });
}

export function useRentalMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateRentals = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey.RENTALS] });
    queryClient.invalidateQueries({ queryKey: [queryKey.AVAILABLE_RENTALS] });
  };

  const createRental = useMutation({
    mutationFn: async (data: CreateRentalRequest) => {
      return api.post<{ success: boolean; data: CarRental }>(
        "/api/v1/rentals",
        data
      );
    },
    onSuccess: () => {
      toast.success(t("rental.booking.requestSent"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("rental.booking.requestError"),
        { className: "custom-error-toast" }
      );
    },
  });

  const approveRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/approve`);
    },
    onSuccess: () => {
      toast.success(t("rental.status.APPROVED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve rental", {
        className: "custom-error-toast",
      });
    },
  });

  const declineRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.patch(`/api/v1/rentals/${rentalId}/decline`, { reason });
    },
    onSuccess: () => {
      toast.success(t("rental.status.DECLINED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to decline rental", {
        className: "custom-error-toast",
      });
    },
  });

  const initializePayment = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post<{ success: boolean; data: { clientSecret: string } }>(
        `/api/v1/rentals/${rentalId}/initialize-payment`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Payment initialization failed", {
        className: "custom-error-toast",
      });
    },
  });

  const activateRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/activate`);
    },
    onSuccess: () => {
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to activate rental", {
        className: "custom-error-toast",
      });
    },
  });

  const completeRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/complete`);
    },
    onSuccess: () => {
      toast.success(t("rental.status.COMPLETED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to complete rental", {
        className: "custom-error-toast",
      });
    },
  });

  const cancelRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.patch(`/api/v1/rentals/${rentalId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success(t("rental.status.CANCELLED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel rental", {
        className: "custom-error-toast",
      });
    },
  });

  const releaseDeposit = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post(`/api/v1/rentals/${rentalId}/release-deposit`);
    },
    onSuccess: () => {
      toast.success("Deposit released");
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to release deposit", {
        className: "custom-error-toast",
      });
    },
  });

  const disputeRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.post(`/api/v1/rentals/${rentalId}/dispute`, { reason });
    },
    onSuccess: () => {
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to file dispute", {
        className: "custom-error-toast",
      });
    },
  });

  return {
    createRental: createRental.mutate,
    isCreating: createRental.isPending,
    approveRental: approveRental.mutate,
    isApproving: approveRental.isPending,
    declineRental: declineRental.mutate,
    isDeclining: declineRental.isPending,
    initializePayment: initializePayment.mutateAsync,
    isInitializingPayment: initializePayment.isPending,
    activateRental: activateRental.mutate,
    isActivating: activateRental.isPending,
    completeRental: completeRental.mutate,
    isCompleting: completeRental.isPending,
    cancelRental: cancelRental.mutate,
    isCancelling: cancelRental.isPending,
    releaseDeposit: releaseDeposit.mutate,
    isReleasingDeposit: releaseDeposit.isPending,
    disputeRental: disputeRental.mutate,
    isDisputing: disputeRental.isPending,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useRentals.ts
git commit -m "feat(marketplace): add useRentals React Query hook"
```

---

## Task 4: Create Chauffeur React Query Hook

**Files:**
- Create: `client/src/hooks/useChauffeur.ts`

- [ ] **Step 1: Create the `useChauffeur.ts` hook**

Create `client/src/hooks/useChauffeur.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  ChauffeurService,
  CreateChauffeurRequest,
  ChauffeurDriverListing,
  ChauffeurStatus,
} from "@/lib/types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface DriverFilters {
  page?: number;
  pageSize?: number;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: string;
  endDate?: string;
}

interface ServiceListFilters {
  page?: number;
  pageSize?: number;
  status?: ChauffeurStatus;
  role?: "passenger" | "driver";
}

export function useAvailableDrivers(filters: DriverFilters = {}) {
  return useQuery({
    queryKey: [queryKey.AVAILABLE_DRIVERS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurDriverListing>>(
        `/api/v1/public/chauffeur-drivers?${params.toString()}`
      );
    },
  });
}

export function useChauffeurServices(filters: ServiceListFilters = {}) {
  return useQuery({
    queryKey: [queryKey.CHAUFFEUR_SERVICES, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurService>>(
        `/api/v1/chauffeur-services?${params.toString()}`
      );
    },
  });
}

export function useChauffeurService(serviceId: number | null) {
  return useQuery({
    queryKey: [queryKey.CHAUFFEUR_SERVICE, serviceId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurService }>(
        `/api/v1/chauffeur-services/${serviceId}`
      );
    },
    enabled: !!serviceId,
  });
}

export function useChauffeurMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateChauffeur = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey.CHAUFFEUR_SERVICES] });
    queryClient.invalidateQueries({ queryKey: [queryKey.AVAILABLE_DRIVERS] });
  };

  const createService = useMutation({
    mutationFn: async (data: CreateChauffeurRequest) => {
      return api.post<{ success: boolean; data: ChauffeurService }>(
        "/api/v1/chauffeur-services",
        data
      );
    },
    onSuccess: () => {
      toast.success(t("chauffeur.booking.requestSent"));
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("chauffeur.booking.requestError"),
        { className: "custom-error-toast" }
      );
    },
  });

  const acceptService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/accept`);
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.ACCEPTED"));
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to accept service", {
        className: "custom-error-toast",
      });
    },
  });

  const declineService = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: number; reason: string }) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/decline`, { reason });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.DECLINED"));
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to decline service", {
        className: "custom-error-toast",
      });
    },
  });

  const initializePayment = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.post<{ success: boolean; data: { clientSecret: string } }>(
        `/api/v1/chauffeur-services/${serviceId}/initialize-payment`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Payment initialization failed", {
        className: "custom-error-toast",
      });
    },
  });

  const activateService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/activate`);
    },
    onSuccess: () => {
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to activate service", {
        className: "custom-error-toast",
      });
    },
  });

  const completeService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/complete`);
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.COMPLETED"));
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to complete service", {
        className: "custom-error-toast",
      });
    },
  });

  const cancelService = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: number; reason: string }) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.CANCELLED"));
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel service", {
        className: "custom-error-toast",
      });
    },
  });

  const disputeService = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: number; reason: string }) => {
      return api.post(`/api/v1/chauffeur-services/${serviceId}/dispute`, { reason });
    },
    onSuccess: () => {
      invalidateChauffeur();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to file dispute", {
        className: "custom-error-toast",
      });
    },
  });

  return {
    createService: createService.mutate,
    isCreating: createService.isPending,
    acceptService: acceptService.mutate,
    isAccepting: acceptService.isPending,
    declineService: declineService.mutate,
    isDeclining: declineService.isPending,
    initializePayment: initializePayment.mutateAsync,
    isInitializingPayment: initializePayment.isPending,
    activateService: activateService.mutate,
    isActivating: activateService.isPending,
    completeService: completeService.mutate,
    isCompleting: completeService.isPending,
    cancelService: cancelService.mutate,
    isCancelling: cancelService.isPending,
    disputeService: disputeService.mutate,
    isDisputing: disputeService.isPending,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useChauffeur.ts
git commit -m "feat(marketplace): add useChauffeur React Query hook"
```

---

## Task 5: Create Rental Card and List Components

**Files:**
- Create: `client/src/pages/marketplace/RentalCard.tsx`
- Create: `client/src/pages/marketplace/RentalList.tsx`

- [ ] **Step 1: Create `RentalCard.tsx`**

Create `client/src/pages/marketplace/RentalCard.tsx`:

```typescript
import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, MapPin, Gauge } from "lucide-react";
import type { RentalVehicleListing } from "@/lib/types";

interface RentalCardProps {
  vehicle: RentalVehicleListing;
  onBook: (vehicle: RentalVehicleListing) => void;
}

export const RentalCard: React.FC<RentalCardProps> = ({ vehicle, onBook }) => {
  const { t } = useTranslation();

  const imageUrl =
    vehicle.defaultImage?.url ||
    (vehicle.files.length > 0 ? vehicle.files[0].url : null);

  const CategoryIcon = vehicle.category === "MOTORBIKE" ? Bike : Car;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <Badge
          variant={vehicle.category === "MOTORBIKE" ? "secondary" : "default"}
          className="absolute top-2 right-2"
        >
          <CategoryIcon className="h-3 w-3 mr-1" />
          {t(`marketplace.filters.${vehicle.category.toLowerCase()}`)}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">
            {vehicle.make} {vehicle.model}
            {vehicle.year ? ` (${vehicle.year})` : ""}
          </h3>
          <p className="text-sm text-muted-foreground">
            {vehicle.user.name}
          </p>
        </div>

        <div className="flex gap-3 text-sm">
          {vehicle.hourlyRate && (
            <span className="font-medium">
              ${vehicle.hourlyRate}{t("rental.card.perHour")}
            </span>
          )}
          {vehicle.dailyRate && (
            <span className="font-medium">
              ${vehicle.dailyRate}{t("rental.card.perDay")}
            </span>
          )}
        </div>

        {vehicle.securityDeposit && (
          <p className="text-xs text-muted-foreground">
            {t("rental.card.deposit")}: ${vehicle.securityDeposit}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {vehicle.mileageLimit ? (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {t("rental.card.mileageLimit", { limit: vehicle.mileageLimit })}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {t("rental.card.unlimitedMileage")}
            </span>
          )}
        </div>

        {vehicle.pickupLocation && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {vehicle.pickupLocation.city}, {vehicle.pickupLocation.region}
          </p>
        )}

        <Button className="w-full" onClick={() => onBook(vehicle)}>
          {t("rental.card.bookNow")}
        </Button>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Create `RentalList.tsx`**

Create `client/src/pages/marketplace/RentalList.tsx`:

```typescript
import React from "react";
import { useTranslation } from "react-i18next";
import { RentalCard } from "./RentalCard";
import { useAvailableRentals } from "@/hooks/useRentals";
import { Loader2 } from "lucide-react";
import type { RentalVehicleListing, VehicleCategory } from "@/lib/types";

interface RentalListProps {
  filters: {
    city?: string;
    category?: VehicleCategory | "";
    minDailyRate?: number;
    maxDailyRate?: number;
    startDate?: string;
    endDate?: string;
  };
  onBook: (vehicle: RentalVehicleListing) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export const RentalList: React.FC<RentalListProps> = ({
  filters,
  onBook,
  page,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAvailableRentals({
    ...filters,
    page,
    pageSize: 12,
  });

  const vehicles = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("marketplace.filters.noResults")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("marketplace.filters.noResultsDescription")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <RentalCard key={vehicle.id} vehicle={vehicle} onBook={onBook} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/marketplace/RentalCard.tsx client/src/pages/marketplace/RentalList.tsx
git commit -m "feat(marketplace): add RentalCard and RentalList components"
```

---

## Task 6: Create Chauffeur Card and List Components

**Files:**
- Create: `client/src/pages/marketplace/ChauffeurCard.tsx`
- Create: `client/src/pages/marketplace/ChauffeurList.tsx`

- [ ] **Step 1: Create `ChauffeurCard.tsx`**

Create `client/src/pages/marketplace/ChauffeurCard.tsx`:

```typescript
import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Car, Bike } from "lucide-react";
import type { ChauffeurDriverListing } from "@/lib/types";

interface ChauffeurCardProps {
  driver: ChauffeurDriverListing;
  onBook: (driver: ChauffeurDriverListing) => void;
}

export const ChauffeurCard: React.FC<ChauffeurCardProps> = ({ driver, onBook }) => {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {driver.profileImage?.url ? (
              <img
                src={driver.profileImage.url}
                alt={driver.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{driver.name}</h3>
          </div>
        </div>

        {driver.chauffeurDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {driver.chauffeurDescription}
          </p>
        )}

        <div className="flex gap-3 text-sm">
          {driver.chauffeurHourlyRate && (
            <span className="font-medium">
              ${driver.chauffeurHourlyRate}{t("chauffeur.card.perHour")}
            </span>
          )}
          {driver.chauffeurDailyRate && (
            <span className="font-medium">
              ${driver.chauffeurDailyRate}{t("chauffeur.card.perDay")}
            </span>
          )}
        </div>

        {driver.vehicles.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("chauffeur.card.vehicles")}
            </p>
            <div className="flex flex-wrap gap-1">
              {driver.vehicles.map((v) => (
                <Badge key={v.id} variant="outline" className="text-xs">
                  {v.category === "MOTORBIKE" ? (
                    <Bike className="h-3 w-3 mr-1" />
                  ) : (
                    <Car className="h-3 w-3 mr-1" />
                  )}
                  {v.make} {v.model}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full" onClick={() => onBook(driver)}>
          {t("chauffeur.card.bookNow")}
        </Button>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Create `ChauffeurList.tsx`**

Create `client/src/pages/marketplace/ChauffeurList.tsx`:

```typescript
import React from "react";
import { useTranslation } from "react-i18next";
import { ChauffeurCard } from "./ChauffeurCard";
import { useAvailableDrivers } from "@/hooks/useChauffeur";
import { Loader2 } from "lucide-react";
import type { ChauffeurDriverListing } from "@/lib/types";

interface ChauffeurListProps {
  filters: {
    minHourlyRate?: number;
    maxHourlyRate?: number;
    minDailyRate?: number;
    maxDailyRate?: number;
    startDate?: string;
    endDate?: string;
  };
  onBook: (driver: ChauffeurDriverListing) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export const ChauffeurList: React.FC<ChauffeurListProps> = ({
  filters,
  onBook,
  page,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAvailableDrivers({
    ...filters,
    page,
    pageSize: 12,
  });

  const drivers = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("marketplace.filters.noResults")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("marketplace.filters.noResultsDescription")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => (
          <ChauffeurCard key={driver.id} driver={driver} onBook={onBook} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/marketplace/ChauffeurCard.tsx client/src/pages/marketplace/ChauffeurList.tsx
git commit -m "feat(marketplace): add ChauffeurCard and ChauffeurList components"
```

---

## Task 7: Create Rental Booking Modal

**Files:**
- Create: `client/src/pages/marketplace/RentalBookingModal.tsx`

- [ ] **Step 1: Create `RentalBookingModal.tsx`**

Create `client/src/pages/marketplace/RentalBookingModal.tsx`:

```typescript
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRentalMutations } from "@/hooks/useRentals";
import { differenceInHours, differenceInDays } from "date-fns";
import type { RentalVehicleListing, RentalType } from "@/lib/types";

interface RentalBookingModalProps {
  vehicle: RentalVehicleListing | null;
  open: boolean;
  onClose: () => void;
}

export const RentalBookingModal: React.FC<RentalBookingModalProps> = ({
  vehicle,
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const { createRental, isCreating } = useRentalMutations();

  const [rentalType, setRentalType] = useState<RentalType>("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const costBreakdown = useMemo(() => {
    if (!vehicle || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return null;

    let rentalCost = 0;
    if (rentalType === "HOURLY" && vehicle.hourlyRate) {
      const hours = differenceInHours(end, start);
      rentalCost = hours * parseFloat(vehicle.hourlyRate);
    } else if (rentalType === "DAILY" && vehicle.dailyRate) {
      const days = Math.max(1, differenceInDays(end, start));
      rentalCost = days * parseFloat(vehicle.dailyRate);
    }

    const deposit = vehicle.securityDeposit
      ? parseFloat(vehicle.securityDeposit)
      : 0;

    return {
      rentalCost: rentalCost.toFixed(2),
      deposit: deposit.toFixed(2),
      total: (rentalCost + deposit).toFixed(2),
    };
  }, [vehicle, startDate, endDate, rentalType]);

  const handleSubmit = () => {
    if (!vehicle || !startDate || !endDate) return;

    createRental(
      {
        vehicleId: vehicle.id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        rentalType,
        pickupNotes: pickupNotes || undefined,
        returnNotes: returnNotes || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          setStartDate("");
          setEndDate("");
          setPickupNotes("");
          setReturnNotes("");
        },
      }
    );
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rental.booking.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-medium">
              {vehicle.make} {vehicle.model}
              {vehicle.year ? ` (${vehicle.year})` : ""}
            </p>
            <p className="text-sm text-muted-foreground">{vehicle.user.name}</p>
          </div>

          <div>
            <Label>{t("rental.booking.rentalType")}</Label>
            <Select
              value={rentalType}
              onValueChange={(v) => setRentalType(v as RentalType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicle.hourlyRate && (
                  <SelectItem value="HOURLY">
                    {t("rental.booking.hourly")} (${vehicle.hourlyRate}/hr)
                  </SelectItem>
                )}
                {vehicle.dailyRate && (
                  <SelectItem value="DAILY">
                    {t("rental.booking.daily")} (${vehicle.dailyRate}/day)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("rental.booking.startDate")}</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("rental.booking.endDate")}</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("rental.booking.pickupNotes")}</Label>
            <Textarea
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder={t("rental.booking.pickupNotes")}
              rows={2}
            />
          </div>

          <div>
            <Label>{t("rental.booking.returnNotes")}</Label>
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder={t("rental.booking.returnNotes")}
              rows={2}
            />
          </div>

          {costBreakdown && (
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <p className="font-medium">{t("rental.booking.costBreakdown")}</p>
              <div className="flex justify-between">
                <span>{t("rental.booking.rentalCost")}</span>
                <span>${costBreakdown.rentalCost}</span>
              </div>
              {parseFloat(costBreakdown.deposit) > 0 && (
                <div className="flex justify-between">
                  <span>{t("rental.booking.securityDeposit")}</span>
                  <span>${costBreakdown.deposit}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1">
                <span>{t("rental.booking.total")}</span>
                <span>${costBreakdown.total}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isCreating || !startDate || !endDate}
          >
            {isCreating ? "..." : t("rental.booking.confirmBooking")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/marketplace/RentalBookingModal.tsx
git commit -m "feat(marketplace): add RentalBookingModal component"
```

---

## Task 8: Create Chauffeur Booking Modal

**Files:**
- Create: `client/src/pages/marketplace/ChauffeurBookingModal.tsx`

- [ ] **Step 1: Create `ChauffeurBookingModal.tsx`**

Create `client/src/pages/marketplace/ChauffeurBookingModal.tsx`:

```typescript
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car, Bike } from "lucide-react";
import { useChauffeurMutations } from "@/hooks/useChauffeur";
import { differenceInHours, differenceInDays } from "date-fns";
import type { ChauffeurDriverListing, ChauffeurServiceType } from "@/lib/types";

interface ChauffeurBookingModalProps {
  driver: ChauffeurDriverListing | null;
  open: boolean;
  onClose: () => void;
}

export const ChauffeurBookingModal: React.FC<ChauffeurBookingModalProps> = ({
  driver,
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const { createService, isCreating } = useChauffeurMutations();

  const [serviceType, setServiceType] = useState<ChauffeurServiceType>("DAILY");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [dropoffNotes, setDropoffNotes] = useState("");

  const costBreakdown = useMemo(() => {
    if (!driver || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return null;

    let cost = 0;
    if (serviceType === "HOURLY" && driver.chauffeurHourlyRate) {
      const hours = differenceInHours(end, start);
      cost = hours * parseFloat(driver.chauffeurHourlyRate);
    } else if (serviceType === "DAILY" && driver.chauffeurDailyRate) {
      const days = Math.max(1, differenceInDays(end, start));
      cost = days * parseFloat(driver.chauffeurDailyRate);
    }

    return { total: cost.toFixed(2) };
  }, [driver, startDate, endDate, serviceType]);

  const handleSubmit = () => {
    if (!driver || !selectedVehicleId || !startDate || !endDate) return;

    createService(
      {
        vehicleId: selectedVehicleId,
        driverId: driver.id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        serviceType,
        pickupNotes: pickupNotes || undefined,
        dropoffNotes: dropoffNotes || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          setStartDate("");
          setEndDate("");
          setPickupNotes("");
          setDropoffNotes("");
          setSelectedVehicleId(null);
        },
      }
    );
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("chauffeur.booking.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-medium">{driver.name}</p>
            {driver.chauffeurDescription && (
              <p className="text-sm text-muted-foreground">
                {driver.chauffeurDescription}
              </p>
            )}
          </div>

          <div>
            <Label>{t("chauffeur.booking.serviceType")}</Label>
            <Select
              value={serviceType}
              onValueChange={(v) => setServiceType(v as ChauffeurServiceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {driver.chauffeurHourlyRate && (
                  <SelectItem value="HOURLY">
                    {t("chauffeur.booking.hourly")} (${driver.chauffeurHourlyRate}/hr)
                  </SelectItem>
                )}
                {driver.chauffeurDailyRate && (
                  <SelectItem value="DAILY">
                    {t("chauffeur.booking.daily")} (${driver.chauffeurDailyRate}/day)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {driver.vehicles.length > 0 && (
            <div>
              <Label>{t("chauffeur.booking.selectVehicle")}</Label>
              <Select
                value={selectedVehicleId?.toString() || ""}
                onValueChange={(v) => setSelectedVehicleId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chauffeur.booking.selectVehicle")} />
                </SelectTrigger>
                <SelectContent>
                  {driver.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      <span className="flex items-center gap-1">
                        {v.category === "MOTORBIKE" ? (
                          <Bike className="h-3 w-3" />
                        ) : (
                          <Car className="h-3 w-3" />
                        )}
                        {v.make} {v.model}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("chauffeur.booking.startDate")}</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("chauffeur.booking.endDate")}</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("chauffeur.booking.pickupNotes")}</Label>
            <Textarea
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>{t("chauffeur.booking.dropoffNotes")}</Label>
            <Textarea
              value={dropoffNotes}
              onChange={(e) => setDropoffNotes(e.target.value)}
              rows={2}
            />
          </div>

          {costBreakdown && (
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <p className="font-medium">{t("chauffeur.booking.costBreakdown")}</p>
              <div className="flex justify-between font-medium">
                <span>{t("chauffeur.booking.total")}</span>
                <span>${costBreakdown.total}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isCreating || !startDate || !endDate || !selectedVehicleId}
          >
            {isCreating ? "..." : t("chauffeur.booking.confirmBooking")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/marketplace/ChauffeurBookingModal.tsx
git commit -m "feat(marketplace): add ChauffeurBookingModal component"
```

---

## Task 9: Create Marketplace Page

**Files:**
- Create: `client/src/pages/marketplace/index.tsx`

- [ ] **Step 1: Create the marketplace page**

Create `client/src/pages/marketplace/index.tsx`:

```typescript
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { RentalList } from "./RentalList";
import { ChauffeurList } from "./ChauffeurList";
import { RentalBookingModal } from "./RentalBookingModal";
import { ChauffeurBookingModal } from "./ChauffeurBookingModal";
import BookARide from "@/pages/ride/book";
import type {
  RentalVehicleListing,
  ChauffeurDriverListing,
  VehicleCategory,
} from "@/lib/types";

type ServiceTab = "rides" | "rentals" | "chauffeur";

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as ServiceTab) || "rides";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
    setRentalPage(1);
    setChauffeurPage(1);
  };

  // Rental filters
  const [rentalCity, setRentalCity] = useState("");
  const [rentalCategory, setRentalCategory] = useState<VehicleCategory | "">("");
  const [rentalMinPrice, setRentalMinPrice] = useState("");
  const [rentalMaxPrice, setRentalMaxPrice] = useState("");
  const [rentalPage, setRentalPage] = useState(1);

  // Chauffeur filters
  const [chauffeurMinPrice, setChauffeurMinPrice] = useState("");
  const [chauffeurMaxPrice, setChauffeurMaxPrice] = useState("");
  const [chauffeurPage, setChauffeurPage] = useState(1);

  // Booking modals
  const [selectedRentalVehicle, setSelectedRentalVehicle] =
    useState<RentalVehicleListing | null>(null);
  const [selectedChauffeurDriver, setSelectedChauffeurDriver] =
    useState<ChauffeurDriverListing | null>(null);

  const clearRentalFilters = () => {
    setRentalCity("");
    setRentalCategory("");
    setRentalMinPrice("");
    setRentalMaxPrice("");
    setRentalPage(1);
  };

  const clearChauffeurFilters = () => {
    setChauffeurMinPrice("");
    setChauffeurMaxPrice("");
    setChauffeurPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t("marketplace.title")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="rides">{t("marketplace.tabs.rides")}</TabsTrigger>
          <TabsTrigger value="rentals">{t("marketplace.tabs.rentals")}</TabsTrigger>
          <TabsTrigger value="chauffeur">{t("marketplace.tabs.chauffeur")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rides">
          <BookARide />
        </TabsContent>

        <TabsContent value="rentals">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder={t("marketplace.filters.location")}
                  value={rentalCity}
                  onChange={(e) => setRentalCity(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-[150px]">
                <Select
                  value={rentalCategory}
                  onValueChange={(v) =>
                    setRentalCategory(v as VehicleCategory | "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("marketplace.filters.vehicleCategory")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">
                      {t("marketplace.filters.car")}
                    </SelectItem>
                    <SelectItem value="MOTORBIKE">
                      {t("marketplace.filters.motorbike")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <Input
                  type="number"
                  placeholder={t("marketplace.filters.minPrice")}
                  value={rentalMinPrice}
                  onChange={(e) => setRentalMinPrice(e.target.value)}
                />
              </div>
              <div className="w-[120px]">
                <Input
                  type="number"
                  placeholder={t("marketplace.filters.maxPrice")}
                  value={rentalMaxPrice}
                  onChange={(e) => setRentalMaxPrice(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={clearRentalFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <RentalList
              filters={{
                city: rentalCity || undefined,
                category: rentalCategory || undefined,
                minDailyRate: rentalMinPrice
                  ? parseFloat(rentalMinPrice)
                  : undefined,
                maxDailyRate: rentalMaxPrice
                  ? parseFloat(rentalMaxPrice)
                  : undefined,
              }}
              onBook={setSelectedRentalVehicle}
              page={rentalPage}
              onPageChange={setRentalPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="chauffeur">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-[120px]">
                <Input
                  type="number"
                  placeholder={t("marketplace.filters.minPrice")}
                  value={chauffeurMinPrice}
                  onChange={(e) => setChauffeurMinPrice(e.target.value)}
                />
              </div>
              <div className="w-[120px]">
                <Input
                  type="number"
                  placeholder={t("marketplace.filters.maxPrice")}
                  value={chauffeurMaxPrice}
                  onChange={(e) => setChauffeurMaxPrice(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={clearChauffeurFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ChauffeurList
              filters={{
                minDailyRate: chauffeurMinPrice
                  ? parseFloat(chauffeurMinPrice)
                  : undefined,
                maxDailyRate: chauffeurMaxPrice
                  ? parseFloat(chauffeurMaxPrice)
                  : undefined,
              }}
              onBook={setSelectedChauffeurDriver}
              page={chauffeurPage}
              onPageChange={setChauffeurPage}
            />
          </div>
        </TabsContent>
      </Tabs>

      <RentalBookingModal
        vehicle={selectedRentalVehicle}
        open={!!selectedRentalVehicle}
        onClose={() => setSelectedRentalVehicle(null)}
      />

      <ChauffeurBookingModal
        driver={selectedChauffeurDriver}
        open={!!selectedChauffeurDriver}
        onClose={() => setSelectedChauffeurDriver(null)}
      />
    </div>
  );
};

export default Marketplace;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/marketplace/
git commit -m "feat(marketplace): add unified marketplace page with tabs"
```

---

## Task 10: Update Router and Navigation

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Layout.tsx` (or navbar component)

- [ ] **Step 1: Add marketplace route and redirect to `App.tsx`**

Open `client/src/App.tsx`. Add the import at the top:

```typescript
import Marketplace from "@/pages/marketplace";
import { Navigate } from "react-router-dom";
```

Then find the `<Route path="book-a-ride" element={<BookARide />} />` line. Replace it with:

```typescript
<Route path="marketplace" element={<Marketplace />} />
<Route path="book-a-ride" element={<Navigate to="/marketplace?tab=rides" replace />} />
```

- [ ] **Step 2: Update navbar link**

Open the navbar/layout component (likely `client/src/components/Layout.tsx` or similar). Find the link to `/book-a-ride` and change it to `/marketplace`. Also update the link text to use `t("marketplace.title")` or "Marketplace".

Look for patterns like:
```typescript
// Before
<Link to="/book-a-ride">{t("navbar.passenger")}</Link>
// After
<Link to="/marketplace">{t("marketplace.title")}</Link>
```

Keep the existing `/book-a-ride` text as well if it's used elsewhere — the redirect handles backward compatibility.

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx vite build 2>&1 | tail -10`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/Layout.tsx
git commit -m "feat(marketplace): add marketplace route and redirect /book-a-ride"
```

---

## Task 11: Create Rental Settings Component for Vehicle Page

**Files:**
- Create: `client/src/components/RentalSettings.tsx`
- Modify: `client/src/pages/Vehicle.tsx`

- [ ] **Step 1: Create `RentalSettings.tsx`**

Create `client/src/components/RentalSettings.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FuelPolicy } from "@/lib/types";

interface RentalSettingsProps {
  vehicleId: number;
  initialData: {
    isAvailableForRental: boolean;
    hourlyRate: string | null;
    dailyRate: string | null;
    securityDeposit: string | null;
    rentalDescription: string | null;
    mileageLimit: number | null;
    fuelPolicy: FuelPolicy;
  };
}

export const RentalSettings: React.FC<RentalSettingsProps> = ({
  vehicleId,
  initialData,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isAvailable, setIsAvailable] = useState(initialData.isAvailableForRental);
  const [hourlyRate, setHourlyRate] = useState(initialData.hourlyRate || "");
  const [dailyRate, setDailyRate] = useState(initialData.dailyRate || "");
  const [securityDeposit, setSecurityDeposit] = useState(
    initialData.securityDeposit || ""
  );
  const [description, setDescription] = useState(
    initialData.rentalDescription || ""
  );
  const [mileageLimit, setMileageLimit] = useState(
    initialData.mileageLimit?.toString() || ""
  );
  const [fuelPolicy, setFuelPolicy] = useState<FuelPolicy>(
    initialData.fuelPolicy || "FULL_TO_FULL"
  );

  useEffect(() => {
    setIsAvailable(initialData.isAvailableForRental);
    setHourlyRate(initialData.hourlyRate || "");
    setDailyRate(initialData.dailyRate || "");
    setSecurityDeposit(initialData.securityDeposit || "");
    setDescription(initialData.rentalDescription || "");
    setMileageLimit(initialData.mileageLimit?.toString() || "");
    setFuelPolicy(initialData.fuelPolicy || "FULL_TO_FULL");
  }, [initialData]);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      return api.put(`/api/v1/vehicles/${vehicleId}`, {
        isAvailableForRental: isAvailable,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        rentalDescription: description || null,
        mileageLimit: mileageLimit ? parseInt(mileageLimit) : null,
        fuelPolicy,
      });
    },
    onSuccess: () => {
      toast.success(t("rental.settings.saved"));
      queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE] });
      queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("rental.settings.saveError"),
        { className: "custom-error-toast" }
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("rental.settings.title")}
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </CardTitle>
      </CardHeader>
      {isAvailable && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("rental.settings.hourlyRate")}</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("rental.settings.dailyRate")}</Label>
              <Input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("rental.settings.securityDeposit")}</Label>
            <Input
              type="number"
              step="0.01"
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value)}
            />
          </div>

          <div>
            <Label>{t("rental.settings.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("rental.settings.mileageLimit")}</Label>
              <Input
                type="number"
                value={mileageLimit}
                onChange={(e) => setMileageLimit(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("rental.settings.fuelPolicy")}</Label>
              <Select
                value={fuelPolicy}
                onValueChange={(v) => setFuelPolicy(v as FuelPolicy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TO_FULL">
                    {t("rental.settings.fuelPolicies.FULL_TO_FULL")}
                  </SelectItem>
                  <SelectItem value="SAME_LEVEL">
                    {t("rental.settings.fuelPolicies.SAME_LEVEL")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => saveSettings()} disabled={isPending}>
            {isPending ? "..." : t("rental.settings.save")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Add RentalSettings to Vehicle page**

Open `client/src/pages/Vehicle.tsx`. Add the import:

```typescript
import { RentalSettings } from "@/components/RentalSettings";
```

Then find a suitable location after the existing vehicle details section and add:

```typescript
<RentalSettings
  vehicleId={vehicle.id}
  initialData={{
    isAvailableForRental: vehicle.isAvailableForRental ?? false,
    hourlyRate: vehicle.hourlyRate ?? null,
    dailyRate: vehicle.dailyRate ?? null,
    securityDeposit: vehicle.securityDeposit ?? null,
    rentalDescription: vehicle.rentalDescription ?? null,
    mileageLimit: vehicle.mileageLimit ?? null,
    fuelPolicy: vehicle.fuelPolicy ?? "FULL_TO_FULL",
  }}
/>
```

Note: The vehicle object from the API may not include rental fields yet. If TypeScript complains about missing properties on the Vehicle interface, update the `Vehicle` interface in `lib/types.ts` to include them:

```typescript
// Add to existing Vehicle interface
isAvailableForRental?: boolean;
hourlyRate?: string | null;
dailyRate?: string | null;
securityDeposit?: string | null;
rentalDescription?: string | null;
mileageLimit?: number | null;
fuelPolicy?: FuelPolicy;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/RentalSettings.tsx client/src/pages/Vehicle.tsx client/src/lib/types.ts
git commit -m "feat(marketplace): add rental settings to vehicle page"
```

---

## Task 12: Create Chauffeur Settings Component for Profile Page

**Files:**
- Create: `client/src/components/ChauffeurSettings.tsx`
- Modify: `client/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Create `ChauffeurSettings.tsx`**

Create `client/src/components/ChauffeurSettings.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface ChauffeurSettingsProps {
  initialData: {
    isAvailableForChauffeur: boolean;
    chauffeurHourlyRate: string | null;
    chauffeurDailyRate: string | null;
    chauffeurDescription: string | null;
  };
}

export const ChauffeurSettings: React.FC<ChauffeurSettingsProps> = ({
  initialData,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isAvailable, setIsAvailable] = useState(
    initialData.isAvailableForChauffeur
  );
  const [hourlyRate, setHourlyRate] = useState(
    initialData.chauffeurHourlyRate || ""
  );
  const [dailyRate, setDailyRate] = useState(
    initialData.chauffeurDailyRate || ""
  );
  const [description, setDescription] = useState(
    initialData.chauffeurDescription || ""
  );

  useEffect(() => {
    setIsAvailable(initialData.isAvailableForChauffeur);
    setHourlyRate(initialData.chauffeurHourlyRate || "");
    setDailyRate(initialData.chauffeurDailyRate || "");
    setDescription(initialData.chauffeurDescription || "");
  }, [initialData]);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      return api.put("/api/v1/users/profile", {
        isAvailableForChauffeur: isAvailable,
        chauffeurHourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        chauffeurDailyRate: dailyRate ? parseFloat(dailyRate) : null,
        chauffeurDescription: description || null,
      });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.settings.saved"));
      queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("chauffeur.settings.saveError"),
        { className: "custom-error-toast" }
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("chauffeur.settings.title")}
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </CardTitle>
      </CardHeader>
      {isAvailable && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("chauffeur.settings.hourlyRate")}</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("chauffeur.settings.dailyRate")}</Label>
              <Input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t("chauffeur.settings.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("chauffeur.settings.description")}
              rows={3}
            />
          </div>

          <Button onClick={() => saveSettings()} disabled={isPending}>
            {isPending ? "..." : t("chauffeur.settings.save")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Add ChauffeurSettings to Profile page**

Open `client/src/pages/ProfilePage.tsx`. Add the import:

```typescript
import { ChauffeurSettings } from "@/components/ChauffeurSettings";
```

Add a new tab entry to the `tabs` array:

```typescript
{ id: "chauffeur", label: t("chauffeur.settings.title") },
```

Then add a new section in the tab content rendering:

```typescript
{activeSection === "chauffeur" && (
  <ChauffeurSettings
    initialData={{
      isAvailableForChauffeur: user?.isAvailableForChauffeur ?? false,
      chauffeurHourlyRate: user?.chauffeurHourlyRate ?? null,
      chauffeurDailyRate: user?.chauffeurDailyRate ?? null,
      chauffeurDescription: user?.chauffeurDescription ?? null,
    }}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChauffeurSettings.tsx client/src/pages/ProfilePage.tsx
git commit -m "feat(marketplace): add chauffeur settings to profile page"
```

---

## Task 13: Create Admin Rental Hook and Tab

**Files:**
- Create: `client/src/hooks/useAdminRentals.ts`
- Create: `client/src/pages/admin/tabs/RentalsTab.tsx`

- [ ] **Step 1: Create `useAdminRentals.ts`**

Create `client/src/hooks/useAdminRentals.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { CarRental, RentalSettings, RentalStatus } from "@/lib/types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface AdminRentalFilters {
  page?: number;
  pageSize?: number;
  status?: RentalStatus;
}

export function useAdminRentals(filters: AdminRentalFilters = {}) {
  return useQuery({
    queryKey: ["admin", "rentals", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<CarRental>>(
        `/api/v1/admin/rentals?${params.toString()}`
      );
    },
  });
}

export function useAdminRentalDetail(rentalId: number | null) {
  return useQuery({
    queryKey: ["admin", "rental", rentalId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: CarRental }>(
        `/api/v1/admin/rentals/${rentalId}`
      );
    },
    enabled: !!rentalId,
  });
}

export function useAdminRentalSettings() {
  return useQuery({
    queryKey: ["admin", "rentalSettings"],
    queryFn: async () => {
      return api.get<{ success: boolean; data: RentalSettings }>(
        "/api/v1/admin/rentals/settings"
      );
    },
  });
}

export function useAdminRentalMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "rentals"] });
  };

  const forceCancel = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.patch(`/api/v1/admin/rentals/${rentalId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success("Rental cancelled");
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel rental", {
        className: "custom-error-toast",
      });
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/admin/rentals/${rentalId}/resolve-dispute`);
    },
    onSuccess: () => {
      toast.success("Dispute resolved");
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resolve dispute", {
        className: "custom-error-toast",
      });
    },
  });

  const refundDeposit = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post(`/api/v1/admin/rentals/${rentalId}/refund-deposit`);
    },
    onSuccess: () => {
      toast.success("Deposit refunded");
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to refund deposit", {
        className: "custom-error-toast",
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<RentalSettings>) => {
      return api.put("/api/v1/admin/rentals/settings", data);
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "rentalSettings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update settings", {
        className: "custom-error-toast",
      });
    },
  });

  return {
    forceCancel: forceCancel.mutate,
    isCancelling: forceCancel.isPending,
    resolveDispute: resolveDispute.mutate,
    isResolvingDispute: resolveDispute.isPending,
    refundDeposit: refundDeposit.mutate,
    isRefundingDeposit: refundDeposit.isPending,
    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,
  };
}
```

- [ ] **Step 2: Create `RentalsTab.tsx`**

Create `client/src/pages/admin/tabs/RentalsTab.tsx`:

```typescript
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminRentals, useAdminRentalMutations } from "@/hooks/useAdminRentals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { CarRental, RentalStatus } from "@/lib/types";

const STATUSES: (RentalStatus | "ALL")[] = [
  "ALL",
  "REQUESTED",
  "APPROVED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const statusColors: Record<RentalStatus, string> = {
  REQUESTED: "bg-yellow-500",
  APPROVED: "bg-blue-500",
  DECLINED: "bg-red-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-gray-500",
  CANCELLED: "bg-red-400",
  DISPUTED: "bg-orange-500",
};

export const RentalsTab: React.FC = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<RentalStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRental, setSelectedRental] = useState<CarRental | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data, isLoading } = useAdminRentals({
    page,
    pageSize: 20,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const { forceCancel, isCancelling, resolveDispute, refundDeposit } =
    useAdminRentalMutations();

  const rentals = data?.data || [];
  const pagination = data?.pagination;

  const filtered = rentals.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.renter?.name?.toLowerCase().includes(term) ||
      r.owner?.name?.toLowerCase().includes(term) ||
      r.vehicle?.make?.toLowerCase().includes(term) ||
      r.vehicle?.model?.toLowerCase().includes(term)
    );
  });

  const handleForceCancel = (rentalId: number) => {
    if (!cancelReason.trim()) return;
    forceCancel(
      { rentalId, reason: cancelReason },
      {
        onSuccess: () => {
          setShowCancelDialog(false);
          setCancelReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("adminRentals.title")}</h2>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
          >
            {status === "ALL" ? "All" : t(`rental.status.${status}`)}
          </Button>
        ))}
      </div>

      <Input
        placeholder={t("adminRentals.searchPlaceholder")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("adminRentals.noRentals")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">{t("adminRentals.table.id")}</th>
                <th className="p-2">{t("adminRentals.table.vehicle")}</th>
                <th className="p-2">{t("adminRentals.table.category")}</th>
                <th className="p-2">{t("adminRentals.table.renter")}</th>
                <th className="p-2">{t("adminRentals.table.owner")}</th>
                <th className="p-2">{t("adminRentals.table.dates")}</th>
                <th className="p-2">{t("adminRentals.table.amount")}</th>
                <th className="p-2">{t("adminRentals.table.status")}</th>
                <th className="p-2">{t("adminRentals.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rental) => (
                <tr key={rental.id} className="border-b">
                  <td className="p-2">#{rental.id}</td>
                  <td className="p-2">
                    {rental.vehicle?.make} {rental.vehicle?.model}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline">
                      {rental.vehicle?.category || "CAR"}
                    </Badge>
                  </td>
                  <td className="p-2">{rental.renter?.name}</td>
                  <td className="p-2">{rental.owner?.name}</td>
                  <td className="p-2">
                    {format(new Date(rental.startDate), "MMM d")} -{" "}
                    {format(new Date(rental.endDate), "MMM d")}
                  </td>
                  <td className="p-2">${rental.totalAmount}</td>
                  <td className="p-2">
                    <Badge className={statusColors[rental.status]}>
                      {t(`rental.status.${rental.status}`)}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRental(rental)}
                    >
                      {t("adminRentals.view")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="py-1 px-2 text-sm">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedRental}
        onOpenChange={(o) => !o && setSelectedRental(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rental #{selectedRental?.id}</DialogTitle>
          </DialogHeader>
          {selectedRental && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-medium">Vehicle</p>
                  <p>
                    {selectedRental.vehicle?.make} {selectedRental.vehicle?.model}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <Badge className={statusColors[selectedRental.status]}>
                    {t(`rental.status.${selectedRental.status}`)}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">Renter</p>
                  <p>{selectedRental.renter?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Owner</p>
                  <p>{selectedRental.owner?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Dates</p>
                  <p>
                    {format(new Date(selectedRental.startDate), "PPp")} -{" "}
                    {format(new Date(selectedRental.endDate), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Amount</p>
                  <p>${selectedRental.totalAmount}</p>
                </div>
                <div>
                  <p className="font-medium">Deposit</p>
                  <p>
                    ${selectedRental.securityDepositAmount}
                    {selectedRental.depositRefunded ? " (refunded)" : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {selectedRental.status === "DISPUTED" && (
                  <Button
                    size="sm"
                    onClick={() => resolveDispute(selectedRental.id)}
                  >
                    {t("adminRentals.resolveDispute")}
                  </Button>
                )}
                {!selectedRental.depositRefunded &&
                  ["COMPLETED", "CANCELLED"].includes(selectedRental.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refundDeposit(selectedRental.id)}
                    >
                      {t("adminRentals.refundDeposit")}
                    </Button>
                  )}
                {!["COMPLETED", "CANCELLED"].includes(selectedRental.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setShowCancelDialog(true);
                    }}
                  >
                    {t("adminRentals.forceCancel")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminRentals.forceCancel")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("adminRentals.cancelReason")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button
            variant="destructive"
            disabled={isCancelling || !cancelReason.trim()}
            onClick={() =>
              selectedRental && handleForceCancel(selectedRental.id)
            }
          >
            {isCancelling ? "..." : t("adminRentals.forceCancel")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useAdminRentals.ts client/src/pages/admin/tabs/RentalsTab.tsx
git commit -m "feat(admin): add rentals management tab and hook"
```

---

## Task 14: Create Admin Chauffeur Hook and Tab

**Files:**
- Create: `client/src/hooks/useAdminChauffeur.ts`
- Create: `client/src/pages/admin/tabs/ChauffeurTab.tsx`

- [ ] **Step 1: Create `useAdminChauffeur.ts`**

Create `client/src/hooks/useAdminChauffeur.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { ChauffeurService, ChauffeurSettings, ChauffeurStatus } from "@/lib/types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface AdminChauffeurFilters {
  page?: number;
  pageSize?: number;
  status?: ChauffeurStatus;
}

export function useAdminChauffeurServices(filters: AdminChauffeurFilters = {}) {
  return useQuery({
    queryKey: ["admin", "chauffeurServices", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurService>>(
        `/api/v1/admin/chauffeur-services?${params.toString()}`
      );
    },
  });
}

export function useAdminChauffeurDetail(serviceId: number | null) {
  return useQuery({
    queryKey: ["admin", "chauffeurService", serviceId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurService }>(
        `/api/v1/admin/chauffeur-services/${serviceId}`
      );
    },
    enabled: !!serviceId,
  });
}

export function useAdminChauffeurSettings() {
  return useQuery({
    queryKey: ["admin", "chauffeurSettings"],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurSettings }>(
        "/api/v1/admin/chauffeur-services/settings"
      );
    },
  });
}

export function useAdminChauffeurMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "chauffeurServices"] });
  };

  const forceCancel = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: number; reason: string }) => {
      return api.patch(`/api/v1/admin/chauffeur-services/${serviceId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success("Service cancelled");
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel service", {
        className: "custom-error-toast",
      });
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/admin/chauffeur-services/${serviceId}/resolve-dispute`);
    },
    onSuccess: () => {
      toast.success("Dispute resolved");
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resolve dispute", {
        className: "custom-error-toast",
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<ChauffeurSettings>) => {
      return api.put("/api/v1/admin/chauffeur-services/settings", data);
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "chauffeurSettings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update settings", {
        className: "custom-error-toast",
      });
    },
  });

  return {
    forceCancel: forceCancel.mutate,
    isCancelling: forceCancel.isPending,
    resolveDispute: resolveDispute.mutate,
    isResolvingDispute: resolveDispute.isPending,
    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,
  };
}
```

- [ ] **Step 2: Create `ChauffeurTab.tsx`**

Create `client/src/pages/admin/tabs/ChauffeurTab.tsx`:

```typescript
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminChauffeurServices,
  useAdminChauffeurMutations,
} from "@/hooks/useAdminChauffeur";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { ChauffeurService, ChauffeurStatus } from "@/lib/types";

const STATUSES: (ChauffeurStatus | "ALL")[] = [
  "ALL",
  "REQUESTED",
  "ACCEPTED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const statusColors: Record<ChauffeurStatus, string> = {
  REQUESTED: "bg-yellow-500",
  ACCEPTED: "bg-blue-500",
  DECLINED: "bg-red-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-gray-500",
  CANCELLED: "bg-red-400",
  DISPUTED: "bg-orange-500",
};

export const ChauffeurTab: React.FC = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<ChauffeurStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedService, setSelectedService] = useState<ChauffeurService | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data, isLoading } = useAdminChauffeurServices({
    page,
    pageSize: 20,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const { forceCancel, isCancelling, resolveDispute } =
    useAdminChauffeurMutations();

  const services = data?.data || [];
  const pagination = data?.pagination;

  const filtered = services.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.passenger?.name?.toLowerCase().includes(term) ||
      s.driver?.name?.toLowerCase().includes(term) ||
      s.vehicle?.make?.toLowerCase().includes(term) ||
      s.vehicle?.model?.toLowerCase().includes(term)
    );
  });

  const handleForceCancel = (serviceId: number) => {
    if (!cancelReason.trim()) return;
    forceCancel(
      { serviceId, reason: cancelReason },
      {
        onSuccess: () => {
          setShowCancelDialog(false);
          setCancelReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("adminChauffeur.title")}</h2>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
          >
            {status === "ALL" ? "All" : t(`chauffeur.status.${status}`)}
          </Button>
        ))}
      </div>

      <Input
        placeholder={t("adminChauffeur.searchPlaceholder")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("adminChauffeur.noServices")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">{t("adminChauffeur.table.id")}</th>
                <th className="p-2">{t("adminChauffeur.table.driver")}</th>
                <th className="p-2">{t("adminChauffeur.table.passenger")}</th>
                <th className="p-2">{t("adminChauffeur.table.vehicle")}</th>
                <th className="p-2">{t("adminChauffeur.table.type")}</th>
                <th className="p-2">{t("adminChauffeur.table.dates")}</th>
                <th className="p-2">{t("adminChauffeur.table.amount")}</th>
                <th className="p-2">{t("adminChauffeur.table.status")}</th>
                <th className="p-2">{t("adminChauffeur.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service) => (
                <tr key={service.id} className="border-b">
                  <td className="p-2">#{service.id}</td>
                  <td className="p-2">{service.driver?.name}</td>
                  <td className="p-2">{service.passenger?.name}</td>
                  <td className="p-2">
                    {service.vehicle?.make} {service.vehicle?.model}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline">{service.serviceType}</Badge>
                  </td>
                  <td className="p-2">
                    {format(new Date(service.startDate), "MMM d")} -{" "}
                    {format(new Date(service.endDate), "MMM d")}
                  </td>
                  <td className="p-2">${service.totalAmount}</td>
                  <td className="p-2">
                    <Badge className={statusColors[service.status]}>
                      {t(`chauffeur.status.${service.status}`)}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedService(service)}
                    >
                      {t("adminChauffeur.view")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="py-1 px-2 text-sm">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedService}
        onOpenChange={(o) => !o && setSelectedService(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chauffeur Service #{selectedService?.id}</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-medium">Driver</p>
                  <p>{selectedService.driver?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Passenger</p>
                  <p>{selectedService.passenger?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Vehicle</p>
                  <p>
                    {selectedService.vehicle?.make} {selectedService.vehicle?.model}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <Badge className={statusColors[selectedService.status]}>
                    {t(`chauffeur.status.${selectedService.status}`)}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">Dates</p>
                  <p>
                    {format(new Date(selectedService.startDate), "PPp")} -{" "}
                    {format(new Date(selectedService.endDate), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Amount</p>
                  <p>${selectedService.totalAmount}</p>
                </div>
                <div>
                  <p className="font-medium">Type</p>
                  <p>{selectedService.serviceType}</p>
                </div>
              </div>

              {selectedService.pickupLocation && (
                <div>
                  <p className="font-medium">Pickup</p>
                  <p>
                    {selectedService.pickupLocation.city},{" "}
                    {selectedService.pickupLocation.region}
                  </p>
                </div>
              )}

              {selectedService.dropoffLocation && (
                <div>
                  <p className="font-medium">Dropoff</p>
                  <p>
                    {selectedService.dropoffLocation.city},{" "}
                    {selectedService.dropoffLocation.region}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedService.status === "DISPUTED" && (
                  <Button
                    size="sm"
                    onClick={() => resolveDispute(selectedService.id)}
                  >
                    {t("adminChauffeur.resolveDispute")}
                  </Button>
                )}
                {!["COMPLETED", "CANCELLED"].includes(selectedService.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    {t("adminChauffeur.forceCancel")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminChauffeur.forceCancel")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("adminChauffeur.cancelReason")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button
            variant="destructive"
            disabled={isCancelling || !cancelReason.trim()}
            onClick={() =>
              selectedService && handleForceCancel(selectedService.id)
            }
          >
            {isCancelling ? "..." : t("adminChauffeur.forceCancel")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useAdminChauffeur.ts client/src/pages/admin/tabs/ChauffeurTab.tsx
git commit -m "feat(admin): add chauffeur services management tab and hook"
```

---

## Task 15: Register Admin Tabs in Dashboard

**Files:**
- Modify: `client/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Add imports to `AdminDashboard.tsx`**

Open `client/src/pages/admin/AdminDashboard.tsx` and add:

```typescript
import { RentalsTab } from "./tabs/RentalsTab";
import { ChauffeurTab } from "./tabs/ChauffeurTab";
import { CarFront, UserCheck } from "lucide-react";
```

- [ ] **Step 2: Add tab types**

Find the `activeTab` state type union and add `"rentals" | "chauffeurServices"`:

```typescript
// Before:
const [activeTab, setActiveTab] = useState<"dashboard" | "users" | ... >("dashboard");
// After:
const [activeTab, setActiveTab] = useState<"dashboard" | "users" | ... | "rentals" | "chauffeurServices">("dashboard");
```

- [ ] **Step 3: Add tab entries**

Find the `tabs` array and add the new entries (place them after "vehicles"):

```typescript
{
  id: "rentals",
  icon: CarFront,
  label: t("AdminDashboard.tabs.rentals"),
},
{
  id: "chauffeurServices",
  icon: UserCheck,
  label: t("AdminDashboard.tabs.chauffeurServices"),
},
```

- [ ] **Step 4: Add TabsContent**

Find the `<Tabs>` component JSX and add the new `<TabsContent>` blocks:

```typescript
<TabsContent value="rentals" className="p-6 space-y-6">
  <RentalsTab />
</TabsContent>

<TabsContent value="chauffeurServices" className="p-6 space-y-6">
  <ChauffeurTab />
</TabsContent>
```

- [ ] **Step 5: Verify the app builds**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx vite build 2>&1 | tail -10`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/AdminDashboard.tsx
git commit -m "feat(admin): register rentals and chauffeur tabs in admin dashboard"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Full TypeScript check**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx tsc --noEmit --pretty 2>&1 | tail -20`

Fix any TypeScript errors.

- [ ] **Step 2: Full build**

Run: `cd /Users/adrianmaenzanise/Projects/Node/your-drive/client && npx vite build 2>&1 | tail -10`

Fix any build errors.

- [ ] **Step 3: Verify all new files are committed**

Run: `git status` and ensure no untracked files remain.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "feat(marketplace): final cleanup and verification"
```
