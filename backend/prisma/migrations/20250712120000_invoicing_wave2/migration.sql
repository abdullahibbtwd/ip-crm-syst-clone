-- Wave 2 invoicing: invoices, payments, FK from billing lines

CREATE TYPE "invoice_status" AS ENUM ('draft', 'issued', 'void');
CREATE TYPE "payment_status" AS ENUM ('unpaid', 'partial', 'paid');

CREATE TABLE "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "matter_id" UUID NOT NULL,
  "invoice_number" TEXT,
  "status" "invoice_status" NOT NULL DEFAULT 'draft',
  "issue_date" DATE,
  "due_date" DATE,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "tax_rate" DECIMAL(5, 2),
  "tax_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12, 2) NOT NULL,
  "payment_status" "payment_status" NOT NULL DEFAULT 'unpaid',
  "paid_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "paid_at" TIMESTAMPTZ(6),
  "pdf_storage_key" TEXT,
  "notes" TEXT,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number"),
  CONSTRAINT "invoices_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoices_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoices_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX "invoices_matter_id_idx" ON "invoices"("matter_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");

CREATE TABLE "invoice_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "paid_at" TIMESTAMPTZ(6) NOT NULL,
  "method" TEXT,
  "reference" TEXT,
  "recorded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_payments_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoice_payments_recorded_by_id_fkey"
    FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments"("invoice_id");

CREATE TABLE "invoice_sequences" (
  "year" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("year")
);

ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fixed_fees"
  ADD CONSTRAINT "fixed_fees_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
