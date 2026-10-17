-- AlterTable
ALTER TABLE "ContentBlock" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ManagementMember" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "experience" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "photo_path" TEXT NOT NULL DEFAULT '';
