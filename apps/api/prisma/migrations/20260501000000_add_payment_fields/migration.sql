-- AlterTable: Reservation에 결제 관련 필드 추가
ALTER TABLE "Reservation" ADD COLUMN "orderId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "paymentKey" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

-- 기본값 제거 (실제 운용 시 orderId는 UUID로 채워져야 함)
ALTER TABLE "Reservation" ALTER COLUMN "orderId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_orderId_key" ON "Reservation"("orderId");
