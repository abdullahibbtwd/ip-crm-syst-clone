-- Counterparties + pg_trgm fuzzy conflict matching

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "counterparty_relationship" AS ENUM (
  'competitor',
  'adverse_party',
  'licensor',
  'licensee'
);

CREATE TABLE "counterparties" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "intake_lead_id" UUID NOT NULL,
  "name" TEXT,
  "company" TEXT,
  "relationship" "counterparty_relationship" NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "counterparties_intake_lead_id_fkey"
    FOREIGN KEY ("intake_lead_id") REFERENCES "intake_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "counterparties_name_or_company_chk"
    CHECK ("name" IS NOT NULL OR "company" IS NOT NULL)
);

CREATE INDEX "counterparties_intake_lead_id_idx" ON "counterparties"("intake_lead_id");

-- Trigram indexes for fuzzy conflict checks
CREATE INDEX "clients_company_name_trgm_idx"
  ON "clients" USING gin (lower("company_name") gin_trgm_ops)
  WHERE "company_name" IS NOT NULL AND "status" != 'archived';

CREATE INDEX "clients_individual_name_trgm_idx"
  ON "clients" USING gin (lower(trim(coalesce("first_name", '') || ' ' || coalesce("last_name", ''))) gin_trgm_ops)
  WHERE "type" = 'individual' AND "status" != 'archived';

CREATE INDEX "contacts_full_name_trgm_idx"
  ON "contacts" USING gin (lower(trim("first_name" || ' ' || "last_name")) gin_trgm_ops)
  WHERE "is_active" = true;

CREATE INDEX "related_companies_external_name_trgm_idx"
  ON "related_companies" USING gin (lower("external_name") gin_trgm_ops)
  WHERE "external_name" IS NOT NULL;

CREATE INDEX "counterparties_name_trgm_idx"
  ON "counterparties" USING gin (lower("name") gin_trgm_ops)
  WHERE "name" IS NOT NULL;

CREATE INDEX "counterparties_company_trgm_idx"
  ON "counterparties" USING gin (lower("company") gin_trgm_ops)
  WHERE "company" IS NOT NULL;
