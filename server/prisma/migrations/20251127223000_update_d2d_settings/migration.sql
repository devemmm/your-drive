/*
  Warnings:

  - You are about to drop the column `active` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `D2DSetting` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `D2DSetting` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "D2DSetting_key_key";

-- AlterTable
ALTER TABLE "D2DSetting" DROP COLUMN "active",
DROP COLUMN "key",
DROP COLUMN "value";
