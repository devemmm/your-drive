/*
  Warnings:

  - You are about to drop the column `depTime` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `departureTime` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentProvider` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL');

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "depTime",
ADD COLUMN     "departureTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "method",
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL;
