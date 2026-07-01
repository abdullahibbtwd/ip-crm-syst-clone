-- Superseded deadline status + dedupe pending office-action deadlines

ALTER TYPE deadline_status ADD VALUE 'superseded';

-- Keep the newest pending deadline per matter+rule; supersede older duplicates
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY matter_id, rule_id
      ORDER BY created_at DESC
    ) AS rn
  FROM deadlines
  WHERE status = 'pending'
    AND rule_id IS NOT NULL
)
UPDATE deadlines
SET status = 'superseded'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
