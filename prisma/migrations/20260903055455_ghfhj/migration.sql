/*
  Warnings:

  - You are about to alter the column `planId` on the `user_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[trxId]` on the table `user_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNo]` on the table `user_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentMethod` to the `user_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trxId` to the `user_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PENDING');

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_planId_fkey";

-- DropIndex
DROP INDEX "user_subscriptions_userId_planId_isActive_isDeleted_created_idx";

-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'BDT',
ADD COLUMN     "gatewayRef" VARCHAR(255),
ADD COLUMN     "invoiceNo" VARCHAR(100),
ADD COLUMN     "paymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
ADD COLUMN     "paymentMethod" VARCHAR(50) NOT NULL,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "trxId" VARCHAR(100) NOT NULL,
ALTER COLUMN "planId" SET DATA TYPE VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_trxId_key" ON "user_subscriptions"("trxId");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_invoiceNo_key" ON "user_subscriptions"("invoiceNo");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_planId_trxId_invoiceNo_paymentSta_idx" ON "user_subscriptions"("userId", "planId", "trxId", "invoiceNo", "paymentStatus", "isActive", "isDeleted", "createdAt");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
