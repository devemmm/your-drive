/*
  Warnings:

  - A unique constraint covering the columns `[licenseImageId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "drivingExperience" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "frequentRoutes" TEXT,
ADD COLUMN     "isDriverOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPassengerOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseImageId" INTEGER,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "notificationPref" TEXT DEFAULT 'email',
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "travelPreferences" JSONB,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_licenseImageId_key" ON "User"("licenseImageId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_licenseImageId_fkey" FOREIGN KEY ("licenseImageId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
