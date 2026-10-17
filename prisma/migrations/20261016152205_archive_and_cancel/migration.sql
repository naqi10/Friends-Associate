-- DropIndex
DROP INDEX "Booking_property_id_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancel_reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cancelled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InvestmentOpportunity" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_property_id_idx" ON "Booking"("property_id");

-- One active booking per unit. Cancelled bookings stay as history, so the unit can be booked again.
-- (Partial index: Prisma cannot express it in the schema; a violation still surfaces as P2002.)
CREATE UNIQUE INDEX "Booking_active_property_key" ON "Booking"("property_id") WHERE "status" <> 'Cancelled';
