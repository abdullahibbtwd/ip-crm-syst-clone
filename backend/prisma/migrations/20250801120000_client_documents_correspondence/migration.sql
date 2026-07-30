-- AlterEnum
ALTER TYPE "document_category" ADD VALUE 'general';

-- CreateTable
CREATE TABLE "client_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" "document_category" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_document_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_document_versions_pkey" PRIMARY KEY ("id")
);

-- AlterTable correspondence: allow client-scoped rows
ALTER TABLE "correspondence" ALTER COLUMN "matter_id" DROP NOT NULL;
ALTER TABLE "correspondence" ADD COLUMN "client_id" UUID;
ALTER TABLE "correspondence" ADD COLUMN "client_document_version_id" UUID;

-- AlterTable unlinked_emails
ALTER TABLE "unlinked_emails" ADD COLUMN "suggested_client_id" UUID;

-- CreateIndex
CREATE INDEX "client_documents_client_id_idx" ON "client_documents"("client_id");
CREATE INDEX "client_documents_category_idx" ON "client_documents"("category");
CREATE INDEX "client_document_versions_document_id_idx" ON "client_document_versions"("document_id");
CREATE UNIQUE INDEX "client_document_versions_document_id_version_key" ON "client_document_versions"("document_id", "version");
CREATE INDEX "correspondence_client_id_idx" ON "correspondence"("client_id");
CREATE INDEX "unlinked_emails_suggested_client_id_idx" ON "unlinked_emails"("suggested_client_id");

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_document_versions" ADD CONSTRAINT "client_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "client_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_document_versions" ADD CONSTRAINT "client_document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "correspondence" ADD CONSTRAINT "correspondence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "correspondence" ADD CONSTRAINT "correspondence_client_document_version_id_fkey" FOREIGN KEY ("client_document_version_id") REFERENCES "client_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "unlinked_emails" ADD CONSTRAINT "unlinked_emails_suggested_client_id_fkey" FOREIGN KEY ("suggested_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactly one of matter_id / client_id
ALTER TABLE "correspondence" ADD CONSTRAINT "correspondence_scope_xor_check"
  CHECK (
    ("matter_id" IS NOT NULL AND "client_id" IS NULL)
    OR ("matter_id" IS NULL AND "client_id" IS NOT NULL)
  );
