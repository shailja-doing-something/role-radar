import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard, Star, ArrowUp, ArrowDown,
  Briefcase, Target, Users, Phone, Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { ScrapeButton } from "./scrape-button";

export default async function DashboardPage() {
  const now          = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [
    activePostings30,
    activePostingsPrior,
    targetPostings,
    isaCount,
    locationPostings,
    topRoles,
    totalActive,
    targetTeamActivity,
    lastScrapedRow,
    recentPostings,
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
      where:   { isActive: true, location: { not: null } },
      select:  { location: true },
      take:    500,
    }),
    prisma.jobPosting.groupBy({
      by:      ["title"],
      where:   { isActive: true },
      _count:  { title: true },
      orderBy: { _count: { title: "desc" } },
      take:    1,
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
    prisma.jobPosting.findMany({
      orderBy: { scrapedAt: "desc" },
      take:    10,
      select:  { id: true, title: true, company: true, location: true, url: true, scrapedAt: true, isTop100: true },
    }),
  ]);

  // Latest role title per target team
  const targetCompanyNames = targetTeamActivity.map((t) => t.company);
  const latestTitleRows = targetCompanyNames.length > 0
    ? await prisma.jobPosting.findMany({
        where:    { company: { in: targetCompanyNames }, isTop100: true, isActive: true },
        orderBy:  { createdAt: "desc" },
        distinct: ["company"],
        select:   { company: true, title: true },
      })
    : [];
  const latestTitleMap = new Map(latestTitleRows.map((p) => [p.company, p.title]));

  const trendPct = activePostingsPrior > 0
    ? Math.round(((activePostings30 - activePostingsPrior) / activePostingsPrior) * 100)
    : null;

  const activelyHiringTeams = targetTeamActivity.length;

  // ── Market Snapshot ────────────────────────────────────────────────────────
  const topRole    = topRoles[0] ?? null;
  const topRolePct = topRole && totalActive > 0
    ? Math.round((topRole._count.title / totalActive) * 100)
    : 0;

  const stateCounts: Record<string, number> = {};
  for (const p of locationPostings) {
    if (!p.location) continue;
    const m = p.location.match(/,\s*([A-Z]{2})(?:\s|$)/);
    if (m) stateCounts[m[1]] = (stateCounts[m[1]] ?? 0) + 1;
  }
  const topStateEntry = Object.entries(stateCounts).sort(([, a], [, b]) => b - a)[0] ?? null;

  const topTeam  = targetTeamActivity[0] ?? null;
  const isaPct   = totalActive > 0 ? Math.round((isaCount / totalActive) * 100) : 0;
  const isaAbove = isaPct >= 30;

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <LayoutDashboard size={20} className="text-primary" />
            <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: "-0.01em" }}>
              Dashboard
            </h1>
          </div>
          <p className="text-sm text-fg2">Real estate hiring intelligence — live view</p>
        </div>
        <ScrapeButton lastScraped={lastScrapedRow?.lastScraped?.toISOString() ?? null} />
      </div>

      {/* ── ROW 1: Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Postings"
          value={activePostings30.toLocaleString()}
          sub="last 30 days"
          trend={trendPct}
          color="#F97316"
          icon={Briefcase}
        />
        <StatCard
          label="Target Account Postings"
          value={targetPostings.toLocaleString()}
          sub="from target accounts"
          color="#FB923C"
          icon={Target}
        />
        <StatCard
          label="Actively Hiring Teams"
          value={activelyHiringTeams.toLocaleString()}
          sub="target accounts with live roles"
          color="#FDBA74"
          icon={Users}
        />
        <StatCard
          label="ISA Roles Open"
          value={isaCount.toLocaleString()}
          sub="active ISA postings"
          color="#737373"
          icon={Phone}
        />
      </div>

      {/* ── ROW 2: Market Snapshot ──────────────────────────────────────────── */}
      <div className="bg-surface border border-edge rounded-[10px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={15} className="text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">
            Market Snapshot
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">

          {topRole ? (
            <InsightPill dotColor="#F97316">
              Most hired role is{" "}
              <span className="text-ink font-semibold">{topRole.title}</span>
              {" "}— {topRole._count.title.toLocaleString()} open positions ({topRolePct}% of all postings)
            </InsightPill>
          ) : (
            <InsightPill dotColor="#F97316">No posting data yet — run a scrape to populate.</InsightPill>
          )}

          {topStateEntry ? (
            <InsightPill dotColor="#0891B2">
              Most hiring activity in{" "}
              <span className="text-ink font-semibold">{topStateEntry[0]}</span>
              {" "}with {topStateEntry[1].toLocaleString()} open roles
            </InsightPill>
          ) : (
            <InsightPill dotColor="#0891B2">No location data yet — state breakdown will appear after a scrape.</InsightPill>
          )}

          {topTeam ? (
            <InsightPill dotColor="#F97316">
              <span className="text-ink font-semibold">{topTeam.company}</span>
              {" "}is your most active target account —{" "}
              {topTeam._count.company} open {topTeam._count.company === 1 ? "role" : "roles"} right now
            </InsightPill>
          ) : (
            <InsightPill dotColor="#F97316">No target account postings yet — run a scrape to find hiring signals.</InsightPill>
          )}

          <InsightPill dotColor={isaAbove ? "#16A34A" : "#D97706"}>
            ISA roles represent{" "}
            <span className="text-ink font-semibold">{isaPct}%</span>
            {" "}of all real estate hiring —{" "}
            <span style={{ color: isaAbove ? "var(--success)" : "var(--warning)" }}>
              {isaAbove ? "above" : "below"}
            </span>
            {" "}market average of 30%
          </InsightPill>

        </div>
      </div>

      {/* ── ROW 3: Two columns ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-[55fr_45fr] gap-6">

        {/* LEFT — Target Accounts Hiring Now */}
        <div className="bg-surface border border-edge rounded-[10px] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">
              Target Accounts Hiring Now
            </p>
            <Link
              href="/signals"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              View all →
            </Link>
          </div>

          {targetTeamActivity.length === 0 ? (
            <p className="text-fg3 text-sm py-8 text-center">
              Quiet for now. Run a scrape to see who&apos;s hiring.
            </p>
          ) : (
            <div className="divide-y divide-edge -mx-6">
              {targetTeamActivity.map((t) => (
                <Link
                  key={t.company}
                  href="/signals"
                  className="flex items-center gap-3 px-6 py-3 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">{t.company}</p>
                    {latestTitleMap.get(t.company) && (
                      <p className="text-[13px] text-fg2 truncate mt-0.5">
                        {latestTitleMap.get(t.company)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-primary-soft text-primary text-[11px] font-semibold px-2 py-0.5 rounded border border-primary-muted whitespace-nowrap">
                      {t._count.company} {t._count.company === 1 ? "role" : "roles"}
                    </span>
                    <span className="text-xs text-fg3 whitespace-nowrap">
                      {timeAgo(t._max.createdAt?.toISOString() ?? null)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Recent Postings */}
        <div className="bg-surface border border-edge rounded-[10px] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">
              Recent Postings
            </p>
            <Link
              href="/postings"
              className="text-xs text-primary hover:text-primary-hover transition-colors"
            >
              View all →
            </Link>
          </div>

          {recentPostings.length === 0 ? (
            <p className="text-fg3 text-sm py-8 text-center">
              Quiet for now. Run a scrape to see who&apos;s hiring.
            </p>
          ) : (
            <div className="divide-y divide-edge -mx-6">
              {recentPostings.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-raised transition-colors"
                >
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded border ${roleBadge(p.title)}`}
                  >
                    {p.title.length > 18 ? p.title.slice(0, 18) + "…" : p.title}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {p.isTop100 && <Star size={10} className="text-amber-500 shrink-0" />}
                      <span className="text-[14px] font-semibold text-ink truncate">{p.company}</span>
                    </div>
                    {p.location && (
                      <span className="text-[12px] text-fg2 truncate block">{p.location}</span>
                    )}
                  </div>
                  <span className="text-[12px] text-fg3 shrink-0 whitespace-nowrap">
                    {timeAgo(p.scrapedAt.toISOString())}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
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

function roleBadge(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("inside sales") || /\bisa\b/.test(t))
    return "bg-primary-soft text-primary border-primary-muted";
  return "bg-surface-raised text-fg2 border-edge";
}

// ── InsightPill ───────────────────────────────────────────────────────────────

function InsightPill({ dotColor, children }: { dotColor: string; children: ReactNode }) {
  return (
    <div className="bg-surface-raised border border-edge rounded-[10px] p-4 flex items-start gap-3">
      <span
        className="w-2 h-2 rounded-full shrink-0 mt-1"
        style={{ background: dotColor }}
      />
      <p className="text-[13px] text-fg2 leading-snug">{children}</p>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

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
    <div
      className="bg-surface border border-edge rounded-[10px] overflow-hidden transition-all duration-200 hover:border-primary-muted hover:shadow-[0_2px_12px_rgba(249,115,22,0.08)]"
    >
      <div style={{ height: 2, background: color }} />
      <div className="p-6 relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-3">
          {label}
        </p>
        <p
          className="text-[38px] font-extrabold text-ink leading-none mb-2"
          style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </p>
        <div className="flex items-center gap-2">
          {trend != null && (
            <span
              className="flex items-center gap-0.5 text-[11px] font-semibold"
              style={{ color: trend >= 0 ? "var(--success)" : "var(--danger)" }}
            >
              {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {trend >= 0 ? "+" : ""}{trend}% vs prev 30d
            </span>
          )}
          {sub && <span className="text-[12px] text-fg3">{sub}</span>}
        </div>
        {/* Watermark icon */}
        <Icon
          size={28}
          className="absolute bottom-5 right-5"
          style={{ color, opacity: 0.12 }}
        />
      </div>
    </div>
  );
}
