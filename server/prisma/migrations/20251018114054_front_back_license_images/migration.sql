-- CreateTable
CREATE TABLE "LicenseImages" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "frontImageId" INTEGER,
    "backImageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseImages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseImages_userId_key" ON "LicenseImages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseImages_frontImageId_key" ON "LicenseImages"("frontImageId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseImages_backImageId_key" ON "LicenseImages"("backImageId");

-- AddForeignKey
ALTER TABLE "LicenseImages" ADD CONSTRAINT "LicenseImages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseImages" ADD CONSTRAINT "LicenseImages_frontImageId_fkey" FOREIGN KEY ("frontImageId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseImages" ADD CONSTRAINT "LicenseImages_backImageId_fkey" FOREIGN KEY ("backImageId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
