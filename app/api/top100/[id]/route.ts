import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return Response.json({ error: "Invalid id." }, { status: 400 });
  }

  await prisma.top100Team.delete({ where: { id: numId } });
  return new Response(null, { status: 204 });
}
