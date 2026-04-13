-- CreateTable
CREATE TABLE "Top100Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brokerage" TEXT,
    "location" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Top100Team_pkey" PRIMARY KEY ("id")
);
