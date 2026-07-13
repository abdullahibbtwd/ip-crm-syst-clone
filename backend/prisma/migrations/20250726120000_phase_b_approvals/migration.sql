-- Phase B: client approvals + notification type

CREATE TYPE "client_approval_status" AS ENUM ('draft', 'pending', 'approved', 'rejected');

CREATE TABLE "client_approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "client_approval_status" NOT NULL DEFAULT 'draft',
    "document_version_id" UUID,
    "due_date" DATE,
    "decision_note" TEXT,
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "requested_at" TIMESTAMPTZ(6),
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_approval_requests_matter_id_idx" ON "client_approval_requests"("matter_id");
CREATE INDEX "client_approval_requests_client_id_idx" ON "client_approval_requests"("client_id");
CREATE INDEX "client_approval_requests_status_idx" ON "client_approval_requests"("status");

ALTER TABLE "client_approval_requests" ADD CONSTRAINT "client_approval_requests_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_approval_requests" ADD CONSTRAINT "client_approval_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_approval_requests" ADD CONSTRAINT "client_approval_requests_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "matter_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_approval_requests" ADD CONSTRAINT "client_approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_approval_requests" ADD CONSTRAINT "client_approval_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'client_approval_update';
