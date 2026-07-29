-- DropIndex
DROP INDEX "Transaction_rideId_key";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "platformAmount" DROP DEFAULT;
