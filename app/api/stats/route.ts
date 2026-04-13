import { prisma } from "@/lib/prisma";

export async function GET() {
  const [total, recent, activeSources, topCompanies, recentPostings] =
    await Promise.all([
      prisma.jobPosting.count(),
      prisma.jobPosting.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
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
          createdAt: true,
        },
      }),
    ]);

  return Response.json({
    total,
    recent,
    activeSources,
    topCompanies: topCompanies.map((c) => ({
      company: c.company,
      count: c._count.company,
    })),
    recentPostings,
  });
}
