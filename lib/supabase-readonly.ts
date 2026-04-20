import { Pool } from "pg";
import { resolve4 } from "dns/promises";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set");
}

// Parse connection string and resolve hostname to IPv4.
// Passing host as a resolved IP bypasses all pg/Node DNS resolution,
// which defaults to IPv6 on Railway (ENETUNREACH).
async function buildPool(): Promise<Pool> {
  const url      = new URL(process.env.SUPABASE_DB_URL!);
  const hostname = url.hostname;
  const port     = parseInt(url.port || "5432", 10);
  const user     = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "");

  let host = hostname;
  try {
    const [ipv4] = await resolve4(hostname);
    host = ipv4;
    console.log(`[supabase] ${hostname} → ${ipv4} (IPv4 forced)`);
  } catch (e) {
    console.error(`[supabase] resolve4 failed for ${hostname}, using hostname:`, e);
  }

  return new Pool({ host, port, user, password, database, ssl: { rejectUnauthorized: false }, max: 3 });
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
