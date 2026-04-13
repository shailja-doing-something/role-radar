import { prisma } from "@/lib/prisma";
import { TrendingUp } from "lucide-react";
import { PatternsClient } from "./patterns-client";
import { AnalyzeButton } from "./analyze-button";
import type { AnalysisData } from "@/lib/analysis";

export default async function PatternsPage() {
  const latest = await prisma.analysis.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <TrendingUp size={22} className="text-blue-400" />
          Hiring Intelligence
        </h1>
        <AnalyzeButton />
      </div>

      {latest ? (
        <PatternsClient
          analysis={latest.data as unknown as AnalysisData}
          createdAt={latest.createdAt.toISOString()}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <TrendingUp size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            No analysis yet. Run a scrape or click &ldquo;Refresh Analysis&rdquo; to generate insights.
          </p>
        </div>
      )}
    </div>
  );
}
