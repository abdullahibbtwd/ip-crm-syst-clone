-- CreateEnum
CREATE TYPE "jurisdiction_type" AS ENUM ('national', 'regional', 'international');

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "office_name" TEXT NOT NULL,
    "type" "jurisdiction_type" NOT NULL DEFAULT 'national',
    "is_priority" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE INDEX "jurisdictions_is_active_idx" ON "jurisdictions"("is_active");

-- CreateIndex
CREATE INDEX "jurisdictions_is_priority_idx" ON "jurisdictions"("is_priority");

-- CreateIndex
CREATE INDEX "jurisdictions_sort_order_idx" ON "jurisdictions"("sort_order");
