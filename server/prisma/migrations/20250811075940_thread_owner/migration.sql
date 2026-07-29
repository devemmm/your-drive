/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,rideId]` on the table `ChatThread` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "ownerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_ownerId_rideId_key" ON "ChatThread"("ownerId", "rideId");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
