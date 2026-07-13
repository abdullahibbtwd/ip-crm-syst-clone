-- Phase C: watch notifications types, similarity score, partial renewals

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'watch_alert_created';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'watch_alert_triaged';

ALTER TABLE "watch_alerts" ADD COLUMN IF NOT EXISTS "similarity_score" DOUBLE PRECISION;
ALTER TABLE "watch_alerts" ADD COLUMN IF NOT EXISTS "match_method" TEXT;
CREATE INDEX IF NOT EXISTS "watch_alerts_similarity_score_idx" ON "watch_alerts"("similarity_score");

CREATE TABLE "renewal_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "renewal_window_id" UUID NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "nice_classes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" "renewal_status" NOT NULL DEFAULT 'upcoming',
    "official_fee" DECIMAL(12,2),
    "service_fee" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "due_date" DATE,
    "grace_date" DATE,
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_parts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "renewal_parts_renewal_window_id_idx" ON "renewal_parts"("renewal_window_id");
CREATE INDEX "renewal_parts_status_idx" ON "renewal_parts"("status");

ALTER TABLE "renewal_parts" ADD CONSTRAINT "renewal_parts_renewal_window_id_fkey" FOREIGN KEY ("renewal_window_id") REFERENCES "renewal_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "renewal_instructions" ADD COLUMN IF NOT EXISTS "renewal_part_id" UUID;
CREATE INDEX IF NOT EXISTS "renewal_instructions_renewal_part_id_idx" ON "renewal_instructions"("renewal_part_id");
ALTER TABLE "renewal_instructions" ADD CONSTRAINT "renewal_instructions_renewal_part_id_fkey" FOREIGN KEY ("renewal_part_id") REFERENCES "renewal_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "renewal_payments" ADD COLUMN IF NOT EXISTS "renewal_part_id" UUID;
CREATE INDEX IF NOT EXISTS "renewal_payments_renewal_part_id_idx" ON "renewal_payments"("renewal_part_id");
ALTER TABLE "renewal_payments" ADD CONSTRAINT "renewal_payments_renewal_part_id_fkey" FOREIGN KEY ("renewal_part_id") REFERENCES "renewal_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
