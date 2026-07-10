-- Priority 0: queryable access-token expiry for proactive mailbox OAuth refresh
ALTER TABLE "mailbox_connections"
  ADD COLUMN IF NOT EXISTS "access_token_expires_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "mailbox_connections_access_token_expires_at_idx"
  ON "mailbox_connections" ("access_token_expires_at");
