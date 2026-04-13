import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const [postings, patterns] = await Promise.all([
    prisma.jobPosting.deleteMany({}),
    prisma.pattern.deleteMany({}),
  ]);

  return Response.json({
    deleted: { postings: postings.count, patterns: patterns.count },
  });
}
