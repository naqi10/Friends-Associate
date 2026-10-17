-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "receipt_no" SERIAL NOT NULL,
    "booking_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_pkr" INTEGER NOT NULL,
    "paid_on" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'received',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_id" TEXT,
    "reversal_reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receipt_no_key" ON "Payment"("receipt_no");

-- CreateIndex
CREATE INDEX "Payment_booking_id_paid_on_idx" ON "Payment"("booking_id", "paid_on");

-- CreateIndex
CREATE INDEX "Payment_user_id_idx" ON "Payment"("user_id");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
