-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "redeemReason" TEXT;

-- AlterTable
ALTER TABLE "RidePreference" ADD COLUMN     "skiRack" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedReceiveUpdates" BOOLEAN NOT NULL DEFAULT false;
