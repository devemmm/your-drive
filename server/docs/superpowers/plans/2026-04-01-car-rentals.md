# Car Rentals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add peer-to-peer car rental functionality where vehicle owners list cars for rent and renters request bookings with Stripe payment and security deposit.

**Architecture:** Standalone rental module with dedicated controller, service, routes, and validators. Extends existing Vehicle model with rental fields. Reuses Transaction, PaymentSession, Notification, Chat, and Review infrastructure.

**Tech Stack:** Express.js, TypeScript, Prisma ORM, PostgreSQL, Stripe, Socket.IO, express-validator

**Spec:** `docs/superpowers/specs/2026-04-01-car-rentals-design.md`

---

## File Structure

### New Files
- `prisma/migrations/<timestamp>_add_car_rentals/migration.sql` — auto-generated
- `src/controllers/rental.controller.ts` — rental request lifecycle endpoints
- `src/controllers/rentalAdmin.controller.ts` — admin rental management endpoints
- `src/services/rental.service.ts` — rental business logic and cron jobs
- `src/routes/rental.routes.ts` — rental API routes
- `src/routes/rentalAdmin.routes.ts` — admin rental API routes
- `src/middlewares/validators/rental.request.validator.ts` — request validation schemas

### Modified Files
- `prisma/schema.prisma` — new models (CarRental, RentalSettings), enums, Vehicle extensions, Review/ChatThread/Notification extensions
- `src/routes/index.ts` — register rental and rentalAdmin routes
- `src/controllers/vehicle.controller.ts` — add updateRentalSettings method
- `src/middlewares/validators/vehicle.request.validator.ts` — add rental settings validator
- `src/routes/vehicle.routes.ts` — add rental-settings route
- `src/config/cron.ts` — register rental cron jobs
- `src/types/index.ts` — extend Express Request type if needed

---

### Task 1: Prisma Schema — New Enums and CarRental Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums after existing enums**

Add these enums to `prisma/schema.prisma` after the existing `ReviewType` enum (around line 794):

```prisma
enum RentalStatus {
  REQUESTED
  APPROVED
  DECLINED
  ACTIVE
  COMPLETED
  CANCELLED
  DISPUTED
}

enum RentalType {
  HOURLY
  DAILY
}

enum FuelPolicy {
  FULL_TO_FULL
  SAME_LEVEL
}
```

- [ ] **Step 2: Extend existing enums**

Add `CAR_RENTAL` and `CAR_RENTAL_DEPOSIT` to `TransactionType` enum (line ~565):

```prisma
enum TransactionType {
  RIDE_POSTING
  RIDE_BOOKING
  SUBSCRIPTION
  CAR_RENTAL
  CAR_RENTAL_DEPOSIT
}
```

Add `RENTAL` to `ReviewType` enum (line ~790):

```prisma
enum ReviewType {
  NORMAL
  CANCELLATION
  NO_SHOW
  RENTAL
}
```

- [ ] **Step 3: Extend Vehicle model with rental fields**

Add these fields to the `Vehicle` model (after `Booking Booking[]` around line 336):

```prisma
  isAvailableForRental Boolean     @default(false)
  hourlyRate           Decimal?    @db.Decimal(10, 2)
  dailyRate            Decimal?    @db.Decimal(10, 2)
  securityDeposit      Decimal?    @db.Decimal(10, 2)
  rentalDescription    String?
  pickupLocationId     Int?
  pickupLocation       Location?   @relation("VehiclePickupLocation", fields: [pickupLocationId], references: [id], onDelete: SetNull)
  mileageLimit         Int?
  fuelPolicy           FuelPolicy?
  rentals              CarRental[]
```

Also add the reverse relation to the `Location` model (after existing relations):

```prisma
  vehiclePickupLocation Vehicle? @relation("VehiclePickupLocation")
```

- [ ] **Step 4: Add CarRental model**

Add the `CarRental` model after the `Vehicle` model:

```prisma
model CarRental {
  id                    Int          @id @default(autoincrement())
  vehicleId             Int
  vehicle               Vehicle      @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  renterId              Int
  renter                User         @relation("RenterRentals", fields: [renterId], references: [id], onDelete: Cascade)
  ownerId               Int
  owner                 User         @relation("OwnerRentals", fields: [ownerId], references: [id], onDelete: Cascade)

  startDate             DateTime
  endDate               DateTime
  rentalType            RentalType
  totalAmount           Decimal      @db.Decimal(10, 2)
  securityDepositAmount Decimal      @db.Decimal(10, 2)
  status                RentalStatus @default(REQUESTED)

  pickupLocationId      Int?
  pickupLocation        Location?    @relation("RentalPickupLocation", fields: [pickupLocationId], references: [id], onDelete: SetNull)
  returnLocationId      Int?
  returnLocation        Location?    @relation("RentalReturnLocation", fields: [returnLocationId], references: [id], onDelete: SetNull)
  pickupNotes           String?
  returnNotes           String?

  approvedAt            DateTime?
  declinedAt            DateTime?
  activatedAt           DateTime?
  completedAt           DateTime?
  cancelledAt           DateTime?
  cancellerId           Int?
  cancelledBy           User?        @relation("RentalCancelledBy", fields: [cancellerId], references: [id], onDelete: SetNull)
  cancellationReason    String?

  depositRefunded       Boolean      @default(false)
  depositRefundedAt     DateTime?

  transactionId         Int?         @unique
  transaction           Transaction? @relation("RentalTransaction", fields: [transactionId], references: [id], onDelete: SetNull)
  depositTransactionId  Int?         @unique
  depositTransaction    Transaction? @relation("RentalDepositTransaction", fields: [depositTransactionId], references: [id], onDelete: SetNull)

  chatThread            ChatThread?
  reviews               Review[]
  notifications         Notification[]

  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
}
```

- [ ] **Step 5: Add RentalSettings model**

```prisma
model RentalSettings {
  id                          Int      @id @default(autoincrement())
  platformFeePercentage       Decimal  @default(15) @db.Decimal(5, 2)
  maxRentalDurationDays       Int      @default(30)
  minRentalDurationHours      Int      @default(1)
  requestExpiryHours          Int      @default(24)
  depositReleaseReminderHours Int      @default(24)
  overdueGracePeriodHours     Int      @default(3)
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}
```

- [ ] **Step 6: Add reverse relations to User model**

Add to the `User` model (after existing relation arrays):

```prisma
  renterRentals    CarRental[] @relation("RenterRentals")
  ownerRentals     CarRental[] @relation("OwnerRentals")
  cancelledRentals CarRental[] @relation("RentalCancelledBy")
```

- [ ] **Step 7: Add reverse relations to Transaction model**

Add to the `Transaction` model:

```prisma
  rental        CarRental? @relation("RentalTransaction")
  rentalDeposit CarRental? @relation("RentalDepositTransaction")
```

- [ ] **Step 8: Extend Review model**

Add optional `rentalId` to the `Review` model (after `rideId` field):

```prisma
  rentalId Int?
  rental   CarRental? @relation(fields: [rentalId], references: [id], onDelete: SetNull)
```

Make `rideId` optional since rental reviews won't have a ride:

```prisma
  rideId   Int?
  ride     Ride? @relation(fields: [rideId], references: [id])
```

- [ ] **Step 9: Extend ChatThread model**

Add optional `rentalId` to `ChatThread` (after `rideId`):

```prisma
  rentalId  Int?     @unique
  rental    CarRental? @relation(fields: [rentalId], references: [id], onDelete: Cascade)
```

Make `rideId` optional since rental threads won't have a ride:

```prisma
  rideId    Int?          @unique
  ride      Ride?         @relation(fields: [rideId], references: [id], onDelete: Cascade)
```

- [ ] **Step 10: Extend Notification model**

Add optional `rentalId` to `Notification`:

```prisma
  rentalId  Int?
  rental    CarRental? @relation(fields: [rentalId], references: [id], onDelete: Cascade)
```

- [ ] **Step 11: Add Location reverse relations for rental**

Add to `Location` model:

```prisma
  rentalPickupLocation  CarRental? @relation("RentalPickupLocation")
  rentalReturnLocation  CarRental? @relation("RentalReturnLocation")
```

- [ ] **Step 12: Run migration**

```bash
cd /d/node/your-drive/server && npx prisma migrate dev --name add_car_rentals
```

Expected: Migration creates successfully. Prisma Client regenerated.

- [ ] **Step 13: Verify Prisma Client generates**

```bash
cd /d/node/your-drive/server && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 14: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(rentals): add CarRental, RentalSettings models and schema extensions"
```

---

### Task 2: Rental Request Validators

**Files:**
- Create: `src/middlewares/validators/rental.request.validator.ts`

- [ ] **Step 1: Create the rental validator file**

Create `src/middlewares/validators/rental.request.validator.ts`:

```typescript
import { body, param, query, Schema, checkSchema } from "express-validator";
import { RentalStatus, RentalType } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

// Location sub-object schema (reusable)
const locationField = (prefix: string, required: boolean = false): Record<string, any> => {
  const base: Record<string, any> = {
    [`${prefix}`]: {
      in: ["body"],
      ...(required
        ? {
            isObject: {
              errorMessage: validationMsg("validation.location_object"),
              options: { strict: true },
            },
          }
        : { optional: true }),
    },
    [`${prefix}.region`]: {
      in: ["body"],
      optional: !required,
      isString: true,
      trim: true,
      ...(required && { notEmpty: true }),
      errorMessage: validationMsg("validation.region_required"),
    },
    [`${prefix}.city`]: {
      in: ["body"],
      optional: !required,
      isString: true,
      trim: true,
      ...(required && { notEmpty: true }),
      errorMessage: validationMsg("validation.city_required"),
    },
    [`${prefix}.locationName`]: {
      in: ["body"],
      optional: !required,
      isString: true,
      trim: true,
      ...(required && { notEmpty: true }),
      errorMessage: validationMsg("validation.locationName_required"),
    },
    [`${prefix}.latitude`]: {
      in: ["body"],
      optional: !required,
      isFloat: { options: { min: -90, max: 90 } },
      toFloat: true,
      errorMessage: validationMsg("validation.latitude_range"),
    },
    [`${prefix}.longitude`]: {
      in: ["body"],
      optional: !required,
      isFloat: { options: { min: -180, max: 180 } },
      toFloat: true,
      errorMessage: validationMsg("validation.longitude_range"),
    },
    [`${prefix}.address`]: {
      in: ["body"],
      optional: true,
      isString: true,
      trim: true,
    },
    [`${prefix}.description`]: {
      in: ["body"],
      optional: true,
      isString: true,
      trim: true,
    },
  };
  return base;
};

export const CreateRentalSchema: Schema = {
  vehicleId: {
    in: ["body"],
    isInt: { options: { gt: 0 } },
    toInt: true,
    errorMessage: validationMsg("validation.vehicleId_positive"),
  },
  startDate: {
    in: ["body"],
    isISO8601: true,
    toDate: true,
    errorMessage: validationMsg("validation.startDate_required"),
  },
  endDate: {
    in: ["body"],
    isISO8601: true,
    toDate: true,
    errorMessage: validationMsg("validation.endDate_required"),
  },
  rentalType: {
    in: ["body"],
    isString: true,
    trim: true,
    toUpperCase: true,
    isIn: {
      options: [Object.values(RentalType)],
      errorMessage: validationMsg("validation.invalid_rental_type", {
        types: Object.values(RentalType).join(", "),
      }),
    },
  },
  pickupNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
  },
  returnNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
  },
  ...locationField("pickupLocation", false),
  ...locationField("returnLocation", false),
};

export const validateCreateRental = checkSchema(CreateRentalSchema);

export const rentalValidators = {
  getRentals: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.page_positive_int"))
      .toInt(),
    query("pageSize")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(validationMsg("validation.pageSize_range"))
      .toInt(),
    query("status")
      .optional()
      .isIn(Object.values(RentalStatus))
      .withMessage(
        validationMsg("validation.rentalStatus_invalid", {
          statuses: Object.values(RentalStatus).join(", "),
        })
      ),
    query("role")
      .optional()
      .isString()
      .trim()
      .toLowerCase()
      .isIn(["renter", "owner"])
      .withMessage(validationMsg("validation.rental_role_invalid")),
  ],

  getRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  approveRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  declineRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.decline_reason_required")),
  ],

  cancelRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_reason_required")),
  ],

  initializePayment: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  activateRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  completeRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  releaseDeposit: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  dispute: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.dispute_reason_required")),
  ],

  searchAvailableVehicles: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.page_positive_int"))
      .toInt(),
    query("pageSize")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(validationMsg("validation.pageSize_range"))
      .toInt(),
    query("city")
      .optional()
      .isString()
      .trim(),
    query("region")
      .optional()
      .isString()
      .trim(),
    query("category")
      .optional()
      .isString()
      .trim()
      .toUpperCase(),
    query("minDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .toFloat(),
    query("maxDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .toFloat(),
    query("startDate")
      .optional()
      .isISO8601()
      .toDate(),
    query("endDate")
      .optional()
      .isISO8601()
      .toDate(),
  ],
};

// Vehicle rental settings validator
export const validateVehicleRentalSettings = [
  param("vehicleId")
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.vehicleId_positive"))
    .toInt(),
  body("isAvailableForRental")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.isAvailableForRental_boolean")),
  body("hourlyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.hourlyRate_positive"))
    .toFloat(),
  body("dailyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.dailyRate_positive"))
    .toFloat(),
  body("securityDeposit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.securityDeposit_positive"))
    .toFloat(),
  body("rentalDescription")
    .optional()
    .isString()
    .trim(),
  body("mileageLimit")
    .optional({ values: "null" })
    .isInt({ min: 0 })
    .withMessage(validationMsg("validation.mileageLimit_positive"))
    .toInt(),
  body("fuelPolicy")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .isIn(["FULL_TO_FULL", "SAME_LEVEL"])
    .withMessage(validationMsg("validation.fuelPolicy_invalid")),
];
```

- [ ] **Step 2: Commit**

```bash
git add src/middlewares/validators/rental.request.validator.ts
git commit -m "feat(rentals): add rental request validators"
```

---

### Task 3: Rental Service — Core Business Logic

**Files:**
- Create: `src/services/rental.service.ts`

- [ ] **Step 1: Create rental service with helper and getRentalSettings**

Create `src/services/rental.service.ts`:

```typescript
import { CronJob } from "cron";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import {
  RentalStatus,
  RentalType,
  TransactionStatus,
  TransactionType,
  PaymentProvider,
  Prisma,
} from "@prisma/client";
import { NotificationServices } from "./notification.service";
import { TransactionService } from "./transaction.service";
import { stripe } from "../config/stripe";
import moment from "moment";

const DEFAULT_SETTINGS = {
  platformFeePercentage: 15,
  maxRentalDurationDays: 30,
  minRentalDurationHours: 1,
  requestExpiryHours: 24,
  depositReleaseReminderHours: 24,
  overdueGracePeriodHours: 3,
};

export async function getRentalSettings() {
  try {
    const settings = await prisma.rentalSettings.findFirst();
    if (!settings) return DEFAULT_SETTINGS;
    return {
      platformFeePercentage: Number(settings.platformFeePercentage),
      maxRentalDurationDays: settings.maxRentalDurationDays,
      minRentalDurationHours: settings.minRentalDurationHours,
      requestExpiryHours: settings.requestExpiryHours,
      depositReleaseReminderHours: settings.depositReleaseReminderHours,
      overdueGracePeriodHours: settings.overdueGracePeriodHours,
    };
  } catch (err) {
    logger.error("getRentalSettings error:", err);
    return DEFAULT_SETTINGS;
  }
}

export function calculateRentalCost(
  startDate: Date,
  endDate: Date,
  rentalType: RentalType,
  hourlyRate: number,
  dailyRate: number
): number {
  const start = moment(startDate);
  const end = moment(endDate);

  if (rentalType === RentalType.HOURLY) {
    const hours = Math.ceil(end.diff(start, "hours", true));
    return hours * hourlyRate;
  } else {
    const days = Math.ceil(end.diff(start, "days", true));
    return days * dailyRate;
  }
}

export function hasOverlap(
  startDate: Date,
  endDate: Date,
  vehicleId: number,
  excludeRentalId?: number
): Prisma.CarRentalWhereInput {
  return {
    vehicleId,
    status: { in: [RentalStatus.REQUESTED, RentalStatus.APPROVED, RentalStatus.ACTIVE] },
    ...(excludeRentalId && { id: { not: excludeRentalId } }),
    OR: [
      { startDate: { lte: endDate }, endDate: { gte: startDate } },
    ],
  };
}

// Shared include for rental queries
export const rentalInclude = {
  vehicle: {
    include: {
      files: true,
      defaultImage: true,
    },
  },
  renter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      averageRating: true,
      totalRatings: true,
      profileImage: true,
    },
  },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      averageRating: true,
      totalRatings: true,
      profileImage: true,
    },
  },
  pickupLocation: true,
  returnLocation: true,
  transaction: true,
  depositTransaction: true,
  chatThread: true,
} satisfies Prisma.CarRentalInclude;
```

- [ ] **Step 2: Add cron jobs to the service**

Append to `src/services/rental.service.ts`:

```typescript
// ---- Cron Jobs ----

// Auto-expire rental requests not responded to within expiry window
const expireRentalRequests = async () => {
  try {
    const settings = await getRentalSettings();
    const expiryThreshold = moment().subtract(settings.requestExpiryHours, "hours").toDate();

    const expiredRequests = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.REQUESTED,
        createdAt: { lte: expiryThreshold },
      },
      include: { renter: true, owner: true, vehicle: true },
    });

    for (const rental of expiredRequests) {
      await prisma.carRental.update({
        where: { id: rental.id },
        data: { status: RentalStatus.DECLINED, declinedAt: new Date() },
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Request Expired",
        titleFr: "Demande de location expirée",
        messageEn: `Your rental request for ${rental.vehicle.make} ${rental.vehicle.model} has expired because the owner did not respond in time.`,
        messageFr: `Votre demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a expiré car le propriétaire n'a pas répondu à temps.`,
        rentalId: rental.id,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.ownerId],
        titleEn: "Rental Request Expired",
        titleFr: "Demande de location expirée",
        messageEn: `A rental request for your ${rental.vehicle.make} ${rental.vehicle.model} has expired because it was not responded to in time.`,
        messageFr: `Une demande de location pour votre ${rental.vehicle.make} ${rental.vehicle.model} a expiré car elle n'a pas été traitée à temps.`,
        rentalId: rental.id,
      });
    }

    if (expiredRequests.length > 0) {
      logger.info(`Expired ${expiredRequests.length} rental requests`);
    }
  } catch (err) {
    logger.error("expireRentalRequests cron error:", err);
  }
};

// Remind both parties 2 hours before pickup
const remindPickup = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours");

    const upcomingRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.APPROVED,
        startDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow.toDate(),
        },
      },
      include: { renter: true, owner: true, vehicle: true, pickupLocation: true },
    });

    for (const rental of upcomingRentals) {
      const pickupInfo = rental.pickupLocation
        ? `${rental.pickupLocation.city}, ${rental.pickupLocation.address || ""}`
        : "the agreed location";

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Pickup Reminder",
        titleFr: "Rappel de récupération de location",
        messageEn: `Reminder: The rental of ${rental.vehicle.make} ${rental.vehicle.model} starts in about 2 hours at ${pickupInfo}.`,
        messageFr: `Rappel: La location de ${rental.vehicle.make} ${rental.vehicle.model} commence dans environ 2 heures à ${pickupInfo}.`,
        rentalId: rental.id,
      });
    }
  } catch (err) {
    logger.error("remindPickup cron error:", err);
  }
};

// Remind renter 2 hours before return
const remindReturn = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours");

    const activeRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.ACTIVE,
        endDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow.toDate(),
        },
      },
      include: { renter: true, vehicle: true },
    });

    for (const rental of activeRentals) {
      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Return Reminder",
        titleFr: "Rappel de retour",
        messageEn: `Reminder: Your rental of ${rental.vehicle.make} ${rental.vehicle.model} ends in about 2 hours. Please return the vehicle on time.`,
        messageFr: `Rappel: Votre location de ${rental.vehicle.make} ${rental.vehicle.model} se termine dans environ 2 heures. Veuillez retourner le véhicule à temps.`,
        rentalId: rental.id,
      });
    }
  } catch (err) {
    logger.error("remindReturn cron error:", err);
  }
};

// Flag overdue rentals
const checkOverdueRentals = async () => {
  try {
    const settings = await getRentalSettings();
    const overdueThreshold = moment()
      .subtract(settings.overdueGracePeriodHours, "hours")
      .toDate();

    const overdueRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.ACTIVE,
        endDate: { lte: overdueThreshold },
      },
      include: { renter: true, owner: true, vehicle: true },
    });

    for (const rental of overdueRentals) {
      await NotificationServices.notifyUsers({
        userIds: [rental.ownerId],
        titleEn: "Rental Overdue",
        titleFr: "Location en retard",
        messageEn: `The rental of your ${rental.vehicle.make} ${rental.vehicle.model} is overdue. The renter has not returned the vehicle. Please contact them or raise a dispute.`,
        messageFr: `La location de votre ${rental.vehicle.make} ${rental.vehicle.model} est en retard. Le locataire n'a pas retourné le véhicule. Veuillez le contacter ou ouvrir un litige.`,
        rentalId: rental.id,
      });
    }
  } catch (err) {
    logger.error("checkOverdueRentals cron error:", err);
  }
};

// Remind owner to release deposit after completion
const remindDepositRelease = async () => {
  try {
    const settings = await getRentalSettings();
    const reminderThreshold = moment()
      .subtract(settings.depositReleaseReminderHours, "hours")
      .toDate();

    const completedRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.COMPLETED,
        depositRefunded: false,
        completedAt: { lte: reminderThreshold },
      },
      include: { owner: true, vehicle: true },
    });

    for (const rental of completedRentals) {
      await NotificationServices.notifyUsers({
        userIds: [rental.ownerId],
        titleEn: "Release Deposit Reminder",
        titleFr: "Rappel de libération du dépôt",
        messageEn: `Please release the security deposit for the completed rental of your ${rental.vehicle.make} ${rental.vehicle.model}. If there are issues, please raise a dispute.`,
        messageFr: `Veuillez libérer le dépôt de garantie pour la location terminée de votre ${rental.vehicle.make} ${rental.vehicle.model}. En cas de problème, veuillez ouvrir un litige.`,
        rentalId: rental.id,
      });
    }
  } catch (err) {
    logger.error("remindDepositRelease cron error:", err);
  }
};

export const initializeRentalCronJobs = () => {
  // Every 30 minutes: expire old requests
  new CronJob("*/30 * * * *", expireRentalRequests, null, true);

  // Every minute: pickup reminders (2h window)
  new CronJob("* * * * *", remindPickup, null, true);

  // Every minute: return reminders (2h window)
  new CronJob("* * * * *", remindReturn, null, true);

  // Every 30 minutes: overdue check
  new CronJob("*/30 * * * *", checkOverdueRentals, null, true);

  // Every hour: deposit release reminder
  new CronJob("0 * * * *", remindDepositRelease, null, true);

  logger.debug("Rental cron jobs initialized");
};
```

- [ ] **Step 3: Commit**

```bash
git add src/services/rental.service.ts
git commit -m "feat(rentals): add rental service with business logic and cron jobs"
```

---

### Task 4: Rental Controller — Create, List, Get, Approve, Decline

**Files:**
- Create: `src/controllers/rental.controller.ts`

- [ ] **Step 1: Create rental controller with imports and createRental**

Create `src/controllers/rental.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import {
  RentalStatus,
  RentalType,
  UserRole,
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  Prisma,
} from "@prisma/client";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import {
  getRentalSettings,
  calculateRentalCost,
  hasOverlap,
  rentalInclude,
} from "../services/rental.service";
import { stripe } from "../config/stripe";
import { v4 } from "uuid";
import { calculatePlatformTax, getProvinceCode } from "../utils/tax";
import { io } from "../server";
import moment from "moment";

export class RentalController {
  // POST /rentals — Create a rental request
  static createRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN ? "Admins are not allowed" : "Les administrateurs ne sont pas autorisés",
            403
          )
        );
      }

      // Validate vehicle exists and is available for rental
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
        include: { user: true, pickupLocation: true },
      });

      if (!vehicle) {
        return next(AppError(isEN ? "Vehicle not found" : "Véhicule non trouvé", 404));
      }

      if (!vehicle.isAvailableForRental) {
        return next(
          AppError(
            isEN
              ? "This vehicle is not available for rental"
              : "Ce véhicule n'est pas disponible à la location",
            400
          )
        );
      }

      // Cannot rent your own vehicle
      if (vehicle.userId === user.id) {
        return next(
          AppError(
            isEN ? "You cannot rent your own vehicle" : "Vous ne pouvez pas louer votre propre véhicule",
            400
          )
        );
      }

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const now = new Date();

      if (startDate <= now) {
        return next(
          AppError(isEN ? "Start date must be in the future" : "La date de début doit être dans le futur", 400)
        );
      }

      if (endDate <= startDate) {
        return next(
          AppError(isEN ? "End date must be after start date" : "La date de fin doit être après la date de début", 400)
        );
      }

      // Validate duration against settings
      const settings = await getRentalSettings();
      const durationHours = moment(endDate).diff(moment(startDate), "hours", true);

      if (durationHours < settings.minRentalDurationHours) {
        return next(
          AppError(
            isEN
              ? `Minimum rental duration is ${settings.minRentalDurationHours} hour(s)`
              : `La durée minimale de location est de ${settings.minRentalDurationHours} heure(s)`,
            400
          )
        );
      }

      const durationDays = Math.ceil(durationHours / 24);
      if (durationDays > settings.maxRentalDurationDays) {
        return next(
          AppError(
            isEN
              ? `Maximum rental duration is ${settings.maxRentalDurationDays} days`
              : `La durée maximale de location est de ${settings.maxRentalDurationDays} jours`,
            400
          )
        );
      }

      // Check for overlapping rentals
      const overlap = await prisma.carRental.count({
        where: hasOverlap(startDate, endDate, vehicle.id),
      });

      if (overlap > 0) {
        return next(
          AppError(
            isEN
              ? "This vehicle is already booked for the selected dates"
              : "Ce véhicule est déjà réservé pour les dates sélectionnées",
            409
          )
        );
      }

      // Validate rates exist for the requested type
      const rentalType = data.rentalType as RentalType;
      if (rentalType === RentalType.HOURLY && !vehicle.hourlyRate) {
        return next(
          AppError(
            isEN
              ? "This vehicle does not have an hourly rate set"
              : "Ce véhicule n'a pas de tarif horaire défini",
            400
          )
        );
      }
      if (rentalType === RentalType.DAILY && !vehicle.dailyRate) {
        return next(
          AppError(
            isEN
              ? "This vehicle does not have a daily rate set"
              : "Ce véhicule n'a pas de tarif journalier défini",
            400
          )
        );
      }

      // Calculate cost
      const totalAmount = calculateRentalCost(
        startDate,
        endDate,
        rentalType,
        Number(vehicle.hourlyRate || 0),
        Number(vehicle.dailyRate || 0)
      );

      const securityDepositAmount = Number(vehicle.securityDeposit || 0);

      // Create pickup/return locations if provided
      const pickupLocationData = data.pickupLocation
        ? {
            create: {
              region: data.pickupLocation.region,
              city: data.pickupLocation.city,
              locationName: data.pickupLocation.locationName,
              latitude: data.pickupLocation.latitude,
              longitude: data.pickupLocation.longitude,
              address: data.pickupLocation.address,
              description: data.pickupLocation.description,
            },
          }
        : vehicle.pickupLocationId
        ? { connect: { id: vehicle.pickupLocationId } }
        : undefined;

      const returnLocationData = data.returnLocation
        ? {
            create: {
              region: data.returnLocation.region,
              city: data.returnLocation.city,
              locationName: data.returnLocation.locationName,
              latitude: data.returnLocation.latitude,
              longitude: data.returnLocation.longitude,
              address: data.returnLocation.address,
              description: data.returnLocation.description,
            },
          }
        : vehicle.pickupLocationId
        ? { connect: { id: vehicle.pickupLocationId } }
        : undefined;

      // Create rental + chat thread in a transaction
      const rental = await prisma.carRental.create({
        data: {
          vehicle: { connect: { id: vehicle.id } },
          renter: { connect: { id: user.id } },
          owner: { connect: { id: vehicle.userId } },
          startDate,
          endDate,
          rentalType,
          totalAmount,
          securityDepositAmount,
          pickupNotes: data.pickupNotes,
          returnNotes: data.returnNotes,
          ...(pickupLocationData && { pickupLocation: pickupLocationData }),
          ...(returnLocationData && { returnLocation: returnLocationData }),
          chatThread: {
            create: {
              owner: { connect: { id: user.id } },
              users: {
                connect: [{ id: user.id }, { id: vehicle.userId }],
              },
            },
          },
        },
        include: rentalInclude,
      });

      // Notify owner
      await NotificationServices.notifyUsers({
        userIds: [vehicle.userId],
        titleEn: "New Rental Request",
        titleFr: "Nouvelle demande de location",
        messageEn: `${user.firstName} has requested to rent your ${vehicle.make} ${vehicle.model} from ${moment(startDate).format("MMM D")} to ${moment(endDate).format("MMM D")}.`,
        messageFr: `${user.firstName} a demandé à louer votre ${vehicle.make} ${vehicle.model} du ${moment(startDate).format("D MMM")} au ${moment(endDate).format("D MMM")}.`,
        rentalId: rental.id,
      });

      return res.status(201).json({ success: true, data: rental });
    }
  );

  // GET /rentals — List user's rentals
  static getRentals = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page = 1, pageSize = 10, status, role } = matchedData(req);
      const user = req.user! as DbUser;
      const take = Math.min(pageSize, 100);
      const skip = (page - 1) * take;

      const where: Prisma.CarRentalWhereInput = {
        ...(role === "owner"
          ? { ownerId: user.id }
          : role === "renter"
          ? { renterId: user.id }
          : { OR: [{ ownerId: user.id }, { renterId: user.id }] }),
        ...(status && { status: status as RentalStatus }),
      };

      const [rentals, total] = await Promise.all([
        prisma.carRental.findMany({
          where,
          include: rentalInclude,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.carRental.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: rentals,
        pagination: {
          page,
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    }
  );

  // GET /rentals/:rentalId — Get rental details
  static getRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: rentalInclude,
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      // Only owner, renter, or admin can view
      if (rental.ownerId !== user.id && rental.renterId !== user.id && user.role !== UserRole.ADMIN) {
        return next(
          AppError(isEN ? "Not authorized" : "Non autorisé", 403)
        );
      }

      return res.status(200).json({ success: true, data: rental });
    }
  );

  // PATCH /rentals/:rentalId/approve — Owner approves rental request
  static approveRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN ? "Only the vehicle owner can approve" : "Seul le propriétaire du véhicule peut approuver",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.REQUESTED) {
        return next(
          AppError(
            isEN ? "Can only approve pending requests" : "Seules les demandes en attente peuvent être approuvées",
            400
          )
        );
      }

      // Verify no overlapping rentals appeared since request was made
      const overlap = await prisma.carRental.count({
        where: hasOverlap(rental.startDate, rental.endDate, rental.vehicleId, rental.id),
      });

      if (overlap > 0) {
        return next(
          AppError(
            isEN
              ? "Cannot approve: vehicle has a conflicting booking"
              : "Impossible d'approuver: le véhicule a une réservation conflictuelle",
            409
          )
        );
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.APPROVED, approvedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Request Approved",
        titleFr: "Demande de location approuvée",
        messageEn: `Your rental request for ${rental.vehicle.make} ${rental.vehicle.model} has been approved! Please proceed with payment.`,
        messageFr: `Votre demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a été approuvée ! Veuillez procéder au paiement.`,
        rentalId: rental.id,
      });

      io.to(`user-${rental.renterId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // PATCH /rentals/:rentalId/decline — Owner declines rental request
  static declineRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId, reason } = matchedData<{ rentalId: number; reason: string }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN ? "Only the vehicle owner can decline" : "Seul le propriétaire du véhicule peut refuser",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.REQUESTED) {
        return next(
          AppError(
            isEN ? "Can only decline pending requests" : "Seules les demandes en attente peuvent être refusées",
            400
          )
        );
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.DECLINED,
          declinedAt: new Date(),
          cancellationReason: reason,
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Request Declined",
        titleFr: "Demande de location refusée",
        messageEn: `Your rental request for ${rental.vehicle.make} ${rental.vehicle.model} has been declined.`,
        messageFr: `Votre demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a été refusée.`,
        rentalId: rental.id,
      });

      io.to(`user-${rental.renterId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/rental.controller.ts
git commit -m "feat(rentals): add rental controller with create, list, get, approve, decline"
```

---

### Task 5: Rental Controller — Payment, Activate, Complete, Cancel, Deposit, Dispute

**Files:**
- Modify: `src/controllers/rental.controller.ts`

- [ ] **Step 1: Add initializePayment method**

Append to the `RentalController` class in `src/controllers/rental.controller.ts`:

```typescript
  // POST /rentals/:rentalId/initialize-payment
  static initializePayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, owner: true, transaction: true, depositTransaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.renterId !== user.id) {
        return next(AppError(isEN ? "Not authorized" : "Non autorisé", 403));
      }

      if (rental.status !== RentalStatus.APPROVED) {
        return next(
          AppError(
            isEN ? "Rental must be approved before payment" : "La location doit être approuvée avant le paiement",
            400
          )
        );
      }

      // Don't re-initialize if already paid
      if (rental.transaction && rental.transaction.status === TransactionStatus.PAID) {
        return next(
          AppError(isEN ? "Payment already completed" : "Le paiement est déjà effectué", 400)
        );
      }

      const settings = await getRentalSettings();
      const customerId = await TransactionService.getOrCreateStripeCustomer(user);

      const rentalAmount = Number(rental.totalAmount);
      const platformFee = rentalAmount * (settings.platformFeePercentage / 100);
      const ownerAmount = rentalAmount - platformFee;
      const depositAmount = Number(rental.securityDepositAmount);

      // Create rental payment intent (immediate capture)
      const rentalIntent = await stripe.paymentIntents.create({
        amount: Math.round(rentalAmount * 100),
        currency: "cad",
        customer: customerId,
        capture_method: "automatic",
        metadata: {
          type: "CAR_RENTAL",
          rentalId: rental.id.toString(),
          ownerId: rental.ownerId.toString(),
          renterId: rental.renterId.toString(),
          platformAmount: platformFee.toFixed(2),
          ownerAmount: ownerAmount.toFixed(2),
        },
      });

      // Create deposit hold intent (manual capture)
      let depositIntent = null;
      if (depositAmount > 0) {
        depositIntent = await stripe.paymentIntents.create({
          amount: Math.round(depositAmount * 100),
          currency: "cad",
          customer: customerId,
          capture_method: "manual",
          metadata: {
            type: "CAR_RENTAL_DEPOSIT",
            rentalId: rental.id.toString(),
            ownerId: rental.ownerId.toString(),
            renterId: rental.renterId.toString(),
          },
        });
      }

      // Create transaction records
      const [rentalTxn, depositTxn] = await prisma.$transaction(async (tx) => {
        const rTxn = await tx.transaction.create({
          data: {
            userId: user.id,
            type: TransactionType.CAR_RENTAL,
            externalReference: rentalIntent.id,
            amount: rentalAmount,
            platformAmount: platformFee,
            driverAmount: ownerAmount,
            currency: "CAD",
            status: TransactionStatus.PENDING,
            paymentProvider: PaymentProvider.STRIPE,
            transactionDate: new Date(),
            transactionId: `cr_rental_${v4()}`,
          },
        });

        let dTxn = null;
        if (depositIntent) {
          dTxn = await tx.transaction.create({
            data: {
              userId: user.id,
              type: TransactionType.CAR_RENTAL_DEPOSIT,
              externalReference: depositIntent.id,
              amount: depositAmount,
              platformAmount: 0,
              driverAmount: 0,
              currency: "CAD",
              status: TransactionStatus.PENDING,
              paymentProvider: PaymentProvider.STRIPE,
              transactionDate: new Date(),
              transactionId: `cr_deposit_${v4()}`,
            },
          });
        }

        await tx.carRental.update({
          where: { id: rental.id },
          data: {
            transactionId: rTxn.id,
            ...(dTxn && { depositTransactionId: dTxn.id }),
          },
        });

        return [rTxn, dTxn] as const;
      });

      return res.status(200).json({
        success: true,
        data: {
          rentalClientSecret: rentalIntent.client_secret,
          depositClientSecret: depositIntent?.client_secret || null,
          rentalTransactionId: rentalTxn.id,
          depositTransactionId: depositTxn?.id || null,
          rentalAmount,
          depositAmount,
          platformFee,
          ownerAmount,
        },
      });
    }
  );

  // PATCH /rentals/:rentalId/activate — Owner marks rental as picked up
  static activateRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, transaction: true, depositTransaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id) {
        return next(AppError(isEN ? "Only the owner can activate" : "Seul le propriétaire peut activer", 403));
      }

      if (rental.status !== RentalStatus.APPROVED) {
        return next(
          AppError(
            isEN ? "Rental must be approved to activate" : "La location doit être approuvée pour être activée",
            400
          )
        );
      }

      // Verify payment was completed
      if (!rental.transaction || rental.transaction.status !== TransactionStatus.PAID) {
        return next(
          AppError(
            isEN ? "Payment must be completed before activation" : "Le paiement doit être effectué avant l'activation",
            400
          )
        );
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.ACTIVE, activatedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Activated",
        titleFr: "Location activée",
        messageEn: `Your rental of ${rental.vehicle.make} ${rental.vehicle.model} is now active. Enjoy your ride!`,
        messageFr: `Votre location de ${rental.vehicle.make} ${rental.vehicle.model} est maintenant active. Bonne route !`,
        rentalId: rental.id,
      });

      io.to(`user-${rental.renterId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // PATCH /rentals/:rentalId/complete — Owner marks rental as returned
  static completeRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, owner: true, transaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id) {
        return next(AppError(isEN ? "Only the owner can complete" : "Seul le propriétaire peut terminer", 403));
      }

      if (rental.status !== RentalStatus.ACTIVE) {
        return next(
          AppError(
            isEN ? "Only active rentals can be completed" : "Seules les locations actives peuvent être terminées",
            400
          )
        );
      }

      // Transfer owner's portion via Stripe Connect
      if (
        rental.transaction &&
        rental.transaction.status === TransactionStatus.PAID &&
        rental.owner.stripeAccountId
      ) {
        try {
          const transferAmount = Math.round(Number(rental.transaction.driverAmount) * 100);
          if (transferAmount > 0) {
            const transfer = await stripe.transfers.create({
              amount: transferAmount,
              currency: "cad",
              destination: rental.owner.stripeAccountId,
              metadata: {
                rentalId: rental.id.toString(),
                transactionId: rental.transaction.id.toString(),
              },
            });

            await prisma.transaction.update({
              where: { id: rental.transaction.id },
              data: {
                stripeTransferId: transfer.id,
                isDriverPaid: true,
                driverPaidAt: new Date(),
              },
            });
          }
        } catch (err) {
          logger.error("Stripe transfer error on rental completion:", err);
        }
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.COMPLETED, completedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Completed",
        titleFr: "Location terminée",
        messageEn: `The rental of ${rental.vehicle.make} ${rental.vehicle.model} has been completed.`,
        messageFr: `La location de ${rental.vehicle.make} ${rental.vehicle.model} est terminée.`,
        rentalId: rental.id,
      });

      io.to(`user-${rental.renterId}`).emit("rental_updated", updated);
      io.to(`user-${rental.ownerId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // PATCH /rentals/:rentalId/cancel — Cancel rental
  static cancelRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId, reason } = matchedData<{ rentalId: number; reason: string }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          vehicle: true,
          renter: true,
          owner: true,
          transaction: { include: { tax: true } },
          depositTransaction: { include: { tax: true } },
        },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      const isOwner = rental.ownerId === user.id;
      const isRenter = rental.renterId === user.id;

      if (!isOwner && !isRenter) {
        return next(AppError(isEN ? "Not authorized" : "Non autorisé", 403));
      }

      if (rental.status === RentalStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Active rentals cannot be cancelled. Please raise a dispute instead."
              : "Les locations actives ne peuvent pas être annulées. Veuillez ouvrir un litige.",
            400
          )
        );
      }

      if (
        rental.status === RentalStatus.CANCELLED ||
        rental.status === RentalStatus.COMPLETED ||
        rental.status === RentalStatus.DECLINED ||
        rental.status === RentalStatus.DISPUTED
      ) {
        return next(
          AppError(
            isEN ? "This rental cannot be cancelled" : "Cette location ne peut pas être annulée",
            400
          )
        );
      }

      // Handle refunds if payment was made
      if (rental.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          rental.transaction,
          rental.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      // Release deposit hold
      if (rental.depositTransaction && rental.depositTransaction.externalReference) {
        try {
          await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
          await prisma.transaction.update({
            where: { id: rental.depositTransaction.id },
            data: { status: TransactionStatus.CANCELLED },
          });
        } catch (err) {
          logger.error("Error cancelling deposit hold:", err);
        }
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason,
          depositRefunded: true,
          depositRefundedAt: new Date(),
        },
        include: rentalInclude,
      });

      const notifyUserId = isOwner ? rental.renterId : rental.ownerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Rental Cancelled",
        titleFr: "Location annulée",
        messageEn: `The rental of ${rental.vehicle.make} ${rental.vehicle.model} has been cancelled.`,
        messageFr: `La location de ${rental.vehicle.make} ${rental.vehicle.model} a été annulée.`,
        rentalId: rental.id,
      });

      io.to(`user-${notifyUserId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // POST /rentals/:rentalId/release-deposit — Owner releases security deposit
  static releaseDeposit = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, depositTransaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id) {
        return next(AppError(isEN ? "Only the owner can release the deposit" : "Seul le propriétaire peut libérer le dépôt", 403));
      }

      if (rental.status !== RentalStatus.COMPLETED) {
        return next(
          AppError(
            isEN ? "Deposit can only be released after completion" : "Le dépôt ne peut être libéré qu'après la fin de la location",
            400
          )
        );
      }

      if (rental.depositRefunded) {
        return next(
          AppError(isEN ? "Deposit already released" : "Le dépôt a déjà été libéré", 400)
        );
      }

      // Cancel the deposit PaymentIntent (never captures = renter not charged)
      if (rental.depositTransaction?.externalReference) {
        try {
          await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
          await prisma.transaction.update({
            where: { id: rental.depositTransaction.id },
            data: { status: TransactionStatus.CANCELLED },
          });
        } catch (err) {
          logger.error("Error releasing deposit:", err);
        }
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { depositRefunded: true, depositRefundedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Security Deposit Released",
        titleFr: "Dépôt de garantie libéré",
        messageEn: `The security deposit for your rental of ${rental.vehicle.make} ${rental.vehicle.model} has been released.`,
        messageFr: `Le dépôt de garantie pour votre location de ${rental.vehicle.make} ${rental.vehicle.model} a été libéré.`,
        rentalId: rental.id,
      });

      io.to(`user-${rental.renterId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // POST /rentals/:rentalId/dispute — Raise a dispute
  static disputeRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId, reason } = matchedData<{ rentalId: number; reason: string }>(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, owner: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.ownerId !== user.id && rental.renterId !== user.id) {
        return next(AppError(isEN ? "Not authorized" : "Non autorisé", 403));
      }

      if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.COMPLETED) {
        return next(
          AppError(
            isEN
              ? "Disputes can only be raised for active or completed rentals"
              : "Les litiges ne peuvent être ouverts que pour les locations actives ou terminées",
            400
          )
        );
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.DISPUTED, cancellationReason: reason },
        include: rentalInclude,
      });

      // Notify the other party
      const otherUserId = user.id === rental.ownerId ? rental.renterId : rental.ownerId;
      await NotificationServices.notifyUsers({
        userIds: [otherUserId],
        titleEn: "Rental Dispute Raised",
        titleFr: "Litige de location ouvert",
        messageEn: `A dispute has been raised for the rental of ${rental.vehicle.make} ${rental.vehicle.model}. Our team will review it.`,
        messageFr: `Un litige a été ouvert pour la location de ${rental.vehicle.make} ${rental.vehicle.model}. Notre équipe l'examinera.`,
        rentalId: rental.id,
      });

      io.to(`user-${otherUserId}`).emit("rental_updated", updated);

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // GET /rentals/vehicles/available — Public search for rental vehicles
  static searchAvailableVehicles = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        city,
        region,
        category,
        minDailyRate,
        maxDailyRate,
        startDate,
        endDate,
      } = matchedData(req);

      const take = Math.min(pageSize, 100);
      const skip = (page - 1) * take;

      const where: Prisma.VehicleWhereInput = {
        isAvailableForRental: true,
        verified: true,
        ...(category && { category }),
        ...(minDailyRate !== undefined && { dailyRate: { gte: minDailyRate } }),
        ...(maxDailyRate !== undefined && {
          dailyRate: {
            ...(minDailyRate !== undefined ? { gte: minDailyRate } : {}),
            lte: maxDailyRate,
          },
        }),
        ...(city && {
          pickupLocation: { city: { contains: city, mode: "insensitive" } },
        }),
        ...(region && {
          pickupLocation: { region: { contains: region, mode: "insensitive" } },
        }),
        // Exclude vehicles with overlapping active rentals
        ...(startDate &&
          endDate && {
            NOT: {
              rentals: {
                some: {
                  status: { in: [RentalStatus.REQUESTED, RentalStatus.APPROVED, RentalStatus.ACTIVE] },
                  startDate: { lte: new Date(endDate) },
                  endDate: { gte: new Date(startDate) },
                },
              },
            },
          }),
      };

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          include: {
            files: true,
            defaultImage: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                averageRating: true,
                totalRatings: true,
                profileImage: true,
              },
            },
            pickupLocation: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.vehicle.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: vehicles,
        pagination: {
          page,
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    }
  );
```

Add missing import at the top of the file:

```typescript
import { logger } from "../utils/logger";
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/rental.controller.ts
git commit -m "feat(rentals): add payment, activate, complete, cancel, deposit, dispute, search endpoints"
```

---

### Task 6: Rental Admin Controller

**Files:**
- Create: `src/controllers/rentalAdmin.controller.ts`

- [ ] **Step 1: Create rental admin controller**

Create `src/controllers/rentalAdmin.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import {
  RentalStatus,
  TransactionStatus,
} from "@prisma/client";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import { rentalInclude } from "../services/rental.service";
import { stripe } from "../config/stripe";
import { logger } from "../utils/logger";

export class RentalAdminController {
  // GET /admin/rentals — List all rentals
  static getAllRentals = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page = 1, pageSize = 10, status } = matchedData(req);
      const take = Math.min(pageSize, 100);
      const skip = (page - 1) * take;

      const where = status ? { status: status as RentalStatus } : {};

      const [rentals, total] = await Promise.all([
        prisma.carRental.findMany({
          where,
          include: rentalInclude,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.carRental.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: rentals,
        pagination: { page, pageSize: take, total, totalPages: Math.ceil(total / take) },
      });
    }
  );

  // GET /admin/rentals/:rentalId
  static getRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: rentalInclude,
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      return res.status(200).json({ success: true, data: rental });
    }
  );

  // PATCH /admin/rentals/:rentalId/cancel — Force cancel
  static forceCancel = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId, reason } = matchedData<{ rentalId: number; reason: string }>(req);
      const user = req.user!;
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          vehicle: true,
          renter: true,
          owner: true,
          transaction: { include: { tax: true } },
          depositTransaction: { include: { tax: true } },
        },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      // Refund rental payment if paid
      if (rental.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          rental.transaction,
          rental.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      // Release deposit
      if (rental.depositTransaction?.externalReference) {
        try {
          await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
          await prisma.transaction.update({
            where: { id: rental.depositTransaction.id },
            data: { status: TransactionStatus.CANCELLED },
          });
        } catch (err) {
          logger.error("Admin deposit release error:", err);
        }
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason,
          depositRefunded: true,
          depositRefundedAt: new Date(),
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Cancelled by Admin",
        titleFr: "Location annulée par l'administrateur",
        messageEn: `The rental of ${rental.vehicle.make} ${rental.vehicle.model} has been cancelled by an administrator.`,
        messageFr: `La location de ${rental.vehicle.make} ${rental.vehicle.model} a été annulée par un administrateur.`,
        rentalId: rental.id,
      });

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // PATCH /admin/rentals/:rentalId/resolve-dispute
  static resolveDispute = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, owner: true, depositTransaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.status !== RentalStatus.DISPUTED) {
        return next(
          AppError(isEN ? "Rental is not in disputed state" : "La location n'est pas en état de litige", 400)
        );
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.COMPLETED, completedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Dispute Resolved",
        titleFr: "Litige résolu",
        messageEn: `The dispute for the rental of ${rental.vehicle.make} ${rental.vehicle.model} has been resolved.`,
        messageFr: `Le litige pour la location de ${rental.vehicle.make} ${rental.vehicle.model} a été résolu.`,
        rentalId: rental.id,
      });

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // POST /admin/rentals/:rentalId/refund-deposit — Admin captures or releases deposit
  static refundDeposit = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rentalId } = matchedData<{ rentalId: number }>(req);
      const isEN = req.isEnglishPreferred;

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true, renter: true, depositTransaction: true },
      });

      if (!rental) {
        return next(AppError(isEN ? "Rental not found" : "Location non trouvée", 404));
      }

      if (rental.depositRefunded) {
        return next(AppError(isEN ? "Deposit already released" : "Dépôt déjà libéré", 400));
      }

      if (rental.depositTransaction?.externalReference) {
        try {
          await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
          await prisma.transaction.update({
            where: { id: rental.depositTransaction.id },
            data: { status: TransactionStatus.CANCELLED },
          });
        } catch (err) {
          logger.error("Admin deposit refund error:", err);
        }
      }

      const updated = await prisma.carRental.update({
        where: { id: rentalId },
        data: { depositRefunded: true, depositRefundedAt: new Date() },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Deposit Released by Admin",
        titleFr: "Dépôt libéré par l'administrateur",
        messageEn: `The security deposit for the rental of ${rental.vehicle.make} ${rental.vehicle.model} has been released by an administrator.`,
        messageFr: `Le dépôt de garantie pour la location de ${rental.vehicle.make} ${rental.vehicle.model} a été libéré par un administrateur.`,
        rentalId: rental.id,
      });

      return res.status(200).json({ success: true, data: updated });
    }
  );

  // GET /admin/rentals/settings
  static getSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let settings = await prisma.rentalSettings.findFirst();
      if (!settings) {
        settings = await prisma.rentalSettings.create({ data: {} });
      }
      return res.status(200).json({ success: true, data: settings });
    }
  );

  // PUT /admin/rentals/settings
  static updateSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      let settings = await prisma.rentalSettings.findFirst();

      if (!settings) {
        settings = await prisma.rentalSettings.create({ data: { ...data } });
      } else {
        settings = await prisma.rentalSettings.update({
          where: { id: settings.id },
          data,
        });
      }

      return res.status(200).json({ success: true, data: settings });
    }
  );

  // GET /admin/rentals/stats
  static getStats = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const [total, byStatus, revenue] = await Promise.all([
        prisma.carRental.count(),
        prisma.carRental.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        prisma.transaction.aggregate({
          where: { type: "CAR_RENTAL", status: TransactionStatus.PAID },
          _sum: { amount: true, platformAmount: true, driverAmount: true },
          _count: { id: true },
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalRentals: total,
          byStatus: byStatus.reduce(
            (acc, item) => ({ ...acc, [item.status]: item._count.id }),
            {} as Record<string, number>
          ),
          revenue: {
            totalTransactions: revenue._count.id,
            totalAmount: revenue._sum.amount || 0,
            platformRevenue: revenue._sum.platformAmount || 0,
            ownerPayouts: revenue._sum.driverAmount || 0,
          },
        },
      });
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/rentalAdmin.controller.ts
git commit -m "feat(rentals): add rental admin controller"
```

---

### Task 7: Routes — Rental and Rental Admin

**Files:**
- Create: `src/routes/rental.routes.ts`
- Create: `src/routes/rentalAdmin.routes.ts`
- Modify: `src/routes/index.ts`

- [ ] **Step 1: Create rental routes**

Create `src/routes/rental.routes.ts`:

```typescript
import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import {
  validateCreateRental,
  rentalValidators,
} from "../middlewares/validators/rental.request.validator";
import { RentalController } from "../controllers/rental.controller";

const router = Router();

// Public routes (no auth required — mounted separately in index.ts)
// These are handled via /public/rentals/... in index.ts

// Authenticated routes
router.get(
  "/",
  ...rentalValidators.getRentals,
  validateRequestBody,
  RentalController.getRentals
);

router.get(
  "/:rentalId",
  ...rentalValidators.getRental,
  validateRequestBody,
  RentalController.getRental
);

router.post(
  "/",
  validateCreateRental,
  validateRequestBody,
  RentalController.createRental
);

router.patch(
  "/:rentalId/approve",
  ...rentalValidators.approveRental,
  validateRequestBody,
  RentalController.approveRental
);

router.patch(
  "/:rentalId/decline",
  ...rentalValidators.declineRental,
  validateRequestBody,
  RentalController.declineRental
);

router.post(
  "/:rentalId/initialize-payment",
  ...rentalValidators.initializePayment,
  validateRequestBody,
  RentalController.initializePayment
);

router.patch(
  "/:rentalId/activate",
  ...rentalValidators.activateRental,
  validateRequestBody,
  RentalController.activateRental
);

router.patch(
  "/:rentalId/complete",
  ...rentalValidators.completeRental,
  validateRequestBody,
  RentalController.completeRental
);

router.patch(
  "/:rentalId/cancel",
  ...rentalValidators.cancelRental,
  validateRequestBody,
  RentalController.cancelRental
);

router.post(
  "/:rentalId/release-deposit",
  ...rentalValidators.releaseDeposit,
  validateRequestBody,
  RentalController.releaseDeposit
);

router.post(
  "/:rentalId/dispute",
  ...rentalValidators.dispute,
  validateRequestBody,
  RentalController.disputeRental
);

export default router;
```

- [ ] **Step 2: Create rental admin routes**

Create `src/routes/rentalAdmin.routes.ts`:

```typescript
import { Router } from "express";
import { body, param, query } from "express-validator";
import { validateRequestBody } from "../middlewares/validators";
import { rentalValidators } from "../middlewares/validators/rental.request.validator";
import { RentalAdminController } from "../controllers/rentalAdmin.controller";
import { RentalStatus } from "@prisma/client";
import { validationMsg } from "../utils/validation";

const router = Router();

router.get(
  "/",
  ...rentalValidators.getRentals,
  validateRequestBody,
  RentalAdminController.getAllRentals
);

router.get(
  "/settings",
  RentalAdminController.getSettings
);

router.put(
  "/settings",
  body("platformFeePercentage").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("maxRentalDurationDays").optional().isInt({ min: 1 }).toInt(),
  body("minRentalDurationHours").optional().isInt({ min: 1 }).toInt(),
  body("requestExpiryHours").optional().isInt({ min: 1 }).toInt(),
  body("depositReleaseReminderHours").optional().isInt({ min: 1 }).toInt(),
  body("overdueGracePeriodHours").optional().isInt({ min: 1 }).toInt(),
  validateRequestBody,
  RentalAdminController.updateSettings
);

router.get(
  "/stats",
  RentalAdminController.getStats
);

router.get(
  "/:rentalId",
  ...rentalValidators.getRental,
  validateRequestBody,
  RentalAdminController.getRental
);

router.patch(
  "/:rentalId/cancel",
  param("rentalId").isInt({ min: 1 }).withMessage(validationMsg("validation.rentalId_positive")).toInt(),
  body("reason").isString().trim().notEmpty().withMessage(validationMsg("validation.cancel_reason_required")),
  validateRequestBody,
  RentalAdminController.forceCancel
);

router.patch(
  "/:rentalId/resolve-dispute",
  ...rentalValidators.getRental,
  validateRequestBody,
  RentalAdminController.resolveDispute
);

router.post(
  "/:rentalId/refund-deposit",
  ...rentalValidators.getRental,
  validateRequestBody,
  RentalAdminController.refundDeposit
);

export default router;
```

- [ ] **Step 3: Register routes in the main router**

Modify `src/routes/index.ts`. Add imports after line 24 (`import rideRequestsRoutes`):

```typescript
import rentalRoutes from "./rental.routes";
import rentalAdminRoutes from "./rentalAdmin.routes";
```

Add route registrations. After line 49 (`router.use("/d2d"...`):

```typescript
router.use("/rentals", isAuthenticated, languagePreference, rentalRoutes);
```

After line 42 (`router.use("/admin"...`), add the admin rental routes inside the admin section. Modify the admin route registration — add a new line after the existing admin route:

```typescript
router.use("/admin/rentals", isAuthenticated, languagePreference, isAdmin, rentalAdminRoutes);
```

Also add public rental vehicle search routes. After the public routes registration (around line 46):

```typescript
import { rentalValidators } from "../middlewares/validators/rental.request.validator";
import { RentalController } from "../controllers/rental.controller";
import { validateRequestBody } from "../middlewares/validators";
```

Wait — the public routes are already in `public.routes.ts`. Instead, add the public search endpoints to `src/routes/public.routes.ts`. Read that file first to see where to add them, then add:

```typescript
// In public.routes.ts, add import at top:
import { RentalController } from "../controllers/rental.controller";
import { rentalValidators } from "../middlewares/validators/rental.request.validator";
import { validateRequestBody } from "../middlewares/validators";

// Add routes:
router.get(
  "/rentals/vehicles/available",
  ...rentalValidators.searchAvailableVehicles,
  validateRequestBody,
  RentalController.searchAvailableVehicles
);
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/rental.routes.ts src/routes/rentalAdmin.routes.ts src/routes/index.ts src/routes/public.routes.ts
git commit -m "feat(rentals): add rental routes, admin routes, and public search"
```

---

### Task 8: Vehicle Controller — Rental Settings Endpoint

**Files:**
- Modify: `src/controllers/vehicle.controller.ts`
- Modify: `src/routes/vehicle.routes.ts`

- [ ] **Step 1: Add updateRentalSettings method to VehicleController**

Add this method to the `VehicleController` class in `src/controllers/vehicle.controller.ts` (before the closing `}` of the class):

```typescript
  // PATCH /vehicles/:vehicleId/rental-settings
  static updateRentalSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      const user = req.user! as DbUser;
      const isEnglishPreferred = req.isEnglishPreferred;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId, userId: user.id },
      });

      if (!vehicle) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }

      // Build pickup location data if provided
      const pickupLocationData = data.pickupLocation
        ? {
            pickupLocation: {
              create: {
                region: data.pickupLocation.region,
                city: data.pickupLocation.city,
                locationName: data.pickupLocation.locationName,
                latitude: data.pickupLocation.latitude,
                longitude: data.pickupLocation.longitude,
                address: data.pickupLocation.address,
                description: data.pickupLocation.description,
              },
            },
          }
        : {};

      const updated = await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          ...(data.isAvailableForRental !== undefined && {
            isAvailableForRental: data.isAvailableForRental,
          }),
          ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
          ...(data.dailyRate !== undefined && { dailyRate: data.dailyRate }),
          ...(data.securityDeposit !== undefined && {
            securityDeposit: data.securityDeposit,
          }),
          ...(data.rentalDescription !== undefined && {
            rentalDescription: data.rentalDescription,
          }),
          ...(data.mileageLimit !== undefined && {
            mileageLimit: data.mileageLimit,
          }),
          ...(data.fuelPolicy !== undefined && { fuelPolicy: data.fuelPolicy }),
          ...pickupLocationData,
        },
        include: {
          files: true,
          defaultImage: true,
          pickupLocation: true,
        },
      });

      return res.status(200).json({ success: true, data: updated });
    }
  );
```

Add the `FuelPolicy` import to the existing imports from `@prisma/client` at the top of the file if not already present.

- [ ] **Step 2: Add route to vehicle.routes.ts**

Read `src/routes/vehicle.routes.ts` first, then add before `export default router`:

```typescript
import { validateVehicleRentalSettings } from "../middlewares/validators/rental.request.validator";

router.patch(
  "/:vehicleId/rental-settings",
  ...validateVehicleRentalSettings,
  validateRequestBody,
  VehicleController.updateRentalSettings
);
```

- [ ] **Step 3: Commit**

```bash
git add src/controllers/vehicle.controller.ts src/routes/vehicle.routes.ts
git commit -m "feat(rentals): add vehicle rental settings endpoint"
```

---

### Task 9: Register Rental Cron Jobs

**Files:**
- Modify: `src/config/cron.ts`

- [ ] **Step 1: Add rental cron job initialization**

Add import to `src/config/cron.ts` after the existing imports:

```typescript
import { initializeRentalCronJobs } from "../services/rental.service";
```

Add `initializeRentalCronJobs();` inside the `try` block after `initializeRideRequestCronJobs();` (around line 13):

```typescript
    initializeRentalCronJobs();
```

- [ ] **Step 2: Commit**

```bash
git add src/config/cron.ts
git commit -m "feat(rentals): register rental cron jobs"
```

---

### Task 10: Extend NotificationServices for Rental Support

**Files:**
- Modify: `src/services/notification.service.ts`

- [ ] **Step 1: Add rentalId support to NotificationServices**

Read `src/services/notification.service.ts` and find the `notifyUsers` method signature. Add `rentalId?: number` to its parameters interface if it doesn't already support arbitrary extra fields.

The notification creation likely does something like:

```typescript
await prisma.notification.create({
  data: {
    title,
    message,
    userId,
    rideId,
    rideRequestId,
  }
});
```

Add `rentalId` to the data object and to the method's parameter type:

```typescript
rentalId?: number;
```

And include it in the create call:

```typescript
...(rentalId && { rentalId }),
```

- [ ] **Step 2: Commit**

```bash
git add src/services/notification.service.ts
git commit -m "feat(rentals): add rentalId support to notification service"
```

---

### Task 11: TypeScript Compilation Check

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compilation**

```bash
cd /d/node/your-drive/server && npx tsc --noEmit
```

Expected: No errors. If there are errors, fix them — they'll likely be:
- Missing imports
- Type mismatches in Prisma relations (resolved by `prisma generate`)
- Optional field mismatches

- [ ] **Step 2: Fix any compilation errors found**

Address each error by reading the file, understanding the issue, and fixing it.

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix(rentals): resolve TypeScript compilation errors"
```

---

### Task 12: Seed RentalSettings Default

**Files:**
- Modify: `prisma/seed.ts` (if it exists) or create migration data

- [ ] **Step 1: Check if seed file exists**

```bash
ls /d/node/your-drive/server/prisma/seed.ts 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

- [ ] **Step 2: Add RentalSettings seed**

If seed file exists, add:

```typescript
await prisma.rentalSettings.upsert({
  where: { id: 1 },
  update: {},
  create: {
    platformFeePercentage: 15,
    maxRentalDurationDays: 30,
    minRentalDurationHours: 1,
    requestExpiryHours: 24,
    depositReleaseReminderHours: 24,
    overdueGracePeriodHours: 3,
  },
});
```

If no seed file exists, the admin settings controller already handles creating defaults on first access (see `RentalAdminController.getSettings`), so this step can be skipped.

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat(rentals): seed default rental settings"
```

---

### Task 13: Final Verification and Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Run Prisma generate**

```bash
cd /d/node/your-drive/server && npx prisma generate
```

- [ ] **Step 2: Run TypeScript compilation**

```bash
cd /d/node/your-drive/server && npx tsc --noEmit
```

- [ ] **Step 3: Start the server**

```bash
cd /d/node/your-drive/server && npm run dev
```

Expected: Server starts without errors. Check logs for "Rental cron jobs initialized".

- [ ] **Step 4: Verify Swagger docs load**

If swagger auto-discovers routes, verify `/api-docs` still loads. If not, swagger docs for rentals can be added in a follow-up task.

- [ ] **Step 5: Final commit if any remaining changes**

```bash
git add -A
git commit -m "feat(rentals): final verification and cleanup"
```
