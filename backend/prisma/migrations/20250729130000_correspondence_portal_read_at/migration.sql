-- AlterTable
ALTER TABLE "correspondence" ADD COLUMN "portal_read_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "correspondence_is_client_visible_portal_read_at_idx" ON "correspondence"("is_client_visible", "portal_read_at");
