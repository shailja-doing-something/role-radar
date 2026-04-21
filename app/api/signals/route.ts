import { prisma } from "@/lib/prisma";
import { readonlyQuery } from "@/lib/supabase-readonly";

// All ISA and ops roles the scraper normalizes to
const ISA_ROLES = [
  "Inside Sales Agent",
  "Real Estate Team Lead",
  "Transaction Coordinator",
  "Real Estate Operations Manager",
  "Listing Coordinator",
  "Real Estate Marketing Manager",
  "Real Estate Administrative Assistant",
];

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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [teams, postings] = await Promise.all([
    prisma.targetAccount.findMany({ orderBy: { uploadedAt: "asc" } }),
    prisma.jobPosting.findMany({
      where: { isTop100: true, isActive: true, title: { in: ISA_ROLES }, scrapedAt: { gte: thirtyDaysAgo } },
      select: {
        id: true, title: true, company: true,
        location: true, source: true, url: true, postedAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Load only the supabaseTeamIds that are linked, then check against Supabase
  const linkedIds = teams.map((t) => t.supabaseTeamId).filter(Boolean) as string[];

  const [isaRows, mktgRows] = linkedIds.length > 0
    ? await Promise.all([
        readonlyQuery<{ team_id: string }>(
          `SELECT team_id FROM mad.isa_teams WHERE team_id = ANY($1::uuid[])`, [linkedIds]
        ).catch(() => [] as { team_id: string }[]),
        readonlyQuery<{ team_id: string }>(
          `SELECT team_id FROM mad.marketing_ops_teams WHERE team_id = ANY($1::uuid[])`, [linkedIds]
        ).catch(() => [] as { team_id: string }[]),
      ])
    : [[], []];

  const isaSet  = new Set(isaRows.map((r) => r.team_id));
  const mktgSet = new Set(mktgRows.map((r) => r.team_id));

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const result = teams.map((team) => {
    const liveISASignals = postings.filter(p => fuzzyMatch(team.teamName, p.company));
    const recentCount    = liveISASignals.filter(p =>
      (p.postedAt ?? p.createdAt) >= fourteenDaysAgo
    ).length;

    const isaVelocity = recentCount >= 3 ? "Hot" : recentCount >= 1 ? "Active" : "None";

    const supabaseISAConfirmed  = !!(team.supabaseTeamId && isaSet.has(team.supabaseTeamId));
    const supabaseMktgConfirmed = !!(team.supabaseTeamId && mktgSet.has(team.supabaseTeamId));

    return {
      id:                   team.id,
      teamName:             team.teamName,
      brokerage:            team.brokerage,
      location:             team.location,
      website:              team.website,
      isPriority:           team.isPriority,
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
