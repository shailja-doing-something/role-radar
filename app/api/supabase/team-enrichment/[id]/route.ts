import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readonlyQuery } from "@/lib/supabase-readonly";
import { getRealTrendsTeam } from "@/lib/supabase-data";

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

  const [realTrends, isaRows, mktgRows] = await Promise.all([
    getRealTrendsTeam(team.supabaseTeamId),
    readonlyQuery<{ isa_agent_count: number | null; isa_categories: string[] | null }>(
      `SELECT isa_agent_count, isa_categories FROM mad.isa_teams WHERE team_id = $1`,
      [team.supabaseTeamId]
    ).catch(() => []),
    readonlyQuery<{ dept_agent_count: number | null; departments: string[] | null }>(
      `SELECT dept_agent_count, departments FROM mad.marketing_ops_teams WHERE team_id = $1`,
      [team.supabaseTeamId]
    ).catch(() => []),
  ]);

  return NextResponse.json({
    matched: true,
    realTrends: realTrends ?? null,
    isa: isaRows[0] ?? null,
    marketingOps: mktgRows[0] ?? null,
  });
}
