/*
  Warnings:

  - You are about to drop the column `reviewId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `roles` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_reviewId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "reviewId",
DROP COLUMN "roles",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "_ReviewToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ReviewToUser_AB_unique" ON "_ReviewToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ReviewToUser_B_index" ON "_ReviewToUser"("B");

-- AddForeignKey
ALTER TABLE "_ReviewToUser" ADD CONSTRAINT "_ReviewToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReviewToUser" ADD CONSTRAINT "_ReviewToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
