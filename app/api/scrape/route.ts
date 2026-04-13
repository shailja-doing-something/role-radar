import { scrapeAll, scrapeBoard } from "@/lib/scraper";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.slug) {
    const count = await scrapeBoard(body.slug as string);
    return Response.json({ ok: true, saved: count });
  }

  // Fire-and-forget for full scrape (can be long-running)
  scrapeAll().catch((e) => console.error("[Scrape] Full scrape failed:", e));

  return Response.json({ ok: true, message: "Scrape started" });
}
