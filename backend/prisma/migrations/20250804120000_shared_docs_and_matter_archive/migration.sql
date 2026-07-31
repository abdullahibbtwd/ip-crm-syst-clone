-- Firm-wide shared documents library (no client/matter parent).
CREATE TABLE "shared_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" TEXT NOT NULL,
    "category" "document_category" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shared_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shared_document_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shared_documents_category_idx" ON "shared_documents"("category");
CREATE INDEX "shared_document_versions_document_id_idx" ON "shared_document_versions"("document_id");
CREATE UNIQUE INDEX "shared_document_versions_document_id_version_key" ON "shared_document_versions"("document_id", "version");

ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shared_document_versions" ADD CONSTRAINT "shared_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "shared_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_document_versions" ADD CONSTRAINT "shared_document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Archived working files (matters) — orthogonal to status.
ALTER TABLE "matters" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "matters" ADD COLUMN "archived_at" TIMESTAMPTZ(6);
ALTER TABLE "matters" ADD COLUMN "archived_by_id" UUID;

CREATE INDEX "matters_is_archived_idx" ON "matters"("is_archived");
ALTER TABLE "matters" ADD CONSTRAINT "matters_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
