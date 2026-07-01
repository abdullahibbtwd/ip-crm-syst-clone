-- Manual deadline fields (jurisdiction and notes when no rule applies)
ALTER TABLE "deadlines" ADD COLUMN "jurisdiction" TEXT;
ALTER TABLE "deadlines" ADD COLUMN "notes" TEXT;
