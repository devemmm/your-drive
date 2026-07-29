-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('D2D', 'P2P');

-- CreateEnum
CREATE TYPE "RideRequestStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "rideRequestId" INTEGER;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "type" "RideType" NOT NULL DEFAULT 'P2P';

-- AlterTable
ALTER TABLE "Tax" ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "isCollected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "originId" INTEGER NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeWindowStart" TIMESTAMP(3),
    "timeWindowEnd" TIMESTAMP(3),
    "seats" INTEGER NOT NULL DEFAULT 1,
    "proximityMeters" INTEGER NOT NULL DEFAULT 25000,
    "status" "RideRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rideType" "RideType" NOT NULL,
    "closeAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideRequestMatch" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "rideId" INTEGER NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideRequestMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideRequest_originId_key" ON "RideRequest"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "RideRequest_destinationId_key" ON "RideRequest"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "RideRequestMatch_requestId_rideId_key" ON "RideRequestMatch"("requestId", "rideId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequestMatch" ADD CONSTRAINT "RideRequestMatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RideRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequestMatch" ADD CONSTRAINT "RideRequestMatch_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
