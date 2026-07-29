-- AlterTable
ALTER TABLE "D2DRequest" ADD COLUMN     "cancelReason" TEXT;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;
