-- Notifications table for in-app + email tracking

CREATE TYPE "notification_type" AS ENUM (
  'deadline_reminder',
  'deadline_escalation',
  'task_assigned',
  'general'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" "notification_type" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "resource" TEXT,
  "resource_id" UUID,
  "link_url" TEXT,
  "read_at" TIMESTAMPTZ(6),
  "email_sent_at" TIMESTAMPTZ(6),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
