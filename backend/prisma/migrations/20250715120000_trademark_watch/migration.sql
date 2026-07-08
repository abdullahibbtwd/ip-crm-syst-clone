-- CreateEnum
CREATE TYPE "watch_profile_status" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "watch_frequency" AS ENUM ('daily', 'weekly');

-- CreateEnum
CREATE TYPE "watch_alert_status" AS ENUM ('new', 'rejected', 'accepted');

-- CreateEnum
CREATE TYPE "watch_registry_source" AS ENUM ('BPO', 'EUIPO', 'WIPO');

-- CreateTable
CREATE TABLE "watch_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "mark_text" TEXT NOT NULL,
    "jurisdictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nice_classes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "frequency" "watch_frequency" NOT NULL DEFAULT 'weekly',
    "status" "watch_profile_status" NOT NULL DEFAULT 'active',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watch_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "watch_profile_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "conflicting_mark" TEXT NOT NULL,
    "source" "watch_registry_source" NOT NULL,
    "jurisdiction" TEXT,
    "application_number" TEXT,
    "status" "watch_alert_status" NOT NULL DEFAULT 'new',
    "matter_id" UUID,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triaged_at" TIMESTAMPTZ(6),
    "triaged_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watch_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_profiles_client_id_idx" ON "watch_profiles"("client_id");

-- CreateIndex
CREATE INDEX "watch_profiles_status_idx" ON "watch_profiles"("status");

-- CreateIndex
CREATE INDEX "watch_alerts_client_id_status_idx" ON "watch_alerts"("client_id", "status");

-- CreateIndex
CREATE INDEX "watch_alerts_status_detected_at_idx" ON "watch_alerts"("status", "detected_at");

-- CreateIndex
CREATE INDEX "watch_alerts_watch_profile_id_idx" ON "watch_alerts"("watch_profile_id");

-- AddForeignKey
ALTER TABLE "watch_profiles" ADD CONSTRAINT "watch_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_profiles" ADD CONSTRAINT "watch_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_alerts" ADD CONSTRAINT "watch_alerts_watch_profile_id_fkey" FOREIGN KEY ("watch_profile_id") REFERENCES "watch_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_alerts" ADD CONSTRAINT "watch_alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_alerts" ADD CONSTRAINT "watch_alerts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_alerts" ADD CONSTRAINT "watch_alerts_triaged_by_id_fkey" FOREIGN KEY ("triaged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
