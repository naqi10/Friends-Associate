-- Deleted staff accounts keep their name for history (audit log, payments, leads) but can never sign in.
ALTER TABLE "User" ADD COLUMN "deleted_at" TIMESTAMP(3);
