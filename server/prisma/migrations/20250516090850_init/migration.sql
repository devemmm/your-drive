-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'PASSENGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('VEHICLE_IMAGE', 'LICENSE', 'PROFILE_PICTURE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "gender" "Gender",
    "roles" "UserRole"[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationCodeExpiresAt" TIMESTAMP(3),
    "phoneVerificationCode" TEXT,
    "phoneVerificationCodeExpiresAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "googleId" TEXT,
    "appleId" TEXT,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" SERIAL NOT NULL,
    "depCity" TEXT NOT NULL,
    "depLocationName" TEXT NOT NULL,
    "depLat" DOUBLE PRECISION NOT NULL,
    "depLng" DOUBLE PRECISION NOT NULL,
    "depTime" TIMESTAMP(3) NOT NULL,
    "destCity" TEXT NOT NULL,
    "destLocationName" TEXT NOT NULL,
    "destLat" DOUBLE PRECISION NOT NULL,
    "destLng" DOUBLE PRECISION NOT NULL,
    "stopovers" JSONB,
    "availableSeats" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "contribution" DOUBLE PRECISION NOT NULL,
    "preferences" JSONB,
    "bookingType" "BookingType" NOT NULL DEFAULT 'AUTOMATIC',
    "status" "RideStatus" NOT NULL DEFAULT 'PENDING',
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "publicId" TEXT NOT NULL,
    "vehicleId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_userId_key" ON "Asset"("userId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
