-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('PASSENGER', 'DRIVER', 'BOTH');

-- CreateEnum
CREATE TYPE "SubscriptionDuration" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "usedFreeRide" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SubscriptionType" NOT NULL,
    "duration" "SubscriptionDuration" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "bookingFeeWaived" BOOLEAN NOT NULL DEFAULT true,
    "maxRides" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ridesUsed" INTEGER NOT NULL DEFAULT 0,
    "freeRidesEarned" INTEGER NOT NULL DEFAULT 0,
    "freeRidesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_isActive_key" ON "UserSubscription"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
