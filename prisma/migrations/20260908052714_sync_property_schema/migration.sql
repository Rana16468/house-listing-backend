/*
  Warnings:

  - You are about to drop the column `title` on the `properties` table. All the data in the column will be lost.
  - You are about to alter the column `address` on the `properties` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(250)`.
  - Added the required column `Floor` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flatName` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "properties" DROP COLUMN "title",
ADD COLUMN     "Floor" INTEGER NOT NULL,
ADD COLUMN     "flatName" VARCHAR(150) NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "address" SET DATA TYPE VARCHAR(250);
