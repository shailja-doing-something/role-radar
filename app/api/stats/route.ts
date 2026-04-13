import { prisma } from "@/lib/prisma";

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    recentByPostedAt,
    activeSources,
    topCompanies,
    recentPostings,
    remoteCount,
    dailyRaw,
  ] = await Promise.all([
    prisma.jobPosting.count(),

    // "New this week" = jobs whose actual post date is within 7 days
    prisma.jobPosting.count({
      where: { postedAt: { gte: sevenDaysAgo } },
    }),

    prisma.jobBoard.count({ where: { active: true } }),

    prisma.jobPosting.groupBy({
      by: ["company"],
      _count: { company: true },
      orderBy: { _count: { company: "desc" } },
      take: 5,
    }),

    prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        company: true,
        source: true,
        url: true,
        location: true,
        remote: true,
        salary: true,
        postedAt: true,
        createdAt: true,
      },
    }),

    prisma.jobPosting.count({ where: { remote: true } }),

    // Daily posting counts for the last 30 days (by scrapedAt)
    prisma.jobPosting.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Aggregate daily counts from raw dates
  const dailyCounts: Record<string, number> = {};
  for (const p of dailyRaw) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }
  const volumeData = Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count,
  }));

  return Response.json({
    total,
    recent: recentByPostedAt,
    activeSources,
    remoteCount,
    onSiteCount: total - remoteCount,
    volumeData,
    topCompanies: topCompanies.map((c) => ({
      company: c.company,
      count: c._count.company,
    })),
    recentPostings,
  });
}
