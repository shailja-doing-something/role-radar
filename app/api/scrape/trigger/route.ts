import { scrapeAll } from "@/lib/scraper";

export async function POST(req: Request) {
  // If CRON_SECRET is configured, require it in the Authorization header.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // Fire-and-forget — scrapeAll can take several minutes
  scrapeAll().catch((e) => console.error("[Trigger] scrapeAll failed:", e));

  return Response.json({ ok: true, message: "Scrape started" });
}
