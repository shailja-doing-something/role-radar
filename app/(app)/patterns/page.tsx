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
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <TrendingUp size={20} className="text-primary" />
            <h1 className="text-2xl font-semibold text-ink">Patterns</h1>
          </div>
          <p className="text-sm text-fg2">
            Gemini-powered hiring intelligence from your scraped data
          </p>
        </div>
        <AnalyzeButton lastAnalyzed={latest?.createdAt.toISOString() ?? null} />
      </div>

      {latest ? (
        <PatternsClient
          analysis={latest.data as unknown as AnalysisData}
          createdAt={latest.createdAt.toISOString()}
        />
      ) : (
        <div className="bg-surface border border-edge rounded-xl p-12 text-center">
          <TrendingUp size={32} className="text-fg3 mx-auto mb-3" />
          <p className="text-fg2 text-sm">
            No analysis yet — run a scrape first, then click &ldquo;Refresh Analysis&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}
