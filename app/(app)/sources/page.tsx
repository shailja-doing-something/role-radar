import { prisma } from "@/lib/prisma";
import { Database, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { SourceControls } from "./source-controls";

export default async function SourcesPage() {
  const boards = await prisma.jobBoard.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { postings: true } } },
  });

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
        <Database size={22} className="text-blue-400" />
        Sources
      </h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-medium px-6 py-3">Board</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Total</th>
              <th className="text-right text-gray-500 font-medium px-4 py-3">Last run</th>
              <th className="text-left text-gray-500 font-medium px-4 py-3">Last scraped</th>
              <th className="text-right text-gray-500 font-medium px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((board) => {
              const hasError  = !!board.lastError;
              const scraped   = board.lastScraped;
              const lastCount = board.lastScrapedCount;
              const isWorking = scraped && !hasError && (lastCount ?? 0) > 0;
              const isWarning = scraped && !hasError && lastCount === 0;

              return (
                <tr key={board.id} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          board.active ? "bg-green-400" : "bg-gray-600"
                        }`}
                      />
                      <div>
                        <span className="text-gray-200 font-medium">{board.name}</span>
                        <code className="text-gray-600 text-xs ml-2">{board.slug}</code>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {!board.active ? (
                      <span className="text-xs text-gray-600">Disabled</span>
                    ) : hasError ? (
                      <span className="flex items-center gap-1 text-red-400 text-xs" title={board.lastError ?? ""}>
                        <AlertCircle size={13} /> Error
                      </span>
                    ) : isWorking ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle size={13} /> OK
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1 text-yellow-400 text-xs">
                        <AlertCircle size={13} /> 0 results
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span className="text-blue-400 font-semibold">
                      {board._count.postings}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right">
                    {lastCount !== null && lastCount !== undefined ? (
                      <span className={`text-xs font-medium ${lastCount > 0 ? "text-green-400" : "text-gray-500"}`}>
                        +{lastCount}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-gray-500 text-xs">
                      {scraped
                        ? new Date(scraped).toLocaleString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                    {hasError && (
                      <p className="text-red-500 text-xs mt-0.5 max-w-48 truncate" title={board.lastError ?? ""}>
                        {board.lastError}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
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
