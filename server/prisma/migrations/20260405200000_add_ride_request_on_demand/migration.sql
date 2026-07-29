-- AlterTable: add driver availability flag for on-demand ride requests
ALTER TABLE "User" ADD COLUMN "isAvailableForRideRequest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add passenger-proposed fare on ride requests (inDrive-style)
ALTER TABLE "RideRequest" ADD COLUMN "proposedFare" DECIMAL(10,2);
