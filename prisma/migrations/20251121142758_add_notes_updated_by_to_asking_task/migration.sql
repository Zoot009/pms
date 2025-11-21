-- AlterTable
ALTER TABLE "asking_tasks" ADD COLUMN     "notes_updated_by" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_notes_updated_by_fkey" FOREIGN KEY ("notes_updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
