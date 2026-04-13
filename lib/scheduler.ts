import { scrapeAll } from "@/lib/scraper";
import { prisma } from "@/lib/prisma";
import { analyzePatterns } from "@/lib/roles";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let running = false;

async function runPatternAnalysis() {
  try {
    const postings = await prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { title: true, description: true },
    });
    if (postings.length === 0) return;

    const extracted = await analyzePatterns(postings);
    const period = new Date().toISOString().slice(0, 7);

    for (const pattern of extracted) {
      await prisma.pattern.upsert({
        where: { keyword_period: { keyword: pattern.keyword, period } },
        create: { keyword: pattern.keyword, category: pattern.category, count: pattern.count, period },
        update: { count: pattern.count },
      });
    }
    console.log(`[Scheduler] Pattern analysis: ${extracted.length} patterns updated.`);
  } catch (error) {
    console.error("[Scheduler] Pattern analysis failed:", error);
  }
}

async function tick() {
  if (running) return;
  running = true;
  console.log("[Scheduler] Starting scrape cycle...");
  try {
    await scrapeAll();
    console.log("[Scheduler] Scrape cycle complete. Running pattern analysis...");
    await runPatternAnalysis();
  } catch (error) {
    console.error("[Scheduler] Scrape cycle failed:", error);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  console.log("[Scheduler] Started. Next run in 6 hours.");
  // Run after a short delay on startup to avoid blocking server init
  setTimeout(tick, 5000);
  setInterval(tick, INTERVAL_MS);
}
