/*
  Warnings:

  - The `level` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'error', 'warn', 'debug');

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "level",
ADD COLUMN     "level" "LogLevel" NOT NULL DEFAULT 'error';

-- CreateTable
CREATE TABLE "NoShow" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reportedById" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoShow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoShow" ADD CONSTRAINT "NoShow_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoShow" ADD CONSTRAINT "NoShow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoShow" ADD CONSTRAINT "NoShow_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
