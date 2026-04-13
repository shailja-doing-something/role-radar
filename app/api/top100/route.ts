import { prisma } from "@/lib/prisma";

export async function GET() {
  const companies = await prisma.jobPosting.groupBy({
    by: ["company"],
    _count: { company: true },
    orderBy: { _count: { company: "desc" } },
    take: 100,
  });

  return Response.json(
    companies.map((c, i) => ({
      rank: i + 1,
      company: c.company,
      openRoles: c._count.company,
    }))
  );
}
