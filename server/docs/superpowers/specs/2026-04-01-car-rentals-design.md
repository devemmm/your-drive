# Car Rentals Feature Design

## Overview

Introduce peer-to-peer car rentals to the Your-Drive platform. Vehicle owners list their cars for rent with hourly/daily rates. Renters request bookings, owners approve/decline, and payments (including a refundable security deposit) are handled via Stripe. This is a standalone module that reuses existing infrastructure (payments, notifications, chat, reviews).

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ownership model | Peer-to-peer | Leverages existing Vehicle model and Stripe Connect payouts |
| Duration model | Hourly + Daily | Flexible for short errands and multi-day trips |
| Pickup/return | Default location + renter can request alternative (owner approves) | Balances owner control with renter convenience |
| Availability | On-demand toggle | Simple; active rentals prevent double-booking |
| Booking mode | Request-based (owner approves) | Owners handing over their vehicle need confidence |
| Protection | Security deposit via Stripe hold | Simple, protects owners without insurance complexity |
| Reviews | Extend existing Review model | Reuse infrastructure, add RENTAL type |
| Admin | Dedicated rental admin module | Clean separation from ride-sharing admin |

## Architecture: Standalone Rental Module (Approach A)

New `CarRental` model as the core entity with dedicated routes, controller, and service. Extends the existing `Vehicle` model with rental-specific fields. Reuses Transaction, PaymentSession, Review, Chat, and Notification infrastructure. Mirrors how D2D was added alongside P2P.

---

## 1. Data Model

### Vehicle Model Extensions

Add to existing `Vehicle` model:

| Field | Type | Description |
|-------|------|-------------|
| `isAvailableForRental` | Boolean (default false) | Owner's availability toggle |
| `hourlyRate` | Decimal | Price per hour |
| `dailyRate` | Decimal | Price per day |
| `securityDeposit` | Decimal | Refundable deposit amount |
| `rentalDescription` | String? | Owner's description for renters |
| `pickupLocationId` | FK -> Location | Default pickup/return address |
| `mileageLimit` | Int? | Daily km limit, null = unlimited |
| `fuelPolicy` | FuelPolicy enum | Return fuel expectation |

### New `CarRental` Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `vehicleId` | FK -> Vehicle | The rented vehicle |
| `renterId` | FK -> User | Person renting |
| `ownerId` | FK -> User | Vehicle owner |
| `startDate` | DateTime | Rental start |
| `endDate` | DateTime | Rental end |
| `rentalType` | RentalType enum | HOURLY or DAILY |
| `totalAmount` | Decimal | Calculated rental cost |
| `securityDepositAmount` | Decimal | Deposit held |
| `status` | RentalStatus enum | Current rental state |
| `pickupLocationId` | FK -> Location | Agreed pickup point |
| `returnLocationId` | FK -> Location | Agreed return point |
| `pickupNotes` | String? | Pickup instructions |
| `returnNotes` | String? | Return instructions |
| `approvedAt` | DateTime? | When owner approved |
| `declinedAt` | DateTime? | When owner declined |
| `activatedAt` | DateTime? | When pickup happened |
| `completedAt` | DateTime? | When return happened |
| `cancelledAt` | DateTime? | When cancelled |
| `cancellerId` | FK -> User? | Who cancelled |
| `cancellationReason` | String? | Why cancelled |
| `depositRefunded` | Boolean (default false) | Whether deposit was released |
| `depositRefundedAt` | DateTime? | When deposit was released |
| `transactionId` | FK -> Transaction? | Rental payment |
| `depositTransactionId` | FK -> Transaction? | Deposit hold |
| `createdAt` | DateTime | Record creation |
| `updatedAt` | DateTime | Last update |

### New `RentalSettings` Model (Admin Config)

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `platformFeePercentage` | Decimal | Platform cut of each rental |
| `maxRentalDurationDays` | Int | Cap on rental length |
| `minRentalDurationHours` | Int | Minimum rental duration |
| `requestExpiryHours` | Int (default 24) | Auto-decline window |
| `depositReleaseReminderHours` | Int (default 24) | Reminder to owner after completion |
| `overdueGracePeriodHours` | Int (default 3) | Grace period before flagging overdue |
| `createdAt` | DateTime | Record creation |
| `updatedAt` | DateTime | Last update |

### New Enums

- `RentalStatus`: REQUESTED, APPROVED, DECLINED, ACTIVE, COMPLETED, CANCELLED, DISPUTED
- `RentalType`: HOURLY, DAILY
- `FuelPolicy`: FULL_TO_FULL, SAME_LEVEL

### Existing Enum Extensions

- `TransactionType`: add `CAR_RENTAL`, `CAR_RENTAL_DEPOSIT`
- `ReviewType`: add `RENTAL`
- `CouponTarget`: add `CAR_RENTAL`

### Existing Model Extensions

- `Review`: add optional `rentalId` (FK -> CarRental)
- `ChatThread`: add optional `rentalId` (FK -> CarRental)
- `Notification`: add optional `rentalId` (FK -> CarRental)

---

## 2. Rental Lifecycle & Status Flow

### Status Flow

```
REQUESTED --> APPROVED --> ACTIVE --> COMPLETED
    |             |                       |
    v             v                       v
DECLINED     CANCELLED              DISPUTED
    
REQUESTED --> CANCELLED (renter cancels before approval)
```

### Renter Flow

1. **Browse** - Search available vehicles by location, dates, category, price range
2. **Request** - Select vehicle, pick start/end dates, optionally request custom pickup/return location -> status: `REQUESTED`
3. **Wait** - Owner gets notification, can chat with renter
4. **Payment** - Once approved, renter pays rental amount + security deposit via Stripe
5. **Pickup** - On start date, pick up vehicle -> owner marks `ACTIVE`
6. **Return** - Return vehicle -> owner marks `COMPLETED`
7. **Deposit** - Owner confirms good condition -> deposit refunded
8. **Review** - Both parties leave reviews

### Owner Flow

1. **List** - Toggle `isAvailableForRental`, set rates/deposit/location
2. **Review requests** - Receive notifications, chat, approve/decline
3. **Handover** - Mark rental as active on pickup
4. **Receive back** - Mark rental as completed on return
5. **Release deposit** - Confirm condition, trigger refund
6. **Get paid** - Amount transferred to Stripe Connect (minus platform fee)

### Double-Booking Prevention

When a rental request is created, the system checks for any existing rentals on that vehicle with status REQUESTED, APPROVED, or ACTIVE that overlap with the requested date range. If an overlap exists, the request is rejected. This is enforced at the service layer during rental creation.

### Cancellation Rules

- **Before approval**: Renter cancels freely
- **After approval, before active**: Either party can cancel. Renter cancels = platform fee may apply. Owner cancels = no charge to renter.
- **During active rental**: Only through dispute flow

### Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Pickup reminder | Every minute | Notify both parties 2h before start |
| Return reminder | Every minute | Notify renter 2h before end |
| Overdue check | Every 30 min | Flag rentals not completed by end + grace period |
| Request expiry | Every 30 min | Auto-decline requests older than expiry window |
| Deposit release reminder | Every hour | Remind owner 24h after completion |

---

## 3. API Endpoints

### Rental Routes (`/api/v1/rentals`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vehicles/available` | No | Search rental vehicles |
| GET | `/vehicles/:vehicleId` | No | Get rental vehicle details |
| POST | `/` | Yes | Create rental request |
| GET | `/` | Yes | List user's rentals |
| GET | `/:rentalId` | Yes | Get rental details |
| PATCH | `/:rentalId/approve` | Yes | Approve request (owner) |
| PATCH | `/:rentalId/decline` | Yes | Decline request (owner) |
| POST | `/:rentalId/initialize-payment` | Yes | Create payment session |
| PATCH | `/:rentalId/activate` | Yes | Mark picked up (owner) |
| PATCH | `/:rentalId/complete` | Yes | Mark returned (owner) |
| PATCH | `/:rentalId/cancel` | Yes | Cancel rental |
| POST | `/:rentalId/release-deposit` | Yes | Release deposit (owner) |
| POST | `/:rentalId/dispute` | Yes | Raise dispute |

### Rental Admin Routes (`/api/v1/admin/rentals`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin | List all rentals |
| GET | `/:rentalId` | Admin | Get rental details |
| PATCH | `/:rentalId/cancel` | Admin | Force cancel rental |
| PATCH | `/:rentalId/resolve-dispute` | Admin | Resolve dispute |
| POST | `/:rentalId/refund-deposit` | Admin | Admin deposit refund |
| GET | `/settings` | Admin | Get rental settings |
| PUT | `/settings` | Admin | Update rental settings |
| GET | `/stats` | Admin | Rental statistics |

### Vehicle Route Extension

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/vehicles/:vehicleId/rental-settings` | Yes | Update rental config |

### File Structure

```
src/
  controllers/
    rental.controller.ts
    rentalAdmin.controller.ts
  services/
    rental.service.ts
  routes/
    rental.routes.ts
    rentalAdmin.routes.ts
  middlewares/
    validators/
      rental.validator.ts
  docs/
    routes/
      rental.docs.ts
    schemas/
      rental.schema.ts
```

---

## 4. Payment Flow

### Two-Transaction Model

Each rental involves two separate Stripe transactions:

**Rental Payment** (`CAR_RENTAL`):
- Created when renter pays after owner approval
- Amount split: `platformAmount` (from RentalSettings.platformFeePercentage) + `ownerAmount`
- Owner payout via Stripe Connect transfer

**Security Deposit Hold** (`CAR_RENTAL_DEPOSIT`):
- Uses Stripe PaymentIntent with `capture_method: manual`
- Authorizes amount but doesn't charge
- On release: cancel PaymentIntent (renter never charged)
- On dispute/damage: capture full or partial amount
- Auto-expires after Stripe's 7-day auth window; admin notified to intervene

### Payment Session Flow

1. Owner approves rental request
2. Renter hits `POST /:rentalId/initialize-payment`
3. Backend creates PaymentSession with rental amount + tax + deposit
4. Returns Stripe clientSecret to frontend
5. Renter confirms payment on frontend
6. Backend receives confirmation -> creates both Transaction records
7. Rental status remains `APPROVED` (awaiting pickup)

### Refund Scenarios

| Scenario | Rental Payment | Deposit |
|----------|---------------|---------|
| Renter cancels before payment | No charge | No charge |
| Renter cancels after payment, before active | Full refund | Released |
| Owner cancels after payment | Full refund | Released |
| Completed, good condition | No refund (owner paid out) | Released |
| Dispute, damage confirmed | No refund | Captured (full/partial) |
| Admin force cancel | Full/partial refund (admin decides) | Released |

### Tax Handling

Reuses existing Tax model and province-based calculation.

---

## 5. Notifications, Chat & Reviews

### Notifications

| Event | Recipient | Channels |
|-------|-----------|----------|
| New rental request | Owner | In-app, Push, SMS |
| Request approved | Renter | In-app, Push, SMS |
| Request declined | Renter | In-app, Push |
| Payment confirmed | Owner | In-app, Push |
| Pickup reminder (2h before) | Both | In-app, Push |
| Rental activated | Renter | In-app, Push |
| Return reminder (2h before) | Renter | In-app, Push |
| Rental completed | Both | In-app, Push |
| Deposit released | Renter | In-app, Push |
| Deposit release reminder (24h) | Owner | In-app, Push |
| Rental overdue | Owner + Admin | In-app, Push |
| Request auto-expired | Both | In-app, Push |
| Rental cancelled | Other party | In-app, Push, SMS |
| Dispute raised | Other party + Admin | In-app, Push |

All notifications bilingual (EN/FR).

### Chat

- Auto-create ChatThread when rental request is created
- Link via `rentalId` on ChatThread
- Owner and renter added as participants
- Same Socket.IO real-time messaging

### Reviews

- Extend Review model with optional `rentalId`
- Add `RENTAL` to ReviewType enum
- After completion, both parties can review
- Feeds into existing averageRating/totalRatings on User
