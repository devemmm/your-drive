-- DropForeignKey
ALTER TABLE "Tax" DROP CONSTRAINT "Tax_transactionId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'RWF';

-- AlterTable: widen Location.regionCode from ProvinceCodes enum to free-form TEXT.
-- USING clause preserves the existing enum values as their text labels.
ALTER TABLE "Location" ALTER COLUMN "regionCode" TYPE TEXT USING "regionCode"::text;

-- AlterTable
ALTER TABLE "PaymentSession" DROP COLUMN "provinceCode",
DROP COLUMN "taxSnapshot",
ALTER COLUMN "currency" SET DEFAULT 'RWF';

-- AlterTable
ALTER TABLE "RideRequest" DROP COLUMN "destProvinceCode",
DROP COLUMN "originProvinceCode";

-- DropTable
DROP TABLE "TaxRate";

-- DropTable
DROP TABLE "Tax";

-- DropEnum
DROP TYPE "ProvinceCodes";
