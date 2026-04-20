import { NextResponse } from "next/server";
import { readonlyQuery } from "@/lib/supabase-readonly";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    const r = await readonlyQuery("SELECT 1 AS ok");
    results.connection = r[0];
  } catch (e) {
    results.connection_error = String(e);
  }

  try {
    const r = await readonlyQuery<{ count: string }>("SELECT COUNT(*) FROM mad.teams");
    results.mad_teams_count = r[0]?.count;
  } catch (e) {
    results.mad_teams_error = String(e);
  }

  try {
    const r = await readonlyQuery<{ count: string }>("SELECT COUNT(*) FROM mad.isa_teams");
    results.isa_teams_count = r[0]?.count;
  } catch (e) {
    results.isa_teams_error = String(e);
  }

  try {
    const r = await readonlyQuery<{ count: string }>("SELECT COUNT(*) FROM mad.marketing_ops_teams");
    results.marketing_ops_count = r[0]?.count;
  } catch (e) {
    results.marketing_ops_error = String(e);
  }

  try {
    const r = await readonlyQuery<{ team_name: string }>("SELECT team_name FROM mad.teams LIMIT 3");
    results.sample_teams = r.map(t => t.team_name);
  } catch (e) {
    results.sample_teams_error = String(e);
  }

  return NextResponse.json(results);
}
