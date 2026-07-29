/*
  Warnings:

  - You are about to drop the `_ReviewToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NoShowReporterType" AS ENUM ('DRIVER', 'PASSENGER');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('NORMAL', 'CANCELLATION', 'NO_SHOW');

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "_ReviewToUser" DROP CONSTRAINT "_ReviewToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ReviewToUser" DROP CONSTRAINT "_ReviewToUser_B_fkey";

-- DropIndex
DROP INDEX "Review_userId_rideId_key";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "type" "ReviewType" NOT NULL DEFAULT 'NORMAL',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "isRideCompleteReminderSent" BOOLEAN,
ADD COLUMN     "isStartReminderSent" BOOLEAN,
ADD COLUMN     "isThirtyMinReminderSent" BOOLEAN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendUntil" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- DropTable
DROP TABLE "_ReviewToUser";

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
