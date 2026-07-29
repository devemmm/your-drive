-- AlterEnum
ALTER TYPE "D2DBookingRequestStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "expiredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "D2DBookingRequest" ADD COLUMN     "expiredAt" TIMESTAMP(3);
