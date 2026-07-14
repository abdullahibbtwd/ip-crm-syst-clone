-- Precedents knowledge base
CREATE TYPE "precedent_status" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "precedents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "matter_type" "matter_type",
    "jurisdiction" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "body_html" TEXT NOT NULL,
    "status" "precedent_status" NOT NULL DEFAULT 'draft',
    "source_matter_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precedents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "precedents_status_idx" ON "precedents"("status");
CREATE INDEX "precedents_category_idx" ON "precedents"("category");
CREATE INDEX "precedents_matter_type_idx" ON "precedents"("matter_type");
CREATE INDEX "precedents_jurisdiction_idx" ON "precedents"("jurisdiction");
CREATE INDEX "precedents_created_by_id_idx" ON "precedents"("created_by_id");

ALTER TABLE "precedents" ADD CONSTRAINT "precedents_source_matter_id_fkey" FOREIGN KEY ("source_matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "precedents" ADD CONSTRAINT "precedents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "precedent_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "precedent_id" UUID NOT NULL,
    "body_html" TEXT NOT NULL,
    "edited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precedent_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "precedent_versions_precedent_id_idx" ON "precedent_versions"("precedent_id");

ALTER TABLE "precedent_versions" ADD CONSTRAINT "precedent_versions_precedent_id_fkey" FOREIGN KEY ("precedent_id") REFERENCES "precedents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "precedent_versions" ADD CONSTRAINT "precedent_versions_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FTS for precedents
ALTER TABLE "precedents" ADD COLUMN "body_tsvector" tsvector;

CREATE OR REPLACE FUNCTION precedent_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.body_tsvector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(NEW.body_html, '')), 'B')
    || setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C')
    || setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS precedent_search_vector_trigger ON "precedents";
CREATE TRIGGER precedent_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, body_html, category, tags
  ON "precedents"
  FOR EACH ROW
  EXECUTE PROCEDURE precedent_search_vector_update();

CREATE INDEX IF NOT EXISTS "precedents_body_tsvector_idx"
  ON "precedents" USING GIN ("body_tsvector");

-- Customs / enforcement
CREATE TYPE "customs_seizure_status" AS ENUM ('active', 'released', 'destroyed', 'expired');
CREATE TYPE "customs_application_status" AS ENUM ('submitted', 'active', 'expired', 'renewed');
CREATE TYPE "custody_action" AS ENUM ('received', 'photographed', 'sampled', 'transferred', 'destroyed', 'returned');

ALTER TYPE "deadline_rule_trigger_type" ADD VALUE IF NOT EXISTS 'customs_seizure';

CREATE TABLE "customs_seizures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "seizure_date" DATE NOT NULL,
    "customs_office" TEXT NOT NULL,
    "consignment_reference" TEXT,
    "goods_description" TEXT NOT NULL,
    "quantity" TEXT,
    "port_of_entry" TEXT,
    "status" "customs_seizure_status" NOT NULL DEFAULT 'active',
    "linked_matter_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customs_seizures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customs_seizures_matter_id_idx" ON "customs_seizures"("matter_id");
CREATE INDEX "customs_seizures_client_id_idx" ON "customs_seizures"("client_id");
CREATE INDEX "customs_seizures_status_idx" ON "customs_seizures"("status");

ALTER TABLE "customs_seizures" ADD CONSTRAINT "customs_seizures_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_seizures" ADD CONSTRAINT "customs_seizures_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_seizures" ADD CONSTRAINT "customs_seizures_linked_matter_id_fkey" FOREIGN KEY ("linked_matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customs_seizures" ADD CONSTRAINT "customs_seizures_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customs_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" UUID NOT NULL,
    "seizure_id" UUID,
    "authority" TEXT NOT NULL,
    "application_number" TEXT,
    "submitted_date" DATE,
    "valid_from" DATE,
    "valid_until" DATE,
    "status" "customs_application_status" NOT NULL DEFAULT 'submitted',
    "renewal_of_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customs_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customs_applications_matter_id_idx" ON "customs_applications"("matter_id");
CREATE INDEX "customs_applications_seizure_id_idx" ON "customs_applications"("seizure_id");

ALTER TABLE "customs_applications" ADD CONSTRAINT "customs_applications_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_applications" ADD CONSTRAINT "customs_applications_seizure_id_fkey" FOREIGN KEY ("seizure_id") REFERENCES "customs_seizures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customs_applications" ADD CONSTRAINT "customs_applications_renewal_of_id_fkey" FOREIGN KEY ("renewal_of_id") REFERENCES "customs_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customs_applications" ADD CONSTRAINT "customs_applications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "custody_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seizure_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "custody_action" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "document_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custody_logs_seizure_id_idx" ON "custody_logs"("seizure_id");

ALTER TABLE "custody_logs" ADD CONSTRAINT "custody_logs_seizure_id_fkey" FOREIGN KEY ("seizure_id") REFERENCES "customs_seizures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custody_logs" ADD CONSTRAINT "custody_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custody_logs" ADD CONSTRAINT "custody_logs_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "matter_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deadlines" ADD COLUMN IF NOT EXISTS "source_customs_seizure_id" UUID;
CREATE INDEX IF NOT EXISTS "deadlines_source_customs_seizure_id_idx" ON "deadlines"("source_customs_seizure_id");
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_source_customs_seizure_id_fkey" FOREIGN KEY ("source_customs_seizure_id") REFERENCES "customs_seizures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
