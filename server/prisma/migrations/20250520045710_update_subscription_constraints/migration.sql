/*
  Warnings:

  - A unique constraint covering the columns `[userId,isActive,planId]` on the table `UserSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserSubscription_userId_isActive_key";

-- CreateIndex
CREATE INDEX "UserSubscription_userId_isActive_idx" ON "UserSubscription"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_isActive_planId_key" ON "UserSubscription"("userId", "isActive", "planId");
