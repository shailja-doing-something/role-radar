import { prisma } from "@/lib/prisma";
import { Database, AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { SourceControls } from "./source-controls";
import { AddSourceForm } from "./add-source-form";

export default async function SourcesPage() {
  const boards = await prisma.jobBoard.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { postings: true } } },
  });

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Database size={20} className="text-primary" />
            <h1 className="text-2xl font-semibold text-ink">Sources</h1>
          </div>
          <p className="text-sm text-fg2">Job boards configured for scraping</p>
        </div>
        <AddSourceForm />
      </div>

      {/* Table */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              {["Board", "Status", "Total", "Last run", "Last scraped", ""].map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 ${i === 0 ? "text-left" : i >= 2 && i <= 3 ? "text-right" : i === 5 ? "" : "text-left"}`}
                >
                  {h && (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">
                      {h}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {boards.map((board) => {
              const hasError  = !!board.lastError;
              const scraped   = board.lastScraped;
              const lastCount = board.lastScrapedCount;
              const isWorking = scraped && !hasError && (lastCount ?? 0) > 0;
              const isWarning = scraped && !hasError && lastCount === 0;

              return (
                <tr key={board.id} className="hover:bg-surface-raised transition-colors">
                  {/* Board */}
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                          board.active ? "bg-green-500" : "bg-fg3"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <a
                            href={board.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink font-medium hover:text-primary transition-colors"
                          >
                            {board.name}
                          </a>
                          <code className="text-fg3 text-xs">{board.slug}</code>
                          <a
                            href={board.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fg3 hover:text-primary transition-colors shrink-0"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                              board.category === "niche"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-surface-raised border border-edge text-fg3"
                            }`}
                          >
                            {board.category}
                          </span>
                        </div>
                        {board.description && (
                          <p className="text-fg3 text-xs mt-0.5 max-w-xs">{board.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    {!board.active ? (
                      <span className="text-xs text-fg3">Disabled</span>
                    ) : hasError ? (
                      <span className="flex items-center gap-1.5 text-red-600 text-xs" title={board.lastError ?? ""}>
                        <AlertCircle size={13} /> Error
                      </span>
                    ) : isWorking ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-xs">
                        <CheckCircle size={13} /> OK
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1.5 text-amber-600 text-xs">
                        <AlertCircle size={13} /> 0 results
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-fg3 text-xs">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </td>

                  {/* Total postings */}
                  <td className="px-5 py-4 text-right">
                    <span className="text-primary font-semibold tabular-nums">
                      {board._count.postings.toLocaleString()}
                    </span>
                  </td>

                  {/* Last run count */}
                  <td className="px-5 py-4 text-right">
                    {lastCount !== null && lastCount !== undefined ? (
                      <span className={`text-xs font-semibold tabular-nums ${lastCount > 0 ? "text-green-600" : "text-fg3"}`}>
                        +{lastCount}
                      </span>
                    ) : (
                      <span className="text-fg3 text-xs">—</span>
                    )}
                  </td>

                  {/* Last scraped timestamp */}
                  <td className="px-5 py-4">
                    <span className="text-fg2 text-xs">
                      {scraped
                        ? new Date(scraped).toLocaleString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                    {hasError && (
                      <p className="text-red-600 text-xs mt-0.5 max-w-48 truncate" title={board.lastError ?? ""}>
                        {board.lastError}
                      </p>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <SourceControls id={board.id} slug={board.slug} active={board.active} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
