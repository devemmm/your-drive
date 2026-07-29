-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "RideReport" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER,
    "chauffeurServiceId" INTEGER,
    "rentalId" INTEGER,
    "reporterId" INTEGER NOT NULL,
    "subjectUserId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewNotes" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideReport_rideId_idx" ON "RideReport"("rideId");

-- CreateIndex
CREATE INDEX "RideReport_chauffeurServiceId_idx" ON "RideReport"("chauffeurServiceId");

-- CreateIndex
CREATE INDEX "RideReport_rentalId_idx" ON "RideReport"("rentalId");

-- CreateIndex
CREATE INDEX "RideReport_status_idx" ON "RideReport"("status");

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_chauffeurServiceId_fkey" FOREIGN KEY ("chauffeurServiceId") REFERENCES "ChauffeurService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CarRental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideReport" ADD CONSTRAINT "RideReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
