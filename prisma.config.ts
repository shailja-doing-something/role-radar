import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Only pass datasource when DATABASE_URL is available; otherwise Prisma
  // falls back to the url = env("DATABASE_URL") in schema.prisma.
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
