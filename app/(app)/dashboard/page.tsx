import { prisma } from "@/lib/prisma";
import { LayoutDashboard, Star, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { VolumeChart, RolesChart } from "./charts";
import { ScrapeButton } from "./scrape-button";
import { RecentPostings } from "./recent-postings";

export default async function DashboardPage() {
  const now          = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [
    activePostings30,
    activePostingsPrior,
    targetPostings,
    isaCount,
    dailyRaw,
    topRoles,
    totalActive,
    targetTeamActivity,
    lastScrapedRow,
  ] = await Promise.all([
    prisma.jobPosting.count({
      where: { isActive: true, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.jobPosting.count({
      where: { isActive: true, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.jobPosting.count({ where: { isTop100: true, isActive: true } }),
    prisma.jobPosting.count({
      where: {
        isActive: true,
        OR: [
          { title: { contains: "Inside Sales", mode: "insensitive" } },
          { title: { startsWith: "ISA",        mode: "insensitive" } },
        ],
      },
    }),
    prisma.jobPosting.findMany({
      where:  { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.jobPosting.groupBy({
      by:      ["title"],
      where:   { isActive: true },
      _count:  { title: true },
      orderBy: { _count: { title: "desc" } },
      take:    8,
    }),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobPosting.groupBy({
      by:      ["company"],
      where:   { isTop100: true, isActive: true },
      _count:  { company: true },
      _max:    { createdAt: true },
      orderBy: { _count: { company: "desc" } },
      take:    8,
    }),
    prisma.jobBoard.findFirst({
      where:   { lastScraped: { not: null } },
      orderBy: { lastScraped: "desc" },
      select:  { lastScraped: true },
    }),
  ]);

  // Top companies per role (for tooltip)
  const topRoleNames = topRoles.map((r) => r.title);
  const companyRows = topRoleNames.length > 0
    ? await prisma.jobPosting.groupBy({
        by:    ["title", "company"],
        where: { isActive: true, title: { in: topRoleNames } },
        _count: { title: true },
      })
    : [];

  const companyGroups: Record<string, { company: string; count: number }[]> = {};
  for (const row of companyRows) {
    if (!companyGroups[row.title]) companyGroups[row.title] = [];
    companyGroups[row.title].push({ company: row.company, count: row._count.title });
  }
  const topCompaniesMap: Record<string, string[]> = {};
  for (const [role, entries] of Object.entries(companyGroups)) {
    topCompaniesMap[role] = entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((e) => e.company);
  }

  const activelyHiringTeams = targetTeamActivity.length;

  const trendPct =
    activePostingsPrior > 0
      ? Math.round(((activePostings30 - activePostingsPrior) / activePostingsPrior) * 100)
      : null;

  // Volume chart
  const dailyCounts: Record<string, number> = {};
  for (const p of dailyRaw) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }
  const volumeData = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  // Roles chart
  const rolesData = topRoles.map((r) => ({
    role:         r.title,
    count:        r._count.title,
    pct:          totalActive > 0 ? Math.round((r._count.title / totalActive) * 100) : 0,
    topCompanies: topCompaniesMap[r.title] ?? [],
  }));

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <LayoutDashboard size={20} className="text-indigo-400" />
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          </div>
          <p className="text-sm text-fg2">Real estate hiring intelligence — live view</p>
        </div>
        <ScrapeButton lastScraped={lastScrapedRow?.lastScraped?.toISOString() ?? null} />
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Postings"
          value={activePostings30.toLocaleString()}
          sub="last 30 days"
          trend={trendPct}
        />
        <StatCard
          label="Target Account Postings"
          value={targetPostings.toLocaleString()}
          sub="Top 100 active roles"
          accent
        />
        <StatCard
          label="Actively Hiring Teams"
          value={activelyHiringTeams.toLocaleString()}
          sub="Top 100 with live postings"
        />
        <StatCard
          label="ISA Roles Open"
          value={isaCount.toLocaleString()}
          sub="Inside Sales roles"
        />
      </div>

      {/* ── Charts row (60 / 40) ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="col-span-3 bg-surface border border-edge rounded-xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2 mb-0.5">
            Hiring Activity
          </p>
          <p className="text-xs text-fg3 mb-5">Posting volume — last 30 days</p>
          <VolumeChart data={volumeData} />
        </div>
        <div className="col-span-2 bg-surface border border-edge rounded-xl p-6">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2">
              Top Roles Being Hired
            </p>
            <Link
              href="/patterns"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <p className="text-xs text-fg3 mb-5">By active posting count · last 30 days</p>
          <RolesChart data={rolesData} />
        </div>
      </div>

      {/* ── Bottom row (50 / 50) ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Target Account Activity */}
        <div className="bg-surface border border-edge rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2 mb-0.5">
                Target Account Activity
              </p>
              <p className="text-xs text-fg3">Top 100 teams with live postings</p>
            </div>
            <Link
              href="/signals"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              See all →
            </Link>
          </div>

          {targetTeamActivity.length === 0 ? (
            <p className="text-fg3 text-sm py-8 text-center">
              No target account postings yet — run a scrape.
            </p>
          ) : (
            <div className="divide-y divide-edge">
              {targetTeamActivity.map((t) => (
                <div
                  key={t.company}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Star size={11} className="text-amber-400 shrink-0" />
                    <span className="text-sm text-white font-medium truncate">
                      {t.company}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-fg2">
                      {t._count.company} role{t._count.company !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-fg3">
                      {timeAgo(t._max.createdAt?.toISOString() ?? null)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Postings */}
        <RecentPostings />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, trend, accent,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  trend?:  number | null;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        accent
          ? "bg-indigo-500/5 border-indigo-500/30"
          : "bg-surface border-edge"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2 mb-3">
        {label}
      </p>
      <p className="text-[32px] font-bold text-white leading-none mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-semibold ${
              trend >= 0 ? "text-green-500" : "text-red-400"
            }`}
          >
            {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {trend >= 0 ? "+" : ""}
            {trend}% vs prev 30d
          </span>
        )}
        {sub && <span className="text-xs text-fg3">{sub}</span>}
      </div>
    </div>
  );
}
