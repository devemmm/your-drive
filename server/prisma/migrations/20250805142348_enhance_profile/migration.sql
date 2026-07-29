/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `travelPreferences` on the `User` table. All the data in the column will be lost.
  - The `frequentRoutes` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId]` on the table `RidePreference` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MusicPreference" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'NOT_AT_ALL');

-- AlterTable
ALTER TABLE "RidePreference" ADD COLUMN     "music" "MusicPreference" NOT NULL DEFAULT 'NOT_AT_ALL',
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "rideId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "travelPreferences",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isWelcomeEmailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT,
DROP COLUMN "frequentRoutes",
ADD COLUMN     "frequentRoutes" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "RidePreference_userId_key" ON "RidePreference"("userId");

-- AddForeignKey
ALTER TABLE "RidePreference" ADD CONSTRAINT "RidePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
