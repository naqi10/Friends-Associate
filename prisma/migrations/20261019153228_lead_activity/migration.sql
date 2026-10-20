-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "converted_user_id" TEXT;

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadActivity_lead_id_created_at_idx" ON "LeadActivity"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_converted_user_id_fkey" FOREIGN KEY ("converted_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep existing lead notes as the first entry of each lead's history.
INSERT INTO "LeadActivity" ("id", "lead_id", "kind", "text", "created_at")
SELECT gen_random_uuid()::text, "id", 'note', "notes", "updated_at" FROM "Lead" WHERE "notes" <> '';
