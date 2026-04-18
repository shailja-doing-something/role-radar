import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard, Star, ArrowUp, ArrowDown,
  Briefcase, Target, Users, Phone,
} from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";
import { RolesChart } from "./charts";
import { ScrapeButton } from "./scrape-button";
import { RecentPostings } from "./recent-postings";

const SOURCE_LABELS: Record<string, string> = {
  linkedin:         "LinkedIn",
  indeed:           "Indeed",
  ziprecruiter:     "ZipRecruiter",
  glassdoor:        "Glassdoor",
  website:          "Web",
  brokerage_portal: "Portal",
};

export default async function DashboardPage() {
  const now          = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [
    activePostings30,
    activePostingsPrior,
    targetPostings,
    isaCount,
    isaAllPostings,
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
      where: {
        isActive: true,
        OR: [
          { title: { contains: "Inside Sales", mode: "insensitive" } },
          { title: { startsWith: "ISA",        mode: "insensitive" } },
          { title: { contains: "Lead Manager", mode: "insensitive" } },
          { title: { contains: "Team Lead",    mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, company: true, location: true, url: true, source: true, postedAt: true, createdAt: true, isTop100: true },
      orderBy: { createdAt: "desc" },
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
      take:    6,
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

  // ISA Signal Tracker
  const isaTargetCount   = isaAllPostings.filter((p) => p.isTop100).length;
  const targetIsaPostings = isaAllPostings.filter((p) => p.isTop100).slice(0, 6);
  const isaDays = isaAllPostings.map((p) => {
    const d = p.postedAt ?? p.createdAt;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  });
  const avgDaysPosted = isaDays.length > 0
    ? Math.round(isaDays.reduce((a, b) => a + b, 0) / isaDays.length)
    : 0;
  const stateCounts: Record<string, number> = {};
  for (const p of isaAllPostings) {
    if (!p.location) continue;
    const m = p.location.match(/,\s*([A-Z]{2})(?:\s|$)/);
    if (m) stateCounts[m[1]] = (stateCounts[m[1]] ?? 0) + 1;
  }
  const topIsaStates = Object.entries(stateCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Postings"
          value={activePostings30.toLocaleString()}
          sub="last 30 days"
          trend={trendPct}
          color="#6366F1"
          icon={Briefcase}
        />
        <StatCard
          label="Target Account Postings"
          value={targetPostings.toLocaleString()}
          sub="Top 100 active roles"
          color="#8B5CF6"
          icon={Target}
        />
        <StatCard
          label="Actively Hiring Teams"
          value={activelyHiringTeams.toLocaleString()}
          sub="Top 100 with live postings"
          color="#06B6D4"
          icon={Users}
        />
        <StatCard
          label="ISA Roles Open"
          value={isaCount.toLocaleString()}
          sub="Inside Sales roles"
          color="#F59E0B"
          icon={Phone}
        />
      </div>

      {/* ── Charts row (60 / 40) ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6 mb-6 items-start">
        <div className="col-span-3 bg-surface border border-edge rounded-xl overflow-hidden">
          <div style={{ height: 3, background: "#F59E0B" }} />
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2 mb-0.5">
                  ISA Signal Tracker
                </p>
                <p className="text-xs text-fg3">Inside Sales hiring across your target accounts</p>
              </div>
              <Phone size={15} className="text-amber-400 shrink-0" />
            </div>

            {/* Section 1 — mini stats */}
            <div className="flex rounded-lg border border-edge divide-x divide-edge mb-5">
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg3 mb-1">ISA Roles Active</p>
                <p className="text-2xl font-bold text-white">{isaAllPostings.length}</p>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg3 mb-1">From Target Accounts</p>
                <p className="text-2xl font-bold text-white">{isaTargetCount}</p>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg3 mb-1">Avg Days Posted</p>
                <p className="text-2xl font-bold text-white">{avgDaysPosted > 0 ? avgDaysPosted : "—"}</p>
              </div>
            </div>

            {/* Section 2 — target accounts hiring ISA */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-2">
                Target Accounts Hiring ISA Now
              </p>
              {targetIsaPostings.length === 0 ? (
                <div className="flex items-center gap-2 py-5 text-fg3">
                  <Phone size={14} />
                  <span className="text-sm">No target accounts hiring ISA right now</span>
                </div>
              ) : (
                <div className="divide-y divide-edge -mx-6">
                  {targetIsaPostings.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-raised transition-colors"
                    >
                      <span className="flex-1 min-w-0 text-[13px] font-semibold text-white truncate">{p.company}</span>
                      <span className="text-xs text-fg2 shrink-0 max-w-[140px] truncate">{p.title}</span>
                      <span className="text-[11px] text-fg3 shrink-0">{SOURCE_LABELS[p.source] ?? p.source}</span>
                      <span className="text-[11px] text-fg3 shrink-0">
                        {timeAgo(p.postedAt?.toISOString() ?? p.createdAt.toISOString())}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3 — top states */}
            {topIsaStates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-edge">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-2">
                  Top States for ISA Hiring
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {topIsaStates.map(([state, count]) => (
                    <span
                      key={state}
                      className="text-[10px] px-2 py-1 bg-surface-raised border border-edge rounded text-fg2"
                    >
                      {state} {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          </div>

          {targetTeamActivity.length === 0 ? (
            <p className="text-fg3 text-sm py-8 text-center">
              No target account activity yet — run a scrape to check.
            </p>
          ) : (
            <>
              <div className="divide-y divide-edge">
                {targetTeamActivity.map((t) => (
                  <div
                    key={t.company}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Star size={11} className="text-amber-400 shrink-0" />
                      <span className="text-sm text-white font-bold truncate">
                        {t.company}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="bg-indigo-500/15 text-indigo-400 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {t._count.company}
                      </span>
                      <span className="text-xs text-fg3">
                        {timeAgo(t._max.createdAt?.toISOString() ?? null)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-edge">
                <Link
                  href="/signals"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View all in Signals →
                </Link>
              </div>
            </>
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
  label, value, sub, trend, color, icon: Icon,
}: {
  label:  string;
  value:  string;
  sub?:   string;
  trend?: number | null;
  color:  string;
  icon:   ElementType;
}) {
  return (
    <div className="bg-surface border border-edge rounded-xl overflow-hidden">
      <div style={{ height: 3, background: color }} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2">
            {label}
          </p>
          <Icon size={15} style={{ color }} className="shrink-0 mt-0.5" />
        </div>
        <p className="text-[36px] font-bold text-white leading-none mb-2">{value}</p>
        <div className="flex items-center gap-2">
          {trend != null && (
            <span
              className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                trend >= 0 ? "text-green-500" : "text-red-400"
              }`}
            >
              {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {trend >= 0 ? "+" : ""}{trend}% vs prev 30d
            </span>
          )}
          {sub && <span className="text-xs text-fg3">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
