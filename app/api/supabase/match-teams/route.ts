import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchSupabaseTeam } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function POST() {
  const teams = await prisma.targetAccount.findMany({
    where:  { supabaseTeamId: null },
    select: { id: true, teamName: true },
  });

  let matched   = 0;
  let unmatched = 0;

  for (const team of teams) {
    const result = await matchSupabaseTeam(team.teamName);
    if (result) {
      await prisma.targetAccount.update({
        where: { id: team.id },
        data:  { supabaseTeamId: result.id },
      });
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`[match-teams] matched=${matched} unmatched=${unmatched}`);
  return NextResponse.json({ matched, unmatched });
}
