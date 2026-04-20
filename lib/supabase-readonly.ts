import { Pool } from "pg";
import { resolve4 } from "dns/promises";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set");
}

// Supabase direct DB URLs are IPv6-only on newer projects.
// Railway has no IPv6 routing, so we use the session pooler (IPv4).
// Each pooler region is region-specific — "Tenant not found" if wrong region.
// We probe all regions in parallel and keep the first that authenticates.

const POOLER_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-north-1",
  "ca-central-1", "sa-east-1",
];

async function probeRegion(
  region: string, ip: string, user: string, password: string, database: string
): Promise<Pool> {
  const pool = new Pool({
    host: ip, port: 5432, user, password, database,
    ssl: { rejectUnauthorized: false },
    max: 3, connectionTimeoutMillis: 8000,
  });
  const client = await pool.connect(); // throws if wrong region / auth fails
  await client.query("SELECT 1");
  client.release();
  console.log(`[supabase] connected via pooler ${region} (${ip})`);
  return pool;
}

async function buildPool(): Promise<Pool> {
  const url        = new URL(process.env.SUPABASE_DB_URL!);
  const hostname   = url.hostname;
  const password   = decodeURIComponent(url.password);
  const database   = url.pathname.replace(/^\//, "");
  const projectRef = hostname.split(".")[1] ?? "";

  // ── Attempt 1: direct connection (works if project has IPv4) ─────────────
  try {
    const [ip] = await resolve4(hostname);
    const pool = new Pool({
      host: ip, port: 5432, user: "postgres", password, database,
      ssl: { rejectUnauthorized: false }, max: 3,
    });
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log(`[supabase] direct IPv4 ${hostname} → ${ip}`);
    return pool;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    const isIPv6Only = code === "ENODATA" || code === "ENOTFOUND";
    if (!isIPv6Only) console.log(`[supabase] direct failed (${code}), trying pooler`);
    else console.log(`[supabase] IPv6-only direct URL, trying session pooler across all regions`);
  }

  // ── Attempt 2: probe all pooler regions in parallel ───────────────────────
  const user = `postgres.${projectRef}`;

  const probes = POOLER_REGIONS.map(async (region) => {
    const [ip] = await resolve4(`aws-0-${region}.pooler.supabase.com`);
    return probeRegion(region, ip, user, password, database);
  });

  try {
    // Promise.any resolves with the first successful probe
    return await Promise.any(probes);
  } catch {
    console.error("[supabase] all pooler regions failed");
    // Last resort: return a pool using the raw hostname (will error at query time)
    return new Pool({
      host: hostname, port: 5432, user: "postgres", password, database,
      ssl: { rejectUnauthorized: false }, max: 3,
    });
  }
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
