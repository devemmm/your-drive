-- CreateTable
CREATE TABLE "TaxRate" (
    "id" SERIAL NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "gst" DOUBLE PRECISION,
    "pst" DOUBLE PRECISION,
    "qst" DOUBLE PRECISION,
    "hst" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_provinceCode_key" ON "TaxRate"("provinceCode");
