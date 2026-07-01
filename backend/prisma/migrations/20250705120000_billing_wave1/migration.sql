-- Wave 1 billing: rate cards, time entries, fixed fees, billing summary view

CREATE TYPE "billing_rate_role" AS ENUM (
  'ip_attorney',
  'trademark_attorney',
  'paralegal',
  'coordinator',
  'managing_partner'
);

CREATE TYPE "fixed_fee_category" AS ENUM (
  'professional_fee',
  'disbursement',
  'expense'
);

CREATE TABLE "rate_cards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "role" "billing_rate_role" NOT NULL,
  "matter_type" "matter_type",
  "client_id" UUID,
  "hourly_rate" DECIMAL(10, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rate_cards_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "rate_cards_role_matter_type_client_id_idx"
  ON "rate_cards"("role", "matter_type", "client_id");
CREATE INDEX "rate_cards_effective_from_idx" ON "rate_cards"("effective_from");

CREATE TABLE "time_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "logged_by_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "hours" DECIMAL(6, 2) NOT NULL,
  "description" TEXT NOT NULL,
  "is_billable" BOOLEAN NOT NULL DEFAULT true,
  "rate_snapshot" DECIMAL(10, 2) NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "invoice_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "time_entries_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "time_entries_logged_by_id_fkey"
    FOREIGN KEY ("logged_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "time_entries_matter_id_idx" ON "time_entries"("matter_id");
CREATE INDEX "time_entries_logged_by_id_idx" ON "time_entries"("logged_by_id");
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");
CREATE INDEX "time_entries_invoice_id_idx" ON "time_entries"("invoice_id");

CREATE TABLE "fixed_fees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "category" "fixed_fee_category" NOT NULL,
  "date" DATE NOT NULL,
  "is_billable" BOOLEAN NOT NULL DEFAULT true,
  "invoice_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "fixed_fees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fixed_fees_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "fixed_fees_matter_id_idx" ON "fixed_fees"("matter_id");
CREATE INDEX "fixed_fees_date_idx" ON "fixed_fees"("date");
CREATE INDEX "fixed_fees_invoice_id_idx" ON "fixed_fees"("invoice_id");

CREATE OR REPLACE VIEW billing_summary AS
SELECT
  m.id AS matter_id,
  COALESCE(te_stats.total_hours, 0)::decimal(12, 2) AS total_hours,
  COALESCE(te_stats.total_billable_hours, 0)::decimal(12, 2) AS total_billable_hours,
  COALESCE(te_stats.total_billable_amount, 0)::decimal(12, 2) AS total_billable_amount,
  COALESCE(ff_stats.total_fixed_fees, 0)::decimal(12, 2) AS total_fixed_fees,
  (
    COALESCE(te_stats.total_billable_amount, 0) + COALESCE(ff_stats.total_fixed_fees, 0)
  )::decimal(12, 2) AS total_amount,
  (
    COALESCE(te_stats.unbilled_time_amount, 0) + COALESCE(ff_stats.unbilled_fixed_fees, 0)
  )::decimal(12, 2) AS unbilled_amount
FROM matters m
LEFT JOIN (
  SELECT
    matter_id,
    SUM(hours) AS total_hours,
    SUM(CASE WHEN is_billable THEN hours ELSE 0 END) AS total_billable_hours,
    SUM(CASE WHEN is_billable THEN amount ELSE 0 END) AS total_billable_amount,
    SUM(
      CASE WHEN is_billable AND invoice_id IS NULL THEN amount ELSE 0 END
    ) AS unbilled_time_amount
  FROM time_entries
  GROUP BY matter_id
) te_stats ON te_stats.matter_id = m.id
LEFT JOIN (
  SELECT
    matter_id,
    SUM(CASE WHEN is_billable THEN amount ELSE 0 END) AS total_fixed_fees,
    SUM(
      CASE WHEN is_billable AND invoice_id IS NULL THEN amount ELSE 0 END
    ) AS unbilled_fixed_fees
  FROM fixed_fees
  GROUP BY matter_id
) ff_stats ON ff_stats.matter_id = m.id;
