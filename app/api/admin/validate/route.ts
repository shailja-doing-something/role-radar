import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    totalAccounts,
    priorityAccounts,
    linkedAccounts,
    matchedAccounts,
    totalPostings,
    activePostings,
    top100Postings,
    priorityPostings,
    lastScrape,
  ] = await Promise.all([
    prisma.targetAccount.count(),
    prisma.targetAccount.count({ where: { isPriority: true } }),
    prisma.targetAccount.count({ where: { supabaseTeamId: { not: null } } }),
    prisma.targetAccount.count({ where: { isMatched: true } }),
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobPosting.count({ where: { isActive: true, isTop100: true } }),
    prisma.jobPosting.count({ where: { isActive: true, isPriorityAccount: true } }),
    prisma.scrapeRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, status: true } }),
  ]);

  const warnings: string[] = [];
  if (priorityAccounts !== totalAccounts)
    warnings.push(`${totalAccounts - priorityAccounts} accounts missing isPriority=true`);
  if (priorityPostings > top100Postings)
    warnings.push("isPriorityAccount count > isTop100 count — check Layer 5 logic");
  if (top100Postings > activePostings)
    warnings.push("isTop100 count exceeds total active postings");
  if (totalAccounts < 95)
    warnings.push(`Only ${totalAccounts} accounts — expected at least 95`);

  const report = {
    accounts: {
      total:          totalAccounts,
      isPriority:     priorityAccounts,
      supabaseLinked: linkedAccounts,
      matched:        matchedAccounts,
    },
    postings: {
      total:             totalPostings,
      active:            activePostings,
      isTop100:          top100Postings,
      isPriorityAccount: priorityPostings,
    },
    lastScrape: lastScrape ?? null,
    warnings,
    ok: warnings.length === 0,
  };

  console.log(
    `[Validate] Accounts: ${totalAccounts} total | ${priorityAccounts} priority` +
    ` | ${linkedAccounts} Supabase-linked | ${matchedAccounts} matched`
  );
  console.log(
    `[Validate] Postings: ${activePostings} active | ${top100Postings} isTop100` +
    ` | ${priorityPostings} isPriorityAccount`
  );
  if (warnings.length > 0) warnings.forEach((w) => console.warn(`[Validate] WARNING: ${w}`));

  return NextResponse.json(report);
}
