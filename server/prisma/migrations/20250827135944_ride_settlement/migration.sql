-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "isSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settlementFailedReason" TEXT;
