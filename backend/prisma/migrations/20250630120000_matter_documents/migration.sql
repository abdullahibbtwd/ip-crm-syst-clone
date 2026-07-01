-- Matter documents (folder) + versions (papers) with search indexes

CREATE TYPE "document_category" AS ENUM (
  'application',
  'office_action',
  'evidence',
  'certificate',
  'correspondence'
);

CREATE TABLE "matter_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "category" "document_category" NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "matter_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matter_document_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "matter_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "matter_document_versions_document_id_version_key"
  ON "matter_document_versions"("document_id", "version");

CREATE INDEX "matter_documents_matter_id_idx" ON "matter_documents"("matter_id");
CREATE INDEX "matter_documents_category_idx" ON "matter_documents"("category");
CREATE INDEX "matter_document_versions_document_id_idx" ON "matter_document_versions"("document_id");

-- Search indexes: tags (GIN) and display name (trigram - extension already enabled)
CREATE INDEX "matter_documents_tags_gin_idx" ON "matter_documents" USING GIN ("tags");
CREATE INDEX "matter_documents_display_name_trgm_idx"
  ON "matter_documents" USING GIN ("display_name" gin_trgm_ops);

ALTER TABLE "matter_documents"
  ADD CONSTRAINT "matter_documents_matter_id_fkey"
  FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matter_documents"
  ADD CONSTRAINT "matter_documents_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "matter_document_versions"
  ADD CONSTRAINT "matter_document_versions_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "matter_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matter_document_versions"
  ADD CONSTRAINT "matter_document_versions_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
