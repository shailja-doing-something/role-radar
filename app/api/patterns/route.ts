import { prisma } from "@/lib/prisma";
import { analyzePatterns } from "@/lib/roles";

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
  const postings = await prisma.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { title: true, description: true },
  });

  if (postings.length === 0) {
    return Response.json({ ok: true, count: 0 });
  }

  try {
    const extracted = await analyzePatterns(postings);
    const period = new Date().toISOString().slice(0, 7); // "2025-04"

    for (const pattern of extracted) {
      await prisma.pattern.upsert({
        where: { keyword_period: { keyword: pattern.keyword, period } },
        create: {
          keyword: pattern.keyword,
          category: pattern.category,
          count: pattern.count,
          period,
        },
        update: { count: pattern.count },
      });
    }

    return Response.json({ ok: true, count: extracted.length });
  } catch (error) {
    console.error("[Patterns] Analysis failed:", error);
    return Response.json({ ok: false, error: "Analysis failed" }, { status: 500 });
  }
}
