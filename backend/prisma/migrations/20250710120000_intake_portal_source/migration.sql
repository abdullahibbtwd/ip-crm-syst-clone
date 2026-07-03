-- Portal-originated intake: track source and the submitting client/user

CREATE TYPE "intake_source" AS ENUM ('internal', 'portal');

ALTER TABLE "intake_leads"
  ADD COLUMN "source" "intake_source" NOT NULL DEFAULT 'internal',
  ADD COLUMN "submitted_client_id" UUID,
  ADD COLUMN "portal_user_id" UUID;

ALTER TABLE "intake_leads"
  ADD CONSTRAINT "intake_leads_submitted_client_id_fkey"
    FOREIGN KEY ("submitted_client_id") REFERENCES "clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "intake_leads"
  ADD CONSTRAINT "intake_leads_portal_user_id_fkey"
    FOREIGN KEY ("portal_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "intake_leads_submitted_client_id_idx" ON "intake_leads"("submitted_client_id");
CREATE INDEX "intake_leads_source_idx" ON "intake_leads"("source");
