import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source        = searchParams.get("source");
  const q             = searchParams.get("q");
  const remoteParam   = searchParams.get("remote");
  const top100Only    = searchParams.get("top100Only") === "true";
  const priorityOnly  = searchParams.get("priorityOnly") === "true";
  const companyParam  = searchParams.get("company");
  const page          = parseInt(searchParams.get("page")  ?? "1");
  const limit         = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const where = {
    ...(source                                  ? { source }                    : {}),
    ...(top100Only                              ? { isTop100: true }             : {}),
    ...(priorityOnly                            ? { isPriorityAccount: true }    : {}),
    ...(remoteParam !== null && remoteParam !== "" ? { remote: remoteParam === "true" } : {}),
    ...(companyParam
      ? { company: { contains: companyParam, mode: "insensitive" as const } }
      : {}),
    ...(q
      ? {
          OR: [
            { title:   { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [postings, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    limit,
      skip:    (page - 1) * limit,
      select: {
        id: true, title: true, company: true, location: true,
        remote: true, url: true, source: true, salary: true,
        postedAt: true, createdAt: true, isTop100: true, isPriorityAccount: true,
      },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  return Response.json({ postings, total, page, limit });
}
