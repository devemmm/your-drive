/*
  Warnings:

  - Made the column `originalQuantity` on table `Coupon` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CouponTarget" AS ENUM ('RIDE_BOOKING', 'RIDE_POSTING', 'PASSENGER_SUBSCRIPTION', 'DRIVER_SUBSCRIPTION', 'BOTH_SUBSCRIPTION');

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "originalQuantity" SET NOT NULL;

-- CreateTable
CREATE TABLE "CouponRedemptionRule" (
    "id" SERIAL NOT NULL,
    "target" "CouponTarget" NOT NULL,
    "requiredCoupons" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponRedemptionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemedCoupon" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "redeemedQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemedCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemptionRule_target_key" ON "CouponRedemptionRule"("target");

-- AddForeignKey
ALTER TABLE "RedeemedCoupon" ADD CONSTRAINT "RedeemedCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedCoupon" ADD CONSTRAINT "RedeemedCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedCoupon" ADD CONSTRAINT "RedeemedCoupon_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
