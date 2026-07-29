/*
  Warnings:

  - You are about to drop the column `reversedAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reversedAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transferReversalId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transferReversalReason` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BookingSeat" DROP CONSTRAINT "BookingSeat_rideId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "reversedAmount",
DROP COLUMN "reversedAt",
DROP COLUMN "transferReversalId",
DROP COLUMN "transferReversalReason";

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
