import { analyzePatterns } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const period = searchParams.get("period");

  const patterns = await prisma.pattern.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(period ? { period } : {}),
    },
    orderBy: { count: "desc" },
    take: 100,
  });

  return Response.json(patterns);
}

export async function POST() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const BASE = { isActive: true, scrapedAt: { gte: thirtyDaysAgo } } as const;

  const [postings, totalActive, isaCount, topRoles, locationPostings] = await Promise.all([
    prisma.jobPosting.findMany({
      where:   BASE,
      orderBy: { createdAt: "desc" },
      take:    100,
      select:  { title: true, description: true },
    }),
    prisma.jobPosting.count({ where: BASE }),
    prisma.jobPosting.count({ where: { ...BASE, title: "Inside Sales Agent" } }),
    prisma.jobPosting.groupBy({
      by: ["title"], where: BASE, _count: { title: true },
      orderBy: { _count: { title: "desc" } }, take: 1,
    }),
    prisma.jobPosting.findMany({
      where: { ...BASE, location: { not: null } },
      select: { location: true },
    }),
  ]);

  if (postings.length === 0) {
    return Response.json({ ok: true, count: 0 });
  }

  // Compute top state
  const stateCounts: Record<string, number> = {};
  for (const p of locationPostings) {
    if (!p.location) continue;
    const m = p.location.match(/,\s*([A-Z]{2})(?:\s|$|,)/) ?? p.location.match(/\b([A-Z]{2})$/);
    if (m) stateCounts[m[1]] = (stateCounts[m[1]] ?? 0) + 1;
  }
  const topStateEntry = Object.entries(stateCounts).sort(([, a], [, b]) => b - a)[0] ?? null;

  const verifiedCounts = {
    totalActive,
    isaCount,
    topRole:       topRoles[0]?.title ?? "Unknown",
    topRoleCount:  topRoles[0]?._count.title ?? 0,
    topState:      topStateEntry?.[0] ?? "Unknown",
    topStateCount: topStateEntry?.[1] ?? 0,
  };

  try {
    const extracted = await analyzePatterns(postings, verifiedCounts);
    const period = new Date().toISOString().slice(0, 7);

    // Clear stale patterns for this period before inserting fresh ones
    await prisma.pattern.deleteMany({ where: { period } });

    for (const pattern of extracted) {
      await prisma.pattern.create({
        data: {
          keyword:  pattern.keyword,
          category: pattern.category,
          count:    pattern.count,
          period,
        },
      });
    }

    return Response.json({ ok: true, count: extracted.length });
  } catch (error) {
    console.error("[Patterns] Analysis failed:", error);
    return Response.json({ ok: false, error: "Analysis failed" }, { status: 500 });
  }
}
