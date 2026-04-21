import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const teamName = (body?.teamName ?? body?.name ?? "").trim();
  if (!teamName) {
    return Response.json({ error: "Team name is required." }, { status: 400 });
  }

  const team = await prisma.targetAccount.create({
    data: {
      teamName,
      brokerage: body.brokerage?.trim() || null,
      location:  body.location?.trim()  || null,
      website:   body.website?.trim()   || null,
    },
  });

  return Response.json(team, { status: 201 });
}
