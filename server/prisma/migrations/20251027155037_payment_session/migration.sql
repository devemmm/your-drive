/*
  Warnings:

  - You are about to drop the column `clientSecret` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentSessionStatus" AS ENUM ('PENDING', 'FINALIZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "clientSecret",
ADD COLUMN     "netReceivedAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingAddress" JSONB;

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "provinceCode" "ProvinceCodes" NOT NULL,
    "taxSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rideId" INTEGER,
    "platformAmount" DOUBLE PRECISION NOT NULL,
    "driverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billingAddress" JSONB,
    "transactionType" "TransactionType" NOT NULL,
    "planSnapshot" JSONB,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "PaymentSessionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_stripePaymentIntentId_key" ON "PaymentSession"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_transactionId_key" ON "PaymentReceipt"("transactionId");

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
