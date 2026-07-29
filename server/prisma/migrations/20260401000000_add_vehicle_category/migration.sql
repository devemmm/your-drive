-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('CAR', 'MOTORBIKE');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "category" "VehicleCategory" NOT NULL DEFAULT 'CAR';
