import { NextResponse } from "next/server";
import { getISATeams } from "@/lib/supabase-data";

export const revalidate = 86400;

export async function GET() {
  const data = await getISATeams();
  return NextResponse.json(data);
}
