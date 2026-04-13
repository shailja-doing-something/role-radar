import { prisma } from "@/lib/prisma";
import { LayoutDashboard, ExternalLink, MapPin, DollarSign } from "lucide-react";
import { DashboardCharts } from "./charts";
import { ScrapeButton } from "./scrape-button";

export default async function DashboardPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    recentByPostedAt,
    activeSources,
    topCompanies,
    recentPostings,
    remoteCount,
    dailyRaw,
    topPatterns,
  ] = await Promise.all([
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { postedAt: { gte: sevenDaysAgo } } }),
    prisma.jobBoard.count({ where: { active: true } }),
    prisma.jobPosting.groupBy({
      by: ["company"],
      _count: { company: true },
      orderBy: { _count: { company: "desc" } },
      take: 8,
    }),
    prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, company: true, source: true,
        url: true, location: true, remote: true, salary: true,
        postedAt: true, createdAt: true,
      },
    }),
    prisma.jobPosting.count({ where: { remote: true } }),
    prisma.jobPosting.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.pattern.findMany({
      orderBy: { count: "desc" },
      take: 8,
      select: { keyword: true, count: true, category: true },
    }),
  ]);

  // Aggregate daily counts
  const dailyCounts: Record<string, number> = {};
  for (const p of dailyRaw) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }
  const volumeData = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count })); // "04-13" not "2026-04-13"

  const remoteRatio = [
    { name: "Remote", value: remoteCount, fill: "#3b82f6" },
    { name: "On-site", value: total - remoteCount, fill: "#1e3a5f" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <LayoutDashboard size={22} className="text-blue-400" />
          Dashboard
        </h1>
        <ScrapeButton />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Postings" value={total.toLocaleString()} />
        <StatCard label="New This Week" value={recentByPostedAt.toLocaleString()} sub="by post date" />
        <StatCard label="Active Sources" value={activeSources.toLocaleString()} />
        <StatCard label="Remote Roles" value={`${total ? Math.round((remoteCount / total) * 100) : 0}%`} sub={`${remoteCount} of ${total}`} />
      </div>

      {/* Charts */}
      <DashboardCharts
        volumeData={volumeData}
        remoteRatio={remoteRatio}
        topPatterns={topPatterns}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top Companies */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Top Companies (scraped postings)</h2>
          {topCompanies.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet — scrape from Sources.</p>
          ) : (
            <div className="space-y-2">
              {topCompanies.map((c, i) => (
                <div key={c.company} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-gray-300 text-sm truncate">{c.company}</span>
                      <span className="text-blue-400 text-xs font-medium ml-2 shrink-0">
                        {c._count.company}
                      </span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${(c._count.company / topCompanies[0]._count.company) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Postings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Recent Postings</h2>
          {recentPostings.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet — scrape from Sources.</p>
          ) : (
            <div className="space-y-3">
              {recentPostings.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-300 text-sm truncate group-hover:text-white transition-colors">
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-gray-500 text-xs">{p.company}</span>
                        {p.remote && (
                          <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">
                            Remote
                          </span>
                        )}
                        {p.location && !p.remote && (
                          <span className="flex items-center gap-0.5 text-gray-500 text-xs">
                            <MapPin size={10} />{p.location}
                          </span>
                        )}
                        {p.salary && (
                          <span className="flex items-center gap-0.5 text-green-400 text-xs">
                            <DollarSign size={10} />{p.salary.slice(0, 20)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-gray-600 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
