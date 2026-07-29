-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "routeDepartureId" INTEGER;

-- CreateTable
CREATE TABLE "BusRouteDeparture" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRouteDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusRouteDeparture_routeId_isActive_idx" ON "BusRouteDeparture"("routeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_routeDepartureId_departureTime_key" ON "Ride"("routeDepartureId", "departureTime");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_routeDepartureId_fkey" FOREIGN KEY ("routeDepartureId") REFERENCES "BusRouteDeparture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteDeparture" ADD CONSTRAINT "BusRouteDeparture_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRouteDeparture" ADD CONSTRAINT "BusRouteDeparture_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
