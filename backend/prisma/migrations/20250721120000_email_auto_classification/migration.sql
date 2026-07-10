-- Email auto-classification: suggested category on queue + renewal document category

ALTER TYPE "document_category" ADD VALUE IF NOT EXISTS 'renewal';

ALTER TABLE "unlinked_emails"
  ADD COLUMN IF NOT EXISTS "suggested_category" "document_category";

CREATE INDEX IF NOT EXISTS "unlinked_emails_suggested_category_idx"
  ON "unlinked_emails"("suggested_category");
