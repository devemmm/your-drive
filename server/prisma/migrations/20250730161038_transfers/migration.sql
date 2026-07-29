/*
  Warnings:

  - A unique constraint covering the columns `[stripeChargeId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeTransferId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RedeemedCoupon" ADD COLUMN     "transactionId" INTEGER,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "transferFailureReason" TEXT,
ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeChargeId_key" ON "Transaction"("stripeChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeTransferId_key" ON "Transaction"("stripeTransferId");
