-- AlterTable: Add order_service_id to tasks table
ALTER TABLE "tasks" ADD COLUMN "order_service_id" TEXT;

-- CreateIndex
CREATE INDEX "tasks_order_service_id_idx" ON "tasks"("order_service_id");

-- AddForeignKey: Link tasks to specific order service instances
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_order_service_id_fkey" FOREIGN KEY ("order_service_id") REFERENCES "order_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add order_service_id to asking_tasks table
ALTER TABLE "asking_tasks" ADD COLUMN "order_service_id" TEXT;

-- CreateIndex
CREATE INDEX "asking_tasks_order_service_id_idx" ON "asking_tasks"("order_service_id");

-- AddForeignKey: Link asking tasks to specific order service instances
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_order_service_id_fkey" FOREIGN KEY ("order_service_id") REFERENCES "order_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
