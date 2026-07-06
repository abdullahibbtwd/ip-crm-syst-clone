-- Renewals & fees wave 1: renewal windows, instructions, payments, deadline/fee links

CREATE TYPE "renewal_status" AS ENUM (
  'upcoming',
  'instructed',
  'filed',
  'completed',
  'lapsed'
);

CREATE TYPE "renewal_instruction_decision" AS ENUM (
  'proceed',
  'abandon'
);

ALTER TYPE "deadline_rule_trigger_type" ADD VALUE 'renewal_due';

ALTER TYPE "notification_type" ADD VALUE 'renewal_instruction_received';

CREATE TABLE "renewal_windows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ip_right_id" UUID NOT NULL,
  "matter_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "cycle_number" INTEGER NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "due_date" DATE NOT NULL,
  "grace_date" DATE,
  "status" "renewal_status" NOT NULL DEFAULT 'upcoming',
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "renewal_windows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renewal_windows_ip_right_id_cycle_number_key"
    UNIQUE ("ip_right_id", "cycle_number"),
  CONSTRAINT "renewal_windows_ip_right_id_fkey"
    FOREIGN KEY ("ip_right_id") REFERENCES "ip_rights"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renewal_windows_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renewal_windows_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "renewal_windows_status_due_date_idx"
  ON "renewal_windows"("status", "due_date");
CREATE INDEX "renewal_windows_client_id_idx" ON "renewal_windows"("client_id");
CREATE INDEX "renewal_windows_matter_id_idx" ON "renewal_windows"("matter_id");

CREATE TABLE "renewal_instructions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "renewal_window_id" UUID NOT NULL,
  "decision" "renewal_instruction_decision" NOT NULL,
  "notes" TEXT,
  "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "captured_by_id" UUID NOT NULL,

  CONSTRAINT "renewal_instructions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renewal_instructions_renewal_window_id_fkey"
    FOREIGN KEY ("renewal_window_id") REFERENCES "renewal_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renewal_instructions_captured_by_id_fkey"
    FOREIGN KEY ("captured_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "renewal_instructions_renewal_window_id_idx"
  ON "renewal_instructions"("renewal_window_id");

CREATE TABLE "renewal_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "renewal_window_id" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paid_at" DATE NOT NULL,
  "proof_document_version_id" UUID,
  "recorded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "renewal_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renewal_payments_renewal_window_id_fkey"
    FOREIGN KEY ("renewal_window_id") REFERENCES "renewal_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renewal_payments_proof_document_version_id_fkey"
    FOREIGN KEY ("proof_document_version_id") REFERENCES "matter_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "renewal_payments_recorded_by_id_fkey"
    FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "renewal_payments_renewal_window_id_idx"
  ON "renewal_payments"("renewal_window_id");

ALTER TABLE "deadlines"
  ADD COLUMN "source_renewal_window_id" UUID;

ALTER TABLE "deadlines"
  ADD CONSTRAINT "deadlines_source_renewal_window_id_fkey"
    FOREIGN KEY ("source_renewal_window_id")
    REFERENCES "renewal_windows"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "deadlines_source_renewal_window_id_idx"
  ON "deadlines"("source_renewal_window_id");

ALTER TABLE "fixed_fees"
  ADD COLUMN "source_renewal_window_id" UUID;

ALTER TABLE "fixed_fees"
  ADD CONSTRAINT "fixed_fees_source_renewal_window_id_fkey"
    FOREIGN KEY ("source_renewal_window_id")
    REFERENCES "renewal_windows"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "fixed_fees_source_renewal_window_id_idx"
  ON "fixed_fees"("source_renewal_window_id");

-- Matter-created deadlines: exclude renewal-window rows from the partial unique index
DROP INDEX IF EXISTS "deadlines_matter_id_rule_id_matter_created_key";

CREATE UNIQUE INDEX "deadlines_matter_id_rule_id_matter_created_key"
  ON "deadlines"("matter_id", "rule_id")
  WHERE "source_correspondence_id" IS NULL
    AND "source_renewal_window_id" IS NULL
    AND "rule_id" IS NOT NULL;

CREATE UNIQUE INDEX "deadlines_source_renewal_window_id_rule_id_key"
  ON "deadlines"("source_renewal_window_id", "rule_id")
  WHERE "source_renewal_window_id" IS NOT NULL AND "rule_id" IS NOT NULL;
