import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchSupabaseTeam } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function POST() {
  const teams = await prisma.top100Team.findMany({
    where: { supabaseTeamId: null },
    select: { id: true, name: true },
  });

  let matched = 0;
  let unmatched = 0;

  for (const team of teams) {
    const result = await matchSupabaseTeam(team.name);
    if (result) {
      await prisma.top100Team.update({
        where: { id: team.id },
        data: { supabaseTeamId: result.id },
      });
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`[match-teams] matched=${matched} unmatched=${unmatched}`);
  return NextResponse.json({ matched, unmatched });
}
