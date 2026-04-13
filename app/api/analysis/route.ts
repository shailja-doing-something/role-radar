import { prisma } from "@/lib/prisma";
import { runAnalysis } from "@/lib/analysis";

export async function GET() {
  const latest = await prisma.analysis.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(latest ?? null);
}

export async function POST() {
  try {
    await runAnalysis();
    const latest = await prisma.analysis.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ ok: true, analysis: latest });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
