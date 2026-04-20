import { Pool } from "pg";
import { resolve4 } from "dns/promises";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set");
}

// Supabase direct DB URLs are IPv6-only on newer projects.
// Railway has no IPv6 routing (ENETUNREACH), so we must use
// the Supabase session pooler which exposes IPv4 endpoints.
//
// Strategy:
//   1. Try resolve4 on the direct hostname — works if IPv4 is available.
//   2. On ENODATA (IPv6-only), scan all Supabase pooler regions in parallel,
//      use the first that resolves. Pooler needs username = postgres.<ref>.

const POOLER_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-north-1",
  "ca-central-1", "sa-east-1",
];

async function buildPool(): Promise<Pool> {
  const url      = new URL(process.env.SUPABASE_DB_URL!);
  const hostname = url.hostname;                            // db.<ref>.supabase.co
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "");

  // Extract project ref: db.XXXXXXXX.supabase.co → XXXXXXXX
  const projectRef = hostname.split(".")[1] ?? "";

  // ── Attempt 1: direct IPv4 ────────────────────────────────────────────────
  try {
    const [ip] = await resolve4(hostname);
    console.log(`[supabase] direct IPv4 ${hostname} → ${ip}`);
    return new Pool({
      host: ip, port: 5432,
      user: "postgres", password, database,
      ssl: { rejectUnauthorized: false }, max: 3,
    });
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENODATA" && code !== "ENOTFOUND") throw e; // unexpected error
    console.log(`[supabase] direct hostname is IPv6-only (${code}), switching to session pooler`);
  }

  // ── Attempt 2: session pooler (IPv4) ─────────────────────────────────────
  const poolerResults = await Promise.allSettled(
    POOLER_REGIONS.map(async (region) => {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const [ip] = await resolve4(host);
      return { ip, region };
    })
  );

  for (const result of poolerResults) {
    if (result.status === "fulfilled") {
      const { ip, region } = result.value;
      console.log(`[supabase] pooler ${region} → ${ip}`);
      return new Pool({
        host: ip, port: 5432,
        user: `postgres.${projectRef}`, password, database,
        ssl: { rejectUnauthorized: false }, max: 3,
      });
    }
  }

  // ── Attempt 3: last resort — original hostname (may fail at connect time) ─
  console.error("[supabase] all IPv4 resolution attempts failed, using raw hostname");
  return new Pool({
    host: hostname, port: 5432,
    user: "postgres", password, database,
    ssl: { rejectUnauthorized: false }, max: 3,
  });
}

const poolPromise: Promise<Pool> = buildPool();

const FORBIDDEN = /^\s*(insert|update|delete|drop|alter|create|truncate|replace)/i;

export async function readonlyQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (FORBIDDEN.test(sql.trim())) {
    throw new Error("Write operations are not permitted on the Supabase read-only connection.");
  }
  const pool   = await poolPromise;
  const client = await pool.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    client.release();
  }
}

export default poolPromise;
