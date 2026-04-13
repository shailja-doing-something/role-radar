import { prisma } from "@/lib/prisma";
import { TrendingUp } from "lucide-react";
import { AnalyzeButton } from "./analyze-button";

const CATEGORY_COLORS: Record<string, string> = {
  language: "bg-blue-900/50 text-blue-300 border-blue-800",
  framework: "bg-purple-900/50 text-purple-300 border-purple-800",
  platform: "bg-orange-900/50 text-orange-300 border-orange-800",
  database: "bg-green-900/50 text-green-300 border-green-800",
  tool: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  cloud: "bg-sky-900/50 text-sky-300 border-sky-800",
  domain: "bg-pink-900/50 text-pink-300 border-pink-800",
};

export default async function PatternsPage() {
  const patterns = await prisma.pattern.findMany({
    orderBy: { count: "desc" },
    take: 100,
  });

  const grouped = patterns.reduce<Record<string, typeof patterns>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {}
  );

  const maxCount = patterns[0]?.count ?? 1;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <TrendingUp size={22} className="text-blue-400" />
          Patterns
        </h1>
        <AnalyzeButton />
      </div>

      {patterns.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <TrendingUp size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            No patterns yet. Click &ldquo;Analyze&rdquo; to extract skill patterns from
            your job postings.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 capitalize">
                {category}
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                {items.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${
                        CATEGORY_COLORS[p.category] ??
                        "bg-gray-800 text-gray-300 border-gray-700"
                      }`}
                    >
                      {p.keyword}
                    </span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(p.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-500 text-xs w-6 text-right">
                      {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
