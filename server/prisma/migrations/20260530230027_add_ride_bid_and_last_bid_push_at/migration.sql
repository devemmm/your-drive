-- CreateEnum
CREATE TYPE "RideBidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastBidPushAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RideBid" (
    "id" SERIAL NOT NULL,
    "rideRequestId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "bidAmount" DECIMAL(10,2) NOT NULL,
    "status" "RideBidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RideBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideBid_rideRequestId_status_idx" ON "RideBid"("rideRequestId", "status");

-- CreateIndex
CREATE INDEX "RideBid_driverId_status_idx" ON "RideBid"("driverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RideBid_rideRequestId_driverId_key" ON "RideBid"("rideRequestId", "driverId");

-- AddForeignKey
ALTER TABLE "RideBid" ADD CONSTRAINT "RideBid_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBid" ADD CONSTRAINT "RideBid_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBid" ADD CONSTRAINT "RideBid_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
