import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/gemini";

// ── Shared types (imported by the patterns page) ──────────────────────────────

export interface RoleDemand {
  role: string;
  count: number;
  percentOfTotal: number;
  trend: "rising" | "stable" | "declining";
  trendReason: string;
  topStates: string[];
  topCompanies: string[];
}

export interface GeographicHotspot {
  state: string;
  totalPostings: number;
  dominantRole: string;
  insight: string;
}

export interface EmergingSignal {
  signal: string;
  implication: string;
}

export interface FelloOpportunity {
  opportunity: string;
  reason: string;
}

export interface AnalysisData {
  roleDemand: RoleDemand[];
  geographicHotspots: GeographicHotspot[];
  emergingSignals: EmergingSignal[];
  felloOpportunities: FelloOpportunity[];
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractState(location: string | null): string | null {
  if (!location) return null;
  // Match trailing 2-letter state code: "Atlanta, GA" → "GA"
  const match = location.match(/\b([A-Z]{2})\s*$/);
  return match ? match[1] : null;
}

function normalizeRole(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("transaction coordinator"))                         return "Transaction Coordinator";
  if (t.includes("inside sales") || /\bisa\b/.test(t))             return "Inside Sales Agent";
  if (t.includes("listing coordinator"))                            return "Listing Coordinator";
  if (t.includes("showing agent"))                                  return "Showing Agent";
  if (t.includes("team lead"))                                      return "Real Estate Team Lead";
  if (t.includes("operations manager") || t.includes("ops manager")) return "Real Estate Operations Manager";
  if (t.includes("marketing manager") || t.includes("marketing director")) return "Real Estate Marketing Manager";
  if (t.includes("administrative assistant") || t.includes("admin assistant")) return "Real Estate Administrative Assistant";
  if (t.includes("buyer"))                                          return "Buyer Agent";
  return "Real Estate Agent";
}

// ── runAnalysis ───────────────────────────────────────────────────────────────
// Fetches all active postings, sends to Gemini for structured analysis,
// and persists the result in the Analysis table.

export async function runAnalysis(): Promise<void> {
  const postings = await prisma.jobPosting.findMany({
    where:   { isActive: true },
    select:  { title: true, company: true, location: true, postedAt: true, source: true },
    orderBy: { scrapedAt: "desc" },
    take:    500,
  });

  if (postings.length === 0) {
    console.log("[Analysis] No active postings — skipping");
    return;
  }

  const prepared = postings.map((p) => ({
    normalizedRole: normalizeRole(p.title),
    company:        p.company,
    state:          extractState(p.location),
    postedAt:       p.postedAt ? p.postedAt.toISOString().slice(0, 10) : null,
    source:         p.source,
  }));

  console.log(`[Analysis] Sending ${prepared.length} active postings to Gemini...`);

  const prompt = `You are a hiring intelligence analyst for a real estate sales platform called Fello.
Fello's customers are real estate teams across the USA.
Here is the current job posting data from real estate teams:
${JSON.stringify(prepared)}
Analyze this data and return a JSON object with exactly these keys:
{
  "roleDemand": [
    {
      "role": string,
      "count": number,
      "percentOfTotal": number,
      "trend": "rising" | "stable" | "declining",
      "trendReason": string,
      "topStates": [string],
      "topCompanies": [string]
    }
  ],
  "geographicHotspots": [
    {
      "state": string,
      "totalPostings": number,
      "dominantRole": string,
      "insight": string
    }
  ],
  "emergingSignals": [
    {
      "signal": string,
      "implication": string
    }
  ],
  "felloOpportunities": [
    {
      "opportunity": string,
      "reason": string
    }
  ],
  "summary": string
}
roleDemand: one entry per distinct normalizedRole, sorted by count descending.
geographicHotspots: top 8 states by total postings, sorted descending.
emergingSignals: 3-5 sharp, specific observations grounded in the data (not generic).
felloOpportunities: 3-5 specific teams or segments Fello should target right now.
trendReason: one sharp sentence — why this role is rising, stable, or declining based on the data.
insight / implication / reason: one direct, actionable sentence each.
summary: 3-4 sentence executive summary.
Base all insights strictly on the data provided. Be specific, not generic. No markdown, no backticks.`;

  try {
    const data = await generateJSON<AnalysisData>(prompt);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.analysis.create({ data: { data: data as any } });
    console.log(
      `[Analysis] Saved — ${data.roleDemand?.length ?? 0} roles, ` +
      `${data.emergingSignals?.length ?? 0} signals, ` +
      `${data.felloOpportunities?.length ?? 0} opportunities`
    );
  } catch (e) {
    console.error("[Analysis] Failed:", e instanceof Error ? e.message : e);
    throw e;
  }
}
