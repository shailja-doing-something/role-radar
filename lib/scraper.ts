import { prisma } from "@/lib/prisma";
import { generateJSON, generateJSONWithSearch } from "@/lib/gemini";

interface ScrapedPosting {
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  description?: string;
  salary?: string;
  postedAt?: string;
}

// ── Hacker News Jobs ────────────────────────────────────────────────────────

async function scrapeHN(): Promise<ScrapedPosting[]> {
  const res = await fetch(
    "https://hacker-news.firebaseio.com/v0/jobstories.json",
    { next: { revalidate: 0 } }
  );
  const ids: number[] = await res.json();

  const results = await Promise.allSettled(
    ids.slice(0, 30).map(async (id) => {
      const r = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      const item = await r.json();
      if (!item?.title) return null;
      return {
        title: item.title,
        company: item.by ?? "Unknown",
        url: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
        description: item.text ?? undefined,
        postedAt: item.time
          ? new Date(item.time * 1000).toISOString()
          : undefined,
      } satisfies ScrapedPosting;
    })
  );

  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<ScrapedPosting>).value);
}

// ── RemoteOK ─────────────────────────────────────────────────────────────────

async function scrapeRemoteOK(): Promise<ScrapedPosting[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "RoleRadar/1.0 (+https://github.com)" },
    next: { revalidate: 0 },
  });
  const data: unknown[] = await res.json();
  const jobs = data.slice(1) as Record<string, string>[];

  return jobs.slice(0, 50).map((job) => ({
    title: job.position ?? job.title ?? "Untitled",
    company: job.company ?? "Unknown",
    location: "Remote",
    remote: true,
    url: job.url ?? `https://remoteok.com/remote-jobs/${job.id}`,
    description: job.description ?? undefined,
    salary: job.salary ?? undefined,
    postedAt: job.date ? new Date(job.date).toISOString() : undefined,
  }));
}

// ── Remotive ─────────────────────────────────────────────────────────────────

async function scrapeRemotive(): Promise<ScrapedPosting[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs?limit=100", {
    headers: { "User-Agent": "RoleRadar/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json() as { jobs: Record<string, string>[] };

  return data.jobs.map((job) => ({
    title: job.title ?? "Untitled",
    company: job.company_name ?? "Unknown",
    location: job.candidate_required_location || "Remote",
    remote: true,
    url: job.url,
    description: job.description
      ? job.description.replace(/<[^>]*>/g, " ").slice(0, 2000)
      : undefined,
    salary: job.salary || undefined,
    postedAt: job.publication_date
      ? new Date(job.publication_date).toISOString()
      : undefined,
  }));
}

// ── Arbeitnow ────────────────────────────────────────────────────────────────

async function scrapeArbeitnow(): Promise<ScrapedPosting[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { "User-Agent": "RoleRadar/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json() as { data: Record<string, unknown>[] };

  return data.data.slice(0, 100).map((job) => ({
    title: String(job.title ?? "Untitled"),
    company: String(job.company_name ?? "Unknown"),
    location: String(job.location ?? ""),
    remote: Boolean(job.remote),
    url: String(job.url),
    description: job.description
      ? String(job.description).replace(/<[^>]*>/g, " ").slice(0, 2000)
      : undefined,
    postedAt: job.created_at
      ? new Date(Number(job.created_at) * 1000).toISOString()
      : undefined,
  }));
}

// ── Real-estate role taxonomy ─────────────────────────────────────────────────
// These are the roles searched on every active board during each scrape cycle.

const FIXED_ROLES = [
  "Real Estate Agent",
  "Buyer Agent",
  "Transaction Coordinator",
  "Inside Sales Agent",
  "Real Estate Operations Manager",
  "Listing Coordinator",
  "Real Estate Marketing Manager",
  "Showing Agent",
];

// ── Gemini web-search powered extractor ──────────────────────────────────────
// Replaces the old HTML-fetch approach. For each board × role combination,
// Gemini searches the web (Google Search grounding) for current job postings
// and returns structured data. This works for JS-rendered boards like LinkedIn
// and Indeed where raw HTML contains no job listings.

async function scrapeWithSearch(
  board: { name: string; slug: string; baseUrl: string }
): Promise<ScrapedPosting[]> {
  const allPostings: ScrapedPosting[] = [];
  const seenUrls = new Set<string>();
  let isFirstCombo = true;

  console.log(
    `[Scraper] Starting board "${board.name}" — will search ${FIXED_ROLES.length} roles: ${FIXED_ROLES.join(", ")}`
  );

  for (const role of FIXED_ROLES) {
    console.log(`[Scraper] Board "${board.name}" × role "${role}": searching...`);

    const prompt = `Use Google Search to find current "${role}" job postings on ${board.name} (${board.baseUrl}).

Search for active listings posted within the last 90 days on that specific job board.
For each job posting you find, extract:
- title: exact job title (string, required)
- company: company or real estate team name (string, required)
- url: direct absolute link to that job posting — must start with http (string, required)
- location: city and state, or "Remote" (string)
- remote: true if remote, false otherwise (boolean)
- salary: salary or range if shown (string, optional)
- description: 1–2 sentence summary of the role (string, optional)

Return only a raw JSON array of job posting objects. No markdown, no code fences, no explanation.
Return [] if no real estate job postings are found on ${board.name}.`;

    try {
      const postings = await generateJSONWithSearch<ScrapedPosting>(
        prompt,
        isFirstCombo ? `${board.name} × "${role}"` : undefined
      );
      isFirstCombo = false;

      let addedThisRole = 0;
      for (const p of postings) {
        if (p?.url && !seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          allPostings.push(p as ScrapedPosting);
          addedThisRole++;
        }
      }

      console.log(
        `[Scraper] Board "${board.name}" × role "${role}": ${postings.length} returned by Gemini, ${addedThisRole} new after cross-role dedup`
      );
    } catch (e) {
      console.error(
        `[Scraper] Board "${board.name}" × role "${role}" FAILED: ${e instanceof Error ? e.message : e}`
      );
    }

    // Pause between Gemini calls to stay within rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(
    `[Scraper] Board "${board.name}" done — ${allPostings.length} unique postings across all ${FIXED_ROLES.length} roles`
  );
  return allPostings;
}

// ── Shared fetch + upsert logic ───────────────────────────────────────────────

// Auto-disable after this many consecutive scrapes where the API returned nothing.
// Duplicate-only runs (source works but all jobs already saved) do NOT count as failures.
const AUTO_DISABLE_THRESHOLD = 5;

// Health-check backoff: 6h base, doubles per extra failure beyond threshold, caps at 1 week.
function healthCheckBackoffMs(consecutiveFailures: number): number {
  const extra = Math.max(0, consecutiveFailures - AUTO_DISABLE_THRESHOLD);
  const hours = 6 * Math.pow(2, extra);
  return Math.min(hours, 168) * 60 * 60 * 1000;
}

async function fetchPostings(board: { slug: string; name: string; baseUrl: string }): Promise<ScrapedPosting[]> {
  // Legacy API-based scrapers kept for if those slugs are ever re-added
  if (board.slug === "hn")        return scrapeHN();
  if (board.slug === "remoteok")  return scrapeRemoteOK();
  if (board.slug === "remotive")  return scrapeRemotive();
  if (board.slug === "arbeitnow") return scrapeArbeitnow();
  // All real-estate boards use Gemini web search × FIXED_ROLES
  return scrapeWithSearch(board);
}

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
          title: posting.title,
          company: posting.company,
          location: posting.location ?? null,
          remote: posting.remote ?? false,
          url: posting.url,
          source: sourceSlug,
          description: posting.description ?? null,
          salary: posting.salary ?? null,
          postedAt: posting.postedAt ? new Date(posting.postedAt) : null,
        },
        update: { title: posting.title, company: posting.company },
      });
      saved++;
    } catch {
      skippedDuplicate++;
    }
  }

  console.log(
    `[Scraper] upsert [${sourceSlug}]: ${postings.length} attempted → ${saved} saved, ${skippedIncomplete} incomplete, ${skippedDuplicate} constraint errors`
  );
  return saved;
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export async function scrapeBoard(boardSlug: string): Promise<number> {
  const board = await prisma.jobBoard.findUnique({ where: { slug: boardSlug } });
  if (!board || !board.active) return 0;

  let postings: ScrapedPosting[] = [];

  try {
    postings = await fetchPostings(board);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Scraper] Failed to scrape ${board.name}:`, msg);

    const failures = board.consecutiveFailures + 1;
    const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;

    await prisma.jobBoard.update({
      where: { slug: boardSlug },
      data: {
        lastScraped: new Date(),
        lastScrapedCount: 0,
        lastError: msg,
        consecutiveFailures: failures,
        ...(shouldDisable ? { active: false } : {}),
      },
    });

    if (shouldDisable) {
      console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive failures.`);
    }
    return 0;
  }

  // Source returned nothing — real failure, increment counter
  if (postings.length === 0) {
    const failures = board.consecutiveFailures + 1;
    const shouldDisable = failures >= AUTO_DISABLE_THRESHOLD;

    await prisma.jobBoard.update({
      where: { slug: boardSlug },
      data: {
        lastScraped: new Date(),
        lastScrapedCount: 0,
        lastError: null,
        consecutiveFailures: failures,
        ...(shouldDisable ? { active: false } : {}),
      },
    });

    if (shouldDisable) {
      console.warn(`[Scraper] Auto-disabled ${board.name} after ${failures} consecutive empty responses.`);
    }
    return 0;
  }

  // Source is reachable and returned jobs — success regardless of how many are new
  const saved = await upsertPostings(postings, board.slug);

  await prisma.jobBoard.update({
    where: { slug: boardSlug },
    data: {
      lastScraped: new Date(),
      lastScrapedCount: saved,
      lastError: null,
      consecutiveFailures: 0,
    },
  });

  console.log(`[Scraper] ${board.name}: saved ${saved}/${postings.length} postings`);
  return saved;
}

// ── Health-check for disabled sources ────────────────────────────────────────
// Runs after each scrape cycle. Uses exponential backoff so long-dead sources
// are checked less frequently over time (6h → 12h → 24h … up to 1 week).

export async function healthCheckDisabled(): Promise<void> {
  const disabled = await prisma.jobBoard.findMany({ where: { active: false } });
  const now = Date.now();

  for (const board of disabled) {
    // Skip if we checked too recently (backoff based on failure depth)
    if (board.lastScraped) {
      const backoff = healthCheckBackoffMs(board.consecutiveFailures);
      if (now - board.lastScraped.getTime() < backoff) continue;
    }

    try {
      const postings = await fetchPostings(board);

      if (postings.length === 0) {
        // Still returning nothing — record the check, deepen backoff
        await prisma.jobBoard.update({
          where: { slug: board.slug },
          data: {
            lastScraped: new Date(),
            consecutiveFailures: board.consecutiveFailures + 1,
          },
        });
        continue;
      }

      // Source is producing results — re-enable it
      const saved = await upsertPostings(postings, board.slug);
      await prisma.jobBoard.update({
        where: { slug: board.slug },
        data: {
          active: true,
          lastScraped: new Date(),
          lastScrapedCount: saved,
          lastError: null,
          consecutiveFailures: 0,
        },
      });
      console.log(`[Scraper] Auto-re-enabled ${board.name} (${postings.length} jobs fetched, ${saved} new).`);
    } catch {
      // Still broken — deepen backoff
      await prisma.jobBoard.update({
        where: { slug: board.slug },
        data: {
          lastScraped: new Date(),
          consecutiveFailures: board.consecutiveFailures + 1,
        },
      });
    }
  }
}

export async function scrapeAll(): Promise<void> {
  const boards = await prisma.jobBoard.findMany({ where: { active: true } });
  for (const board of boards) {
    await scrapeBoard(board.slug);
  }
}
