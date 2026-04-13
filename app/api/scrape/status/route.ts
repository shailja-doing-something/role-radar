import { isScraperRunning } from "@/lib/scraper";

export async function GET() {
  return Response.json({ running: isScraperRunning() });
}
