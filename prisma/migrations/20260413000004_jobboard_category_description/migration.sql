-- AlterTable: add category and description to JobBoard
ALTER TABLE "JobBoard" ADD COLUMN "category"    TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "JobBoard" ADD COLUMN "description" TEXT;
