/*
  Warnings:

  - A unique constraint covering the columns `[paymentSessionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentSessionStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentSessionId_key" ON "Transaction"("paymentSessionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
