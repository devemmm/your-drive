/*
  Warnings:

  - Made the column `averageRating` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "StripeChargeAccount" AS ENUM ('PLATFORM', 'DRIVER');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isTransferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeChargeAccount" "StripeChargeAccount" NOT NULL DEFAULT 'PLATFORM';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "averageRating" SET NOT NULL;
