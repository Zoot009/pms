-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "customer_name" DROP NOT NULL,
ALTER COLUMN "customer_email" DROP NOT NULL,
ALTER COLUMN "customer_phone" DROP NOT NULL;
