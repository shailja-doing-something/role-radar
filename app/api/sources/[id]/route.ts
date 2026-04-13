import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const board = await prisma.jobBoard.update({
    where: { id: parseInt(id) },
    data: body,
  });

  return Response.json(board);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.jobBoard.delete({ where: { id: parseInt(id) } });

  return new Response(null, { status: 204 });
}
