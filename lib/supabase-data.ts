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
  team_id: string;
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

// ── Module-level cache (static data, 1-hour TTL) ──────────────────────────────

interface CacheEntry<T> { data: T; ts: number }
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let isaCache:  CacheEntry<ISATeam[]>          | null = null;
let mktgCache: CacheEntry<MarketingOpsTeam[]> | null = null;

export async function getISATeams(): Promise<ISATeam[]> {
  if (isaCache && Date.now() - isaCache.ts < CACHE_TTL) return isaCache.data;
  try {
    const data = await readonlyQuery<ISATeam>(`
      SELECT team_id, team_name, city, state, brokerage, team_size, rank,
             annual_revenue, sides, website_url, isa_agent_count, isa_categories
      FROM mad.isa_teams
      ORDER BY rank ASC NULLS LAST
    `);
    isaCache = { data, ts: Date.now() };
    return data;
  } catch (err) {
    console.error("[supabase-data] getISATeams error:", err);
    return isaCache?.data ?? [];
  }
}

export async function getMarketingOpsTeams(): Promise<MarketingOpsTeam[]> {
  if (mktgCache && Date.now() - mktgCache.ts < CACHE_TTL) return mktgCache.data;
  try {
    const data = await readonlyQuery<MarketingOpsTeam>(`
      SELECT team_id, team_name, city, state, brokerage, team_size, rank,
             annual_revenue, sides, website_url, dept_agent_count, departments
      FROM mad.marketing_ops_teams
      ORDER BY rank ASC NULLS LAST
    `);
    mktgCache = { data, ts: Date.now() };
    return data;
  } catch (err) {
    console.error("[supabase-data] getMarketingOpsTeams error:", err);
    return mktgCache?.data ?? [];
  }
}

// Single batch query — replaces N individual getRealTrendsTeam calls
export async function getRealTrendsTeams(teamIds: string[]): Promise<Map<string, RealTrendsTeam>> {
  if (teamIds.length === 0) return new Map();
  try {
    const rows = await readonlyQuery<RealTrendsTeam>(`
      SELECT team_id, rank, annual_revenue, sides, real_trends_url
      FROM mad.real_trends_teams
      WHERE team_id = ANY($1::uuid[])
    `, [teamIds]);
    return new Map(rows.map((r) => [r.team_id, r]));
  } catch (err) {
    console.error("[supabase-data] getRealTrendsTeams error:", err);
    return new Map();
  }
}

// ── Team matching ─────────────────────────────────────────────────────────────

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(team|group|realty|real estate|properties|homes|associates|llc|inc|brokered by|brokerage|the|and|&)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coreToken(normalized: string): string {
  const words = normalized.split(" ").filter((w) => w.length > 2);
  return words.slice(0, 2).join(" ");
}

export async function matchSupabaseTeam(roleRadarTeamName: string): Promise<SupabaseTeamMatch | null> {
  try {
    const normalized = normalizeTeamName(roleRadarTeamName);
    const core       = coreToken(normalized);

    if (core) {
      const rows = await readonlyQuery<SupabaseTeamMatch>(`
        SELECT id, team_name, city, state, website_url
        FROM mad.teams
        WHERE regexp_replace(lower(team_name), '[^a-z0-9 ]', ' ', 'g') LIKE $1
        LIMIT 1
      `, [`%${core}%`]);
      if (rows[0]) return rows[0];
    }

    const rows = await readonlyQuery<SupabaseTeamMatch & { sim: number }>(`
      SELECT id, team_name, city, state, website_url,
             similarity(lower(team_name), $1) AS sim
      FROM mad.teams
      WHERE similarity(lower(team_name), $1) > 0.2
      ORDER BY sim DESC
      LIMIT 1
    `, [normalized]);
    return rows[0] ?? null;
  } catch (err) {
    console.error("[supabase-data] matchSupabaseTeam error:", err);
    return null;
  }
}
