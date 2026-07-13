-- CreateTable
CREATE TABLE "portal_broadcast_copies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "broadcast_id" UUID NOT NULL,
    "broadcast_recipient_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT,
    "sent_at" TIMESTAMPTZ(6) NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_broadcast_copies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_broadcast_copies_broadcast_recipient_id_key" ON "portal_broadcast_copies"("broadcast_recipient_id");

-- CreateIndex
CREATE INDEX "portal_broadcast_copies_client_id_sent_at_idx" ON "portal_broadcast_copies"("client_id", "sent_at");

-- CreateIndex
CREATE INDEX "portal_broadcast_copies_broadcast_id_idx" ON "portal_broadcast_copies"("broadcast_id");

-- AddForeignKey
ALTER TABLE "portal_broadcast_copies" ADD CONSTRAINT "portal_broadcast_copies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_broadcast_copies" ADD CONSTRAINT "portal_broadcast_copies_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_broadcast_copies" ADD CONSTRAINT "portal_broadcast_copies_broadcast_recipient_id_fkey" FOREIGN KEY ("broadcast_recipient_id") REFERENCES "broadcast_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
