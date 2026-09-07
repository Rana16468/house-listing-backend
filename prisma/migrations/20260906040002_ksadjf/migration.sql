-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "user_subscriptions" ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
