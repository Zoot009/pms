-- AlterTable
ALTER TABLE "asking_tasks" ADD COLUMN     "completed_by" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
