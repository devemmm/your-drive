-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_alightingStopId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_boardingStopId_fkey";

-- CreateIndex
CREATE INDEX "Ride_routeId_departureTime_idx" ON "Ride"("routeId", "departureTime");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "BusRouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "BusRouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
