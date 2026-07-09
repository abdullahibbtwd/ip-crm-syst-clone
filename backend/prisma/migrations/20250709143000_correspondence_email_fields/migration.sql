-- Correspondence email fields (Phase 1 manual email logging)
CREATE TYPE "correspondence_source" AS ENUM ('manual', 'synced');

ALTER TABLE "correspondence"
  ADD COLUMN "source" "correspondence_source" NOT NULL DEFAULT 'manual',
  ADD COLUMN "message_id" TEXT,
  ADD COLUMN "body_text" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "correspondence_message_id_idx" ON "correspondence"("message_id");
