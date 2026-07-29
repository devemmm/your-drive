-- AlterTable
ALTER TABLE "PaymentSession" ADD COLUMN     "monetizationType" "MonetizationType",
ADD COLUMN     "seatsToBook" INTEGER,
ALTER COLUMN "provinceCode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RedeemedCoupon" ADD COLUMN     "paymentSessionId" TEXT;

-- CreateTable
CREATE TABLE "CommissionSettings" (
    "id" SERIAL NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionSettings_pkey" PRIMARY KEY ("id")
);
