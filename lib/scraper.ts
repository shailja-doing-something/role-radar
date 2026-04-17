import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FIXED_ROLES = [
  "Real Estate Agent",
  "Buyer Agent",
  "Transaction Coordinator",
  "Inside Sales Agent",
  "Real Estate Operations Manager",
  "Listing Coordinator",
  "Real Estate Marketing Manager",
  "Showing Agent",
  "Real Estate Administrative Assistant",
  "Real Estate Team Lead",
];

const ISA_QUERIES = [
  "Inside Sales Agent ISA real estate team USA",
  "ISA real estate brokerage hiring USA",
  "Lead Conversion Specialist real estate team USA",
  "Real Estate Inside Sales Manager USA",
  "Transaction Coordinator real estate team USA",
];

const PUBLISHER_TO_SLUG: Record<string, string> = {
  LinkedIn:     "linkedin",
  Indeed:       "indeed",
  ZipRecruiter: "ziprecruiter",
  Glassdoor:    "glassdoor",
};

function publisherToSlug(publisher: string): string {
  return PUBLISHER_TO_SLUG[publisher] ?? "indeed";
}

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

// Words stripped from both sides before fuzzy-matching team names
const STRIP_WORDS = new Set([
  "team","group","realty","real","estate","properties","homes",
  "brokerage","associates","llc","inc",
]);

const AUTO_DISABLE_THRESHOLD = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface JSearchJob {
  employer_name:              string;
  job_publisher:              string;
  job_title:                  string;
  job_apply_link:             string;
  job_description?:           string;
  job_is_remote:              boolean;
  job_posted_at_datetime_utc?: string;
  job_city?:                  string;
  job_state?:                 string;
  job_min_salary?:            number;
  job_max_salary?:            number;
  job_salary_period?:         string;
}

interface JSearchResponse {
  status: string;
  data:   JSearchJob[];
}

// Collected posting before Phase 3 normalization
interface RawPosting {
  rawTitle:     string;
  company:      string;
  location?:    string;
  remote?:      boolean;
  url:          string;
  description?: string;
  salary?:      string;
  postedAt?:    string;
  source:       string;   // board slug
  isTop100:     boolean;
}

// After Phase 3: title is the normalized taxonomy role
interface ScrapedPosting extends RawPosting {
  title: string;
}

interface NormResult {
  normalizedRole: string;
  confidence:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function formatSalary(job: JSearchJob): string | undefined {
  const period = job.job_salary_period?.toLowerCase() ?? "year";
  if (job.job_min_salary && job.job_max_salary) {
    return `$${job.job_min_salary.toLocaleString()}–$${job.job_max_salary.toLocaleString()} / ${period}`;
  }
  if (job.job_min_salary) return `From $${job.job_min_salary.toLocaleString()}`;
  if (job.job_max_salary) return `Up to $${job.job_max_salary.toLocaleString()}`;
  return undefined;
}

function buildPosting(job: JSearchJob, isTop100: boolean): RawPosting {
  const state    = job.job_state && US_STATES.has(job.job_state) ? job.job_state : undefined;
  const location = [job.job_city, state].filter(Boolean).join(", ") || undefined;
  return {
    rawTitle:    job.job_title,
    company:     job.employer_name,
    location,
    remote:      job.job_is_remote ?? false,
    url:         job.job_apply_link,
    description: job.job_description?.slice(0, 500) ?? undefined,
    salary:      formatSalary(job),
    postedAt:    job.job_posted_at_datetime_utc ?? undefined,
    source:      publisherToSlug(job.job_publisher),
    isTop100,
  };
}

// Strip common real-estate suffixes before name comparison
function stripSuffixes(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !STRIP_WORDS.has(w))
    .join(" ")
    .trim();
}

// Returns true if stripped teamName and stripped employerName overlap
function fuzzyMatch(teamName: string, employerName: string): boolean {
  const a = stripSuffixes(teamName);
  const b = stripSuffixes(employerName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core JSearch fetch — one call, 429 handled with 5 s wait + one retry
// ─────────────────────────────────────────────────────────────────────────────

let totalJSearchCalls = 0; // reset at start of each _scrapeAll

async function fetchJSearch(
  query:   string,
  opts:    { page?: number; numPages?: number } = {},
): Promise<JSearchJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) throw new Error("JSEARCH_API_KEY not set");

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query",     query);
  url.searchParams.set("page",      String(opts.page    ?? 1));
  url.searchParams.set("num_pages", String(opts.numPages ?? 1));
  url.searchParams.set("country",   "us");

  const doFetch = () =>
    fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        "X-RapidAPI-Key":  apiKey,
      },
    });

  totalJSearchCalls++;
  let res: Response;
  try {
    res = await doFetch();
  } catch (e) {
    throw new Error(`JSearch network error: ${e instanceof Error ? e.message : e}`);
  }

  if (res.status === 429) {
    console.warn(`[JSearch] 429 for "${query}" — waiting 5 s and retrying`);
    await sleep(5000);
    totalJSearchCalls++;
    try { res = await doFetch(); } catch (e) {
      throw new Error(`JSearch retry failed: ${e instanceof Error ? e.message : e}`);
    }
    if (res.status === 429) {
      throw new Error("JSearch still rate-limited after retry");
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JSearch ${res.status}: ${body.slice(0, 200)}`);
  }

  let parsed: JSearchResponse;
  try {
    parsed = await res.json() as JSearchResponse;
  } catch {
    throw new Error("JSearch returned non-JSON response");
  }

  return Array.isArray(parsed?.data) ? parsed.data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Target Account Search
// One JSearch call per Top100Team; keep only results that fuzzy-match the team.
// ─────────────────────────────────────────────────────────────────────────────

async function phase1TargetAccounts(): Promise<RawPosting[]> {
  const teams = await prisma.top100Team.findMany({ select: { name: true } });
  if (teams.length === 0) {
    console.log("[Phase1] No Top100 teams found — skipping");
    return [];
  }

  const all: RawPosting[]         = [];
  let   totalCollected            = 0;
  let   totalMatched              = 0;
  const zeroResultTeams: string[] = [];

  for (const { name } of teams) {
    let jobs: JSearchJob[];
    try {
      jobs = await fetchJSearch(`${name} real estate jobs`, { numPages: 1 });
    } catch (e) {
      const msg   = e instanceof Error ? e.message : String(e);
      const label = msg.includes("rate-limited") ? "rate limited" : msg;
      console.warn(`[Phase1] "${name}" skipped — ${label}`);
      await sleep(500);
      continue;
    }

    totalCollected += jobs.length;
    const matched   = jobs.filter(j => fuzzyMatch(name, j.employer_name));

    if (matched.length === 0) {
      zeroResultTeams.push(name);
    } else {
      totalMatched += matched.length;
      all.push(...matched.map(j => buildPosting(j, true)));
    }

    await sleep(500);
  }

  const zeroMsg = zeroResultTeams.length > 0
    ? `, ${zeroResultTeams.length} teams with 0 results: ${
        zeroResultTeams.slice(0, 10).join(", ")
      }${zeroResultTeams.length > 10 ? " …" : ""}`
    : "";
  console.log(
    `[Phase1] ${teams.length} teams searched, ${totalCollected} collected, ` +
    `${totalMatched} matched by name${zeroMsg}`
  );

  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — ISA Signal Search (5 fixed queries, Gemini filter per batch)
// ─────────────────────────────────────────────────────────────────────────────

async function phase2ISASearch(): Promise<RawPosting[]> {
  const all: RawPosting[] = [];
  let   totalCollected    = 0;

  for (const query of ISA_QUERIES) {
    let jobs: JSearchJob[];
    try {
      jobs = await fetchJSearch(query, { numPages: 1 });
    } catch (e) {
      console.warn(`[Phase2] skipped "${query}" — ${e instanceof Error ? e.message : e}`);
      await sleep(500);
      continue;
    }

    totalCollected += jobs.length;
    if (jobs.length === 0) { await sleep(500); continue; }

    // Gemini filters this batch's employer names to real-estate companies only
    const companies = [...new Set(jobs.map(j => j.employer_name))];
    let   keepSet: Set<string>;
    try {
      const toKeep = await generateJSON<string[]>(
        `From this list of company names, return only those that are clearly real estate teams, ` +
        `brokerages, or agencies — not staffing firms, tech companies, or unrelated businesses.\n\n` +
        `Companies: ${JSON.stringify(companies)}\n\n` +
        `Respond with a JSON array of company names to KEEP. No markdown, no backticks.`
      );
      keepSet = new Set(toKeep);
    } catch {
      console.warn("[Phase2] Gemini filter failed — keeping all companies for this batch");
      keepSet = new Set(companies);
    }

    for (const job of jobs) {
      if (keepSet.has(job.employer_name)) {
        all.push(buildPosting(job, false));
      }
    }

    await sleep(500);
  }

  console.log(
    `[Phase2] 5 ISA/signal searches, ${totalCollected} raw collected, ` +
    `${all.length} postings after Gemini filter`
  );
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Role Normalization (Gemini, 10 per batch)
// Maps raw job titles → nearest FIXED_ROLES entry (or "Other: …")
// ─────────────────────────────────────────────────────────────────────────────

async function phase3Normalize(postings: RawPosting[]): Promise<ScrapedPosting[]> {
  if (postings.length === 0) return [];

  const BATCH_SIZE       = 10;
  const rawTitles        = postings.map(p => p.rawTitle);
  const normalized: string[] = [];
  let   batchCount       = 0;

  for (let i = 0; i < rawTitles.length; i += BATCH_SIZE) {
    const batch = rawTitles.slice(i, i + BATCH_SIZE);
    batchCount++;
    try {
      const results = await generateJSON<NormResult[]>(
        `Map each of these real estate job titles to the closest match from this list:\n` +
        `${FIXED_ROLES.join(", ")}\n` +
        `If no match fits, return 'Other: [short label]'.\n\n` +
        `Titles: ${JSON.stringify(batch)}\n\n` +
        `Respond with a JSON array in the same order as input. ` +
        `Each item: { normalizedRole: string, confidence: number }\n` +
        `No markdown, no backticks.`
      );
      if (Array.isArray(results) && results.length === batch.length) {
        normalized.push(...results.map(r => r.normalizedRole ?? batch[0]));
      } else {
        normalized.push(...batch); // fallback: keep raw titles
      }
    } catch {
      normalized.push(...batch); // fallback: keep raw titles
    }
  }

  console.log(`[Phase3] ${batchCount} normalization batches for ${postings.length} postings`);

  return postings.map((p, i) => ({
    ...p,
    title: normalized[i] ?? p.rawTitle,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Upsert postings (dedup by URL; propagate isTop100=true on update)
// ─────────────────────────────────────────────────────────────────────────────

async function upsertPostings(
  postings:   ScrapedPosting[],
  sourceSlug: string,
): Promise<{ created: number; refreshed: number; skipped: number }> {
  // Deduplicate by URL; if same URL appears twice prefer isTop100=true
  const seen = new Map<string, ScrapedPosting>();
  for (const p of postings) {
    if (!p.url || !p.title || !p.company) continue;
    const existing = seen.get(p.url);
    if (!existing || (p.isTop100 && !existing.isTop100)) seen.set(p.url, p);
  }
  const deduped = [...seen.values()];

  let created = 0, refreshed = 0, skipped = 0;

  for (const posting of deduped) {
    try {
      const result = await prisma.jobPosting.upsert({
        where:  { url: posting.url },
        create: {
          title:       posting.title,
          company:     posting.company,
          location:    posting.location    ?? null,
          remote:      posting.remote      ?? false,
          url:         posting.url,
          source:      sourceSlug,
          description: posting.description ?? null,
          salary:      posting.salary      ?? null,
          postedAt:    posting.postedAt    ? new Date(posting.postedAt) : null,
          isActive:    true,
          isTop100:    posting.isTop100,
          scrapedAt:   new Date(),
        },
        update: {
          isActive:  true,
          scrapedAt: new Date(),
          ...(posting.isTop100 ? { isTop100: true } : {}),
        },
        select: { createdAt: true, updatedAt: true },
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        refreshed++;
      }
    } catch (e) {
      console.error(`[Scraper] upsert error for ${posting.url}:`, e instanceof Error ? e.message : e);
      skipped++;
    }
  }

  console.log(
    `[Phase4] [${sourceSlug}]: ${postings.length} in (${deduped.length} unique) → ` +
    `${created} new, ${refreshed} refreshed, ${skipped} skipped`
  );
  return { created, refreshed, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark stale postings inactive (not seen in 30+ days)
// ─────────────────────────────────────────────────────────────────────────────

async function markOldPostingsInactive(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.jobPosting.updateMany({
    where: { scrapedAt: { lt: thirtyDaysAgo }, isActive: true },
    data:  { isActive: false },
  });
  if (result.count > 0) {
    console.log(`[Scraper] Marked ${result.count} postings inactive (not seen in 30+ days)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Top 100 Re-matching
// For any isTop100=false posting, fuzzy-match company against all team names.
// Batch-updates matched postings; flags matched teams with isMatched + matchedName.
// ─────────────────────────────────────────────────────────────────────────────

async function phase5ReMatch(): Promise<void> {
  const [postings, teams] = await Promise.all([
    prisma.jobPosting.findMany({
      where:  { isTop100: false, isActive: true },
      select: { id: true, company: true },
    }),
    prisma.top100Team.findMany({ select: { id: true, name: true } }),
  ]);

  if (teams.length === 0 || postings.length === 0) return;

  const matchedPostingIds: number[]           = [];
  const teamMatches = new Map<number, string>(); // teamId → first matched company

  for (const posting of postings) {
    for (const team of teams) {
      if (fuzzyMatch(team.name, posting.company)) {
        matchedPostingIds.push(posting.id);
        if (!teamMatches.has(team.id)) teamMatches.set(team.id, posting.company);
        break; // one team match per posting
      }
    }
  }

  if (matchedPostingIds.length > 0) {
    await prisma.jobPosting.updateMany({
      where: { id: { in: matchedPostingIds } },
      data:  { isTop100: true },
    });
  }

  for (const [teamId, matchedName] of teamMatches) {
    try {
      await prisma.top100Team.update({
        where: { id: teamId },
        data:  { isMatched: true, matchedName },
      });
    } catch {
      // Columns may not exist yet if migration hasn't been applied to this DB
    }
  }

  console.log(
    `[Phase5] Re-matched ${matchedPostingIds.length} additional postings as isTop100=true` +
    (teamMatches.size > 0 ? `, ${teamMatches.size} teams flagged` : "")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// _scrapeAll — full 5-phase orchestrator
// ─────────────────────────────────────────────────────────────────────────────

async function _scrapeAll(): Promise<void> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey || apiKey === "your_rapidapi_key_here") {
    console.error("[Scraper] JSEARCH_API_KEY is not set — aborting scrape");
    return;
  }

  totalJSearchCalls = 0;
  console.log("[Scraper] scrapeAll starting — Phase 1 (Target Accounts) + Phase 2 (ISA Signal)");

  // ── Phase 1 ────────────────────────────────────────────────────────────────
  const p1 = await phase1TargetAccounts();

  // ── Phase 2 ────────────────────────────────────────────────────────────────
  const p2 = await phase2ISASearch();

  // ── URL dedup across phases (favor isTop100=true) ──────────────────────────
  const urlMap = new Map<string, RawPosting>();
  for (const p of [...p1, ...p2]) {
    if (!p.url) continue;
    const existing = urlMap.get(p.url);
    if (!existing || (p.isTop100 && !existing.isTop100)) urlMap.set(p.url, p);
  }
  const combined = [...urlMap.values()];
  console.log(
    `[Scraper] Combined: ${p1.length} (Phase1) + ${p2.length} (Phase2) → ${combined.length} unique URLs`
  );

  if (combined.length === 0) {
    console.log("[Scraper] 0 combined results — verify JSEARCH_API_KEY and rate limits");
    return;
  }

  // ── Phase 3: Normalize ─────────────────────────────────────────────────────
  const normalized = await phase3Normalize(combined);

  // ── Phase 4: Group by source, upsert, update board stats ──────────────────
  const bySource: Record<string, ScrapedPosting[]> = {};
  for (const p of normalized) {
    (bySource[p.source] ??= []).push(p);
  }
  const sourcesSummary = Object.entries(bySource).map(([s, ps]) => `${s}:${ps.length}`).join(", ");
  console.log(`[Phase4] By source: ${sourcesSummary || "none"}`);

  const activeBoards = await prisma.jobBoard.findMany({ where: { active: true } });
  let totalNew = 0, totalUpdated = 0, totalSkipped = 0;

  for (const board of activeBoards) {
    const postings = bySource[board.slug] ?? [];
    if (postings.length === 0) {
      const failures      = board.consecutiveFailures + 1;
      const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;
      await prisma.jobBoard.update({
        where: { slug: board.slug },
        data: {
          lastScraped:         new Date(),
          lastScrapedCount:    0,
          consecutiveFailures: failures,
          ...(shouldDisable ? { active: false } : {}),
        },
      });
      if (shouldDisable) {
        console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive empty cycles`);
      }
      continue;
    }

    const { created, refreshed, skipped } = await upsertPostings(postings, board.slug);
    totalNew     += created;
    totalUpdated += refreshed;
    totalSkipped += skipped;

    await prisma.jobBoard.update({
      where: { slug: board.slug },
      data: {
        lastScraped:         new Date(),
        lastScrapedCount:    created + refreshed,
        lastError:           null,
        consecutiveFailures: 0,
      },
    });
  }

  await markOldPostingsInactive();

  // ── Phase 5: Re-match Top100 ───────────────────────────────────────────────
  await phase5ReMatch();

  // ── Final log ──────────────────────────────────────────────────────────────
  console.log(
    `[Scraper] Phase 4: ${totalNew} new saved, ${totalUpdated} updated, ${totalSkipped} duplicates skipped`
  );
  console.log(`[Scraper] Total JSearch calls made: ${totalJSearchCalls} (max ${p1.length > 0 ? "96" : "0"} Phase1 + 5 Phase2)`);
  console.log("[Scraper] scrapeAll complete");
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — scrapeAll with concurrency lock
// ─────────────────────────────────────────────────────────────────────────────

let scraperRunning = false;

export function isScraperRunning(): boolean {
  return scraperRunning;
}

export async function scrapeAll(): Promise<void> {
  if (scraperRunning) {
    console.log("[Scraper] scrapeAll already in progress — skipping concurrent call");
    return;
  }
  scraperRunning = true;
  try {
    await _scrapeAll();
  } finally {
    scraperRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// scrapeBoard — manual per-board scrape from Sources page
// Uses FIXED_ROLES (5 queries) for lightweight operation, filtered by board slug.
// ─────────────────────────────────────────────────────────────────────────────

export async function scrapeBoard(boardSlug: string): Promise<number> {
  const board = await prisma.jobBoard.findUnique({ where: { slug: boardSlug } });
  if (!board || !board.active) return 0;

  if (!process.env.JSEARCH_API_KEY) {
    console.error("[scrapeBoard] JSEARCH_API_KEY not set");
    return 0;
  }

  console.log(`[Scraper] Manual scrape: "${board.name}" — querying 5 roles from JSearch...`);

  const rawAll: RawPosting[] = [];
  for (const role of FIXED_ROLES.slice(0, 5)) {
    let jobs: JSearchJob[];
    try {
      jobs = await fetchJSearch(`${role} real estate`, { numPages: 1 });
    } catch { continue; }
    rawAll.push(...jobs.map(j => buildPosting(j, false)));
    await sleep(500);
  }

  const forBoard = rawAll.filter(p => p.source === boardSlug);
  if (forBoard.length === 0) {
    const failures      = board.consecutiveFailures + 1;
    const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;
    await prisma.jobBoard.update({
      where: { slug: boardSlug },
      data:  {
        lastScraped:         new Date(),
        lastScrapedCount:    0,
        consecutiveFailures: failures,
        ...(shouldDisable ? { active: false } : {}),
      },
    });
    return 0;
  }

  const normalized = await phase3Normalize(forBoard);
  const { created, refreshed } = await upsertPostings(normalized, boardSlug);

  await prisma.jobBoard.update({
    where: { slug: boardSlug },
    data:  {
      lastScraped:         new Date(),
      lastScrapedCount:    created + refreshed,
      lastError:           null,
      consecutiveFailures: 0,
    },
  });

  return created + refreshed;
}

// ─────────────────────────────────────────────────────────────────────────────
// healthCheckDisabled — probe disabled boards; re-enable if results appear
// ─────────────────────────────────────────────────────────────────────────────

export async function healthCheckDisabled(): Promise<void> {
  const disabled = await prisma.jobBoard.findMany({ where: { active: false } });
  if (disabled.length === 0) return;

  console.log(`[Scraper] Health checking ${disabled.length} disabled boards (single JSearch probe)...`);

  let probe: JSearchJob[];
  try {
    probe = await fetchJSearch("Real Estate Agent real estate");
  } catch {
    console.log("[Scraper] Health check: probe failed — skipping re-enable logic");
    return;
  }

  if (probe.length === 0) {
    console.log("[Scraper] Health check: probe returned 0 results — skipping re-enable logic");
    return;
  }

  const bySlug: Record<string, RawPosting[]> = {};
  for (const job of probe) {
    const p = buildPosting(job, false);
    (bySlug[p.source] ??= []).push(p);
  }

  for (const board of disabled) {
    const boardPostings = bySlug[board.slug];
    if (!boardPostings?.length) continue;

    const normalized = await phase3Normalize(boardPostings);
    const { created, refreshed } = await upsertPostings(normalized, board.slug);

    await prisma.jobBoard.update({
      where: { slug: board.slug },
      data:  {
        active:              true,
        lastScraped:         new Date(),
        lastScrapedCount:    created + refreshed,
        lastError:           null,
        consecutiveFailures: 0,
      },
    });

    console.log(
      `[Scraper] Auto-re-enabled ${board.name} — ${boardPostings.length} results, ${created + refreshed} saved`
    );
  }
}
