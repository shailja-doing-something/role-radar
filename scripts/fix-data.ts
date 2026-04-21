/**
 * scripts/fix-data.ts
 * One-time data repair script. Run with: npx tsx scripts/fix-data.ts
 *
 * 1. Adds isPriorityAccount column to JobPosting if missing
 * 2. Backfills valid state codes in location field
 * 3. Re-normalizes "Real Estate Agent" postings with updated prompt
 * 4. Deletes all stale Pattern records
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { generateJSON } from "../lib/gemini";

const pool    = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

const STATE_NAMES: Record<string, string> = {
  "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA",
  "colorado":"CO","connecticut":"CT","delaware":"DE","florida":"FL","georgia":"GA",
  "hawaii":"HI","idaho":"ID","illinois":"IL","indiana":"IN","iowa":"IA","kansas":"KS",
  "kentucky":"KY","louisiana":"LA","maine":"ME","maryland":"MD","massachusetts":"MA",
  "michigan":"MI","minnesota":"MN","mississippi":"MS","missouri":"MO","montana":"MT",
  "nebraska":"NE","nevada":"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM",
  "new york":"NY","north carolina":"NC","north dakota":"ND","ohio":"OH","oklahoma":"OK",
  "oregon":"OR","pennsylvania":"PA","rhode island":"RI","south carolina":"SC",
  "south dakota":"SD","tennessee":"TN","texas":"TX","utah":"UT","vermont":"VT",
  "virginia":"VA","washington":"WA","west virginia":"WV","wisconsin":"WI","wyoming":"WY",
  "district of columbia":"DC",
};

const FIXED_ROLES = [
  "Real Estate Agent","Buyer Agent","Transaction Coordinator","Inside Sales Agent",
  "Real Estate Operations Manager","Listing Coordinator","Real Estate Marketing Manager",
  "Showing Agent","Real Estate Administrative Assistant","Real Estate Team Lead",
];

function extractStateCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (US_STATES.has(s.toUpperCase())) return s.toUpperCase();
  const lower = s.toLowerCase();
  if (STATE_NAMES[lower]) return STATE_NAMES[lower];
  const m = s.match(/,\s*([A-Za-z]{2})\s*(?:\d{5})?$/);
  if (m && US_STATES.has(m[1].toUpperCase())) return m[1].toUpperCase();
  return null;
}

async function step1AddColumn() {
  console.log("\n── Step 1: Add isPriorityAccount column if missing ──────────────────");
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE "JobPosting"
      ADD COLUMN IF NOT EXISTS "isPriorityAccount" BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("  ✓ isPriorityAccount column ensured");
  } catch (e) {
    console.warn("  ⚠ Column add error (may already exist):", e instanceof Error ? e.message : e);
  } finally {
    client.release();
  }
}

async function step2BackfillState() {
  console.log("\n── Step 2: Backfill state in location field ─────────────────────────");

  // Find postings where state portion is missing or invalid
  const postings = await prisma.jobPosting.findMany({
    where: {
      OR: [
        { location: { endsWith: ", US" } },
        { location: { contains: ", US " } },
      ],
    },
    select: { id: true, location: true },
  });

  console.log(`  Found ${postings.length} postings with ", US" in location`);

  let updated = 0;
  let stillInvalid = 0;

  for (const p of postings) {
    if (!p.location) continue;
    // Try to extract a real state from the location
    // "Houston, US" → try the part before ", US"
    const cityPart = p.location.replace(/,\s*US\s*$/i, "").trim();
    const stateCode = extractStateCode(cityPart);

    if (stateCode) {
      // We got lucky (city happens to be a valid state code or name)
      await prisma.jobPosting.update({
        where: { id: p.id },
        data:  { location: `${cityPart}, ${stateCode}` },
      });
      updated++;
    } else {
      // Remove the invalid ", US" suffix — better to have just city than "City, US"
      await prisma.jobPosting.update({
        where: { id: p.id },
        data:  { location: cityPart || null },
      });
      stillInvalid++;
    }
  }

  console.log(`  Updated: ${updated} | Still no valid state: ${stillInvalid}`);
}

async function step3ReNormalize() {
  console.log("\n── Step 3: Re-normalize 'Real Estate Agent' postings ────────────────");

  const postings = await prisma.jobPosting.findMany({
    where:  { title: "Real Estate Agent" },
    select: { id: true, title: true, description: true },
  });

  console.log(`  Found ${postings.length} postings with title "Real Estate Agent"`);

  let reNormalized = 0;
  let kept = 0;
  const BATCH = 10;

  for (let i = 0; i < postings.length; i += BATCH) {
    const batch = postings.slice(i, i + BATCH);
    try {
      const inputs = batch.map((p) => ({
        title: p.title,
        desc:  (p.description ?? "").slice(0, 150),
      }));
      const results = await generateJSON<{ normalizedRole: string; confidence: number }[]>(
        `Map each real estate job title to the MOST SPECIFIC match from this list:\n` +
        `${FIXED_ROLES.join(", ")}\n\n` +
        `Rules:\n` +
        `- Generic "Real Estate Agent" or "Realtor" → "Buyer Agent" if description mentions buyers; ` +
        `"Showing Agent" if mentions showing homes; "Real Estate Agent" only if truly generic.\n` +
        `- "ISA", "Inside Sales", "Lead Conversion" → always "Inside Sales Agent".\n` +
        `- "TC", "Transaction Coordinator" → always "Transaction Coordinator".\n` +
        `- Never return an empty string.\n\n` +
        `Inputs: ${JSON.stringify(inputs)}\n\n` +
        `Respond with a JSON array in the same order. Each item: { normalizedRole: string, confidence: number }\n` +
        `No markdown, no backticks.`
      );

      for (let j = 0; j < batch.length; j++) {
        const res = Array.isArray(results) ? results[j] : null;
        if (res && res.confidence > 0.7 && res.normalizedRole && res.normalizedRole !== "Real Estate Agent") {
          await prisma.jobPosting.update({
            where: { id: batch[j].id },
            data:  { title: res.normalizedRole },
          });
          reNormalized++;
        } else {
          kept++;
        }
      }
    } catch (e) {
      console.warn(`  ⚠ Batch ${i}-${i + BATCH} failed:`, e instanceof Error ? e.message : e);
      kept += batch.length;
    }

    // Rate limit Gemini
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`  Re-normalized: ${reNormalized} | Kept as Real Estate Agent: ${kept}`);
}

async function step4DeletePatterns() {
  console.log("\n── Step 4: Delete stale Pattern records ─────────────────────────────");
  const { count } = await prisma.pattern.deleteMany({});
  console.log(`  Deleted ${count} Pattern records — run Refresh Analysis to regenerate`);
}

async function main() {
  console.log("[fix-data] Starting data repair\n");

  await step1AddColumn();
  await step2BackfillState();
  await step3ReNormalize();
  await step4DeletePatterns();

  // Final validation
  const [total, active, top100, priority, patterns] = await Promise.all([
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobPosting.count({ where: { isTop100: true } }),
    prisma.jobPosting.count({ where: { isPriorityAccount: true } }),
    prisma.pattern.count(),
  ]);
  console.log("\n── Final validation ──────────────────────────────────────────────────");
  console.log(`  JobPostings total: ${total} | active: ${active} | isTop100: ${top100} | isPriorityAccount: ${priority}`);
  console.log(`  Pattern records:   ${patterns} (should be 0 — regenerate via Refresh Analysis)`);
  console.log("\n[fix-data] Done");
}

main()
  .catch((e) => { console.error("[fix-data] Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
