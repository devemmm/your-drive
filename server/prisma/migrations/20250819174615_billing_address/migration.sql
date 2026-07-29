-- AlterTable
ALTER TABLE "Tax" ADD COLUMN     "taxDetails" JSONB;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "billingAddress" JSONB;
