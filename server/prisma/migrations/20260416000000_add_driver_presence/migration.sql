-- CreateTable
CREATE TABLE "DriverPresence" (
    "userId" INTEGER NOT NULL,
    "currentVehicleId" INTEGER,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverPresence_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverPresence_currentVehicleId_key" ON "DriverPresence"("currentVehicleId");

-- CreateIndex
CREATE INDEX "DriverPresence_updatedAt_idx" ON "DriverPresence"("updatedAt");

-- CreateIndex
CREATE INDEX "DriverPresence_latitude_longitude_idx" ON "DriverPresence"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "DriverPresence" ADD CONSTRAINT "DriverPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPresence" ADD CONSTRAINT "DriverPresence_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
