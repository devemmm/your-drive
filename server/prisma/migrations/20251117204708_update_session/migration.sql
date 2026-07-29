/*
  Warnings:

  - You are about to drop the column `monetizationType` on the `PaymentSession` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "FeeType" ADD VALUE 'DEFAULT_PLATFORM_FEE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentSessionStatus" ADD VALUE 'PAYMENT_AUTHORIZING';
ALTER TYPE "PaymentSessionStatus" ADD VALUE 'PAYMENT_AUTHORIZED';

-- AlterTable
ALTER TABLE "PaymentSession" DROP COLUMN "monetizationType",
ADD COLUMN     "couponsToConsume" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "appliedDriverCoupons" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "couponsUsed" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
