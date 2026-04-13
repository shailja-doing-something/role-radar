import { scrapeAll, healthCheckDisabled } from "@/lib/scraper";
import { prisma } from "@/lib/prisma";

// ── Frequency map ─────────────────────────────────────────────────────────────

export const FREQUENCY_MS: Record<string, number> = {
  "6h":    6  * 60 * 60 * 1000,
  "12h":  12  * 60 * 60 * 1000,
  "daily": 24 * 60 * 60 * 1000,
  "weekly": 7 * 24 * 60 * 60 * 1000,
};

export const FREQUENCY_LABELS: Record<string, string> = {
  "6h":    "every 6 hours",
  "12h":   "every 12 hours",
  "daily": "daily",
  "weekly": "weekly",
};

// ── Module-level state ────────────────────────────────────────────────────────

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

// ── Tick ─────────────────────────────────────────────────────────────────────

async function tick() {
  if (running) {
    console.log("[Scheduler] Already running — skipping this tick");
    return;
  }
  running = true;
  console.log("[Scheduler] Starting scrape cycle...");
  try {
    await scrapeAll();
    console.log("[Scheduler] Scrape done. Running health checks...");
    await healthCheckDisabled();
    console.log("[Scheduler] Health checks done. Running pattern analysis...");
    // Pattern analysis is imported lazily to avoid circular deps at module init time
    const { runAnalysis } = await import("@/lib/analysis");
    await runAnalysis();
  } catch (error) {
    console.error("[Scheduler] Scrape cycle failed:", error);
  } finally {
    running = false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Stop the currently running scheduler (no-op if already stopped). */
export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[Scheduler] Stopped");
  }
}

/** Start (or restart) the scheduler with the given interval in milliseconds. */
export function startScheduler(frequencyMs: number): void {
  stopScheduler();
  schedulerTimer = setInterval(tick, frequencyMs);
  const hours = frequencyMs / (60 * 60 * 1000);
  console.log(`[Scheduler] Started — interval: ${hours}h (${frequencyMs}ms)`);
}

/**
 * Called on server boot (from instrumentation.ts).
 * Reads scrapeFrequency from the Settings table; starts scheduler only if set.
 */
export async function initScheduler(): Promise<void> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const freq = settings?.scrapeFrequency;
    if (freq && FREQUENCY_MS[freq]) {
      startScheduler(FREQUENCY_MS[freq]);
      console.log(`[Scheduler] Auto-started with frequency: ${freq}`);
    } else {
      console.log("[Scheduler] No frequency configured — manual scraping only");
    }
  } catch (e) {
    console.error("[Scheduler] Failed to read Settings on init:", e instanceof Error ? e.message : e);
  }
}
