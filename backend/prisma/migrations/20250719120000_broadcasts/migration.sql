-- Bulk notifications / broadcasts (Phase 1 MVP gap)
CREATE TYPE "broadcast_audience" AS ENUM (
  'active_clients',
  'pending_eu_renewals',
  'trademark_matters',
  'manual'
);

CREATE TYPE "broadcast_status" AS ENUM (
  'queued',
  'sending',
  'completed',
  'failed'
);

CREATE TYPE "broadcast_recipient_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE "broadcasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subject" TEXT NOT NULL,
  "body_text" TEXT NOT NULL,
  "body_html" TEXT,
  "audience" "broadcast_audience" NOT NULL,
  "audience_filter" JSONB,
  "status" "broadcast_status" NOT NULL DEFAULT 'queued',
  "total_recipients" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),

  CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "broadcasts_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "broadcasts_created_at_idx" ON "broadcasts"("created_at");
CREATE INDEX "broadcasts_status_idx" ON "broadcasts"("status");

CREATE TABLE "broadcast_recipients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "broadcast_id" UUID NOT NULL,
  "client_id" UUID,
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "status" "broadcast_recipient_status" NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "broadcast_recipients_broadcast_id_fkey"
    FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "broadcast_recipients_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "broadcast_recipients_broadcast_id_status_idx"
  ON "broadcast_recipients"("broadcast_id", "status");
CREATE INDEX "broadcast_recipients_email_idx" ON "broadcast_recipients"("email");
