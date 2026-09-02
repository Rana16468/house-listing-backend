-- DropIndex
DROP INDEX "users_createdAt_idx";

-- DropIndex
DROP INDEX "users_phone_email_status_os_browser_device_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT,
ADD COLUMN     "photo" TEXT;

-- CreateIndex
CREATE INDEX "users_phone_email_status_os_browser_device_isDeleted_isVeri_idx" ON "users"("phone", "email", "status", "os", "browser", "device", "isDeleted", "isVerify", "createdAt");
