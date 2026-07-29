/*
  Warnings:

  - You are about to drop the column `basePrice` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `d2dCapacity` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `isDoorToDoor` on the `Ride` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'DISPUTED';

-- AlterEnum
ALTER TYPE "D2DBookingRequestStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "D2DBookingRequest" ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "basePrice",
DROP COLUMN "d2dCapacity",
DROP COLUMN "isDoorToDoor",
ADD COLUMN     "settlementProcessingAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "driverPaidAt" TIMESTAMP(3);
