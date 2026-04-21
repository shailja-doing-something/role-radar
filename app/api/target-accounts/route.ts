import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.targetAccount.findMany({
    orderBy: { uploadedAt: "asc" },
  });

  return Response.json(
    teams.map((t, i) => ({
      rank:      i + 1,
      id:        t.id,
      teamName:  t.teamName,
      brokerage: t.brokerage,
      location:  t.location,
      website:   t.website,
      isPriority: t.isPriority,
    }))
  );
}
