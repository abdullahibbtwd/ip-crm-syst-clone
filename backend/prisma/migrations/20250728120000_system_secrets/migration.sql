-- Encrypted system credentials for SSO / integrations (DB-first with env fallback).
CREATE TABLE "system_secrets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT,
    "non_secret_value" TEXT,
    "last_four" VARCHAR(8),
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_secrets_category_key_key" ON "system_secrets"("category", "key");
CREATE INDEX "system_secrets_category_idx" ON "system_secrets"("category");

ALTER TABLE "system_secrets"
  ADD CONSTRAINT "system_secrets_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
