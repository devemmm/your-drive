# Chauffeur Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chauffeur services where passengers request drivers for their own vehicles, following the exact rental feature pattern.

**Architecture:** Mirror the car rental module — dedicated Prisma models (`ChauffeurService`, `ChauffeurSettings`), new enums, controller/service/route/validator files. User model extended with driver availability fields. No security deposit (passenger owns vehicle). Single Stripe payment with platform fee split.

**Tech Stack:** TypeScript, Express, Prisma, Stripe, Socket.IO, node-cron, moment.js, express-validator

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `prisma/schema.prisma` | Add ChauffeurService, ChauffeurSettings models; new enums; extend User, Notification, ChatThread |
| Create | `src/services/chauffeur.service.ts` | Helpers, cron jobs, shared include |
| Create | `src/middlewares/validators/chauffeur.request.validator.ts` | Request validation schemas |
| Create | `src/controllers/chauffeur.controller.ts` | User-facing endpoints |
| Create | `src/controllers/chauffeurAdmin.controller.ts` | Admin endpoints |
| Create | `src/routes/chauffeur.routes.ts` | User route definitions |
| Create | `src/routes/chauffeurAdmin.routes.ts` | Admin route definitions |
| Modify | `src/routes/index.ts` | Register chauffeur routes |
| Modify | `src/routes/public.routes.ts` | Add public driver search endpoint |
| Modify | `src/config/cron.ts` | Register chauffeur cron jobs |
| Modify | `src/services/notification.service.ts` | Add `chauffeurServiceId` param |

---

### Task 1: Prisma Schema — Models and Enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ChauffeurStatus and ChauffeurServiceType enums**

Add after the `FuelPolicy` enum (after line ~914):

```prisma
enum ChauffeurStatus {
  REQUESTED
  ACCEPTED
  DECLINED
  ACTIVE
  COMPLETED
  CANCELLED
  DISPUTED
}

enum ChauffeurServiceType {
  HOURLY
  DAILY
}
```

- [ ] **Step 2: Extend TransactionType enum**

Add `CHAUFFEUR_SERVICE` to the `TransactionType` enum:

```prisma
enum TransactionType {
  RIDE_POSTING
  RIDE_BOOKING
  SUBSCRIPTION
  CAR_RENTAL
  CAR_RENTAL_DEPOSIT
  CHAUFFEUR_SERVICE
}
```

- [ ] **Step 3: Extend ReviewType enum**

Add `CHAUFFEUR` to the `ReviewType` enum:

```prisma
enum ReviewType {
  NORMAL
  CANCELLATION
  NO_SHOW
  RENTAL
  CHAUFFEUR
}
```

- [ ] **Step 4: Add ChauffeurService model**

Add after the `RentalSettings` model:

```prisma
model ChauffeurService {
  id          Int    @id @default(autoincrement())
  vehicleId   Int
  vehicle     Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  passengerId Int
  passenger   User   @relation("PassengerChauffeurServices", fields: [passengerId], references: [id], onDelete: Cascade)
  driverId    Int
  driver      User   @relation("DriverChauffeurServices", fields: [driverId], references: [id], onDelete: Cascade)

  startDate    DateTime
  endDate      DateTime
  serviceType  ChauffeurServiceType
  totalAmount  Decimal          @db.Decimal(10, 2)
  status       ChauffeurStatus  @default(REQUESTED)

  pickupLocationId  Int?      @unique
  pickupLocation    Location? @relation("ChauffeurPickupLocation", fields: [pickupLocationId], references: [id], onDelete: SetNull)
  dropoffLocationId Int?      @unique
  dropoffLocation   Location? @relation("ChauffeurDropoffLocation", fields: [dropoffLocationId], references: [id], onDelete: SetNull)
  pickupNotes       String?
  dropoffNotes      String?

  acceptedAt         DateTime?
  declinedAt         DateTime?
  activatedAt        DateTime?
  completedAt        DateTime?
  cancelledAt        DateTime?
  cancellerId        Int?
  cancelledBy        User?     @relation("ChauffeurCancelledBy", fields: [cancellerId], references: [id], onDelete: SetNull)
  cancellationReason String?

  pickupReminderSent     Boolean   @default(false)
  completionReminderSent Boolean   @default(false)
  overdueNotifiedAt      DateTime?

  transactionId Int?         @unique
  transaction   Transaction? @relation("ChauffeurTransaction", fields: [transactionId], references: [id], onDelete: SetNull)

  chatThread    ChatThread?
  reviews       Review[]
  notifications Notification[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 5: Add ChauffeurSettings model**

```prisma
model ChauffeurSettings {
  id                       Int      @id @default(autoincrement())
  platformFeePercentage    Decimal  @default(15) @db.Decimal(5, 2)
  maxServiceDurationDays   Int      @default(30)
  minServiceDurationHours  Int      @default(1)
  requestExpiryHours       Int      @default(24)
  overdueGracePeriodHours  Int      @default(3)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}
```

- [ ] **Step 6: Extend User model with chauffeur fields**

Add to the User model (after the `cancelledRentals` relation):

```prisma
  // Chauffeur driver fields
  isAvailableForChauffeur  Boolean  @default(false)
  chauffeurHourlyRate      Decimal? @db.Decimal(10, 2)
  chauffeurDailyRate       Decimal? @db.Decimal(10, 2)
  chauffeurDescription     String?

  passengerChauffeurServices  ChauffeurService[] @relation("PassengerChauffeurServices")
  driverChauffeurServices     ChauffeurService[] @relation("DriverChauffeurServices")
  cancelledChauffeurServices  ChauffeurService[] @relation("ChauffeurCancelledBy")
```

- [ ] **Step 7: Extend Vehicle model**

Add to the Vehicle model (after `rentals`):

```prisma
  chauffeurServices ChauffeurService[]
```

- [ ] **Step 8: Extend Notification model**

Add to the Notification model (after the `rental`/`rentalId` fields):

```prisma
  chauffeurServiceId Int?
  chauffeurService   ChauffeurService? @relation(fields: [chauffeurServiceId], references: [id], onDelete: Cascade)
```

- [ ] **Step 9: Extend ChatThread model**

Add to the ChatThread model (after the `rental`/`rentalId` fields):

```prisma
  chauffeurServiceId Int?              @unique
  chauffeurService   ChauffeurService? @relation(fields: [chauffeurServiceId], references: [id], onDelete: Cascade)
```

- [ ] **Step 10: Extend Transaction model**

Add to the Transaction model relations (find existing rental relation pattern):

```prisma
  chauffeurService ChauffeurService? @relation("ChauffeurTransaction")
```

- [ ] **Step 11: Extend Review model**

Add to the Review model (look for the existing `rental` relation if present, or add after last relation):

```prisma
  chauffeurServiceId Int?
  chauffeurService   ChauffeurService? @relation(fields: [chauffeurServiceId], references: [id], onDelete: Cascade)
```

- [ ] **Step 12: Extend Location model**

Add two new relations to the Location model:

```prisma
  chauffeurPickup  ChauffeurService? @relation("ChauffeurPickupLocation")
  chauffeurDropoff ChauffeurService? @relation("ChauffeurDropoffLocation")
```

- [ ] **Step 13: Run Prisma migration**

```bash
cd D:/node/your-drive/server && npx prisma migrate dev --name add_chauffeur_services
```

Expected: Migration created and applied successfully.

- [ ] **Step 14: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(chauffeur): add Prisma schema for chauffeur services"
```

---

### Task 2: Notification Service Extension

**Files:**
- Modify: `src/services/notification.service.ts`

- [ ] **Step 1: Add chauffeurServiceId to notifyUsers params**

In `src/services/notification.service.ts`, update the `notifyUsers` method parameter type to include `chauffeurServiceId`:

Change the params type from:
```typescript
  static async notifyUsers(params: {
    userIds: number[];
    titleEn: string;
    titleFr: string;
    messageEn: string;
    messageFr: string;
    rideRequestId?: number;
    rideId?: number;
    rentalId?: number;
  }) {
    const { userIds, titleEn, titleFr, messageEn, messageFr, rideRequestId, rideId, rentalId } = params;
```

To:
```typescript
  static async notifyUsers(params: {
    userIds: number[];
    titleEn: string;
    titleFr: string;
    messageEn: string;
    messageFr: string;
    rideRequestId?: number;
    rideId?: number;
    rentalId?: number;
    chauffeurServiceId?: number;
  }) {
    const { userIds, titleEn, titleFr, messageEn, messageFr, rideRequestId, rideId, rentalId, chauffeurServiceId } = params;
```

- [ ] **Step 2: Include chauffeurServiceId in notification create data**

Update the `notifsCreateData.push` call to include `chauffeurServiceId`:

Change from:
```typescript
        notifsCreateData.push({
          title: combinedTitle,
          message: combinedMessage,
          userId,
          rideRequestId,
          rideId,
          ...(rentalId && { rentalId }),
        });
```

To:
```typescript
        notifsCreateData.push({
          title: combinedTitle,
          message: combinedMessage,
          userId,
          rideRequestId,
          rideId,
          ...(rentalId && { rentalId }),
          ...(chauffeurServiceId && { chauffeurServiceId }),
        });
```

- [ ] **Step 3: Commit**

```bash
git add src/services/notification.service.ts
git commit -m "feat(chauffeur): extend notification service with chauffeurServiceId"
```

---

### Task 3: Chauffeur Service (Business Logic + Cron Jobs)

**Files:**
- Create: `src/services/chauffeur.service.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/chauffeur.service.ts` with the following content:

```typescript
import { CronJob } from "cron";
import { logger } from "../utils/logger";
import moment from "moment";
import { prisma } from "../config/database";
import { Prisma, ChauffeurStatus, ChauffeurServiceType } from "@prisma/client";
import { NotificationServices } from "./notification.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CHAUFFEUR_SETTINGS = {
  platformFeePercentage: 15,
  maxServiceDurationDays: 30,
  minServiceDurationHours: 1,
  requestExpiryHours: 24,
  overdueGracePeriodHours: 3,
};

export const getChauffeurSettings = async () => {
  const settings = await prisma.chauffeurSettings.findFirst();
  if (!settings) {
    return DEFAULT_CHAUFFEUR_SETTINGS;
  }
  return {
    platformFeePercentage: Number(settings.platformFeePercentage),
    maxServiceDurationDays: settings.maxServiceDurationDays,
    minServiceDurationHours: settings.minServiceDurationHours,
    requestExpiryHours: settings.requestExpiryHours,
    overdueGracePeriodHours: settings.overdueGracePeriodHours,
  };
};

export const calculateChauffeurCost = (
  startDate: Date,
  endDate: Date,
  serviceType: ChauffeurServiceType,
  hourlyRate: number,
  dailyRate: number
): number => {
  const start = moment(startDate);
  const end = moment(endDate);

  if (serviceType === ChauffeurServiceType.HOURLY) {
    const hours = Math.ceil(end.diff(start, "hours", true));
    return hours * hourlyRate;
  }

  // DAILY
  const days = Math.ceil(end.diff(start, "days", true));
  return days * dailyRate;
};

export async function hasChauffeurOverlap(
  startDate: Date,
  endDate: Date,
  driverId: number,
  excludeServiceId?: number
): Promise<boolean> {
  const count = await prisma.chauffeurService.count({
    where: {
      driverId,
      status: { in: [ChauffeurStatus.REQUESTED, ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
      ...(excludeServiceId && { id: { not: excludeServiceId } }),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
  });
  return count > 0;
}

// ── Shared include for chauffeur queries ────────────────────────────────────

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  averageRating: true,
  totalRatings: true,
  profileImage: true,
};

export const chauffeurInclude: Prisma.ChauffeurServiceInclude = {
  vehicle: {
    include: {
      files: true,
      defaultImage: true,
    },
  },
  passenger: { select: userSelect },
  driver: {
    select: {
      ...userSelect,
      isAvailableForChauffeur: true,
      chauffeurHourlyRate: true,
      chauffeurDailyRate: true,
      chauffeurDescription: true,
    },
  },
  pickupLocation: true,
  dropoffLocation: true,
  transaction: true,
  chatThread: true,
};

// ── Cron Jobs ────────────────────────────────────────────────────────────────

const expireChauffeurRequests = async () => {
  try {
    const settings = await getChauffeurSettings();
    const expiryDate = moment()
      .subtract(settings.requestExpiryHours, "hours")
      .toDate();

    const expiredServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.REQUESTED,
        createdAt: { lt: expiryDate },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of expiredServices) {
      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: {
          status: ChauffeurStatus.DECLINED,
          declinedAt: new Date(),
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Request Expired",
        titleFr: "Demande de chauffeur expirée",
        messageEn: `The chauffeur request for ${service.vehicle.make} ${service.vehicle.model} has expired.`,
        messageFr: `La demande de chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a expiré.`,
        chauffeurServiceId: service.id,
      });
    }

    if (expiredServices.length) {
      logger.info(`Expired ${expiredServices.length} chauffeur request(s).`);
    }
  } catch (error) {
    logger.error("Error expiring chauffeur requests:", error);
  }
};

const remindChauffeurPickup = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const upcomingServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACCEPTED,
        pickupReminderSent: false,
        startDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of upcomingServices) {
      const minutesUntilPickup = Math.round(
        moment(service.startDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Pickup Reminder",
        titleFr: "Rappel de prise en charge chauffeur",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} starts in ${minutesUntilPickup} minutes.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} commence dans ${minutesUntilPickup} minutes.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { pickupReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending chauffeur pickup reminders:", error);
  }
};

const remindChauffeurCompletion = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const activeServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACTIVE,
        completionReminderSent: false,
        endDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, driver: true },
    });

    for (const service of activeServices) {
      const minutesUntilEnd = Math.round(
        moment(service.endDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [service.driverId],
        titleEn: "Chauffeur Service Ending Soon",
        titleFr: "Service chauffeur bientôt terminé",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} ends in ${minutesUntilEnd} minutes.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} se termine dans ${minutesUntilEnd} minutes.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { completionReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending chauffeur completion reminders:", error);
  }
};

const checkOverdueChauffeurServices = async () => {
  try {
    const settings = await getChauffeurSettings();
    const graceCutoff = moment()
      .subtract(settings.overdueGracePeriodHours, "hours")
      .toDate();

    const overdueServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACTIVE,
        overdueNotifiedAt: null,
        endDate: { lt: graceCutoff },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of overdueServices) {
      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Service Overdue",
        titleFr: "Service chauffeur en retard",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} by ${service.driver.firstName} ${service.driver.lastName} is overdue.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} par ${service.driver.firstName} ${service.driver.lastName} est en retard.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { overdueNotifiedAt: new Date() },
      });
    }

    if (overdueServices.length) {
      logger.info(`Found ${overdueServices.length} overdue chauffeur service(s).`);
    }
  } catch (error) {
    logger.error("Error checking overdue chauffeur services:", error);
  }
};

// ── Initialize ───────────────────────────────────────────────────────────────

export const initializeChauffeurCronJobs = () => {
  // Every 30 minutes — expire stale chauffeur requests
  new CronJob("*/30 * * * *", expireChauffeurRequests, null, true);

  // Every minute — remind both parties of upcoming pickup
  new CronJob("* * * * *", remindChauffeurPickup, null, true);

  // Every minute — remind driver of upcoming service end
  new CronJob("* * * * *", remindChauffeurCompletion, null, true);

  // Every 30 minutes — check for overdue services
  new CronJob("*/30 * * * *", checkOverdueChauffeurServices, null, true);

  logger.info("Chauffeur cron jobs initialized.");
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/chauffeur.service.ts
git commit -m "feat(chauffeur): add chauffeur service with helpers and cron jobs"
```

---

### Task 4: Chauffeur Request Validators

**Files:**
- Create: `src/middlewares/validators/chauffeur.request.validator.ts`

- [ ] **Step 1: Create the validator file**

Create `src/middlewares/validators/chauffeur.request.validator.ts`:

```typescript
import { body, checkSchema, param, query, Schema } from "express-validator";
import { validationMsg } from "../../utils/validation";
import { ChauffeurStatus, ChauffeurServiceType } from "@prisma/client";

export const CreateChauffeurServiceSchema: Schema = {
  vehicleId: {
    in: ["body"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicleId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.vehicleId_positive"),
  },
  driverId: {
    in: ["body"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.driverId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.driverId_positive"),
  },
  startDate: {
    in: ["body"],
    isISO8601: {
      errorMessage: validationMsg("validation.startDate_iso8601"),
    },
    errorMessage: validationMsg("validation.startDate_required"),
  },
  endDate: {
    in: ["body"],
    isISO8601: {
      errorMessage: validationMsg("validation.endDate_iso8601"),
    },
    custom: {
      options: (value, { req }) => {
        const end = new Date(value);
        const start = new Date(req.body.startDate);
        return end > start;
      },
      errorMessage: validationMsg("validation.endDate_after_startDate"),
    },
    errorMessage: validationMsg("validation.endDate_required"),
  },
  serviceType: {
    in: ["body"],
    isString: true,
    trim: true,
    toUpperCase: true,
    isIn: {
      options: [Object.values(ChauffeurServiceType)],
      errorMessage: validationMsg("validation.serviceType_invalid", {
        types: Object.values(ChauffeurServiceType).join(", "),
      }),
    },
    errorMessage: validationMsg("validation.serviceType_required"),
  },
  pickupNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupNotes_string"),
  },
  dropoffNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffNotes_string"),
  },

  // Pickup location
  pickupLocation: {
    in: ["body"],
    optional: true,
    isObject: {
      errorMessage: validationMsg("validation.pickupLocation_object"),
      options: { strict: true },
    },
  },
  "pickupLocation.region": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickupLocation_region_required"),
  },
  "pickupLocation.city": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickupLocation_city_required"),
  },
  "pickupLocation.locationName": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickupLocation_locationName_required"),
  },
  "pickupLocation.latitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "pickupLocation.longitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "pickupLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupLocation_address_string"),
  },
  "pickupLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupLocation_description_string"),
  },

  // Dropoff location
  dropoffLocation: {
    in: ["body"],
    optional: true,
    isObject: {
      errorMessage: validationMsg("validation.dropoffLocation_object"),
      options: { strict: true },
    },
  },
  "dropoffLocation.region": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_region_required"),
  },
  "dropoffLocation.city": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_city_required"),
  },
  "dropoffLocation.locationName": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_locationName_required"),
  },
  "dropoffLocation.latitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "dropoffLocation.longitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "dropoffLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffLocation_address_string"),
  },
  "dropoffLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffLocation_description_string"),
  },
};

export const validateCreateChauffeurService = checkSchema(CreateChauffeurServiceSchema);

export const chauffeurValidators = {
  getServices: [
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
      .isString()
      .withMessage(validationMsg("validation.chauffeurStatus_string"))
      .trim()
      .toUpperCase()
      .isIn(Object.values(ChauffeurStatus))
      .withMessage(
        validationMsg("validation.chauffeurStatus_invalid", {
          statuses: Object.values(ChauffeurStatus).join(", "),
        })
      ),
    query("role")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.role_string"))
      .trim()
      .toLowerCase()
      .isIn(["passenger", "driver"])
      .withMessage(validationMsg("validation.role_invalid")),
  ],

  getService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],

  acceptService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],

  declineService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.decline_reason_required")),
  ],

  cancelService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_reason_required")),
  ],

  initializePayment: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],

  activateService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],

  completeService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],

  dispute: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.dispute_reason_required")),
  ],

  searchAvailableDrivers: [
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
    query("minHourlyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.minHourlyRate_non_negative"))
      .toFloat(),
    query("maxHourlyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.maxHourlyRate_non_negative"))
      .toFloat(),
    query("minDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.minDailyRate_non_negative"))
      .toFloat(),
    query("maxDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.maxDailyRate_non_negative"))
      .toFloat(),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage(validationMsg("validation.startDate_iso8601")),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage(validationMsg("validation.endDate_iso8601")),
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middlewares/validators/chauffeur.request.validator.ts
git commit -m "feat(chauffeur): add chauffeur request validators"
```

---

### Task 5: Chauffeur Controller (User-Facing)

**Files:**
- Create: `src/controllers/chauffeur.controller.ts`

- [ ] **Step 1: Create the controller file**

Create `src/controllers/chauffeur.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser, profileSelects } from "../types";
import {
  Prisma,
  ChauffeurStatus,
  ChauffeurServiceType,
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  UserRole,
} from "@prisma/client";
import { stripe } from "../config/stripe";
import { io } from "../server";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import {
  getChauffeurSettings,
  calculateChauffeurCost,
  hasChauffeurOverlap,
  chauffeurInclude,
} from "../services/chauffeur.service";

export class ChauffeurController {
  // POST /chauffeur-services — create a new chauffeur request
  static createService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed to create chauffeur requests"
              : "Les administrateurs ne sont pas autorisés à créer des demandes de chauffeur",
            403
          )
        );
      }

      // Verify vehicle belongs to the passenger
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
      });

      if (!vehicle) {
        return next(
          AppError(
            isEN ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }

      if (vehicle.userId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You can only request a chauffeur for your own vehicle"
              : "Vous ne pouvez demander un chauffeur que pour votre propre véhicule",
            403
          )
        );
      }

      // Verify driver exists and is available
      const driver = await prisma.user.findUnique({
        where: { id: data.driverId },
      });

      if (!driver) {
        return next(
          AppError(
            isEN ? "Driver not found" : "Chauffeur non trouvé",
            404
          )
        );
      }

      if (!driver.isAvailableForChauffeur) {
        return next(
          AppError(
            isEN
              ? "This driver is not available for chauffeur services"
              : "Ce chauffeur n'est pas disponible pour les services de chauffeur",
            400
          )
        );
      }

      if (driver.id === user.id) {
        return next(
          AppError(
            isEN
              ? "You cannot request yourself as a chauffeur"
              : "Vous ne pouvez pas vous demander comme chauffeur",
            400
          )
        );
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const now = new Date();

      if (startDate <= now) {
        return next(
          AppError(
            isEN
              ? "Start date must be in the future"
              : "La date de début doit être dans le futur",
            400
          )
        );
      }

      if (endDate <= startDate) {
        return next(
          AppError(
            isEN
              ? "End date must be after start date"
              : "La date de fin doit être après la date de début",
            400
          )
        );
      }

      const settings = await getChauffeurSettings();
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      if (durationHours < settings.minServiceDurationHours) {
        return next(
          AppError(
            isEN
              ? `Minimum service duration is ${settings.minServiceDurationHours} hour(s)`
              : `La durée minimale du service est de ${settings.minServiceDurationHours} heure(s)`,
            400
          )
        );
      }

      if (durationDays > settings.maxServiceDurationDays) {
        return next(
          AppError(
            isEN
              ? `Maximum service duration is ${settings.maxServiceDurationDays} day(s)`
              : `La durée maximale du service est de ${settings.maxServiceDurationDays} jour(s)`,
            400
          )
        );
      }

      // Check driver schedule conflicts
      const hasConflict = await hasChauffeurOverlap(startDate, endDate, data.driverId);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "This driver is already booked for the selected dates"
              : "Ce chauffeur est déjà réservé pour les dates sélectionnées",
            409
          )
        );
      }

      const serviceType: ChauffeurServiceType = data.serviceType;

      if (serviceType === ChauffeurServiceType.HOURLY && !driver.chauffeurHourlyRate) {
        return next(
          AppError(
            isEN
              ? "Hourly rate is not set for this driver"
              : "Le tarif horaire n'est pas défini pour ce chauffeur",
            400
          )
        );
      }

      if (serviceType === ChauffeurServiceType.DAILY && !driver.chauffeurDailyRate) {
        return next(
          AppError(
            isEN
              ? "Daily rate is not set for this driver"
              : "Le tarif journalier n'est pas défini pour ce chauffeur",
            400
          )
        );
      }

      const totalAmount = calculateChauffeurCost(
        startDate,
        endDate,
        serviceType,
        Number(driver.chauffeurHourlyRate || 0),
        Number(driver.chauffeurDailyRate || 0)
      );

      // Create pickup location if provided
      let pickupLocationId: number | null = null;
      if (data.pickupLocation) {
        const loc = await prisma.location.create({ data: data.pickupLocation });
        pickupLocationId = loc.id;
      }

      let dropoffLocationId: number | null = null;
      if (data.dropoffLocation) {
        const loc = await prisma.location.create({ data: data.dropoffLocation });
        dropoffLocationId = loc.id;
      }

      const service = await prisma.chauffeurService.create({
        data: {
          vehicleId: data.vehicleId,
          passengerId: user.id,
          driverId: data.driverId,
          startDate,
          endDate,
          serviceType,
          totalAmount,
          status: ChauffeurStatus.REQUESTED,
          ...(pickupLocationId && { pickupLocationId }),
          ...(dropoffLocationId && { dropoffLocationId }),
          ...(data.pickupNotes && { pickupNotes: data.pickupNotes }),
          ...(data.dropoffNotes && { dropoffNotes: data.dropoffNotes }),
          chatThread: {
            create: {
              ownerId: user.id,
              users: {
                connect: [{ id: user.id }, { id: data.driverId }],
              },
            },
          },
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [data.driverId],
        titleEn: "New Chauffeur Request",
        titleFr: "Nouvelle demande de chauffeur",
        messageEn: `You have a new chauffeur request for a ${vehicle.make} ${vehicle.model}.`,
        messageFr: `Vous avez une nouvelle demande de chauffeur pour une ${vehicle.make} ${vehicle.model}.`,
        chauffeurServiceId: service.id,
      });

      return res.status(201).json({
        success: true,
        data: service,
      });
    }
  );

  // GET /chauffeur-services — list services with pagination
  static getServices = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const {
        page = 1,
        pageSize = 10,
        status,
        role,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: ChauffeurStatus;
        role?: "passenger" | "driver";
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: Prisma.ChauffeurServiceWhereInput = {};

      if (user.role !== UserRole.ADMIN) {
        if (role === "passenger") {
          where.passengerId = user.id;
        } else if (role === "driver") {
          where.driverId = user.id;
        } else {
          where.OR = [{ passengerId: user.id }, { driverId: user.id }];
        }
      }

      if (status) {
        where.status = status;
      }

      const [services, total] = await prisma.$transaction([
        prisma.chauffeurService.findMany({
          skip,
          take,
          where,
          include: chauffeurInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.chauffeurService.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: services,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );

  // GET /chauffeur-services/:serviceId — get a single service
  static getService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: chauffeurInclude,
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (
        user.role !== UserRole.ADMIN &&
        service.passengerId !== user.id &&
        service.driverId !== user.id
      ) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to view this service"
              : "Vous n'êtes pas autorisé à voir ce service",
            403
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: service,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/accept — driver accepts
  static acceptService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can accept this request"
              : "Seul le chauffeur assigné peut accepter cette demande",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested services can be accepted"
              : "Seuls les services demandés peuvent être acceptés",
            400
          )
        );
      }

      // Re-check schedule conflicts
      const hasConflict = await hasChauffeurOverlap(service.startDate, service.endDate, service.driverId, service.id);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "You have a conflicting booking for the selected dates"
              : "Vous avez une réservation en conflit pour les dates sélectionnées",
            409
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Request Accepted",
        titleFr: "Demande de chauffeur acceptée",
        messageEn: `Your chauffeur request for ${service.vehicle.make} ${service.vehicle.model} has been accepted.`,
        messageFr: `Votre demande de chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a été acceptée.`,
        chauffeurServiceId: service.id,
      });

      io.to(`user-${service.passengerId}`).emit("chauffeur_update", updatedService);

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/decline — driver declines
  static declineService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason?: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can decline this request"
              : "Seul le chauffeur assigné peut refuser cette demande",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested services can be declined"
              : "Seuls les services demandés peuvent être refusés",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.DECLINED,
          declinedAt: new Date(),
          cancellationReason: reason || null,
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Request Declined",
        titleFr: "Demande de chauffeur refusée",
        messageEn: `Your chauffeur request for ${service.vehicle.make} ${service.vehicle.model} has been declined.`,
        messageFr: `Votre demande de chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a été refusée.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // POST /chauffeur-services/:serviceId/initialize-payment — passenger pays
  static initializePayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          vehicle: true,
          transaction: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the passenger can initialize payment"
              : "Seul le passager peut initialiser le paiement",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACCEPTED) {
        return next(
          AppError(
            isEN
              ? "Payment can only be initialized for accepted services"
              : "Le paiement ne peut être initialisé que pour les services acceptés",
            400
          )
        );
      }

      if (service.transaction && service.transaction.status === TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment has already been completed for this service"
              : "Le paiement a déjà été effectué pour ce service",
            400
          )
        );
      }

      const settings = await getChauffeurSettings();
      const stripeCustomerId = await TransactionService.getOrCreateStripeCustomer(user);

      const serviceAmount = Number(service.totalAmount);
      const platformFee = serviceAmount * (Number(settings.platformFeePercentage) / 100);
      const driverAmount = serviceAmount - platformFee;

      const amountInCents = Math.round(serviceAmount * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "cad",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          chauffeurServiceId: service.id.toString(),
          type: "CHAUFFEUR_SERVICE",
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.CHAUFFEUR_SERVICE,
          amount: serviceAmount,
          platformAmount: platformFee,
          driverAmount,
          status: TransactionStatus.PENDING,
          paymentProvider: PaymentProvider.STRIPE,
          externalReference: paymentIntent.id,
          currency: "CAD",
        },
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { transactionId: transaction.id },
      });

      return res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          serviceAmount,
          platformFee,
          driverAmount,
        },
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/activate — driver starts the service
  static activateService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { transaction: true, vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can activate this service"
              : "Seul le chauffeur assigné peut activer ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACCEPTED) {
        return next(
          AppError(
            isEN
              ? "Only accepted services can be activated"
              : "Seuls les services acceptés peuvent être activés",
            400
          )
        );
      }

      if (!service.transaction || service.transaction.status !== TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment must be completed before activating the service"
              : "Le paiement doit être complété avant d'activer le service",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.ACTIVE,
          activatedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Service Started",
        titleFr: "Service chauffeur démarré",
        messageEn: `Your chauffeur service for ${service.vehicle.make} ${service.vehicle.model} has started.`,
        messageFr: `Votre service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a démarré.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/complete — mark service as completed
  static completeService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          transaction: true,
          vehicle: true,
          driver: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the passenger or driver can complete this service"
              : "Seul le passager ou le chauffeur peut terminer ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Only active services can be completed"
              : "Seuls les services actifs peuvent être terminés",
            400
          )
        );
      }

      // Transfer driver's portion via Stripe Connect
      if (service.transaction && service.driver.stripeAccountId) {
        const driverAmountInCents = Math.round(service.transaction.driverAmount * 100);

        if (driverAmountInCents > 0) {
          const transfer = await stripe.transfers.create({
            amount: driverAmountInCents,
            currency: "cad",
            destination: service.driver.stripeAccountId,
            metadata: {
              chauffeurServiceId: service.id.toString(),
              transactionId: service.transaction.id.toString(),
            },
          });

          await prisma.transaction.update({
            where: { id: service.transaction.id },
            data: {
              stripeTransferId: transfer.id,
              isDriverPaid: true,
              driverPaidAt: new Date(),
            },
          });
        }
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Service Completed",
        titleFr: "Service chauffeur terminé",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} has been completed.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} est terminé.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/cancel — cancel a service
  static cancelService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason?: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          transaction: { include: { tax: true } },
          vehicle: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to cancel this service"
              : "Vous n'êtes pas autorisé à annuler ce service",
            403
          )
        );
      }

      if (service.status === ChauffeurStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Active services cannot be cancelled. Please file a dispute instead"
              : "Les services actifs ne peuvent pas être annulés. Veuillez déposer un litige",
            400
          )
        );
      }

      const terminalStatuses: ChauffeurStatus[] = [
        ChauffeurStatus.COMPLETED,
        ChauffeurStatus.CANCELLED,
        ChauffeurStatus.DECLINED,
      ];
      if (terminalStatuses.includes(service.status)) {
        return next(
          AppError(
            isEN
              ? "This service cannot be cancelled"
              : "Ce service ne peut pas être annulé",
            400
          )
        );
      }

      // Refund payment if exists
      if (service.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          service.transaction,
          service.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason || null,
        },
        include: chauffeurInclude,
      });

      // Notify the other party
      const notifyUserId = user.id === service.passengerId ? service.driverId : service.passengerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Chauffeur Service Cancelled",
        titleFr: "Service chauffeur annulé",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} has been cancelled.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a été annulé.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // POST /chauffeur-services/:serviceId/dispute — file a dispute
  static disputeService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to dispute this service"
              : "Vous n'êtes pas autorisé à contester ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACTIVE && service.status !== ChauffeurStatus.COMPLETED) {
        return next(
          AppError(
            isEN
              ? "Only active or completed services can be disputed"
              : "Seuls les services actifs ou terminés peuvent être contestés",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.DISPUTED,
          cancellationReason: reason,
        },
        include: chauffeurInclude,
      });

      // Notify the other party
      const notifyUserId = user.id === service.passengerId ? service.driverId : service.passengerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Chauffeur Service Disputed",
        titleFr: "Service chauffeur contesté",
        messageEn: `A dispute has been filed for the chauffeur service of ${service.vehicle.make} ${service.vehicle.model}.`,
        messageFr: `Un litige a été déposé pour le service chauffeur du ${service.vehicle.make} ${service.vehicle.model}.`,
        chauffeurServiceId: service.id,
      });

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      if (admins.length > 0) {
        await NotificationServices.notifyUsers({
          userIds: admins.map((a) => a.id),
          titleEn: "Chauffeur Service Dispute Raised",
          titleFr: "Litige de service chauffeur ouvert",
          messageEn: `A dispute has been raised for chauffeur service #${service.id} (${service.vehicle.make} ${service.vehicle.model}).`,
          messageFr: `Un litige a été ouvert pour le service chauffeur #${service.id} (${service.vehicle.make} ${service.vehicle.model}).`,
          chauffeurServiceId: service.id,
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // GET /public/chauffeur-drivers — search available drivers
  static searchAvailableDrivers = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        minHourlyRate,
        maxHourlyRate,
        minDailyRate,
        maxDailyRate,
        startDate,
        endDate,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        minHourlyRate?: number;
        maxHourlyRate?: number;
        minDailyRate?: number;
        maxDailyRate?: number;
        startDate?: string;
        endDate?: string;
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: Prisma.UserWhereInput = {
        isAvailableForChauffeur: true,
        isDeleted: false,
      };

      if (minHourlyRate !== undefined) {
        where.chauffeurHourlyRate = {
          ...((where.chauffeurHourlyRate as Prisma.DecimalNullableFilter) || {}),
          gte: minHourlyRate,
        };
      }

      if (maxHourlyRate !== undefined) {
        where.chauffeurHourlyRate = {
          ...((where.chauffeurHourlyRate as Prisma.DecimalNullableFilter) || {}),
          lte: maxHourlyRate,
        };
      }

      if (minDailyRate !== undefined) {
        where.chauffeurDailyRate = {
          ...((where.chauffeurDailyRate as Prisma.DecimalNullableFilter) || {}),
          gte: minDailyRate,
        };
      }

      if (maxDailyRate !== undefined) {
        where.chauffeurDailyRate = {
          ...((where.chauffeurDailyRate as Prisma.DecimalNullableFilter) || {}),
          lte: maxDailyRate,
        };
      }

      // Exclude drivers with overlapping bookings
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        where.driverChauffeurServices = {
          none: {
            status: {
              in: [ChauffeurStatus.REQUESTED, ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE],
            },
            startDate: { lt: end },
            endDate: { gt: start },
          },
        };
      }

      const [drivers, total] = await prisma.$transaction([
        prisma.user.findMany({
          skip,
          take,
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            averageRating: true,
            totalRatings: true,
            profileImage: true,
            chauffeurHourlyRate: true,
            chauffeurDailyRate: true,
            chauffeurDescription: true,
            drivingExperience: true,
          },
          orderBy: { averageRating: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: drivers,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/chauffeur.controller.ts
git commit -m "feat(chauffeur): add chauffeur controller with all user endpoints"
```

---

### Task 6: Chauffeur Admin Controller

**Files:**
- Create: `src/controllers/chauffeurAdmin.controller.ts`

- [ ] **Step 1: Create the admin controller file**

Create `src/controllers/chauffeurAdmin.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import {
  ChauffeurStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { stripe } from "../config/stripe";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import { chauffeurInclude } from "../services/chauffeur.service";

export class ChauffeurAdminController {
  // GET /admin/chauffeur-services — paginated list of all services
  static getAllServices = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: ChauffeurStatus;
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [services, total] = await prisma.$transaction([
        prisma.chauffeurService.findMany({
          skip,
          take,
          where,
          include: chauffeurInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.chauffeurService.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: services,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );

  // GET /admin/chauffeur-services/:serviceId — get a single service
  static getService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: chauffeurInclude,
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: service,
      });
    }
  );

  // PATCH /admin/chauffeur-services/:serviceId/cancel — force cancel
  static forceCancel = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason?: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          transaction: { include: { tax: true } },
          vehicle: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      // Refund payment if exists
      if (service.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          service.transaction,
          service.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason || "Cancelled by admin",
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Service Cancelled by Admin",
        titleFr: "Service chauffeur annulé par l'administrateur",
        messageEn: `The chauffeur service for ${service.vehicle.make} ${service.vehicle.model} has been cancelled by an administrator.`,
        messageFr: `Le service chauffeur pour ${service.vehicle.make} ${service.vehicle.model} a été annulé par un administrateur.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /admin/chauffeur-services/:serviceId/resolve-dispute
  static resolveDispute = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.status !== ChauffeurStatus.DISPUTED) {
        return next(
          AppError(
            isEN
              ? "Only disputed services can be resolved"
              : "Seuls les services contestés peuvent être résolus",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Dispute Resolved",
        titleFr: "Litige résolu",
        messageEn: `The dispute for the chauffeur service of ${service.vehicle.make} ${service.vehicle.model} has been resolved.`,
        messageFr: `Le litige pour le service chauffeur du ${service.vehicle.make} ${service.vehicle.model} a été résolu.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // GET /admin/chauffeur-services/settings
  static getSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let settings = await prisma.chauffeurSettings.findFirst();

      if (!settings) {
        settings = await prisma.chauffeurSettings.create({
          data: {
            platformFeePercentage: 15,
            maxServiceDurationDays: 30,
            minServiceDurationHours: 1,
            requestExpiryHours: 24,
            overdueGracePeriodHours: 3,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    }
  );

  // PUT /admin/chauffeur-services/settings
  static updateSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);

      const existing = await prisma.chauffeurSettings.findFirst();

      let settings;
      if (existing) {
        settings = await prisma.chauffeurSettings.update({
          where: { id: existing.id },
          data,
        });
      } else {
        settings = await prisma.chauffeurSettings.create({
          data: {
            platformFeePercentage: data.platformFeePercentage ?? 15,
            maxServiceDurationDays: data.maxServiceDurationDays ?? 30,
            minServiceDurationHours: data.minServiceDurationHours ?? 1,
            requestExpiryHours: data.requestExpiryHours ?? 24,
            overdueGracePeriodHours: data.overdueGracePeriodHours ?? 3,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    }
  );

  // GET /admin/chauffeur-services/stats
  static getStats = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const [
        totalServices,
        requestedCount,
        acceptedCount,
        activeCount,
        completedCount,
        cancelledCount,
        declinedCount,
        disputedCount,
        revenueStats,
      ] = await prisma.$transaction([
        prisma.chauffeurService.count(),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.REQUESTED } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.ACCEPTED } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.ACTIVE } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.COMPLETED } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.CANCELLED } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.DECLINED } }),
        prisma.chauffeurService.count({ where: { status: ChauffeurStatus.DISPUTED } }),
        prisma.transaction.aggregate({
          where: {
            type: TransactionType.CHAUFFEUR_SERVICE,
            status: TransactionStatus.PAID,
          },
          _sum: {
            amount: true,
            platformAmount: true,
            driverAmount: true,
          },
          _count: true,
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalServices,
          byStatus: {
            requested: requestedCount,
            accepted: acceptedCount,
            active: activeCount,
            completed: completedCount,
            cancelled: cancelledCount,
            declined: declinedCount,
            disputed: disputedCount,
          },
          revenue: {
            totalTransactions: revenueStats._count,
            totalAmount: revenueStats._sum.amount || 0,
            totalPlatformAmount: revenueStats._sum.platformAmount || 0,
            totalDriverAmount: revenueStats._sum.driverAmount || 0,
          },
        },
      });
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/chauffeurAdmin.controller.ts
git commit -m "feat(chauffeur): add chauffeur admin controller"
```

---

### Task 7: Route Files

**Files:**
- Create: `src/routes/chauffeur.routes.ts`
- Create: `src/routes/chauffeurAdmin.routes.ts`

- [ ] **Step 1: Create user routes file**

Create `src/routes/chauffeur.routes.ts`:

```typescript
import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { validateCreateChauffeurService, chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
import { ChauffeurController } from "../controllers/chauffeur.controller";

const router = Router();

router.get("/", ...chauffeurValidators.getServices, validateRequestBody, ChauffeurController.getServices);
router.get("/:serviceId", ...chauffeurValidators.getService, validateRequestBody, ChauffeurController.getService);
router.post("/", validateCreateChauffeurService, validateRequestBody, ChauffeurController.createService);
router.patch("/:serviceId/accept", ...chauffeurValidators.acceptService, validateRequestBody, ChauffeurController.acceptService);
router.patch("/:serviceId/decline", ...chauffeurValidators.declineService, validateRequestBody, ChauffeurController.declineService);
router.post("/:serviceId/initialize-payment", ...chauffeurValidators.initializePayment, validateRequestBody, ChauffeurController.initializePayment);
router.patch("/:serviceId/activate", ...chauffeurValidators.activateService, validateRequestBody, ChauffeurController.activateService);
router.patch("/:serviceId/complete", ...chauffeurValidators.completeService, validateRequestBody, ChauffeurController.completeService);
router.patch("/:serviceId/cancel", ...chauffeurValidators.cancelService, validateRequestBody, ChauffeurController.cancelService);
router.post("/:serviceId/dispute", ...chauffeurValidators.dispute, validateRequestBody, ChauffeurController.disputeService);

export default router;
```

- [ ] **Step 2: Create admin routes file**

Create `src/routes/chauffeurAdmin.routes.ts`:

```typescript
import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequestBody } from "../middlewares/validators";
import { chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
import { ChauffeurAdminController } from "../controllers/chauffeurAdmin.controller";
import { validationMsg } from "../utils/validation";

const router = Router();

router.get("/", ...chauffeurValidators.getServices, validateRequestBody, ChauffeurAdminController.getAllServices);
router.get("/settings", ChauffeurAdminController.getSettings);
router.put("/settings",
  body("platformFeePercentage").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("maxServiceDurationDays").optional().isInt({ min: 1 }).toInt(),
  body("minServiceDurationHours").optional().isInt({ min: 1 }).toInt(),
  body("requestExpiryHours").optional().isInt({ min: 1 }).toInt(),
  body("overdueGracePeriodHours").optional().isInt({ min: 1 }).toInt(),
  validateRequestBody,
  ChauffeurAdminController.updateSettings
);
router.get("/stats", ChauffeurAdminController.getStats);
router.get("/:serviceId", ...chauffeurValidators.getService, validateRequestBody, ChauffeurAdminController.getService);
router.patch("/:serviceId/cancel",
  param("serviceId").isInt({ min: 1 }).withMessage(validationMsg("validation.serviceId_positive")).toInt(),
  body("reason").isString().trim().notEmpty().withMessage(validationMsg("validation.cancel_reason_required")),
  validateRequestBody,
  ChauffeurAdminController.forceCancel
);
router.patch("/:serviceId/resolve-dispute", ...chauffeurValidators.getService, validateRequestBody, ChauffeurAdminController.resolveDispute);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/chauffeur.routes.ts src/routes/chauffeurAdmin.routes.ts
git commit -m "feat(chauffeur): add chauffeur user and admin route files"
```

---

### Task 8: Register Routes, Cron Jobs, and Public Endpoint

**Files:**
- Modify: `src/routes/index.ts`
- Modify: `src/routes/public.routes.ts`
- Modify: `src/config/cron.ts`

- [ ] **Step 1: Register chauffeur routes in index.ts**

In `src/routes/index.ts`, add the imports at the top (after the rentalAdmin import):

```typescript
import chauffeurRoutes from "./chauffeur.routes";
import chauffeurAdminRoutes from "./chauffeurAdmin.routes";
```

Add route registrations at the bottom (after the rental admin route):

```typescript
router.use("/chauffeur-services", isAuthenticated, languagePreference, chauffeurRoutes);
router.use("/admin/chauffeur-services", isAuthenticated, languagePreference, isAdmin, chauffeurAdminRoutes);
```

- [ ] **Step 2: Add public driver search endpoint**

In `src/routes/public.routes.ts`, add the import at the top:

```typescript
import { ChauffeurController } from "../controllers/chauffeur.controller";
import { chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
```

Add the route at the bottom (before `export default router`):

```typescript
router.get("/chauffeur-drivers", ...chauffeurValidators.searchAvailableDrivers, validateRequestBody, ChauffeurController.searchAvailableDrivers);
```

- [ ] **Step 3: Register cron jobs**

In `src/config/cron.ts`, add the import:

```typescript
import { initializeChauffeurCronJobs } from "../services/chauffeur.service";
```

Add the call inside `initializeCronJobs()` (after `initializeRentalCronJobs()`):

```typescript
    initializeChauffeurCronJobs();
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.ts src/routes/public.routes.ts src/config/cron.ts
git commit -m "feat(chauffeur): register routes, public endpoint, and cron jobs"
```

---

### Task 9: Verify Build

- [ ] **Step 1: Generate Prisma client**

```bash
cd D:/node/your-drive/server && npx prisma generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 2: Run TypeScript compilation check**

```bash
cd D:/node/your-drive/server && npx tsc --noEmit
```

Expected: No errors. If there are errors, fix them based on the output.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(chauffeur): fix compilation errors"
```

Only run this step if fixes were required in Step 2.
