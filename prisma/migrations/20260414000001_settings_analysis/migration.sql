-- CreateTable: Settings (singleton row, id=1)
CREATE TABLE "Settings" (
    "id"              INTEGER NOT NULL DEFAULT 1,
    "scrapeFrequency" TEXT,
    "emailDigest"     BOOLEAN NOT NULL DEFAULT false,
    "emailRecipients" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Analysis (full Gemini analysis JSON per scrape run)
CREATE TABLE "Analysis" (
    "id"        SERIAL NOT NULL,
    "data"      JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);
