-- CreateEnum
CREATE TYPE "client_type" AS ENUM ('company', 'individual');

-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('active', 'inactive', 'prospect', 'archived');

-- CreateEnum
CREATE TYPE "contact_role" AS ENUM ('primary', 'billing', 'conflict', 'general');

-- CreateEnum
CREATE TYPE "relationship_event_type" AS ENUM ('created', 'status_changed', 'contact_added', 'office_added', 'note_added', 'related_company_linked', 'holding_changed');

-- CreateTable
CREATE TABLE "holding_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "holding_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "client_type" NOT NULL,
    "status" "client_status" NOT NULL DEFAULT 'active',
    "company_name" TEXT,
    "registration_no" TEXT,
    "vat_no" TEXT,
    "legal_form" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "website" TEXT,
    "internal_code" TEXT,
    "assigned_user_id" UUID,
    "holding_group_id" UUID,
    "notes" TEXT,
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_consent_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_offices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "role" "contact_role" NOT NULL DEFAULT 'primary',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "office_id" UUID,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "related_companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "related_client_id" UUID,
    "external_name" TEXT,
    "relationship_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" "relationship_event_type" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_internal_code_key" ON "clients"("internal_code");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_type_idx" ON "clients"("type");

-- CreateIndex
CREATE INDEX "clients_holding_group_id_idx" ON "clients"("holding_group_id");

-- CreateIndex
CREATE INDEX "clients_assigned_user_id_idx" ON "clients"("assigned_user_id");

-- CreateIndex
CREATE INDEX "client_offices_client_id_idx" ON "client_offices"("client_id");

-- CreateIndex
CREATE INDEX "contacts_client_id_idx" ON "contacts"("client_id");

-- CreateIndex
CREATE INDEX "contacts_role_idx" ON "contacts"("role");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "related_companies_client_id_idx" ON "related_companies"("client_id");

-- CreateIndex
CREATE INDEX "relationship_history_client_id_idx" ON "relationship_history"("client_id");

-- CreateIndex
CREATE INDEX "relationship_history_created_at_idx" ON "relationship_history"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_holding_group_id_fkey" FOREIGN KEY ("holding_group_id") REFERENCES "holding_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_offices" ADD CONSTRAINT "client_offices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "client_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_companies" ADD CONSTRAINT "related_companies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "related_companies" ADD CONSTRAINT "related_companies_related_client_id_fkey" FOREIGN KEY ("related_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_history" ADD CONSTRAINT "relationship_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_history" ADD CONSTRAINT "relationship_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
