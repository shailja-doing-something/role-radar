import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Invalid id." }, { status: 400 });
  }

  await prisma.targetAccount.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
