import { NextResponse } from "next/server";
import { getMarketingOpsTeams } from "@/lib/supabase-data";

export const revalidate = 86400;

export async function GET() {
  const data = await getMarketingOpsTeams();
  return NextResponse.json(data);
}
