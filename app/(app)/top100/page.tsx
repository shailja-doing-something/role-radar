import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";
import { Top100Client } from "./top100-client";

export default async function Top100Page() {
  const teams = await prisma.top100Team.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div className="p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-white mb-2">
        <Trophy size={22} className="text-blue-400" />
        Top 100 Teams
      </h1>

      <Top100Client teams={teams} />
    </div>
  );
}
