-- Matter instructing client stays on matters.client_id.
-- Optional applicant (rights holder) and intermediary as separate Client FKs.
ALTER TABLE "matters" ADD COLUMN "applicant_client_id" UUID;
ALTER TABLE "matters" ADD COLUMN "intermediary_client_id" UUID;

ALTER TABLE "matters"
  ADD CONSTRAINT "matters_applicant_client_id_fkey"
  FOREIGN KEY ("applicant_client_id") REFERENCES "clients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "matters"
  ADD CONSTRAINT "matters_intermediary_client_id_fkey"
  FOREIGN KEY ("intermediary_client_id") REFERENCES "clients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "matters_applicant_client_id_idx" ON "matters"("applicant_client_id");
CREATE INDEX "matters_intermediary_client_id_idx" ON "matters"("intermediary_client_id");

-- IP right owner (applicant / rights holder); instructing client remains client_id.
ALTER TABLE "ip_rights" ADD COLUMN "owner_client_id" UUID;

UPDATE "ip_rights" SET "owner_client_id" = "client_id" WHERE "owner_client_id" IS NULL;

ALTER TABLE "ip_rights" ALTER COLUMN "owner_client_id" SET NOT NULL;

ALTER TABLE "ip_rights"
  ADD CONSTRAINT "ip_rights_owner_client_id_fkey"
  FOREIGN KEY ("owner_client_id") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ip_rights_owner_client_id_idx" ON "ip_rights"("owner_client_id");

-- Persist optional party drafts on intake until convert.
ALTER TABLE "intake_leads" ADD COLUMN "applicant_party" JSONB;
ALTER TABLE "intake_leads" ADD COLUMN "intermediary_party" JSONB;
