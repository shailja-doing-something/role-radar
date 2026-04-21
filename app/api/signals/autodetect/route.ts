import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/gemini";

interface TeamInput {
  id:        string;
  teamName:  string;
  brokerage: string | null;
  location:  string | null;
}

interface GeminiResult {
  teamName:             string;
  isaPresence:          string;
  marketingOpsPresence: string;
  reasoning:            string;
}

const VALID_PRESENCE = new Set(["Confirmed", "Likely", "None", "Unknown"]);

export async function POST(req: Request) {
  const body = await req.json() as { teams?: TeamInput[] };
  if (!Array.isArray(body.teams) || body.teams.length === 0) {
    return Response.json({ error: "teams array required" }, { status: 400 });
  }

  const teams = body.teams.slice(0, 5); // hard cap per call

  const prompt =
    `For each of these real estate teams, based on their name, brokerage, and any common knowledge of team structures, estimate:\n` +
    `1. Whether they likely have a dedicated ISA (Inside Sales Agent) structure\n` +
    `2. Whether they likely have a dedicated Marketing or Operations team member\n\n` +
    `Teams: ${JSON.stringify(teams.map(t => ({ teamName: t.teamName, brokerage: t.brokerage, location: t.location })))}\n\n` +
    `Respond with a JSON array in the same order. Each item:\n` +
    `{ "teamName": string, "isaPresence": "Confirmed" | "Likely" | "None" | "Unknown", "marketingOpsPresence": "Confirmed" | "Likely" | "None" | "Unknown", "reasoning": string }\n` +
    `No markdown, no backticks.`;

  let results: GeminiResult[];
  try {
    results = await generateJSON<GeminiResult[]>(prompt);
  } catch {
    return Response.json({ error: "Gemini analysis failed" }, { status: 500 });
  }

  const saved = [];
  for (let i = 0; i < teams.length; i++) {
    const team   = teams[i];
    const result = results[i];
    if (!result) continue;

    const isaPresence          = VALID_PRESENCE.has(result.isaPresence)          ? result.isaPresence          : "Unknown";
    const marketingOpsPresence = VALID_PRESENCE.has(result.marketingOpsPresence) ? result.marketingOpsPresence : "Unknown";

    try {
      const updated = await prisma.targetAccount.update({
        where: { id: team.id },
        data:  { isaPresence, marketingOpsPresence },
      });
      saved.push({ ...updated, reasoning: result.reasoning });
    } catch { /* skip */ }
  }

  return Response.json({ saved });
}
