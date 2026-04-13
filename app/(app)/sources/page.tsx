import { prisma } from "@/lib/prisma";
import { Database } from "lucide-react";
import { SourceControls } from "./source-controls";

export default async function SourcesPage() {
  const boards = await prisma.jobBoard.findMany({
    orderBy: { name: "asc" },
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
              <th className="text-left text-gray-500 font-medium px-6 py-3">
                Board
              </th>
              <th className="text-left text-gray-500 font-medium px-6 py-3">
                Slug
              </th>
              <th className="text-right text-gray-500 font-medium px-6 py-3">
                Postings
              </th>
              <th className="text-left text-gray-500 font-medium px-6 py-3">
                Last Scraped
              </th>
              <th className="text-right text-gray-500 font-medium px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {boards.map((board) => (
              <tr
                key={board.id}
                className="border-b border-gray-800/50 last:border-0"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        board.active ? "bg-green-400" : "bg-gray-600"
                      }`}
                    />
                    <span className="text-gray-200 font-medium">
                      {board.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded">
                    {board.slug}
                  </code>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-blue-400 font-semibold">
                    {board._count.postings}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-500 text-xs">
                    {board.lastScraped
                      ? new Date(board.lastScraped).toLocaleString()
                      : "Never"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <SourceControls
                    id={board.id}
                    slug={board.slug}
                    active={board.active}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
