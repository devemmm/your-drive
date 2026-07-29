/*
  Warnings:

  - You are about to drop the column `isTransferred` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `stripeChargeAccount` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "isTransferred",
DROP COLUMN "stripeChargeAccount",
ADD COLUMN     "driverNetAmountPaid" DOUBLE PRECISION,
ADD COLUMN     "driverStripeFee" DOUBLE PRECISION,
ADD COLUMN     "isDriverPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTransferReversed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformNetAmount" DOUBLE PRECISION,
ADD COLUMN     "platformStripeFee" DOUBLE PRECISION,
ADD COLUMN     "reversedAmount" DOUBLE PRECISION,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "transferReversalId" TEXT,
ADD COLUMN     "transferReversalReason" TEXT;

-- DropEnum
DROP TYPE "StripeChargeAccount";
