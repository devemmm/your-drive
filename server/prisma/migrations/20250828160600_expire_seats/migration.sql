-- AlterTable
ALTER TABLE "BookingSeat" ADD COLUMN     "expireReason" TEXT,
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "isExpired" BOOLEAN NOT NULL DEFAULT false;
