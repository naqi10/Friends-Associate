-- Standalone listings (no project) can be booked too.
ALTER TABLE "Booking" ALTER COLUMN "project_id" DROP NOT NULL;
