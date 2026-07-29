/*
  Warnings:

  - The values [IN_PROGRESS] on the enum `RideStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `depCity` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `depLat` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `depLng` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `depLocation` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `depLocationName` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destCity` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destLat` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destLng` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destLocation` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destLocationName` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `stopovers` on the `Ride` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[departureLocationId]` on the table `Ride` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[destinationLocationId]` on the table `Ride` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `departureLocationId` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLocationId` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LuggageSize" AS ENUM ('NONE', 'SMALL', 'MEDIUM', 'LARGE');

-- AlterEnum
BEGIN;
CREATE TYPE "RideStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Ride" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ride" ALTER COLUMN "status" TYPE "RideStatus_new" USING ("status"::text::"RideStatus_new");
ALTER TYPE "RideStatus" RENAME TO "RideStatus_old";
ALTER TYPE "RideStatus_new" RENAME TO "RideStatus";
DROP TYPE "RideStatus_old";
ALTER TABLE "Ride" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "depCity",
DROP COLUMN "depLat",
DROP COLUMN "depLng",
DROP COLUMN "depLocation",
DROP COLUMN "depLocationName",
DROP COLUMN "destCity",
DROP COLUMN "destLat",
DROP COLUMN "destLng",
DROP COLUMN "destLocation",
DROP COLUMN "destLocationName",
DROP COLUMN "preferences",
DROP COLUMN "stopovers",
ADD COLUMN     "departureLocationId" INTEGER NOT NULL,
ADD COLUMN     "destinationLocationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isRefunded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "RidePreference" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER NOT NULL,
    "smoking" BOOLEAN NOT NULL DEFAULT false,
    "pets" BOOLEAN NOT NULL DEFAULT false,
    "airConditioning" BOOLEAN NOT NULL DEFAULT false,
    "ladiesOnly" BOOLEAN NOT NULL DEFAULT false,
    "bicycleSupport" BOOLEAN NOT NULL DEFAULT false,
    "snowTires" BOOLEAN NOT NULL DEFAULT false,
    "luggageSize" "LuggageSize" NOT NULL DEFAULT 'NONE',
    "luggageCount" INTEGER NOT NULL DEFAULT 0,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gentsOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RidePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Rwanda',
    "region" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationPoint" geography(POINT, 4326),
    "rideStopoverId" INTEGER,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RidePreference_rideId_key" ON "RidePreference"("rideId");

-- CreateIndex
CREATE INDEX "Location_region_idx" ON "Location"("region");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE INDEX "Location_city_region_idx" ON "Location"("city", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_departureLocationId_key" ON "Ride"("departureLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_destinationLocationId_key" ON "Ride"("destinationLocationId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_departureLocationId_fkey" FOREIGN KEY ("departureLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidePreference" ADD CONSTRAINT "RidePreference_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_rideStopoverId_fkey" FOREIGN KEY ("rideStopoverId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- create a GIST index on the locationPoint column for spatial queries
CREATE INDEX location_point_idx
ON "Location"
USING GIST ("locationPoint");

