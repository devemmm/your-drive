-- CreateEnum
CREATE TYPE "ProvinceCodes" AS ENUM ('AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "regionCode" "ProvinceCodes";
