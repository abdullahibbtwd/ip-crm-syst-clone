-- Phase 3: Intake leads and conflict checks

CREATE TYPE "intake_status" AS ENUM (
  'new',
  'reviewing',
  'conflict_check',
  'conflict_flagged',
  'approved',
  'rejected',
  'converted'
);

CREATE TYPE "intake_enquirer_type" AS ENUM ('company', 'individual');

CREATE TYPE "intake_urgency" AS ENUM ('normal', 'urgent');

CREATE TYPE "intake_referral_source" AS ENUM (
  'email',
  'phone',
  'referral',
  'walk_in',
  'website',
  'other'
);

CREATE TYPE "intake_matter_type" AS ENUM (
  'trademark',
  'patent',
  'utility_model',
  'design',
  'other'
);

CREATE TYPE "conflict_check_result" AS ENUM ('pending', 'clear', 'flagged');

CREATE TYPE "conflict_resolution" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'overridden'
);

CREATE TABLE "intake_leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" "intake_status" NOT NULL DEFAULT 'new',
  "enquirer_type" "intake_enquirer_type" NOT NULL,
  "company_name" TEXT,
  "full_name" TEXT,
  "country" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "matter_type" "intake_matter_type" NOT NULL,
  "description" TEXT NOT NULL,
  "urgency" "intake_urgency" NOT NULL DEFAULT 'normal',
  "referral_source" "intake_referral_source" NOT NULL,
  "referred_by" TEXT,
  "assigned_user_id" UUID,
  "notes" TEXT,
  "created_by_id" UUID NOT NULL,
  "converted_client_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "intake_leads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intake_leads_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "intake_leads_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "intake_leads_converted_client_id_fkey"
    FOREIGN KEY ("converted_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "intake_leads_converted_client_id_key" ON "intake_leads"("converted_client_id");
CREATE INDEX "intake_leads_status_idx" ON "intake_leads"("status");
CREATE INDEX "intake_leads_created_by_id_idx" ON "intake_leads"("created_by_id");
CREATE INDEX "intake_leads_assigned_user_id_idx" ON "intake_leads"("assigned_user_id");
CREATE INDEX "intake_leads_created_at_idx" ON "intake_leads"("created_at" DESC);

CREATE TABLE "intake_conflict_checks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "intake_lead_id" UUID NOT NULL,
  "result" "conflict_check_result" NOT NULL DEFAULT 'pending',
  "hits" JSONB NOT NULL DEFAULT '[]',
  "resolution" "conflict_resolution" NOT NULL DEFAULT 'pending',
  "resolved_by_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "resolution_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "intake_conflict_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intake_conflict_checks_intake_lead_id_fkey"
    FOREIGN KEY ("intake_lead_id") REFERENCES "intake_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "intake_conflict_checks_resolved_by_id_fkey"
    FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "intake_conflict_checks_intake_lead_id_idx" ON "intake_conflict_checks"("intake_lead_id");
CREATE INDEX "intake_conflict_checks_created_at_idx" ON "intake_conflict_checks"("created_at" DESC);
