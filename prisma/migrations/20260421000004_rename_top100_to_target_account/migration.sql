-- Create TargetAccount with the new schema
CREATE TABLE "TargetAccount" (
  "id"                   TEXT         NOT NULL,
  "teamName"             TEXT         NOT NULL,
  "brokerage"            TEXT,
  "location"             TEXT,
  "website"              TEXT,
  "city"                 TEXT,
  "state"                TEXT,
  "zillow_url"           TEXT,
  "supabaseTeamId"       TEXT,
  "isaPresence"          TEXT         NOT NULL DEFAULT 'Unknown',
  "marketingOpsPresence" TEXT         NOT NULL DEFAULT 'Unknown',
  "isMatched"            BOOLEAN      NOT NULL DEFAULT false,
  "matchedName"          TEXT,
  "isPriority"           BOOLEAN      NOT NULL DEFAULT false,
  "uploadedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TargetAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TargetAccount_teamName_key" ON "TargetAccount"("teamName");

-- Copy all existing rows; use gen_random_uuid() as id since cuid() is not available in SQL
INSERT INTO "TargetAccount"
  ("id","teamName","brokerage","location","website","supabaseTeamId",
   "isaPresence","marketingOpsPresence","isMatched","matchedName","isPriority","uploadedAt")
SELECT
  gen_random_uuid()::text,
  "name",
  "brokerage",
  "location",
  "website",
  "supabaseTeamId",
  "isaPresence",
  "marketingOpsPresence",
  "isMatched",
  "matchedName",
  "isPriority",
  "createdAt"
FROM "Top100Team"
ON CONFLICT ("teamName") DO NOTHING;

-- Drop the old table
DROP TABLE "Top100Team";

-- Add isPriorityAccount to JobPosting
ALTER TABLE "JobPosting" ADD COLUMN "isPriorityAccount" BOOLEAN NOT NULL DEFAULT false;
