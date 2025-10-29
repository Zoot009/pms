/*
  Warnings:

  - You are about to drop the column `completed_at` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `completed_by` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `initial_confirmation` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `initial_staff` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `update_request` on the `asking_task_stages` table. All the data in the column will be lost.
  - You are about to drop the column `update_staff` on the `asking_task_stages` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."asking_task_stages_completed_at_idx";

-- AlterTable
ALTER TABLE "asking_task_stages" DROP COLUMN "completed_at",
DROP COLUMN "completed_by",
DROP COLUMN "initial_confirmation",
DROP COLUMN "initial_staff",
DROP COLUMN "notes",
DROP COLUMN "update_request",
DROP COLUMN "update_staff",
ADD COLUMN     "initial_confirmation_updated_at" TIMESTAMPTZ(6),
ADD COLUMN     "initial_confirmation_updated_by" VARCHAR(255),
ADD COLUMN     "initial_confirmation_value" VARCHAR(50),
ADD COLUMN     "update_request_updated_at" TIMESTAMPTZ(6),
ADD COLUMN     "update_request_updated_by" VARCHAR(255),
ADD COLUMN     "update_request_value" VARCHAR(100);

-- AlterTable
ALTER TABLE "asking_tasks" ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "asking_task_stages_created_at_idx" ON "asking_task_stages"("created_at" DESC);

-- CreateIndex
CREATE INDEX "asking_tasks_is_flagged_idx" ON "asking_tasks"("is_flagged");

-- AddForeignKey
ALTER TABLE "asking_task_stages" ADD CONSTRAINT "asking_task_stages_initial_confirmation_updated_by_fkey" FOREIGN KEY ("initial_confirmation_updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_task_stages" ADD CONSTRAINT "asking_task_stages_update_request_updated_by_fkey" FOREIGN KEY ("update_request_updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
