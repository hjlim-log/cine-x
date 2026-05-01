/*
  Warnings:

  - Added the required column `screenTypeId` to the `Screen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seatTypeId` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Screen" ADD COLUMN     "screenTypeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Seat" ADD COLUMN     "seatTypeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ScreenType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ScreenType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "additionalPrice" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeatType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenType_name_key" ON "ScreenType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SeatType_name_key" ON "SeatType"("name");

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_screenTypeId_fkey" FOREIGN KEY ("screenTypeId") REFERENCES "ScreenType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_seatTypeId_fkey" FOREIGN KEY ("seatTypeId") REFERENCES "SeatType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
