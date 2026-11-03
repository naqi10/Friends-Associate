-- The office can let a customer change their own password (off by default).
ALTER TABLE "User" ADD COLUMN "can_change_password" BOOLEAN NOT NULL DEFAULT false;
-- Optional product video link.
ALTER TABLE "Product" ADD COLUMN "video_url" TEXT NOT NULL DEFAULT '';
