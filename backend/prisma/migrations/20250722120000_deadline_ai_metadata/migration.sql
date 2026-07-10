-- Priority 4: AI Assistant metadata cache on deadlines
ALTER TABLE "deadlines" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
