/*
  Warnings:

  - You are about to drop the `CouponRedemption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_couponId_fkey";

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "originalQuantity" INTEGER;

-- DropTable
DROP TABLE "CouponRedemption";
