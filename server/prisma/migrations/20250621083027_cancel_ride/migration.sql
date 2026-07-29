-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancellationReviewed" BOOLEAN,
ADD COLUMN     "cancellationValid" BOOLEAN,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);
