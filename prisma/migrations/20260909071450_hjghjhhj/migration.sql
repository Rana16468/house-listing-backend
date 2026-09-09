/*
  Warnings:

  - Added the required column `currentSubId` to the `units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landlordId` to the `units` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "units" ADD COLUMN     "currentSubId" TEXT NOT NULL,
ADD COLUMN     "landlordId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_currentSubId_fkey" FOREIGN KEY ("currentSubId") REFERENCES "user_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
