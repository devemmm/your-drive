/*
  Warnings:

  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gender";

-- DropEnum
DROP TYPE "Gender";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionId_key" ON "Transaction"("transactionId");
