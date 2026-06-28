/*
  Warnings:

  - Added the required column `updatedAt` to the `evacuation_routes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `sensors` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "sensors" DROP CONSTRAINT "sensors_regionId_fkey";

-- AlterTable
ALTER TABLE "evacuation_routes" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "facilities" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "regions" ADD COLUMN     "area" DOUBLE PRECISION,
ADD COLUMN     "centerLat" DOUBLE PRECISION,
ADD COLUMN     "centerLng" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "population" INTEGER;

-- AlterTable
ALTER TABLE "sensors" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'm';

-- CreateTable
CREATE TABLE "region_volunteers" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "region_volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "region_volunteers_regionId_userId_key" ON "region_volunteers"("regionId", "userId");

-- AddForeignKey
ALTER TABLE "region_volunteers" ADD CONSTRAINT "region_volunteers_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evacuation_routes" ADD CONSTRAINT "evacuation_routes_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
