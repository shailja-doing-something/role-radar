import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// active: true  → scraped automatically
// active: false → disabled (anti-bot / requires API key / company-specific URL)
const JOB_BOARDS: {
  name: string;
  slug: string;
  baseUrl: string;
  active: boolean;
}[] = [
  {
    name: "Hacker News",
    slug: "hn",
    baseUrl: "https://hacker-news.firebaseio.com/v0",
    active: true,
  },
  {
    name: "RemoteOK",
    slug: "remoteok",
    baseUrl: "https://remoteok.com/api",
    active: true,
  },
  {
    name: "Remotive",
    slug: "remotive",
    baseUrl: "https://remotive.com/api/remote-jobs",
    active: true,
  },
  {
    name: "Arbeitnow",
    slug: "arbeitnow",
    baseUrl: "https://www.arbeitnow.com/api/job-board-api",
    active: true,
  },
  // Requires auth / blocks scraping — kept for manual config
  {
    name: "LinkedIn",
    slug: "linkedin",
    baseUrl: "https://www.linkedin.com/jobs/search",
    active: false,
  },
  {
    name: "Indeed",
    slug: "indeed",
    baseUrl: "https://www.indeed.com/jobs",
    active: false,
  },
  {
    name: "Greenhouse",
    slug: "greenhouse",
    baseUrl: "https://boards.greenhouse.io",
    active: false,
  },
  {
    name: "Lever",
    slug: "lever",
    baseUrl: "https://jobs.lever.co",
    active: false,
  },
  {
    name: "We Work Remotely",
    slug: "wwr",
    baseUrl: "https://weworkremotely.com",
    active: false,
  },
  {
    name: "AngelList",
    slug: "angellist",
    baseUrl: "https://angel.co/jobs",
    active: false,
  },
];

async function main() {
  console.log("Seeding job boards...");
  for (const board of JOB_BOARDS) {
    await prisma.jobBoard.upsert({
      where: { slug: board.slug },
      create: board,
      update: { name: board.name, baseUrl: board.baseUrl, active: board.active },
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
