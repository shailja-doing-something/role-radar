import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const JOB_BOARDS = [
  {
    name: "Hacker News",
    slug: "hn",
    baseUrl: "https://hacker-news.firebaseio.com/v0",
  },
  {
    name: "RemoteOK",
    slug: "remoteok",
    baseUrl: "https://remoteok.com/api",
  },
  {
    name: "LinkedIn",
    slug: "linkedin",
    baseUrl: "https://www.linkedin.com/jobs/search",
  },
  {
    name: "Indeed",
    slug: "indeed",
    baseUrl: "https://www.indeed.com/jobs",
  },
  {
    name: "Greenhouse",
    slug: "greenhouse",
    baseUrl: "https://boards.greenhouse.io",
  },
  {
    name: "Lever",
    slug: "lever",
    baseUrl: "https://jobs.lever.co",
  },
  {
    name: "We Work Remotely",
    slug: "wwr",
    baseUrl: "https://weworkremotely.com",
  },
  {
    name: "AngelList",
    slug: "angellist",
    baseUrl: "https://angel.co/jobs",
  },
] as const;

async function main() {
  console.log("Seeding job boards...");
  for (const board of JOB_BOARDS) {
    await prisma.jobBoard.upsert({
      where: { slug: board.slug },
      create: board,
      update: { name: board.name, baseUrl: board.baseUrl },
    });
  }
  console.log(`Seeded ${JOB_BOARDS.length} job boards.`);

  console.log("Seeding admin user...");
  const password = await bcrypt.hash("password", 12);
  await prisma.user.upsert({
    where: { email: "admin@roleradar.local" },
    create: {
      email: "admin@roleradar.local",
      password,
      name: "Admin",
    },
    update: {},
  });
  console.log("Seeded admin user: admin@roleradar.local / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
