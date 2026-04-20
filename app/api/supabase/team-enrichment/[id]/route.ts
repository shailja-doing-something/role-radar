import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readonlyQuery } from "@/lib/supabase-readonly";
import { getRealTrendsTeams } from "@/lib/supabase-data";

export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const team = await prisma.top100Team.findUnique({
    where: { id: teamId },
    select: { supabaseTeamId: true },
  });

  if (!team?.supabaseTeamId) {
    return NextResponse.json({ matched: false });
  }

  const sid = team.supabaseTeamId;
  const [rtMap, isaRows, mktgRows] = await Promise.all([
    getRealTrendsTeams([sid]),
    readonlyQuery<{ isa_agent_count: number | null; isa_categories: string[] | null }>(
      `SELECT isa_agent_count, isa_categories FROM mad.isa_teams WHERE team_id = $1`,
      [sid]
    ).catch(() => []),
    readonlyQuery<{ dept_agent_count: number | null; departments: string[] | null }>(
      `SELECT dept_agent_count, departments FROM mad.marketing_ops_teams WHERE team_id = $1`,
      [sid]
    ).catch(() => []),
  ]);

  return NextResponse.json({
    matched:     true,
    realTrends:  rtMap.get(sid) ?? null,
    isa:         isaRows[0]     ?? null,
    marketingOps: mktgRows[0]  ?? null,
  });
}
