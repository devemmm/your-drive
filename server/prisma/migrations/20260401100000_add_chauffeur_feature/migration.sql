-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('HOURLY', 'DAILY');

-- CreateEnum
CREATE TYPE "FuelPolicy" AS ENUM ('FULL_TO_FULL', 'SAME_LEVEL');

-- CreateEnum
CREATE TYPE "ChauffeurStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ChauffeurServiceType" AS ENUM ('HOURLY', 'DAILY');

-- AlterEnum
ALTER TYPE "CouponTarget" ADD VALUE 'CAR_RENTAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReviewType" ADD VALUE 'RENTAL';
ALTER TYPE "ReviewType" ADD VALUE 'CHAUFFEUR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'CAR_RENTAL';
ALTER TYPE "TransactionType" ADD VALUE 'CAR_RENTAL_DEPOSIT';
ALTER TYPE "TransactionType" ADD VALUE 'CHAUFFEUR_SERVICE';

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_rideId_fkey";

-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "chauffeurServiceId" INTEGER,
ADD COLUMN     "rentalId" INTEGER,
ALTER COLUMN "rideId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "chauffeurServiceId" INTEGER,
ADD COLUMN     "rentalId" INTEGER;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "chauffeurServiceId" INTEGER,
ADD COLUMN     "rentalId" INTEGER,
ALTER COLUMN "rideId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chauffeurDailyRate" DECIMAL(10,2),
ADD COLUMN     "chauffeurDescription" TEXT,
ADD COLUMN     "chauffeurHourlyRate" DECIMAL(10,2),
ADD COLUMN     "isAvailableForChauffeur" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "dailyRate" DECIMAL(10,2),
ADD COLUMN     "fuelPolicy" "FuelPolicy",
ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "isAvailableForRental" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mileageLimit" INTEGER,
ADD COLUMN     "pickupLocationId" INTEGER,
ADD COLUMN     "rentalDescription" TEXT,
ADD COLUMN     "securityDeposit" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "CarRental" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "renterId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentalType" "RentalType" NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "securityDepositAmount" DECIMAL(10,2) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickupLocationId" INTEGER,
    "returnLocationId" INTEGER,
    "pickupNotes" TEXT,
    "returnNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellerId" INTEGER,
    "cancellationReason" TEXT,
    "depositRefunded" BOOLEAN NOT NULL DEFAULT false,
    "depositRefundedAt" TIMESTAMP(3),
    "pickupReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "returnReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "overdueNotifiedAt" TIMESTAMP(3),
    "depositReleaseReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "transactionId" INTEGER,
    "depositTransactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSettings" (
    "id" SERIAL NOT NULL,
    "platformFeePercentage" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "maxRentalDurationDays" INTEGER NOT NULL DEFAULT 30,
    "minRentalDurationHours" INTEGER NOT NULL DEFAULT 1,
    "requestExpiryHours" INTEGER NOT NULL DEFAULT 24,
    "depositReleaseReminderHours" INTEGER NOT NULL DEFAULT 24,
    "overdueGracePeriodHours" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChauffeurService" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "passengerId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "serviceType" "ChauffeurServiceType" NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "ChauffeurStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickupLocationId" INTEGER,
    "dropoffLocationId" INTEGER,
    "pickupNotes" TEXT,
    "dropoffNotes" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellerId" INTEGER,
    "cancellationReason" TEXT,
    "pickupReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "completionReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "overdueNotifiedAt" TIMESTAMP(3),
    "transactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChauffeurService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChauffeurSettings" (
    "id" SERIAL NOT NULL,
    "platformFeePercentage" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "maxServiceDurationDays" INTEGER NOT NULL DEFAULT 30,
    "minServiceDurationHours" INTEGER NOT NULL DEFAULT 1,
    "requestExpiryHours" INTEGER NOT NULL DEFAULT 24,
    "overdueGracePeriodHours" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChauffeurSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarRental_pickupLocationId_key" ON "CarRental"("pickupLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarRental_returnLocationId_key" ON "CarRental"("returnLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarRental_transactionId_key" ON "CarRental"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CarRental_depositTransactionId_key" ON "CarRental"("depositTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChauffeurService_pickupLocationId_key" ON "ChauffeurService"("pickupLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChauffeurService_dropoffLocationId_key" ON "ChauffeurService"("dropoffLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChauffeurService_transactionId_key" ON "ChauffeurService"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_rentalId_key" ON "ChatThread"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_chauffeurServiceId_key" ON "ChatThread"("chauffeurServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_pickupLocationId_key" ON "Vehicle"("pickupLocationId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_returnLocationId_fkey" FOREIGN KEY ("returnLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_cancellerId_fkey" FOREIGN KEY ("cancellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRental" ADD CONSTRAINT "CarRental_depositTransactionId_fkey" FOREIGN KEY ("depositTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_dropoffLocationId_fkey" FOREIGN KEY ("dropoffLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_cancellerId_fkey" FOREIGN KEY ("cancellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChauffeurService" ADD CONSTRAINT "ChauffeurService_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CarRental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_chauffeurServiceId_fkey" FOREIGN KEY ("chauffeurServiceId") REFERENCES "ChauffeurService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CarRental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chauffeurServiceId_fkey" FOREIGN KEY ("chauffeurServiceId") REFERENCES "ChauffeurService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CarRental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_chauffeurServiceId_fkey" FOREIGN KEY ("chauffeurServiceId") REFERENCES "ChauffeurService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

