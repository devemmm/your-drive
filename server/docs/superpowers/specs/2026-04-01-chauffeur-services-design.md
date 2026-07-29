# Chauffeur Services Design Spec

## Overview

Add chauffeur services to the platform where a passenger (vehicle owner) can request a driver to drive their vehicle. Drivers without vehicles can set their availability and rates, accept requests, and provide driving services.

Follows the same architecture and patterns as the car rentals feature.

## Data Model

### ChauffeurService Model

Core booking record between passenger and driver:

- **Relations**: `vehicleId` (passenger's vehicle), `passengerId` (requester/vehicle owner), `driverId` (accepts the job)
- **Dates**: `startDate`, `endDate`
- **Service type**: `serviceType` enum — HOURLY | DAILY
- **Financial**: `totalAmount` (Decimal 10,2), platform fee split on completion
- **Status**: `status` enum ChauffeurStatus — REQUESTED, ACCEPTED, DECLINED, ACTIVE, COMPLETED, CANCELLED, DISPUTED
- **Locations**: `pickupLocationId`, `dropoffLocationId` (both optional, unique FK to Location), `pickupNotes`, `dropoffNotes`
- **Timestamps**: `acceptedAt`, `declinedAt`, `activatedAt`, `completedAt`, `cancelledAt`
- **Cancellation**: `cancellerId` (FK to User), `cancellationReason`
- **Reminders**: `pickupReminderSent` (bool), `completionReminderSent` (bool), `overdueNotifiedAt` (DateTime?)
- **Payment**: `transactionId` (unique FK to Transaction)
- **Communication**: `chatThread` relation (ChatThread)
- **Reviews/Notifications**: `reviews` (Review[]), `notifications` (Notification[])
- **Timestamps**: `createdAt`, `updatedAt`

### ChauffeurSettings Model

Platform-wide configuration (singleton pattern, same as RentalSettings):

| Field | Type | Default |
|-------|------|---------|
| `platformFeePercentage` | Float | 15 |
| `maxServiceDurationDays` | Int | 30 |
| `minServiceDurationHours` | Int | 1 |
| `requestExpiryHours` | Int | 24 |
| `overdueGracePeriodHours` | Int | 3 |

### User Model Extensions

New fields on User for driver chauffeur availability:

- `isAvailableForChauffeur` Boolean (default false)
- `chauffeurHourlyRate` Decimal? (10,2)
- `chauffeurDailyRate` Decimal? (10,2)
- `chauffeurDescription` String? (bio/experience)
- Relations: `passengerChauffeurServices` ChauffeurService[] and `driverChauffeurServices` ChauffeurService[] and `cancelledChauffeurServices` ChauffeurService[]

### Enum Additions

- **New**: `ChauffeurStatus` — REQUESTED, ACCEPTED, DECLINED, ACTIVE, COMPLETED, CANCELLED, DISPUTED
- **New**: `ChauffeurServiceType` — HOURLY, DAILY
- **Extend** `TransactionType`: add `CHAUFFEUR_SERVICE`
- **Extend** `ReviewType`: add `CHAUFFEUR`
- **Extend** `NotificationType`: add `CHAUFFEUR`

### Notification Model Extension

- Add `chauffeurServiceId` Int? (FK to ChauffeurService)

## Status Flow

```
REQUESTED -> ACCEPTED -> ACTIVE -> COMPLETED
    |            |         |
    v            v         v
 DECLINED    CANCELLED  DISPUTED
```

- Passenger creates request (selects their vehicle + a driver) -> REQUESTED
- Driver accepts -> ACCEPTED
- Passenger pays -> payment recorded via Stripe
- Driver starts service -> ACTIVE
- Either party completes -> COMPLETED, driver paid via Stripe Connect transfer
- Either party can cancel before ACTIVE, or dispute during ACTIVE/COMPLETED

## Payment Flow

- Single payment only (no security deposit — passenger owns the vehicle)
- Stripe PaymentIntent with automatic capture
- Platform fee: 15% platform, 85% driver (configurable via ChauffeurSettings)
- Stripe Connect transfer to driver on completion
- Refund on cancellation if already paid

## API Endpoints

### User Routes — `/chauffeur-services` (authenticated)

| Method | Path | Action |
|--------|------|--------|
| GET | `/` | List services (filter by status, role: passenger/driver) |
| GET | `/:serviceId` | Get single service with relations |
| POST | `/` | Request a chauffeur (passenger creates) |
| PATCH | `/:serviceId/accept` | Driver accepts request |
| PATCH | `/:serviceId/decline` | Driver declines with reason |
| POST | `/:serviceId/initialize-payment` | Passenger pays for service |
| PATCH | `/:serviceId/activate` | Driver starts the service |
| PATCH | `/:serviceId/complete` | Mark service as completed |
| PATCH | `/:serviceId/cancel` | Cancel with reason |
| POST | `/:serviceId/dispute` | File a dispute |

### Admin Routes — `/admin/chauffeur-services` (authenticated + admin)

| Method | Path | Action |
|--------|------|--------|
| GET | `/` | List all services (paginated, filterable) |
| GET | `/settings` | Get chauffeur settings |
| PUT | `/settings` | Update chauffeur settings |
| GET | `/stats` | Dashboard statistics |
| GET | `/:serviceId` | Get single service detail |
| PATCH | `/:serviceId/cancel` | Force cancel any service |
| PATCH | `/:serviceId/resolve-dispute` | Resolve a disputed service |

### Public Routes — added to existing `/public` router

| Method | Path | Action |
|--------|------|--------|
| GET | `/chauffeur-drivers` | Search available drivers (paginated, filterable by city/rate) |

## Cron Jobs

Registered via `initializeChauffeurCronJobs()` in `src/config/cron.ts`:

1. **Expire requests** (`*/30 * * * *`) — auto-decline REQUESTED services older than `requestExpiryHours`, notify both parties
2. **Pickup reminder** (`* * * * *`) — notify both parties 2h before `startDate`, set `pickupReminderSent`
3. **Completion reminder** (`* * * * *`) — notify driver 2h before `endDate`, set `completionReminderSent`
4. **Overdue check** (`*/30 * * * *`) — notify passenger if ACTIVE service past `endDate` + grace period, set `overdueNotifiedAt`

## Files

### New Files (6)

| File | Purpose |
|------|---------|
| `src/controllers/chauffeur.controller.ts` | User-facing controller (static methods, catchAsync) |
| `src/controllers/chauffeurAdmin.controller.ts` | Admin controller |
| `src/services/chauffeur.service.ts` | Business logic, helpers, cron jobs |
| `src/routes/chauffeur.routes.ts` | User endpoint definitions |
| `src/routes/chauffeurAdmin.routes.ts` | Admin endpoint definitions |
| `src/middlewares/validators/chauffeur.request.validator.ts` | Request validation schemas |

### Modified Files (4)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add ChauffeurService, ChauffeurSettings models; new enums; extend User, Notification, Transaction enums |
| `src/routes/index.ts` | Register `/chauffeur-services` and `/admin/chauffeur-services` routes |
| `src/config/cron.ts` | Import and call `initializeChauffeurCronJobs()` |
| `src/services/notification.service.ts` | Add `chauffeurServiceId` parameter to `notifyUsers` |

## Conventions

- Bilingual notifications (EN/FR) for all status changes
- All controller methods are static, wrapped in `catchAsync`
- Validation uses `express-validator` schema pattern with `validateRequestBody` middleware
- Responses follow `{ success: true, data, pagination }` format
- Errors use `AppError()` with bilingual messages based on `req.isEnglishPreferred`
- Prisma include objects defined in service for reuse
