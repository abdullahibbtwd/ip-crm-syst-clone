-- Full-text search for correspondence + unlinked email bodies (PostgreSQL tsvector)
-- NOTE: to_tsvector() is STABLE (not IMMUTABLE), so GENERATED ALWAYS columns are not allowed.
-- Use plain tsvector columns + BEFORE INSERT/UPDATE triggers instead.

-- Queue emails: persist parsed plain text so FTS can index .eml content
ALTER TABLE "unlinked_emails"
  ADD COLUMN IF NOT EXISTS "body_text" TEXT;

-- Drop any partial generated-column attempt from a failed prior apply
ALTER TABLE "correspondence" DROP COLUMN IF EXISTS "body_tsvector";
ALTER TABLE "unlinked_emails" DROP COLUMN IF EXISTS "body_tsvector";
ALTER TABLE "matter_documents" DROP COLUMN IF EXISTS "search_tsvector";

ALTER TABLE "correspondence" ADD COLUMN "body_tsvector" tsvector;
ALTER TABLE "unlinked_emails" ADD COLUMN "body_tsvector" tsvector;
ALTER TABLE "matter_documents" ADD COLUMN "search_tsvector" tsvector;

CREATE OR REPLACE FUNCTION correspondence_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.body_tsvector :=
    setweight(to_tsvector('english', coalesce(NEW.subject, '')), 'A')
    || setweight(to_tsvector('english', coalesce(NEW.body_text, '')), 'B')
    || setweight(to_tsvector('english', coalesce(NEW.sender, '')), 'C')
    || setweight(to_tsvector('english', coalesce(NEW.recipient, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION unlinked_email_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.body_tsvector :=
    setweight(to_tsvector('english', coalesce(NEW.subject, '')), 'A')
    || setweight(to_tsvector('english', coalesce(NEW.body_text, '')), 'B')
    || setweight(to_tsvector('english', coalesce(NEW.sender, '')), 'C')
    || setweight(to_tsvector('english', coalesce(NEW.recipient, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION matter_document_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsvector :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS correspondence_search_vector_trigger ON "correspondence";
CREATE TRIGGER correspondence_search_vector_trigger
  BEFORE INSERT OR UPDATE OF subject, body_text, sender, recipient
  ON "correspondence"
  FOR EACH ROW
  EXECUTE PROCEDURE correspondence_search_vector_update();

DROP TRIGGER IF EXISTS unlinked_email_search_vector_trigger ON "unlinked_emails";
CREATE TRIGGER unlinked_email_search_vector_trigger
  BEFORE INSERT OR UPDATE OF subject, body_text, sender, recipient
  ON "unlinked_emails"
  FOR EACH ROW
  EXECUTE PROCEDURE unlinked_email_search_vector_update();

DROP TRIGGER IF EXISTS matter_document_search_vector_trigger ON "matter_documents";
CREATE TRIGGER matter_document_search_vector_trigger
  BEFORE INSERT OR UPDATE OF display_name, tags
  ON "matter_documents"
  FOR EACH ROW
  EXECUTE PROCEDURE matter_document_search_vector_update();

-- Backfill existing rows
UPDATE "correspondence" SET subject = subject;
UPDATE "unlinked_emails" SET subject = subject;
UPDATE "matter_documents" SET display_name = display_name;

CREATE INDEX IF NOT EXISTS "correspondence_body_tsvector_idx"
  ON "correspondence" USING GIN ("body_tsvector");

CREATE INDEX IF NOT EXISTS "unlinked_emails_body_tsvector_idx"
  ON "unlinked_emails" USING GIN ("body_tsvector");

CREATE INDEX IF NOT EXISTS "matter_documents_search_tsvector_idx"
  ON "matter_documents" USING GIN ("search_tsvector");
