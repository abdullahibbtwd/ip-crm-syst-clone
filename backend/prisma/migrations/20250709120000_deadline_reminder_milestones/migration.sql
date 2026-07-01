-- Track which reminder milestones have been sent per deadline (e.g. before_30, after_3).
ALTER TABLE "deadlines" ADD COLUMN "reminders_sent" JSONB NOT NULL DEFAULT '[]';
