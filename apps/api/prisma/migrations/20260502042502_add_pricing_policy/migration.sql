-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "audienceCounts" JSONB;

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER,
    "screenTypeId" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "dayType" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingPolicy_screenTypeId_format_dayType_idx" ON "PricingPolicy"("screenTypeId", "format", "dayType");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPolicy_cinemaId_screenTypeId_format_dayType_audience_key" ON "PricingPolicy"("cinemaId", "screenTypeId", "format", "dayType", "audienceType");

-- AddForeignKey
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_screenTypeId_fkey" FOREIGN KEY ("screenTypeId") REFERENCES "ScreenType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
