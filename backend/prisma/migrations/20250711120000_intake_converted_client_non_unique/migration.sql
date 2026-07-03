-- Portal clients can convert multiple enquiries into matters, all pointing at
-- the same existing client. Drop the 1:1 unique constraint on
-- converted_client_id (the matter link stays unique) and keep a plain index.

DROP INDEX "intake_leads_converted_client_id_key";

CREATE INDEX "intake_leads_converted_client_id_idx" ON "intake_leads"("converted_client_id");
