-- GDPR retention rules
CREATE TYPE "retention_action" AS ENUM ('anonymize', 'delete');

CREATE TABLE "retention_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" TEXT NOT NULL,
  "condition_json" JSONB NOT NULL DEFAULT '{}',
  "retention_days" INTEGER NOT NULL,
  "action" "retention_action" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "retention_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retention_rules_entity_type_idx" ON "retention_rules"("entity_type");
