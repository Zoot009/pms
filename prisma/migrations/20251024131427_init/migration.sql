-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEAM_LEADER', 'MEMBER', 'ORDER_CREATOR');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SERVICE_TASK', 'ASKING_SERVICE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AskingStageType" AS ENUM ('ASKED', 'SHARED', 'VERIFIED', 'INFORMED_TEAM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REASSIGN', 'STATUS_CHANGE', 'COMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "phone" VARCHAR(50),
    "avatar" VARCHAR(500),
    "employee_id" VARCHAR(50),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "leader_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "type" "ServiceType" NOT NULL,
    "description" TEXT,
    "team_id" TEXT NOT NULL,
    "time_limit" INTEGER,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "has_task_count" BOOLEAN NOT NULL DEFAULT false,
    "task_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asking_details" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "asking_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asking_stages" (
    "id" TEXT NOT NULL,
    "asking_detail_id" TEXT NOT NULL,
    "stage" "AskingStageType" NOT NULL,
    "has_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "has_update_request" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "asking_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "time_limit_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "order_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_type_services" (
    "id" TEXT NOT NULL,
    "order_type_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_type_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "order_type_id" TEXT NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "order_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_date" TIMESTAMPTZ(6) NOT NULL,
    "delivery_time" VARCHAR(50),
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_services" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "assigned_to" VARCHAR(255),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_ASSIGNED',
    "deadline" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asking_tasks" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "assigned_to" VARCHAR(255),
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "current_stage" "AskingStageType" NOT NULL DEFAULT 'ASKED',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "asking_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asking_task_stages" (
    "id" TEXT NOT NULL,
    "asking_task_id" TEXT NOT NULL,
    "stage" "AskingStageType" NOT NULL,
    "initial_confirmation" VARCHAR(255),
    "initial_staff" VARCHAR(255),
    "update_request" VARCHAR(255),
    "update_staff" VARCHAR(255),
    "completed_by" VARCHAR(255),
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "asking_task_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "performed_by" VARCHAR(255) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "description" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_employee_id_idx" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_leader_id_idx" ON "teams"("leader_id");

-- CreateIndex
CREATE INDEX "teams_created_by_idx" ON "teams"("created_by");

-- CreateIndex
CREATE INDEX "teams_slug_idx" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_is_active_idx" ON "teams"("is_active");

-- CreateIndex
CREATE INDEX "team_members_team_id_is_active_idx" ON "team_members"("team_id", "is_active");

-- CreateIndex
CREATE INDEX "team_members_user_id_is_active_idx" ON "team_members"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "team_members_joined_at_idx" ON "team_members"("joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_type_is_active_idx" ON "services"("type", "is_active");

-- CreateIndex
CREATE INDEX "services_team_id_is_active_idx" ON "services"("team_id", "is_active");

-- CreateIndex
CREATE INDEX "services_created_by_idx" ON "services"("created_by");

-- CreateIndex
CREATE INDEX "services_slug_idx" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "asking_details_service_id_key" ON "asking_details"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "asking_stages_asking_detail_id_stage_key" ON "asking_stages"("asking_detail_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "order_types_name_key" ON "order_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "order_types_slug_key" ON "order_types"("slug");

-- CreateIndex
CREATE INDEX "order_types_is_active_is_default_idx" ON "order_types"("is_active", "is_default");

-- CreateIndex
CREATE INDEX "order_types_created_by_idx" ON "order_types"("created_by");

-- CreateIndex
CREATE INDEX "order_types_slug_idx" ON "order_types"("slug");

-- CreateIndex
CREATE INDEX "order_type_services_order_type_id_idx" ON "order_type_services"("order_type_id");

-- CreateIndex
CREATE INDEX "order_type_services_service_id_idx" ON "order_type_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_type_services_order_type_id_service_id_key" ON "order_type_services"("order_type_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_order_type_id_idx" ON "orders"("order_type_id");

-- CreateIndex
CREATE INDEX "orders_created_by_idx" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "orders"("order_date");

-- CreateIndex
CREATE INDEX "orders_delivery_date_idx" ON "orders"("delivery_date");

-- CreateIndex
CREATE INDEX "orders_completed_at_idx" ON "orders"("completed_at");

-- CreateIndex
CREATE INDEX "orders_customer_email_idx" ON "orders"("customer_email");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "order_services_order_id_idx" ON "order_services"("order_id");

-- CreateIndex
CREATE INDEX "order_services_service_id_idx" ON "order_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_services_order_id_service_id_key" ON "order_services"("order_id", "service_id");

-- CreateIndex
CREATE INDEX "tasks_order_id_status_idx" ON "tasks"("order_id", "status");

-- CreateIndex
CREATE INDEX "tasks_service_id_idx" ON "tasks"("service_id");

-- CreateIndex
CREATE INDEX "tasks_team_id_status_idx" ON "tasks"("team_id", "status");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_status_idx" ON "tasks"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "tasks_status_priority_idx" ON "tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "asking_tasks_order_id_current_stage_idx" ON "asking_tasks"("order_id", "current_stage");

-- CreateIndex
CREATE INDEX "asking_tasks_service_id_idx" ON "asking_tasks"("service_id");

-- CreateIndex
CREATE INDEX "asking_tasks_team_id_current_stage_idx" ON "asking_tasks"("team_id", "current_stage");

-- CreateIndex
CREATE INDEX "asking_tasks_assigned_to_current_stage_idx" ON "asking_tasks"("assigned_to", "current_stage");

-- CreateIndex
CREATE INDEX "asking_tasks_current_stage_priority_idx" ON "asking_tasks"("current_stage", "priority");

-- CreateIndex
CREATE INDEX "asking_tasks_deadline_idx" ON "asking_tasks"("deadline");

-- CreateIndex
CREATE INDEX "asking_tasks_created_at_idx" ON "asking_tasks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "asking_task_stages_asking_task_id_stage_idx" ON "asking_task_stages"("asking_task_id", "stage");

-- CreateIndex
CREATE INDEX "asking_task_stages_stage_idx" ON "asking_task_stages"("stage");

-- CreateIndex
CREATE INDEX "asking_task_stages_completed_at_idx" ON "asking_task_stages"("completed_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_details" ADD CONSTRAINT "asking_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_stages" ADD CONSTRAINT "asking_stages_asking_detail_id_fkey" FOREIGN KEY ("asking_detail_id") REFERENCES "asking_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_types" ADD CONSTRAINT "order_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_type_services" ADD CONSTRAINT "order_type_services_order_type_id_fkey" FOREIGN KEY ("order_type_id") REFERENCES "order_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_type_services" ADD CONSTRAINT "order_type_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_type_id_fkey" FOREIGN KEY ("order_type_id") REFERENCES "order_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_services" ADD CONSTRAINT "order_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_tasks" ADD CONSTRAINT "asking_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asking_task_stages" ADD CONSTRAINT "asking_task_stages_asking_task_id_fkey" FOREIGN KEY ("asking_task_id") REFERENCES "asking_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
