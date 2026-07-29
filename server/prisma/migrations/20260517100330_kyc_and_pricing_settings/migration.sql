-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AssetCategory" ADD VALUE 'YELLOW_CARD';
ALTER TYPE "AssetCategory" ADD VALUE 'VEHICLE_INSURANCE';
ALTER TYPE "AssetCategory" ADD VALUE 'VEHICLE_AUTHORIZATION';

-- AlterTable: User KYC columns
ALTER TABLE "User"
    ADD COLUMN "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "kycReviewedAt" TIMESTAMP(3),
    ADD COLUMN "kycReviewedById" INTEGER,
    ADD COLUMN "kycReviewNotes" TEXT;

-- Backfill: existing onboarded drivers and admins are grandfathered in as APPROVED
-- so they remain functional after the migration. New drivers will be PENDING.
UPDATE "User"
SET "kycStatus" = 'APPROVED',
    "kycReviewedAt" = NOW()
WHERE "isDriverOnboarded" = true OR "role" = 'ADMIN';

-- AddForeignKey for User.kycReviewedById
ALTER TABLE "User" ADD CONSTRAINT "User_kycReviewedById_fkey" FOREIGN KEY ("kycReviewedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AlterTable: Vehicle KYC columns
ALTER TABLE "Vehicle"
    ADD COLUMN "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "kycReviewedAt" TIMESTAMP(3),
    ADD COLUMN "kycReviewedById" INTEGER,
    ADD COLUMN "kycReviewNotes" TEXT;

-- Backfill: existing vehicles are grandfathered as APPROVED (they came in via the
-- pre-KYC auto-approve flow).
UPDATE "Vehicle"
SET "kycStatus" = 'APPROVED',
    "kycReviewedAt" = NOW();

-- AddForeignKey for Vehicle.kycReviewedById
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_kycReviewedById_fkey" FOREIGN KEY ("kycReviewedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- CreateTable: PricingSettings
CREATE TABLE "PricingSettings" (
    "id"                SERIAL NOT NULL,
    "vehicleCategory"   "VehicleCategory" NOT NULL,
    "rideType"          "RideType" NOT NULL,
    "baseFare"          DECIMAL(10,2) NOT NULL,
    "perKm"             DECIMAL(10,2) NOT NULL,
    "perMinute"         DECIMAL(10,2) NOT NULL,
    "minimumFare"       DECIMAL(10,2) NOT NULL,
    "commissionPercent" DECIMAL(5,2)  NOT NULL DEFAULT 10,
    "currency"          TEXT          NOT NULL DEFAULT 'RWF',
    "isActive"          BOOLEAN       NOT NULL DEFAULT true,
    "effectiveFrom"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingSettings_vehicleCategory_rideType_isActive_key" ON "PricingSettings"("vehicleCategory", "rideType", "isActive");

-- Seed sensible defaults (RWF). Admin can edit via /admin/pricing-settings.
INSERT INTO "PricingSettings" ("vehicleCategory", "rideType", "baseFare", "perKm", "perMinute", "minimumFare", "commissionPercent", "updatedAt") VALUES
    ('CAR',       'P2P', 1000, 300, 50, 1500, 10, NOW()),
    ('CAR',       'D2D', 1000, 300, 50, 1500, 10, NOW()),
    ('MOTORBIKE', 'P2P',  500, 150, 30,  800, 10, NOW()),
    ('MOTORBIKE', 'D2D',  500, 150, 30,  800, 10, NOW());
