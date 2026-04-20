import { prisma } from "@/lib/prisma";
import { getISATeams, getMarketingOpsTeams } from "@/lib/supabase-data";

// Roles that indicate ISA / lead-conversion activity
const ISA_ROLES = ["Inside Sales Agent", "Real Estate Team Lead"];

const STRIP_WORDS = new Set([
  "team","group","realty","real","estate","properties","homes",
  "brokerage","associates","llc","inc",
]);

function stripSuffixes(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !STRIP_WORDS.has(w))
    .join(" ")
    .trim();
}

function fuzzyMatch(teamName: string, companyName: string): boolean {
  const a = stripSuffixes(teamName);
  const b = stripSuffixes(companyName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export async function GET() {
  const [teams, postings, isaTeams, mktgTeams] = await Promise.all([
    prisma.top100Team.findMany({ orderBy: { id: "asc" } }),
    prisma.jobPosting.findMany({
      where: { isTop100: true, isActive: true, title: { in: ISA_ROLES } },
      select: {
        id: true, title: true, company: true,
        location: true, source: true, url: true, postedAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getISATeams(),
    getMarketingOpsTeams(),
  ]);

  const isaSet  = new Set(isaTeams.map((t) => t.team_id));
  const mktgSet = new Set(mktgTeams.map((t) => t.team_id));

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const result = teams.map((team) => {
    const liveISASignals = postings.filter(p => fuzzyMatch(team.name, p.company));
    const recentCount    = liveISASignals.filter(p =>
      (p.postedAt ?? p.createdAt) >= fourteenDaysAgo
    ).length;

    const isaVelocity = recentCount >= 3 ? "Hot" : recentCount >= 1 ? "Active" : "None";

    const supabaseISAConfirmed  = !!(team.supabaseTeamId && isaSet.has(team.supabaseTeamId));
    const supabaseMktgConfirmed = !!(team.supabaseTeamId && mktgSet.has(team.supabaseTeamId));

    return {
      id:                   team.id,
      name:                 team.name,
      brokerage:            team.brokerage,
      location:             team.location,
      website:              team.website,
      isaPresence:          team.isaPresence,
      marketingOpsPresence: team.marketingOpsPresence,
      isaVelocity,
      supabaseISAConfirmed,
      supabaseMktgConfirmed,
      liveISASignals: liveISASignals.map(p => ({
        id:             p.id,
        normalizedRole: p.title,
        location:       p.location,
        source:         p.source,
        sourceUrl:      p.url,
        postedAt:       p.postedAt?.toISOString() ?? null,
      })),
    };
  });

  return Response.json(result);
}
