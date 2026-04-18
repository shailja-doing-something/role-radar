import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const VALID_PRESENCE = ["Confirmed", "Likely", "None", "Unknown"] as const;
type Presence = (typeof VALID_PRESENCE)[number];

function isValid(v: unknown): v is Presence {
  return VALID_PRESENCE.includes(v as Presence);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as Record<string, unknown>;
  const data: Partial<{ isaPresence: string; marketingOpsPresence: string }> = {};

  if (body.isaPresence !== undefined) {
    if (!isValid(body.isaPresence)) return Response.json({ error: "Invalid isaPresence" }, { status: 400 });
    data.isaPresence = body.isaPresence;
  }
  if (body.marketingOpsPresence !== undefined) {
    if (!isValid(body.marketingOpsPresence)) return Response.json({ error: "Invalid marketingOpsPresence" }, { status: 400 });
    data.marketingOpsPresence = body.marketingOpsPresence;
  }

  if (Object.keys(data).length === 0) return Response.json({ error: "No fields to update" }, { status: 400 });

  const updated = await prisma.top100Team.update({ where: { id: numId }, data });
  return Response.json(updated);
}
