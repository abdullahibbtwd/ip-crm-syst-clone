-- Phase 7: Correspondence log + matter timeline events

CREATE TYPE "correspondence_direction" AS ENUM ('incoming', 'outgoing');
CREATE TYPE "correspondence_status" AS ENUM ('draft', 'sent', 'received', 'replied');
CREATE TYPE "matter_timeline_event_type" AS ENUM ('correspondence', 'filing', 'deadline', 'note');

CREATE TABLE "correspondence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "direction" "correspondence_direction" NOT NULL,
  "correspondence_date" DATE NOT NULL,
  "sender" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "correspondence_status" NOT NULL DEFAULT 'received',
  "is_client_visible" BOOLEAN NOT NULL DEFAULT false,
  "document_version_id" UUID,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "correspondence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matter_timeline_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" UUID NOT NULL,
  "event_type" "matter_timeline_event_type" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "metadata" JSONB,
  "source_correspondence_id" UUID,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "matter_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "matter_timeline_events_source_correspondence_id_key"
  ON "matter_timeline_events"("source_correspondence_id");

CREATE INDEX "correspondence_matter_id_idx" ON "correspondence"("matter_id");
CREATE INDEX "correspondence_correspondence_date_idx" ON "correspondence"("correspondence_date");
CREATE INDEX "correspondence_status_idx" ON "correspondence"("status");
CREATE INDEX "matter_timeline_events_matter_id_idx" ON "matter_timeline_events"("matter_id");
CREATE INDEX "matter_timeline_events_occurred_at_idx" ON "matter_timeline_events"("occurred_at");

ALTER TABLE "correspondence"
  ADD CONSTRAINT "correspondence_matter_id_fkey"
  FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "correspondence"
  ADD CONSTRAINT "correspondence_document_version_id_fkey"
  FOREIGN KEY ("document_version_id") REFERENCES "matter_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "correspondence"
  ADD CONSTRAINT "correspondence_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "matter_timeline_events"
  ADD CONSTRAINT "matter_timeline_events_matter_id_fkey"
  FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matter_timeline_events"
  ADD CONSTRAINT "matter_timeline_events_source_correspondence_id_fkey"
  FOREIGN KEY ("source_correspondence_id") REFERENCES "correspondence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "matter_timeline_events"
  ADD CONSTRAINT "matter_timeline_events_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
