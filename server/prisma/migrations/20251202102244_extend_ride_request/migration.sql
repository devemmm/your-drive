/*
  Warnings:

  - You are about to drop the column `proximityMeters` on the `RideRequest` table. All the data in the column will be lost.
  - Added the required column `destCity` to the `RideRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destProvince` to the `RideRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destProvinceCode` to the `RideRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originCity` to the `RideRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originProvince` to the `RideRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originProvinceCode` to the `RideRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_originId_fkey";

-- AlterTable
ALTER TABLE "RideRequest" DROP COLUMN "proximityMeters",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "destCity" TEXT NOT NULL,
ADD COLUMN     "destProvince" TEXT NOT NULL,
ADD COLUMN     "destProvinceCode" "ProvinceCodes" NOT NULL,
ADD COLUMN     "originCity" TEXT NOT NULL,
ADD COLUMN     "originProvince" TEXT NOT NULL,
ADD COLUMN     "originProvinceCode" "ProvinceCodes" NOT NULL,
ALTER COLUMN "originId" DROP NOT NULL,
ALTER COLUMN "destinationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
