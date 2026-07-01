-- Link intake conversion to matters (bidirectional traceability)

ALTER TABLE "intake_leads"
  ADD COLUMN "converted_matter_id" UUID;

ALTER TABLE "matters"
  ADD COLUMN "source_intake_id" UUID;

ALTER TABLE "intake_leads"
  ADD CONSTRAINT "intake_leads_converted_matter_id_key" UNIQUE ("converted_matter_id");

ALTER TABLE "matters"
  ADD CONSTRAINT "matters_source_intake_id_key" UNIQUE ("source_intake_id");

ALTER TABLE "intake_leads"
  ADD CONSTRAINT "intake_leads_converted_matter_id_fkey"
    FOREIGN KEY ("converted_matter_id") REFERENCES "matters"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "matters"
  ADD CONSTRAINT "matters_source_intake_id_fkey"
    FOREIGN KEY ("source_intake_id") REFERENCES "intake_leads"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
