/*
  Warnings:

  - The values [PENDING,APPROVED] on the enum `RideStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `usedFreeRide` on the `Ride` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('POSTING', 'BOOKING');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RIDE_POSTING', 'RIDE_BOOKING', 'DRIVER_SUBSCRIPTION', 'PASSENGER_SUBSCRIPTION', 'BOTH_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MonetizationType" AS ENUM ('SUBSCRIPTION', 'PAYMENT', 'COUPON', 'FREE');

-- CreateEnum
CREATE TYPE "ContributionCollectionMethod" AS ENUM ('VIA_PLATFORM', 'OFF_PLATFORM');

-- AlterEnum
BEGIN;
CREATE TYPE "RideStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Ride" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ride" ALTER COLUMN "status" TYPE "RideStatus_new" USING ("status"::text::"RideStatus_new");
ALTER TYPE "RideStatus" RENAME TO "RideStatus_old";
ALTER TYPE "RideStatus_new" RENAME TO "RideStatus";
DROP TYPE "RideStatus_old";
ALTER TABLE "Ride" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "usedFreeRide",
ADD COLUMN     "contributionCollectionMethod" "ContributionCollectionMethod" NOT NULL DEFAULT 'OFF_PLATFORM',
ADD COLUMN     "estimatedArrivalTime" TIMESTAMP(3),
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monitizationType" "MonetizationType" NOT NULL DEFAULT 'PAYMENT',
ADD COLUMN     "postingSubscriptionId" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "FeeSetting" (
    "id" SERIAL NOT NULL,
    "type" "FeeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rideId" INTEGER,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientSecret" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_rideId_key" ON "Transaction"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalReference_key" ON "Transaction"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_postingSubscriptionId_fkey" FOREIGN KEY ("postingSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
