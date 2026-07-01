-- Phase 5: Deadline engine

CREATE TYPE "deadline_event_type" AS ENUM (
  'filing',
  'examination_response',
  'renewal',
  'opposition',
  'grace_period'
);

CREATE TYPE "deadline_status" AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'missed',
  'escalated'
);

CREATE TABLE "deadline_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jurisdiction" TEXT NOT NULL,
  "matter_type" "matter_type" NOT NULL,
  "event_type" "deadline_event_type" NOT NULL,
  "days_offset" INTEGER NOT NULL,
  "is_business_days" BOOLEAN NOT NULL DEFAULT true,
  "grace_period_days" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 2,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "deadline_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deadline_rules_jurisdiction_matter_type_event_type_key"
    UNIQUE ("jurisdiction", "matter_type", "event_type")
);

CREATE TABLE "deadlines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "rule_id" UUID,
  "title" TEXT NOT NULL,
  "due_date" TIMESTAMPTZ(6) NOT NULL,
  "grace_date" TIMESTAMPTZ(6),
  "assigned_to_id" UUID NOT NULL,
  "status" "deadline_status" NOT NULL DEFAULT 'pending',
  "escalation_level" INTEGER NOT NULL DEFAULT 0,
  "reminder_sent_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deadlines_matter_id_rule_id_key" UNIQUE ("matter_id", "rule_id"),
  CONSTRAINT "deadlines_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "deadlines_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "deadline_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "deadlines_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "deadline_rules_jurisdiction_matter_type_idx"
  ON "deadline_rules"("jurisdiction", "matter_type");
CREATE INDEX "deadlines_matter_id_idx" ON "deadlines"("matter_id");
CREATE INDEX "deadlines_assigned_to_id_idx" ON "deadlines"("assigned_to_id");
CREATE INDEX "deadlines_due_date_idx" ON "deadlines"("due_date");
CREATE INDEX "deadlines_status_idx" ON "deadlines"("status");
