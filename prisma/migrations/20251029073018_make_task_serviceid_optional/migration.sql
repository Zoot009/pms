-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_service_id_fkey";

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "service_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
