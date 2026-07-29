/*
  Warnings:

  - A unique constraint covering the columns `[rideId,userId,reportedById]` on the table `NoShow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NoShowStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NoShowReportType" AS ENUM ('DRIVER_REPORTED_PASSENGER', 'PASSENGER_REPORTED_DRIVER');

-- AlterTable
ALTER TABLE "NoShow" ADD COLUMN     "reportType" "NoShowReportType",
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "status" "NoShowStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "NoShowReporterType";

-- CreateIndex
CREATE UNIQUE INDEX "NoShow_rideId_userId_reportedById_key" ON "NoShow"("rideId", "userId", "reportedById");

-- AddForeignKey
ALTER TABLE "NoShow" ADD CONSTRAINT "NoShow_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
