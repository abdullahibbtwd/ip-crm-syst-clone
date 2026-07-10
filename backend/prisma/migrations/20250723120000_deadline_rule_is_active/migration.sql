-- Soft-disable deadline rules without breaking existing deadline.rule_id FKs
ALTER TABLE "deadline_rules" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "deadline_rules_is_active_idx" ON "deadline_rules"("is_active");
