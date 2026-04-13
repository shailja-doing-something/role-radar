import { prisma } from "@/lib/prisma";
import { LayoutDashboard, ExternalLink } from "lucide-react";

export default async function DashboardPage() {
  const [total, recent, activeSources, topCompanies, recentPostings] =
    await Promise.all([
      prisma.jobPosting.count(),
      prisma.jobPosting.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.jobBoard.count({ where: { active: true } }),
      prisma.jobPosting.groupBy({
        by: ["company"],
        _count: { company: true },
        orderBy: { _count: { company: "desc" } },
        take: 5,
      }),
      prisma.jobPosting.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          company: true,
          source: true,
          url: true,
          createdAt: true,
        },
      }),
    ]);

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
        <LayoutDashboard size={22} className="text-blue-400" />
        Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Postings" value={total.toLocaleString()} />
        <StatCard label="New This Week" value={recent.toLocaleString()} />
        <StatCard label="Active Sources" value={activeSources.toLocaleString()} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Companies */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Top Hiring Companies</h2>
          {topCompanies.length === 0 ? (
            <p className="text-gray-500 text-sm">No postings yet. Run a scrape from Sources.</p>
          ) : (
            <div className="space-y-3">
              {topCompanies.map((c) => (
                <div key={c.company} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm truncate">{c.company}</span>
                  <span className="text-blue-400 text-sm font-medium ml-4 shrink-0">
                    {c._count.company} roles
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Postings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Recent Postings</h2>
          {recentPostings.length === 0 ? (
            <p className="text-gray-500 text-sm">No postings yet. Run a scrape from Sources.</p>
          ) : (
            <div className="space-y-3">
              {recentPostings.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-gray-300 text-sm truncate group-hover:text-white transition-colors">
                      {p.title}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {p.company} · {p.source}
                    </p>
                  </div>
                  <ExternalLink size={13} className="text-gray-600 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  );
}
