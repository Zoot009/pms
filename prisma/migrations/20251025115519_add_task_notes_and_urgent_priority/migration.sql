-- AlterEnum
ALTER TYPE "TaskPriority" ADD VALUE 'URGENT';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "notes" TEXT;
