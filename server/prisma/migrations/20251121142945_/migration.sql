/*
  Warnings:

  - You are about to drop the column `appliedDriverCoupons` on the `Ride` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "D2DRequest" ADD COLUMN     "appliedDriverCoupons" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "appliedDriverCoupons";
