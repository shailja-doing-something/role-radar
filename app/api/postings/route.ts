import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const where = {
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { company: { contains: q } },
          ],
        }
      : {}),
  };

  const [postings, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remote: true,
        url: true,
        source: true,
        salary: true,
        postedAt: true,
        createdAt: true,
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  return Response.json({ postings, total, page, limit });
}
