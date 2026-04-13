import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.jobBoard.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { postings: true } } },
  });
  return Response.json(boards);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, slug, baseUrl } = body as {
    name: string;
    slug: string;
    baseUrl: string;
  };

  if (!name || !slug || !baseUrl) {
    return Response.json(
      { error: "name, slug, and baseUrl are required" },
      { status: 400 }
    );
  }

  const board = await prisma.jobBoard.create({
    data: { name, slug, baseUrl },
  });

  return Response.json(board, { status: 201 });
}
