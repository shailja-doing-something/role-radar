import { prisma } from "@/lib/prisma";
import { generateJSON, generateJSONWithSearch } from "@/lib/gemini";

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

const PUBLISHER_TO_SLUG: Record<string, string> = {
  LinkedIn:     "linkedin",
  Indeed:       "indeed",
  ZipRecruiter: "ziprecruiter",
  Glassdoor:    "glassdoor",
};

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

const STRIP_WORDS = new Set([
  "team","group","realty","real","estate","properties","homes",
  "brokerage","associates","llc","inc",
]);

const ISA_QUERIES = [
  "Inside Sales Agent ISA real estate team USA",
  "ISA real estate brokerage hiring USA",
  "Lead Conversion Specialist real estate team USA",
  "Real Estate Inside Sales Manager USA",
  "Transaction Coordinator real estate team USA",
];

const BROKERAGE_QUERIES = [
  "Search Keller Williams career pages and kw.com for real estate teams currently hiring Inside Sales Agent or ISA roles. Return up to 10 results as a JSON array. Each item: { \"rawTitle\": string, \"company\": string, \"location\": string, \"state\": string, \"sourceUrl\": string, \"postedAt\": string }. No markdown, no backticks.",
  "Search eXp Realty team career pages and expcloud.com for real estate teams currently hiring Inside Sales Agent or ISA roles. Return up to 10 results as a JSON array. Each item: { \"rawTitle\": string, \"company\": string, \"location\": string, \"state\": string, \"sourceUrl\": string, \"postedAt\": string }. No markdown, no backticks.",
  "Search LPT Realty team career pages for real estate teams currently hiring Inside Sales Agent, ISA, or Lead Manager roles. Return up to 10 results as a JSON array. Each item: { \"rawTitle\": string, \"company\": string, \"location\": string, \"state\": string, \"sourceUrl\": string, \"postedAt\": string }. No markdown, no backticks.",
  "Search RE/MAX team career pages and remax.com for real estate teams currently hiring Inside Sales Agent or ISA roles. Return up to 10 results as a JSON array. Each item: { \"rawTitle\": string, \"company\": string, \"location\": string, \"state\": string, \"sourceUrl\": string, \"postedAt\": string }. No markdown, no backticks.",
  "Search Compass and compass.com team pages for real estate teams currently hiring Inside Sales Agent, ISA, or Lead Conversion Specialist roles. Return up to 10 results as a JSON array. Each item: { \"rawTitle\": string, \"company\": string, \"location\": string, \"state\": string, \"sourceUrl\": string, \"postedAt\": string }. No markdown, no backticks.",
];

const AUTO_DISABLE_THRESHOLD = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface JSearchJob {
  employer_name:               string;
  job_publisher:               string;
  job_title:                   string;
  job_apply_link:              string;
  job_description?:            string;
  job_is_remote:               boolean;
  job_posted_at_datetime_utc?: string;
  job_city?:                   string;
  job_state?:                  string;
  job_min_salary?:             number;
  job_max_salary?:             number;
  job_salary_period?:          string;
}

interface JSearchResponse {
  status: string;
  data:   JSearchJob[];
}

interface Layer1Result {
  postings:          RawPosting[];
  rateLimitedCount:  number;
  covered:           number;
  total:             number;
}

interface Layer2Result {
  postings:         RawPosting[];
  rateLimitedCount: number;
}

// Before normalization — rawTitle is the original, title filled by normalizeRoles()
interface RawPosting {
  rawTitle:     string;
  company:      string;
  location?:    string;
  remote?:      boolean;
  url:          string;
  description?: string;
  salary?:      string;
  postedAt?:    string;
  source:       string;
  isTop100:     boolean;
}

interface ScrapedPosting extends RawPosting {
  title: string; // normalized role from normalizeRoles()
}

interface NormResult {
  normalizedRole: string;
  confidence:     number;
}

// Shape returned by Layer 3 / Layer 4 Gemini web-search calls
interface GeminiJobResult {
  rawTitle:   string;
  company:    string;
  location:   string;
  state:      string;
  sourceUrl:  string;
  postedAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics (reset each _scrapeAll run)
// ─────────────────────────────────────────────────────────────────────────────

let totalJSearchCalls = 0;
let totalGeminiCalls  = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function formatSalary(job: JSearchJob): string | undefined {
  const period = job.job_salary_period?.toLowerCase() ?? "year";
  if (job.job_min_salary && job.job_max_salary)
    return `$${job.job_min_salary.toLocaleString()}–$${job.job_max_salary.toLocaleString()} / ${period}`;
  if (job.job_min_salary) return `From $${job.job_min_salary.toLocaleString()}`;
  if (job.job_max_salary) return `Up to $${job.job_max_salary.toLocaleString()}`;
  return undefined;
}

function buildPosting(job: JSearchJob, isTop100: boolean): RawPosting {
  const state    = job.job_state && US_STATES.has(job.job_state) ? job.job_state : "US";
  const location = [job.job_city, state !== "US" ? state : null].filter(Boolean).join(", ") || undefined;
  return {
    rawTitle:    job.job_title,
    company:     job.employer_name,
    location,
    remote:      job.job_is_remote ?? false,
    url:         job.job_apply_link,
    description: job.job_description?.slice(0, 500) ?? undefined,
    salary:      formatSalary(job),
    postedAt:    job.job_posted_at_datetime_utc ?? new Date().toISOString(),
    source:      PUBLISHER_TO_SLUG[job.job_publisher] ?? "indeed",
    isTop100,
  };
}

function stripSuffixes(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !STRIP_WORDS.has(w))
    .join(" ")
    .trim();
}

function fuzzyMatch(teamName: string, companyName: string): boolean {
  const a = stripSuffixes(teamName);
  const b = stripSuffixes(companyName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core JSearch fetch — one API call, 429 → 5 s wait + one retry
// ─────────────────────────────────────────────────────────────────────────────

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

  const doFetch = () => fetch(url.toString(), {
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
    console.warn(`[JSearch] 429 for "${query}" — waiting 15 s and retrying`);
    await sleep(15000);
    totalJSearchCalls++;
    try { res = await doFetch(); } catch (e) {
      throw new Error(`JSearch retry failed: ${e instanceof Error ? e.message : e}`);
    }
    if (res.status === 429) throw new Error("JSearch still rate-limited after retry");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JSearch ${res.status}: ${body.slice(0, 200)}`);
  }

  let parsed: JSearchResponse;
  try { parsed = await res.json() as JSearchResponse; } catch {
    throw new Error("JSearch returned non-JSON response");
  }

  return Array.isArray(parsed?.data) ? parsed.data : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — Named Team Search (one JSearch call per Top100Team)
// ─────────────────────────────────────────────────────────────────────────────

async function layer1NamedTeamSearch(): Promise<Layer1Result> {
  const allTeams = await prisma.top100Team.findMany({ select: { name: true } });
  if (allTeams.length === 0) { console.log("[Layer1] No teams found — skipping"); return { postings: [], rateLimitedCount: 0, covered: 0, total: 0 }; }

  // Shuffle so different teams get covered across runs
  const shuffled = [...allTeams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const batch = shuffled.slice(0, 20);

  const all: RawPosting[]         = [];
  let   totalCollected            = 0;
  let   totalMatched              = 0;
  let   rateLimitedCount          = 0;
  const zeroResultTeams: string[] = [];

  for (const { name } of batch) {
    let jobs: JSearchJob[];
    try {
      jobs = await fetchJSearch(`${name} real estate jobs`, { numPages: 1 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("rate-limited")) {
        console.warn(`[Layer1] "${name}" skipped — rate limited after retry`);
        rateLimitedCount++;
      } else {
        console.warn(`[Layer1] "${name}" skipped — ${msg}`);
      }
      await sleep(2000);
      continue;
    }

    totalCollected += jobs.length;
    const matched = jobs.filter(j => fuzzyMatch(name, j.employer_name));
    if (matched.length === 0) {
      zeroResultTeams.push(name);
    } else {
      totalMatched += matched.length;
      all.push(...matched.map(j => buildPosting(j, true)));
    }
    await sleep(2000);
  }

  const zeroMsg = zeroResultTeams.length > 0
    ? `, ${zeroResultTeams.length} teams with 0 results: ${zeroResultTeams.slice(0, 10).join(", ")}${zeroResultTeams.length > 10 ? " …" : ""}`
    : "";
  console.log(`[Layer1] ${batch.length}/${allTeams.length} teams searched (randomized), ${totalCollected} collected, ${totalMatched} matched${zeroMsg}`);
  return { postings: all, rateLimitedCount, covered: batch.length, total: allTeams.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — ISA Signal Search (5 JSearch calls + Gemini company filter)
// ─────────────────────────────────────────────────────────────────────────────

async function layer2ISASearch(): Promise<Layer2Result> {
  const all: RawPosting[] = [];
  let   totalCollected    = 0;
  let   rateLimitedCount  = 0;

  for (const query of ISA_QUERIES) {
    let jobs: JSearchJob[];
    try {
      jobs = await fetchJSearch(query, { numPages: 1 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("rate-limited")) rateLimitedCount++;
      console.warn(`[Layer2] skipped "${query}" — ${msg}`);
      await sleep(3000);
      continue;
    }

    totalCollected += jobs.length;
    if (jobs.length === 0) { await sleep(3000); continue; }

    const companies = [...new Set(jobs.map(j => j.employer_name))];
    let keepSet: Set<string>;
    try {
      totalGeminiCalls++;
      const toKeep = await generateJSON<string[]>(
        `From this list of company names, return only those that are clearly real estate teams, ` +
        `brokerages, or agencies — not staffing firms, tech companies, or unrelated businesses.\n\n` +
        `Companies: ${JSON.stringify(companies)}\n\n` +
        `Respond with a JSON array of company names to KEEP. No markdown, no backticks.`
      );
      keepSet = new Set(toKeep);
    } catch {
      console.warn("[Layer2] Gemini filter failed — keeping all for this batch");
      keepSet = new Set(companies);
    }

    for (const job of jobs) {
      if (keepSet.has(job.employer_name)) all.push(buildPosting(job, false));
    }
    await sleep(3000);
  }

  console.log(`[Layer2] 5 ISA searches, ${totalCollected} raw, ${all.length} postings after Gemini filter`);
  return { postings: all, rateLimitedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — Website-Direct ISA Search (one Gemini web-search call per team)
// ─────────────────────────────────────────────────────────────────────────────

async function layer3WebsiteSearch(): Promise<RawPosting[]> {
  const teams = await prisma.top100Team.findMany({
    select: { name: true, website: true },
    where:  { website: { not: null } },
  });

  const all: RawPosting[] = [];
  let   found             = 0;

  for (const { name, website } of teams) {
    if (!website) continue;

    const prompt =
      `Search for any current job openings for Inside Sales Agent, ISA, Lead Conversion Specialist, ` +
      `or Inside Sales Manager roles posted on or linked from this real estate team's website: ${website}\n\n` +
      `If any such roles are found, return a JSON array. Each item:\n` +
      `{ "rawTitle": string, "company": "${name}", "location": string, "state": string (2-letter US code), ` +
      `"sourceUrl": string (direct URL to the job posting or careers page), "postedAt": string (ISO date, use today if not shown) }\n\n` +
      `If no relevant roles found, return an empty array [].\n` +
      `No markdown, no backticks.`;

    try {
      totalGeminiCalls++;
      const results = await generateJSONWithSearch<GeminiJobResult[]>(prompt);
      if (!Array.isArray(results) || results.length === 0) {
        await sleep(300);
        continue;
      }
      for (const r of results) {
        if (!r.sourceUrl || !r.rawTitle) continue;
        const location = r.location || (r.state ? r.state : undefined);
        all.push({
          rawTitle:  r.rawTitle,
          company:   r.company || name,
          location,
          remote:    false,
          url:       r.sourceUrl,
          postedAt:  r.postedAt || new Date().toISOString(),
          source:    "website",
          isTop100:  true,
        });
        found++;
      }
    } catch (e) {
      console.warn(`[Layer3] "${name}" website search failed: ${e instanceof Error ? e.message : e}`);
    }

    await sleep(300);
  }

  console.log(`[Layer3] ${teams.length} teams website-searched, ${found} ISA postings found`);
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4 — Brokerage Portal Search (5 Gemini web-search calls)
// ─────────────────────────────────────────────────────────────────────────────

async function layer4BrokerageSearch(): Promise<RawPosting[]> {
  const all: RawPosting[] = [];
  let   found             = 0;

  for (const prompt of BROKERAGE_QUERIES) {
    try {
      totalGeminiCalls++;
      const results = await generateJSONWithSearch<GeminiJobResult[]>(prompt);
      if (!Array.isArray(results)) { await sleep(300); continue; }
      for (const r of results) {
        if (!r.sourceUrl || !r.rawTitle) continue;
        const location = r.location || (r.state ? r.state : undefined);
        all.push({
          rawTitle:  r.rawTitle,
          company:   r.company || "Unknown",
          location,
          remote:    false,
          url:       r.sourceUrl,
          postedAt:  r.postedAt || new Date().toISOString(),
          source:    "brokerage_portal",
          isTop100:  false,
        });
        found++;
      }
    } catch (e) {
      console.warn(`[Layer4] brokerage query failed: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(300);
  }

  console.log(`[Layer4] 5 brokerage searches, ${found} postings found`);
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION — Batch Gemini (10 per call), no web search
// ─────────────────────────────────────────────────────────────────────────────

async function normalizeRoles(postings: RawPosting[]): Promise<ScrapedPosting[]> {
  if (postings.length === 0) return [];

  const BATCH   = 10;
  const rawTitles = postings.map(p => p.rawTitle);
  const normalized: string[] = [];
  let   batchCount = 0;

  for (let i = 0; i < rawTitles.length; i += BATCH) {
    const batch = rawTitles.slice(i, i + BATCH);
    batchCount++;
    try {
      totalGeminiCalls++;
      const results = await generateJSON<NormResult[]>(
        `Map each of these real estate job titles to the closest match from this list:\n` +
        `${FIXED_ROLES.join(", ")}\n` +
        `If no match fits, return 'Other: [short label]'.\n\n` +
        `Titles: ${JSON.stringify(batch)}\n\n` +
        `Respond with a JSON array in the same order. ` +
        `Each item: { normalizedRole: string, confidence: number }\n` +
        `No markdown, no backticks.`
      );
      if (Array.isArray(results) && results.length === batch.length) {
        normalized.push(...results.map(r => r.normalizedRole ?? batch[0]));
      } else {
        normalized.push(...batch);
      }
    } catch {
      normalized.push(...batch);
    }
  }

  console.log(`[Normalize] ${batchCount} batches for ${postings.length} postings`);
  return postings.map((p, i) => ({ ...p, title: normalized[i] ?? p.rawTitle }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE — Upsert with dedup; propagate isTop100=true on update
// ─────────────────────────────────────────────────────────────────────────────

async function upsertPostings(
  postings:   ScrapedPosting[],
  sourceSlug: string,
): Promise<{ created: number; refreshed: number; skipped: number }> {
  // Dedup by URL — prefer isTop100=true on conflict
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
      result.createdAt.getTime() === result.updatedAt.getTime() ? created++ : refreshed++;
    } catch (e) {
      console.error(`[Save] upsert error for ${posting.url}:`, e instanceof Error ? e.message : e);
      skipped++;
    }
  }

  return { created, refreshed, skipped };
}

async function markOldPostingsInactive(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.jobPosting.updateMany({
    where: { scrapedAt: { lt: thirtyDaysAgo }, isActive: true },
    data:  { isActive: false },
  });
  if (result.count > 0) console.log(`[Save] Marked ${result.count} postings inactive (30+ days)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — Top 100 Re-matching (fuzzy, in-memory batch)
// ─────────────────────────────────────────────────────────────────────────────

async function layer5ReMatch(): Promise<number> {
  const [postings, teams] = await Promise.all([
    prisma.jobPosting.findMany({
      where:  { isTop100: false, isActive: true },
      select: { id: true, company: true },
    }),
    prisma.top100Team.findMany({ select: { id: true, name: true } }),
  ]);

  if (teams.length === 0 || postings.length === 0) return 0;

  const matchedPostingIds: number[]           = [];
  const teamMatches = new Map<number, string>(); // teamId → first matched company

  for (const posting of postings) {
    for (const team of teams) {
      if (fuzzyMatch(team.name, posting.company)) {
        matchedPostingIds.push(posting.id);
        if (!teamMatches.has(team.id)) teamMatches.set(team.id, posting.company);
        break;
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
    } catch { /* fields may not exist on older DB */ }
  }

  console.log(`[Layer5] Top 100 re-matches: ${matchedPostingIds.length} newly flagged`);
  return matchedPostingIds.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// _scrapeAll — full 4-layer orchestrator
// ─────────────────────────────────────────────────────────────────────────────

async function _scrapeAll(skipJSearch = false): Promise<void> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!skipJSearch && (!apiKey || apiKey === "your_rapidapi_key_here")) {
    console.error("[Scraper] JSEARCH_API_KEY is not set — aborting");
    return;
  }

  totalJSearchCalls = 0;
  totalGeminiCalls  = 0;
  const errorsLog: string[] = [];
  const mode = skipJSearch ? "L3+L4 only (Gemini web search)" : "4-layer strategy";
  console.log(`[Scraper] scrapeAll starting — ${mode}`);

  // ── Test call: abort immediately on 429 ───────────────────────────────────
  if (!skipJSearch) {
    let testStatus = 200;
    try {
      const testRes = await fetch(
        "https://jsearch.p.rapidapi.com/search?query=real+estate+jobs&page=1&num_pages=1&country=us",
        { headers: { "X-RapidAPI-Host": "jsearch.p.rapidapi.com", "X-RapidAPI-Key": apiKey! } }
      );
      testStatus = testRes.status;
      totalJSearchCalls++;
    } catch (e) {
      console.warn("[Scraper] Test call network error, proceeding:", e instanceof Error ? e.message : e);
    }
    if (testStatus === 429) {
      const msg = "JSearch quota exhausted or rate limited — scrape aborted. Check RapidAPI dashboard.";
      console.error("[Scraper] ABORTED — JSearch returning 429 on test call. Quota likely exhausted.");
      await prisma.scrapeRun.create({ data: { status: "failed", errors: msg, jsearchCallsUsed: totalJSearchCalls } });
      return;
    }
  }

  // ── Layers 1–4: collect ───────────────────────────────────────────────────
  const l1Result = skipJSearch
    ? { postings: [] as RawPosting[], rateLimitedCount: 0, covered: 0, total: 0 }
    : await layer1NamedTeamSearch();

  errorsLog.push(`Batch: covered ${l1Result.covered} of ${l1Result.total} teams this run (randomized)`);
  for (const name of l1Result.postings.map(() => "").slice(0, 0)) { void name; } // type satisfaction

  // Layer 2 always runs (broad ISA searches cover all teams, not just Layer 1 batch)
  const l2Result = skipJSearch
    ? { postings: [] as RawPosting[], rateLimitedCount: 0 }
    : await layer2ISASearch();

  const l1 = l1Result.postings;
  const l2 = l2Result.postings;
  const l3 = await layer3WebsiteSearch();
  const l4 = await layer4BrokerageSearch();

  // ── URL dedup across all layers (favor isTop100=true on conflict) ─────────
  const urlMap = new Map<string, RawPosting>();
  for (const p of [...l1, ...l2, ...l3, ...l4]) {
    if (!p.url) continue;
    const ex = urlMap.get(p.url);
    if (!ex || (p.isTop100 && !ex.isTop100)) urlMap.set(p.url, p);
  }
  const combined = [...urlMap.values()];
  console.log(
    `[Scraper] Combined: L1=${l1.length} L2=${l2.length} L3=${l3.length} L4=${l4.length}` +
    ` → ${combined.length} unique URLs`
  );

  if (combined.length === 0) {
    console.log("[Scraper] 0 combined results — verify JSEARCH_API_KEY and rate limits");
    return;
  }

  // ── Normalize roles ───────────────────────────────────────────────────────
  const normalized = await normalizeRoles(combined);

  // ── Save: group by source, upsert, update board stats ────────────────────
  const bySource: Record<string, ScrapedPosting[]> = {};
  for (const p of normalized) {
    (bySource[p.source] ??= []).push(p);
  }

  // Load board map for stats update (only boards in DB get their stats updated)
  const boardsInDb = await prisma.jobBoard.findMany({ select: { slug: true, name: true, consecutiveFailures: true } });
  const boardMap   = new Map(boardsInDb.map(b => [b.slug, b]));

  let totalNew = 0, totalUpdated = 0, totalSkipped = 0;

  for (const [slug, postings] of Object.entries(bySource)) {
    const { created, refreshed, skipped } = await upsertPostings(postings, slug);
    totalNew     += created;
    totalUpdated += refreshed;
    totalSkipped += skipped;
    console.log(`[Save] [${slug}]: ${postings.length} in → ${created} new, ${refreshed} updated, ${skipped} skipped`);

    // Update board stats only when the board exists
    const board = boardMap.get(slug);
    if (board) {
      await prisma.jobBoard.update({
        where: { slug },
        data:  {
          lastScraped:         new Date(),
          lastScrapedCount:    created + refreshed,
          lastError:           null,
          consecutiveFailures: 0,
        },
      });
    }
  }

  // Mark boards that got 0 results this cycle
  for (const board of boardsInDb) {
    if (!bySource[board.slug]) {
      const failures      = board.consecutiveFailures + 1;
      const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;
      await prisma.jobBoard.update({
        where: { slug: board.slug },
        data:  {
          lastScraped:         new Date(),
          lastScrapedCount:    0,
          consecutiveFailures: failures,
          ...(shouldDisable ? { active: false } : {}),
        },
      });
      if (shouldDisable) console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive empty cycles`);
    }
  }

  await markOldPostingsInactive();

  // ── Layer 5: re-match ─────────────────────────────────────────────────────
  await layer5ReMatch();

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`[Scraper] Save: ${totalNew} new, ${totalUpdated} updated, ${totalSkipped} duplicates skipped`);
  console.log(`[Scraper] Total JSearch calls: ${totalJSearchCalls}`);
  console.log(`[Scraper] Total Gemini calls:  ${totalGeminiCalls}`);

  const totalRateLimited = l1Result.rateLimitedCount + l2Result.rateLimitedCount;
  const runStatus = totalRateLimited > 0 ? "partial" : "success";
  await prisma.scrapeRun.create({
    data: {
      status:           runStatus,
      errors:           errorsLog.length > 0 ? errorsLog.join("\n") : null,
      jsearchCallsUsed: totalJSearchCalls,
    },
  });
  console.log(`[Scraper] scrapeAll complete — status: ${runStatus}, JSearch calls: ${totalJSearchCalls}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

let scraperRunning = false;

export function isScraperRunning(): boolean { return scraperRunning; }

export async function scrapeAll(skipJSearch = false): Promise<void> {
  if (scraperRunning) {
    console.log("[Scraper] already in progress — skipping concurrent call");
    return;
  }
  scraperRunning = true;
  try { await _scrapeAll(skipJSearch); } finally { scraperRunning = false; }
}

// scrapeBoard: lightweight per-board scrape for the Sources page
export async function scrapeBoard(boardSlug: string): Promise<number> {
  const board = await prisma.jobBoard.findUnique({ where: { slug: boardSlug } });
  if (!board || !board.active) return 0;
  if (!process.env.JSEARCH_API_KEY) { console.error("[scrapeBoard] JSEARCH_API_KEY not set"); return 0; }

  console.log(`[Scraper] Manual scrape: "${board.name}" — 5 role queries`);
  const rawAll: RawPosting[] = [];

  for (const role of FIXED_ROLES.slice(0, 5)) {
    let jobs: JSearchJob[];
    try { jobs = await fetchJSearch(`${role} real estate`, { numPages: 1 }); } catch { continue; }
    rawAll.push(...jobs.map(j => buildPosting(j, false)));
    await sleep(500);
  }

  const forBoard = rawAll.filter(p => p.source === boardSlug);
  if (forBoard.length === 0) {
    const failures      = board.consecutiveFailures + 1;
    const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;
    await prisma.jobBoard.update({
      where: { slug: boardSlug },
      data:  { lastScraped: new Date(), lastScrapedCount: 0, consecutiveFailures: failures, ...(shouldDisable ? { active: false } : {}) },
    });
    return 0;
  }

  const normalized = await normalizeRoles(forBoard);
  const { created, refreshed } = await upsertPostings(normalized, boardSlug);
  await prisma.jobBoard.update({
    where: { slug: boardSlug },
    data:  { lastScraped: new Date(), lastScrapedCount: created + refreshed, lastError: null, consecutiveFailures: 0 },
  });
  return created + refreshed;
}

// healthCheckDisabled: probe disabled boards and re-enable if results appear
export async function healthCheckDisabled(): Promise<void> {
  const disabled = await prisma.jobBoard.findMany({ where: { active: false } });
  if (disabled.length === 0) return;

  console.log(`[Scraper] Health checking ${disabled.length} disabled boards...`);
  let probe: JSearchJob[];
  try { probe = await fetchJSearch("Real Estate Agent real estate"); } catch {
    console.log("[Scraper] Health check probe failed — skipping");
    return;
  }
  if (probe.length === 0) return;

  const bySlug: Record<string, RawPosting[]> = {};
  for (const job of probe) {
    const p = buildPosting(job, false);
    (bySlug[p.source] ??= []).push(p);
  }

  for (const board of disabled) {
    const posts = bySlug[board.slug];
    if (!posts?.length) continue;
    const normalized = await normalizeRoles(posts);
    const { created, refreshed } = await upsertPostings(normalized, board.slug);
    await prisma.jobBoard.update({
      where: { slug: board.slug },
      data:  { active: true, lastScraped: new Date(), lastScrapedCount: created + refreshed, lastError: null, consecutiveFailures: 0 },
    });
    console.log(`[Scraper] Auto-re-enabled ${board.name} — ${created + refreshed} saved`);
  }
}
