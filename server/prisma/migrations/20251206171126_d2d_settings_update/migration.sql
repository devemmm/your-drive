/*
  Warnings:

  - Made the column `maxRadiusKm` on table `D2DSetting` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "D2DSetting" ALTER COLUMN "maxRadiusKm" SET NOT NULL,
ALTER COLUMN "maxRadiusKm" SET DEFAULT 25,
ALTER COLUMN "maxPricePerExtraKm" SET DEFAULT 1.00;
