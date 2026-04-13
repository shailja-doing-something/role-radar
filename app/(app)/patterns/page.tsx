import { prisma } from "@/lib/prisma";
import { TrendingUp } from "lucide-react";
import { AnalyzeButton } from "./analyze-button";
import { PatternsClient } from "./patterns-client";

export default async function PatternsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string }>;
}) {
  const { period: periodParam, category: categoryParam } = await searchParams;

  // All available periods for the selector
  const allPeriods = await prisma.pattern.findMany({
    select: { period: true },
    distinct: ["period"],
    orderBy: { period: "desc" },
  });

  const latestPeriod = allPeriods[0]?.period ?? null;
  const activePeriod = periodParam ?? latestPeriod;

  const patterns = await prisma.pattern.findMany({
    where: {
      ...(activePeriod ? { period: activePeriod } : {}),
      ...(categoryParam ? { category: categoryParam } : {}),
    },
    orderBy: { count: "desc" },
    take: 150,
  });

  const periods = allPeriods.map((p) => p.period);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <TrendingUp size={22} className="text-blue-400" />
          Skill Patterns
        </h1>
        <AnalyzeButton />
      </div>

      <PatternsClient
        patterns={patterns}
        periods={periods}
        activePeriod={activePeriod}
        activeCategory={categoryParam ?? ""}
      />
    </div>
  );
}
