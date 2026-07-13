-- Phase A: holiday calendar, partner instructions, DOCX template key, notification type

CREATE TABLE "holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jurisdiction" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "holidays_jurisdiction_date_key" ON "holidays"("jurisdiction", "date");
CREATE INDEX "holidays_jurisdiction_idx" ON "holidays"("jurisdiction");
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_templates" ADD COLUMN "docx_storage_key" TEXT;

CREATE TYPE "partner_instruction_status" AS ENUM ('draft', 'sent', 'acknowledged', 'complete');

CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country_code" TEXT,
    "jurisdictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partners_is_active_idx" ON "partners"("is_active");
CREATE INDEX "partners_name_idx" ON "partners"("name");

CREATE TABLE "partner_instructions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "partner_instruction_status" NOT NULL DEFAULT 'draft',
    "deadline_id" UUID,
    "created_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "acknowledged_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_instructions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_instructions_matter_id_idx" ON "partner_instructions"("matter_id");
CREATE INDEX "partner_instructions_partner_id_idx" ON "partner_instructions"("partner_id");
CREATE INDEX "partner_instructions_status_idx" ON "partner_instructions"("status");
CREATE INDEX "partner_instructions_deadline_id_idx" ON "partner_instructions"("deadline_id");

ALTER TABLE "partner_instructions" ADD CONSTRAINT "partner_instructions_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_instructions" ADD CONSTRAINT "partner_instructions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_instructions" ADD CONSTRAINT "partner_instructions_deadline_id_fkey" FOREIGN KEY ("deadline_id") REFERENCES "deadlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_instructions" ADD CONSTRAINT "partner_instructions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'partner_instruction_update';
