-- CreateTable
CREATE TABLE "PartnerDiscount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "description" TEXT,
    "discountMethod" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minPurchase" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "combinableWithCoupon" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "bgColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerDiscountUsage" (
    "id" SERIAL NOT NULL,
    "partnerDiscountId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDiscountUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerDiscount_partnerType_isActive_idx" ON "PartnerDiscount"("partnerType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerDiscountUsage_reservationId_key" ON "PartnerDiscountUsage"("reservationId");

-- AddForeignKey
ALTER TABLE "PartnerDiscountUsage" ADD CONSTRAINT "PartnerDiscountUsage_partnerDiscountId_fkey" FOREIGN KEY ("partnerDiscountId") REFERENCES "PartnerDiscount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDiscountUsage" ADD CONSTRAINT "PartnerDiscountUsage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
