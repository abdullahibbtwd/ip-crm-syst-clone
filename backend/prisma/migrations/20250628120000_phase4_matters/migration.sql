-- Phase 4: Matters + IP register

CREATE TYPE "matter_type" AS ENUM (
  'trademark',
  'patent',
  'utility_model',
  'industrial_design',
  'copyright',
  'geographical_indication',
  'border_measures',
  'fto_analysis',
  'valuation',
  'dispute_opposition'
);

CREATE TYPE "matter_status" AS ENUM (
  'draft',
  'active',
  'on_hold',
  'closed',
  'abandoned'
);

CREATE TYPE "matter_jurisdiction_status" AS ENUM (
  'pending',
  'filed',
  'approved',
  'rejected'
);

CREATE TYPE "ip_right_status" AS ENUM (
  'pending',
  'registered',
  'expired',
  'cancelled'
);

CREATE TABLE "matters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "matter_type" "matter_type" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "matter_status" NOT NULL DEFAULT 'draft',
  "assigned_to" UUID,
  "filed_by" UUID,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "matters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "matters_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "matters_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "matters_filed_by_fkey"
    FOREIGN KEY ("filed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "matter_jurisdictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "country_code" TEXT NOT NULL,
  "local_ref_number" TEXT,
  "status" "matter_jurisdiction_status" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "matter_jurisdictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "matter_jurisdictions_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "matter_jurisdictions_matter_id_country_code_key"
    UNIQUE ("matter_id", "country_code")
);

CREATE TABLE "matter_attributes" (
  "matter_id" UUID NOT NULL,
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "matter_attributes_pkey" PRIMARY KEY ("matter_id"),
  CONSTRAINT "matter_attributes_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ip_rights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "right_type" "matter_type" NOT NULL,
  "title" TEXT NOT NULL,
  "registration_number" TEXT,
  "filing_date" DATE,
  "registration_date" DATE,
  "expiry_date" DATE,
  "jurisdiction" TEXT NOT NULL,
  "status" "ip_right_status" NOT NULL DEFAULT 'pending',
  "attributes" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ip_rights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ip_rights_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ip_rights_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "matters_client_id_idx" ON "matters"("client_id");
CREATE INDEX "matters_status_idx" ON "matters"("status");
CREATE INDEX "matters_matter_type_idx" ON "matters"("matter_type");
CREATE INDEX "matters_assigned_to_idx" ON "matters"("assigned_to");
CREATE INDEX "matter_jurisdictions_matter_id_idx" ON "matter_jurisdictions"("matter_id");
CREATE INDEX "ip_rights_matter_id_idx" ON "ip_rights"("matter_id");
CREATE INDEX "ip_rights_client_id_idx" ON "ip_rights"("client_id");
CREATE INDEX "ip_rights_status_idx" ON "ip_rights"("status");
