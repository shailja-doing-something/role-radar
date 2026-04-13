import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const company = decodeURIComponent(name);

  const postings = await prisma.jobPosting.findMany({
    where: { company: { equals: company, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, location: true, remote: true,
      salary: true, source: true, url: true, postedAt: true, createdAt: true,
    },
  });

  return Response.json({ company, postings });
}
