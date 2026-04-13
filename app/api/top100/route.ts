import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.top100Team.findMany({
    orderBy: { id: "asc" },
  });

  return Response.json(
    teams.map((t, i) => ({
      rank: i + 1,
      id: t.id,
      name: t.name,
      brokerage: t.brokerage,
      location: t.location,
      website: t.website,
    }))
  );
}
