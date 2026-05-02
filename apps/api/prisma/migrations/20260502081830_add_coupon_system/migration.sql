-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minPurchase" INTEGER NOT NULL DEFAULT 0,
    "maxDiscount" INTEGER,
    "validDays" INTEGER NOT NULL DEFAULT 90,
    "issuePolicy" TEXT NOT NULL,
    "imageUrl" TEXT,
    "bgColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalIssued" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCoupon" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" SERIAL NOT NULL,
    "userCouponId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_issuePolicy_isActive_idx" ON "Coupon"("issuePolicy", "isActive");

-- CreateIndex
CREATE INDEX "UserCoupon_customerId_status_idx" ON "UserCoupon"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_userCouponId_key" ON "CouponUsage"("userCouponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_reservationId_key" ON "CouponUsage"("reservationId");

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userCouponId_fkey" FOREIGN KEY ("userCouponId") REFERENCES "UserCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
