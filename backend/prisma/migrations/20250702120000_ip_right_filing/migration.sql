-- Phase 8: IP right filing (application number, filing package link, filed status)

ALTER TYPE ip_right_status ADD VALUE 'filed';

ALTER TABLE ip_rights
  ADD COLUMN application_number TEXT,
  ADD COLUMN filing_document_version_id UUID;

ALTER TABLE ip_rights
  ADD CONSTRAINT ip_rights_filing_document_version_id_fkey
  FOREIGN KEY (filing_document_version_id)
  REFERENCES matter_document_versions(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX ip_rights_filing_document_version_id_idx
  ON ip_rights(filing_document_version_id);

ALTER TABLE matter_timeline_events
  ADD COLUMN source_ip_right_id UUID;

ALTER TABLE matter_timeline_events
  ADD CONSTRAINT matter_timeline_events_source_ip_right_id_fkey
  FOREIGN KEY (source_ip_right_id)
  REFERENCES ip_rights(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX matter_timeline_events_source_ip_right_id_key
  ON matter_timeline_events(source_ip_right_id);
