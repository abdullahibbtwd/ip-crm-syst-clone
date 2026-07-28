-- CreateEnum
CREATE TYPE "client_office_address_type" AS ENUM ('registered_legal', 'correspondence', 'branch');

-- AlterTable
ALTER TABLE "client_offices" ADD COLUMN "address_type" "client_office_address_type" NOT NULL DEFAULT 'branch';

-- CreateIndex
CREATE UNIQUE INDEX "client_offices_client_id_typed_address_key" ON "client_offices" ("client_id", "address_type") WHERE "address_type" IN ('registered_legal', 'correspondence');
