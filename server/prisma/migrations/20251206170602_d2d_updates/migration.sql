/*
  Warnings:

  - You are about to drop the column `allowMultiPassenger` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationFeeAfterAccepted` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `extraKmThreshold` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `minRadiusKm` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `ratePerKm` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the `D2DRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[d2dBookingId]` on the table `BookingSeat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "D2DBookingRequestStatus" AS ENUM ('POSTED', 'ACCEPTED', 'CONFIRMED', 'CANCELED', 'DECLINED');

-- DropForeignKey
ALTER TABLE "D2DRequest" DROP CONSTRAINT "D2DRequest_driverId_fkey";

-- DropForeignKey
ALTER TABLE "D2DRequest" DROP CONSTRAINT "D2DRequest_dropoffLocationId_fkey";

-- DropForeignKey
ALTER TABLE "D2DRequest" DROP CONSTRAINT "D2DRequest_passengerId_fkey";

-- DropForeignKey
ALTER TABLE "D2DRequest" DROP CONSTRAINT "D2DRequest_pickupLocationId_fkey";

-- DropForeignKey
ALTER TABLE "D2DRequest" DROP CONSTRAINT "D2DRequest_rideId_fkey";

-- AlterTable
ALTER TABLE "BookingSeat" ADD COLUMN     "d2dBookingId" INTEGER,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "D2DSetting" DROP COLUMN "allowMultiPassenger",
DROP COLUMN "cancellationFeeAfterAccepted",
DROP COLUMN "extraKmThreshold",
DROP COLUMN "minRadiusKm",
DROP COLUMN "ratePerKm",
ADD COLUMN     "maxPricePerExtraKm" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "PaymentSession" ADD COLUMN     "d2dBookingId" INTEGER;

-- AlterTable
ALTER TABLE "RedeemedCoupon" ADD COLUMN     "d2dBookingId" INTEGER;

-- DropTable
DROP TABLE "D2DRequest";

-- DropEnum
DROP TYPE "D2DStatus";

-- CreateTable
CREATE TABLE "D2DBookingRequest" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER NOT NULL,
    "passengerId" INTEGER NOT NULL,
    "pickupLocationId" INTEGER NOT NULL,
    "dropoffLocationId" INTEGER NOT NULL,
    "detourDistance" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "rideDurationMinutes" INTEGER,
    "status" "D2DBookingRequestStatus" NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "canceledBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "extraKms" DOUBLE PRECISION,
    "reason" TEXT,
    "transactionId" INTEGER,

    CONSTRAINT "D2DBookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "D2DBookingRequest_pickupLocationId_key" ON "D2DBookingRequest"("pickupLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "D2DBookingRequest_dropoffLocationId_key" ON "D2DBookingRequest"("dropoffLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "D2DBookingRequest_transactionId_key" ON "D2DBookingRequest"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_d2dBookingId_key" ON "BookingSeat"("d2dBookingId");

-- AddForeignKey
ALTER TABLE "D2DBookingRequest" ADD CONSTRAINT "D2DBookingRequest_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DBookingRequest" ADD CONSTRAINT "D2DBookingRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DBookingRequest" ADD CONSTRAINT "D2DBookingRequest_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DBookingRequest" ADD CONSTRAINT "D2DBookingRequest_dropoffLocationId_fkey" FOREIGN KEY ("dropoffLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DBookingRequest" ADD CONSTRAINT "D2DBookingRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_d2dBookingId_fkey" FOREIGN KEY ("d2dBookingId") REFERENCES "D2DBookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedCoupon" ADD CONSTRAINT "RedeemedCoupon_d2dBookingId_fkey" FOREIGN KEY ("d2dBookingId") REFERENCES "D2DBookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_d2dBookingId_fkey" FOREIGN KEY ("d2dBookingId") REFERENCES "D2DBookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
