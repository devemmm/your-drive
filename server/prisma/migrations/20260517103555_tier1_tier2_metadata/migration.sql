-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC');
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'DISABLED');
CREATE TYPE "VehicleTier" AS ENUM ('ECONOMY', 'PREMIUM');

-- AlterEnum: AssetCategory + TRIP_EVIDENCE
ALTER TYPE "AssetCategory" ADD VALUE 'TRIP_EVIDENCE';

-- AlterTable: Vehicle metadata + status + tier
ALTER TABLE "Vehicle"
    ADD COLUMN "transmission" "Transmission",
    ADD COLUMN "fuelType"     "FuelType",
    ADD COLUMN "status"       "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN "tier"         "VehicleTier";

-- AlterTable: User.languagesSpoken
ALTER TABLE "User" ADD COLUMN "languagesSpoken" JSONB;

-- CreateTable: VehicleBlockedRange
CREATE TABLE "VehicleBlockedRange" (
    "id"        SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "from"      TIMESTAMP(3) NOT NULL,
    "to"        TIMESTAMP(3) NOT NULL,
    "reason"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleBlockedRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleBlockedRange_vehicleId_from_to_idx" ON "VehicleBlockedRange"("vehicleId", "from", "to");

-- AddForeignKey
ALTER TABLE "VehicleBlockedRange" ADD CONSTRAINT "VehicleBlockedRange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: RentalSettings cancellation tiers
ALTER TABLE "RentalSettings"
    ADD COLUMN "cancelRefundPctOver24h"   DECIMAL(5,2) NOT NULL DEFAULT 100,
    ADD COLUMN "cancelRefundPct12To24h"   DECIMAL(5,2) NOT NULL DEFAULT 80,
    ADD COLUMN "cancelRefundPctUnder12h"  DECIMAL(5,2) NOT NULL DEFAULT 50,
    ADD COLUMN "noShowRefundPct"          DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable: ChauffeurSettings cancellation tiers
ALTER TABLE "ChauffeurSettings"
    ADD COLUMN "cancelRefundPctOver24h"   DECIMAL(5,2) NOT NULL DEFAULT 100,
    ADD COLUMN "cancelRefundPct12To24h"   DECIMAL(5,2) NOT NULL DEFAULT 80,
    ADD COLUMN "cancelRefundPctUnder12h"  DECIMAL(5,2) NOT NULL DEFAULT 50,
    ADD COLUMN "noShowRefundPct"          DECIMAL(5,2) NOT NULL DEFAULT 0;
