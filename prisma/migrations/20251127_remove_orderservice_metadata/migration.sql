-- AlterTable OrderService - Remove metadata fields
ALTER TABLE "order_services" DROP COLUMN IF EXISTS "description";
ALTER TABLE "order_services" DROP COLUMN IF EXISTS "target_name";
ALTER TABLE "order_services" DROP COLUMN IF EXISTS "target_url";
