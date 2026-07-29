-- CreateEnum
CREATE TYPE "CouponSource" AS ENUM ('RIDE', 'REFERRAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referredBy" TEXT;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "source" "CouponSource" NOT NULL,
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
