/**
 * import-supabase-teams.ts
 *
 * ONE-TIME migration script: reads from Supabase mad.teams (SELECT only),
 * upserts into RoleRadar's own PostgreSQL TargetAccount table.
 *
 * CRITICAL: never writes to Supabase — readonlyQuery enforces this at runtime.
 *
 * Run: npx tsx scripts/import-supabase-teams.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { readonlyQuery } from "../lib/supabase-readonly";

// ── RoleRadar Prisma client ───────────────────────────────────────────────────

const pool    = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ── Types ─────────────────────────────────────────────────────────────────────

interface MadTeamRow {
  id:          string;
  team_name:   string;
  city:        string | null;
  state:       string | null;
  website_url: string | null;
  zillow_url:  string | null;
  brokerage:   string | null;
}

// ── Fuzzy name normalisation (mirrors scraper + supabase-data helpers) ────────

const STRIP = new Set([
  "team","group","realty","real","estate","properties","homes",
  "brokerage","associates","llc","inc","the","and","of","by",
]);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STRIP.has(w))
    .join(" ")
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// ── Query Supabase ────────────────────────────────────────────────────────────

async function fetchSupabaseTeams(): Promise<MadTeamRow[]> {
  // Try mad.brokerages join first; fall back to isa/mktg join if it doesn't exist
  try {
    return await readonlyQuery<MadTeamRow>(`
      SELECT
        t.id,
        t.team_name,
        t.city,
        t.state,
        t.website_url,
        t.zillow_url,
        b.name AS brokerage
      FROM mad.teams t
      LEFT JOIN mad.brokerages b ON t.brokerage_id = b.id
      ORDER BY t.team_name
    `);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("brokerages") || msg.includes("does not exist")) {
      console.log("[import] mad.brokerages not found — using isa/mktg brokerage fallback");
      return readonlyQuery<MadTeamRow>(`
        SELECT
          t.id,
          t.team_name,
          t.city,
          t.state,
          t.website_url,
          t.zillow_url,
          COALESCE(i.brokerage, m.brokerage) AS brokerage
        FROM mad.teams t
        LEFT JOIN mad.isa_teams i           ON t.id = i.team_id
        LEFT JOIN mad.marketing_ops_teams m ON t.id = m.team_id
        ORDER BY t.team_name
      `);
    }
    throw e;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[import] Starting Supabase → TargetAccount import\n");

  // 1. Fetch all teams from Supabase (read-only)
  const supabaseTeams = await fetchSupabaseTeams();
  console.log(`[import] Fetched ${supabaseTeams.length} teams from mad.teams`);

  // 2. Load all existing TargetAccount records
  const existing = await prisma.targetAccount.findMany({
    select: { id: true, teamName: true, supabaseTeamId: true },
  });

  const bySupabaseId = new Map(
    existing.filter(t => t.supabaseTeamId).map(t => [t.supabaseTeamId!, t])
  );
  const byName = existing; // used for fuzzy matching

  let matched = 0;   // updated existing record via supabaseTeamId
  let fuzzy   = 0;   // matched by name, linked supabaseTeamId
  let created = 0;   // new record inserted
  let skipped = 0;   // already up-to-date (supabaseTeamId already set)

  for (const st of supabaseTeams) {
    const location = [st.city, st.state].filter(Boolean).join(", ") || null;

    // Case A: exact supabaseTeamId match — just refresh data
    const exactMatch = bySupabaseId.get(st.id);
    if (exactMatch) {
      await prisma.targetAccount.update({
        where: { id: exactMatch.id },
        data: {
          brokerage:  st.brokerage  ?? null,
          location,
          city:       st.city       ?? null,
          state:      st.state      ?? null,
          website:    st.website_url ?? null,
          zillow_url: st.zillow_url ?? null,
          isPriority: true,
        },
      });
      skipped++;
      continue;
    }

    // Case B: fuzzy name match — link supabaseTeamId and refresh data
    const nameMatch = byName.find(
      t => !t.supabaseTeamId && fuzzyMatch(t.teamName, st.team_name)
    );
    if (nameMatch) {
      await prisma.targetAccount.update({
        where: { id: nameMatch.id },
        data: {
          supabaseTeamId: st.id,
          brokerage:      st.brokerage  ?? null,
          location,
          city:           st.city       ?? null,
          state:          st.state      ?? null,
          website:        st.website_url ?? null,
          zillow_url:     st.zillow_url ?? null,
          isPriority:     true,
        },
      });
      // Mark as matched so later iterations don't double-link
      nameMatch.supabaseTeamId = st.id;
      fuzzy++;
      continue;
    }

    // Case C: no match — create new record
    try {
      await prisma.targetAccount.create({
        data: {
          teamName:             st.team_name,
          supabaseTeamId:       st.id,
          brokerage:            st.brokerage  ?? null,
          location,
          city:                 st.city       ?? null,
          state:                st.state      ?? null,
          website:              st.website_url ?? null,
          zillow_url:           st.zillow_url ?? null,
          isaPresence:          "Unknown",
          marketingOpsPresence: "Unknown",
          isPriority:           true,
        },
      });
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unique constraint")) {
        // teamName collision — try appending city to disambiguate
        try {
          await prisma.targetAccount.create({
            data: {
              teamName:             `${st.team_name} (${st.city ?? st.state ?? st.id.slice(0, 6)})`,
              supabaseTeamId:       st.id,
              brokerage:            st.brokerage  ?? null,
              location,
              city:                 st.city       ?? null,
              state:                st.state      ?? null,
              website:              st.website_url ?? null,
              zillow_url:           st.zillow_url ?? null,
              isaPresence:          "Unknown",
              marketingOpsPresence: "Unknown",
              isPriority:           true,
            },
          });
          created++;
        } catch {
          console.warn(`[import] skipped duplicate: "${st.team_name}" (${st.id})`);
          skipped++;
        }
      } else {
        console.warn(`[import] error for "${st.team_name}": ${msg}`);
        skipped++;
      }
    }
  }

  // 3. Final count
  const total = await prisma.targetAccount.count();
  const priorityCount = await prisma.targetAccount.count({ where: { isPriority: true } });
  const linkedCount   = await prisma.targetAccount.count({ where: { supabaseTeamId: { not: null } } });

  console.log("\n── Results ──────────────────────────────────────────────────────");
  console.log(`  Supabase teams fetched:   ${supabaseTeams.length}`);
  console.log(`  Updated (exact ID match): ${skipped}`);
  console.log(`  Linked (fuzzy name match):${fuzzy}`);
  console.log(`  Created (new records):    ${created}`);
  console.log("─────────────────────────────────────────────────────────────────");
  console.log(`  Total TargetAccount rows: ${total}`);
  console.log(`  isPriority = true:        ${priorityCount}`);
  console.log(`  supabaseTeamId linked:    ${linkedCount}`);
  console.log("─────────────────────────────────────────────────────────────────\n");

  // 4. Sanity checks
  let passed = true;
  if (priorityCount !== total) {
    console.warn(`  ⚠ WARNING: ${total - priorityCount} accounts have isPriority=false`);
    passed = false;
  }
  if (total < 1037) {
    console.warn(`  ⚠ WARNING: fewer than 1037 accounts (got ${total})`);
    passed = false;
  }
  if (passed) {
    console.log("  ✓ All sanity checks passed");
  }
}

main()
  .catch((e) => { console.error("[import] Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
