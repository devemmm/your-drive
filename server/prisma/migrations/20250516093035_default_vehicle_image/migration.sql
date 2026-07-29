/*
  Warnings:

  - A unique constraint covering the columns `[defaultImageId]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "defaultImageId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_defaultImageId_key" ON "Vehicle"("defaultImageId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_defaultImageId_fkey" FOREIGN KEY ("defaultImageId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
