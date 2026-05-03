-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "gradeId" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MembershipGrade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "minAmount" INTEGER NOT NULL DEFAULT 0,
    "maxAmount" INTEGER,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "maxDiscount" INTEGER,
    "bgColor" TEXT,
    "iconUrl" TEXT,

    CONSTRAINT "MembershipGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipReward" (
    "id" SERIAL NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MembershipReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipHistory" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "fromGrade" TEXT,
    "toGrade" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "bgColor" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,
    "movieId" INTEGER,
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPrize" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "couponId" INTEGER,
    "imageUrl" TEXT,

    CONSTRAINT "EventPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "prizeId" INTEGER,
    "userCouponId" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawnAt" TIMESTAMP(3),
    "notificationRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CinemaEvent" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "CinemaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipGrade_name_key" ON "MembershipGrade"("name");

-- CreateIndex
CREATE INDEX "MembershipGrade_minAmount_idx" ON "MembershipGrade"("minAmount");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipReward_gradeId_couponId_key" ON "MembershipReward"("gradeId", "couponId");

-- CreateIndex
CREATE INDEX "MembershipHistory_customerId_idx" ON "MembershipHistory"("customerId");

-- CreateIndex
CREATE INDEX "Event_status_startDate_idx" ON "Event"("status", "startDate");

-- CreateIndex
CREATE INDEX "EventPrize_eventId_idx" ON "EventPrize"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_userCouponId_key" ON "EventApplication"("userCouponId");

-- CreateIndex
CREATE INDEX "EventApplication_customerId_status_idx" ON "EventApplication"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_eventId_customerId_key" ON "EventApplication"("eventId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CinemaEvent_eventId_cinemaId_key" ON "CinemaEvent"("eventId", "cinemaId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "MembershipGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipReward" ADD CONSTRAINT "MembershipReward_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "MembershipGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipReward" ADD CONSTRAINT "MembershipReward_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipHistory" ADD CONSTRAINT "MembershipHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPrize" ADD CONSTRAINT "EventPrize_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPrize" ADD CONSTRAINT "EventPrize_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "EventPrize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_userCouponId_fkey" FOREIGN KEY ("userCouponId") REFERENCES "UserCoupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinemaEvent" ADD CONSTRAINT "CinemaEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinemaEvent" ADD CONSTRAINT "CinemaEvent_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
