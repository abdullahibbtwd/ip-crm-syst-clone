-- AlterTable
ALTER TABLE "users" ADD COLUMN "invite_email_sent_at" TIMESTAMPTZ(6),
ADD COLUMN "invite_email_last_error" TEXT;

-- CreateTable
CREATE TABLE "user_invite_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_tokens_token_hash_key" ON "user_invite_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_user_invite_user" ON "user_invite_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "user_invite_tokens" ADD CONSTRAINT "user_invite_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
