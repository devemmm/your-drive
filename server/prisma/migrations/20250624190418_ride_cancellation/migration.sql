/*
  Warnings:

  - You are about to drop the column `cancellationValid` on the `Ride` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "YesNo" AS ENUM ('YES', 'NO');

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "cancellationValid",
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockerId" INTEGER,
ADD COLUMN     "blockingReason" TEXT,
ADD COLUMN     "cancellationCountsAgainstAllowance" "YesNo" NOT NULL DEFAULT 'NO',
ADD COLUMN     "cancellationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReviewedById" INTEGER,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_cancellationReviewedById_fkey" FOREIGN KEY ("cancellationReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
