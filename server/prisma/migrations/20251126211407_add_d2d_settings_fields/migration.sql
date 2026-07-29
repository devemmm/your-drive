-- AlterTable
ALTER TABLE "D2DSetting" ADD COLUMN     "allowMultiPassenger" BOOLEAN,
ADD COLUMN     "cancellationFeeAfterAccepted" DOUBLE PRECISION,
ADD COLUMN     "extraKmThreshold" INTEGER,
ADD COLUMN     "maxRadiusKm" INTEGER,
ADD COLUMN     "minRadiusKm" INTEGER,
ADD COLUMN     "ratePerKm" DOUBLE PRECISION,
ALTER COLUMN "value" DROP NOT NULL,
ALTER COLUMN "value" SET DATA TYPE TEXT;
