-- Optional client billing profile for invoice bill-to + multi-currency
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_name" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_email" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "preferred_currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "payment_terms_days" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_address_line1" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_address_line2" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_city" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_region" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_postal_code" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_country" TEXT;
