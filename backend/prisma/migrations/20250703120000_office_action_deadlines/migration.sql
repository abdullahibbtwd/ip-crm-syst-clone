-- Office action auto-deadlines: rule trigger type, correspondence category, deadline traceability

CREATE TYPE "deadline_rule_trigger_type" AS ENUM ('matter_created', 'office_action');

ALTER TABLE "deadline_rules"
  ADD COLUMN "trigger_type" "deadline_rule_trigger_type" NOT NULL DEFAULT 'matter_created';

ALTER TABLE "deadline_rules"
  DROP CONSTRAINT "deadline_rules_jurisdiction_matter_type_event_type_key";

ALTER TABLE "deadline_rules"
  ADD CONSTRAINT "deadline_rules_jurisdiction_matter_type_event_type_trigger_type_key"
    UNIQUE ("jurisdiction", "matter_type", "event_type", "trigger_type");

CREATE INDEX "deadline_rules_trigger_type_idx" ON "deadline_rules"("trigger_type");

ALTER TABLE "correspondence"
  ADD COLUMN "category" "document_category" NOT NULL DEFAULT 'correspondence';

CREATE INDEX "correspondence_category_idx" ON "correspondence"("category");

ALTER TABLE "deadlines"
  ADD COLUMN "source_correspondence_id" UUID;

ALTER TABLE "deadlines"
  ADD CONSTRAINT "deadlines_source_correspondence_id_fkey"
    FOREIGN KEY ("source_correspondence_id")
    REFERENCES "correspondence"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "deadlines_source_correspondence_id_idx"
  ON "deadlines"("source_correspondence_id");

ALTER TABLE "deadlines" DROP CONSTRAINT "deadlines_matter_id_rule_id_key";

CREATE UNIQUE INDEX "deadlines_matter_id_rule_id_matter_created_key"
  ON "deadlines"("matter_id", "rule_id")
  WHERE "source_correspondence_id" IS NULL AND "rule_id" IS NOT NULL;

CREATE UNIQUE INDEX "deadlines_source_correspondence_id_rule_id_key"
  ON "deadlines"("source_correspondence_id", "rule_id")
  WHERE "source_correspondence_id" IS NOT NULL AND "rule_id" IS NOT NULL;
