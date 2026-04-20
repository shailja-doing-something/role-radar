CREATE TABLE "ScrapeRun" (
  "id"               SERIAL       NOT NULL,
  "status"           TEXT         NOT NULL,
  "errors"           TEXT,
  "jsearchCallsUsed" INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);
