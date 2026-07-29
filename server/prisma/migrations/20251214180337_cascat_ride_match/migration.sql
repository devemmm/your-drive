-- DropForeignKey
ALTER TABLE "RideRequestMatch" DROP CONSTRAINT "RideRequestMatch_requestId_fkey";

-- AddForeignKey
ALTER TABLE "RideRequestMatch" ADD CONSTRAINT "RideRequestMatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
