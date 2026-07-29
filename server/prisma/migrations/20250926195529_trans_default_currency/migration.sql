-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 4;
