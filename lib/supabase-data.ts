import { readonlyQuery } from "./supabase-readonly";

export interface ISATeam {
  team_id: string;
  team_name: string;
  city: string | null;
  state: string | null;
  brokerage: string | null;
  team_size: number | null;
  rank: number | null;
  annual_revenue: string | null;
  sides: number | null;
  website_url: string | null;
  isa_agent_count: number | null;
  isa_categories: string[] | null;
}

export interface MarketingOpsTeam {
  team_id: string;
  team_name: string;
  city: string | null;
  state: string | null;
  brokerage: string | null;
  team_size: number | null;
  rank: number | null;
  annual_revenue: string | null;
  sides: number | null;
  website_url: string | null;
  dept_agent_count: number | null;
  departments: string[] | null;
}

export interface RealTrendsTeam {
  rank: number | null;
  annual_revenue: string | null;
  sides: number | null;
  real_trends_url: string | null;
}

export interface SupabaseTeamMatch {
  id: string;
  team_name: string;
  city: string | null;
  state: string | null;
  website_url: string | null;
}

export async function getISATeams(): Promise<ISATeam[]> {
  try {
    return await readonlyQuery<ISATeam>(`
      SELECT team_id, team_name, city, state, brokerage, team_size, rank,
             annual_revenue, sides, website_url, isa_agent_count, isa_categories
      FROM mad.isa_teams
      ORDER BY rank ASC NULLS LAST
    `);
  } catch (err) {
    console.error("[supabase-data] getISATeams error:", err);
    return [];
  }
}

export async function getMarketingOpsTeams(): Promise<MarketingOpsTeam[]> {
  try {
    return await readonlyQuery<MarketingOpsTeam>(`
      SELECT team_id, team_name, city, state, brokerage, team_size, rank,
             annual_revenue, sides, website_url, dept_agent_count, departments
      FROM mad.marketing_ops_teams
      ORDER BY rank ASC NULLS LAST
    `);
  } catch (err) {
    console.error("[supabase-data] getMarketingOpsTeams error:", err);
    return [];
  }
}

export async function getRealTrendsTeam(teamId: string): Promise<RealTrendsTeam | null> {
  try {
    const rows = await readonlyQuery<RealTrendsTeam>(`
      SELECT rt.rank, rt.annual_revenue, rt.sides, rt.real_trends_url
      FROM mad.real_trends_teams rt
      WHERE rt.team_id = $1
      LIMIT 1
    `, [teamId]);
    return rows[0] ?? null;
  } catch (err) {
    console.error("[supabase-data] getRealTrendsTeam error:", err);
    return null;
  }
}

export async function matchSupabaseTeam(roleRadarTeamName: string): Promise<SupabaseTeamMatch | null> {
  try {
    const stripped = roleRadarTeamName
      .toLowerCase()
      .replace(/team|group|realty|real estate|properties|homes|associates|llc|inc/g, "")
      .trim();
    const rows = await readonlyQuery<SupabaseTeamMatch>(`
      SELECT id, team_name, city, state, website_url
      FROM mad.teams
      WHERE lower(team_name) LIKE $1
      LIMIT 1
    `, [`%${stripped}%`]);
    return rows[0] ?? null;
  } catch (err) {
    console.error("[supabase-data] matchSupabaseTeam error:", err);
    return null;
  }
}
