-- AlterTable: province codes are only relevant for Canadian tax; make optional for Rwanda deployment
ALTER TABLE "RideRequest" ALTER COLUMN "originProvinceCode" DROP NOT NULL;
ALTER TABLE "RideRequest" ALTER COLUMN "destProvinceCode" DROP NOT NULL;
