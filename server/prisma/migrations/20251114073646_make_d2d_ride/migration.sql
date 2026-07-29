-- CreateEnum
CREATE TYPE "D2DStatus" AS ENUM ('POSTED', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELED');

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "basePrice" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "d2dCapacity" INTEGER,
ADD COLUMN     "detourRadius" INTEGER,
ADD COLUMN     "extraKmPrice" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isDoorToDoor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "D2DRequest" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "passengerId" INTEGER NOT NULL,
    "pickupLocationId" INTEGER NOT NULL,
    "dropoffLocationId" INTEGER NOT NULL,
    "detourDistance" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "status" "D2DStatus" NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "D2DRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "D2DRequest" ADD CONSTRAINT "D2DRequest_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DRequest" ADD CONSTRAINT "D2DRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DRequest" ADD CONSTRAINT "D2DRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DRequest" ADD CONSTRAINT "D2DRequest_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "D2DRequest" ADD CONSTRAINT "D2DRequest_dropoffLocationId_fkey" FOREIGN KEY ("dropoffLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
