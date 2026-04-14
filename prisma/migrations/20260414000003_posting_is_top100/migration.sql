-- Add isTop100 flag to JobPosting (existing rows default false)
ALTER TABLE "JobPosting" ADD COLUMN "isTop100" BOOLEAN NOT NULL DEFAULT false;
