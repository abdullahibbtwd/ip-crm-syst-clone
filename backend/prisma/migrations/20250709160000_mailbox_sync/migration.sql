-- Connected mailbox sync (Phase 2)
CREATE TYPE "mailbox_provider" AS ENUM ('microsoft', 'google');
CREATE TYPE "mailbox_connection_status" AS ENUM ('active', 'revoked', 'error');
CREATE TYPE "unlinked_email_status" AS ENUM ('pending', 'linked', 'dismissed');

CREATE TABLE "mailbox_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "mailbox_provider" NOT NULL,
  "email_address" TEXT NOT NULL,
  "status" "mailbox_connection_status" NOT NULL DEFAULT 'active',
  "encrypted_tokens" TEXT NOT NULL,
  "last_sync_at" TIMESTAMPTZ(6),
  "last_sync_error" TEXT,
  "sync_cursor" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "mailbox_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unlinked_emails" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mailbox_connection_id" UUID NOT NULL,
  "external_message_id" TEXT NOT NULL,
  "internet_message_id" TEXT,
  "sender" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL,
  "has_attachments" BOOLEAN NOT NULL DEFAULT false,
  "status" "unlinked_email_status" NOT NULL DEFAULT 'pending',
  "suggested_matter_id" UUID,
  "suggestion_reason" TEXT,
  "eml_storage_key" TEXT NOT NULL,
  "metadata" JSONB,
  "linked_correspondence_id" UUID,
  "linked_by_id" UUID,
  "linked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "unlinked_emails_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "correspondence"
  ADD COLUMN "mailbox_connection_id" UUID;

ALTER TABLE "mailbox_connections"
  ADD CONSTRAINT "mailbox_connections_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unlinked_emails"
  ADD CONSTRAINT "unlinked_emails_mailbox_connection_id_fkey"
    FOREIGN KEY ("mailbox_connection_id") REFERENCES "mailbox_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "unlinked_emails_suggested_matter_id_fkey"
    FOREIGN KEY ("suggested_matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "unlinked_emails_linked_correspondence_id_fkey"
    FOREIGN KEY ("linked_correspondence_id") REFERENCES "correspondence"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "unlinked_emails_linked_by_id_fkey"
    FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "correspondence"
  ADD CONSTRAINT "correspondence_mailbox_connection_id_fkey"
    FOREIGN KEY ("mailbox_connection_id") REFERENCES "mailbox_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "mailbox_connections_user_id_provider_key" ON "mailbox_connections"("user_id", "provider");
CREATE INDEX "mailbox_connections_status_idx" ON "mailbox_connections"("status");
CREATE UNIQUE INDEX "unlinked_emails_mailbox_connection_id_external_message_id_key"
  ON "unlinked_emails"("mailbox_connection_id", "external_message_id");
CREATE UNIQUE INDEX "unlinked_emails_linked_correspondence_id_key" ON "unlinked_emails"("linked_correspondence_id");
CREATE INDEX "unlinked_emails_status_received_at_idx" ON "unlinked_emails"("status", "received_at");
CREATE INDEX "unlinked_emails_internet_message_id_idx" ON "unlinked_emails"("internet_message_id");
CREATE INDEX "correspondence_mailbox_connection_id_idx" ON "correspondence"("mailbox_connection_id");
