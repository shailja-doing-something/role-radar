import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readonlyQuery } from "@/lib/supabase-readonly";

export const dynamic = "force-dynamic";

interface MadTeamRow {
  id:          string;
  team_name:   string;
  city:        string | null;
  state:       string | null;
  website_url: string | null;
  brokerage:   string | null;
}

export async function POST() {
  // Fetch all teams from mad.teams, picking up brokerage from isa/mktg join
  const madTeams = await readonlyQuery<MadTeamRow>(`
    SELECT
      t.id,
      t.team_name,
      t.city,
      t.state,
      t.website_url,
      COALESCE(i.brokerage, m.brokerage) AS brokerage
    FROM mad.teams t
    LEFT JOIN mad.isa_teams i         ON t.id = i.team_id
    LEFT JOIN mad.marketing_ops_teams m ON t.id = m.team_id
    ORDER BY t.team_name
  `);

  // Find which supabaseTeamIds already exist in our DB
  const existing = await prisma.top100Team.findMany({
    select: { supabaseTeamId: true },
  });
  const existingIds = new Set(
    existing.map((t) => t.supabaseTeamId).filter(Boolean) as string[]
  );

  const toImport = madTeams.filter((t) => !existingIds.has(t.id));

  if (toImport.length > 0) {
    await prisma.top100Team.createMany({
      data: toImport.map((t) => ({
        name:                 t.team_name,
        brokerage:            t.brokerage   ?? null,
        location:             [t.city, t.state].filter(Boolean).join(", ") || null,
        website:              t.website_url ?? null,
        supabaseTeamId:       t.id,
        isaPresence:          "Unknown",
        marketingOpsPresence: "Unknown",
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    total:    madTeams.length,
    imported: toImport.length,
    skipped:  existingIds.size,
  });
}
