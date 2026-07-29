-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('COMMERCIAL', 'PROMO');

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "category" "PlanCategory" NOT NULL DEFAULT 'COMMERCIAL',
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ALTER COLUMN "duration" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "planData" JSONB;
