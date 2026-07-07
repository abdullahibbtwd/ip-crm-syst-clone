-- Optional internal hourly cost on rate cards (mirrors billing rate resolution).
ALTER TABLE "rate_cards"
  ADD COLUMN IF NOT EXISTS "internal_cost_per_hour" DECIMAL(10, 2);

-- Snapshot internal cost at time of entry (mirrors rate_snapshot).
ALTER TABLE "time_entries"
  ADD COLUMN IF NOT EXISTS "cost_snapshot" DECIMAL(10, 2) NOT NULL DEFAULT 0;

DROP VIEW IF EXISTS billing_summary;

CREATE VIEW billing_summary AS
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
  )::decimal(12, 2) AS unbilled_amount,
  COALESCE(te_stats.total_internal_cost, 0)::decimal(12, 2) AS total_internal_cost
FROM matters m
LEFT JOIN (
  SELECT
    matter_id,
    SUM(hours) AS total_hours,
    SUM(CASE WHEN is_billable THEN hours ELSE 0 END) AS total_billable_hours,
    SUM(CASE WHEN is_billable THEN amount ELSE 0 END) AS total_billable_amount,
    SUM(
      CASE WHEN is_billable THEN hours * cost_snapshot ELSE 0 END
    ) AS total_internal_cost,
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
