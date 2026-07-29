/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `D2DBookingRequest` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "D2DBookingRequest" ADD COLUMN     "dropoffExtraKms" DOUBLE PRECISION,
ADD COLUMN     "droppoffDetourDistance" DOUBLE PRECISION,
ADD COLUMN     "extraKmsAmount" DECIMAL(10,2),
ADD COLUMN     "pickupDetourDistance" DOUBLE PRECISION,
ADD COLUMN     "pickupExtraKms" DOUBLE PRECISION,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);
