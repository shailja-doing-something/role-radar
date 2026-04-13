import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/gemini";

// ── Shared posting shape ──────────────────────────────────────────────────────

interface ScrapedPosting {
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  description?: string;
  salary?: string;
  postedAt?: string;
  source: string; // board slug, set at collect time
}

// ── Real-estate role taxonomy ─────────────────────────────────────────────────
// One JSearch API call is made per role per scrape cycle.

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

// ── JSearch publisher → our board slug ────────────────────────────────────────

const PUBLISHER_TO_SLUG: Record<string, string> = {
  LinkedIn:     "linkedin",
  Indeed:       "indeed",
  ZipRecruiter: "ziprecruiter",
  Glassdoor:    "glassdoor",
};

function publisherToSlug(publisher: string): string {
  return PUBLISHER_TO_SLUG[publisher] ?? "indeed";
}

// ── US state allowlist ────────────────────────────────────────────────────────

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

// ── JSearch API types ─────────────────────────────────────────────────────────

interface JSearchJob {
  employer_name: string;
  job_publisher: string;
  job_title: string;
  job_apply_link: string;
  job_description?: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_period?: string;
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

function formatSalary(job: JSearchJob): string | undefined {
  const period = job.job_salary_period?.toLowerCase() ?? "year";
  if (job.job_min_salary && job.job_max_salary) {
    return `$${job.job_min_salary.toLocaleString()}–$${job.job_max_salary.toLocaleString()} / ${period}`;
  }
  if (job.job_min_salary) return `From $${job.job_min_salary.toLocaleString()}`;
  if (job.job_max_salary) return `Up to $${job.job_max_salary.toLocaleString()}`;
  return undefined;
}

// ── JSearch single-role fetch ─────────────────────────────────────────────────

async function fetchFromJSearch(role: string): Promise<ScrapedPosting[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey || apiKey === "your_rapidapi_key_here") {
    console.error("[Scraper] JSEARCH_API_KEY is not set — skipping");
    return [];
  }

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query",       `${role} real estate`);
  url.searchParams.set("page",        "1");
  url.searchParams.set("num_pages",   "3");
  url.searchParams.set("date_posted", "week");
  url.searchParams.set("country",     "us");

  const doFetch = () =>
    fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        "X-RapidAPI-Key":  apiKey,
      },
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch (e) {
    console.error(`[Scraper] JSearch network error for "${role}":`, e instanceof Error ? e.message : e);
    return [];
  }

  // 429 — retry once after 2 s
  if (res.status === 429) {
    console.warn(`[Scraper] JSearch 429 for "${role}" — waiting 2s and retrying...`);
    await new Promise(r => setTimeout(r, 2000));
    try { res = await doFetch(); } catch {
      console.error(`[Scraper] JSearch retry failed for "${role}"`);
      return [];
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Scraper] JSearch ${res.status} for "${role}": ${body.slice(0, 200)}`);
    return [];
  }

  let parsed: JSearchResponse;
  try {
    parsed = await res.json() as JSearchResponse;
  } catch {
    console.error(`[Scraper] JSearch non-JSON response for "${role}"`);
    return [];
  }

  if (!Array.isArray(parsed?.data)) {
    console.error(`[Scraper] JSearch unexpected shape for "${role}":`, JSON.stringify(parsed).slice(0, 200));
    return [];
  }

  const rawCount = parsed.data.length;
  const publishers = [...new Set(parsed.data.map(j => j.job_publisher))];
  console.log(`[Scraper] JSearch "${role}": ${rawCount} raw jobs, publishers: ${publishers.join(", ")}`);

  const postings: ScrapedPosting[] = [];

  for (const job of parsed.data) {
    // US filter: skip if country is explicitly non-US, or state is non-US
    if (job.job_country && job.job_country !== "US") continue;
    if (job.job_state && !US_STATES.has(job.job_state))  continue;

    const location = [job.job_city, job.job_state].filter(Boolean).join(", ") || undefined;

    postings.push({
      title:    job.job_title,
      company:  job.employer_name,
      location,
      remote:   job.job_is_remote ?? false,
      url:      job.job_apply_link,
      description: job.job_description?.slice(0, 500) ?? undefined,
      salary:   formatSalary(job),
      postedAt: job.job_posted_at_datetime_utc ?? undefined,
      source:   publisherToSlug(job.job_publisher),
    });
  }

  const filtered = rawCount - postings.length;
  if (filtered > 0) {
    console.log(`[Scraper] JSearch "${role}": ${filtered} dropped by US filter, ${postings.length} kept`);
  }

  return postings;
}

// ── Collect across all FIXED_ROLES ────────────────────────────────────────────

async function collectAllFromJSearch(): Promise<ScrapedPosting[]> {
  if (!process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY === "your_rapidapi_key_here") {
    console.error("[Scraper] JSEARCH_API_KEY missing — aborting collect step");
    return [];
  }

  const all: ScrapedPosting[] = [];

  for (const role of FIXED_ROLES) {
    console.log(`[Scraper] JSearch querying: "${role} real estate team USA"`);
    const results = await fetchFromJSearch(role);
    console.log(`[Scraper] JSearch "${role}": ${results.length} US results`);
    all.push(...results);

    // 500 ms between calls to stay within rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(
    `[Scraper] JSearch collect done — ${all.length} raw postings from ${FIXED_ROLES.length} role queries`
  );
  return all;
}

// ── Gemini: filter to real-estate companies only ──────────────────────────────
// Uses generateJSON (no web search) — Gemini acts as a classifier, not a fetcher.

async function filterRealEstateCompanies(postings: ScrapedPosting[]): Promise<ScrapedPosting[]> {
  if (postings.length === 0) return [];

  const companies = [...new Set(postings.map(p => p.company))];
  console.log(`[Scraper] Gemini filter: evaluating ${companies.length} unique company names...`);

  const prompt = `Given this list of company names from job postings, return only those that are likely real estate teams, brokerages, or real estate agencies. Exclude generic staffing agencies, tech companies, hospitals, retailers, and unrelated businesses.

Companies: ${JSON.stringify(companies)}

Respond with a JSON array of company names to KEEP. No markdown, no backticks.`;

  try {
    const toKeep = await generateJSON<string[]>(prompt);
    const keepSet = new Set(toKeep);
    const filtered = postings.filter(p => keepSet.has(p.company));

    console.log(
      `[Scraper] Gemini filter: ${companies.length} companies → ${toKeep.length} real estate; ` +
      `${postings.length} postings → ${filtered.length} kept`
    );
    return filtered;
  } catch (e) {
    // Fail open — keep everything if Gemini fails, rather than losing all results
    console.error(
      "[Scraper] Gemini company filter failed, keeping all postings:",
      e instanceof Error ? e.message : e
    );
    return postings;
  }
}

// ── Upsert with dedup logging ─────────────────────────────────────────────────

const AUTO_DISABLE_THRESHOLD = 5;

async function upsertPostings(
  postings: ScrapedPosting[],
  sourceSlug: string
): Promise<number> {
  let saved = 0;
  let skippedIncomplete = 0;
  let skippedDuplicate = 0;

  for (const posting of postings) {
    if (!posting.url || !posting.title || !posting.company) {
      skippedIncomplete++;
      continue;
    }
    try {
      await prisma.jobPosting.upsert({
        where: { url: posting.url },
        create: {
          title:    posting.title,
          company:  posting.company,
          location: posting.location  ?? null,
          remote:   posting.remote    ?? false,
          url:      posting.url,
          source:   sourceSlug,
          description: posting.description ?? null,
          salary:   posting.salary    ?? null,
          postedAt: posting.postedAt  ? new Date(posting.postedAt) : null,
        },
        update: { title: posting.title, company: posting.company },
      });
      saved++;
    } catch {
      skippedDuplicate++;
    }
  }

  console.log(
    `[Scraper] upsert [${sourceSlug}]: ${postings.length} attempted → ` +
    `${saved} saved, ${skippedIncomplete} incomplete, ${skippedDuplicate} duplicates`
  );
  return saved;
}

// ── scrapeAll ─────────────────────────────────────────────────────────────────
// Collects from JSearch for all roles, filters with Gemini, upserts per board.

export async function scrapeAll(): Promise<void> {
  console.log(`[Scraper] scrapeAll starting — ${FIXED_ROLES.length} roles × JSearch`);

  // 1. Collect
  const raw = await collectAllFromJSearch();

  if (raw.length === 0) {
    console.log("[Scraper] scrapeAll: 0 raw results — verify JSEARCH_API_KEY and rate limits");
    // Stamp all active boards so lastScraped reflects this cycle ran
    const boards = await prisma.jobBoard.findMany({ where: { active: true } });
    for (const b of boards) {
      await prisma.jobBoard.update({
        where: { slug: b.slug },
        data: { lastScraped: new Date(), lastScrapedCount: 0 },
      });
    }
    return;
  }

  // 2. Real-estate company filter (Gemini, no web search)
  const filtered = await filterRealEstateCompanies(raw);

  // 3. Group by board slug
  const bySource: Record<string, ScrapedPosting[]> = {};
  for (const p of filtered) {
    (bySource[p.source] ??= []).push(p);
  }

  const sourcesSummary = Object.entries(bySource)
    .map(([s, ps]) => `${s}:${ps.length}`)
    .join(", ");
  console.log(`[Scraper] After filter — by source: ${sourcesSummary || "none"}`);

  // 4. Upsert per active board; track failures for boards with no results
  const activeBoards = await prisma.jobBoard.findMany({ where: { active: true } });

  for (const board of activeBoards) {
    const postings = bySource[board.slug] ?? [];

    if (postings.length === 0) {
      const failures = board.consecutiveFailures + 1;
      const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;

      await prisma.jobBoard.update({
        where: { slug: board.slug },
        data: {
          lastScraped:        new Date(),
          lastScrapedCount:   0,
          consecutiveFailures: failures,
          ...(shouldDisable ? { active: false } : {}),
        },
      });

      console.log(
        `[Scraper] ${board.name}: 0 results from JSearch (failures: ${failures}/${AUTO_DISABLE_THRESHOLD})`
      );
      if (shouldDisable) {
        console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive empty cycles`);
      }
      continue;
    }

    const saved = await upsertPostings(postings, board.slug);

    await prisma.jobBoard.update({
      where: { slug: board.slug },
      data: {
        lastScraped:        new Date(),
        lastScrapedCount:   saved,
        lastError:          null,
        consecutiveFailures: 0,
      },
    });

    console.log(`[Scraper] ${board.name}: ${postings.length} found → ${saved} saved`);
  }

  console.log("[Scraper] scrapeAll complete");
}

// ── scrapeBoard ───────────────────────────────────────────────────────────────
// For manual "Scrape Now" from the Sources page. Collects all JSearch results
// then only saves/updates the requested board (JSearch can't filter by publisher).

export async function scrapeBoard(boardSlug: string): Promise<number> {
  const board = await prisma.jobBoard.findUnique({ where: { slug: boardSlug } });
  if (!board || !board.active) return 0;

  console.log(`[Scraper] Manual scrape: "${board.name}" — collecting all roles from JSearch...`);

  const raw      = await collectAllFromJSearch();
  const filtered = await filterRealEstateCompanies(raw);
  const forBoard = filtered.filter(p => p.source === boardSlug);

  console.log(
    `[Scraper] Manual scrape "${board.name}": ${raw.length} raw → ${filtered.length} real-estate → ` +
    `${forBoard.length} for this board`
  );

  if (forBoard.length === 0) {
    const failures    = board.consecutiveFailures + 1;
    const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;

    await prisma.jobBoard.update({
      where: { slug: boardSlug },
      data: {
        lastScraped:        new Date(),
        lastScrapedCount:   0,
        consecutiveFailures: failures,
        ...(shouldDisable ? { active: false } : {}),
      },
    });

    if (shouldDisable) {
      console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive empty cycles`);
    }
    return 0;
  }

  const saved = await upsertPostings(forBoard, boardSlug);

  await prisma.jobBoard.update({
    where: { slug: boardSlug },
    data: {
      lastScraped:        new Date(),
      lastScrapedCount:   saved,
      lastError:          null,
      consecutiveFailures: 0,
    },
  });

  return saved;
}

// ── healthCheckDisabled ───────────────────────────────────────────────────────
// Uses a single lightweight JSearch query (1 API call) to check whether any
// disabled boards are now producing results. Re-enables them if so.

export async function healthCheckDisabled(): Promise<void> {
  const disabled = await prisma.jobBoard.findMany({ where: { active: false } });
  if (disabled.length === 0) return;

  console.log(`[Scraper] Health checking ${disabled.length} disabled boards (single JSearch probe)...`);

  const results = await fetchFromJSearch("Real Estate Agent");
  if (results.length === 0) {
    console.log("[Scraper] Health check: probe returned 0 results — skipping re-enable logic");
    return;
  }

  const bySlug: Record<string, ScrapedPosting[]> = {};
  for (const p of results) {
    (bySlug[p.source] ??= []).push(p);
  }

  for (const board of disabled) {
    const boardResults = bySlug[board.slug];
    if (!boardResults?.length) continue;

    const saved = await upsertPostings(boardResults, board.slug);

    await prisma.jobBoard.update({
      where: { slug: board.slug },
      data: {
        active:             true,
        lastScraped:        new Date(),
        lastScrapedCount:   saved,
        lastError:          null,
        consecutiveFailures: 0,
      },
    });

    console.log(
      `[Scraper] Auto-re-enabled ${board.name} — ${boardResults.length} JSearch results, ${saved} saved`
    );
  }
}
