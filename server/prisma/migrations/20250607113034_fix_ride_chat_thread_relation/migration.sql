/*
  Warnings:

  - A unique constraint covering the columns `[rideId]` on the table `ChatThread` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ChatThread" DROP CONSTRAINT "ChatThread_bookingId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_rideId_key" ON "ChatThread"("rideId");
