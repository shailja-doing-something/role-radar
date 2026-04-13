-- Add isActive to JobPosting (existing rows default to active)
ALTER TABLE "JobPosting" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
