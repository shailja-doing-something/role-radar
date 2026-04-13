import { scrapeAll } from "@/lib/scraper";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let running = false;

async function tick() {
  if (running) return;
  running = true;
  console.log("[Scheduler] Starting scrape cycle...");
  try {
    await scrapeAll();
    console.log("[Scheduler] Scrape cycle complete.");
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
