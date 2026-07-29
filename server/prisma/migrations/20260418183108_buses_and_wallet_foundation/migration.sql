-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'COMMISSION_DEBIT';
ALTER TYPE "TransactionType" ADD VALUE 'WALLET_CREDIT';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'BUS_OPERATOR';

-- AlterEnum
ALTER TYPE "VehicleCategory" ADD VALUE 'BUS';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "alightingStopId" INTEGER,
ADD COLUMN     "boardingStopId" INTEGER;

-- AlterTable
ALTER TABLE "BookingSeat" ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "routeId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletBalanceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walletDebtLimitCents" INTEGER;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "seatLayout" JSONB;

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" SERIAL NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "originCity" TEXT NOT NULL,
    "destCity" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRouteStop" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "BusRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletSettings" (
    "id" SERIAL NOT NULL,
    "defaultDebtLimitCents" INTEGER NOT NULL DEFAULT 500000,
    "enforceDebtLimit" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusRoute_originCity_destCity_isActive_idx" ON "BusRoute"("originCity", "destCity", "isActive");

-- CreateIndex
CREATE INDEX "BusRouteStop_routeId_order_idx" ON "BusRouteStop"("routeId", "order");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRoute" ADD CONSTRAINT "BusRoute_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteStop" ADD CONSTRAINT "BusRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "BusRouteStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "BusRouteStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
