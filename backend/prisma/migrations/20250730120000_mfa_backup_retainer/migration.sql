-- MFA backup codes
CREATE TABLE "mfa_backup_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mfa_backup_codes_user_id_idx" ON "mfa_backup_codes"("user_id");

ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Retainer ledger
CREATE TYPE "retainer_entry_type" AS ENUM ('deposit', 'draw_down', 'adjustment', 'refund');

CREATE TABLE "client_retainer_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "low_balance_threshold" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_retainer_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_retainer_accounts_client_id_key" ON "client_retainer_accounts"("client_id");

ALTER TABLE "client_retainer_accounts" ADD CONSTRAINT "client_retainer_accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "retainer_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "type" "retainer_entry_type" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "invoice_id" UUID,
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retainer_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retainer_ledger_entries_account_id_idx" ON "retainer_ledger_entries"("account_id");
CREATE INDEX "retainer_ledger_entries_invoice_id_idx" ON "retainer_ledger_entries"("invoice_id");

ALTER TABLE "retainer_ledger_entries" ADD CONSTRAINT "retainer_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "client_retainer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retainer_ledger_entries" ADD CONSTRAINT "retainer_ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "retainer_ledger_entries" ADD CONSTRAINT "retainer_ledger_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notification types for retainer alerts
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'retainer_low_balance';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'retainer_depleted';
