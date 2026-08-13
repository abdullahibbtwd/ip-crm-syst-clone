-- Align intake_matter_type with matter_type (same work-type list as matters filter).
-- Maps legacy `design` → `industrial_design` and adds missing categories.

CREATE TYPE "intake_matter_type_new" AS ENUM (
  'trademark',
  'patent',
  'utility_model',
  'industrial_design',
  'copyright',
  'geographical_indication',
  'border_measures',
  'fto_analysis',
  'valuation',
  'dispute_opposition',
  'cases',
  'domain',
  'litigation_expert_report',
  'consultation',
  'official_fee_payment',
  'other'
);

ALTER TABLE "intake_leads"
  ALTER COLUMN "matter_type" TYPE "intake_matter_type_new"
  USING (
    CASE "matter_type"::text
      WHEN 'design' THEN 'industrial_design'::"intake_matter_type_new"
      ELSE "matter_type"::text::"intake_matter_type_new"
    END
  );

DROP TYPE "intake_matter_type";
ALTER TYPE "intake_matter_type_new" RENAME TO "intake_matter_type";
