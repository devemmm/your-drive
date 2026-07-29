-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "rideRequestId" INTEGER;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
