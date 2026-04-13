"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp } from "lucide-react";

interface Pattern {
  id: number;
  keyword: string;
  category: string;
  count: number;
  period: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  language:  "bg-blue-900/50 text-blue-300 border-blue-800",
  framework: "bg-purple-900/50 text-purple-300 border-purple-800",
  platform:  "bg-orange-900/50 text-orange-300 border-orange-800",
  database:  "bg-green-900/50 text-green-300 border-green-800",
  tool:      "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  cloud:     "bg-sky-900/50 text-sky-300 border-sky-800",
  domain:    "bg-pink-900/50 text-pink-300 border-pink-800",
};

const ALL_CATEGORIES = ["language", "framework", "platform", "database", "tool", "cloud", "domain"];

interface Props {
  patterns: Pattern[];
  periods: string[];
  activePeriod: string | null;
  activeCategory: string;
}

export function PatternsClient({ patterns, periods, activePeriod, activeCategory }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/patterns?${params.toString()}`);
  }

  const grouped = patterns.reduce<Record<string, Pattern[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const maxCount = patterns[0]?.count ?? 1;
  const categoriesToShow = activeCategory
    ? [activeCategory]
    : Object.keys(grouped);

  if (patterns.length === 0 && periods.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <TrendingUp size={32} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          No patterns yet. Patterns are extracted automatically after each scrape,
          or click &ldquo;Analyze&rdquo; to run now.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Period selector */}
        {periods.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Period</span>
            <div className="flex gap-1">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => navigate("period", p)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    p === activePeriod
                      ? "bg-blue-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Category</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => navigate("category", "")}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                !activeCategory
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate("category", cat)}
                className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
                  cat === activeCategory
                    ? "bg-blue-600 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {patterns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No patterns for this period / category.
        </div>
      ) : (
        <div className="space-y-6">
          {categoriesToShow.map((category) => {
            const items = grouped[category];
            if (!items?.length) return null;
            return (
              <div key={category}>
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 capitalize">
                  {category} <span className="text-gray-600 font-normal">({items.length})</span>
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2.5">
                  {items.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 min-w-20 text-center ${
                          CATEGORY_COLORS[p.category] ?? "bg-gray-800 text-gray-300 border-gray-700"
                        }`}
                      >
                        {p.keyword}
                      </span>
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(p.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs font-medium w-8 text-right shrink-0">
                        {p.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
