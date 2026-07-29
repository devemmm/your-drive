/*
  Warnings:

  - You are about to drop the column `bookingFeeWaived` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `maxRides` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - The `notificationPref` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `freeRidesEarned` on the `UserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `freeRidesUsed` on the `UserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `maxRides` on the `UserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `ridesUsed` on the `UserSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStatus" ADD VALUE 'ONHOLD';
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "TransactionStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_transactionId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancellerId" INTEGER,
ADD COLUMN     "monitizationType" "MonetizationType" NOT NULL DEFAULT 'PAYMENT',
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "transactionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "bookingFeeWaived",
DROP COLUMN "maxRides";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "driverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "platformAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT,
DROP COLUMN "notificationPref",
ADD COLUMN     "notificationPref" "NotificationPreference" NOT NULL DEFAULT 'IN_APP';

-- AlterTable
ALTER TABLE "UserSubscription" DROP COLUMN "freeRidesEarned",
DROP COLUMN "freeRidesUsed",
DROP COLUMN "maxRides",
DROP COLUMN "ridesUsed";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_transactionId_key" ON "Booking"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellerId_fkey" FOREIGN KEY ("cancellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
