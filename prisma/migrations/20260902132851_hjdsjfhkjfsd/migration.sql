/*
  Warnings:

  - You are about to drop the column `Features` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `UnitDEtails` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `subscription_plans` table. All the data in the column will be lost.
  - Added the required column `nameBn` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEn` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitDetailsBn` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitDetailsEn` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "subscription_plans_tier_isDeleted_createdAt_name_priceMonth_idx";

-- AlterTable
ALTER TABLE "subscription_plans" DROP COLUMN "Features",
DROP COLUMN "UnitDEtails",
DROP COLUMN "name",
ADD COLUMN     "featuresBn" TEXT[],
ADD COLUMN     "featuresEn" TEXT[],
ADD COLUMN     "nameBn" TEXT NOT NULL,
ADD COLUMN     "nameEn" TEXT NOT NULL,
ADD COLUMN     "unitDetailsBn" TEXT NOT NULL,
ADD COLUMN     "unitDetailsEn" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "subscription_plans_tier_isDeleted_createdAt_priceMonthly_idx" ON "subscription_plans"("tier", "isDeleted", "createdAt", "priceMonthly");
