-- Task management: tasks table, timeline integration

ALTER TYPE "matter_timeline_event_type" ADD VALUE 'task';

CREATE TYPE "task_status" AS ENUM ('pending', 'completed');
CREATE TYPE "task_priority" AS ENUM ('high', 'normal');

CREATE TABLE "tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "assigned_to_id" UUID NOT NULL,
  "created_by_id" UUID,
  "due_date" DATE,
  "priority" "task_priority" NOT NULL DEFAULT 'normal',
  "status" "task_status" NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMPTZ(6),
  "completed_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tasks_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tasks_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "tasks_completed_by_id_fkey"
    FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "tasks_matter_id_idx" ON "tasks"("matter_id");
CREATE INDEX "tasks_assigned_to_id_idx" ON "tasks"("assigned_to_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

ALTER TABLE "matter_timeline_events"
  ADD COLUMN "source_task_id" UUID;

ALTER TABLE "matter_timeline_events"
  ADD CONSTRAINT "matter_timeline_events_source_task_id_fkey"
    FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "matter_timeline_events_source_task_id_idx"
  ON "matter_timeline_events"("source_task_id");
