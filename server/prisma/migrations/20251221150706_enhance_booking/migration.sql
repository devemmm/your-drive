/*
  Warnings:

  - You are about to alter the column `platformAmount` on the `PaymentSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `driverAmount` on the `PaymentSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `driverGrossReceivedAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `isTransferReversed` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `platformGrossReceivedAmount` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "D2DBookingRequestStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "couponsIssued" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "D2DBookingRequest" ADD COLUMN     "couponsIssued" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PaymentSession" ALTER COLUMN "platformAmount" SET DEFAULT 0,
ALTER COLUMN "platformAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "driverAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "isDriverCouponIssuedOnCompletion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "driverGrossReceivedAmount",
DROP COLUMN "isTransferReversed",
DROP COLUMN "platformGrossReceivedAmount";
