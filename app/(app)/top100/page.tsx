import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";
import { Top100Client } from "./top100-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Target Accounts — RoleRadar" };

export default async function Top100Page() {
  const [teamsRaw, postingCounts] = await Promise.all([
    prisma.top100Team.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, brokerage: true, location: true, website: true, isMatched: true, createdAt: true },
    }),
    prisma.jobPosting.groupBy({
      by: ["company"],
      where: { isTop100: true, isActive: true },
      _count: { company: true },
    }),
  ]);

  const countMap = new Map(postingCounts.map((p) => [p.company.toLowerCase(), p._count.company]));
  const teams = teamsRaw.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    roleCount: countMap.get(t.name.toLowerCase()) ?? 0,
  }));

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Trophy size={20} className="text-primary" />
            <h1 className="text-2xl font-semibold text-ink">Target Accounts</h1>
          </div>
          <p className="text-sm text-fg2">Target accounts tracked for ISA &amp; ops hiring signals</p>
        </div>
      </div>
      <Top100Client teams={teams} />
    </div>
  );
}
