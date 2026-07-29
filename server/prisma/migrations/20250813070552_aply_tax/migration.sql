-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "driverGrossReceivedAmount" DOUBLE PRECISION,
ADD COLUMN     "grossReceivedAmount" DOUBLE PRECISION,
ADD COLUMN     "platformGrossReceivedAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Tax" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "taxRate" JSONB NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "isRemitted" BOOLEAN NOT NULL DEFAULT false,
    "remittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tax_transactionId_key" ON "Tax"("transactionId");

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
